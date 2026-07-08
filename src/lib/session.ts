import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "safarnama_session";
const MAX_AGE_S = 60 * 60 * 24 * 7; // one week

function readSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short — set it to a random string of at least 32 characters in .env.local",
    );
  }
  return secret;
}

const SESSION_SECRET: string = readSecret();

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

/**
 * Derives a short token-version from the user's current bcrypt password hash.
 * Never put the raw hash in the cookie — this is a one-way fingerprint so
 * changePassword can invalidate older cookies without a DB-side session table.
 */
export function tokenVersionFor(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 8);
}

export interface SessionPayload {
  userId: number;
  version: string;
}

export async function createSession(userId: number, passwordHash: string): Promise<void> {
  const expires = Date.now() + MAX_AGE_S * 1000;
  const version = tokenVersionFor(passwordHash);
  const payload = `${userId}.${expires}.${version}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Returns the payload from a valid, unexpired session cookie, else null. Does not check token version — auth.ts does that against the live password hash. */
export async function readSession(): Promise<SessionPayload | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, expires, version, sig] = raw.split(".");
  if (!userId || !expires || !version || !sig) return null;
  const expected = Buffer.from(sign(`${userId}.${expires}.${version}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  const id = Number(userId);
  if (!Number.isInteger(id)) return null;
  return { userId: id, version };
}
