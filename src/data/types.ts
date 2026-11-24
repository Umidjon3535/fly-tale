export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];

/** Uch tilli matn */
export type L10n = Record<Lang, string>;

export type Category = 'historic' | 'museum' | 'religious' | 'nature' | 'modern' | 'city';
export const CATEGORIES: Category[] = ['historic', 'museum', 'religious', 'nature', 'modern', 'city'];

export type Continent = 'asia' | 'europe' | 'africa' | 'north-america' | 'south-america' | 'oceania';
export const CONTINENTS: Continent[] = ['asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania'];

export interface Place {
  id: string;
  name: L10n;
  /** ISO 3166-1 alpha-2 kodi, masalan "UZ". Nomi Intl.DisplayNames orqali tarjima qilinadi. */
  country: string;
  city: L10n;
  lat: number;
  lng: number;
  category: Category;
  /** Qurilgan davri yoki yili (matn ko'rinishida) */
  era: L10n;
  unesco: boolean;
  short: L10n;
  history: L10n;
  facts: L10n[];
  /** null = aniq ma'lumot yo'q, interfeysda "Tekshirish kerak" ko'rsatiladi */
  hours: L10n | null;
  price: L10n | null;
  bestSeason: L10n | null;
  /** Eng yaqin xalqaro aeroport IATA kodi (sayohat rejasi va aviachipta qidiruvi uchun) */
  airport: string;
  /** Wikimedia Commons'da rasm qidirish uchun so'rov (inglizcha) */
  wikimediaQuery: string;
  tags: string[];
}

export interface WikiImage {
  title: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null;
  description: string;
}

// ---------- Sayohat ma'lumotlari (travel.json, partners.json) ----------

/** O'zbekiston fuqarolari uchun viza holati */
export type VisaStatus = 'domestic' | 'free' | 'evisa' | 'required' | 'check';

export interface CountryTravel {
  visa: VisaStatus;
  visaType?: 'schengen';
  visaUrl?: string;
  /** 1 — arzon, 4 — qimmat (taxminiy kunlik xarajat darajasi) */
  costLevel: 1 | 2 | 3 | 4;
}

export type TravelStyle = 'budget' | 'standard' | 'comfort';

export interface Origin {
  airport: string;
  lat: number;
  lng: number;
  name: L10n;
}

export interface TravelData {
  lastReviewed: string;
  currency: string;
  usdToUzs: number | null;
  origins: Origin[];
  costModel: {
    dailyByLevel: Record<string, Record<TravelStyle, number>>;
    flight: { base: number; perKm: number; low: number; high: number };
    ground: { base: number; perKm: number; low: number; high: number };
    groundMaxKm: number;
    contingency: number;
  };
  countries: Record<string, CountryTravel>;
}

export type PartnerService = 'visa' | 'tour' | 'flight' | 'hotel' | 'guide' | 'transfer';

/** Hamkor turoperator / agentlik. countries: [*] — barcha mamlakatlar */
export interface Partner {
  id: string;
  name: string;
  countries: string[];
  services: PartnerService[];
  description?: L10n;
  phone?: string;
  telegram?: string;
  website?: string;
  /** Loyiha tomonidan tekshirilgan hamkor */
  verified: boolean;
}
