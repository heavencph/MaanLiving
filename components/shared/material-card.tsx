import Image from "next/image";

interface MaterialCardProps {
  title: string;
  subtitle: string;
  image: string;
}

export function MaterialCard({ title, subtitle, image }: MaterialCardProps) {
  return (
    <div className="group">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 45vw, 22vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <p className="mt-4 font-heading text-base text-foreground md:text-lg">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
