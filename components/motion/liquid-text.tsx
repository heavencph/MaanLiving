"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Text that resolves out of a liquid blur as it scrolls up the viewport.
 *
 * Two filters stacked, which is the whole trick. The inner element takes a
 * plain CSS blur; the outer one runs that blurred result through an alpha
 * threshold, so the soft grey ramp the blur leaves behind snaps back to a hard
 * edge. Neighbouring glyphs whose blurs overlap therefore fuse into a single
 * continuous shape rather than two faint ones — the metaball look — and draw
 * apart into letters again as the blur winds down.
 *
 * A blur alone would only ever look like a blur. The threshold is what makes
 * it read as liquid.
 */

export const LIQUID_FILTER_ID = "liquid-goo";

/**
 * The threshold filter, which every `LiquidText` on the page points at. Render
 * once, near the top of the page; an id has to be unique for `url(#…)` to
 * resolve.
 */
export function LiquidDefs() {
  return (
    <svg aria-hidden focusable="false" className="pointer-events-none absolute h-0 w-0">
      <defs>
        <filter
          id={LIQUID_FILTER_ID}
          // Filters interpolate in linearRGB unless told otherwise, which
          // lifts dark text several shades on its way through — the melted
          // state would then be visibly lighter than the resolved one it is
          // supposed to be turning into.
          colorInterpolationFilters="sRGB"
          // Room for the blur to spread into. The default region stops at
          // 120% and shears the outermost blobs off square.
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
        >
          {/* Alpha out = 18a − 3.5: a near-vertical ramp, so the blur's soft
              grey shoulder comes back as a hard organic edge.

              The cut sits at a ≈ 0.22 rather than the ≈ 0.5 the usual recipe
              uses, and that number was measured against this site's own type,
              not taken off the shelf. Our headings are a hairline serif; a
              blurred hairline's peak alpha never reaches 0.5, so at the
              textbook threshold the strokes fell under the cut and the words
              came apart into shards — erased rather than melted. Cutting low
              keeps thin strokes above water, and they fatten and fuse instead. */}
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 18 -3.5"
          />
        </filter>
      </defs>
    </svg>
  );
}

interface LiquidTextProps {
  children: ReactNode;
  className?: string;
  /**
   * Peak blur radius the moment the block enters, in `em`.
   *
   * Deliberately not pixels: a radius that reads as a gentle haze across a
   * 60px headline is wider than the strokes of a 14px caption and erases it
   * outright. In `em` both melt by the same fraction of their own letterforms.
   *
   * Measured against this site's type, 0.16 is about where display text fuses
   * into organic blobs while its characters can still be made out; by 0.22 it
   * has collapsed into shapes that read as damage rather than as an effect.
   * Body copy is set lower — the value that flatters a headline leaves a long
   * paragraph an unreadable slab for the whole of its entrance.
   */
  blur?: number;
}

/**
 * How much of the peak blur small screens get.
 *
 * The `em` unit makes the melt proportional in theory, and it holds right up
 * until a glyph's inner gaps get close to the pixel grid. A 48px 品 carries
 * counters around 4px wide, which a blur of the same proportion narrows but
 * leaves open; the same character at 30px has roughly 2px counters, which fill
 * completely, and the heading goes to featureless blobs. Measured on the
 * milestones heading, the mobile size wanted about 0.10 where the desktop one
 * wanted 0.16 — hence this ratio rather than a rounder-looking guess.
 */
const COMPACT_BLUR_SCALE = 0.62;

/** True below Tailwind's `md`, kept in sync so a rotation re-measures. */
function useCompactViewport() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

