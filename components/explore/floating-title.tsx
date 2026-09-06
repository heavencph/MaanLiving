"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

// how far the title trails the cursor at the edges of the window, in pixels
const DRIFT_X = 96;
const DRIFT_Y = 48;
const TILT = 7.2; // degrees at full deflection

export function FloatingTitle({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  // the same spring the home hero drifts its collage on, so both pages move
  // with one hand rather than two
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const x = useTransform(springX, (v) => v * DRIFT_X);
  const y = useTransform(springY, (v) => v * DRIFT_Y);
  const rotate = useTransform(springX, (v) => v * TILT);

  // Drifting is a cursor affordance, and at this amplitude it would push the
  // title off the side of a narrow phone, so the listeners go on only where
  // there is a real pointer to follow. Nothing else needs to know: with no
  // listener the motion values simply stay at rest.
  useEffect(() => {
    if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    function track(e: PointerEvent) {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    }
    // the cursor left the window entirely, so ease back to centre
    function recentre() {
      mouseX.set(0);
      mouseY.set(0);
    }

    window.addEventListener("pointermove", track, { passive: true });
    document.documentElement.addEventListener("pointerleave", recentre);
    return () => {
      window.removeEventListener("pointermove", track);
      document.documentElement.removeEventListener("pointerleave", recentre);
    };
  }, [prefersReducedMotion, mouseX, mouseY]);

  return (
    // the padding is asymmetric on purpose: the top has to clear the fixed
    // header, the bottom only has to part the title from the first piece.
    // Clipped on one axis only -- hiding both would cut the drop shadow off
    // whenever the title drifts down, since the shadow reaches further below
    // the glyphs than the padding leaves room for.
    <section className="relative flex items-center justify-center overflow-x-clip px-6 pb-6 pt-32 md:pb-8 md:pt-36">
      {/* two layers on purpose: the outer one chases the cursor, the inner one
          keeps its own idle float. Driving both from a single element would
          put the parallax and the float on the same y, and the float would
          simply overwrite the parallax. */}
      <motion.div
        style={{ x, y, rotate }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <motion.h1
          animate={prefersReducedMotion ? undefined : { y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="font-sans text-4xl font-bold leading-[1.15] text-balance text-charcoal drop-shadow-[0_16px_24px_rgba(52,38,20,0.22)] md:text-5xl lg:text-6xl"
        >
          {children}
        </motion.h1>
      </motion.div>
    </section>
  );
}
