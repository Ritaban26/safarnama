import Link from "next/link";
import { IconCompass } from "./icons";

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-dusk-deep text-paper">
      {/* stars */}
      <div aria-hidden className="absolute inset-0 opacity-70">
        {[
          [8, 22], [18, 60], [27, 35], [38, 18], [49, 55], [58, 28],
          [69, 64], [78, 20], [88, 48], [94, 70], [13, 80], [83, 82],
        ].map(([x, y], i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-paper/80"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ember text-paper">
              <IconCompass className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-semibold">Safarnama</span>
          </div>
          <p className="mt-4 max-w-sm text-paper/65">
            A private travel magazine with a curated public face. Everything you
            see here was chosen, on purpose, by the people who were there.
          </p>
          <p className="mt-6 font-hand text-xl text-gold/90">
            “not all those who wander are lost” — but we do keep records.
          </p>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-paper/90">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-paper/65">
            <li><Link href="/trips" className="transition-colors hover:text-gold">All journeys</Link></li>
            <li><Link href="/journal" className="transition-colors hover:text-gold">The journal</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-paper/90">The circle</h3>
          <ul className="mt-4 space-y-2.5 text-paper/65">
            <li><Link href="/archive" className="transition-colors hover:text-gold">Private archive</Link></li>
            <li><Link href="/admin" className="transition-colors hover:text-gold">Editor&apos;s desk</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-5 text-center text-sm text-paper/45">
        © 2026 Safarnama. Built slowly, kept forever.
      </div>
    </footer>
  );
}
