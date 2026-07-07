"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/lib/actions";
import { IconArrow } from "@/components/icons";

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, {});

  return (
    <form className="mt-8 space-y-5" action={action}>
      {state.error && (
        <p className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember-deep">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-soft">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@thecircle.in"
          className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-soft">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="group flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-ember py-3.5 font-semibold text-paper transition-colors hover:bg-ember-deep disabled:opacity-60"
      >
        {pending ? "Checking the guestbook…" : "Enter the archive"}
        <IconArrow className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
      </button>
    </form>
  );
}
