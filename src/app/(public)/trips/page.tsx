import Link from "next/link";
import PaintedScene from "@/components/PaintedScene";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/motion/Reveal";
import { Eyebrow, AvatarStack, Badge, WaveDivider } from "@/components/ui";
import { IconCamera, IconFeather, IconArrow } from "@/components/icons";
import { getTrips, getAllMedia, getPosts } from "@/lib/queries";

export const metadata = { title: "Journeys — Safarnama" };
export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const [trips, media, posts] = await Promise.all([getTrips(), getAllMedia(), getPosts()]);
  const years = [...new Set(trips.map((t) => t.year))].sort().reverse();

  return (
    <div className="bg-paper">
      <SiteNav />

      <section className="relative overflow-hidden pt-40">
        <div aria-hidden className="wash -left-24 top-16 h-80 w-80" style={{ background: "#88a868" }} />
        <div aria-hidden className="wash right-0 top-48 h-72 w-72" style={{ background: "#d9a441" }} />
        <div className="relative mx-auto max-w-6xl px-6">
          <Eyebrow>The atlas</Eyebrow>
          <h1 className="rise mt-4 max-w-2xl font-display text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
            Every journey we have <span className="flourish">kept</span>
          </h1>
          <p className="rise rise-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Each trip is a chapter — dated, located, and curated by the people who
            lived it. The galleries below show only what the editor approved for
            the world to see.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-16">
        {trips.length === 0 && (
          <p className="rounded-3xl border border-dashed border-ink/20 p-12 text-center font-hand text-2xl text-ink-soft">
            The atlas is still blank — the first journey is being written.
          </p>
        )}
        {years.map((year) => (
          <div key={year} className="mt-16 first:mt-0">
            <div className="flex items-center gap-5">
              <h2 className="font-display text-3xl font-semibold text-ink-faint">{year}</h2>
              <span aria-hidden className="h-px flex-1 bg-ink/15" />
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2">
              {trips
                .filter((t) => t.year === year)
                .map((trip, i) => {
                  const pub = media.filter((m) => m.tripSlug === trip.slug && m.isPublic);
                  const stories = posts.filter((p) => p.tripSlug === trip.slug);
                  return (
                    <Reveal key={trip.slug} delay={(i % 2) * 0.12}>
                    <Link href={`/trips/${trip.slug}`} className="group block">
                      <div className={`photo-card relative rounded-sm ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                        <span aria-hidden className="tape" />
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[3px]">
                          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
                            <PaintedScene variant={trip.cover} />
                          </div>
                          <div className="absolute left-3 top-3 flex gap-2">
                            <Badge tone="gold">
                              <IconCamera className="h-3.5 w-3.5" /> {pub.length}
                            </Badge>
                            {stories.length > 0 && (
                              <Badge tone="ember">
                                <IconFeather className="h-3.5 w-3.5" /> {stories.length}{" "}
                                {stories.length === 1 ? "story" : "stories"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-1 pt-3">
                          <span className="font-hand text-xl text-ink-soft">{trip.dates}</span>
                          <AvatarStack users={trip.members} />
                        </div>
                      </div>
                      <div className="mt-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-3xl font-semibold tracking-tight transition-colors group-hover:text-ember">
                            {trip.name}
                          </h3>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.15em] text-ink-faint">
                            {trip.location}
                          </p>
                        </div>
                        <IconArrow className="mt-2 h-6 w-6 shrink-0 text-ink-faint transition-all duration-200 group-hover:translate-x-1 group-hover:text-ember" />
                      </div>
                      <p className="mt-3 line-clamp-2 max-w-md leading-relaxed text-ink-soft">
                        {trip.description}
                      </p>
                    </Link>
                    </Reveal>
                  );
                })}
            </div>
          </div>
        ))}
      </section>

      <WaveDivider from="#f6efdf" to="#243a52" />
      <SiteFooter />
    </div>
  );
}
