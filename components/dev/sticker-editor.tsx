"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from "react";
import Image from "next/image";
import { FlipHorizontal2, FlipVertical2, Maximize2, RotateCw } from "lucide-react";

export interface EditableStickerItem {
  id: string;
  src: string;
  alt: string;
  fit: "cover" | "contain";
  rotate: number;
  flipX?: boolean;
  flipY?: boolean;
  defaultClassName: string;
}

interface Box {
  xSide: "left" | "right";
  xPct: number;
  ySide: "top" | "bottom";
  yPct: number;
  hRem: number;
  wRem: number;
  hRemMd: number;
  wRemMd: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  fit: "cover" | "contain";
}

function parseBox(
  cls: string,
  initialRotate: number,
  initialFlipX: boolean,
  initialFlipY: boolean,
  initialFit: "cover" | "contain"
): Box {
  const left = cls.match(/\bleft-\[(-?[\d.]+)%\]/);
  const right = cls.match(/\bright-\[(-?[\d.]+)%\]/);
  const top = cls.match(/\btop-\[(-?[\d.]+)%\]/);
  const bottom = cls.match(/\bbottom-\[(-?[\d.]+)%\]/);
  const h = cls.match(/(?:^|\s)h-\[(-?[\d.]+)rem\]/);
  const w = cls.match(/(?:^|\s)w-\[(-?[\d.]+)rem\]/);
  const hMd = cls.match(/md:h-\[(-?[\d.]+)rem\]/);
  const wMd = cls.match(/md:w-\[(-?[\d.]+)rem\]/);
  const xMatch = left ?? right;
  const yMatch = top ?? bottom;
  return {
    xSide: left ? "left" : "right",
    xPct: xMatch ? parseFloat(xMatch[1]) : 0,
    ySide: top ? "top" : "bottom",
    yPct: yMatch ? parseFloat(yMatch[1]) : 0,
    hRem: h ? parseFloat(h[1]) : 8,
    wRem: w ? parseFloat(w[1]) : 8,
    hRemMd: hMd ? parseFloat(hMd[1]) : 10,
    wRemMd: wMd ? parseFloat(wMd[1]) : 10,
    rotate: initialRotate,
    flipX: initialFlipX,
    flipY: initialFlipY,
    fit: initialFit,
  };
}

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function formatClassName(box: Box) {
  return `${box.xSide}-[${round(box.xPct, 1)}%] ${box.ySide}-[${round(box.yPct, 1)}%] h-[${round(box.hRem, 2)}rem] w-[${round(box.wRem, 2)}rem] md:h-[${round(box.hRemMd, 2)}rem] md:w-[${round(box.wRemMd, 2)}rem]`;
}

function boxTransform(box: Box) {
  return `rotate(${round(box.rotate, 1)}deg) scaleX(${box.flipX ? -1 : 1}) scaleY(${box.flipY ? -1 : 1})`;
}

const RESIZE_SENSITIVITY = 150;
const MIN_SCALE = 0.15;

