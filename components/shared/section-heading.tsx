import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { MeshText } from "@/components/motion/mesh-text";
import { LiquidText } from "@/components/motion/liquid-text";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  /**
   * Resolve out of a liquid blur instead of fading up. Opt-in, so the pages
   * still using the fade are left as they are.
   */
  liquid?: boolean;
  /**
   * `display` steps the title up a size for pages built as a single reading
   * column, where the heading carries a whole screen rather than topping a
   * grid of cards.
   */
  size?: "default" | "display";
  /**
   * Whether the heading fades up as it scrolls into view.
   *
   * Off at the top of a page, where there is nothing to scroll into: the fade
   * starts at zero opacity, and that zero is in the served HTML, so the first
   * thing a reader sees stays invisible until the JavaScript that animates it
   * has downloaded, parsed and run. On a mid-range phone that was the page's
   * headline held back past two seconds — and held back entirely for anyone
   * whose script never arrives.
   */
  entrance?: "fade" | "none";
  /**
   * `h1` when this heading is the page's subject rather than one section of
   * it. A page carries exactly one — it is what a search result is titled by
   * and what a screen reader announces the page as — and the pages whose
   * heading is this component had none at all.
   */
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  liquid = false,
  size = "default",
  entrance = "fade",
  as: Heading = "h2",
}: SectionHeadingProps) {
  const Wrapper = liquid ? LiquidText : entrance === "none" ? "div" : Reveal;

  return (
    <Wrapper className={cn(align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      )}
      <Heading
        className={cn(
          "font-heading font-light leading-tight text-balance text-foreground",
          // Stops at 48px rather than stepping up again at `lg`: past that the
          // English titles outrun the reading column and break to a third,
          // ragged line while the Chinese stays at two.
          size === "display"
            ? "text-4xl md:text-5xl"
            : "text-3xl md:text-4xl lg:text-5xl"
        )}
      >
        <MeshText>{title}</MeshText>
      </Heading>
      {description && (
        <p
          className={cn(
            "mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </Wrapper>
  );
}
