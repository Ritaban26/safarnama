"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PaintedScene from "@/components/PaintedScene";
import { MediaFrame } from "@/components/PhotoCard";
import { Badge, Avatar } from "@/components/ui";
import { IconCheck, IconX, IconGlobe, IconLock, IconTrash, IconClock, IconCamera } from "@/components/icons";
import { decideApproval, createTrip, updateTrip, createMember, type ActionState } from "@/lib/actions";
import {
  approvalLabel,
  type ApprovalRequest,
  type ApprovalType,
  type Trip,
  type User,
} from "@/lib/data";

const TYPE_ICON: Record<ApprovalType, React.ReactNode> = {
  make_public: <IconGlobe className="h-3.5 w-3.5" />,
  retract_public: <IconLock className="h-3.5 w-3.5" />,
  delete_public: <IconTrash className="h-3.5 w-3.5" />,
};

/** The editor's desk: every public-facing action waits here for a yes or a no. */
export default function AdminDesk({
  requests,
  users,
  uploadCounts,
  trips,
  tripCounts,
  mediaTotal,
  publicTotal,
}: {
  requests: ApprovalRequest[];
  users: User[];
  uploadCounts: Record<string, number>;
  trips: Trip[];
  tripCounts: Record<string, { total: number; pub: number }>;
  mediaTotal: number;
  publicTotal: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (r: ApprovalRequest, d: "approved" | "rejected") =>
    startTransition(async () => {
      const res = await decideApproval(r.id, d);
      setError(res.error ?? null);
      router.refresh();
    });

  return (
    <div>
      {/* masthead */}
      <section className="relative overflow-hidden rounded-3xl bg-dusk-deep text-paper shadow-painted">
        <div className="absolute inset-0 opacity-50">
          <PaintedScene variant="ember" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-dusk-deep via-dusk-deep/70 to-transparent" />
        <div className="relative px-8 py-12 sm:px-12">
          <p className="font-hand text-2xl text-gold">the hearth is lit, editor</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            The editor&apos;s desk
          </h1>
          <p className="mt-4 max-w-lg text-paper/80">
            Nothing reaches the public page without your hand. {requests.length} pitch
            {requests.length === 1 ? "" : "es"} waiting below.
          </p>
        </div>
      </section>

      {error && (
        <p className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-5 py-3 text-sm font-semibold text-ember-deep">
          {error}
        </p>
      )}

      {/* stats */}
      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        <Stat label="Pending pitches" value={requests.length} accent="text-ember" />
        <Stat label="Memories archived" value={mediaTotal} accent="text-moss-deep" />
        <Stat label="Public frames" value={publicTotal} accent="text-dusk" />
        <Stat label="Members" value={users.length} accent="text-blossom" />
      </section>

      {/* approval queue */}
      <section className="mt-14">
        <div className="flex items-center gap-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Approval queue</h2>
          <span aria-hidden className="h-px flex-1 bg-ink/15" />
        </div>
        <div className="mt-8 space-y-6">
          {requests.length === 0 && (
            <p className="rounded-3xl border border-dashed border-ink/20 p-10 text-center font-hand text-2xl text-ink-soft">
              The desk is clear — no pitches waiting.
            </p>
          )}
          {requests.map((r) => {
            const m = r.media;
            return (
              <article
                key={r.id}
                className="grid gap-6 rounded-3xl border border-ink/10 bg-paper-warm p-6 shadow-painted sm:grid-cols-[180px_1fr_auto] sm:items-center"
              >
                <div className="photo-card relative -rotate-1 rounded-sm">
                  <span aria-hidden className="tape" />
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[3px]">
                    <MediaFrame item={m} />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.type === "make_public" ? "moss" : r.type === "retract_public" ? "dusk" : "ember"}>
                      {TYPE_ICON[r.type]} {approvalLabel[r.type]}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                      <IconClock className="h-3.5 w-3.5" /> {r.requestedAt}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-xl font-semibold leading-snug">
                    “{m.caption || "untitled frame"}”
                  </p>
                  <p className="mt-1 text-sm text-ink-faint">{m.takenAt}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                    <Avatar user={r.requestedBy} size="h-6 w-6 text-[0.6rem]" />
                    <span>
                      <strong>{r.requestedBy.name}</strong>
                      {r.note ? <> — {r.note}</> : null}
                    </span>
                  </p>
                </div>

                <div className="flex gap-3 sm:flex-col">
                  <button
                    onClick={() => decide(r, "approved")}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-moss-deep"
                  >
                    <IconCheck className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(r, "rejected")}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
                  >
                    <IconX className="h-4 w-4" /> Decline
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        {/* members */}
        <section>
          <div className="flex items-center gap-5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">The circle</h2>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
          <ul className="mt-8 divide-y divide-ink/8 rounded-3xl border border-ink/10 bg-paper-warm shadow-painted">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <span className="flex items-center gap-3.5">
                  <Avatar user={u} />
                  <span>
                    <span className="block font-semibold leading-tight">{u.name}</span>
                    <span className="block text-sm text-ink-faint">{uploadCounts[u.id] ?? 0} uploads</span>
                  </span>
                </span>
                <Badge tone={u.role === "admin" ? "ember" : "faint"}>
                  {u.role === "admin" ? "editor" : "member"}
                </Badge>
              </li>
            ))}
          </ul>
          <AddMemberForm />
        </section>

        {/* trips overview */}
        <section>
          <div className="flex items-center gap-5">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Trips on file</h2>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
          <ul className="mt-8 space-y-4">
            {trips.map((t) => (
              <TripRow key={t.slug} trip={t} users={users} tripCounts={tripCounts} />
            ))}
          </ul>
          <NewTripForm users={users} />
        </section>
      </div>
    </div>
  );
}

