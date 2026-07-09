"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaFrame } from "@/components/PhotoCard";
import { Badge } from "@/components/ui";
import {
  IconFeather,
  IconGlobe,
  IconClock,
  IconTrash,
  IconCheck,
  IconLock,
  IconX,
} from "@/components/icons";
import {
  createDraftPost,
  updatePost,
  deleteDraftPost,
  submitPostForApproval,
  requestPostApproval,
} from "@/lib/actions";
import type { Media, Post, Trip, User } from "@/lib/data";

/**
 * The member's authoring desk for one trip: a list of their own stories in
 * every status, plus one form (toggled open) that handles both writing a
 * new story and editing an existing draft/pending one.
 */
export default function WriteStoryView({
  trip,
  posts,
  media,
}: {
  trip: Trip;
  // accepted for parity with the page's fetched data / future use (e.g. author-scoped copy)
  currentUser: User;
  posts: Post[];
  media: Media[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [notingSlug, setNotingSlug] = useState<{
    slug: string;
    kind: "submit" | "retract_post" | "delete_post";
  } | null>(null);
  const [note, setNote] = useState("");

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3600);
  };

  const run = (work: () => Promise<{ error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await work();
      say(res.error ?? okMsg);
      if (!res.error) router.refresh();
    });

  const openNote = (slug: string, kind: "submit" | "retract_post" | "delete_post") => {
    setNote("");
    setNotingSlug({ slug, kind });
  };

  const confirmNote = () => {
    if (!notingSlug) return;
    const { slug, kind } = notingSlug;
    if (kind === "submit") {
      run(() => submitPostForApproval(slug, note), "Pitched to the editor for publishing.");
    } else {
      run(
        () => requestPostApproval(slug, kind, note),
        kind === "retract_post"
          ? "Retraction requested — the editor decides what leaves the page."
          : "Deletion of a published story needs the editor's sign-off. Request sent.",
      );
    }
    setNotingSlug(null);
  };

  return (
    <div>
      {/* header */}
      <section className="relative overflow-hidden rounded-3xl bg-dusk-deep px-8 py-10 text-paper shadow-painted sm:px-12">
        <p className="font-hand text-2xl text-gold">{trip.name}</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Write a story
        </h1>
        <p className="mt-3 max-w-xl text-paper/80">
          Stories start as your own drafts. Nothing reaches the public page until
          you pitch it and the editor approves.
        </p>
      </section>

      {/* my stories */}
      <section className="mt-10">
        <div className="flex items-center gap-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight">My stories</h2>
          <span aria-hidden className="h-px flex-1 bg-ink/15" />
        </div>

        {posts.length === 0 && !editing && (
          <p className="mt-8 rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
            You haven&apos;t written anything from this trip yet.
          </p>
        )}

        <div className="mt-8 space-y-4">
          {posts.map((p) => (
            <article
              key={p.slug}
              className="rounded-3xl border border-ink/10 bg-paper-warm p-6 shadow-painted"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.status === "draft" && <Badge tone="faint">draft</Badge>}
                    {p.status === "pending" && (
                      <Badge tone="gold">
                        <IconClock className="h-3 w-3" /> awaiting the editor
                      </Badge>
                    )}
                    {p.status === "published" && (
                      <Badge tone="moss">
                        <IconGlobe className="h-3 w-3" /> published
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 truncate font-display text-xl font-semibold leading-snug">
                    {p.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-faint">{p.excerpt}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {p.status === "draft" && (
                  <>
                    <button
                      onClick={() => setEditing(p)}
                      className="cursor-pointer rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openNote(p.slug, "submit")}
                      className="cursor-pointer rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-moss-deep"
                    >
                      Submit for approval
                    </button>
                    <DeleteButton
                      active={confirmingDelete === p.slug}
                      onAsk={() => setConfirmingDelete(p.slug)}
                      onCancel={() => setConfirmingDelete(null)}
                      onConfirm={() => {
                        setConfirmingDelete(null);
                        run(() => deleteDraftPost(p.slug), "Draft deleted.");
                      }}
                    />
                  </>
                )}
                {p.status === "pending" && (
                  <DeleteButton
                    active={confirmingDelete === p.slug}
                    onAsk={() => setConfirmingDelete(p.slug)}
                    onCancel={() => setConfirmingDelete(null)}
                    onConfirm={() => {
                      setConfirmingDelete(null);
                      run(() => deleteDraftPost(p.slug), "Story withdrawn and deleted.");
                    }}
                  />
                )}
                {p.status === "published" && (
                  <>
                    <button
                      onClick={() => openNote(p.slug, "retract_post")}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
                    >
                      <IconLock className="h-3.5 w-3.5" /> Request retraction
                    </button>
                    <button
                      onClick={() => openNote(p.slug, "delete_post")}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
                    >
                      <IconTrash className="h-3.5 w-3.5" /> Request deletion
                    </button>
                  </>
                )}
              </div>

              {notingSlug?.slug === p.slug && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="A note for the editor? (optional)"
                    className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                  <button
                    onClick={confirmNote}
                    disabled={busy}
                    className="cursor-pointer rounded-full bg-ember px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ember-deep disabled:opacity-60"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setNotingSlug(null)}
                    className="cursor-pointer rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        {!editing && (
          <button
            onClick={() => setEditing("new")}
            className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/20 py-5 font-semibold text-ink-soft transition-colors hover:border-ember/50 hover:text-ember-deep"
          >
            <IconFeather className="h-4.5 w-4.5" /> Write a story
          </button>
        )}
      </section>

      {editing && (
        <StoryForm
          key={editing === "new" ? "new" : editing.slug}
          trip={trip}
          media={media}
          existing={editing === "new" ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSaved={(msg) => {
            say(msg);
            setEditing(null);
            router.refresh();
          }}
          onError={(msg) => say(msg)}
          startTransition={startTransition}
        />
      )}

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

function DeleteButton({
  active,
  onAsk,
  onCancel,
  onConfirm,
}: {
  active: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-3 py-2 text-sm font-semibold text-ember-deep">
        Delete it?
        <button
          onClick={onConfirm}
          aria-label="Confirm delete"
          className="grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ember text-paper transition-colors hover:bg-ember-deep"
        >
          <IconCheck className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onCancel}
          aria-label="Cancel delete"
          className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-ember/30 text-ember-deep transition-colors hover:bg-ember/10"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={onAsk}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
    >
      <IconTrash className="h-3.5 w-3.5" /> Delete
    </button>
  );
}

function StoryForm({
  trip,
  media,
  existing,
  busy,
  onCancel,
  onSaved,
  onError,
  startTransition,
}: {
  trip: Trip;
  media: Media[];
  existing: Post | null;
  busy: boolean;
  onCancel: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  startTransition: (work: () => Promise<void>) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? "");
  const [paragraphs, setParagraphs] = useState<string[]>(
    existing?.paragraphs && existing.paragraphs.length > 0 ? existing.paragraphs : [""],
  );
  const [mediaId, setMediaId] = useState<string | null>(existing?.media?.id ?? null);

  const updateParagraph = (i: number, value: string) =>
    setParagraphs((prev) => prev.map((p, idx) => (idx === i ? value : p)));

  const removeParagraph = (i: number) =>
    setParagraphs((prev) => prev.filter((_, idx) => idx !== i));

  const addParagraph = () => setParagraphs((prev) => [...prev, ""]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("excerpt", excerpt);
    for (const p of paragraphs) fd.append("paragraphs", p);
    if (mediaId) fd.set("mediaId", mediaId);
    return fd;
  };

  const save = () =>
    startTransition(async () => {
      const fd = buildFormData();
      const res = existing
        ? await updatePost(trip.slug, existing.slug, fd)
        : await createDraftPost(trip.slug, fd);
      if (res.error) onError(res.error);
      else onSaved(existing ? "Draft saved." : "Draft created.");
    });

  const submit = () => {
    if (!existing) return;
    startTransition(async () => {
      const res = await submitPostForApproval(existing.slug, "");
      if (res.error) onError(res.error);
      else onSaved("Pitched to the editor for publishing.");
    });
  };

  return (
    <section className="mt-10 rounded-3xl border border-ink/10 bg-paper-warm p-6 shadow-painted sm:p-8">
      <h2 className="font-display text-2xl font-semibold">
        {existing ? "Edit story" : "Write a new story"}
      </h2>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="story-title" className="mb-1.5 block text-sm font-semibold text-ink-soft">
            Title
          </label>
          <input
            id="story-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A morning above the clouds"
            className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
          />
        </div>

        <div>
          <label htmlFor="story-excerpt" className="mb-1.5 block text-sm font-semibold text-ink-soft">
            Excerpt
          </label>
          <textarea
            id="story-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="A short line to tempt a reader"
            className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-soft">Paragraphs</p>
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  rows={3}
                  placeholder={`Paragraph ${i + 1}`}
                  className="w-full flex-1 rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                />
                <button
                  type="button"
                  onClick={() => removeParagraph(i)}
                  disabled={paragraphs.length <= 1}
                  aria-label={`Remove paragraph ${i + 1}`}
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center self-start rounded-full border border-ink/20 text-ink-soft transition-colors hover:border-ember hover:text-ember disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addParagraph}
            className="mt-3 cursor-pointer rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
          >
            + Add paragraph
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-soft">Cover photo</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <button
              type="button"
              onClick={() => setMediaId(null)}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 text-center text-xs font-semibold text-ink-soft transition-colors ${
                mediaId === null
                  ? "border-ember ring-2 ring-ember"
                  : "border-dashed border-ink/20 hover:border-ember/50"
              }`}
            >
              No cover photo
            </button>
            {media.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMediaId(m.id)}
                aria-label={`Select ${m.caption || "photo"} as cover`}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-colors ${
                  mediaId === m.id ? "border-ember ring-2 ring-ember" : "border-transparent"
                }`}
              >
                <MediaFrame item={m} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={save}
          disabled={busy || !title.trim() || !excerpt.trim()}
          className="cursor-pointer rounded-full bg-moss px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-moss-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
        {existing && existing.status === "draft" && (
          <button
            onClick={submit}
            disabled={busy}
            className="cursor-pointer rounded-full bg-ember px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-ember-deep disabled:opacity-60"
          >
            Submit for approval
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-full border border-ink/20 px-6 py-2.5 font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
