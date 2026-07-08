"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

/** Scroll-into-view 3D reveal for the non-snap pages. */
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const [ready, setReady] = useState(false);

  // Safety net: if the observer never fires (e.g. the element is already on
  // screen at mount on mobile), reveal anyway so content is never stuck hidden.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const show = inView || ready;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36, rotateX: 7 }}
      animate={show ? { opacity: 1, y: 0, rotateX: 0 } : undefined}
      transition={{ duration: 0.85, delay, ease: [0.22, 0.8, 0.3, 1] }}
      style={{ transformPerspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}