export function LiquidText({ children, className, blur = 0.16 }: LiquidTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const compact = useCompactViewport();
  // Reduced motion zeroes the peak instead of returning a different tree.
  //
  // Returning early used to render markup that differed from the server's
  // only by the style attribute, and React does not repair attribute
  // mismatches while hydrating a production build: the melted style the
  // server wrote stayed on the element, and readers who ask for less motion
  // got text frozen mid-melt and permanently illegible. Routing it through
  // the motion value means framer writes the resolved value onto the node
  // itself, which is not something hydration can leave behind.
  const peak = reduced ? 0 : compact ? blur * COMPACT_BLUR_SCALE : blur;

  // Resolves as the block's own top travels from the bottom of the viewport
  // to the middle of it, so a column of blocks resolves in reading order
  // without anything having to hand out delays.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });

  // Lags the scroll slightly, which is most of what sells it as viscous
  // rather than as a value wired straight to the scrollbar. Sampled frame by
  // frame after a scroll jump, this pairing is already moving on the first
  // frame and arrives at about 900ms, so a flick still gets a visible resolve
  // rather than a finished one.
  const progress = useSpring(scrollYProgress, {
    stiffness: 55,
    damping: 26,
    restDelta: 0.001,
  });

  // Eased into zero rather than ramped linearly, because perceived sharpness
  // does not track blur radius evenly. Rendering the same heading across the
  // radius range and diffing each frame against the resolved one puts more
  // than half the total visible change below a fifth of the peak radius: the
  // wide-radius end all looks much alike, and the eye only reads "focusing"
  // in the last stretch before zero.
  //
  // A linear ramp therefore coasts through the melted range and crosses the
  // range that actually reads as focusing in its final moments — which is the
  // snap. Squaring spends roughly the back half of the scroll inside that
  // narrow band instead, so the change per pixel scrolled comes out close to
  // even, and the largest jump moves off the end of the transition.
  const blurEm = useTransform(progress, (p) => peak * (1 - p) ** 2);

  // Both filters come off entirely at the end rather than resting at zero.
  // The threshold is indiscriminate: handed fully resolved text it snaps the
  // half-lit pixels along every glyph edge to either fully on or fully off,
  // which is antialiasing, and the type ends up visibly jagged. Dropping to
  // `none` also returns these blocks to being free to paint once they are
  // done, instead of re-running a filter on every frame for the rest of the
  // page's life.
  // Both effects ride one `filter` on one element rather than a blurred box
  // nested inside a thresholded one. A filter list applies left to right, so
  // this is the same two passes in the same order, but it asks the browser
  // for a single render surface instead of two stacked ones. Safari gives
  // every filtered element its own surface and does not hardware-accelerate
  // `url(#…)` the way it does `blur()`, so the nested form had it compositing
  // two surfaces per frame for the whole of a scroll.
  const filter = useTransform(blurEm, (v) =>
    v <= 0.002 ? "none" : `blur(${v.toFixed(4)}em) url(#${LIQUID_FILTER_ID})`
  );

  return (
    <motion.div ref={ref} className={className} style={{ filter }}>
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Per-line resolution, for running text.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * How much of a paragraph's scroll range is spent offsetting its lines
 * against one another; the rest is how long any one line takes on its own.
 *
 * Melting a paragraph as a single block is what made the effect read as
 * thrown rather than travelled — a whole paragraph would sit melted and then
 * arrive all at once, however smoothly the blur itself was ramped. Staggering
 * the lines puts several states on screen together, the top of the paragraph
 * already legible while the bottom is still fused, so the resolution runs
 * down the page at reading speed.
 */
const LINE_SPREAD = 0.45;

/** SSR has no layout to measure, so the hook has to degrade to an effect. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Split into the units a line break can fall between: any two Chinese
 * characters, but only whitespace within Latin words. Splitting Latin per
 * character too would let the browser break words mid-syllable while the
 * measuring pass is on screen.
 */
const TOKEN_PATTERN =
  /[　-ヿ㐀-䶿一-鿿＀-￯]|[^\s　-ヿ㐀-䶿一-鿿＀-￯]+|\s+/g;

function tokenize(text: string): string[] {
  return text.match(TOKEN_PATTERN) ?? [text];
}

function LiquidLine({
  text,
  progress,
  index,
  total,
  peak,
}: {
  text: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
  peak: number;
}) {
  const filter = useTransform(progress, (p) => {
    const spread = total > 1 ? LINE_SPREAD : 0;
    const step = total > 1 ? spread / (total - 1) : 0;
    const span = 1 - spread;
    const local = Math.min(1, Math.max(0, (p - index * step) / span));
    const v = peak * (1 - local) ** 2;
    return v <= 0.002 ? "none" : `blur(${v.toFixed(4)}em) url(#${LIQUID_FILTER_ID})`;
  });

  // Left inline on purpose. A span wrapping exactly the text of one rendered
  // line is transparent to line breaking, so the paragraph still breaks where
  // it did; forcing the lines to `display: block` would re-run the breaking
  // against slightly different boxes and a full line could spill to two.
  return <motion.span style={{ filter }}>{text}</motion.span>;
}

/**
 * A paragraph that resolves a line at a time as it scrolls up the viewport.
 *
 * Where the lines fall is a layout result, not something the markup knows, so
 * the text is first rendered as the tokens a break could land between, their
 * positions read back, and tokens sharing a top grouped into a line. One
 * scroll listener and one spring drive the whole paragraph; the lines differ
 * only by an offset into that progress, so the cascade costs no more to watch
 * than the single block did.
 */
export function LiquidParagraph({
  text,
  className,
  blur = 0.09,
}: {
  text: string;
  className?: string;
  blur?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const compact = useCompactViewport();
  const peak = reduced ? 0 : compact ? blur * COMPACT_BLUR_SCALE : blur;

  const tokens = useMemo(() => tokenize(text), [text]);
  // `null` means the measuring pass is on screen: tokens, no filter, and the
  // same markup the server sent, so hydration has nothing to disagree with.
  const [lines, setLines] = useState<string[] | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 55,
    damping: 26,
    restDelta: 0.001,
  });

  // Runs before paint, so the melted first frame is the one the reader sees
  // rather than a flash of finished text.
  useIsomorphicLayoutEffect(() => {
    if (lines !== null) return;
    const el = ref.current;
    if (!el) return;
    const marks = Array.from(el.querySelectorAll<HTMLElement>("[data-token]"));
    if (!marks.length) return;

    const grouped: string[] = [];
    let top: number | null = null;
    let line = "";
    for (const mark of marks) {
      const y = Math.round(mark.getBoundingClientRect().top);
      if (top === null || Math.abs(y - top) <= 1) {
        line += mark.textContent ?? "";
        top ??= y;
      } else {
        grouped.push(line);
        line = mark.textContent ?? "";
        top = y;
      }
    }
    if (line) grouped.push(line);
    setLines(grouped);
  }, [lines, tokens]);

  // Anything that could move the breaks sends it back through the measuring
  // pass. Width is compared rather than trusted, because swapping tokens for
  // lines resizes nothing and would otherwise loop.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = el.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const next = el.getBoundingClientRect().width;
      if (Math.abs(next - width) > 1) {
        width = next;
        setLines(null);
      }
    });
    observer.observe(el);
    // A late webfont re-flows the text under a set of lines measured against
    // the fallback face.
    document.fonts?.ready.then(() => setLines(null)).catch(() => {});
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={ref} className={className}>
      {lines === null
        ? tokens.map((token, i) => (
            <span key={i} data-token>
              {token}
            </span>
          ))
        : lines.map((line, i) => (
            <LiquidLine
              key={i}
              text={line}
              progress={progress}
              index={i}
              total={lines.length}
              peak={peak}
            />
          ))}
    </p>
  );
}
