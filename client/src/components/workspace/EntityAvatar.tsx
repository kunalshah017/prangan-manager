import type React from "react";

import { cn } from "@/lib/utils";

// Centres are named after flowers, so a known flower gets its own colour.
// Any other name maps to a stable hue from the same palette.
const FLOWER_HUES: Record<string, number> = {
  lavender: 300,
  tulip: 355,
  marigold: 70,
  lotus: 340,
  jasmine: 100,
  sunflower: 90,
  orchid: 320,
  rose: 10,
  lily: 260,
  hibiscus: 25,
};
const HUES = [300, 355, 70, 150, 340, 235];

const hueFor = (name: string) => {
  const flower = Object.keys(FLOWER_HUES).find((key) => name.toLowerCase().includes(key));
  if (flower) return FLOWER_HUES[flower];
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

interface EntityAvatarProps {
  name: string;
  imageSrc?: string | null;
  size?: "md" | "lg";
  className?: string;
}

export function EntityAvatar({ name, imageSrc, size = "md", className }: EntityAvatarProps) {
  const sizeClasses = size === "lg" ? "h-16 w-16 rounded-xl text-xl" : "h-12 w-12 rounded-lg text-base";

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        loading="lazy"
        className={cn("shrink-0 bg-muted object-cover", sizeClasses, className)}
      />
    );
  }

  const hue = hueFor(name);
  // The hue comes from the name; each theme sets its own lightness, so the
  // tile is a soft pastel on light pages and a deep tone on dark ones.
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        "bg-[oklch(0.94_0.05_var(--entity-hue))] text-[oklch(0.42_0.12_var(--entity-hue))]",
        "dark:bg-[oklch(0.32_0.06_var(--entity-hue))] dark:text-[oklch(0.88_0.08_var(--entity-hue))]",
        sizeClasses,
        className,
      )}
      style={{ "--entity-hue": hue } as React.CSSProperties}
    >
      {initialsFor(name)}
    </span>
  );
}
