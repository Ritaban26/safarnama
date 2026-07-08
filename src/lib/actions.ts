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
  await createSession(user.id, user.password_hash);
  redirect("/archive");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* ---------------- members ---------------- */

const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Give them a name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (user?.role !== "admin") return { error: "Only the editor adds members." };

  const parsed = createMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const dupe = await pool.query("SELECT 1 FROM users WHERE lower(email) = $1", [parsed.data.email]);
  if (dupe.rows[0]) return { error: "Someone already uses that email." };

  // role is fixed to 'member' — the DB enforces exactly one admin, and the form never offers it
  const hash = await bcrypt.hash(parsed.data.password, 10);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'member')",
    [parsed.data.name, parsed.data.email, hash],
  );
  revalidatePath("/archive/desk");
  revalidatePath("/archive");
  return {};
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "At least 8 characters"),
});

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in" };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const r = await pool.query("SELECT password_hash FROM users WHERE id = $1", [Number(user.id)]);
  if (!r.rows[0] || !(await bcrypt.compare(parsed.data.currentPassword, r.rows[0].password_hash))) {
    return { error: "That current password doesn't match." };
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, Number(user.id)]);
  // Re-issue the cookie with the new token-version so this session stays
  // logged in while every other (now stale) cookie for this user is rejected.
  await createSession(Number(user.id), hash);
  return {};
}

/* ---------------- uploads ---------------- */

// Sniffs file magic bytes so storage decisions never trust the client-supplied
// filename or MIME type (both are attacker-controlled).
type SniffedType = { mediaType: "image" | "video"; contentType: string; extension: string };

function sniffMediaType(buf: Buffer): SniffedType | null {
  const has = (offset: number, bytes: number[]) =>
    buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

  if (has(0, [0xff, 0xd8, 0xff])) return { mediaType: "image", contentType: "image/jpeg", extension: "jpg" };
  if (has(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { mediaType: "image", contentType: "image/png", extension: "png" };
  if (has(0, [0x47, 0x49, 0x46, 0x38])) return { mediaType: "image", contentType: "image/gif", extension: "gif" };
  if (has(0, [0x52, 0x49, 0x46, 0x46]) && has(8, [0x57, 0x45, 0x42, 0x50]))
    return { mediaType: "image", contentType: "image/webp", extension: "webp" };
  if (has(4, [0x66, 0x74, 0x79, 0x70])) {
    // ISO base media container (ftyp box): brand at offset 8 distinguishes HEIC/HEIF from MP4/MOV
    const brand = buf.subarray(8, 12).toString("ascii");
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return { mediaType: "image", contentType: "image/heic", extension: "heic" };
    }
    return { mediaType: "video", contentType: "video/mp4", extension: "mp4" };
  }
  if (has(0, [0x1a, 0x45, 0xdf, 0xa3])) {
    // EBML header covers both WebM and Matroska; treat both as webm for storage purposes
    return { mediaType: "video", contentType: "video/webm", extension: "webm" };
  }
  return null;
}

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMediaType(buffer);
    if (!sniffed) {
      return { error: `"${file.name}" is not a photo or video.` };
    }
    // server-generated key: never derive storage paths from the client-supplied filename
    const fileName = `${crypto.randomUUID()}.${sniffed.extension}`;
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(fileName, buffer, { contentType: sniffed.contentType });
    if (error) return { error: "Upload failed — try again." };

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(fileName);
    const mediaType = sniffed.mediaType === "image" ? "photo" : "video";
    await pool.query(
      `INSERT INTO media (media_url, media_type, trip_id, uploaded_by, is_public, caption, storage_key)
       VALUES ($1, $2, $3, $4, false, $5, $6)`,
      [data.publicUrl, mediaType, tripId, Number(user.id), caption, fileName],
    );
  }
  revalidatePath(`/archive/${tripSlug}`);
  return {};
}

/* ---------------- media lifecycle ---------------- */

async function storageRemove(mediaUrl: string | null, storageKey: string | null = null) {
  // Prefer the recorded object key; fall back to parsing it out of the legacy
  // public URL for rows uploaded before storage_key existed.
  let key = storageKey;
  if (!key) {
    const marker = `/object/public/${MEDIA_BUCKET}/`;
    const idx = mediaUrl?.indexOf(marker) ?? -1;
    if (mediaUrl && idx !== -1) key = decodeURIComponent(mediaUrl.slice(idx + marker.length));
  }
  if (key) {
    // best-effort; a dangling object is not worth failing the request over
    await supabase.storage.from(MEDIA_BUCKET).remove([key]);
  }
}

export async function deletePrivateMedia(mediaId: string): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in" };
  const r = await pool.query(
    "SELECT media_url, storage_key, trip_id FROM media WHERE id = $1 AND uploaded_by = $2 AND NOT is_public",
    [Number(mediaId), Number(user.id)],
  );
  if (!r.rows[0]) return { error: "Only your own private uploads can be deleted directly." };

  await pool.query("UPDATE posts SET media_id = NULL WHERE media_id = $1", [Number(mediaId)]);
  await pool.query("DELETE FROM approval_requests WHERE media_id = $1", [Number(mediaId)]);
  await pool.query("DELETE FROM media WHERE id = $1", [Number(mediaId)]);
  await storageRemove(r.rows[0].media_url, r.rows[0].storage_key);
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
    return { error: "That memory no longer exists." };
  }
  if (parsedType.data === "make_public") {
    // domain rule: any trip member may pitch any media in that trip, not just their own uploads
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
  revalidatePath("/archive/desk");
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
      const m = await pool.query("SELECT media_url, storage_key FROM media WHERE id = $1", [req.media_id]);
      await pool.query("UPDATE posts SET media_id = NULL WHERE media_id = $1", [req.media_id]);
      await pool.query(
        "UPDATE approval_requests SET status = 'rejected' WHERE media_id = $1 AND status = 'pending' AND id <> $2",
        [req.media_id, req.id],
      );
      await pool.query("DELETE FROM media WHERE id = $1", [req.media_id]);
      if (m.rows[0]) await storageRemove(m.rows[0].media_url, m.rows[0].storage_key);
    }
  }
  await pool.query("UPDATE approval_requests SET status = $1 WHERE id = $2", [decision, req.id]);
  revalidatePath("/archive/desk");
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
}).refine(
  (data) => !["desk", "settings"].includes(
    data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  ),
  { message: "That trip name collides with a reserved page — pick another.", path: ["name"] },
);

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
  revalidatePath("/archive/desk");
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

  revalidatePath("/archive/desk");
  revalidatePath("/archive");
  revalidatePath("/trips");
  return {};
}
