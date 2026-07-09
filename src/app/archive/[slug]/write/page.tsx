import Link from "next/link";
import { notFound } from "next/navigation";
import ArchiveShell from "@/components/ArchiveShell";
import WriteStoryView from "@/components/WriteStoryView";
import { IconArrow } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getTripBySlug, getTripMedia, getMyPostsForTrip } from "@/lib/queries";

export default async function WriteStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  // membership gate: only people on the trip may write stories about it
  if (!trip.members.some((m) => m.id === user.id)) notFound();

  const [posts, media] = await Promise.all([
    getMyPostsForTrip(slug, Number(user.id)),
    getTripMedia(slug), // all trip media, not public-only — cover picker needs private shots too
  ]);

  return (
    <ArchiveShell user={user} active="archive">
      <Link
        href={`/archive/${slug}`}
        className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ember"
      >
        <IconArrow className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
        Back to {trip.name}
      </Link>
      <WriteStoryView trip={trip} currentUser={user} posts={posts} media={media} />
    </ArchiveShell>
  );
}
