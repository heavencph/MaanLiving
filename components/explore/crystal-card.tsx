"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  easeInOut,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

// three.js is client-only, and only ships for cards that carry a model
const ProductModel = dynamic(() => import("./product-model").then((m) => m.ProductModel), {
  ssr: false,
});

// the scroll range over which the piece sits at full opacity
const VISIBLE_FROM = 0.16;
const VISIBLE_TO = 0.84;

// scroll drives a spring rather than the transform directly, so a single notch
// of the wheel glides the piece to its new angle and settles instead of
// snapping. Overdamped on purpose: it should come to rest, never wobble.
const GLIDE = { stiffness: 48, damping: 20, mass: 1, restDelta: 0.0005 };

// framer-motion has no exported linear easing, and the held segment needs one
const hold = (t: number) => t;

interface CrystalCardProps {
  code: string;
  name: string;
  image: string;
  model?: string;
}

export function CrystalCard({ code, name, image, model }: CrystalCardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  /**
   * When this piece's geometry is allowed to load.
   *
   * A model is most of a megabyte and a three.js scene to build, and both
   * cards were doing it the moment the page opened — two blocking stretches of
   * two and a half seconds each, five seconds of a locked main thread before
   * anything on this page could be touched. It also starved the loader that
   * was covering it: the curtain animation was getting twenty frames.
   *
   * So a card waits for two things. Its own: it is near enough to the viewport
   * to be worth building, which the second card is not on arrival. And the
   * page's: the browser has finished the work it already had, which on this
   * page includes the loader's own animation. The cut-out stands in until
   * then, which is what it was drawn for.
   */
  const near = useInView(sectionRef, { once: true, margin: "60% 0px 60% 0px" });
  // Whether the piece is actually on screen, which is the only time it has any
  // reason to be drawing frames. Live, unlike `near` — it comes back.
  const onScreen = useInView(sectionRef);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let id = 0;
    let timer = 0;
    const settle = () => {
      // Idle if the browser will tell us, and shortly regardless if not.
      if (window.requestIdleCallback) id = window.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      else timer = window.setTimeout(() => setIdle(true), 400);
    };
    // Waiting for load, not just for idle: a model fetched before the page has
    // finished loading is part of what the page is waiting on, and the loader
    // over it holds until that finishes. Starting after means the curtain
    // lifts on the page rather than on the geometry.
    if (document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    return () => {
      window.removeEventListener("load", settle);
      if (id) window.cancelIdleCallback?.(id);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // reduced motion asks for no physics, so fall back to tracking scroll exactly
  const prefersReducedMotion = useReducedMotion();
  const glided = useSpring(scrollYProgress, GLIDE);
  const progress = prefersReducedMotion ? scrollYProgress : glided;

  // scale the turn so that exactly a half circle falls inside the window where
  // the piece is fully opaque; it keeps turning through the fades rather than
  // freezing, so the motion never visibly starts or stops.
  // All three read the same progress, or the fades would drift out of step with
  // the rotation and the half turn would no longer land inside the visible window.
  const SWEEP = 180 / (VISIBLE_TO - VISIBLE_FROM);
  const rotateFrom = -90 - VISIBLE_FROM * SWEEP;

  const rotateY = useTransform(progress, [0, 1], [rotateFrom, rotateFrom + SWEEP]);

  // easing the fade segments rounds off the corners at the breakpoints, so the
  // piece eases into and out of view instead of ramping at a constant rate.
  // The breakpoints themselves do not move, so the half turn stays put.
  const opacity = useTransform(progress, [0, VISIBLE_FROM, VISIBLE_TO, 1], [0, 1, 1, 0], {
    ease: [easeInOut, hold, easeInOut],
  });
  const hudOpacity = useTransform(progress, [VISIBLE_FROM, 0.3, 0.7, VISIBLE_TO], [0, 1, 1, 0], {
    ease: [easeInOut, hold, easeInOut],
  });

  return (
    <section ref={sectionRef} className="relative min-h-[304vh]">
      {/* the piece carries the section on its own, so the name stays for
          assistive tech and search rather than as visible layout */}
      <h2 className="sr-only">{name}</h2>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          style={{ opacity }}
          className="relative aspect-square w-full max-w-[499px] md:max-w-[582px]"
        >
          <div
            aria-hidden
            className="absolute inset-[-20%] -z-20"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              color: "var(--stone)",
              maskImage: "radial-gradient(closest-side, black, transparent)",
              WebkitMaskImage: "radial-gradient(closest-side, black, transparent)",
            }}
          />
          <div aria-hidden className="absolute inset-[14%] -z-10 rounded-full bg-sand/40 blur-3xl" />

          {model && near && idle ? (
            // real geometry: the turn and the float happen inside the scene
            <div className="h-full w-full">
              <ProductModel rotationY={rotateY} src={model} active={onScreen} />
            </div>
          ) : (
            <div className="h-full w-full [perspective:1200px]">
              <motion.div
                className="h-full w-full"
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div style={{ rotateY }} className="relative h-full w-full">
                  <Image
                    src={image}
                    alt={name}
                    fill
                    sizes="(max-width: 1024px) 90vw, 582px"
                    className="object-contain drop-shadow-[0_35px_50px_rgba(52,38,20,0.28)]"
                  />
                </motion.div>
              </motion.div>
            </div>
          )}

          <motion.div aria-hidden style={{ opacity: hudOpacity }} className="pointer-events-none absolute inset-0">
            {/* Only the top-left bracket remains — the bottom-right one framed
                the fabricated coordinates line below and has nothing to point
                at now that it's gone. */}
            <svg className="absolute inset-0 h-full w-full text-walnut/45" viewBox="0 0 100 100" fill="none">
              <path d="M12 18 H40 L50 32" stroke="currentColor" strokeWidth="0.4" />
            </svg>
            <p className="absolute left-0 top-[8%] font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground">
              <span className="block text-terracotta">{code}</span>
              {name}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
