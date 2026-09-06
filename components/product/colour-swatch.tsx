"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColourSwatchProps {
  hex: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export function ColourSwatch({ hex, name, selected, onSelect, size = "md" }: ColourSwatchProps) {
  const isLight = isLightColour(hex);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={name}
      aria-pressed={selected}
      title={name}
      className="group relative flex items-center justify-center"
    >
      <motion.span
        animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -inset-1 rounded-full border border-foreground/70"
      />
      <span
        className={cn(
          SIZE_MAP[size],
          "flex items-center justify-center rounded-full ring-1 ring-inset ring-black/10 transition-transform duration-300 group-hover:scale-110"
        )}
        style={{ backgroundColor: hex }}
      >
        {selected && (
          <Check
            className="h-3.5 w-3.5"
            strokeWidth={2.5}
            color={isLight ? "#2B2521" : "#F3EFE8"}
          />
        )}
      </span>
    </button>
  );
}

function isLightColour(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
