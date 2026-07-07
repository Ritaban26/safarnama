import Link from "next/link";
import ArchiveShell from "@/components/ArchiveShell";
import PaintedScene from "@/components/PaintedScene";
import PhotoCard from "@/components/PhotoCard";
import { Badge, AvatarStack } from "@/components/ui";
import { IconArrow, IconCamera, IconGlobe, IconClock } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { getTrips, getAllMedia, getPendingApprovals } from "@/lib/queries";
import { approvalLabel } from "@/lib/data";

export const metadata = { title: "My trips — Safarnama" };

export default async function ArchivePage() {
  const user = await requireUser();
  const [trips, media, myRequests] = await Promise.all([
    getTrips(),
    getAllMedia(),
    getPendingApprovals(Number(user.id)),
  ]);

  const mine = trips.filter((t) => t.members.some((m) => m.id === user.id));
  const myUploads = media.filter((m) => m.uploader.id === user.id);
  const recent = myUploads.slice(0, 3);

  return (
    <ArchiveShell user={user} active="archive">
      {/* greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-moss-deep text-paper shadow-painted">
        <div className="absolute inset-0 opacity-45">
          <PaintedScene variant="meadow" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-moss-deep via-moss-deep/75 to-transparent" />
        <div className="relative px-8 py-12 sm:px-12">
          <p className="font-hand text-2xl text-gold">welcome back, {user.name.split(" ")[0]}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Your side of the curtain
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-paper/85">
            <span><strong className="font-display text-2xl text-paper">{mine.length}</strong> trips</span>
            <span><strong className="font-display text-2xl text-paper">{myUploads.length}</strong> uploads</span>
            <span><strong className="font-display text-2xl text-paper">{myUploads.filter((m) => m.isPublic).length}</strong> published</span>
            <span><strong className="font-display text-2xl text-paper">{myRequests.length}</strong> pending pitches</span>
          </div>
        </div>
      </section>

      {/* trips */}
      <section className="mt-14">
        <div className="flex items-center gap-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Trips you were on</h2>
          <span aria-hidden className="h-px flex-1 bg-ink/15" />
        </div>
        {mine.length === 0 && (
          <p className="mt-8 rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
            No trips on your page yet — the editor adds travellers by hand.
          </p>
        )}
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {mine.map((trip) => {
            const all = media.filter((m) => m.tripSlug === trip.slug);
            const pub = all.filter((m) => m.isPublic);
            return (
              <Link
                key={trip.slug}
                href={`/archive/${trip.slug}`}
                className="group overflow-hidden rounded-3xl border border-ink/10 bg-paper-warm shadow-painted transition-shadow hover:shadow-lift"
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
                    <PaintedScene variant={trip.cover} />
                  </div>
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge tone="gold"><IconCamera className="h-3.5 w-3.5" /> {all.length} total</Badge>
                    <Badge tone="moss"><IconGlobe className="h-3.5 w-3.5" /> {pub.length} public</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-ember">
                      {trip.name}
                    </h3>
                    <p className="mt-0.5 font-hand text-lg text-ink-soft">{trip.dates}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AvatarStack users={trip.members} />
                    <IconArrow className="h-5 w-5 text-ink-faint transition-all group-hover:translate-x-1 group-hover:text-ember" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* recent uploads */}
        <section>
          <div className="flex items-center gap-5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Your latest uploads</h2>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
          {recent.length === 0 && (
            <p className="mt-8 rounded-2xl border border-dashed border-ink/20 p-6 text-ink-soft">
              Nothing filed yet — open a trip and add your first memory.
            </p>
          )}
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {recent.map((m, i) => (
              <div key={m.id}>
                <PhotoCard item={m} index={i} ratio="aspect-square" />
                <p className="mt-2 px-1">
                  {m.isPublic ? (
                    <Badge tone="moss"><IconGlobe className="h-3 w-3" /> public</Badge>
                  ) : (
                    <Badge tone="faint">private</Badge>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* pending pitches */}
        <section>
          <div className="flex items-center gap-5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Your pitches</h2>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
          <div className="mt-8 space-y-4">
            {myRequests.length === 0 && (
              <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-ink-soft">
                Nothing waiting on the editor right now.
              </p>
            )}
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-ink/10 bg-paper-warm p-5 shadow-painted"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="ember">{approvalLabel[r.type]}</Badge>
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                    <IconClock className="h-3.5 w-3.5" /> {r.requestedAt}
                  </span>
                </div>
                <p className="mt-3 font-hand text-lg leading-snug text-ink-soft">
                  “{r.media.caption || "untitled frame"}”
                </p>
                {r.note && <p className="mt-2 text-sm leading-relaxed text-ink-faint">{r.note}</p>}
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                  awaiting the editor
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ArchiveShell>
  );
}
