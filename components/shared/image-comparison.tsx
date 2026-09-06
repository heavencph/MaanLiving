"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MoveHorizontal } from "lucide-react";

interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
}

/** A draggable before/after slider — used to contrast raw material vs. finished piece. */
export function ImageComparison({
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full select-none overflow-hidden bg-muted"
      onMouseDown={(e) => {
        dragging.current = true;
        updateFromClientX(e.clientX);
      }}
      onMouseMove={(e) => dragging.current && updateFromClientX(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => updateFromClientX(e.touches[0].clientX)}
      onTouchMove={(e) => updateFromClientX(e.touches[0].clientX)}
    >
      <Image src={afterImage} alt={afterLabel} fill sizes="90vw" className="object-cover" />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={beforeImage} alt={beforeLabel} fill sizes="90vw" className="object-cover" />
      </div>

      <div
        className="absolute inset-y-0 flex w-0.5 -translate-x-1/2 items-center justify-center bg-warmwhite"
        style={{ left: `${position}%` }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warmwhite text-charcoal shadow-lg">
          <MoveHorizontal className="h-4 w-4" />
        </div>
      </div>

      <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-charcoal/70 px-3 py-1 text-[0.7rem] text-warmwhite">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-charcoal/70 px-3 py-1 text-[0.7rem] text-warmwhite">
        {afterLabel}
      </span>
    </div>
  );
}
