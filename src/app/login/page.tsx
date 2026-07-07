import Link from "next/link";
import { redirect } from "next/navigation";
import PaintedScene from "@/components/PaintedScene";
import LoginForm from "@/components/LoginForm";
import { IconCompass, IconArrow } from "@/components/icons";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Sign in — Safarnama" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/archive");
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-dusk-deep px-6 py-16">
      <div className="absolute inset-0">
        <PaintedScene variant="lantern" />
      </div>
      <div className="absolute inset-0 bg-dusk-deep/30" />

      <main className="relative w-full max-w-md">
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-paper/70 transition-colors hover:text-gold"
        >
          <IconArrow className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
          Back to the archive
        </Link>

        <div className="rounded-[1.75rem] border border-ink/10 bg-paper-warm/95 p-9 shadow-lift backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flicker grid h-11 w-11 place-items-center rounded-full bg-ember text-paper">
              <IconCompass className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
              <p className="font-hand text-lg text-ink-soft">the lantern&apos;s been kept lit</p>
            </div>
          </div>

          <LoginForm />

          <p className="mt-7 border-t border-ink/10 pt-5 text-center text-sm leading-relaxed text-ink-faint">
            Membership is by invitation — the circle knows who it is.
          </p>
        </div>
      </main>
    </div>
  );
}
