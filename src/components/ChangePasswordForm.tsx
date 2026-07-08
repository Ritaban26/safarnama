"use client";

import { useActionState } from "react";
import { changePassword, type ActionState } from "@/lib/actions";
import { IconCheck } from "@/components/icons";

interface FormState extends ActionState {
  ok?: boolean;
}

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const res = await changePassword({}, formData);
      return res.error ? res : { ok: true };
    },
    {},
  );

  return (
    <form key={state.ok ? "done" : "editing"} className="mt-8 max-w-md space-y-5" action={action}>
      {state.error && (
        <p className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember-deep">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="inline-flex items-center gap-2 rounded-xl border border-moss/40 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss-deep">
          <IconCheck className="h-4 w-4" /> Password updated.
        </p>
      )}
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-semibold text-ink-soft">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm font-semibold text-ink-soft">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="at least 8 characters"
          className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-full bg-ember px-6 py-2.5 font-semibold text-paper transition-colors hover:bg-ember-deep disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
