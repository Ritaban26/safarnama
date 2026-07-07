import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "safarnama_session";
const MAX_AGE_S = 60 * 60 * 24 * 7; // one week

function sign(payload: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
}

export async function createSession(userId: number): Promise<void> {
  const expires = Date.now() + MAX_AGE_S * 1000;
  const payload = `${userId}.${expires}`;
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

/** Returns the user id from a valid, unexpired session cookie, else null. */
export async function readSession(): Promise<number | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, expires, sig] = raw.split(".");
  if (!userId || !expires || !sig) return null;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  const id = Number(userId);
  return Number.isInteger(id) ? id : null;
}
