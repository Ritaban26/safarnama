import Link from "next/link";
import { notFound } from "next/navigation";
import PaintedScene from "@/components/PaintedScene";
import PhotoCard from "@/components/PhotoCard";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/motion/Reveal";
import { Eyebrow, Avatar, WaveDivider } from "@/components/ui";
import { IconArrow, IconCamera, IconUsers, IconClock } from "@/components/icons";
import { getTrips, getTripMedia, getPosts } from "@/lib/queries";
import type { Trip } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trips = await getTrips();
  const trip = trips.find((t) => t.slug === slug);
  if (!trip) notFound();

  const [media, stories] = await Promise.all([getTripMedia(slug), getPosts(slug)]);
  const gallery = media.filter((m) => m.isPublic);

  return (
    <div className="bg-paper">
      <SiteNav tone="dusk" />

      {/* hero */}
      <section className="relative flex min-h-[72svh] flex-col justify-end overflow-hidden bg-dusk-deep text-paper">
        <div className="absolute inset-0">
          <PaintedScene variant={trip.cover} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-dusk-deep/90 via-dusk-deep/20 to-dusk-deep/40" />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-14 pt-44">
          <Link
            href="/trips"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-paper/70 transition-colors hover:text-gold"
          >
            <IconArrow className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
            All journeys
          </Link>
          <p className="rise mt-6 font-hand text-2xl text-gold sm:text-3xl">{trip.dates}</p>
          <h1 className="rise rise-2 mt-2 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            {trip.name}
          </h1>
          <div className="rise rise-3 mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-paper/80">
            <span className="inline-flex items-center gap-2">
              <IconUsers className="h-5 w-5 text-gold" />
              {trip.members.length} travellers
            </span>
            <span className="inline-flex items-center gap-2">
              <IconCamera className="h-5 w-5 text-gold" />
              {gallery.length} curated frames
            </span>
            <span className="inline-flex items-center gap-2">
              <IconClock className="h-5 w-5 text-gold" />
              {trip.location}
            </span>
          </div>
        </div>
      </section>

      {/* intro + travellers */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="wash -right-24 top-4 h-72 w-72" style={{ background: "#86b5c9" }} />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Eyebrow>Field notes</Eyebrow>
            <p className="mt-5 max-w-2xl font-display text-2xl leading-relaxed text-ink sm:text-[1.7rem]">
              {trip.description}
            </p>
          </div>
          <aside className="self-start rounded-3xl border border-ink/10 bg-paper-warm p-7 shadow-painted lg:mt-8">
            <h2 className="font-display text-xl font-semibold">Who was there</h2>
            <ul className="mt-5 space-y-4">
              {trip.members.map((u) => (
                <li key={u.id} className="flex items-center gap-3.5">
                  <Avatar user={u} />
                  <div>
                    <p className="font-semibold leading-tight">{u.name}</p>
                    <p className="text-sm text-ink-faint">
                      {u.role === "admin" ? "editor & traveller" : "traveller"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <WaveDivider from="#f6efdf" to="#ecdfc3" />

      {/* curated gallery */}
      <section className="bg-paper-deep">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>The curated gallery</Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
                What the editor printed
              </h2>
            </div>
            <p className="font-hand text-xl text-ink-soft">
              {gallery.length} frames made the page
            </p>
          </div>

          {gallery.length === 0 && (
            <p className="mt-14 rounded-3xl border border-dashed border-ink/20 p-12 text-center font-hand text-2xl text-ink-soft">
              The editor hasn&apos;t printed anything from this trip yet.
            </p>
          )}

          <div className="mt-14 columns-1 gap-8 sm:columns-2 lg:columns-3 [&>*]:mb-10 [&>*]:break-inside-avoid">
            {gallery.map((m, i) => {
              const tall = i % 3 === 1;
              return (
                <Reveal key={m.id} delay={(i % 3) * 0.1}>
                  <PhotoCard item={m} index={i} ratio={tall ? "aspect-[3/4]" : "aspect-[4/3]"} />
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* stories */}
      {stories.length > 0 && (
        <>
          <WaveDivider from="#ecdfc3" to="#f6efdf" />
          <section className="mx-auto max-w-6xl px-6 py-20">
            <Eyebrow>From the journal</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
              Written on this journey
            </h2>
            <div className="mt-12 grid gap-10 lg:grid-cols-2">
              {stories.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/journal/${post.slug}`}
                  className="group grid gap-6 sm:grid-cols-[200px_1fr]"
                >
                  <div className="w-full max-w-[220px]">
                    {post.media && (
                      <PhotoCard
                        item={post.media}
                        index={i + 2}
                        ratio="aspect-square"
                        showCaption={false}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-hand text-lg text-ember">{post.date}</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold leading-snug transition-colors group-hover:text-ember">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 leading-relaxed text-ink-soft">{post.excerpt}</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink-faint">
                      <Avatar user={post.author} size="h-6 w-6 text-[0.6rem]" /> {post.author.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* next trip nudge */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <NextTrip trips={trips} currentSlug={trip.slug} />
      </section>

      <WaveDivider from="#f6efdf" to="#243a52" />
      <SiteFooter />
    </div>
  );
}

function NextTrip({ trips, currentSlug }: { trips: Trip[]; currentSlug: string }) {
  if (trips.length < 2) return null;
  const idx = trips.findIndex((t) => t.slug === currentSlug);
  const next = trips[(idx + 1) % trips.length];
  return (
    <Link
      href={`/trips/${next.slug}`}
      className="group relative block overflow-hidden rounded-3xl bg-dusk text-paper shadow-painted"
    >
      <div className="absolute inset-0 opacity-60 transition-transform duration-500 group-hover:scale-[1.03]">
        <PaintedScene variant={next.cover} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-dusk-deep/90 to-dusk-deep/30" />
      <div className="relative flex items-center justify-between gap-6 px-8 py-10 sm:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            Next journey
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {next.name}
          </p>
          <p className="mt-1 font-hand text-xl text-paper/75">{next.dates}</p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-paper text-ink transition-colors group-hover:bg-gold">
          <IconArrow className="h-6 w-6" />
        </span>
      </div>
    </Link>
  );
}
