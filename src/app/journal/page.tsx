import Link from "next/link";
import PhotoCard from "@/components/PhotoCard";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/motion/Reveal";
import { Eyebrow, Avatar, WaveDivider } from "@/components/ui";
import { IconArrow } from "@/components/icons";
import { getPosts } from "@/lib/queries";

export const metadata = { title: "The Journal — Safarnama" };
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const posts = await getPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="bg-paper">
      <SiteNav />

      <section className="relative overflow-hidden pt-40">
        <div aria-hidden className="wash -left-28 top-20 h-80 w-80" style={{ background: "#cf8295" }} />
        <div aria-hidden className="wash right-10 top-64 h-72 w-72" style={{ background: "#88a868" }} />
        <div className="relative mx-auto max-w-6xl px-6">
          <Eyebrow>The journal</Eyebrow>
          <h1 className="rise mt-4 max-w-2xl font-display text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
            Stories, told by the people <span className="flourish">who were there</span>
          </h1>
          <p className="rise rise-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Each entry is attached to a photograph that made the public page —
            a long caption that grew up into a story.
          </p>
        </div>
      </section>

      {!lead && (
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="rounded-3xl border border-dashed border-ink/20 p-12 text-center font-hand text-2xl text-ink-soft">
            No stories yet — the first one is still being written by hand.
          </p>
        </section>
      )}

      {lead && (
        <>
          {/* lead story */}
          <section className="mx-auto max-w-6xl px-6 pt-20">
            <Link
              href={`/journal/${lead.slug}`}
              className="group grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]"
            >
              <div className="mx-auto w-full max-w-xl">
                {lead.media && (
                  <PhotoCard item={lead.media} index={0} ratio="aspect-[16/11]" showCaption={false} />
                )}
              </div>
              <div>
                <p className="font-hand text-2xl text-ember">{lead.date} · {lead.tripName}</p>
                <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-ember sm:text-5xl">
                  {lead.title}
                </h2>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">{lead.excerpt}</p>
                <p className="mt-6 inline-flex items-center gap-3 font-semibold text-ink-soft">
                  <Avatar user={lead.author} /> {lead.author.name}
                </p>
                <span className="mt-8 inline-flex items-center gap-2 font-semibold text-moss-deep transition-colors group-hover:text-ember">
                  Read the story
                  <IconArrow className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </section>

          {/* the rest */}
          <section className="mx-auto max-w-6xl px-6 py-24">
            {rest.length > 0 && (
              <div className="flex items-center gap-5">
                <h2 className="font-display text-2xl font-semibold text-ink-faint">Earlier entries</h2>
                <span aria-hidden className="h-px flex-1 bg-ink/15" />
              </div>
            )}
            <div className="mt-12 grid gap-12 sm:grid-cols-2">
              {rest.map((post, i) => (
                <Reveal key={post.slug} delay={(i % 2) * 0.12}>
                <Link href={`/journal/${post.slug}`} className="group">
                  {post.media && (
                    <PhotoCard item={post.media} index={i + 1} ratio="aspect-[16/10]" showCaption={false} />
                  )}
                  <p className="mt-5 font-hand text-xl text-ember">
                    {post.date} · {post.tripName}
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-ember">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 max-w-lg leading-relaxed text-ink-soft">{post.excerpt}</p>
                  <p className="mt-4 inline-flex items-center gap-2.5 text-sm font-semibold text-ink-faint">
                    <Avatar user={post.author} size="h-7 w-7 text-xs" /> {post.author.name}
                  </p>
                </Link>
                </Reveal>
              ))}
            </div>
          </section>
        </>
      )}

      <WaveDivider from="#f6efdf" to="#243a52" />
      <SiteFooter />
    </div>
  );
}
