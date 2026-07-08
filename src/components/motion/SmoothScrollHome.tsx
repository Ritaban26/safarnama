"use client";

import { useEffect, useRef } from "react";

/**
 * Home scroll engine — a faithful port of HANDOFF.md.
 *
 * One damped requestAnimationFrame loop drives every scroll-reactive
 * visual: the scroll event only records a target, the loop eases the
 * rendered value (`current`) toward it every frame. Nothing reads
 * `window.scrollY` for visuals — that exponential smoothing is the whole
 * aesthetic. Rect-based sections are damped too, by offsetting their real
 * rect by (scrollY - current), so they track `current` like everything else.
 *
 * One-shot entrances are handled separately by IntersectionObserver so they
 * fire once and then stop costing anything — never routed through the loop.
 */
export default function SmoothScrollHome({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = 0.085; // master feel knob — lower = heavier catch-up

    // ---- element handles (queried once) ----
    const q = <T extends Element>(sel: string) =>
      Array.from(root.querySelectorAll<T>(sel));
    const one = <T extends Element>(sel: string) => root.querySelector<T>(sel);

    const heroCopy = one<HTMLElement>("[data-hero-copy]");
    const heroSun = one<HTMLElement>("[data-hero-sun]");
    const heroStage = one<HTMLElement>("[data-hero-stage]");
    const heroCue = one<HTMLElement>("[data-hero-cue]");
    const heroClouds = q<HTMLElement>("[data-hero-cloud]");

    const strip = one<HTMLElement>("[data-strip]");
    const stripHills = q<HTMLElement>("[data-strip-hill]");
    const stripClouds = q<HTMLElement>("[data-strip-cloud]");

    const circleWrap = one<HTMLElement>("[data-circle-wrap]");
    const circleCard = one<HTMLElement>("[data-circle-card]");

    const parallax = q<HTMLElement>("[data-parallax]");

    // ---- the single lerped loop ----
    let target = window.scrollY;
    let current = target;
    let raf = 0;

    const frame = () => {
      current += (target - current) * (reduced ? 1 : ease);
      if (Math.abs(target - current) < 0.1) current = target; // snap to rest
      const y = current;
      const vh = window.innerHeight;
      const shift = window.scrollY - current; // real ahead of damped → damp rects

      // hero: layered parallax + choreographed exit (all from one progress)
      const hp = clamp(y / (vh * 0.7), 0, 1);
      if (heroCopy) {
        heroCopy.style.transform = `translateY(${-hp * 120}px)`;
        heroCopy.style.opacity = `${clamp(1 - hp * 1.1, 0, 1)}`;
      }
      if (heroSun) heroSun.style.transform = `translateY(${hp * 90}px) scale(${1 + hp * 0.15})`;
      heroClouds.forEach((c, i) => {
        const dir = i % 2 ? 1 : -1; // alternating layers part outward
        c.style.transform = `translateX(${dir * hp * (120 + i * 40)}px)`;
      });
      if (heroStage) heroStage.style.filter = `brightness(${1 - hp * 0.25})`;
      if (heroCue) heroCue.style.opacity = `${clamp(1 - hp * 2, 0, 1)}`;

      // meadow strip: viewport-relative progress (model A), damped
      if (strip) {
        const r = strip.getBoundingClientRect();
        const bottom = r.bottom + shift;
        const p = clamp(1 - bottom / (vh + r.height), 0, 1);
        stripHills.forEach((h, i) => (h.style.transform = `translateY(${(1 - p) * (30 + i * 22)}px)`));
        stripClouds.forEach((c, i) => (c.style.transform = `translateX(${(p - 0.5) * (i ? -90 : 140)}px)`));
      }

      // circle card: pinned-scrub progress (model B), damped
      if (circleWrap && circleCard) {
        const r = circleWrap.getBoundingClientRect();
        const total = r.height - vh; // scrollable overshoot
        const p = clamp(-(r.top + shift) / total, 0, 1);
        const inHalf = clamp(p * 2, 0, 1); // entrance completes in first half, then dwells
        const s = 0.82 + 0.18 * inHalf;
        circleCard.style.transform = `scale(${s}) translateY(${(1 - inHalf) * 60}px)`;
        circleCard.style.opacity = `${clamp(p * 2.4, 0, 1)}`;
      }

      // generic decorative wash layers — rate ∝ nearness (speed attr)
      parallax.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || "0.2");
        const r = el.getBoundingClientRect();
        const center = (r.top + shift + r.height / 2) / vh;
        el.style.transform = `translateY(${(center - 0.5) * speed * 140}px)`;
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onScroll = () => (target = window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---- one-shot reveals ----
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target); // reveals are one-way
          }
        });
      },
      { threshold: 0.18 }
    );
    q(".reveal").forEach((el) => io.observe(el));

    // ---- SVG underline: feed measured path length to CSS ----
    q<SVGPathElement>(".underline-wrap path").forEach((p) => {
      p.style.setProperty("--len", `${p.getTotalLength()}`);
    });

    // ---- idle soot sprites (WAAPI, kept out of the scroll loop) ----
    const sootAnims: Animation[] = [];
    if (!reduced) {
      q<HTMLElement>("[data-soot]").forEach((el, i) => {
        sootAnims.push(
          el.animate(
            [
              { transform: "translate(0, 0)" },
              { transform: `translate(${i % 2 ? 14 : -12}px, -18px)` },
            ],
            {
              duration: 5200 + i * 640,
              iterations: Infinity,
              direction: "alternate",
              easing: "ease-in-out",
            }
          )
        );
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      sootAnims.forEach((a) => a.cancel());
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
