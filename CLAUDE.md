# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Safarnama (ghibili)

Private travel archive for a circle of friends with a curated public gallery.
Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · Postgres (Supabase) via raw `pg`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

- `npm run dev` — dev server on :3000 (npm only; `package-lock.json` is the lockfile)
- `npm run lint` and `npx tsc --noEmit` — run both after every change; there is no configured test framework (`@playwright/test` is installed but has no config or specs), do not invent test commands

## Architecture

All backend logic lives in `src/lib` — there are no API routes:

- `db.ts` — pg Pool (globalThis-cached for dev HMR)
- `session.ts` — HMAC-signed httpOnly cookie sessions (hand-rolled on purpose; do not swap in an auth library unasked)
- `auth.ts` — `getSessionUser` / `requireUser` / `requireAdmin` (redirect guards; pages call these — `src/proxy.ts` is a defense-in-depth redirect for `/archive/:path*` only, optimistic and not a substitute for these checks)
- `queries.ts` — all reads, mapping DB rows → domain types in `data.ts`
- `actions.ts` — all writes as Server Actions, every one Zod-validated and auth-checked internally
- `storage.ts` — Supabase service-role client + `MEDIA_BUCKET`; `server-only`, never import from client components
- `data.ts` — shared types + pure display derivations; safe for client components (queries/auth/storage are `server-only`)

Routes:

- `src/app/(public)/` — home, `/trips` atlas + per-trip galleries, `/journal` (approved posts only). The public site must never link to `/login`.
- `src/app/login` — passport-control login; no signup endpoint, on purpose
- `src/app/archive` — the members' area: per-trip private views, `[slug]/write` (story authoring), `settings`, and `desk` (the editor's approval queue / roster / trip management — this replaced the old `/admin`)

## Database — shared and live

The Postgres DB and `Travel_archives` storage bucket are **shared with the separate
`travel-archives` Express project and contain real user data**.

- Migrations are additive-only (`ADD COLUMN IF NOT EXISTS`, new tables/indexes); never rename or drop what travel-archives reads
- No migration tool — one-off scripts in `scripts/` run with `node --env-file=.env.local scripts/<name>.js` using the project's own `node_modules/pg`
- `approval_requests.action_type` has a check constraint with prose values ("mark as public", …); always map through `APPROVAL_TYPE_TO_DB` in `queries.ts`
- `approval_requests` has a `one_target_check` constraint — every row must reference a target (media or post), so delete request rows before deleting the media/post they point to
- Never create test users/rows without deleting them afterwards

### Storage privacy flip (pending)

The `Travel_archives` bucket is still **public**. `media.storage_key` records each
upload's raw object key, and `queries.ts` serves ~1hr signed URLs (via
`createSignedUrls`, batched per query) for any row that has one — signed URLs work
against public buckets too, so this shipped ahead of the flip with no behavior change.
Before the bucket can actually be made private: (1) `travel-archives` (the separate
Express app) must be updated to use signed URLs as well, since it reads the same
bucket, and (2) legacy rows with no `storage_key` need a one-off backfill (derive the
key from their stored `url`) or their images will 404 once public access is gone.
`scripts/add-storage-key.js` is the column migration; verify against the live DB
whether it has already been run before assuming either state.

## Domain rules (enforced — keep them that way)

- Exactly one admin, ever (DB unique index `only_one_admin`)
- The admin is a member of every trip and cannot be removed from one
- Trip slugs are immutable after creation (public URLs)
- Nothing becomes public except through an approved pitch in `approval_requests` — this applies to media and journal posts alike (posts are drafted in `/archive/[slug]/write`, then submitted for the editor's approval)
- Any trip member may pitch any media to the public gallery; retract/delete-public requests are uploader-only; private deletes are uploader-only and instant
- The public site must never link to `/login` — members reach it by URL only

## Conventions

- Design tokens only (`--moss`, `--ember`, `--paper`, … from `globals.css` / `design-system/MASTER.md`); never raw Tailwind palette classes
- Media with no `url` falls back to `<PaintedScene>` placeholders; real photos use `next/image` (Supabase host allowed in `next.config.ts`)
- Trip dates: use local date parts, never `toISOString()` — pg returns midnight-local Dates and UTC rendering shifts them a day

## Environment

`.env.local` (gitignored): `DATABASE_URL` (**single-quote it — the password contains `$` and Next.js expands `$VARS` in double-quoted values**), `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
