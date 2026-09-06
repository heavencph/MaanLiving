"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { StickerEditor } from "@/components/dev/sticker-editor";
import { MeshText } from "@/components/motion/mesh-text";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { brand } from "@/lib/brand";

const EASE = [0.16, 1, 0.3, 1] as const;

const STICKERS = [
  {
    src: "/images/home/Comet.png",
    alt: "Sideboard with lamp and stone panel",
    // Comet.png is landscape (1.557 w/h) where the sofa photo it replaces
    // was portrait — height is recomputed from that ratio at the old
    // widths so the new illustration fills its box instead of floating in
    // a tall mostly-empty one.
    className: "left-[9.3%] top-[11.9%] h-[12.38rem] w-[19.29rem] md:h-[17.02rem] md:w-[26.52rem]",
    rotate: -8,
    flipX: false,
    flipY: false,
    fit: "contain" as "cover" | "contain",
    depth: 24,
    floatDuration: 5.5,
  },
  {
    src: "/images/home/C75CD287-165A-4211-A680-9154F7B8902C.jpg",
    alt: "Nested side tables",
    className: "right-[6.7%] top-[18.2%] h-[11rem] w-[9rem] md:h-[16rem] md:w-[12rem]",
    rotate: 7,
    flipX: false,
    flipY: false,
    fit: "contain" as "cover" | "contain",
    depth: 38,
    floatDuration: 6.5,
  },
  {
    src: "/images/home/F2DD0514-5B31-4F0C-A915-66065B7D8861.jpg",
    alt: "Console and lounge chair vignette",
    className: "right-[18.5%] bottom-[1.2%] h-[9.28rem] w-[13.91rem] md:h-[13.91rem] md:w-[20.87rem]",
    rotate: -2,
    flipX: false,
    flipY: false,
    fit: "contain" as "cover" | "contain",
    depth: 16,
    floatDuration: 4.5,
  },
] as const;

// `onMobile` stickers keep their own placement below `md`, where there is only
// room for a couple of pieces; the rest join in from `md` upwards.
const CUTOUT_STICKERS = [
  {
    src: "/images/home/stickers/taipei.png",
    alt: "臺北",
    className: "left-[61.1%] top-[12.3%] h-[6rem] w-[6rem] md:h-[8rem] md:w-[8rem]",
    rotate: -6,
    flipX: false,
    flipY: false,
    depth: 14,
    floatDuration: 5,
    onMobile: false,
  },
  {
    src: "/images/home/stickers/guangzhou.png",
    alt: "廣州",
    className: "left-[9.8%] bottom-[22.4%] h-[5.57rem] w-[5.57rem] md:h-[6.5rem] md:w-[6.5rem]",
    rotate: 12.5,
    flipX: false,
    flipY: false,
    depth: 20,
    floatDuration: 6,
    onMobile: false,
  },
  {
    src: "/images/home/stickers/melbourne.png",
    alt: "墨爾本",
    className: "right-[7%] top-[77.2%] h-[6rem] w-[8rem] md:h-[7rem] md:w-[9rem]",
    rotate: -8,
    flipX: false,
    flipY: false,
    depth: 10,
    floatDuration: 4.2,
    onMobile: false,
  },
  {
    src: "/images/home/stickers/stool.png",
    alt: "Stool",
    className: "left-[26.3%] bottom-[14%] h-[8rem] w-[8rem] md:h-[15.41rem] md:w-[12.33rem]",
    rotate: -8.5,
    flipX: false,
    flipY: false,
    depth: 18,
    floatDuration: 5.8,
    onMobile: true,
  },
  {
    src: "/images/home/stickers/frankie.png",
    alt: "Frankie",
    className: "left-[64.5%] top-[18.9%] h-[8rem] w-[8rem] md:h-[24.04rem] md:w-[19.24rem]",
    rotate: 15.8,
    flipX: true,
    flipY: false,
    depth: 18,
    floatDuration: 5.8,
    onMobile: true,
  },
] as const;

