import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { getUserById } from "./queries";
import type { User } from "./data";

export async function getSessionUser(): Promise<User | null> {
  const userId = await readSession();
  if (userId == null) return null;
  return getUserById(userId);
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
