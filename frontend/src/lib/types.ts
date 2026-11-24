// Mirrors backend/app/schemas/public.py
export type Ref = { slug: string; name_en: string; name_ar: string };
export type LocationRef = Ref & { lat: number; lng: number };

export type PropertyTypeOut = Ref & { coming_soon: boolean; property_count: number };

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
  type: Ref;
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
