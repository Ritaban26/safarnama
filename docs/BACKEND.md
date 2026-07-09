# Backend Architecture

Safarnama has no API routes. There is no `src/app/api/`, no `route.ts` anywhere.
Every read and every write is a plain function call from a Server Component or a
Server Action, all living under `src/lib`. This document explains each file, how
they compose, how requests actually flow end to end, the shape of the shared
database, and what changes between dev and a real deployment.

## 1. Big picture

```
src/lib/
  db.ts        pg Pool (the only thing that talks TCP to Postgres)
  session.ts   HMAC-signed httpOnly cookie — hand-rolled, not a library
  auth.ts      getSessionUser / requireUser / requireAdmin (redirect guards)
  queries.ts   every read: SQL -> row types -> domain types (data.ts)
  actions.ts   every write: "use server" Server Actions, Zod + auth-checked
  storage.ts   Supabase client for the Travel_archives bucket
  data.ts      shared types + pure display derivations (client-safe)
```

Rules that hold everywhere in this codebase:

- **Server Components fetch by calling `queries.ts` functions directly** inside
  the `async function Page()` body — no `fetch()`, no client-side data hooks.
- **Every mutation is a Server Action in `actions.ts`**, marked with the
  top-of-file `"use server"` pragma. Actions are invoked either as a `<form
  action={...}>` target (often via `useActionState`, given the `ActionState`
  return shape) or called directly from client components (e.g.
  `requestApproval`, `decideApproval`, `deletePrivateMedia` take plain args,
  not `FormData`).
- **Every action re-checks auth for itself** by calling `getSessionUser()` at
  the top — it never trusts that the page that rendered the trigger UI already
  checked. This matters because Server Actions are just POST endpoints Next.js
  synthesizes; they can be invoked directly, bypassing whatever page you
  imagine called them.
- **`data.ts` is the only lib file that is not `server-only`.** It holds types
  (`User`, `Trip`, `Media`, `Post`, `ApprovalRequest`) and pure functions
  (`initialsOf`, `tintFor`, `variantFor`, `hueFor`, `approvalLabel`) that derive
  display values deterministically from an id/name — no DB, no secrets — so
  client components can import it to type props and reuse the same
  derivations the server used.

## 2. File-by-file

### `src/lib/db.ts`

```ts
const pool =
  globalThis.__pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalThis.__pgPool = pool;
export default pool;
```

One `pg.Pool`, capped at 5 connections, exported as the default. Every query
in the codebase imports this same `pool` and calls `.query(...)` on it — there
is no per-request client, no transaction wrapper abstraction.

The `globalThis.__pgPool` cache exists **only to survive dev HMR**: without it,
every hot-reload of a module that imports `db.ts` would construct a fresh
`Pool`, and the old one's connections would leak until they idle out,
eventually exhausting Postgres's connection limit. In production this branch
is skipped (`NODE_ENV === "production"`), which is fine there because a
production server process is not being HMR'd — the pool is simply built once
at module load and lives for the process lifetime.

### `src/lib/session.ts`

Hand-rolled cookie session, deliberately not an auth library (per AGENTS.md).
Cookie name `safarnama_session`, 7-day max age. Payload format:

```
<userId>.<expiresMs>.<version>.<HMAC-SHA256 signature, base64url>
```

- `sign()` HMACs the `userId.expires.version` string with `SESSION_SECRET`
  (must be ≥32 chars or the module throws at import time — this is a hard
  startup requirement, not a soft warning).
- `tokenVersionFor(passwordHash)` derives an 8-hex-char fingerprint from a
  SHA-256 of the current bcrypt hash. This is the trick that lets
  `changePassword` invalidate every other outstanding session for that user
  **without a server-side session table**: the version embedded in an old
  cookie won't match the new password hash's fingerprint anymore.
- `createSession` writes the cookie (`httpOnly`, `sameSite: lax`, `secure` in
  production only).
- `readSession` parses and verifies signature (`timingSafeEqual`, so no timing
  side-channel) and expiry, returning `{ userId, version } | null`. It
  deliberately does **not** check the version against a live password hash —
  that requires a DB round trip, which is `auth.ts`'s job.

### `src/lib/auth.ts`

