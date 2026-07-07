import Link from "next/link";
import { Avatar } from "./ui";
import { IconCompass, IconLock } from "./icons";
import { logout } from "@/lib/actions";
import type { User } from "@/lib/data";

/** Shared chrome for the signed-in (member/admin) side of the house. */
export default function ArchiveShell({
  user,
  active,
  children,
}: {
  user: User;
  active: "archive" | "admin";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-paper">
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper-warm/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-moss text-paper transition-colors group-hover:bg-ember">
                <IconCompass className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">Safarnama</span>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss-deep sm:inline-flex">
              <IconLock className="h-3.5 w-3.5" />
              Private archive
            </span>
          </div>

          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link
              href="/archive"
              className={`rounded-full px-4 py-2 transition-colors ${
                active === "archive" ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              My trips
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className={`rounded-full px-4 py-2 transition-colors ${
                  active === "admin" ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                Editor&apos;s desk
              </Link>
            )}
            <Link
              href="/"
              className="hidden rounded-full px-4 py-2 text-ink-soft transition-colors hover:bg-ink/5 sm:block"
            >
              Public site
            </Link>
            <span className="ml-3 flex items-center gap-2.5 border-l border-ink/10 pl-4">
              <Avatar user={user} size="h-8 w-8 text-xs" />
              <span className="hidden leading-tight md:block">
                <span className="block text-sm">{user.name}</span>
                <span className="block text-xs font-normal text-ink-faint">
                  {user.role === "admin" ? "editor" : "member"}
                </span>
              </span>
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">{children}</main>
      <footer className="border-t border-ink/10 py-6 text-center text-sm text-ink-faint">
        Everything here stays inside the circle.{" "}
        <form action={logout} className="inline">
          <button
            type="submit"
            className="cursor-pointer underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ember"
          >
            Sign out
          </button>
        </form>
      </footer>
    </div>
  );
}
