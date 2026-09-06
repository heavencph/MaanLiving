"use client";

import { motion } from "framer-motion";
import { ColourSwatch } from "@/components/product/colour-swatch";
import type { ColourOption } from "@/types/product";

interface ColourConfiguratorProps {
  colours: ColourOption[];
  selected: ColourOption;
  onChange: (colour: ColourOption) => void;
  label: string;
}

/**
 * The interactive colour/material configurator. Selecting a swatch instantly
 * (no page refresh) updates the shared selection state — the parent page
 * feeds `selected` into ProductGallery so the hero image cross-fades.
 */
export function ColourConfigurator({
  colours,
  selected,
  onChange,
  label,
}: ColourConfiguratorProps) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <motion.p
          key={selected.id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="font-heading text-base text-foreground"
        >
          {selected.name}
        </motion.p>
      </div>
      <div className="flex flex-wrap gap-3">
        {colours.map((c) => (
          <ColourSwatch
            key={c.id}
            hex={c.hex}
            name={c.name}
            selected={selected.id === c.id}
            onSelect={() => onChange(c)}
            size="lg"
          />
        ))}
      </div>
    </div>
  );
}
