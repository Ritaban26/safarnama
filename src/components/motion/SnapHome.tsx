"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scroll shell for the home page:
 * - CSS scroll-snap chapters (mandatory on lg+, free scroll on mobile)
 * - GSAP ScrollTrigger drives the 3D chapter reveals ([data-depth]),
 *   scrubbed parallax layers ([data-parallax]) and the hero dolly-zoom
 * - right-edge chapter dots for snap navigation
 */
export default function SnapHome({
  chapters,
  children,
}: {
  chapters: string[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const scroller = ref.current;
      if (!scroller) return;

      // chapter tracking for the dot nav (always on — it's not motion)
      gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          scroller,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 3D rise: content tilts up out of the page plane as it enters
        gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 90, z: -160, rotateX: 9, transformPerspective: 1200 },
            {
              opacity: 1,
              y: 0,
              z: 0,
              rotateX: 0,
              duration: 1.15,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                scroller,
                start: "top 82%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        // staggered card fans: children of [data-depth-stagger] cascade in 3D
        gsap.utils.toArray<HTMLElement>("[data-depth-stagger]").forEach((el) => {
          gsap.fromTo(
            el.children,
            { opacity: 0, y: 70, z: -120, rotateX: 12, transformPerspective: 1100 },
            {
              opacity: 1,
              y: 0,
              z: 0,
              rotateX: 0,
              duration: 1,
              ease: "power3.out",
              stagger: 0.12,
              scrollTrigger: {
                trigger: el,
                scroller,
                start: "top 80%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        // scrubbed parallax layers — depth from differential speed
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || "0.2");
          gsap.fromTo(
            el,
            { yPercent: -speed * 50 },
            {
              yPercent: speed * 50,
              ease: "none",
              scrollTrigger: {
                trigger: el.closest("section"),
                scroller,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            }
          );
        });

        // hero dolly: the painting pushes in and lifts as you leave it
        const heroScene = scroller.querySelector("[data-hero-scene]");
        if (heroScene) {
          gsap.to(heroScene, {
            scale: 1.14,
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-hero]",
              scroller,
              start: "top top",
              end: "bottom top",
              scrub: 0.4,
            },
          });
        }
      });
    },
    { scope: ref }
  );

  const jump = (i: number) => {
    const el = ref.current?.querySelectorAll("[data-chapter]")[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={ref}
      className="h-svh overflow-y-auto overflow-x-hidden lg:snap-y lg:snap-mandatory"
      style={{ scrollbarWidth: "thin" }}
    >
      {children}

      {/* chapter dots */}
      <nav
        aria-label="Chapters"
        className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex"
      >
        {chapters.map((label, i) => (
          <button
            key={label}
            onClick={() => jump(i)}
            aria-label={`Go to ${label}`}
            aria-current={active === i}
            className="group relative grid h-4 w-4 cursor-pointer place-items-center"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                active === i
                  ? "h-3 w-3 bg-ember shadow-[0_0_12px_rgba(216,112,47,0.8)]"
                  : "h-2 w-2 bg-ink/25 group-hover:bg-ink/50"
              }`}
            />
            <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-full bg-ink px-3 py-1 font-hand text-base text-paper opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
