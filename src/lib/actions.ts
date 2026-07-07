"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "./db";
import supabase, { MEDIA_BUCKET } from "./storage";
import { createSession, destroySession } from "./session";
import { getSessionUser } from "./auth";
import { APPROVAL_TYPE_TO_DB } from "./queries";
import type { ApprovalType } from "./data";

export interface ActionState {
  error?: string;
}

/* ---------------- auth ---------------- */

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const r = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [
    parsed.data.email,
  ]);
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return { error: "The circle doesn't recognise those credentials." };
  }
  await createSession(user.id);
  redirect("/archive");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* ---------------- uploads ---------------- */

async function requireMembership(tripSlug: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  const r = await pool.query(
    `SELECT t.id FROM trips t JOIN trip_members tm ON tm.trip_id = t.id
      WHERE t.slug = $1 AND tm.user_id = $2`,
    [tripSlug, Number(user.id)],
  );
  if (!r.rows[0]) throw new Error("You are not a member of this trip");
  return { user, tripId: r.rows[0].id as number };
}

export async function uploadMedia(tripSlug: string, formData: FormData): Promise<ActionState> {
  const { user, tripId } = await requireMembership(tripSlug);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const caption = z.string().trim().max(300).catch("").parse(formData.get("caption") ?? "");
  if (files.length === 0) return { error: "Pick at least one photo or video." };

  for (const file of files) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return { error: `"${file.name}" is not a photo or video.` };
    }
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(fileName, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (error) return { error: "Upload failed — try again." };

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(fileName);
    const mediaType = file.type.startsWith("image/") ? "photo" : "video";
    await pool.query(
      `INSERT INTO media (media_url, media_type, trip_id, uploaded_by, is_public, caption)
       VALUES ($1, $2, $3, $4, false, $5)`,
      [data.publicUrl, mediaType, tripId, Number(user.id), caption],
    );
  }
  revalidatePath(`/archive/${tripSlug}`);
  return {};
}

/* ---------------- media lifecycle ---------------- */

async function storageRemove(mediaUrl: string | null) {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const idx = mediaUrl?.indexOf(marker) ?? -1;
  if (mediaUrl && idx !== -1) {
    // best-effort; a dangling object is not worth failing the request over
    await supabase.storage.from(MEDIA_BUCKET).remove([decodeURIComponent(mediaUrl.slice(idx + marker.length))]);
  }
}

export async function deletePrivateMedia(mediaId: string): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in" };
  const r = await pool.query(
    "SELECT media_url, trip_id FROM media WHERE id = $1 AND uploaded_by = $2 AND NOT is_public",
    [Number(mediaId), Number(user.id)],
  );
  if (!r.rows[0]) return { error: "Only your own private uploads can be deleted directly." };

  await pool.query("UPDATE posts SET media_id = NULL WHERE media_id = $1", [Number(mediaId)]);
  await pool.query("DELETE FROM approval_requests WHERE media_id = $1", [Number(mediaId)]);
  await pool.query("DELETE FROM media WHERE id = $1", [Number(mediaId)]);
  await storageRemove(r.rows[0].media_url);
  revalidatePath("/archive");
  return {};
}

const approvalTypeSchema = z.enum(["make_public", "retract_public", "delete_public"]);

export async function requestApproval(
  mediaId: string,
  type: ApprovalType,
  note: string,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in" };
  const parsedType = approvalTypeSchema.safeParse(type);
  if (!parsedType.success) return { error: "Unknown request type" };

  const m = await pool.query("SELECT id, is_public, uploaded_by, trip_id FROM media WHERE id = $1", [
    Number(mediaId),
  ]);
  if (!m.rows[0]) {
    return { error: "You can only pitch your own uploads." };
  }
  if (parsedType.data === "make_public") {
    const membership = await pool.query(
      "SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2",
      [m.rows[0].trip_id, Number(user.id)],
    );
    if (!membership.rows[0]) return { error: "You can only pitch memories from your own trips." };
  } else if (m.rows[0].uploaded_by !== Number(user.id)) {
    return { error: "You can only pitch your own uploads." };
  }
  const wantsPublic = parsedType.data === "make_public";
  if (wantsPublic === m.rows[0].is_public) return { error: "That request doesn't apply anymore." };

  const dupe = await pool.query(
    "SELECT 1 FROM approval_requests WHERE media_id = $1 AND status = 'pending'",
    [Number(mediaId)],
  );
  if (dupe.rows[0]) return { error: "This one is already waiting on the editor." };

  await pool.query(
    `INSERT INTO approval_requests (media_id, action_type, requested_by, status, note)
     VALUES ($1, $2, $3, 'pending', $4)`,
    [Number(mediaId), APPROVAL_TYPE_TO_DB[parsedType.data], Number(user.id), z.string().trim().max(300).catch("").parse(note)],
  );
  revalidatePath("/archive");
  revalidatePath("/admin");
  return {};
}

