import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Download, FileText, Box } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DimensionSpec, MaterialSpec, DownloadItem, Designer } from "@/types/product";

const DOWNLOAD_ICON = {
  PDF: FileText,
  CAD: Box,
  "3D": Box,
};

export function SpecAccordion({
  description,
  dimensions,
  materials,
  downloads,
  designer,
}: {
  description: string[];
  dimensions: DimensionSpec[];
  materials: MaterialSpec[];
  downloads: DownloadItem[];
  designer: Designer;
}) {
  const t = useTranslations("product");
  return (
    <Accordion type="multiple" defaultValue={["overview"]} className="w-full">
      <AccordionItem value="overview">
        <AccordionTrigger className="font-heading text-base">{t("specOverview")}</AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dimensions">
        <AccordionTrigger className="font-heading text-base">{t("specDimensions")}</AccordionTrigger>
        <AccordionContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {dimensions.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-muted-foreground">{d.label}</dt>
                <dd className="font-heading text-base text-foreground">{d.value}</dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="materials">
        <AccordionTrigger className="font-heading text-base">{t("specMaterials")}</AccordionTrigger>
        <AccordionContent className="space-y-4">
          {materials.map((m) => (
            <div key={m.title}>
              <p className="text-sm font-medium text-foreground">{m.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="designer">
        <AccordionTrigger className="font-heading text-base">{t("specDesigner")}</AccordionTrigger>
        <AccordionContent>
          {/* No avatar: there is no photograph of the designer, and a piece of
              furniture cropped into a portrait circle reads as a mistake. */}
          <div>
            <p className="text-sm font-medium text-foreground">{designer.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{designer.bio}</p>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="downloads">
        <AccordionTrigger className="font-heading text-base">{t("specDownloads")}</AccordionTrigger>
        <AccordionContent className="space-y-2">
          {downloads.map((d) => {
            const Icon = DOWNLOAD_ICON[d.type];
            return (
              <a
                key={d.label}
                href={d.href}
                className="flex items-center justify-between border-b border-border py-3 text-sm text-foreground/90 transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {d.label}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {d.size}
                  <Download className="h-3.5 w-3.5" />
                </span>
              </a>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
