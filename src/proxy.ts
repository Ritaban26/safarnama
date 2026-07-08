import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "safarnama_session";

/**
 * Defense-in-depth only: this is an optimistic redirect, not the source of truth.
 * Pages still call requireUser/requireAdmin (src/lib/auth.ts) for the real check.
 * Reimplements session.ts's HMAC verification here because Proxy files can't
 * import next/headers-based server-only modules.
 *
 * The cookie payload is `userId.expires.version.sig`. The version binds the
 * cookie to the user's password hash so changePassword can invalidate older
 * sessions — but checking it requires a DB lookup, which this proxy doesn't
 * have. So this only verifies signature + expiry; the version check happens
 * in auth.ts's getSessionUser, which is the real source of truth.
 */
function isValidSession(raw: string | undefined): boolean {
  if (!raw) return false;
  const [userId, expires, version, sig] = raw.split(".");
  if (!userId || !expires || !version || !sig) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${userId}.${expires}.${version}`).digest("base64url")
  );
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  if (Number(expires) < Date.now()) return false;
  return Number.isInteger(Number(userId));
}

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE)?.value;
  if (!isValidSession(cookie)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/archive/:path*",
};
