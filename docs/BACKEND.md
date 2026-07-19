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
  `requestApproval`, `decideApproval`, `deletePrivateMedia`,
  `submitPostForApproval` take plain args, not `FormData`).
- **Every action re-checks auth for itself** by calling `getSessionUser()` (or
  the `requireMembership` helper) at the top — it never trusts that the page
  that rendered the trigger UI already checked. This matters because Server
  Actions are just POST endpoints Next.js synthesizes; they can be invoked
  directly, bypassing whatever page you imagine called them.
- **`data.ts` is the only lib file that is not `server-only`.** It holds types
  (`User`, `Trip`, `Media`, `Post`, `PostStatus`, `ApprovalRequest`,
  `ApprovalType`) and pure functions (`initialsOf`, `tintFor`, `variantFor`,
  `hueFor`, `approvalLabel`) that derive display values deterministically from
  an id/name — no DB, no secrets — so client components can import it to type
  props and reuse the same derivations the server used.

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
in the codebase imports this same `pool` and calls `.query(...)` on it. The
one exception to "no per-request client": the destructive approval decisions
(`delete_public`, `delete_post` in `decideApproval`) check out a client with
`pool.connect()` to run their multi-statement deletes inside a
`BEGIN`/`COMMIT` transaction — see §3.

The `globalThis.__pgPool` cache exists **only to survive dev HMR**: without it,
every hot-reload of a module that imports `db.ts` would construct a fresh
`Pool`, and the old one's connections would leak until they idle out,
eventually exhausting Postgres's connection limit. In production this branch
is skipped (`NODE_ENV === "production"`), which is fine there because a
production server process is not being HMR'd — the pool is simply built once
at module load and lives for the process lifetime.

### `src/lib/session.ts`

Hand-rolled cookie session, deliberately not an auth library.
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
   functions from `data.ts`. Post rows get a `toPostStatus` guard that maps
   any unknown DB value to `"published"` rather than crashing.
3. **Exported query functions** — trips (`getTrips`, `getTripBySlug`), media
   (`getAllMedia`, `getTripMedia`), posts (`getPosts` — published only,
   `getPost`, `getMyPostsForTrip`, `getPostForEdit` — any status, for the
   authoring UI), approvals (`getPendingApprovals` with an optional
   requested-by filter, `getPendingMediaIds`, `getPendingPostIds`), users
   (`getUsers`, `getUserAuthById`, `getUploadCounts`).

Things worth calling out:

- **`resolveMediaUrls` batches signed-URL creation.** Instead of one Supabase
  Storage call per media row, every query that returns media rows collects
  all rows that have a `storage_key`, makes a single
  `supabase.storage.from(MEDIA_BUCKET).createSignedUrls([...keys], 3600)`
  call, and falls back to the legacy stored `media_url` for any row without a
  `storage_key` (pre-migration rows) or where the signed-URL call didn't
  return one. This is why every media-returning query is `async` even though
  the core row fetch is one `pool.query`.
- **`APPROVAL_TYPE_TO_DB`** maps the app's clean enum to the prose strings the
  DB's `action_type` check constraint actually requires:

  | App enum         | DB `action_type`          |
  | ---------------- | -------------------------- |
  | `make_public`    | `mark as public`           |
  | `retract_public` | `retract public status`    |
  | `delete_public`  | `delete public photo`      |
  | `publish_post`   | `publish story`            |
  | `retract_post`   | `retract published story`  |
  | `delete_post`    | `delete published story`   |

  The first three prose values predate this app (travel-archives wrote them)
  and can't be renamed; the post values follow the same convention.
  `DB_TO_APPROVAL_TYPE` is the derived inverse map, used when reading rows
  back out. **`actions.ts` imports `APPROVAL_TYPE_TO_DB` from here** rather
  than duplicating the map.
- **Published-only is the default for post reads.** `getPosts` and `getPost`
  filter `status = 'published'` in SQL — public pages can't accidentally leak
  a draft. The any-status variants (`getMyPostsForTrip`, `getPostForEdit`)
  exist specifically for the authoring flow, and their callers do the
  ownership checks.

`queries.ts` never receives a `User` for auth purposes — most read functions
don't check permissions themselves (e.g. `getTripMedia` will happily return
private media for a trip you're not on). **The calling page is responsible for
gating** — see the membership check in the `/archive/[slug]` flow below.