export function StickerEditor({
  items,
  containerRef,
}: {
  items: EditableStickerItem[];
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [boxes, setBoxes] = useState<Record<string, Box>>(() =>
    Object.fromEntries(
      items.map((it) => [
        it.id,
        parseBox(it.defaultClassName, it.rotate, it.flipX ?? false, it.flipY ?? false, it.fit),
      ])
    )
  );
  const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<{ id: string; startX: number; startY: number; startBox: Box } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; startBox: Box } | null>(null);
  const rotateRef = useRef<{ id: string } | null>(null);

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      const rect = container.getBoundingClientRect();
      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
      setBoxes((prev) => ({
        ...prev,
        [drag.id]: {
          ...drag.startBox,
          xPct: drag.startBox.xSide === "left" ? drag.startBox.xPct + dxPct : drag.startBox.xPct - dxPct,
          yPct: drag.startBox.ySide === "top" ? drag.startBox.yPct + dyPct : drag.startBox.yPct - dyPct,
        },
      }));
    },
    [containerRef]
  );

  const onResizeMove = useCallback((e: PointerEvent) => {
    const rs = resizeRef.current;
    if (!rs) return;
    const dx = e.clientX - rs.startX;
    const dy = e.clientY - rs.startY;
    const factor = Math.max(MIN_SCALE, 1 + (dx + dy) / 2 / RESIZE_SENSITIVITY);
    setBoxes((prev) => ({
      ...prev,
      [rs.id]: {
        ...rs.startBox,
        hRem: rs.startBox.hRem * factor,
        wRem: rs.startBox.wRem * factor,
        hRemMd: rs.startBox.hRemMd * factor,
        wRemMd: rs.startBox.wRemMd * factor,
      },
    }));
  }, []);

  const onRotateMove = useCallback((e: PointerEvent) => {
    const rs = rotateRef.current;
    const el = rs ? wrapperRefs.current[rs.id] : null;
    if (!rs || !el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    setBoxes((prev) => ({ ...prev, [rs.id]: { ...prev[rs.id], rotate: angle } }));
  }, []);

  const endInteraction = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointermove", onRotateMove);
  }, [onDragMove, onResizeMove, onRotateMove]);

  function startDrag(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, startBox: boxes[id] };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endInteraction, { once: true });
  }

  function startResize(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { id, startX: e.clientX, startY: e.clientY, startBox: boxes[id] };
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", endInteraction, { once: true });
  }

  function startRotate(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    rotateRef.current = { id };
    window.addEventListener("pointermove", onRotateMove);
    window.addEventListener("pointerup", endInteraction, { once: true });
  }

  function toggleFlip(id: string, axis: "flipX" | "flipY") {
    setBoxes((prev) => ({ ...prev, [id]: { ...prev[id], [axis]: !prev[id][axis] } }));
  }

  function toggleFit(id: string) {
    setBoxes((prev) => ({
      ...prev,
      [id]: { ...prev[id], fit: prev[id].fit === "cover" ? "contain" : "cover" },
    }));
  }

  function copyAll() {
    const text = items
      .map((it) => {
        const box = boxes[it.id];
        return `${it.alt}\n  className: "${formatClassName(box)}",\n  rotate: ${round(box.rotate, 1)},\n  flipX: ${box.flipX},\n  flipY: ${box.flipY},\n  fit: "${box.fit}",`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
        {items.map((it) => {
          const box = boxes[it.id];
          const style: CSSProperties = {
            position: "absolute",
            [box.xSide]: `${box.xPct}%`,
            [box.ySide]: `${box.yPct}%`,
            height: `${box.hRemMd}rem`,
            width: `${box.wRemMd}rem`,
            transform: boxTransform(box),
          };
          return (
            <div
              key={it.id}
              ref={(el) => {
                wrapperRefs.current[it.id] = el;
              }}
              style={style}
              className="pointer-events-auto cursor-move touch-none ring-2 ring-terracotta"
              onPointerDown={(e) => startDrag(e, it.id)}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image
                  src={it.src}
                  alt={it.alt}
                  fill
                  sizes="440px"
                  draggable={false}
                  className={box.fit === "cover" ? "object-cover" : "object-contain"}
                />
              </div>

              <div
                onPointerDown={(e) => startRotate(e, it.id)}
                className="absolute -top-9 left-1/2 flex h-7 w-7 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-warmwhite bg-terracotta text-warmwhite active:cursor-grabbing"
                title="拖曳旋轉"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </div>

              <div
                onPointerDown={(e) => startResize(e, it.id)}
                className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize touch-none rounded-full border-2 border-warmwhite bg-terracotta"
              />

              <div className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap">
                <span className="rounded bg-charcoal px-1.5 py-0.5 text-[10px] text-warmwhite">{it.alt}</span>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggleFlip(it.id, "flipX")}
                  className={`flex h-5 w-5 items-center justify-center rounded ${box.flipX ? "bg-terracotta text-warmwhite" : "bg-warmwhite text-charcoal"} border border-charcoal/30`}
                  title="水平翻轉"
                >
                  <FlipHorizontal2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggleFlip(it.id, "flipY")}
                  className={`flex h-5 w-5 items-center justify-center rounded ${box.flipY ? "bg-terracotta text-warmwhite" : "bg-warmwhite text-charcoal"} border border-charcoal/30`}
                  title="垂直翻轉"
                >
                  <FlipVertical2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggleFit(it.id)}
                  className={`flex h-5 w-5 items-center justify-center rounded ${box.fit === "contain" ? "bg-terracotta text-warmwhite" : "bg-warmwhite text-charcoal"} border border-charcoal/30`}
                  title="顯示完整圖片（不裁切）"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-4 z-50 max-h-[70vh] w-[26rem] overflow-auto rounded-lg border border-charcoal/20 bg-warmwhite/95 p-4 text-xs shadow-xl backdrop-blur">
        <p className="mb-2 font-medium text-charcoal">
          編輯模式：拖曳貼紙移動位置；拖曳右下角橘色圓點縮放大小；拖曳上方圓點旋轉；點擊 H/V
          圖示翻轉；點擊放大圖示切換完整圖片／裁切。
        </p>
        <button
          type="button"
          onClick={copyAll}
          className="mb-3 rounded-full bg-charcoal px-4 py-1.5 text-[11px] text-warmwhite transition-transform hover:scale-[1.03]"
        >
          複製全部座標
        </button>
        <div className="space-y-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {items.map((it) => {
            const box = boxes[it.id];
            return (
              <div key={it.id}>
                <p className="text-charcoal">{it.alt}</p>
                <p className="break-all">{formatClassName(box)}</p>
                <p>
                  rotate: {round(box.rotate, 1)} · flipX: {String(box.flipX)} · flipY: {String(box.flipY)} · fit:{" "}
                  {box.fit}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
