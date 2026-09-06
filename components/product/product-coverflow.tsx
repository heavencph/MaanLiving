"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/data";
import type { AppLocale } from "@/i18n/routing";

/**
 * A coverflow of product photographs: the piece in focus stands upright while
 * its neighbours fall back and tilt away. Drag sideways, click a neighbour, or
 * use the arrow keys.
 *
 * After Tanya Prokofieva's Framer original, with two departures. Photographs
 * come from `next/image` and this deployment rather than a CDN, because
 * `images.remotePatterns` is deliberately empty. And dragging is new — the
 * original turns on click alone, which is no way to leaf through an album on
 * a phone.
 */

/** How far the neighbours fall back. Only depth — what draws in front of what
 *  is decided by z-index, for the reason given on the card below. */
const DEPTH = 240;
const PERSPECTIVE = 1600;
const SCALE_STEP = 0.14;
/** Cards further than this from the centre are not drawn. */
const MAX_VISIBLE = 2;
const TILT = 12;
const SIDE_TILT = 6;
/** Sideways spread, as a fraction of one card's width. */
const SPREAD = 0.46;

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.6;

/** How much a photograph lifts under the cursor — the same 5% the grids elsewhere
 *  on the site use, and it rides the same 0.6s easing so it feels of a piece. */
const HOVER_SCALE = 1.05;
/** Past this, letting go turns the page instead of springing back. */
const DRAG_DISTANCE = 48;
/** Movement below this decides nothing; past it the gesture commits to an axis. */
const AXIS_THRESHOLD = 10;

export function ProductCoverflow({ products }: { products: Product[] }) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const reduced = useReducedMotion();

  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const count = products.length;

  // The card follows the container rather than a fixed pixel size, so the
  // neighbours stay visible at either shoulder on a phone as well as a desk.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cardWidth = Math.min(width * 0.62, 380);
  const cardHeight = cardWidth * 1.25;

  const step = useCallback((direction: number) => {
    setActive((a) => (((a + direction) % count) + count) % count);
    // The cards move but the pointer does not, and a transform alone will not
    // make the browser re-evaluate what is under it — so the lift would stay
    // on a card that has since slid away. Dropped here; the next movement of
    // the cursor picks up whichever photograph it is now over.
    setHovered(null);
  }, [count]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    },
    [step]
  );

  /**
   * The gesture is handled here rather than with framer-motion's `drag`, which
   * claims the pointer the moment it moves in any direction — vertical swipes
   * over the carousel then stopped the page scrolling at all. `touch-action:
   * pan-y` leaves vertical to the browser, and this only commits once the
   * movement is clearly sideways; if the browser takes the gesture for a
   * scroll it sends pointercancel and we let go.
   */
  const gesture = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = { x: event.clientX, y: event.clientY, axis: null };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.axis === "y") return;

    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (!g.axis) {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.axis !== "x") return;

      const dx = event.clientX - g.x;
      if (Math.abs(dx) > DRAG_DISTANCE) step(dx < 0 ? 1 : -1);
    },
    [step]
  );

  const onPointerCancel = useCallback(() => {
    gesture.current = null;
  }, []);

  const transition = reduced ? { duration: 0 } : { duration: DURATION, ease: EASE };
  const current = products[active];

  return (
    <div className="flex flex-col items-center">
      <div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("carouselLabel")}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // pan-y hands vertical scrolling to the browser and keeps horizontal for us
        className="relative flex w-full touch-pan-y select-none items-center justify-center outline-none"
        style={{ height: cardHeight || undefined }}
      >
        <div className="relative" style={{ width: cardWidth, height: cardHeight }}>
          {products.map((product, index) => {
            // Shortest way round the loop, so the two ends meet.
            let offset = index - active;
            if (offset > count / 2) offset -= count;
            if (offset < -count / 2) offset += count;

            const distance = Math.abs(offset);
            const visible = distance <= MAX_VISIBLE;
            const isActive = offset === 0;

            return (
              <motion.div
                key={product.id}
                className="absolute left-1/2 top-1/2 overflow-hidden rounded-[1.25rem] bg-muted shadow-[0_24px_60px_-30px_rgba(30,25,20,0.5)] md:rounded-[1.75rem]"
                // Centred by margin rather than a translate, leaving x and z free
                // for the animation — framer-motion maps both onto one transform.
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardHeight / 2,
                  pointerEvents: visible ? "auto" : "none",
                  // Depth is drawn without a shared 3D context: `perspective` on
                  // the container plus `preserve-3d` stopped Chromium scrolling
                  // the page from a vertical swipe over the carousel at all —
                  // measured 0px against 201px once both were gone. Giving each
                  // card its own perspective() keeps the tilt and leaves the
                  // page scrollable. zIndex replaces the Z-ordering that a real
                  // 3D context would have done.
                  zIndex: MAX_VISIBLE - distance,
                }}
                animate={{
                  transformPerspective: PERSPECTIVE,
                  x: offset * cardWidth * SPREAD,
                  z: -distance * DEPTH,
                  rotateY: -offset * TILT,
                  rotateZ: offset * SIDE_TILT,
                  scale:
                  Math.max(0.4, 1 - distance * SCALE_STEP) *
                  (hovered === index ? HOVER_SCALE : 1),
                  opacity: visible ? 1 : 0,
                }}
                transition={transition}
                aria-hidden={!visible}
                // Mouse only: on a touch screen `pointerenter` fires on the
                // tap that starts a swipe, and there is no matching leave, so
                // the photograph would simply stay lifted afterwards.
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && visible) setHovered(index);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setHovered((h) => (h === index ? null : h));
                }}
              >
                <Image
                  src={product.heroImage}
                  alt={product.name}
                  fill
                  draggable={false}
                  sizes="(max-width: 768px) 62vw, 380px"
                  className="pointer-events-none object-cover"
                  priority={index < 2}
                />

                {/* Clear of the corner curve, which is now a good deal wider. */}
                {product.isNew && (
                  <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-warmwhite/90 px-3 py-1 text-[0.65rem] font-medium tracking-widest text-charcoal">
                    {t("new")}
                  </span>
                )}

                {/* The caption rides on the photograph, and only on the piece in
                    focus — on a tilted neighbour it would be unreadable. */}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-6 pt-16"
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={transition}
                >
                  <p className="font-heading text-lg leading-tight text-warmwhite">{product.name}</p>
                  <p className="mt-1 text-xs text-warmwhite/75">
                    {[product.category, formatPrice(product.price, product.currency, locale)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </motion.div>

                {/* Darkens everything but the piece in focus. */}
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-charcoal"
                  animate={{ opacity: isActive ? 0 : 0.35 }}
                  transition={transition}
                />

                {/* Clicking a neighbour brings it to the centre. The centre card
                    takes no clicks of its own, so a drag never lands on a
                    button and the photograph stays uncovered. */}
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setActive(index);
                      setHovered(null);
                    }}
                    tabIndex={visible ? 0 : -1}
                    className="absolute inset-0 h-full w-full cursor-pointer"
                  >
                    <span className="sr-only">{product.name}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Below the photographs rather than over them. Sitting on the card it
          covered the piece it was inviting you to look at, and on a phone it
          landed exactly where a thumb rests to swipe. */}
      <Link
        href={`/products/${current.slug}`}
        className="mt-7 rounded-full border border-foreground/20 px-6 py-2.5 text-xs font-medium tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        {t("viewDetails")}
      </Link>

      <p aria-live="polite" className="sr-only">
        {current.name} — {active + 1} / {count}
      </p>
    </div>
  );
}
