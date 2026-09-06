export interface LocalizedText {
  zh: string;
  en: string;
}

export interface LocalizedTextArray {
  zh: string[];
  en: string[];
}

export interface ColourOption {
  id: string;
  name: string;
  hex: string;
  /** Large hero image shown when this colour is selected */
  image: string;
  /** Small thumbnail used in the gallery filmstrip */
  thumbnail: string;
}

export interface FabricOption {
  id: string;
  name: string;
  category: string;
  hex: string;
  image: string;
}

export interface WoodFinish {
  id: string;
  name: string;
  hex: string;
  image: string;
}

export interface SizeOption {
  id: string;
  label: string;
  dimensions: string;
  priceModifier?: number;
}

export interface LegFinish {
  id: string;
  name: string;
  hex: string;
}

export interface ProductVariants {
  colours: ColourOption[];
  fabrics?: FabricOption[];
  woodFinishes?: WoodFinish[];
  sizes?: SizeOption[];
  legFinishes?: LegFinish[];
}

export interface DimensionSpec {
  label: string;
  value: string;
}

export interface MaterialSpec {
  title: string;
  description: string;
  icon?: string;
}

export interface DownloadItem {
  label: string;
  type: "PDF" | "CAD" | "3D";
  size: string;
  href: string;
}

export interface Designer {
  name: string;
  bio: string;
}

export interface ProductGalleryImage {
  src: string;
  /** "studio" = white/neutral-background product detail shot, "insitu" = real-space lifestyle photo */
  kind: "studio" | "insitu";
}

/** Localized, flat-string product shape consumed by every UI component. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  /** The same product's name in the other locale, shown as a subtitle. */
  nameAlt: string;
  category: string;
  categoryKey: string;
  designer: Designer;
  shortDescription: string;
  description: string[];
  price?: number;
  currency?: "TWD" | "USD";
  heroImage: string;
  gallery: ProductGalleryImage[];
  variants: ProductVariants;
  dimensions: DimensionSpec[];
  materials: MaterialSpec[];
  downloads: DownloadItem[];
  relatedProductIds: string[];
  tags: string[];
  isNew?: boolean;
}

// ---- Raw (bilingual) shapes — mirror the above but with translatable
// fields as LocalizedText/LocalizedTextArray. This is the shape stored in
// lib/data/products.json; lib/data.ts resolves it into a `Product` for a
// given locale so components never need to know about bilingual data.

export interface ColourOptionRaw {
  id: string;
  name: LocalizedText;
  hex: string;
  image: string;
  thumbnail: string;
}

export interface FabricOptionRaw {
  id: string;
  name: LocalizedText;
  category: LocalizedText;
  hex: string;
  image: string;
}

export interface WoodFinishRaw {
  id: string;
  name: LocalizedText;
  hex: string;
  image: string;
}

export interface SizeOptionRaw {
  id: string;
  label: LocalizedText;
  dimensions: string;
  priceModifier?: number;
}

export interface LegFinishRaw {
  id: string;
  name: LocalizedText;
  hex: string;
}

export interface ProductVariantsRaw {
  colours: ColourOptionRaw[];
  fabrics?: FabricOptionRaw[];
  woodFinishes?: WoodFinishRaw[];
  sizes?: SizeOptionRaw[];
  legFinishes?: LegFinishRaw[];
}

export interface DimensionSpecRaw {
  label: LocalizedText;
  value: string;
}

export interface MaterialSpecRaw {
  title: LocalizedText;
  description: LocalizedText;
  icon?: string;
}

export interface DownloadItemRaw {
  label: LocalizedText;
  type: "PDF" | "CAD" | "3D";
  size: string;
  href: string;
}

export interface DesignerRaw {
  name: string;
  bio: LocalizedText;
}

export interface ProductRaw {
  id: string;
  slug: string;
  name: LocalizedText;
  category: LocalizedText;
  categoryKey: string;
  designer: DesignerRaw;
  shortDescription: LocalizedText;
  description: LocalizedTextArray;
  price?: number;
  currency?: "TWD" | "USD";
  heroImage: string;
  gallery: ProductGalleryImage[];
  variants: ProductVariantsRaw;
  dimensions: DimensionSpecRaw[];
  materials: MaterialSpecRaw[];
  downloads: DownloadItemRaw[];
  relatedProductIds: string[];
  tags: string[];
  isNew?: boolean;
}
