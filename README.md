# Safarnama ✈

A painted travel journal — the private magazine of a circle of friends, with a curated
public face. Members keep *everything* behind the curtain; an editor decides what the
world gets to see.

Full-stack successor to [travel-archives](https://github.com/Ritaban26), a hand-rolled
Express learning project: same database, same storage, same rules — rebuilt as a
Next.js App Router app with a Ghibli-inspired design system (`design-system/MASTER.md`).

## Features

- **Public face** — home, journeys atlas, per-trip curated galleries, and the journal.
  Only media the editor approved (`is_public`) ever appears here. The public site never
  links to login; membership is by invitation.
- **Passport-control login** — HMAC-signed httpOnly session cookie + bcrypt-hashed
  passwords. No signup endpoint, on purpose.
- **The private archive** (`/archive`) — every trip you were on, all its media,
  multi-file uploads to Supabase Storage, instant delete for your own private uploads.
- **The pitch flow** — publishing, retracting, or deleting public work is a *pitch*:
  any trip member can pitch any photo, and it goes live only on the editor's explicit yes.
- **The editor's desk** (`/admin`) — approval queue, circle roster, trip create/edit.
  Exactly one admin exists (enforced by a DB unique index), and the admin is a member
  of every trip.

## Tech stack

| Layer      | Choice                                                              |
| ---------- | ------------------------------------------------------------------- |
| App        | Next.js 16 (App Router, Server Actions, React 19, TypeScript strict)|
| Styling    | Tailwind CSS v4 + project design tokens                             |
| Database   | PostgreSQL on Supabase, raw SQL via `pg` pool (no ORM)              |
| Storage    | Supabase Storage bucket `Travel_archives`                           |
| Auth       | Hand-rolled: `bcryptjs` + HMAC-signed session cookie                |
| Validation | Zod in every server action                                          |

## Project structure

```
src/lib/db.ts        pg Pool (DATABASE_URL)
src/lib/session.ts   signed session cookie create/read/destroy
src/lib/auth.ts      getSessionUser · requireUser · requireAdmin
src/lib/queries.ts   all reads (trips, media, posts, approvals) → domain types
src/lib/actions.ts   all writes: login/logout, upload, delete, pitch, decide, trips
src/lib/data.ts      shared types + display derivations (initials, tints, painted fallbacks)
src/app/…            public pages · /login · /archive (members) · /admin (editor)
design-system/       MASTER.md — palette, typography, texture rules
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
   SESSION_SECRET=any-long-random-string
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
`trips.slug`, `media.caption`, `approval_requests.note`, and a `posts` table.

## Scripts

| Command          | Purpose                        |
| ---------------- | ------------------------------ |
| `npm run dev`    | Dev server on :3000            |
| `npm run build`  | Production build               |
| `npm run start`  | Serve the production build     |
| `npm run lint`   | ESLint                         |
| `npx tsc --noEmit` | Type-check (strict mode)     |

## Deployment

Deploys as a standard Next.js app on [Vercel](https://vercel.com): import the repo and
set the four environment variables from `.env.local` in the project settings. Nothing
else is required — image domains and the Server Actions body-size limit are configured
in `next.config.ts`.

## Roles

| Role   | Access                                                                  |
| ------ | ----------------------------------------------------------------------- |
| Admin  | Everything — open/edit trips, decide every pitch, editor's desk         |
| Member | Upload to their trips, see all trip media, pitch to the public gallery, delete own private uploads |
| Public | Only editor-approved media and journal posts                            |

## Roadmap

- **Try a free auth library** instead of the hand-rolled session cookie — good candidates:
  [Auth.js (next-auth v5)](https://authjs.dev),
  [Better Auth](https://better-auth.com), or
  [Supabase Auth](https://supabase.com/docs/guides/auth) (already part of the stack).
  The hand-rolled version was kept first on purpose — to understand what the libraries do.
- Media validation & size limits on upload (currently capped only by the 50 MB action body limit).
- Journal post authoring UI (posts table exists; entries are inserted by hand for now).
- Real cover photos for trips (covers still use the painted placeholder scenes).

## License

Personal project — internal circulation only.
