import Link from "next/link";
import PaintedScene, { type SceneVariant } from "@/components/PaintedScene";
import PhotoCard, { MediaFrame } from "@/components/PhotoCard";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SnapHome from "@/components/motion/SnapHome";
import { Eyebrow, AvatarStack, Badge } from "@/components/ui";
import { IconArrow, IconLock, IconGlobe, IconFeather, IconCamera } from "@/components/icons";
import { getTrips, getAllMedia, getPosts } from "@/lib/queries";

const CHAPTERS = ["The dusk", "The idea", "Journeys", "Two worlds", "Journal", "Enter"];

export const dynamic = "force-dynamic";

export default async function Home() {
  const [trips, media, posts] = await Promise.all([getTrips(), getAllMedia(), getPosts()]);
  const publicMedia = media.filter((m) => m.isPublic);
  const journalPicks = posts.slice(0, 3);
  const heroStrip = publicMedia.slice(0, 3);
  const manifestoShot = publicMedia[3] ?? publicMedia[0];

  return (
    <SnapHome chapters={CHAPTERS}>
      <SiteNav tone="dusk" />

      {/* ============ chapter 1 — hero ============ */}
      <section
        data-chapter
        data-hero
        className="relative flex h-svh flex-col overflow-hidden bg-dusk-deep text-paper lg:snap-start"
      >
        <div data-hero-scene className="absolute inset-0 will-change-transform">
          <PaintedScene variant="dusk" />
        </div>
        {/* parallax cloud decks — differential speed = depth */}
        <div aria-hidden data-parallax="0.5" className="drift absolute left-0 top-[12%] w-[120%] opacity-70">
          <svg viewBox="0 0 1200 120" className="w-full">
            <g fill="#f6dba8">
              <ellipse cx="160" cy="60" rx="130" ry="18" opacity="0.7" />
              <ellipse cx="520" cy="40" rx="170" ry="22" opacity="0.55" />
              <ellipse cx="940" cy="70" rx="150" ry="18" opacity="0.65" />
            </g>
          </svg>
        </div>
        <div aria-hidden data-parallax="0.9" className="drift-slow absolute left-0 top-[28%] w-[120%] opacity-50">
          <svg viewBox="0 0 1200 120" className="w-full">
            <g fill="#eab07a">
              <ellipse cx="300" cy="60" rx="160" ry="16" opacity="0.6" />
              <ellipse cx="800" cy="40" rx="190" ry="20" opacity="0.5" />
            </g>
          </svg>
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-dusk-deep/60 via-transparent to-dusk-deep/80" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center px-6 pt-24">
          <p className="rise rise-1 font-hand text-2xl text-gold sm:text-3xl">
            the shared drive is dead. long live the archive.
          </p>
          <h1 className="rise rise-2 mt-3 max-w-3xl font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-8xl">
            Every journey,
            <br />
            <em className="text-gold">painted</em> into memory.
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-lg leading-relaxed text-paper/85">
            Safarnama is the private travel magazine of a small circle of friends —
            and this is its public face. What you see here was chosen with intent:
            the best frames, the truest stories, nothing more.
          </p>
          <div className="rise rise-4 mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/trips"
              className="group inline-flex items-center gap-2.5 rounded-full bg-ember px-7 py-3.5 font-semibold text-paper shadow-lift transition-colors hover:bg-ember-deep"
            >
              Wander the journeys
              <IconArrow className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 rounded-full border border-paper/35 px-7 py-3.5 font-semibold text-paper backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
            >
              Read the journal
            </Link>
          </div>
        </div>

        {/* floating frames at three parallax depths */}
        {heroStrip.length > 0 && (
          <div className="pointer-events-none absolute bottom-20 right-8 hidden items-end gap-6 xl:flex">
            {heroStrip.map((m, i) => (
              <div
                key={m.id}
                data-parallax={[0.7, 0.4, 0.2][i]}
                className={`pointer-events-auto ${i === 1 ? "w-44 -translate-y-8" : "w-40"}`}
              >
                <PhotoCard item={m} index={i} ratio="aspect-square" showCaption={false} />
              </div>
            ))}
          </div>
        )}

        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-paper/70">
          <span className="floaty block">
            <IconArrow className="h-6 w-6 rotate-90" />
          </span>
        </div>
      </section>

      {/* ============ chapter 2 — manifesto ============ */}
      <section
        data-chapter
        className="relative flex min-h-svh items-center overflow-hidden bg-paper lg:h-svh lg:snap-start"
      >
        <div aria-hidden data-parallax="0.6" className="wash -left-32 top-10 h-96 w-96" style={{ background: "#88a868" }} />
        <div aria-hidden data-parallax="0.3" className="wash -right-24 bottom-0 h-80 w-80" style={{ background: "#cf8295" }} />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-0">
          <div data-depth>
            <Eyebrow>Why this exists</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              A magazine for us.
              <br />
              <span className="flourish">A gallery for everyone.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              For years our trips lived in a shared folder — buried, unsorted,
              quality be damned. Safarnama replaces it with something built to
              last: behind the curtain, we keep <strong className="text-ink">everything</strong>.
              Out front, an editor curates only the photographs and stories worth
              printing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Badge tone="moss"><IconLock className="h-3.5 w-3.5" /> Private by default</Badge>
              <Badge tone="ember"><IconGlobe className="h-3.5 w-3.5" /> Public by approval</Badge>
              <Badge tone="gold"><IconFeather className="h-3.5 w-3.5" /> Stories by those who were there</Badge>
            </div>
          </div>
          {manifestoShot && (
            <div data-depth className="relative mx-auto hidden w-full max-w-sm self-center sm:block">
              <PhotoCard item={manifestoShot} index={2} ratio="aspect-[3/4]" />
              <p className="absolute -left-10 top-1/2 hidden -rotate-6 font-hand text-2xl text-moss xl:block">
                every frame, chosen on purpose →
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============ chapter 3 — journeys ============ */}
      <section
        data-chapter
        className="relative flex min-h-svh flex-col overflow-hidden bg-paper-deep lg:h-svh lg:snap-start"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-20 lg:min-h-0 lg:py-[7vh]">
          <div data-depth className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>The journeys</Eyebrow>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {trips.length} expedition{trips.length === 1 ? "" : "s"}, so far
              </h2>
            </div>
            <Link
              href="/trips"
              className="group inline-flex items-center gap-2 font-semibold text-moss-deep transition-colors hover:text-ember"
            >
              All journeys
              <IconArrow className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          <div
            data-depth-stagger
            className="mt-10 grid flex-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:min-h-0 lg:grid-rows-2 lg:gap-y-6"
          >
            {trips.slice(0, 4).map((trip) => {
              const pub = publicMedia.filter((m) => m.tripSlug === trip.slug);
              return (
                <Link
                  key={trip.slug}
                  href={`/trips/${trip.slug}`}
                  className="group flex min-h-0 flex-col"
                >
                  <div className="photo-card relative flex min-h-0 flex-1 flex-col rounded-sm">
                    <span aria-hidden className="tape" />
                    <div className="relative min-h-40 flex-1 overflow-hidden rounded-[3px]">
                      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
                        <PaintedScene variant={trip.cover} />
                      </div>
                      <span className="absolute left-3 top-3">
                        <Badge tone="gold">
                          <IconCamera className="h-3.5 w-3.5" /> {pub.length} public frames
                        </Badge>
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-ink/65 to-transparent p-4">
                        <div>
                          <h3 className="font-display text-2xl font-semibold tracking-tight text-paper transition-colors group-hover:text-gold">
                            {trip.name}
                          </h3>
                          <p className="font-hand text-lg text-paper/85">{trip.dates}</p>
                        </div>
                        <AvatarStack users={trip.members} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ chapter 4 — two worlds ============ */}
      <section
        data-chapter
        className="relative flex min-h-svh items-center overflow-hidden bg-dusk-deep text-paper lg:h-svh lg:snap-start"
      >
        <div aria-hidden className="absolute inset-0 opacity-60">
          {[[6, 18], [16, 70], [28, 30], [44, 12], [56, 75], [68, 22], [82, 60], [92, 26]].map(
            ([x, y], i) => (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-paper/70"
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            )
          )}
        </div>
        <div
          aria-hidden
          data-parallax="0.4"
          className="flicker absolute -bottom-40 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(242,168,92,0.35) 0%, rgba(242,168,92,0) 65%)" }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20 lg:py-0">
          <div data-depth className="mx-auto max-w-2xl text-center">
            <Eyebrow light>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Two worlds, one hearth
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-paper/75">
              Inside the circle, total transparency. Outside it, total intention.
              Nothing crosses the boundary without the editor&apos;s hand.
            </p>
          </div>
          <div data-depth-stagger className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/12 bg-white/6 p-7 backdrop-blur-sm">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-paper">
                <IconLock className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold">The private archive</h3>
              <p className="mt-2.5 leading-relaxed text-paper/70">
                Members upload everything from their trips — the masterpieces and
                the blurry disasters alike. Within a trip, everyone sees everything.
              </p>
              <p className="mt-3 font-hand text-xl text-gold/90">{media.length} memories and counting</p>
            </div>
            <div className="rounded-3xl border border-gold/40 bg-gold/8 p-7 backdrop-blur-sm lg:-translate-y-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-paper">
                <IconFeather className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold">The editor&apos;s desk</h3>
              <p className="mt-2.5 leading-relaxed text-paper/70">
                Want a photo on the public page? You pitch it. Every publish,
                retraction, and deletion of public work passes one editor&apos;s
                deliberate yes.
              </p>
              <p className="mt-3 font-hand text-xl text-gold/90">contributors pitch, the editor prints</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/6 p-7 backdrop-blur-sm">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky text-dusk-deep">
                <IconGlobe className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold">The public face</h3>
              <p className="mt-2.5 leading-relaxed text-paper/70">
                Curated galleries and first-person stories — the highlight reel we
                are proud to show the world, with everything else kept safe behind it.
              </p>
              <p className="mt-3 font-hand text-xl text-gold/90">you are here ✦</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ chapter 5 — journal ============ */}
      <section
        data-chapter
        className="relative flex min-h-svh flex-col overflow-hidden bg-paper lg:h-svh lg:snap-start"
      >
        <div aria-hidden data-parallax="0.5" className="wash -right-32 top-24 h-96 w-96" style={{ background: "#86b5c9" }} />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-20 lg:min-h-0 lg:py-[7vh]">
          <div data-depth className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>The journal</Eyebrow>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Stories from the road
              </h2>
            </div>
            <Link
              href="/journal"
              className="group inline-flex items-center gap-2 font-semibold text-moss-deep transition-colors hover:text-ember"
            >
              All entries
              <IconArrow className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          {journalPicks.length === 0 && (
            <p className="mt-10 rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
              The first story is still being written by hand.
            </p>
          )}
          <div data-depth-stagger className="mt-10 grid flex-1 gap-8 lg:min-h-0 lg:grid-cols-3">
            {journalPicks.map((post, i) => (
              <Link key={post.slug} href={`/journal/${post.slug}`} className="group flex min-h-0 flex-col">
                <div className="photo-card relative flex min-h-44 flex-none flex-col rounded-sm lg:min-h-0 lg:flex-1">
                  <span aria-hidden className="tape" />
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] lg:aspect-auto lg:min-h-36 lg:flex-1">
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
                      {post.media ? (
                        <MediaFrame item={post.media} />
                      ) : (
                        <PaintedScene variant={["dusk", "meadow", "sea"][i % 3] as SceneVariant} />
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-4 font-hand text-xl text-ember">{post.date}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-ember">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 leading-relaxed text-ink-soft">{post.excerpt}</p>
                <p className="mt-2 text-sm font-semibold text-ink-faint">by {post.author.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ chapter 6 — enter + footer ============ */}
      <section data-chapter className="flex min-h-svh flex-col bg-paper lg:snap-start">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-16">
          <div data-depth className="relative w-full overflow-hidden rounded-4xl bg-moss-deep text-paper shadow-lift">
            <div className="absolute inset-0 opacity-50">
              <PaintedScene variant="meadow" />
            </div>
            <div className="absolute inset-0 bg-linear-to-r from-moss-deep via-moss-deep/80 to-transparent" />
            <div className="relative max-w-xl px-10 py-14 sm:px-14">
              <p className="font-hand text-2xl text-gold">were you there?</p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                The circle keeps everything.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-paper/85">
                Members can step behind the curtain — every photo, every video,
                every trip you were part of, ready to relive and download.
              </p>
              <p className="mt-7 inline-flex items-center gap-2.5 font-hand text-xl text-gold">
                by invitation only
              </p>
            </div>
          </div>
        </div>
        <SiteFooter />
      </section>
    </SnapHome>
  );
}
