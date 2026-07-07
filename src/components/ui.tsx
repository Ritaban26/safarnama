import type { User } from "@/lib/data";

/** Small Karla eyebrow label above section titles */
export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
        light ? "text-gold" : "text-ember"
      }`}
    >
      {children}
    </p>
  );
}

/** Wavy painted divider between page sections */
export function WaveDivider({ from, to, flip = false }: { from: string; to: string; flip?: boolean }) {
  return (
    <div aria-hidden style={{ backgroundColor: to }} className={flip ? "rotate-180" : ""}>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="block h-[46px] w-full sm:h-[70px]">
        <path
          d="M0 38 C 180 70 320 6 520 30 C 720 54 860 10 1060 28 C 1240 44 1360 20 1440 34 L 1440 0 L 0 0 Z"
          fill={from}
        />
      </svg>
    </div>
  );
}

export function Avatar({ user, size = "h-9 w-9 text-sm" }: { user: User; size?: string }) {
  return (
    <span
      title={user.name}
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-paper ${size}`}
      style={{ backgroundColor: user.tint }}
    >
      {user.initials}
    </span>
  );
}

export function AvatarStack({ users }: { users: User[] }) {
  return (
    <span className="flex -space-x-2.5">
      {users.map((u) => (
        <span key={u.id} className="rounded-full ring-2 ring-paper-warm">
          <Avatar user={u} size="h-8 w-8 text-xs" />
        </span>
      ))}
    </span>
  );
}

export function Badge({
  children,
  tone = "moss",
}: {
  children: React.ReactNode;
  tone?: "moss" | "ember" | "dusk" | "gold" | "faint";
}) {
  const tones: Record<string, string> = {
    moss: "bg-moss/12 text-moss-deep border-moss/25",
    ember: "bg-ember/12 text-ember-deep border-ember/30",
    dusk: "bg-dusk/10 text-dusk border-dusk/25",
    gold: "bg-gold/15 text-ember-deep border-gold/35",
    faint: "bg-ink/5 text-ink-soft border-ink/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
