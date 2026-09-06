import productsJson from "@/lib/data/products.json";
import journalJson from "@/lib/data/journal.json";
import projectsJson from "@/lib/data/projects.json";
import materialsJson from "@/lib/data/materials.json";
import stockGalleryJson from "@/lib/data/stock-gallery.json";
import type {
  Product,
  ProductRaw,
  LocalizedText,
  LocalizedTextArray,
} from "@/types/product";
import type {
  JournalPost,
  JournalPostRaw,
  Project,
  ProjectRaw,
  MaterialShowcaseItem,
  MaterialShowcaseItemRaw,
} from "@/types/content";
import type { AppLocale } from "@/i18n/routing";

// Each data file wraps its array in a named key. A bare top-level array cannot
// be described by a CMS file collection, which expects named fields — see
// public/admin/config.yml.
const productsRaw = productsJson.products as unknown as ProductRaw[];
const journalRaw = journalJson.posts as unknown as JournalPostRaw[];
const projectsRaw = projectsJson.projects as unknown as ProjectRaw[];
const materialsRaw = materialsJson.materials as unknown as MaterialShowcaseItemRaw[];

export const stockGallery = stockGalleryJson.images as { id: string; image: string }[];

function pick(text: LocalizedText, locale: AppLocale): string {
  return text[locale];
}
function pickArray(text: LocalizedTextArray, locale: AppLocale): string[] {
  return text[locale];
}
function otherLocale(locale: AppLocale): AppLocale {
  return locale === "zh" ? "en" : "zh";
}

function localizeProduct(raw: ProductRaw, locale: AppLocale): Product {
  return {
    id: raw.id,
    slug: raw.slug,
    name: pick(raw.name, locale),
    nameAlt: pick(raw.name, otherLocale(locale)),
    category: pick(raw.category, locale),
    categoryKey: raw.categoryKey,
    designer: {
      name: raw.designer.name,
      bio: pick(raw.designer.bio, locale),
    },
    shortDescription: pick(raw.shortDescription, locale),
    description: pickArray(raw.description, locale),
    price: raw.price,
    currency: raw.currency,
    heroImage: raw.heroImage,
    gallery: raw.gallery,
    variants: {
      colours: raw.variants.colours.map((c) => ({ ...c, name: pick(c.name, locale) })),
      fabrics: raw.variants.fabrics?.map((f) => ({
        ...f,
        name: pick(f.name, locale),
        category: pick(f.category, locale),
      })),
      woodFinishes: raw.variants.woodFinishes?.map((w) => ({ ...w, name: pick(w.name, locale) })),
      sizes: raw.variants.sizes?.map((s) => ({ ...s, label: pick(s.label, locale) })),
      legFinishes: raw.variants.legFinishes?.map((l) => ({ ...l, name: pick(l.name, locale) })),
    },
    dimensions: raw.dimensions.map((d) => ({ label: pick(d.label, locale), value: d.value })),
    materials: raw.materials.map((m) => ({
      title: pick(m.title, locale),
      description: pick(m.description, locale),
    })),
    downloads: raw.downloads.map((d) => ({ ...d, label: pick(d.label, locale) })),
    relatedProductIds: raw.relatedProductIds,
    tags: raw.tags,
    isNew: raw.isNew,
  };
}

function localizeJournalPost(raw: JournalPostRaw, locale: AppLocale): JournalPost {
  return {
    id: raw.id,
    slug: raw.slug,
    title: pick(raw.title, locale),
    excerpt: pick(raw.excerpt, locale),
    content: pickArray(raw.content, locale),
    category: pick(raw.category, locale),
    coverImage: raw.coverImage,
    date: raw.date,
    readTime: pick(raw.readTime, locale),
    author: pick(raw.author, locale),
  };
}

function localizeProject(raw: ProjectRaw, locale: AppLocale): Project {
  return {
    id: raw.id,
    slug: raw.slug,
    title: pick(raw.title, locale),
    location: pick(raw.location, locale),
    category: pick(raw.category, locale),
    year: raw.year,
    coverImage: raw.coverImage,
    gallery: raw.gallery,
    description: pick(raw.description, locale),
  };
}

function localizeMaterial(raw: MaterialShowcaseItemRaw, locale: AppLocale): MaterialShowcaseItem {
  return {
    id: raw.id,
    title: pick(raw.title, locale),
    subtitle: pick(raw.subtitle, locale),
    image: raw.image,
  };
}

export function getProducts(locale: AppLocale): Product[] {
  return productsRaw.map((p) => localizeProduct(p, locale));
}

export function getProductBySlug(locale: AppLocale, slug: string): Product | undefined {
  const raw = productsRaw.find((p) => p.slug === slug);
  return raw ? localizeProduct(raw, locale) : undefined;
}

export function getRelatedProducts(locale: AppLocale, product: Product): Product[] {
  return product.relatedProductIds
    .map((id) => productsRaw.find((p) => p.id === id))
    .filter((p): p is ProductRaw => Boolean(p))
    .map((p) => localizeProduct(p, locale));
}

export function getJournalPosts(locale: AppLocale): JournalPost[] {
  return journalRaw.map((p) => localizeJournalPost(p, locale));
}

export function getJournalPostBySlug(locale: AppLocale, slug: string): JournalPost | undefined {
  const raw = journalRaw.find((p) => p.slug === slug);
  return raw ? localizeJournalPost(raw, locale) : undefined;
}

export function getProjects(locale: AppLocale): Project[] {
  return projectsRaw.map((p) => localizeProject(p, locale));
}

export function getProjectBySlug(locale: AppLocale, slug: string): Project | undefined {
  const raw = projectsRaw.find((p) => p.slug === slug);
  return raw ? localizeProject(raw, locale) : undefined;
}

export function getMaterialsShowcase(locale: AppLocale): MaterialShowcaseItem[] {
  return materialsRaw.map((m) => localizeMaterial(m, locale));
}

// slugs are locale-independent, so these can run without a locale
export function getAllProductSlugs(): string[] {
  return productsRaw.map((p) => p.slug);
}
/**
 * The categories, in the order the catalogue introduces them. Derived rather
 * than listed: a category exists because something is in it, and a hand-kept
 * list would outlive the last product it named.
 */
export function getAllCategoryKeys(): string[] {
  return Array.from(new Set(productsRaw.map((p) => p.categoryKey)));
}
export function getProductsByCategory(locale: AppLocale, category: string): Product[] {
  return productsRaw
    .filter((p) => p.categoryKey === category)
    .map((p) => localizeProduct(p, locale));
}
export function getAllJournalSlugs(): string[] {
  return journalRaw.map((p) => p.slug);
}
export function getAllProjectSlugs(): string[] {
  return projectsRaw.map((p) => p.slug);
}

/**
 * A price, or nothing at all.
 *
 * No product carries a figure yet. Where one is missing this used to stand in
 * a line telling the reader to ask — on every card, in the sticky bar, under
 * every heading — which filled the catalogue with an instruction nobody had
 * asked for and which the contact page already makes. The space is left empty
 * until there is a number to put in it; callers render nothing rather than an
 * empty line, so the layout closes up instead of holding a gap.
 */
export function formatPrice(
  price: number | undefined,
  currency: "TWD" | "USD" = "TWD",
  locale: AppLocale = "zh"
): string | null {
  if (!price) return null;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-Hant-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