export async function decideApproval(
  requestId: string,
  decision: "approved" | "rejected",
): Promise<ActionState> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return { error: "Only the editor decides." };

  const r = await pool.query(
    "SELECT id, media_id, action_type FROM approval_requests WHERE id = $1 AND status = 'pending'",
    [Number(requestId)],
  );
  const req = r.rows[0];
  if (!req) return { error: "That pitch was already handled." };

  if (decision === "approved") {
    if (req.action_type === APPROVAL_TYPE_TO_DB.make_public) {
      await pool.query("UPDATE media SET is_public = true WHERE id = $1", [req.media_id]);
    } else if (req.action_type === APPROVAL_TYPE_TO_DB.retract_public) {
      await pool.query("UPDATE media SET is_public = false WHERE id = $1", [req.media_id]);
    } else if (req.action_type === APPROVAL_TYPE_TO_DB.delete_public) {
      const m = await pool.query("SELECT media_url FROM media WHERE id = $1", [req.media_id]);
      await pool.query("UPDATE posts SET media_id = NULL WHERE media_id = $1", [req.media_id]);
      await pool.query(
        "UPDATE approval_requests SET status = 'rejected' WHERE media_id = $1 AND status = 'pending' AND id <> $2",
        [req.media_id, req.id],
      );
      await pool.query("DELETE FROM media WHERE id = $1", [req.media_id]);
      if (m.rows[0]) await storageRemove(m.rows[0].media_url);
    }
  }
  await pool.query("UPDATE approval_requests SET status = $1 WHERE id = $2", [decision, req.id]);
  revalidatePath("/admin");
  revalidatePath("/archive");
  revalidatePath("/");
  return {};
}

/* ---------------- trips ---------------- */

const tripSchema = z.object({
  name: z.string().trim().min(2, "Give the trip a name"),
  location: z.string().trim().min(2, "Where was it?"),
  startDate: z.string().trim().min(1, "Start date required"),
  endDate: z.string().trim().min(1, "End date required"),
  description: z.string().trim().max(1000).catch(""),
});

export async function createTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return { error: "Only the editor opens new trips." };

  const parsed = tripSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const slugBase = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const dupe = await pool.query("SELECT 1 FROM trips WHERE slug = $1", [slugBase]);
  const slug = dupe.rows[0] ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

  const inserted = await pool.query(
    `INSERT INTO trips (name, location, start_date, end_date, description, created_by, slug, cover_photo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'placeholder') RETURNING id`,
    [parsed.data.name, parsed.data.location, parsed.data.startDate, parsed.data.endDate,
     parsed.data.description, Number(user.id), slug],
  );
  const memberIds = formData.getAll("memberIds").map(Number).filter(Number.isInteger);
  const uniqueIds = [...new Set([Number(user.id), ...memberIds])];
  for (const id of uniqueIds) {
    await pool.query("INSERT INTO trip_members (trip_id, user_id) VALUES ($1, $2)", [
      inserted.rows[0].id, id,
    ]);
  }
  revalidatePath("/admin");
  revalidatePath("/archive");
  revalidatePath("/trips");
  return {};
}

const updateTripSchema = tripSchema.extend({
  tripId: z.string().trim().min(1, "Missing trip"),
});

export async function updateTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return { error: "Only the editor edits trips." };

  const parsed = updateTripSchema.safeParse({
    tripId: formData.get("tripId"),
    name: formData.get("name"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const tripId = Number(parsed.data.tripId);
  if (!Number.isInteger(tripId)) return { error: "Missing trip" };

  await pool.query(
    `UPDATE trips SET name = $1, location = $2, start_date = $3, end_date = $4, description = $5
      WHERE id = $6`,
    [parsed.data.name, parsed.data.location, parsed.data.startDate, parsed.data.endDate,
     parsed.data.description, tripId],
  );

  const memberIds = formData.getAll("memberIds").map(Number).filter(Number.isInteger);
  const uniqueIds = [...new Set([Number(user.id), ...memberIds])];
  await pool.query("DELETE FROM trip_members WHERE trip_id = $1 AND NOT (user_id = ANY($2))", [
    tripId, uniqueIds,
  ]);
  for (const id of uniqueIds) {
    await pool.query(
      "INSERT INTO trip_members (trip_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [tripId, id],
    );
  }

  revalidatePath("/admin");
  revalidatePath("/archive");
  revalidatePath("/trips");
  return {};
}
