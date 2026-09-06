"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Whether the reader has asked for less motion.
 *
 * framer-motion has a hook for this and it is not usable during render: it
 * reports false on the first client render and only corrects itself when the
 * preference *changes*, which for anyone who set it before opening the page is
 * never. A component that decides what to render from that value therefore
 * decides wrong, permanently — on this site that left the scroll reveals
 * mounted at zero opacity with the animation skipped, so journal cards and the
 * about page's photographs were invisible to reduced-motion readers and stayed
 * invisible when scrolled to.
 *
 * `useSyncExternalStore` is the shape React provides for exactly this: the
 * server snapshot is used for the markup, the client's real value is read
 * during hydration, and the subscription keeps it current afterwards.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // No preference is knowable on the server, so the markup assumes motion
    // and the first client render corrects it.
    () => false
  );
}