function MemberFieldset({
  users,
  admin,
  defaultCheckedIds,
}: {
  users: User[];
  admin: User | undefined;
  defaultCheckedIds?: Set<string>;
}) {
  const rest = users.filter((u) => u.id !== admin?.id);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink-soft">Who was there</legend>
      <div className="flex flex-wrap gap-3">
        {admin && (
          <span className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-moss/10 px-3 py-1.5 text-sm font-semibold text-moss-deep">
            {admin.name} <span className="font-hand text-xs text-moss-deep/70">you, always</span>
          </span>
        )}
        {rest.map((u) => (
          <label key={u.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold text-ink-soft has-checked:border-moss has-checked:bg-moss/10 has-checked:text-moss-deep">
            <input
              type="checkbox"
              name="memberIds"
              value={u.id}
              defaultChecked={defaultCheckedIds?.has(u.id)}
              className="accent-[--color-moss]"
            />
            {u.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NewTripForm({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const admin = users.find((u) => u.role === "admin");
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await createTrip(prev, formData);
      return res;
    },
    {} as ActionState,
  );

  useEffect(() => {
    if (!pending && state.error === undefined && formRef.current?.dataset.submitted) {
      formRef.current.reset();
      setOpen(false);
      router.refresh();
    }
  }, [pending, state, router]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full cursor-pointer rounded-3xl border-2 border-dashed border-ink/20 py-5 font-semibold text-ink-soft transition-colors hover:border-ember/50 hover:text-ember-deep"
      >
        + Open a new trip
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        if (formRef.current) formRef.current.dataset.submitted = "1";
      }}
      className="mt-6 space-y-4 rounded-3xl border border-ink/10 bg-paper-warm p-6 shadow-painted"
    >
      <h3 className="font-display text-2xl font-semibold">Open a new trip</h3>
      {state.error && <p className="text-sm font-semibold text-ember-deep">{state.error}</p>}
      <Field name="name" label="Trip name" placeholder="Ladakh, Thin Air" required />
      <Field name="location" label="Location" placeholder="Leh, Ladakh" required />
      <div className="grid grid-cols-2 gap-4">
        <Field name="startDate" label="From" type="date" required />
        <Field name="endDate" label="To" type="date" required />
      </div>
      <div>
        <label htmlFor="trip-description" className="mb-1.5 block text-sm font-semibold text-ink-soft">
          Field notes
        </label>
        <textarea
          id="trip-description"
          name="description"
          rows={3}
          className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>
      <MemberFieldset users={users} admin={admin} />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-moss px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-moss-deep disabled:opacity-60"
        >
          {pending ? "Opening…" : "Open trip"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded-full border border-ink/20 px-6 py-2.5 font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await createMember(prev, formData);
      return res;
    },
    {} as ActionState,
  );

  useEffect(() => {
    if (!pending && state.error === undefined && formRef.current?.dataset.submitted) {
      formRef.current.reset();
      formRef.current.dataset.submitted = "";
      setOpen(false);
      router.refresh();
    }
  }, [pending, state, router]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full cursor-pointer rounded-3xl border-2 border-dashed border-ink/20 py-5 font-semibold text-ink-soft transition-colors hover:border-ember/50 hover:text-ember-deep"
      >
        + Add a member to the circle
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        if (formRef.current) formRef.current.dataset.submitted = "1";
      }}
      className="mt-6 space-y-4 rounded-3xl border border-ink/10 bg-paper-warm p-6 shadow-painted"
    >
      <h3 className="font-display text-2xl font-semibold">Add a member</h3>
      {state.error && <p className="text-sm font-semibold text-ember-deep">{state.error}</p>}
      <Field name="name" label="Name" placeholder="Rahul Sharma" required />
      <Field name="email" label="Email" type="email" placeholder="rahul@thecircle.in" required />
      <Field name="password" label="Starting password" type="password" placeholder="at least 8 characters" required />
      <p className="font-hand text-base text-ink-soft">
        Share this with them — they can change it later from their settings.
      </p>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-moss px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-moss-deep disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add to the circle"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded-full border border-ink/20 px-6 py-2.5 font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TripRow({
  trip,
  users,
  tripCounts,
}: {
  trip: Trip;
  users: User[];
  tripCounts: Record<string, { total: number; pub: number }>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const admin = users.find((u) => u.role === "admin");
  const memberIds = new Set(trip.members.map((m) => m.id));
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const res = await updateTrip(prev, formData);
      return res;
    },
    {} as ActionState,
  );

  useEffect(() => {
    if (!pending && state.error === undefined && formRef.current?.dataset.submitted) {
      formRef.current.dataset.submitted = "";
      setOpen(false);
      router.refresh();
    }
  }, [pending, state, router]);

  return (
    <li className="rounded-3xl border border-ink/10 bg-paper-warm shadow-painted">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-5 p-4 text-left"
      >
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
          <PaintedScene variant={trip.cover} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold leading-tight">{trip.name}</p>
          <p className="text-sm text-ink-faint">{trip.dates}</p>
        </div>
        <span className="hidden shrink-0 sm:block">
          <Badge tone="gold">
            <IconCamera className="h-3 w-3" />
            {tripCounts[trip.slug]?.pub ?? 0}/{tripCounts[trip.slug]?.total ?? 0} public
          </Badge>
        </span>
      </button>

      {open && (
        <form
          ref={formRef}
          action={action}
          onSubmit={() => {
            if (formRef.current) formRef.current.dataset.submitted = "1";
          }}
          className="space-y-4 border-t border-ink/10 p-6"
        >
          <input type="hidden" name="tripId" value={trip.id} />
          {state.error && <p className="text-sm font-semibold text-ember-deep">{state.error}</p>}
          <Field name="name" label="Trip name" defaultValue={trip.name} required />
          <Field name="location" label="Location" defaultValue={trip.location} required />
          <div className="grid grid-cols-2 gap-4">
            <Field name="startDate" label="From" type="date" defaultValue={trip.startDate} required />
            <Field name="endDate" label="To" type="date" defaultValue={trip.endDate} required />
          </div>
          <div>
            <label htmlFor="trip-description" className="mb-1.5 block text-sm font-semibold text-ink-soft">
              Field notes
            </label>
            <textarea
              id="trip-description"
              name="description"
              rows={3}
              defaultValue={trip.description}
              className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
            />
          </div>
          <MemberFieldset users={users} admin={admin} defaultCheckedIds={memberIds} />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-full bg-moss px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-moss-deep disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full border border-ink/20 px-6 py-2.5 font-semibold text-ink-soft transition-colors hover:border-ember hover:text-ember"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={`trip-${name}`} className="mb-1.5 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <input
        id={`trip-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper-warm px-4 py-4 shadow-painted sm:rounded-3xl sm:px-6 sm:py-5">
      <p className={`font-display text-3xl font-semibold sm:text-4xl ${accent}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint sm:text-sm">{label}</p>
    </div>
  );
}
