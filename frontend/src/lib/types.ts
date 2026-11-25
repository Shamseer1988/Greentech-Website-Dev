// Mirrors backend/app/schemas/public.py
export type Ref = { slug: string; name_en: string; name_ar: string };
export type LocationRef = Ref & { lat: number; lng: number };

export type CategoryRef = Ref & { icon: string };

export type PropertyTypeOut = CategoryRef & {
  text_en: string;
  text_ar: string;
  image_url: string | null;
  image_opacity: number;
  coming_soon: boolean;
  property_count: number;
};

export type LocationOut = LocationRef & {
  description_en: string;
  description_ar: string;
  property_count: number;
};

export type Media = {
  id: number;
  url: string;
  kind: "image" | "video" | "360";
  width: number | null;
  height: number | null;
  sort_order: number;
  is_cover: boolean;
};

export type PropertyCard = {
  code: string;
  title_en: string;
  title_ar: string;
  type: CategoryRef;
  location: LocationRef;
  status: "available" | "reserved" | "rented";
  rent_qar: number | null;
  rooms: number | null;
  capacity_persons: number | null;
  area_sqm: number | null;
  floors: number | null;
  amenities: string[];
  lat: number | null;
  lng: number | null;
  featured: boolean;
  published_at: string;
  cover_url: string | null;
  photo_count: number;
};

export type PropertyDetail = PropertyCard & {
  description_en: string;
  description_ar: string;
  national_address: string;
  media: Media[];
};

export type PropertyPage = {
  items: PropertyCard[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

// Mirrors backend/app/schemas/site.py
export type HomeContent = {
  badge_en: string;
  badge_ar: string;
  start_en: string;
  start_ar: string;
  words_en: string[];
  words_ar: string[];
  end_en: string;
  end_ar: string;
  intro_en: string;
  intro_ar: string;
  chip_label_en: string;
  chip_label_ar: string;
  chip_text_en: string;
  chip_text_ar: string;
  categories_eyebrow_en: string;
  categories_eyebrow_ar: string;
  categories_title_en: string;
  categories_title_ar: string;
  image_opacity: number;
  show_search: boolean;
  show_whatsapp: boolean;
  show_scene: boolean;
  show_property: boolean;
};
export type HeroImage = { id: number; url: string };
export type HomeOut = { content: HomeContent | null; images: HeroImage[] };
