import type { Place } from './types';

/**
 * Ma'lumot manbai abstraksiyasi.
 * Hozir statik places.json ishlatiladi. Keyinchalik bazaga (REST/GraphQL/Supabase va h.k.)
 * o'tish uchun faqat yangi PlacesSource yozib, `placesSource` ni almashtirish kifoya —
 * komponentlar faqat `loadPlaces()` bilan ishlaydi.
 */
export interface PlacesSource {
  getAll(): Promise<Place[]>;
}

export const jsonSource: PlacesSource = {
  async getAll() {
    // Dinamik import — JSON alohida bo'lak (chunk) bo'lib yuklanadi
    const mod = await import('./places.json');
    return mod.default as Place[];
  },
};

/** Misol: kelajakdagi API manbai. VITE_PLACES_API_URL berilsa, avtomatik ishlatiladi. */
export function httpSource(url: string): PlacesSource {
  return {
    async getAll() {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Places API xatosi: ${res.status}`);
      return (await res.json()) as Place[];
    },
  };
}

const apiUrl = import.meta.env.VITE_PLACES_API_URL as string | undefined;
export const placesSource: PlacesSource = apiUrl ? httpSource(apiUrl) : jsonSource;

let cache: Promise<Place[]> | null = null;
export function loadPlaces(): Promise<Place[]> {
  if (!cache) cache = placesSource.getAll().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}
