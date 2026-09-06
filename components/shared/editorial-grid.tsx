import Image from "next/image";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

interface EditorialGridItem {
  image: string;
  span?: "narrow" | "wide" | "tall";
  alt?: string;
}

/**
 * An asymmetric masonry-style grid used for editorial photography moments —
 * deliberately breaks the rigid card grid used for product listings.
 */
export function EditorialGrid({ items }: { items: EditorialGridItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 md:gap-6">
      {items.map((item, i) => (
        <Reveal
          key={i}
          delay={i * 0.08}
          className={cn(
            "relative overflow-hidden bg-muted",
            item.span === "wide" && "col-span-2 md:col-span-4",
            item.span === "tall" && "col-span-1 row-span-2 md:col-span-2",
            !item.span && "col-span-1 md:col-span-2"
          )}
        >
          <div
            className={cn(
              "relative w-full",
              item.span === "wide" ? "aspect-[16/9]" : item.span === "tall" ? "aspect-[3/4] h-full" : "aspect-square"
            )}
          >
            <Image
              src={item.image}
              alt={item.alt ?? ""}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
