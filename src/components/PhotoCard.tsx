"use client";

import Image from "next/image";
import PaintedScene from "./PaintedScene";
import TiltCard from "./motion/TiltCard";
import type { Media } from "@/lib/data";
import { IconPlay } from "./icons";

const ROTATIONS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-[1.5deg]", "-rotate-[1.5deg]"];

/** A photograph taped into the journal: paper mat, tape, handwritten caption — now with pointer-tracked 3D tilt. */
export default function PhotoCard({
  item,
  index = 0,
  ratio = "aspect-[4/3]",
  showCaption = true,
}: {
  item: Media;
  index?: number;
  ratio?: string;
  showCaption?: boolean;
}) {
  return (
    <TiltCard className={ROTATIONS[index % ROTATIONS.length]}>
      <figure className="photo-card relative rounded-sm">
        <span aria-hidden className="tape" style={{ transform: "translateX(-50%) rotate(-2deg) translateZ(26px)" }} />
        <div
          className={`photo-img relative overflow-hidden rounded-[3px] ${ratio}`}
          style={{ transform: "translateZ(14px)" }}
        >
          <MediaFrame item={item} />
          {item.type === "video" && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ink/55 text-paper backdrop-blur-sm">
                <IconPlay className="ml-1 h-6 w-6" />
              </span>
            </span>
          )}
        </div>
        {showCaption && (
          <figcaption
            className="flex items-baseline justify-between gap-3 px-1 pt-2.5"
            style={{ transform: "translateZ(8px)" }}
          >
            <span className="font-hand text-lg leading-snug text-ink-soft">{item.caption}</span>
            <span className="shrink-0 text-xs tracking-wide text-ink-faint">
              {item.uploader.name.split(" ")[0]} · {item.takenAt}
            </span>
          </figcaption>
        )}
      </figure>
    </TiltCard>
  );
}

/** Renders the real file when it exists; otherwise the painted placeholder. */
export function MediaFrame({ item }: { item: Media }) {
  if (item.url && item.type === "photo") {
    return (
      <Image
        src={item.url}
        alt={item.caption || "Trip photograph"}
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className="object-cover"
      />
    );
  }
  if (item.url && item.type === "video") {
    return <video src={item.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <div className="absolute inset-0" style={{ filter: `hue-rotate(${item.hue}deg) saturate(1.06) contrast(1.05)` }}>
      <PaintedScene variant={item.variant} />
    </div>
  );
}
