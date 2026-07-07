# Safarnama (ghibili) ✈

A painted travel journal — the private magazine of a circle of friends, with a curated
public face. This is the full-stack successor to the hand-rolled
[`travel-archives`](../travel-archives) learning project: same database, same Supabase
storage, same rules — now living inside a Next.js App Router app with the Ghibli-inspired
design system from `design-system/MASTER.md`.

## What it does

- **Public face** — home, journeys atlas, per-trip curated galleries, and the journal.
  Only media the editor approved (`is_public`) ever appears here.
- **Passport-control login** — session cookie (HMAC-signed, httpOnly) + bcrypt-hashed
  passwords. No signup; membership is by invitation, inserted by hand.
- **The private archive** (`/archive`) — every trip you were on, all its media,
  uploads to Supabase Storage, instant delete for your own private uploads.
- **The approval flow** — publishing, retracting, or deleting public work is a *pitch*:
  it lands on the editor's desk (`/admin`) and only happens on an explicit yes.
- **The editor's desk** — pending pitches, circle roster, trips on file, open-a-new-trip.

## Stack

| Layer      | Choice                                                              |
| ---------- | ------------------------------------------------------------------- |
| App        | Next.js 16 (App Router, Server Actions, React 19)                   |
| Database   | PostgreSQL on Supabase, via `pg` pool (shared with travel-archives) |
| Storage    | Supabase Storage bucket `Travel_archives`                           |
| Auth       | Hand-rolled: `bcryptjs` + HMAC-signed session cookie                |
| Validation | Zod in every server action                                          |

## Project structure

```
src/lib/db.ts        pg Pool (DATABASE_URL)
src/lib/session.ts   signed session cookie create/read/destroy
src/lib/auth.ts      getSessionUser · requireUser · requireAdmin
src/lib/queries.ts   all reads (trips, media, posts, approvals) → domain types
src/lib/actions.ts   all writes: login/logout, upload, delete, pitch, decide, createTrip
src/lib/data.ts      shared types + display derivations (initials, tints, painted fallbacks)
src/app/…            public pages · /login · /archive (members) · /admin (editor)
```

## Running locally

1. `npm install`
2. Create `.env.local` (same values as travel-archives):

   ```
   DATABASE_URL='postgres://…'   # single quotes! Next.js expands $VARS in double-quoted values
   SESSION_SECRET=any-long-random-string
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_KEY=…        # service role key (server-side only)
   ```

3. `npm run dev`

The schema is the travel-archives schema plus additive columns/tables:
`trips.slug`, `media.caption`, `approval_requests.note`, and a `posts` table.

## Roles

| Role   | Access                                                                |
| ------ | ---------------------------------------------------------------------- |
| Admin  | Everything — open trips, decide every pitch, editor's desk             |
| Member | Upload to their trips, see all trip media, delete own private uploads  |
| Public | Only editor-approved media and journal posts                           |

## TODO / next steps

- **Try a free auth library** instead of the hand-rolled session cookie — good candidates:
  [Auth.js (next-auth v5)](https://authjs.dev) (free, self-hosted, credentials + OAuth),
  [Better Auth](https://better-auth.com) (free, TypeScript-first), or
  [Supabase Auth](https://supabase.com/docs/guides/auth) (already part of the stack, free tier).
  The hand-rolled version was kept first on purpose — to understand what the libraries do.
- Media validation & size limits on upload (currently capped only by the 50 MB action body limit).
- Journal post authoring UI (posts table exists; entries are inserted by hand for now).
- Real cover photos for trips (covers still use the painted placeholder scenes).
