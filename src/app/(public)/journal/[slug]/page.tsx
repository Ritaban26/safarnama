import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoCard from "@/components/PhotoCard";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { Avatar, WaveDivider } from "@/components/ui";
import { IconArrow } from "@/components/icons";
import { getPost } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="bg-paper">
      <SiteNav />

      <article className="relative overflow-hidden pt-40">
        <div aria-hidden className="wash -left-32 top-32 h-96 w-96" style={{ background: "#d9a441" }} />
        <div aria-hidden className="wash -right-24 top-[60%] h-80 w-80" style={{ background: "#86b5c9" }} />

        <header className="relative mx-auto max-w-3xl px-6 text-center">
          <Link
            href={`/trips/${post.tripSlug}`}
            className="font-hand text-2xl text-ember transition-colors hover:text-ember-deep"
          >
            from “{post.tripName}”
          </Link>
          <h1 className="rise mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {post.title}
          </h1>
          <div className="rise rise-2 mt-7 flex items-center justify-center gap-3 text-ink-soft">
            <Avatar user={post.author} />
            <span className="font-semibold">{post.author.name}</span>
            <span aria-hidden className="text-ink-faint">·</span>
            <span className="text-ink-faint">{post.date}</span>
          </div>
        </header>

        {post.media && (
          <div className="rise rise-3 relative mx-auto mt-14 max-w-2xl px-6">
            <PhotoCard item={post.media} index={1} ratio="aspect-[16/10]" />
          </div>
        )}

        <div className="journal-prose relative mx-auto mt-14 max-w-2xl px-6 pb-8">
          {post.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* hand-signed close */}
        <div className="mx-auto max-w-2xl px-6 pb-20">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className="font-hand text-3xl text-moss">— {post.author.name.split(" ")[0]}</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
        </div>

        {/* back links */}
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 px-6 pb-24">
          <Link
            href="/journal"
            className="group inline-flex items-center gap-2 font-semibold text-moss-deep transition-colors hover:text-ember"
          >
            <IconArrow className="h-5 w-5 rotate-180 transition-transform group-hover:-translate-x-1" />
            All journal entries
          </Link>
          <Link
            href={`/trips/${post.tripSlug}`}
            className="group inline-flex items-center gap-2 font-semibold text-moss-deep transition-colors hover:text-ember"
          >
            See the {post.tripLocation.split(",")[0]} gallery
            <IconArrow className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </article>

      <WaveDivider from="#f6efdf" to="#243a52" />
      <SiteFooter />
    </div>
  );
}