function FloatingSticker({
  sticker,
  springX,
  springY,
  index,
  stillness,
}: {
  sticker: (typeof STICKERS)[number];
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  index: number;
  stillness: boolean;
}) {
  const x = useTransform(springX, (v) => v * sticker.depth);
  const y = useTransform(springY, (v) => v * sticker.depth);

  // the photo stickers stay desktop-only — below `md` the cutouts carry the scene
  return (
    // Two layers, because the parallax and the float both move the piece
    // vertically and framer-motion gives each element exactly one `y`. Sharing
    // it meant the two took turns: the pointer would hold y at +9.3 for a few
    // frames, then the float would reclaim it and snap to -9.3 — an 18px jump,
    // measured, right as the cursor began to move. Nested, they simply add.
    // `willChange` promotes this layer up front so the first movement is not
    // also paying for the promotion.
    <motion.div
      className={`absolute hidden md:block ${sticker.className}`}
      style={{ x, y, willChange: "transform" }}
    >
      <motion.div
        className="h-full w-full"
        style={{
          rotate: sticker.rotate,
          scaleX: sticker.flipX ? -1 : 1,
          scaleY: sticker.flipY ? -1 : 1,
        }}
        initial={stillness ? false : { opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: stillness ? 0 : [0, -14, 0],
        }}
        transition={{
          opacity: { duration: 0.8, delay: 0.4 + index * 0.15 },
          scale: { duration: 0.8, delay: 0.4 + index * 0.15 },
          y: {
            duration: sticker.floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.4,
          },
        }}
      >
        {sticker.fit === "cover" ? (
          <div className="relative h-full w-full overflow-hidden rounded-sm shadow-[0_20px_45px_-15px_rgba(30,25,20,0.35)]">
            <Image src={sticker.src} alt={sticker.alt} fill sizes="440px" className="object-cover" />
          </div>
        ) : (
          <div className="relative h-full w-full drop-shadow-[0_12px_20px_rgba(30,25,20,0.3)]">
            <Image src={sticker.src} alt={sticker.alt} fill sizes="440px" className="object-contain" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function CutoutSticker({
  doodle,
  springX,
  springY,
  index,
  stillness,
}: {
  doodle: (typeof CUTOUT_STICKERS)[number];
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  index: number;
  stillness: boolean;
}) {
  const x = useTransform(springX, (v) => v * doodle.depth);
  const y = useTransform(springY, (v) => v * doodle.depth);

  return (
    // Split for the same reason as the photo stickers above: one `y` per
    // element, so the parallax and the float each get their own.
    <motion.div
      className={`absolute ${doodle.onMobile ? "" : "hidden md:block"} ${doodle.className}`}
      style={{ x, y, willChange: "transform" }}
    >
      <motion.div
        className="h-full w-full"
        style={{
          rotate: doodle.rotate,
          scaleX: doodle.flipX ? -1 : 1,
          scaleY: doodle.flipY ? -1 : 1,
        }}
        initial={stillness ? false : { opacity: 0, scale: 0.7 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: stillness ? 0 : [0, -10, 0],
        }}
        transition={{
          opacity: { duration: 0.7, delay: 0.9 + index * 0.15 },
          scale: { duration: 0.7, delay: 0.9 + index * 0.15 },
          y: {
            duration: doodle.floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.3,
          },
        }}
      >
        <div className="relative h-full w-full drop-shadow-[0_12px_20px_rgba(30,25,20,0.3)]">
          <Image
            src={doodle.src}
            alt={doodle.alt}
            fill
            sizes="(max-width: 768px) 45vw, 200px"
            className="object-contain"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const t = useTranslations("home.hero");
  const sectionRef = useRef<HTMLDivElement>(null);
  // ?edit=1 opens the sticker editor, and only ever in development so it
  // cannot be reached by visitors on the deployed site
  const [editMode] = useState(() => {
    if (process.env.NODE_ENV === "production") return false;
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("edit") === "1";
  });

  // The marquee waits for the real face before it shows itself.
  //
  // Fonts load with `swap`, so the first paint uses a fallback whose Chinese
  // characters are proportioned differently — and this strip magnifies height
  // sixteen times, so what is normally an unnoticed reflow became 漫家居 visibly
  // jumping from small to large as the webfont arrived. Everything else on the
  // page is at its own size and swaps without drawing attention, so only this
  // one strip holds back; it is decoration and `aria-hidden`, so nothing is
  // kept from a reader by waiting.
  // Continuous motion — a marquee that never stops, pieces that float, a cue
  // that bobs — is the case the preference is written for. Asked for less, the
  // hero holds still: everything is where it settles, and nothing repeats.
  const stillness = usePrefersReducedMotion();
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setFontsReady(true);
    };
    if (document.fonts) document.fonts.ready.then(reveal).catch(reveal);
    else reveal();
    return () => {
      cancelled = true;
    };
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-warmwhite"
    >
      {/* The strip itself takes no pointer events — it spans the hero and would
          otherwise swallow everything — but the text does, so the cursor can
          drag the letters. Both repeats share one `MeshText`, not one each:
          two separate instances handed the shared canvas back and forth the
          moment the cursor crossed from the tail of one repeat into the head
          of the next, and that handoff reset the mesh's displacement to zero
          mid-drag — the effect visibly restarting at the seam. One host means
          that seam is just interior whitespace, not a hover boundary.
          `layer={5}` keeps its canvas above the ghost text it replaces and
          below the floating pieces at z-10. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-0 flex select-none items-center overflow-hidden transition-opacity duration-500 ${
          fontsReady ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* `w-max` is what makes the loop seamless. Without it the strip is a
            block-level flex box filling the hero's width — 1440px — while one
            repeat of the wordmark is 1875px, so -50% moved it 720px and then
            snapped back over a thousand pixels. Sized to its content, -50% is
            exactly one repeat and the second copy lands where the first was.
            `scale-y-*` stretches the row to the section's full height without
            touching character width — Tailwind writes it to the CSS `scale`
            property in this version, so it composes cleanly alongside the
            `x` scroll below, which framer-motion drives through `transform`.
            `scale-x-[1.1]` widens the now-gapless string 10% past its own
            natural (unscaled) width, on top of the `font-[840]` weight —
            deliberately not the same "hold the width" treatment `font-bold`
            got a moment ago; this pass leans further into the abstraction
            instead. Duration is 34s × 1.25 — 20% slower is 20% more time
            to cover the same distance, not 20% off the number. */}
        <motion.div
          className="flex w-max scale-x-[1.1] scale-y-[16] whitespace-nowrap font-sans text-[15vw] font-[840] leading-none text-charcoal/[0.06] md:scale-y-[7] md:text-[13vw] lg:scale-y-[6]"
          animate={stillness ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 42.5, repeat: Infinity, ease: "linear" }}
        >
          <MeshText layer={5} className="pointer-events-auto flex shrink-0">
            {[0, 1].map((row) => (
              <span key={row} className="flex items-center">
                {/* `scale-x-125` paints this span 25% wider than its own layout
                    box — CSS `scale` doesn't reserve extra room for the
                    overflow the way layout-affecting properties would. With
                    zero gap elsewhere, that overflow drew the Latin run straight
                    through the characters on both sides (居/M within a
                    repeat, N/漫 across the seam). `mx-[0.65em]` is the
                    measured amount of self-overlap this exact scale creates
                    on each edge — closes it to ~0px without reopening a
                    visible gap. */}
                {/* The scale and offset here are not taste calls. Chinese
                    ideographs fill far more of the em than Latin capitals do —
                    measured in these two faces, 漫家居 inks 0.978em where MAAN
                    inks 0.725em, so the Latin sits a quarter short. Stretched
                    sixteen times over, that reads as the two scripts having
                    nothing to do with each other.

                    Both numbers were solved against rendered pixels rather
                    than font metrics, and they have to be solved together: a
                    scale alone cannot land it, because the transform grows the
                    box about its centre while the mismatch is measured from
                    the baseline, so matching the heights leaves the run
                    sitting low. At these two values the two ink boxes land on
                    the same pixel, top and bottom, at 400px type. Re-derive
                    them the same way if either the name or the face changes —
                    they are specific to 漫家居 in Noto Sans TC against MAAN in
                    Inter, and the first brand's pair wanted different numbers.

                    The margin is the third measured value and belongs to the
                    string, not to the type: `scale-x-125` paints the run 25%
                    wider than its own layout box without reserving the room,
                    so each edge overflows by an eighth of the box — 0.39em for
                    a wordmark this wide. Without it the Latin was drawn
                    straight through the characters on both sides.

                    Round letters — drawn to overshoot the baseline so they
                    read as the same size as flat ones — would need that
                    overshoot taken back out at this stretch, which is what
                    `brand.wordmarkRuns` marks. MAAN has no curve in it, so
                    there is one run here and nothing to correct. */}
                {brand.zh}
                <span className="mx-[0.39em] inline-block -translate-y-[0.0135em] scale-x-125 scale-y-[1.354] tracking-[-0.05em]">
                  {brand.wordmarkRuns.map((run) =>
                    run.round ? (
                      <span key={run.text} className="inline-block origin-top scale-y-[0.992]">
                        {run.text}
                      </span>
                    ) : (
                      run.text
                    )
                  )}
                </span>
              </span>
            ))}
          </MeshText>
        </motion.div>
      </div>

      {editMode ? (
        <StickerEditor
          containerRef={sectionRef}
          items={[
            ...STICKERS.map((s) => ({
              id: s.src,
              src: s.src,
              alt: s.alt,
              fit: s.fit,
              rotate: s.rotate,
              flipX: s.flipX,
              flipY: s.flipY,
              defaultClassName: s.className,
            })),
            ...CUTOUT_STICKERS.map((s) => ({
              id: s.src,
              src: s.src,
              alt: s.alt,
              fit: "contain" as "cover" | "contain",
              rotate: s.rotate,
              flipX: s.flipX,
              flipY: s.flipY,
              defaultClassName: s.className,
            })),
          ]}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 z-10">
          {STICKERS.map((sticker, i) => (
            <FloatingSticker
              key={sticker.src}
              sticker={sticker}
              springX={springX}
              springY={springY}
              index={i}
              stillness={stillness}
            />
          ))}
          {CUTOUT_STICKERS.map((doodle, i) => (
            <CutoutSticker
              key={doodle.src}
              doodle={doodle}
              springX={springX}
              springY={springY}
              index={i}
              stillness={stillness}
            />
          ))}
        </div>
      )}

      {/* This block spans the whole hero and sits above the marquee, so left
          solid it swallowed every pointer that was aimed at the strip behind
          it. It lets them through now; the headline and the button take theirs
          back individually. */}
      <div className="container-fluid pointer-events-none relative z-20 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* No entrance on the headline. It used to fade up over 1.1s after a
            0.5s wait, which nobody ever saw — the loader is over the page for
            longer than that on every arrival — while its zero opacity was in
            the served HTML, so the largest thing on the site's first screen
            was not counted as painted until the script that fades it had run.
            That was the page's largest paint at four seconds. */}
        <h1 className="pointer-events-auto max-w-4xl font-sans text-5xl font-bold leading-[1.15] text-charcoal text-balance sm:text-6xl md:text-7xl lg:text-8xl">
          {t("tagline")}
        </h1>
        <motion.div
          initial={stillness ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.05, ease: EASE }}
          className="pointer-events-auto mt-10"
        >
          <Link
            href="/explore"
            className="group inline-flex items-center gap-2 rounded-full bg-charcoal px-9 py-3.5 text-xs font-medium tracking-[0.15em] text-warmwhite transition-transform hover:scale-[1.03]"
          >
            {t("ctaExplore")}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>

      <motion.a
        href="#collection-preview"
        initial={stillness ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-6 right-6 z-20 flex flex-col items-center gap-2 text-muted-foreground md:bottom-8 md:right-10"
      >
        <span className="text-[0.65rem] uppercase tracking-[0.3em]">({t("scrollHint")})</span>
        <motion.div
          animate={stillness ? undefined : { y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.a>
    </section>
  );
}
