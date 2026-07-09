import type { SceneVariant } from "@/components/PaintedScene";

/**
 * Shared domain types + pure display helpers. Data now comes from Postgres
 * via `src/lib/queries.ts`; nothing in this file touches the database, so
 * it is safe to import from client components.
 */

export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  role: Role;
  initials: string;
  tint: string; // avatar wash color
}

export interface Media {
  id: string;
  tripSlug: string;
  uploader: User;
  type: "photo" | "video";
  isPublic: boolean;
  caption: string;
  takenAt: string;
  /** real file URL from storage; painted placeholder is used when absent */
  url: string | null;
  variant: SceneVariant;
  /** hue-rotate degrees applied to the painted placeholder for variety */
  hue: number;
}

export interface Trip {
  id: string;
  slug: string;
  name: string;
  location: string;
  dates: string;
  startDate: string;
  endDate: string;
  year: string;
  description: string;
  cover: SceneVariant;
  members: User[];
}

export type PostStatus = "draft" | "pending" | "published";

export interface Post {
  slug: string;
  title: string;
  author: User;
  tripSlug: string;
  tripName: string;
  tripLocation: string;
  media: Media | null;
  date: string;
  excerpt: string;
  paragraphs: string[];
  status: PostStatus;
}

export type ApprovalType =
  | "make_public"
  | "retract_public"
  | "delete_public"
  | "publish_post"
  | "retract_post"
  | "delete_post";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  media: Media | null;
  post: Post | null;
  requestedBy: User;
  requestedAt: string;
  note: string;
}

export const approvalLabel: Record<ApprovalType, string> = {
  make_public: "Publish to public gallery",
  retract_public: "Retract from public gallery",
  delete_public: "Delete a public photo",
  publish_post: "Publish a story",
  retract_post: "Retract a published story",
  delete_post: "Delete a published story",
};

/* ------- deterministic display derivations (no DB columns needed) ------- */

const TINTS = ["#d8702f", "#4a6741", "#34506b", "#cf8295", "#d9a441", "#86b5c9"];
const VARIANTS: SceneVariant[] = ["dusk", "meadow", "sea", "valley", "lantern", "forest", "mountain", "ember"];

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function tintFor(id: number): string {
  return TINTS[id % TINTS.length];
}

export function variantFor(id: number): SceneVariant {
  return VARIANTS[id % VARIANTS.length];
}

export function hueFor(id: number): number {
  return ((id * 37) % 50) - 25;
}
