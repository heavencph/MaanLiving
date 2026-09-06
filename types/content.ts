import type { LocalizedText, LocalizedTextArray } from "./product";

export interface JournalPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  coverImage: string;
  date: string;
  readTime: string;
  author: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  location: string;
  category: string;
  year: string;
  coverImage: string;
  gallery: string[];
  description: string;
}

export interface MaterialShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface JournalPostRaw {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedTextArray;
  category: LocalizedText;
  coverImage: string;
  date: string;
  readTime: LocalizedText;
  author: LocalizedText;
}

export interface ProjectRaw {
  id: string;
  slug: string;
  title: LocalizedText;
  location: LocalizedText;
  category: LocalizedText;
  year: string;
  coverImage: string;
  gallery: string[];
  description: LocalizedText;
}

export interface MaterialShowcaseItemRaw {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  image: string;
}
