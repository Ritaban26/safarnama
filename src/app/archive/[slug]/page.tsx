import Link from "next/link";
import { notFound } from "next/navigation";
import ArchiveShell from "@/components/ArchiveShell";
import PrivateTripView from "@/components/PrivateTripView";
import { IconArrow } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getTripBySlug, getTripMedia, getPendingMediaIds } from "@/lib/queries";

export default async function PrivateTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  // membership gate: only people on the trip see its private archive
  if (!trip.members.some((m) => m.id === user.id)) notFound();

  const [media, pendingByMedia] = await Promise.all([
    getTripMedia(slug),
    getPendingMediaIds(),
  ]);

  return (
    <ArchiveShell user={user} active="archive">
      <Link
        href="/archive"
        className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ember"
      >
        <IconArrow className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
        My trips
      </Link>
      <PrivateTripView
        trip={trip}
        media={media}
        currentUser={user}
        pendingByMedia={pendingByMedia}
      />
    </ArchiveShell>
  );
}
