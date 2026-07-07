import "server-only";
import pool from "./db";
import {
  type User,
  type Trip,
  type Media,
  type Post,
  type ApprovalRequest,
  type ApprovalType,
  initialsOf,
  tintFor,
  variantFor,
  hueFor,
} from "./data";

/* ---------------- row → domain mapping ---------------- */

interface UserRow {
  id: number;
  name: string;
  role: string;
}

function toUser(r: UserRow): User {
  return {
    id: String(r.id),
    name: r.name,
    role: r.role === "admin" ? "admin" : "member",
    initials: initialsOf(r.name),
    tint: tintFor(r.id),
  };
}

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatDay(d: Date | null): string {
  return d ? DAY.format(d) : "";
}

function formatRange(start: Date | null, end: Date | null): string {
  if (!start) return "";
  const year = start.getFullYear();
  if (!end) return `${DAY.format(start)}, ${year}`;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const endPart = sameMonth ? String(end.getDate()) : DAY.format(end);
  return `${DAY.format(start)} – ${endPart}, ${end.getFullYear()}`;
}

function formatAgo(d: Date | null): string {
  if (!d) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

interface MediaRow {
  id: number;
  media_url: string | null;
  media_type: string;
  is_public: boolean;
  caption: string;
  created_at: Date | null;
  trip_slug: string;
  uploader_id: number;
  uploader_name: string;
  uploader_role: string;
}

function toMedia(r: MediaRow): Media {
  return {
    id: String(r.id),
    tripSlug: r.trip_slug,
    uploader: toUser({ id: r.uploader_id, name: r.uploader_name, role: r.uploader_role }),
    type: r.media_type === "video" ? "video" : "photo",
    isPublic: r.is_public,
    caption: r.caption,
    takenAt: formatDay(r.created_at),
    url: r.media_url || null,
    variant: variantFor(r.id),
    hue: hueFor(r.id),
  };
}

/** DB check constraint predates this app and uses prose action names. */
export const APPROVAL_TYPE_TO_DB: Record<ApprovalType, string> = {
  make_public: "mark as public",
  retract_public: "retract public status",
  delete_public: "delete public photo",
};

const DB_TO_APPROVAL_TYPE: Record<string, ApprovalType> = Object.fromEntries(
  Object.entries(APPROVAL_TYPE_TO_DB).map(([k, v]) => [v, k as ApprovalType]),
);

const MEDIA_SELECT = `
  SELECT m.id, m.media_url, m.media_type, m.is_public, m.caption, m.created_at,
         t.slug AS trip_slug,
         u.id AS uploader_id, u.name AS uploader_name, u.role AS uploader_role
    FROM media m
    JOIN trips t ON t.id = m.trip_id
    JOIN users u ON u.id = m.uploaded_by`;

/* ---------------- users ---------------- */

export async function getUsers(): Promise<User[]> {
  const r = await pool.query("SELECT id, name, role FROM users ORDER BY id");
  return r.rows.map(toUser);
}

export async function getUserById(id: number): Promise<User | null> {
  const r = await pool.query("SELECT id, name, role FROM users WHERE id = $1", [id]);
  return r.rows[0] ? toUser(r.rows[0]) : null;
}

/* ---------------- trips ---------------- */

interface TripRow {
  id: number;
  slug: string;
  name: string;
  location: string;
  start_date: Date | null;
  end_date: Date | null;
  description: string;
}

async function tripMembers(): Promise<Map<number, User[]>> {
  const r = await pool.query(
    `SELECT tm.trip_id, u.id, u.name, u.role
       FROM trip_members tm JOIN users u ON u.id = tm.user_id
      ORDER BY u.id`,
  );
  const map = new Map<number, User[]>();
  for (const row of r.rows) {
    const list = map.get(row.trip_id) ?? [];
    list.push(toUser(row));
    map.set(row.trip_id, list);
  }
  return map;
}

// Local date parts, not toISOString: pg returns midnight-local Dates, and the
// UTC rendering lands a day early — round-tripping an edit would shift the trip.
function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTrip(r: TripRow, members: User[]): Trip {
  return {
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    location: r.location,
    dates: formatRange(r.start_date, r.end_date),
    startDate: r.start_date ? isoLocalDate(r.start_date) : "",
    endDate: r.end_date ? isoLocalDate(r.end_date) : "",
    year: r.start_date ? String(r.start_date.getFullYear()) : "",
    description: r.description ?? "",
    cover: variantFor(r.id),
    members,
  };
}

export async function getTrips(): Promise<Trip[]> {
  const [r, members] = await Promise.all([
    pool.query("SELECT * FROM trips ORDER BY start_date DESC NULLS LAST, id DESC"),
    tripMembers(),
  ]);
  return r.rows.map((row: TripRow) => toTrip(row, members.get(row.id) ?? []));
}

export async function getTripBySlug(slug: string): Promise<Trip | null> {
  const trips = await getTrips();
  return trips.find((t) => t.slug === slug) ?? null;
}

export async function isTripMember(tripSlug: string, userId: number): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM trip_members tm JOIN trips t ON t.id = tm.trip_id
      WHERE t.slug = $1 AND tm.user_id = $2`,
    [tripSlug, userId],
  );
  return r.rows.length > 0;
}

/* ---------------- media ---------------- */

export async function getAllMedia(): Promise<Media[]> {
  const r = await pool.query(`${MEDIA_SELECT} ORDER BY m.id DESC`);
  return r.rows.map(toMedia);
}

export async function getTripMedia(slug: string, publicOnly = false): Promise<Media[]> {
  const r = await pool.query(
    `${MEDIA_SELECT} WHERE t.slug = $1 ${publicOnly ? "AND m.is_public" : ""} ORDER BY m.id DESC`,
    [slug],
  );
  return r.rows.map(toMedia);
}

/* ---------------- posts ---------------- */

const POST_SELECT = `
  SELECT p.slug, p.title, p.excerpt, p.paragraphs, p.created_at,
         t.slug AS trip_slug, t.name AS trip_name, t.location AS trip_location,
         u.id AS author_id, u.name AS author_name, u.role AS author_role,
         p.media_id
    FROM posts p
    JOIN trips t ON t.id = p.trip_id
    JOIN users u ON u.id = p.author_id`;

const POST_DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

interface PostRow {
  slug: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  created_at: Date | null;
  trip_slug: string;
  trip_name: string;
  trip_location: string;
  author_id: number;
  author_name: string;
  author_role: string;
  media_id: number | null;
}

async function attachPostMedia(rows: PostRow[]): Promise<Post[]> {
  const ids = rows.map((r) => r.media_id).filter((id): id is number => id != null);
  const mediaById = new Map<number, Media>();
  if (ids.length > 0) {
    const r = await pool.query(`${MEDIA_SELECT} WHERE m.id = ANY($1)`, [ids]);
    for (const row of r.rows) mediaById.set(row.id, toMedia(row));
  }
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    author: toUser({ id: r.author_id, name: r.author_name, role: r.author_role }),
    tripSlug: r.trip_slug,
    tripName: r.trip_name,
    tripLocation: r.trip_location,
    media: r.media_id != null ? mediaById.get(r.media_id) ?? null : null,
    date: r.created_at ? POST_DATE.format(r.created_at) : "",
    excerpt: r.excerpt,
    paragraphs: r.paragraphs ?? [],
  }));
}

export async function getPosts(tripSlug?: string): Promise<Post[]> {
  const r = tripSlug
    ? await pool.query(`${POST_SELECT} WHERE t.slug = $1 ORDER BY p.created_at DESC`, [tripSlug])
    : await pool.query(`${POST_SELECT} ORDER BY p.created_at DESC`);
  return attachPostMedia(r.rows);
}

export async function getPost(slug: string): Promise<Post | null> {
  const r = await pool.query(`${POST_SELECT} WHERE p.slug = $1`, [slug]);
  if (!r.rows[0]) return null;
  const [post] = await attachPostMedia(r.rows);
  return post;
}

/* ---------------- approval requests ---------------- */

export async function getPendingApprovals(requestedById?: number): Promise<ApprovalRequest[]> {
  const r = await pool.query(
    `SELECT ar.id, ar.action_type, ar.note, ar.created_at, ar.media_id,
            u.id AS requester_id, u.name AS requester_name, u.role AS requester_role
       FROM approval_requests ar
       JOIN users u ON u.id = ar.requested_by
      WHERE ar.status = 'pending' ${requestedById != null ? "AND ar.requested_by = $1" : ""}
      ORDER BY ar.created_at DESC`,
    requestedById != null ? [requestedById] : [],
  );
  const mediaIds = r.rows.map((row) => row.media_id);
  const mediaById = new Map<number, Media>();
  if (mediaIds.length > 0) {
    const mr = await pool.query(`${MEDIA_SELECT} WHERE m.id = ANY($1)`, [mediaIds]);
    for (const row of mr.rows) mediaById.set(row.id, toMedia(row));
  }
  return r.rows
    .filter((row) => mediaById.has(row.media_id))
    .map((row) => ({
      id: String(row.id),
      type: DB_TO_APPROVAL_TYPE[row.action_type] ?? "make_public",
      media: mediaById.get(row.media_id)!,
      requestedBy: toUser({ id: row.requester_id, name: row.requester_name, role: row.requester_role }),
      requestedAt: formatAgo(row.created_at),
      note: row.note,
    }));
}

/** media ids (as strings) that have a pending request, for badge display */
export async function getPendingMediaIds(): Promise<Record<string, ApprovalType>> {
  const r = await pool.query(
    "SELECT media_id, action_type FROM approval_requests WHERE status = 'pending'",
  );
  const map: Record<string, ApprovalType> = {};
  for (const row of r.rows) {
    map[String(row.media_id)] = DB_TO_APPROVAL_TYPE[row.action_type] ?? "make_public";
  }
  return map;
}

export async function getUploadCounts(): Promise<Record<string, number>> {
  const r = await pool.query("SELECT uploaded_by, count(*)::int AS n FROM media GROUP BY uploaded_by");
  const map: Record<string, number> = {};
  for (const row of r.rows) map[String(row.uploaded_by)] = row.n;
  return map;
}