### `src/lib/actions.ts`

All writes, as `"use server"` functions. Every one starts by calling
`getSessionUser()` (or `requireMembership`, which wraps it) and returns an
`ActionState` (`{ error?: string }`) rather than throwing, so `<form>`s using
`useActionState` can render the error inline. Actions called directly from
client components take plain arguments and return the same shape.

Groups:

- **Auth**: `login` (Zod-validates, bcrypt-compares, `createSession`,
  `redirect("/archive")`), `logout` (`destroySession`, `redirect("/")`).
- **Members**: `createMember` (admin-only; role is hardcoded to `'member'` in
  the INSERT — the DB's `only_one_admin` unique index is the real backstop),
  `changePassword` (bcrypt-verifies current password, then re-issues the
  session cookie with the new token-version so the *current* browser stays
  logged in while every other cookie for that user silently stops working).
- **Uploads**: `uploadMedia(tripSlug, formData)` — **one file per action
  call**; the client loops over a multi-file selection and invokes the action
  once per file (this keeps each request under the body-size limit and lets
  one bad file fail without killing the batch). Each call: sniffs the real
  file type from magic bytes (`sniffMediaType`, never trusts client-supplied
  filename/MIME, both attacker-controlled), generates a
  `crypto.randomUUID()`-based storage key (never derived from the client
  filename), uploads to Supabase Storage, then inserts a `media` row with
  `is_public = false` and the new `storage_key`. `requireMembership(tripSlug)`
  is the shared guard: throws unless the caller is signed in and a member of
  that trip.
- **Media lifecycle**: `deletePrivateMedia` (uploader-only, only while
  `NOT is_public`, cascades: nulls any `posts.media_id` pointing at it, drops
  its `approval_requests` rows — required by the `one_target_check`
  constraint, see §4 — deletes the row, best-effort deletes the storage
  object), `requestApproval` (Zod-validated enum; `make_public` requires trip
  membership — any member may pitch any trip media; `retract_public` /
  `delete_public` require you to be the original uploader; refuses duplicate
  pending requests and no-op requests), `decideApproval` (admin-only; see the
  full decision matrix in §3).
- **Stories**: `createDraftPost(tripSlug, formData)` (trip members only;
  slugified from the title with a timestamp suffix on collision; an attached
  `mediaId` must belong to the same trip — `assertMediaBelongsToTrip`; always
  inserts with `status = 'draft'`), `updatePost` (author-only; refuses if
  `status === 'published'` — a live story must be retracted through the pitch
  flow before editing), `deleteDraftPost` (author-only, instant, but only for
  `draft`/`pending` posts; deletes any approval rows first),
  `submitPostForApproval` (author-only, drafts only; flips the post to
  `pending` and files a `publish_post` request), `requestPostApproval`
  (author-only, published posts only; files `retract_post` or `delete_post`).
- **Trips**: `createTrip` / `updateTrip` (admin-only; slugified from the name,
  with a reserved-word check against `desk`/`settings` — those are real
  routes under `/archive` — and a timestamp suffix on collision; membership
  list always includes the admin, even if the form didn't; `updateTrip` diffs
  `trip_members` by deleting rows not in the new set and inserting new ones
  with `ON CONFLICT DO NOTHING`).

Every write path calls `revalidatePath(...)` for the affected routes
afterward (e.g. `/archive`, `/archive/desk`, `/`, `/trips`) since there's no
client cache to invalidate any other way — Server Components refetch fresh on
next navigation to a revalidated path.

### `src/lib/data.ts`

Pure, DB-free, `server-only`-free. Holds:

- Domain types: `User`, `Trip`, `Media`, `Post`, `PostStatus`
  (`draft | pending | published`), `ApprovalRequest`, `ApprovalType`, plus
  `approvalLabel` (UI copy for each approval type).
- Deterministic derivations that need no DB column: `initialsOf(name)`,
  `tintFor(id)`, `variantFor(id)` (picks a `PaintedScene` illustration
  variant), `hueFor(id)` (a hue-rotate offset for placeholder variety) — all
  keyed off a numeric id so the same user/media always renders the same way
  without persisting a color/variant column.

Because this file has no `server-only` import, client components (e.g. photo
cards, avatar stacks, the authoring UI) can import its types and helpers
directly.

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

## 3. Request / data-flow walkthroughs

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
   ├─ getTripBySlug(slug)               [queries.ts]
   │     not found -> notFound()
   ├─ membership check: trip.members.some(m => m.id === user.id)
   │     not a member -> notFound()      <-- the actual privacy gate for this route
   │
   ├─ getTripMedia(slug) + pending-request maps
   │     [queries.ts -> pool.query + batched Supabase createSignedUrls]
   ▼
Render <PrivateTripView> with trip + media + pending state + currentUser
```

### Public page load — `/trips/[slug]`

```
Browser GET /trips/beacon-hills   (no cookie required, no proxy matcher hit)
   │
   ▼
TripPage (Server Component, src/app/(public)/trips/[slug]/page.tsx)
   │  export const dynamic = "force-dynamic"  -- always re-renders, no ISR cache
   │
   ├─ getTrips() -> find by slug, notFound() if missing
   ├─ getTripMedia(slug)   [ALL media, then filtered in the page]
   ├─ getPosts(slug)       [published posts only — filtered in SQL]
   ├─ gallery = all.filter(m => m.isPublic)   <-- media privacy enforced in the page
   │  privateCount = all.length - gallery.length
   ▼
Render curated gallery, "N more in the private archive" teaser, journal stories
```

Note the asymmetry: **post privacy is enforced in SQL** (`getPosts` only ever
selects `status = 'published'`), but **media privacy on this page is enforced
in memory** — the page fetches all media and filters, because it also wants
`privateCount` for the teaser copy. The home page does the same with
`getAllMedia()`. This is safe only because the unfiltered array never reaches
the client's serialized props — be careful if this is ever refactored to pass
the unfiltered array further down.

### The pitch flow — media

```
Client: "Pitch to gallery" button calls requestApproval(mediaId, "make_public", note)
   ▼
requestApproval()  [actions.ts]
   ├─ getSessionUser()                  -- re-derives user server-side
   ├─ Zod-validate the type enum
   ├─ media must exist
   ├─ domain rule: make_public -> caller must be a member of the media's trip
   │              retract/delete -> caller must be the uploader
   ├─ no-op guard (already in the requested state) + duplicate-pending guard
   ├─ INSERT approval_requests (status 'pending', action_type via APPROVAL_TYPE_TO_DB)
   └─ revalidatePath("/archive"), ("/archive/desk")
```

### The pitch flow — stories

Posts carry their own `status` column (`draft → pending → published`), and the
approval queue drives the transitions:

```
Author: /archive/[trip]/write
   ├─ createDraftPost   -> INSERT posts (status 'draft'); attached photo must
   │                       belong to the same trip
   ├─ updatePost        -> author-only; blocked once published
   ├─ deleteDraftPost   -> author-only, instant, draft/pending only
   │                       (deletes the post's approval rows first)
   ▼
submitPostForApproval(postSlug, note)
   ├─ author-only, status must be 'draft'
   ├─ UPDATE posts SET status = 'pending'
   └─ INSERT approval_requests (post_id, 'publish story', 'pending')

Author, later (published stories only):
requestPostApproval(postSlug, "retract_post" | "delete_post", note)
   └─ INSERT approval_requests (post_id, ...)
```

### The editor decides — `decideApproval(requestId, decision, note?)`

Admin-only. Loads the pending request (which references *either* `media_id`
*or* `post_id`), then:

| Request type     | On **approve**                                                                 | On **reject**                    |
| ---------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `make_public`    | `media.is_public = true`                                                        | request marked rejected          |
| `retract_public` | `media.is_public = false`                                                       | request marked rejected          |
| `delete_public`  | **transaction**: orphan `posts.media_id`, delete all the media's requests, delete the media row; then best-effort storage delete | request marked rejected          |
| `publish_post`   | `posts.status = 'published'`                                                    | `posts.status = 'draft'` (author can revise & resubmit) |
| `retract_post`   | `posts.status = 'draft'`                                                        | request marked rejected          |
| `delete_post`    | **transaction**: delete all the post's requests, delete the post                | request marked rejected          |

The two destructive branches run in a real `BEGIN`/`COMMIT` transaction on a
checked-out pool client, because the `one_target_check` constraint (§4) means
the request rows and the target row must go together — a partial failure would
otherwise strand a request pointing at nothing. Storage removal happens
*after* commit and is deliberately best-effort: a dangling object in the
bucket is not worth rolling back a completed DB delete.

Non-destructive decisions end with
`UPDATE approval_requests SET status = <decision>, admin_note = <note>`, and
everything revalidates `/archive/desk`, `/archive`, and `/`.

### Login

```
Client: LoginForm submits <form action={login}>
   ▼
login(prevState, formData)  [actions.ts]
   ├─ Zod: loginSchema (email format, non-empty password)
   ├─ SELECT id, password_hash FROM users WHERE email = $1
   ├─ bcrypt.compare -> no match -> {error}
   ├─ createSession(user.id, user.password_hash)   [session.ts]
   │     version = tokenVersionFor(password_hash)
   │     Set-Cookie: safarnama_session=userId.expires.version.sig;
   │                 httpOnly; sameSite=lax; secure (prod); maxAge=7d
   ▼
redirect("/archive")
```

`LoginPage` itself calls `getSessionUser()` first and redirects already-
logged-in visitors straight to `/archive`. And the public site never links to
`/login` — members reach it only by knowing the URL.

## 4. Database

Postgres (Supabase-hosted) and the `Travel_archives` Storage bucket are
**shared with a separate Express app (`travel-archives`) that has real user
data**. This drives several concrete constraints in the code:

- **Migrations are additive-only.** There is no migration tool/ORM — schema
  changes are one-off scripts run by hand: `node --env-file=.env.local
  scripts/<name>.js`, using the project's own `pg` from `node_modules`.
  `scripts/add-storage-key.js` (single `ADD COLUMN IF NOT EXISTS`) and
  `scripts/add-post-workflow.js` (post authoring schema: `posts.status`,
  `approval_requests.post_id` / `admin_note`, widened `action_type`
  constraint) are the templates — no rollback, no down-migration, and never
  rename or drop anything the other app reads.
- **`approval_requests.action_type` has a check constraint** using prose
  values (see the `APPROVAL_TYPE_TO_DB` table in §2). Every read and write of
  `action_type` goes through `APPROVAL_TYPE_TO_DB` / `DB_TO_APPROVAL_TYPE` in
  `queries.ts` rather than hardcoding a string.
- **`approval_requests` has a `one_target_check` constraint**: every row must
  point at exactly one target (`media_id` XOR `post_id`), never neither. The
  practical consequence: you cannot delete a media/post row while requests
  reference it, and you cannot "detach" a request — deleting a target means
  deleting its request rows first, in the same transaction. Both destructive
  approval branches and both instant-delete actions do exactly this.
- **Never create test users/rows without deleting them afterward** — this is a
  live database, not a disposable dev fixture.

### Pending: storage privacy flip

The `Travel_archives` bucket is still **public**. Current state, as
implemented:

- `media.storage_key` (nullable) records each upload's raw object key
  (`uploadMedia` sets it at insert time as `crypto.randomUUID().<ext>`).
- `queries.ts`'s `resolveMediaUrls` already serves ~1 hour signed URLs
  (`createSignedUrls`, batched once per query) for any row that has a
  `storage_key`. Signed URLs work against public buckets too, so this shipped
  with no visible behavior change — forward-compatible groundwork.
- Rows without a `storage_key` (pre-migration legacy rows) fall back to the
  stored `media_url` (the old public URL).
- The `MEDIA_SELECT` query reads `storage_key` via `to_jsonb(m)->>'storage_key'`
  rather than a plain column reference — a transitional workaround for
  querying a column that may not exist yet in a given environment until
  `scripts/add-storage-key.js` has run; the inline comment says to simplify
  it back to `m.storage_key` once it has.

Before the bucket can actually be flipped to private, two things must happen
first:

1. `travel-archives` (the separate Express app) must switch to signed URLs
   too, since it reads the same bucket.
2. Legacy rows with no `storage_key` need a one-off backfill — derive the key
   from their stored `url` — or their images 404 once public access is gone.

## 5. Domain rules and where they're enforced

| Rule | Enforcement |
|---|---|
| Exactly one admin, ever | DB unique index `only_one_admin` (not app code) — `createMember` hardcodes `role = 'member'` in its INSERT as a first line of defense, but the DB index is the real backstop |
| Admin is a member of every trip, can't be removed | `createTrip`/`updateTrip` force the admin's id into the membership set before writing `trip_members`, and `updateTrip`'s deletion pass only removes ids *not* in that admin-inclusive set |
| Trip slugs are immutable after creation | `updateTrip`'s schema/query never touches `slug`; only `createTrip` sets it (slugified name, reserved-word check against `desk`/`settings`, collision-suffixed with `Date.now().toString(36)`) |
| Nothing becomes public except through an approved pitch | `media.is_public` flips to `true` only inside `decideApproval` on an approved `make_public`; `posts.status` flips to `'published'` only inside `decideApproval` on an approved `publish_post`. No other code path sets either. |
| Any trip member may pitch any media; retract/delete-public are uploader-only | `requestApproval` branches on the type: `make_public` checks `trip_members` membership only; `retract_public`/`delete_public` require `media.uploaded_by === user.id` |
| Story pitches are author-only | `submitPostForApproval` / `requestPostApproval` both filter `author_id = user.id` in the WHERE clause |
| Published stories can't be edited in place | `updatePost` refuses when `status === 'published'` — retract first, edit, re-pitch |
| Private/unpublished deletes are owner-only and instant | `deletePrivateMedia` requires `uploaded_by = user AND NOT is_public` in one WHERE clause; `deleteDraftPost` requires `author_id = user AND status IN ('draft','pending')`. Public work must go through `delete_public`/`delete_post` approval instead. |

## 6. Deployment

This is a standard Next.js App Router app — no custom server — so it deploys
the ordinary Vercel-style way: `npm run build` then `npm run start` (or the
platform's Next.js integration), with the package manager fixed to **npm**
(`package-lock.json` is the lockfile; never mix in pnpm/yarn).

**What runs where:**
- Server Components (every page under `src/app`) and Server Actions
  (`src/lib/actions.ts`) execute exclusively on the server — they're the only
  code that ever touches `pool`, `supabase`, or `SESSION_SECRET`. None of
  `db.ts`, `session.ts`, `auth.ts`, `queries.ts`, `storage.ts` can be imported
  into a client component (`server-only` import enforces this — `storage.ts`
  is the one exception without the literal import, relying on convention).
- `src/proxy.ts` runs at the middleware layer on every request matching
  `/archive/:path*`, before any Server Component renders.
- `data.ts` types/helpers can end up in the client bundle since components
  import them for props — but it contains no secrets and no DB code, by
  design.

**Environment variables needed at runtime** (`.env.local` in dev; platform
env vars in prod):
- `DATABASE_URL` — consumed only by `db.ts`'s `Pool` constructor.
  **Must be single-quoted in `.env.local`**: the password contains `$`, and
  Next.js's dotenv-style loading expands `$VAR` inside double-quoted values,
  silently corrupting the connection string. This is a real, previously-hit
  footgun, not a hypothetical.
- `SESSION_SECRET` — required ≥32 chars; `session.ts` throws at import time
  if missing/short. Must be set before the app can serve any authenticated
  route.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — consumed only by `storage.ts`'s
  `createClient`. The service-role key must never be exposed to the client
  (it isn't — `storage.ts` is never imported by a `"use client"` file).

**next.config.ts** adds a few deploy-relevant details: `reactCompiler: true`
(React Compiler on for the whole build), an `images.remotePatterns` allowlist
for the Supabase storage hostname (both `/object/public/...` and
`/object/sign/...` paths, the latter for when signed URLs are the norm
post-flip), a raised Server Actions `bodySizeLimit: "50mb"` (needed because
`uploadMedia` posts actual photo/video bytes through the action, one file per
request, not a separate upload endpoint), and global security headers
(`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`X-Frame-Options: DENY`) applied to every route.

**Dev vs. prod differences actually present in the code:**
- `db.ts`'s `globalThis.__pgPool` caching only applies outside production —
  in dev it survives HMR reloads; in prod the pool is constructed once per
  process and lives for its lifetime.
- `session.ts`'s cookie is `secure: process.env.NODE_ENV === "production"` —
  in dev over plain HTTP the cookie is sent without the `Secure` flag (so
  `localhost` works); in prod it requires HTTPS.
- Every public page uses `export const dynamic = "force-dynamic"` (home,
  `/trips`, `/trips/[slug]`, `/journal`, `/journal/[slug]`) and so always
  renders fresh server-side on every request in any
  environment — there is no static-generation/ISR path to reason about for
  those routes; they hit Postgres (and Supabase Storage for signed URLs) on
  every single request in production.
