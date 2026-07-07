/** Minimal inline icon set (24×24 stroke icons, Lucide-style) */

function Base({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconArrow = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Base>
);

export const IconPlay = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </Base>
);

export const IconLock = ({ className }: { className?: string }) => (
  <Base className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Base>
);

export const IconGlobe = ({ className }: { className?: string }) => (
  <Base className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
  </Base>
);

export const IconUpload = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M12 16V4" />
    <path d="m6 9 6-5 6 5" />
    <path d="M4 20h16" />
  </Base>
);

export const IconDownload = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M12 4v12" />
    <path d="m6 11 6 5 6-5" />
    <path d="M4 20h16" />
  </Base>
);

export const IconCheck = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
);

export const IconX = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Base>
);

export const IconCamera = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Base>
);

export const IconLeaf = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M5 19c0-8 5-13 14-14 .5 9-4 14-12 14" />
    <path d="M5 19c3-5 7-8 11-9" />
  </Base>
);

export const IconCompass = ({ className }: { className?: string }) => (
  <Base className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 5-5 2.2 2.2-5z" />
  </Base>
);

export const IconFeather = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M20 4c-6 0-12 5-13 13l-3 3" />
    <path d="M20 4c1 6-3 12-11 13" />
    <path d="M9 13h5" />
  </Base>
);

export const IconClock = ({ className }: { className?: string }) => (
  <Base className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Base>
);

export const IconUsers = ({ className }: { className?: string }) => (
  <Base className={className}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5" />
    <circle cx="17" cy="9.5" r="2.5" />
    <path d="M16.5 14.5c2.5.3 4 2 4.5 4.5" />
  </Base>
);

export const IconTrash = ({ className }: { className?: string }) => (
  <Base className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 13h10l1-13" />
  </Base>
);