```ts
getSessionUser()  -> reads cookie, re-fetches user row, checks tokenVersion, returns User | null
requireUser()     -> getSessionUser() or redirect("/login")
requireAdmin()    -> requireUser(), then redirect("/archive") if role !== "admin"
```

This is the actual source of truth for "is this session still valid" — it's
the only place that compares the cookie's version against the *live*
`password_hash` in Postgres (via `getUserAuthById`). Pages call these three
functions directly at the top of their Server Component body; there is no
shared layout-level gate.

`src/proxy.ts` (Next's middleware-equivalent, matcher `/archive/:path*`) is
explicitly **not** a replacement for this. Its own doc comment spells out why:
Proxy can't import `next/headers`-based server-only modules, so it
reimplements just the HMAC + expiry check inline, and skips the version check
entirely because that needs a DB lookup it doesn't have. It exists purely so
an expired/forged cookie gets redirected before the page even renders — a
performance/UX nicety. Every `/archive/*` page still calls `requireUser()` /
`requireAdmin()` itself, and that call is what actually enforces auth.

### `src/lib/queries.ts`

All reads. Structure:

1. **Row interfaces** (`UserRow`, `MediaRow`, `TripRow`, `PostRow`) mirror the
   SQL column names exactly.
2. **`toUser` / `toTrip` / `toMedia` / post-mapping** convert a row into the
   `data.ts` domain type, computing derived display fields
   (`initials`, `tint`, `variant`, `hue`, formatted dates) via the pure
   functions from `data.ts`.
3. **Exported query functions** (`getUsers`, `getTrips`, `getAllMedia`,
   `getTripMedia`, `getPosts`, `getPendingApprovals`, etc.) run the SQL and
   map rows.

Two things worth calling out:

- **`resolveMediaUrls` batches signed-URL creation.** Instead of one Supabase
  Storage call per media row, every query that returns media rows collects
  all rows that have a `storage_key`, makes a single
  `supabase.storage.from(MEDIA_BUCKET).createSignedUrls([...keys], 3600)`
  call, and falls back to the legacy stored `media_url` for any row without a
  `storage_key` (pre-migration rows) or where the signed-URL call didn't
  return one. This is why every media-returning query is `async` even though
  the core row fetch is one `pool.query`.
- **`APPROVAL_TYPE_TO_DB`** maps the app's clean enum
  (`make_public` / `retract_public` / `delete_public`) to the prose strings
  the DB's `action_type` check constraint actually requires (`"mark as
  public"`, `"retract public status"`, `"delete public photo"`) — this
  constraint predates the app and can't be renamed without touching
  `travel-archives`. `DB_TO_APPROVAL_TYPE` is the derived inverse map, used
  when reading rows back out. **`actions.ts` imports `APPROVAL_TYPE_TO_DB`
  from here** rather than duplicating the map.

`queries.ts` never receives a `User` for auth purposes — most read functions
don't check permissions themselves (e.g. `getTripMedia` will happily return
private media for a trip you're not on). **The calling page is responsible for
gating** — see `getTripBySlug` + the explicit membership check in
`src/app/archive/[slug]/page.tsx` below.

### `src/lib/actions.ts`

All writes, as `"use server"` functions. Every one starts by calling
`getSessionUser()` (or `requireUser`/role check inline) and returns an
`ActionState` (`{ error?: string }`) rather than throwing, so `<form>`s using
`useActionState` can render the error inline. A few (upload lifecycle
actions called directly from client components rather than through a form)
take plain arguments and return the same shape.

Groups:

- **Auth**: `login` (Zod-validates, bcrypt-compares, `createSession`,
  `redirect("/archive")`), `logout` (`destroySession`, `redirect("/")`).
- **Members**: `createMember` (admin-only; role is hardcoded to `'member'` in
  the INSERT — the DB's `only_one_admin` unique index is the real backstop),
  `changePassword` (bcrypt-verifies current password, then re-issues the
  session cookie with the new token-version so the *current* browser stays
  logged in while every other cookie for that user silently stops working).
- **Uploads**: `uploadMedia` — sniffs real file type from magic bytes
  (`sniffMediaType`, never trusts client-supplied filename/MIME, both
  attacker-controlled), generates a `crypto.randomUUID()`-based storage key
  (never derived from the client filename), uploads to Supabase Storage, then
  inserts a `media` row with `is_public = false` and the new `storage_key`.
  `requireMembership(tripSlug)` is the shared guard: throws unless the caller
  is signed in and a member of that trip.
- **Media lifecycle**: `deletePrivateMedia` (uploader-only, only while
  `NOT is_public`, cascades: nulls any `posts.media_id` pointing at it, drops
  pending `approval_requests`, deletes the row, best-effort deletes the
  storage object), `requestApproval` (Zod-validated enum; `make_public`
  requires trip membership — any member may pitch any trip media;
  `retract_public`/`delete_public` require you to be the original uploader;
  refuses duplicate pending requests and no-op requests), `decideApproval`
  (admin-only; flips `is_public`, or on `delete_public` approval, orphans
  posts, rejects other pending requests on that media, deletes the row and
  storage object).
- **Trips**: `createTrip` / `updateTrip` (admin-only; slugified from the name,
  with a reserved-word check against `desk`/`settings` and a timestamp suffix
  on collision; membership list always includes the admin, even if the form
  didn't; `updateTrip` diffs `trip_members` by deleting rows not in the new
  set and inserting new ones with `ON CONFLICT DO NOTHING`).

Every write path calls `revalidatePath(...)` for the affected routes
afterward (e.g. `/archive`, `/archive/desk`, `/`, `/trips`) since there's no
client cache to invalidate any other way — Server Components refetch fresh on
next navigation to a revalidated path.

### `src/lib/data.ts`

Pure, DB-free, `server-only`-free. Holds:

- Domain types: `User`, `Trip`, `Media`, `Post`, `ApprovalRequest`,
  `ApprovalType`, plus `approvalLabel` (UI copy for each approval type).
- Deterministic derivations that need no DB column: `initialsOf(name)`,
  `tintFor(id)`, `variantFor(id)` (picks a `PaintedScene` illustration
  variant), `hueFor(id)` (a hue-rotate offset for placeholder variety) — all
  keyed off a numeric id so the same user/media always renders the same way
  without persisting a color/variant column.

Because this file has no `server-only` import, client components (e.g. photo
cards, avatar stacks) can import its types and helpers directly.

### `src/lib/storage.ts`

```ts
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
export const MEDIA_BUCKET = "Travel_archives";
export default supabase;
```

A single service-role Supabase client, `server-only` by convention (comment:
"never import from client components" — note this file itself has no
`import "server-only"` statement, unlike `auth.ts`/`queries.ts`, so this is
enforced by discipline/review, not the bundler). The service role key gives
full bucket access, which is why `createSignedUrls` and `upload`/`remove`
calls in `queries.ts`/`actions.ts` never need a user-scoped token.

### `src/proxy.ts`

Covered under `auth.ts` above. One more detail: its matcher is scoped to
`/archive/:path*` only — it does not run for `/login`, `/`, `/trips/*`,
`/journal/*`, none of which need a session.

## 3. Request / data-flow diagrams

### Private page load — `/archive/[slug]`

```
Browser GET /archive/beacon-hills
   │
   ▼
proxy.ts (matcher /archive/:path*)
   │  reads cookie, checks HMAC + expiry only
   │  invalid/missing -> redirect /login (fast fail, no DB hit)
   ▼
PrivateTripPage (Server Component, src/app/archive/[slug]/page.tsx)
   │
   ├─ requireUser()                     [auth.ts]
   │     └─ readSession()               [session.ts: verify sig+expiry -> {userId, version}]
   │     └─ getUserAuthById(userId)     [queries.ts -> pool.query users]
   │     └─ compare tokenVersionFor(hash) to cookie version
   │     └─ user found & version match -> User; else redirect /login
   │
   ├─ getTripBySlug(slug)               [queries.ts -> pool.query trips + trip_members]
   │     not found -> notFound()
   ├─ membership check: trip.members.some(m => m.id === user.id)
   │     not a member -> notFound()      <-- the actual privacy gate for this route
   │
   ├─ Promise.all([
   │     getTripMedia(slug),            [queries.ts -> pool.query media JOIN trips/users
   │                                       + resolveMediaUrls -> Supabase createSignedUrls]
   │     getPendingMediaIds(),          [queries.ts -> pool.query approval_requests]
   │   ])
   ▼
Render <PrivateTripView> with trip + media + pendingByMedia + currentUser
```

### Public gallery page load — `/trips/[slug]`

```
Browser GET /trips/beacon-hills   (no cookie required, no proxy matcher hit)
   │
   ▼
TripPage (Server Component, src/app/(public)/trips/[slug]/page.tsx)
   │  export const dynamic = "force-dynamic"  -- always re-renders, no ISR cache
   │
   ├─ getTrips()                        [queries.ts] -> find by slug, notFound() if missing
   ├─ Promise.all([
   │     getTripMedia(slug),            [queries.ts, ALL media -- not publicOnly here]
   │     getPosts(slug),                [queries.ts -> posts JOIN trips/users + attachPostMedia]
   │   ])
   ├─ gallery = all.filter(m => m.isPublic)   <-- privacy enforced in the page, in memory
   │  privateCount = all.length - gallery.length
   ▼
Render curated gallery (only public media rendered), "N more in the private
archive" teaser count, journal stories for the trip
```

Note the asymmetry: `getTripMedia` itself supports a `publicOnly` flag
(`getTripMedia(slug, true)`), but this particular page instead fetches all
media and filters client-side-in-the-Server-Component so it can also compute
`privateCount` for the teaser copy. The home page (`(public)/page.tsx`) does
the same — fetches `getAllMedia()` then filters `m.isPublic` in memory. This
is safe only because nothing downstream of that filtered `gallery`/
`publicMedia` array is rendered — the unfiltered private rows never reach the
client bundle's serialized props for those public pages... **except** they do
briefly exist in server memory, which is fine (no leak) but is a place to be
careful if this code is ever refactored to pass the unfiltered array further
down.

### A write — pitching media to the public gallery

```
Client: <PrivateTripView> media card "Pitch to gallery" button
   │  calls requestApproval(mediaId, "make_public", note) directly (not a <form>,
   │  since PhotoCard/PrivateTripView are client components invoking the
   │  Server Action as a plain async function -- Next.js turns this into a
   │  POST to a server-action endpoint under the hood)
   ▼
requestApproval()  [actions.ts, "use server"]
   ├─ getSessionUser()                  [auth.ts] -- re-derives user server-side;
   │                                       never trusts a user object passed from the client
   ├─ Zod: approvalTypeSchema.safeParse(type)
   ├─ pool.query SELECT media WHERE id = $1     -- must exist
   ├─ domain rule: make_public -> check trip_members for (trip_id, user.id)
   │              other types  -> must be uploaded_by === user.id
   ├─ no-op guard: wantsPublic === media.is_public -> reject
   ├─ dupe guard: existing pending request on this media -> reject
   ├─ INSERT INTO approval_requests (..., status='pending', ...)
   │     action_type stored as APPROVAL_TYPE_TO_DB[type]   [queries.ts's prose mapping]
   ├─ revalidatePath("/archive"), revalidatePath("/archive/desk")
   ▼
Returns {} (success) or {error} -> client shows toast/inline message

--- later, admin approves ---

Client: <AdminDesk> "Approve" button
   ▼
decideApproval(requestId, "approved")  [actions.ts]
   ├─ getSessionUser(); user.role !== "admin" -> {error}
   ├─ pool.query SELECT approval_requests WHERE id=$1 AND status='pending'
   ├─ action_type === APPROVAL_TYPE_TO_DB.make_public
   │     -> UPDATE media SET is_public = true
   ├─ UPDATE approval_requests SET status = 'approved'
   ├─ revalidatePath("/archive/desk"), ("/archive"), ("/")
   ▼
Next request to "/" or "/trips/[slug]" (force-dynamic, no cache to bust
anyway) now sees is_public = true via getTrips()/getTripMedia()/getAllMedia()
```

### Login

```
Client: LoginForm (client component) submits <form action={login}>
   ▼
login(prevState, formData)  [actions.ts, "use server"]
   ├─ Zod: loginSchema (email format, non-empty password)
   ├─ pool.query SELECT id, password_hash FROM users WHERE email = $1
   ├─ bcrypt.compare(password, password_hash)
   │     no match -> return {error: "The circle doesn't recognise those credentials."}
   ├─ createSession(user.id, user.password_hash)   [session.ts]
   │     ├─ version = tokenVersionFor(password_hash)   (sha256(hash).slice(0,8))
   │     ├─ payload = "userId.expiresMs.version"
   │     ├─ sig = HMAC-SHA256(payload, SESSION_SECRET)
   │     └─ Set-Cookie: safarnama_session=payload.sig; httpOnly; sameSite=lax;
   │                    secure (prod only); maxAge=7d
   ▼
redirect("/archive")
   ▼
(next request) proxy.ts sees a valid-looking cookie -> passes through
   ▼
ArchivePage -> requireUser() -> readSession() + getUserAuthById() + version
   check all pass -> renders as that user
```

Also: `LoginPage` itself calls `getSessionUser()` first and redirects already-
logged-in visitors straight to `/archive` — you can't view the login form
while authenticated. And per AGENTS.md, **the public site never links to
`/login`** — members reach it only by knowing the URL.

## 4. Database

Postgres (Supabase-hosted) and the `Travel_archives` Storage bucket are
**shared with a separate Express app (`travel-archives`) that has real user
data**. This drives several concrete constraints in the code:

- **Migrations are additive-only.** There is no migration tool/ORM — schema
  changes are one-off scripts run by hand: `node --env-file=.env.local
  script.js`, using the project's own `pg` from `node_modules`.
  `scripts/add-storage-key.js` is the template: it runs a single `ALTER TABLE
  media ADD COLUMN IF NOT EXISTS storage_key text;` and nothing else — no
  rollback, no down-migration, explicit comment warning never to rename or
  drop columns the other app reads.
- **`approval_requests.action_type` has a pre-existing check constraint** using
  prose values (`"mark as public"`, `"retract public status"`, `"delete
  public photo"`) instead of the app's clean enum names. `queries.ts` defines
  `APPROVAL_TYPE_TO_DB` (and its computed inverse, `DB_TO_APPROVAL_TYPE`) as
  the single translation point; every read and write of `action_type` in
  `queries.ts`/`actions.ts` goes through one of those two maps rather than
  hardcoding a string.
- **Never create test users/rows without deleting them afterward** — this is a
  live database (per AGENTS.md), not a disposable dev fixture.

### Pending: storage privacy flip

The `Travel_archives` bucket is still **public**. Current state, as
implemented:

- `media.storage_key` (nullable) records each upload's raw object key
  (`uploadMedia` in `actions.ts` sets it at insert time as
  `crypto.randomUUID().<ext>`).
- `queries.ts`'s `resolveMediaUrls` already serves ~1 hour signed URLs
  (`createSignedUrls`, batched once per query, `SIGNED_URL_TTL_SECONDS =
  3600`) for any row that has a `storage_key`. Signed URLs work against
  public buckets too, so this already shipped with no visible behavior
  change — it's forward-compatible groundwork.
- Rows without a `storage_key` (pre-migration legacy rows) fall back to the
  stored `media_url` (the old public URL).
- The `MEDIA_SELECT` query in `queries.ts` currently reads `storage_key` via
  `to_jsonb(m)->>'storage_key'` rather than a plain column reference — a
  transitional workaround (see inline comment) for querying a column that may
  not exist yet in this environment until the migration script has run; the
  comment says to simplify it back to `m.storage_key` once it has.

Before the bucket can actually be flipped to private, two things must happen
first (per AGENTS.md, not yet done):

1. `travel-archives` (the separate Express app) must switch to signed URLs
   too, since it reads the same bucket.
2. Legacy rows with no `storage_key` need a one-off backfill — derive the key
   from their stored `url` — or their images 404 once public access is gone.

The `storage_key` migration script itself (`scripts/add-storage-key.js`) is
described in AGENTS.md as still pending in this environment because
`DATABASE_URL` auth currently fails (likely a rotated password).

## 5. Domain rules and where they're enforced

| Rule | Enforcement |
|---|---|
| Exactly one admin, ever | DB unique index `only_one_admin` (not app code) — `createMember` in `actions.ts` hardcodes `role = 'member'` in its INSERT as a first line of defense, but the DB index is the real backstop |
| Admin is a member of every trip, can't be removed | `createTrip`/`updateTrip` in `actions.ts` force `Number(user.id)` (the admin, since only admins can call these) into `uniqueIds` before writing `trip_members`, and `updateTrip`'s deletion pass only removes ids *not* in that admin-inclusive set |
| Trip slugs are immutable after creation | `updateTrip`'s schema/query never touches `slug`; only `createTrip` sets it (slugified name, collision-suffixed with `Date.now().toString(36)`) |
| Nothing becomes public except through an approved pitch | `is_public` is only ever flipped to `true` inside `decideApproval` on approval of a `make_public` request; no other code path sets it true |
| Any trip member may pitch any media; retract/delete-public are uploader-only | `requestApproval` branches on `parsedType.data`: `make_public` checks `trip_members` membership only; `retract_public`/`delete_public` require `media.uploaded_by === user.id` |
| Private deletes are uploader-only and instant | `deletePrivateMedia`'s WHERE clause requires both `uploaded_by = $2` and `NOT is_public` in the same query — no approval step, but also impossible on already-public media (must go through `delete_public` approval instead) |

## 6. Deployment

This is a standard Next.js App Router app — no custom server, no Node
`server.js` — so it deploys the ordinary Vercel-style way: `npm run build`
then `npm run start` (or the platform's Next.js integration), with Node
package manager fixed to **npm** (`package-lock.json` is the lockfile;
AGENTS.md is explicit that this must not be mixed with pnpm/yarn).

**What runs where:**
- Server Components (every page under `src/app`) and Server Actions
  (`src/lib/actions.ts`) execute exclusively on the server/build runtime —
  they're the only code that ever touches `pool`, `supabase`, or
  `SESSION_SECRET`. None of `db.ts`, `session.ts`, `auth.ts`, `queries.ts`,
  `storage.ts` can be imported into a client component (`server-only` import
  or lack of `"use client"` boundary enforces this — `storage.ts` is the one
  exception without the literal `server-only` import, relying on convention).
- `src/proxy.ts` runs at the edge/middleware layer on every request matching
  `/archive/:path*`, before any Server Component renders.
- `data.ts` types/helpers can end up in the client bundle since components
  import them for props — but it contains no secrets and no DB code, by
  design.

**Environment variables needed at runtime** (`.env.local` in dev; platform
env vars in prod), all read via `process.env` in the files above:
- `DATABASE_URL` — consumed only by `db.ts`'s `Pool` constructor.
  **Must be single-quoted in `.env.local`**: the password contains `$`, and
  Next.js's dotenv-style loading expands `$VAR` inside double-quoted values,
  silently corrupting the connection string. This is a real, previously-hit
  footgun per AGENTS.md/project memory, not a hypothetical.
- `SESSION_SECRET` — required ≥32 chars; `session.ts` throws at import time
  (i.e., at first request or at build time if anything eagerly imports it)
  if missing/short. Must be set before the app can serve any authenticated
  route.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — consumed only by `storage.ts`'s
  `createClient`. The service-role key must never be exposed to the client
  (it isn't — `storage.ts` is never imported by a `"use client"` file).

**next.config.ts** adds a few deploy-relevant details: `reactCompiler: true`
(React Compiler on for the whole build), an `images.remotePatterns` allowlist
for the Supabase storage hostname (needed for `next/image` to fetch remote
Supabase-hosted images — both `/object/public/...` and `/object/sign/...`
paths, the latter for when signed URLs are the norm post-flip), a raised
Server Actions `bodySizeLimit: "50mb"` (needed for `uploadMedia` posting
FormData with actual photo/video bytes through the action, not a separate
upload endpoint), and global security headers
(`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`X-Frame-Options: DENY`) applied to every route via the `headers()` function.

**Dev vs. prod differences actually present in the code:**
- `db.ts`'s `globalThis.__pgPool` caching only applies outside production —
  in dev it survives HMR reloads of any module graph that imports it; in
  prod there's no HMR so the pool is simply constructed once per process and
  that's the only instance for the process's lifetime.
- `session.ts`'s cookie is `secure: process.env.NODE_ENV === "production"` —
  in dev over plain HTTP the cookie is sent without the `Secure` flag (so
  `localhost` works); in prod it requires HTTPS.
- Pages using `export const dynamic = "force-dynamic"` (home, `/trips/[slug]`,
  `/journal/[slug]`) always render fresh server-side on every request in any
  environment — this isn't a dev/prod difference per se, but it does mean
  there is no static-generation/ISR path to reason about at deploy time for
  those routes; they hit Postgres (and Supabase Storage for signed URLs) on
  every single request in production.
