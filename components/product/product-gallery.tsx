"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Expand, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductGalleryImage } from "@/types/product";

interface ProductGalleryProps {
  images: ProductGalleryImage[];
  /** When set (e.g. from the colour configurator), this image is offered as the featured slide. */
  activeOverrideImage?: string;
  activeOverrideLabel?: string;
  productName: string;
}

export function ProductGallery({
  images,
  activeOverrideImage,
  activeOverrideLabel,
  productName,
}: ProductGalleryProps) {
  const t = useTranslations("product");
  const KIND_LABEL: Record<ProductGalleryImage["kind"], string> = {
    studio: t("galleryStudio"),
    insitu: t("galleryInsitu"),
  };
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // Whether the colour-configurator shot is currently featured. Re-engages
  // whenever a new colour is picked, but releases as soon as the shopper
  // manually browses the plain gallery so every thumbnail stays reachable.
  const [showOverride, setShowOverride] = useState(Boolean(activeOverrideImage));
  const [lastOverrideImage, setLastOverrideImage] = useState(activeOverrideImage);

  // re-engage the colour shot whenever a new colour is picked (render-time
  // state adjustment instead of an effect, per React's guidance)
  if (activeOverrideImage && activeOverrideImage !== lastOverrideImage) {
    setLastOverrideImage(activeOverrideImage);
    setShowOverride(true);
  }

  const isOverrideActive = showOverride && Boolean(activeOverrideImage);
  const activeImage = isOverrideActive ? undefined : images[index];
  const activeSrc = isOverrideActive ? activeOverrideImage! : (activeImage?.src ?? images[0]?.src);
  // The shot the page opened on. The viewer cross-fades between shots, which
  // for the first one means fading in from nothing — and that nothing is what
  // the server sends, so the largest image on the page was not counted as
  // painted until the script that fades it had run: 2.6s on a throttled phone
  // against 1.0s for the same photograph on the catalogue. There is nothing to
  // cross-fade from on the shot you arrive at, so it simply arrives.
  const [openedOn] = useState(activeSrc);
  // The colour shot earns a thumbnail of its own only when it is a photograph
  // the strip does not already hold. Every colour of a piece often points at
  // the same studio shot, and then the extra slot is the same picture twice —
  // so instead the strip highlights the one it already has.
  const overrideIndex = activeOverrideImage
    ? images.findIndex((img) => img.src === activeOverrideImage)
    : -1;
  const overrideIsExtra = Boolean(activeOverrideImage) && overrideIndex === -1;
  const thumbs = overrideIsExtra
    ? [{ src: activeOverrideImage!, kind: "studio" as const }, ...images]
    : images;
  const activeThumbIndex = isOverrideActive
    ? overrideIsExtra
      ? 0
      : overrideIndex
    : overrideIsExtra
      ? index + 1
      : index;

  // Escape gets out of the viewer, and the page underneath holds still while
  // it is open — on a phone the overlay is the whole screen, so a scroll that
  // reaches the page behind it moves something the reader cannot see.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  function goTo(i: number) {
    if (overrideIsExtra) {
      if (i <= 0) {
        setShowOverride(true);
        return;
      }
      setShowOverride(false);
      setIndex((i - 1 + images.length) % images.length);
    } else {
      setShowOverride(false);
      setIndex((i + images.length) % images.length);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse">
      {/* main viewer */}
      <div className="relative flex-1">
        <div
          className="group relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-muted md:aspect-[5/6]"
          onClick={() => setFullscreen(true)}
        >
          <motion.div
            key={activeSrc}
            initial={activeSrc === openedOn ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={activeSrc}
              alt={
                isOverrideActive && activeOverrideLabel
                  ? `${productName} — ${activeOverrideLabel}`
                  : productName
              }
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </motion.div>

          <button
            aria-label={t("fullscreenView")}
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(true);
            }}
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-warmwhite/85 text-charcoal opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
          >
            <Expand className="h-4 w-4" />
          </button>

          {isOverrideActive && activeOverrideLabel && (
            <motion.span
              key={activeOverrideLabel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-4 top-4 rounded-full bg-warmwhite/90 px-3 py-1 text-[0.7rem] font-medium tracking-wide text-charcoal"
            >
              {activeOverrideLabel}
            </motion.span>
          )}

          {!isOverrideActive && activeImage && (
            <span className="absolute right-4 top-4 rounded-full bg-charcoal/70 px-3 py-1 text-[0.7rem] font-medium tracking-wide text-warmwhite">
              {KIND_LABEL[activeImage.kind]}
            </span>
          )}
        </div>
      </div>

      {/* Thumbnails, unless there is only one shot — a filmstrip of one is a
          control that cannot do anything, and it reads as a piece missing
          rather than as a piece that does not exist. */}
      {thumbs.length > 1 && (
      <div className="no-scrollbar flex gap-3 overflow-x-auto lg:w-24 lg:flex-col lg:overflow-y-auto">
        {thumbs.map((img, i) => (
          <button
            key={img.src + i}
            onClick={() => goTo(i)}
            className={cn(
              "relative aspect-square w-16 shrink-0 overflow-hidden bg-muted transition-opacity lg:w-full",
              i === activeThumbIndex ? "opacity-100 ring-1 ring-foreground" : "opacity-60 hover:opacity-100"
            )}
          >
            <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      )}

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={productName}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-matte-black/95 p-4 md:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(false)}
          >
            {/* The controls are painted after the picture and so need saying so.
                Both are positioned with no z-index of their own, which makes
                document order decide, and the picture's box comes last — on a
                phone, where that box is the full width of the screen rather
                than the 4xl it is asked to stop at, it lay straight over the
                close button and the two arrows. Every tap on them landed on
                the picture instead, and the viewer could not be got out of. */}
            <button
              aria-label={t("close")}
              className="absolute right-6 top-6 z-10 p-2 text-warmwhite"
              onClick={() => setFullscreen(false)}
            >
              <X className="h-7 w-7" />
            </button>
            {!isOverrideActive && images.length > 1 && (
              <>
                <button
                  aria-label={t("previous")}
                  className="absolute left-4 z-10 p-2 text-warmwhite md:left-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((index - 1 + images.length) % images.length);
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  aria-label={t("next")}
                  className="absolute right-4 z-10 p-2 text-warmwhite md:right-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((index + 1) % images.length);
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            {/* No `stopPropagation` here. The box is the size of the screen
                while the photograph inside it is letterboxed, so holding the
                tap meant the dark margin around a picture — the obvious place
                to tap to get out — was the one place that did nothing. A tap
                anywhere closes it; the arrows stop their own. */}
            <motion.div
              className="relative h-full w-full max-w-4xl"
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
            >
              <Image
                src={activeSrc}
                alt={productName}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
