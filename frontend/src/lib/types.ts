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
export type MenuItem = {
  key: "properties" | "locations" | "services" | "how" | "contact";
  label_en: string;
  label_ar: string;
  show: boolean;
};

export type HomeTextKey =
  | "badge"
  | "start"
  | "end"
  | "intro"
  | "chip_label"
  | "chip_text"
  | `${"categories" | "featured" | "map" | "how" | "soon"}_${"eyebrow" | "title"}`
  | `step${1 | 2 | 3}_${"title" | "text"}`
  | "soon_text"
  | "soon_button";

export type HomeSwitch =
  `show_${"search" | "whatsapp" | "scene" | "property" | "ticker" | "categories" | "featured" | "map" | "how" | "soon"}`;

export type HomeContent = Record<`${HomeTextKey}_${"en" | "ar"}`, string> &
  Record<HomeSwitch, boolean> & {
    words_en: string[];
    words_ar: string[];
    image_opacity: number;
    menu: MenuItem[];
  };
/** What the office saved. Empty = the standard text. */
export type SavedHome = { [K in keyof HomeContent]: HomeContent[K] | null };
export type HeroImage = { id: number; url: string };
export type HomeOut = { content: SavedHome | null; images: HeroImage[] };

export type ChatAnswer = {
  question_en: string;
  question_ar: string;
  answer_en: string;
  answer_ar: string;
  keywords: string;
};
export type ChatContent = {
  enabled: boolean;
  welcome_en: string;
  welcome_ar: string;
  answers: ChatAnswer[];
};
