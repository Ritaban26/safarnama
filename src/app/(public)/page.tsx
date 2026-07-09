import Link from "next/link";
import PaintedScene, { type SceneVariant } from "@/components/PaintedScene";
import PhotoCard, { MediaFrame } from "@/components/PhotoCard";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import SmoothScrollHome from "@/components/motion/SmoothScrollHome";
import { Eyebrow, AvatarStack, Badge } from "@/components/ui";
import { IconArrow, IconFeather, IconCamera } from "@/components/icons";
import { getTrips, getAllMedia, getPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [trips, media, posts] = await Promise.all([getTrips(), getAllMedia(), getPosts()]);
  const publicMedia = media.filter((m) => m.isPublic);
  const journalPicks = posts.slice(0, 3);
  const manifestoShot = publicMedia[3] ?? publicMedia[0];
  const circleShot = publicMedia[4] ?? publicMedia[0];

  return (
    <SmoothScrollHome>
      <SiteNav tone="dusk" />

      {/* ============ hero — pinned parallax stage (170vh runway) ============ */}
      <section data-hero className="hero-wrap bg-dusk-deep text-paper">
        <div data-hero-stage className="hero-sticky flex flex-col">
          {/* painted dusk sky, built from gradient + blurred blobs (no raster) */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, var(--color-dusk-deep) 0%, var(--color-dusk) 34%, var(--color-blossom) 60%, var(--color-ember) 84%, var(--color-gold) 100%)",
            }}
          />
          {/* stars, up high */}
          <div aria-hidden className="absolute inset-0 opacity-70">
            {[[8, 12], [22, 24], [34, 9], [48, 18], [63, 11], [77, 22], [88, 14], [94, 28]].map(
              ([x, y], i) => (
                <span
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-paper/80"
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              )
            )}
          </div>
          {/* the setting sun — sinks and swells as you scroll past */}
          <div
            aria-hidden
            data-hero-sun
            className="absolute left-1/2 top-[46%] h-[46vh] w-[46vh] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,243,207,0.95) 0%, rgba(255,211,130,0.55) 38%, rgba(255,179,92,0) 70%)",
            }}
          />
          {/* cloud decks — alternating layers part outward at different rates */}
          {[
            { top: "16%", w: "70vw", o: 0.55, tint: "#f6dba8" },
            { top: "30%", w: "82vw", o: 0.4, tint: "#eab07a" },
            { top: "44%", w: "64vw", o: 0.5, tint: "#f2b269" },
            { top: "58%", w: "90vw", o: 0.32, tint: "#e99a6d" },
          ].map((c, i) => (
            <div
              key={i}
              aria-hidden
              data-hero-cloud
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: c.top, width: c.w }}
            >
              <svg viewBox="0 0 1200 120" className="w-full" style={{ filter: "blur(3px)" }}>
                <g fill={c.tint} opacity={c.o}>
                  <ellipse cx="220" cy="60" rx="180" ry="20" />
                  <ellipse cx="620" cy="44" rx="220" ry="24" />
                  <ellipse cx="1000" cy="66" rx="180" ry="18" />
                </g>
              </svg>
            </div>
          ))}
          {/* distant hill silhouette anchors the horizon */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[26vh]"
            style={{
              background: "var(--color-dusk-deep)",
              clipPath: "polygon(0 42%, 22% 30%, 46% 40%, 70% 26%, 100% 38%, 100% 100%, 0 100%)",
            }}
          />
          {/* drifting soot sprites */}
          {[[18, 66], [30, 74], [72, 62], [84, 70]].map(([x, y], i) => (
            <span
              key={i}
              data-soot
              aria-hidden
              className="soot"
              style={{ left: `${x}%`, top: `${y}%`, width: `${8 + i * 3}px`, height: `${8 + i * 3}px` }}
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-b from-dusk-deep/50 via-transparent to-dusk-deep/70" />

          {/* copy — drifts up and clears faster than 1:1 */}
          <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-6">
            <div data-hero-copy className="max-w-3xl pt-16">
              <p className="font-hand text-2xl text-gold sm:text-3xl">
                the shared drive is dead. long live the archive.
              </p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-8xl">
                Every journey,
                <br />
                <em className="text-gold">painted</em> into memory.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/85">
                Safarnama is the private travel magazine of a small circle of friends —
                and this is its public face. What you see here was chosen with intent:
                the best frames, the truest stories, nothing more.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
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
          </div>

          {/* scroll cue — fades out first */}
          <div data-hero-cue className="absolute bottom-6 left-1/2 -translate-x-1/2 text-paper/70">
            <span className="floaty block">
              <IconArrow className="h-6 w-6 rotate-90" />
            </span>
          </div>
        </div>
      </section>

      {/* ============ manifesto — reveal-on-scroll ============ */}
      <section className="relative overflow-hidden bg-paper py-24 sm:py-32">
        <div
          aria-hidden
          data-parallax="0.6"
          className="wash -left-32 top-10 h-96 w-96"
          style={{ background: "var(--color-meadow)" }}
        />
        <div
          aria-hidden
          data-parallax="0.3"
          className="wash -right-24 bottom-0 h-80 w-80"
          style={{ background: "var(--color-blossom)" }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="reveal">
              <Eyebrow>Why this exists</Eyebrow>
            </div>
            <h2 className="reveal d1 mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              A magazine for us.
              <br />
              <span className="flourish">A gallery for everyone.</span>
            </h2>
            <p className="reveal d2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              For years our trips lived in a shared folder — buried, unsorted,
              quality be damned. Safarnama replaces it with something built to
              last: a magazine where an editor prints only{" "}
              <strong className="text-ink">the photographs and stories worth keeping</strong>.
            </p>
            <div className="reveal d3 mt-8 flex flex-wrap gap-3">
              <Badge tone="ember"><IconCamera className="h-3.5 w-3.5" /> Every frame chosen</Badge>
              <Badge tone="gold"><IconFeather className="h-3.5 w-3.5" /> Stories by those who were there</Badge>
            </div>
          </div>
          {manifestoShot && (
            <div className="reveal d2 relative mx-auto hidden w-full max-w-sm sm:block">
              <PhotoCard item={manifestoShot} index={2} ratio="aspect-[3/4]" />
              <p className="absolute -left-10 top-1/2 hidden -rotate-6 font-hand text-2xl text-moss xl:block">
                every frame, chosen on purpose →
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============ meadow parallax strip (model A) ============ */}
      <section data-strip aria-hidden className="relative h-[34vh] overflow-hidden bg-sky">
        <span
          data-strip-cloud
          className="absolute left-[12%] top-[18%] h-10 w-56 rounded-full bg-paper/70 blur-md"
        />
        <span
          data-strip-cloud
          className="absolute right-[16%] top-[10%] h-8 w-48 rounded-full bg-paper/60 blur-md"
        />
        <div
          data-strip-hill
          className="absolute inset-x-0 bottom-0 h-[70%]"
          style={{
            background: "var(--color-meadow)",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            transform: "scaleX(1.4)",
          }}
        />
        <div
          data-strip-hill
          className="absolute inset-x-0 bottom-0 h-[46%]"
          style={{
            background: "var(--color-moss)",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            transform: "scaleX(1.8)",
          }}
        />
        <div
          data-strip-hill
          className="absolute inset-x-0 bottom-0 h-[28%]"
          style={{
            background: "var(--color-moss-deep)",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            transform: "scaleX(2.2)",
          }}
        />
      </section>

      {/* ============ circle card — pinned scale-in (180vh runway) ============ */}
      <section data-circle-wrap className="circle-wrap bg-paper-deep">
        <div className="circle-sticky px-6">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div
              data-circle-card
              className="relative aspect-square w-[68vw] max-w-md overflow-hidden rounded-full shadow-lift ring-8 ring-paper-warm"
            >
              <div className="absolute inset-0">
                {circleShot?.url ? (
                  <MediaFrame item={circleShot} />
                ) : (
                  <PaintedScene variant="sea" />
                )}
              </div>
              <span aria-hidden className="tape" />
            </div>
            <p className="mt-10 font-hand text-2xl text-ember">held, not scattered</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              One frame at a time,
              <br />
              a whole world composed.
            </h2>
          </div>
        </div>
      </section>

      {/* ============ journeys — reveal grid ============ */}
      <section className="relative overflow-hidden bg-paper-deep py-24 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
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

          <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {trips.slice(0, 4).map((trip, i) => {
              const pub = publicMedia.filter((m) => m.tripSlug === trip.slug);
              return (
                <Link
                  key={trip.slug}
                  href={`/trips/${trip.slug}`}
                  className={`reveal d${(i % 3) + 1} group flex flex-col`}
                >
                  <div className="photo-card relative flex flex-col rounded-sm">
                    <span aria-hidden className="tape" />
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[3px]">
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

      {/* ============ journal — reveal grid ============ */}
      <section className="relative overflow-hidden bg-paper py-24 sm:py-28">
        <div
          aria-hidden
          data-parallax="0.5"
          className="wash -right-32 top-24 h-96 w-96"
          style={{ background: "var(--color-sky)" }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
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
            <p className="reveal mt-10 rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
              The first story is still being written by hand.
            </p>
          )}
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {journalPicks.map((post, i) => (
              <Link
                key={post.slug}
                href={`/journal/${post.slug}`}
                className={`reveal d${(i % 3) + 1} group flex flex-col`}
              >
                <div className="photo-card relative flex flex-col rounded-sm">
                  <span aria-hidden className="tape" />
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[3px]">
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

      {/* ============ footer ============ */}
      <SiteFooter />
    </SmoothScrollHome>
  );
}
