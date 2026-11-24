// Mirrors backend/app/schemas/admin.py
import type { LocationRef, Media, Ref } from "./types";

export const STATUSES = ["draft", "available", "reserved", "rented"] as const;
export type PropertyStatus = (typeof STATUSES)[number];

export const ENQUIRY_STATUSES = ["new", "contacted", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "agent";
  is_active: boolean;
};

export type PropertyInput = {
  code: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  type_id: number;
  location_id: number;
  status: PropertyStatus;
  rent_qar: number | null;
  rooms: number | null;
  capacity_persons: number | null;
  area_sqm: number | null;
  floors: number | null;
  amenities: string[];
  lat: number | null;
  lng: number | null;
  national_address: string;
  featured: boolean;
};

export type PropertyFull = PropertyInput & {
  id: number;
  published_at: string | null;
  updated_at: string;
  media: Media[];
};

export type PropertyRow = {
  id: number;
  code: string;
  title_en: string;
  type: Ref;
  location: LocationRef;
  status: PropertyStatus;
  rent_qar: number | null;
  featured: boolean;
  cover_url: string | null;
  photo_count: number;
  enquiry_count: number;
};

export type Paged<T> = { items: T[]; total: number; page: number; pages: number };

export type LocationInput = {
  slug: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
  description_en: string;
  description_ar: string;
  sort_order: number;
  is_active: boolean;
};
export type LocationFull = LocationInput & { id: number; property_count: number };

export type TypeFull = Ref & { id: number };

export type EnquiryRow = {
  id: number;
  created_at: string;
  name: string;
  company: string;
  phone: string;
  email: string | null;
  looking_for: string | null;
  area: string;
  space_needed: string;
  message: string;
  reply_on_whatsapp: boolean;
  status: EnquiryStatus;
  property_id: number | null;
  property_code: string | null;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
};

export type SocialNetwork = "facebook" | "instagram";
export type SocialPost = {
  id: number;
  network: SocialNetwork;
  created_at: string;
  user_name: string | null;
};
export type SocialState = {
  networks: SocialNetwork[];
  online: boolean;
  site_url: string;
  posts: SocialPost[];
};

export type Stats = {
  total: number;
  available: number;
  new_enquiries_7_days: number;
  open_enquiries: number;
};
