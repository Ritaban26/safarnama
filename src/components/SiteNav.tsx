import Link from "next/link";
import { IconCompass } from "./icons";

export default function SiteNav({ tone = "paper" }: { tone?: "paper" | "dusk" }) {
  const onDusk = tone === "dusk";
  return (
    <header
      className={`fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-5 py-3 backdrop-blur-md ${
        onDusk
          ? "border-white/15 bg-dusk-deep/55 text-paper"
          : "border-ink/10 bg-paper-warm/80 text-ink shadow-painted"
      }`}
    >
      <Link href="/" className="group flex items-center gap-2.5">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${
            onDusk ? "bg-ember/90 text-paper" : "bg-moss text-paper"
          } transition-colors group-hover:bg-ember`}
        >
          <IconCompass className="h-5 w-5" />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">
          Safarnama
        </span>
        <span
          className={`mt-1 hidden font-hand text-base sm:block ${
            onDusk ? "text-paper/70" : "text-ink-soft"
          }`}
        >
          a travel archive
        </span>
      </Link>

      <nav className="flex items-center gap-1 text-[0.95rem] font-medium">
        <Link
          href="/trips"
          className={`rounded-full px-4 py-2 transition-colors ${
            onDusk ? "hover:bg-white/10" : "hover:bg-ink/5"
          }`}
        >
          Journeys
        </Link>
        <Link
          href="/journal"
          className={`rounded-full px-4 py-2 transition-colors ${
            onDusk ? "hover:bg-white/10" : "hover:bg-ink/5"
          }`}
        >
          Journal
        </Link>
      </nav>
    </header>
  );
}
