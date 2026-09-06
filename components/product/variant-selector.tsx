"use client";

import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface VariantSelectorProps {
  label: string;
  options: Option[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function VariantSelector({ label, options, selectedId, onChange }: VariantSelectorProps) {
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-left text-xs font-medium tracking-wide transition-colors",
              selectedId === opt.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground/80 hover:border-foreground/60"
            )}
          >
            {opt.label}
            {opt.sublabel && (
              <span
                className={cn(
                  "ml-1.5 text-[0.7rem]",
                  selectedId === opt.id ? "text-background/70" : "text-muted-foreground"
                )}
              >
                {opt.sublabel}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
