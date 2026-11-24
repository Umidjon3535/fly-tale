import partnersRaw from '../data/partners.json';
import travelRaw from '../data/travel.json';
import type { CountryTravel, Lang, Origin, Partner, Place, TravelData, TravelStyle } from '../data/types';
import { distanceKm } from './geo';

export const travel = travelRaw as unknown as TravelData;
export const partners = partnersRaw as Partner[];

export interface Range {
  min: number;
  max: number;
}

export interface TripInput {
  place: Place;
  origin: Origin;
  nights: number;
  travelers: number;
  style: TravelStyle;
}

export interface TripEstimate {
  /** flight — samolyot, ground — poyezd/avtomobil (O'zbekiston ichida) */
  mode: 'flight' | 'ground';
  km: number;
  /** Bir kishi uchun borib-kelish */
  transportPerPerson: Range;
  transport: Range;
  /** Bir kishi uchun bir kunlik xarajat */
  dailyPerPerson: number;
  stay: Range;
  contingency: Range;
  total: Range;
  perPerson: Range;
  /** To'g'ridan-to'g'ri reys bo'lganda taxminiy parvoz vaqti (soat), bir tomonga */
  travelHours: number;
  country: CountryTravel | undefined;
}

const round10 = (n: number) => Math.round(n / 10) * 10;
const range = (base: number, low: number, high: number): Range => ({ min: round10(base * low), max: round10(base * high) });
const add = (...r: Range[]): Range => r.reduce((a, b) => ({ min: a.min + b.min, max: a.max + b.max }), { min: 0, max: 0 });
const mul = (r: Range, k: number): Range => ({ min: round10(r.min * k), max: round10(r.max * k) });

export function countryTravel(code: string): CountryTravel | undefined {
  return travel.countries[code];
}

/** Masofa va joy turiga qarab tavsiya etiladigan tunlar soni */
export function recommendedNights(place: Place, origin: Origin): number {
  const km = distanceKm(origin, place);
  if (place.country === 'UZ') return km < 60 ? 1 : 2;
  if (km < 2500) return 3;
  if (km < 6000) return 5;
  return 7;
}

/**
 * Taxminiy sayohat narxi. Bu hisob-kitob modeli — haqiqiy narxlar mavsum, aviakompaniya va
 * bron qilish vaqtiga qarab farq qiladi. Model koeffitsientlari src/data/travel.json ichida.
 */
export function estimateTrip({ place, origin, nights, travelers, style }: TripInput): TripEstimate {
  const m = travel.costModel;
  const km = distanceKm(origin, place);
  const country = countryTravel(place.country);
  const ground = place.country === 'UZ' && km <= m.groundMaxKm;

  const t = ground ? m.ground : m.flight;
  const transportPerPerson = range(t.base + t.perKm * km, t.low, t.high);
  const transport = mul(transportPerPerson, travelers);

  const level = String(country?.costLevel ?? 3);
  const dailyPerPerson = m.dailyByLevel[level]?.[style] ?? m.dailyByLevel['3'][style];
  // Kunlar soni = tunlar + 1 (kelgan va ketgan kunlar ham xarajat)
  const stay = range(dailyPerPerson * (nights + 1) * travelers, 0.85, 1.2);

  const subtotal = add(transport, stay);
  const contingency = mul(subtotal, m.contingency);
  const total = add(subtotal, contingency);
  const perPerson = mul(total, 1 / travelers);

  const travelHours = ground ? km / 80 : km / 780 + 0.6;

  return { mode: ground ? 'ground' : 'flight', km, transportPerPerson, transport, dailyPerPerson, stay, contingency, total, perPerson, travelHours, country };
}

export function formatMoney(usd: number, lang: Lang): string {
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
  const s = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd);
  if (!travel.usdToUzs) return s;
  const uzs = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round((usd * travel.usdToUzs) / 1000) * 1000);
  return `${s} (≈ ${uzs} so‘m)`;
}

export const formatRange = (r: Range, lang: Lang) => (r.min === r.max ? formatMoney(r.min, lang) : `${formatMoney(r.min, lang)} – ${formatMoney(r.max, lang)}`);

export function partnersFor(countryCode: string): Partner[] {
  return partners
    .filter((p) => p.countries.includes('*') || p.countries.includes(countryCode))
    .sort((a, b) => Number(b.verified) - Number(a.verified));
}

// ---------- Tashqi havolalar (narxlarni haqiqiy saytlarda tekshirish uchun) ----------

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function flightsUrl(from: string, to: string, depart: Date, nights: number, travelers: number): string {
  const q = `Flights from ${from} to ${to} on ${isoDate(depart)} returning ${isoDate(addDays(depart, nights))} for ${travelers} adults`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export function hotelsUrl(city: string, checkin: Date, nights: number, travelers: number): string {
  const p = new URLSearchParams({
    ss: city,
    checkin: isoDate(checkin),
    checkout: isoDate(addDays(checkin, nights)),
    group_adults: String(travelers),
    no_rooms: String(Math.max(1, Math.ceil(travelers / 2))),
  });
  return `https://www.booking.com/searchresults.html?${p}`;
}

export const TRAIN_URL = 'https://eticket.railway.uz/';
