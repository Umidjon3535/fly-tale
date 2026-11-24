import type { Category, Continent, Lang, Place } from '../data/types';
import { COUNTRY_CONTINENT, countryName } from '../data/countries';

export interface FilterState {
  categories: Category[];
  country: string;
  continent: Continent | '';
  favoritesOnly: boolean;
  unescoOnly: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  country: '',
  continent: '',
  favoritesOnly: false,
  unescoOnly: false,
};

export function activeFilterCount(f: FilterState): number {
  return f.categories.length + (f.country ? 1 : 0) + (f.continent ? 1 : 0) + (f.favoritesOnly ? 1 : 0) + (f.unescoOnly ? 1 : 0);
}

export function applyFilters(places: Place[], f: FilterState, favorites: string[]): Place[] {
  return places.filter(
    (p) =>
      (f.categories.length === 0 || f.categories.includes(p.category)) &&
      (!f.country || p.country === f.country) &&
      (!f.continent || COUNTRY_CONTINENT[p.country] === f.continent) &&
      (!f.favoritesOnly || favorites.includes(p.id)) &&
      (!f.unescoOnly || p.unesco),
  );
}

/** Diakritik va apostroflarni olib tashlab solishtirish (Go‘ri Amir = gori amir) */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʻʼ'‘’`´]/g, '')
    .replace(/ё/g, 'е')
    .trim();
}

export interface SearchHit {
  place: Place;
  score: number;
}

/** Barcha tillardagi nom, shahar, mamlakat va teglar bo'yicha qidiruv */
export function searchPlaces(places: Place[], query: string, lang: Lang, limit = 8): SearchHit[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  const hits: SearchHit[] = [];
  for (const p of places) {
    const names = Object.values(p.name).map(normalize);
    const cities = Object.values(p.city).map(normalize);
    const countries = (['uz', 'ru', 'en'] as Lang[]).map((l) => normalize(countryName(p.country, l)));
    let score = 0;
    if (names.some((n) => n.startsWith(q))) score = 100;
    else if (names.some((n) => n.split(/[\s-]+/).some((w) => w.startsWith(q)))) score = 80;
    else if (names.some((n) => n.includes(q))) score = 60;
    else if (cities.some((c) => c.startsWith(q))) score = 50;
    else if (countries.some((c) => c.startsWith(q))) score = 40;
    else if (p.tags.some((t) => normalize(t).startsWith(q))) score = 30;
    else if (cities.some((c) => c.includes(q)) || countries.some((c) => c.includes(q))) score = 20;
    if (score) hits.push({ place: p, score: score + (normalize(p.name[lang]).startsWith(q) ? 5 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
