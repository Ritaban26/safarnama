"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaintedScene from "@/components/PaintedScene";
import { MediaFrame } from "@/components/PhotoCard";
import { Badge, Avatar } from "@/components/ui";
import {
  IconUpload,
  IconGlobe,
  IconLock,
  IconDownload,
  IconTrash,
  IconClock,
  IconCheck,
  IconFeather,
} from "@/components/icons";
import {
  uploadMedia,
  deletePrivateMedia,
  requestApproval,
} from "@/lib/actions";
import type { ApprovalType, Media, Trip, User } from "@/lib/data";

/**
 * The member's working view of one trip: every photo and video, upload,
 * and the approval flows from the PRD — private deletes are instant,
 * anything touching the public site becomes a pending pitch.
 */
export default function PrivateTripView({
  trip,
  media,
  currentUser,
  pendingByMedia,
}: {
  trip: Trip;
  media: Media[];
  currentUser: User;
  pendingByMedia: Record<string, ApprovalType>;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const say = (msg: string, ms = 3600) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  };

  const run = (work: () => Promise<{ error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await work();
      say(res.error ?? okMsg);
      if (!res.error) router.refresh();
    });

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    const caption = window.prompt("A line for the caption? (optional)") ?? "";
    startTransition(async () => {
      const failures: string[] = [];
      for (const f of picked) {
        const fd = new FormData();
        fd.set("file", f);
        fd.set("caption", caption);
        const res = await uploadMedia(trip.slug, fd);
        if (res.error) failures.push(res.error);
      }
      if (failures.length === 0) {
        say("Uploaded — visible to everyone on this trip, private to the world.");
      } else {
        say(
          `${picked.length - failures.length} of ${picked.length} uploaded. ${failures.join(" ")}`,
          9000,
        );
      }
      router.refresh();
    });
  };

  const pitch = (m: Media, type: ApprovalType, okMsg: string) => {
    const note = window.prompt("A note for the editor? (optional)") ?? "";
    run(() => requestApproval(m.id, type, note), okMsg);
  };

  const publicCount = media.filter((m) => m.isPublic).length;
  const pendingCount = media.filter((m) => pendingByMedia[m.id]).length;

  return (
    <div>
      {/* header */}
      <section className="relative overflow-hidden rounded-3xl bg-dusk-deep text-paper shadow-painted">
        <div className="absolute inset-0 opacity-55">
          <PaintedScene variant={trip.cover} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-dusk-deep via-dusk-deep/70 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-6 px-8 py-10 sm:px-12">
          <div>
            <p className="font-hand text-2xl text-gold">{trip.dates}</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {trip.name}
            </h1>
            <p className="mt-3 text-paper/80">
              {media.length} memories · {publicCount} on the public page ·{" "}
              {pendingCount} pitches pending
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/archive/${trip.slug}/write`}
              className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-paper/40 px-6 py-3 font-semibold text-paper transition-colors hover:bg-paper/10"
            >
              <IconFeather className="h-5 w-5" />
              Write a story
            </Link>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ember px-6 py-3 font-semibold text-paper shadow-lift transition-colors hover:bg-ember-deep disabled:opacity-60"
            >
              <IconUpload className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
              {busy ? "Filing…" : "Add memories"}
            </button>
          </div>
        </div>
      </section>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />

      {/* dropzone hint */}
      <button
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        className="mt-8 flex w-full cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-ink/20 bg-paper-warm/60 px-6 py-10 text-ink-soft transition-colors hover:border-ember/50 hover:text-ember-deep disabled:opacity-60"
      >
        <IconUpload className="h-7 w-7" />
        <span className="font-semibold">
          Drop photos & videos here, or click to add
        </span>
        <span className="font-hand text-lg">
          everything stays inside the circle until the editor says otherwise
        </span>
      </button>

      {media.length === 0 && (
        <p className="mt-10 rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
          The pages of this trip are still blank — add the first memory.
        </p>
      )}

      {/* grid */}
      <section className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((m, i) => {
          const mine = m.uploader.id === currentUser.id;
          const pend = pendingByMedia[m.id];
          return (
            <figure key={m.id} className="group">
              <div
                className={`photo-card relative rounded-sm ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              >
                <span aria-hidden className="tape" />
                <div className="relative aspect-[4/3] overflow-hidden rounded-[3px]">
                  <MediaFrame item={m} />
                  <span className="absolute left-2.5 top-2.5">
                    {m.isPublic ? (
                      <Badge tone="moss">
                        <IconGlobe className="h-3 w-3" /> public
                      </Badge>
                    ) : (
                      <Badge tone="faint">
                        <IconLock className="h-3 w-3" /> private
                      </Badge>
                    )}
                  </span>

                  {/* Actions: always visible on touch (no hover), reveal on hover from sm up */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-linear-to-t from-ink/70 to-transparent p-3 transition-all duration-200 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                    {m.url && (
                      <a
                        href={m.url}
                        download
                        title="Download"
                        aria-label="Download"
                        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-paper/90 text-ink transition-colors hover:bg-gold"
                      >
                        <IconDownload className="h-4 w-4" />
                      </a>
                    )}
                    {!m.isPublic && !pend && (
                      <>
                        <ActionBtn
                          label="Pitch to public gallery"
                          onClick={() =>
                            pitch(
                              m,
                              "make_public",
                              "Pitched to the editor — it goes public only if approved.",
                            )
                          }
                        >
                          <IconGlobe className="h-4 w-4" />
                        </ActionBtn>
                        {mine && (
                          <ActionBtn
                            label="Delete (instant — it's private)"
                            onClick={() =>
                              run(
                                () => deletePrivateMedia(m.id),
                                "Gone. Private uploads are yours to delete, no questions asked.",
                              )
                            }
                          >
                            <IconTrash className="h-4 w-4" />
                          </ActionBtn>
                        )}
                      </>
                    )}
                    {mine && m.isPublic && !pend && (
                      <>
                        <ActionBtn
                          label="Request retraction"
                          onClick={() =>
                            pitch(
                              m,
                              "retract_public",
                              "Retraction requested — the editor decides what leaves the page.",
                            )
                          }
                        >
                          <IconLock className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          label="Request deletion"
                          onClick={() =>
                            pitch(
                              m,
                              "delete_public",
                              "Deletion of public work needs the editor's sign-off. Request sent.",
                            )
                          }
                        >
                          <IconTrash className="h-4 w-4" />
                        </ActionBtn>
                      </>
                    )}
                  </div>
                </div>
                <figcaption className="flex items-baseline justify-between gap-3 px-1 pt-2.5">
                  <span className="font-hand text-lg leading-snug text-ink-soft">
                    {m.caption}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-faint">
                    <Avatar user={m.uploader} size="h-5 w-5 text-[0.55rem]" />
                    {m.takenAt}
                  </span>
                </figcaption>
              </div>
              {pend && (
                <p className="mt-2.5 px-1">
                  <Badge tone="gold">
                    <IconClock className="h-3 w-3" />
                    {pend === "make_public" &&
                      "pitch sent — awaiting the editor"}
                    {pend === "retract_public" &&
                      "retraction awaiting the editor"}
                    {pend === "delete_public" && "deletion awaiting the editor"}
                  </Badge>
                </p>
              )}
            </figure>
          );
        })}
      </section>

      {/* toast */}
      <div
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
          toast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {toast && (
          <p className="flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-lift">
            <IconCheck className="h-4 w-4 text-gold" />
            {toast}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-paper/90 text-ink transition-colors hover:bg-gold"
    >
      {children}
    </button>
  );
}
