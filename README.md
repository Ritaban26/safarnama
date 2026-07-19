# Safarnama ✈

A painted travel journal — the private magazine of a circle of friends, with a curated
public face. Members keep *everything* behind the curtain; an editor decides what the
world gets to see.

Full-stack successor to [travel-archives](https://github.com/Ritaban26), a hand-rolled
Express learning project: same database, same storage, same rules — rebuilt as a
Next.js App Router app with a Ghibli-inspired design system (`design-system/MASTER.md`).

## Features

- **Public face** — home, journeys atlas, per-trip curated galleries, and the journal.
  Only media and stories the editor approved ever appear here. The public site never
  links to login; membership is by invitation.
- **Passport-control login** — HMAC-signed httpOnly session cookie + bcrypt-hashed
  passwords. No signup endpoint, on purpose.
- **The private archive** (`/archive`) — every trip you were on, all its media,
  multi-file uploads to Supabase Storage, instant delete for your own private uploads.
- **Story authoring** (`/archive/[trip]/write`) — draft journal entries against a trip,
  attach a trip photo, edit and delete freely while unpublished.
- **The pitch flow** — nothing goes public directly. Publishing, retracting, or deleting
  public work — photos *and* stories — is a *pitch*: any trip member can pitch any trip
  photo, authors pitch their own stories, and it goes live only on the editor's explicit yes.
- **The editor's desk** (`/archive/desk`) — approval queue, circle roster, trip
  create/edit. Exactly one admin exists (enforced by a DB unique index), and the admin
  is a member of every trip.

## Tech stack

| Layer      | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| App        | Next.js 16 (App Router, Server Actions, React 19, TypeScript strict) |
| Styling    | Tailwind CSS v4 + project design tokens                              |
| Database   | PostgreSQL on Supabase, raw SQL via `pg` pool (no ORM)               |
| Storage    | Supabase Storage bucket `Travel_archives`                            |
| Auth       | Hand-rolled: `bcryptjs` + HMAC-signed session cookie                 |
| Validation | Zod in every server action                                           |

## Project structure

```
src/lib/db.ts        pg Pool (DATABASE_URL)
src/lib/session.ts   signed session cookie create/read/destroy
src/lib/auth.ts      getSessionUser · requireUser · requireAdmin
src/lib/queries.ts   all reads (trips, media, posts, approvals) → domain types
src/lib/actions.ts   all writes: login/logout, upload, delete, pitch, decide, stories, trips
src/lib/storage.ts   Supabase service-role client + bucket name
src/lib/data.ts      shared types + display derivations (initials, tints, painted fallbacks)
src/app/(public)/…   home · /trips atlas + galleries · /journal
src/app/login        passport control
src/app/archive/…    members' area · [trip]/write authoring · desk (editor) · settings
design-system/       MASTER.md — palette, typography, texture rules
docs/BACKEND.md      how the backend actually works, end to end
```

## Getting started

**Prerequisites**: Node 20+, a Supabase project (Postgres + a storage bucket).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   DATABASE_URL='postgres://…'   # single quotes! Next.js expands $VARS in double-quoted values
   SESSION_SECRET=any-long-random-string   # ≥32 chars, enforced at startup
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_KEY=…        # service role key (server-side only)
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. Members sign in at `/login` (users are inserted by
   hand — membership is by invitation).

The schema is the travel-archives schema plus additive columns/tables:
`trips.slug`, `media.caption`, `media.storage_key`, `approval_requests.note` /
`admin_note` / `post_id`, and a `posts` table with a draft → pending → published
status flow. One-off migration scripts live in `scripts/` and run with
`node --env-file=.env.local scripts/<name>.js`.

## Scripts

| Command            | Purpose                    |
| ------------------ | -------------------------- |
| `npm run dev`      | Dev server on :3000        |
| `npm run build`    | Production build           |
| `npm run start`    | Serve the production build |
| `npm run lint`     | ESLint                     |
| `npx tsc --noEmit` | Type-check (strict mode)   |

## Deployment

Deploys as a standard Next.js app on [Vercel](https://vercel.com): import the repo and
set the four environment variables from `.env.local` in the project settings. Nothing
else is required — image domains and the Server Actions body-size limit are configured
in `next.config.ts`.

## Roles

| Role   | Access                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| Admin  | Everything — open/edit trips, decide every pitch, editor's desk                                                     |
| Member | Upload to their trips, see all trip media, write stories, pitch to the public site, delete own unpublished work    |
| Public | Only editor-approved media and journal stories                                                                      |

## Roadmap

- **Flip the storage bucket to private** — signed URLs are already served for new
  uploads; the flip waits on travel-archives switching to signed URLs and a backfill
  of legacy rows' `storage_key` (see `docs/BACKEND.md`).
- **Try a free auth library** instead of the hand-rolled session cookie — good candidates:
  [Auth.js (next-auth v5)](https://authjs.dev),
  [Better Auth](https://better-auth.com), or
  [Supabase Auth](https://supabase.com/docs/guides/auth) (already part of the stack).
  The hand-rolled version was kept first on purpose — to understand what the libraries do.
- Media size limits on upload (currently capped only by the 50 MB action body limit).
- Real cover photos for trips (covers still use the painted placeholder scenes).

## License

Personal project — internal circulation only.
