import "server-only";
import { redirect } from "next/navigation";
import { readSession, tokenVersionFor } from "./session";
import { getUserAuthById } from "./queries";
import type { User } from "./data";

export async function getSessionUser(): Promise<User | null> {
  const session = await readSession();
  if (session == null) return null;
  const row = await getUserAuthById(session.userId);
  if (!row) return null;
  // Binds the cookie to the current password hash: changing the password
  // rotates this version, so older cookies stop authenticating immediately.
  if (tokenVersionFor(row.passwordHash) !== session.version) return null;
  return row.user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/archive");
  return user;
}
