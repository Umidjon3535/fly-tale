export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371; // km
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Ikki nuqta orasidagi markaziy burchak (radian) */
export function centralAngle(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceKm(a: LatLng, b: LatLng): number {
  return centralAngle(a, b) * R;
}

/** Katta doira (great-circle) bo'ylab interpolyatsiya, t ∈ [0,1] */
export function interpolateGreatCircle(a: LatLng, b: LatLng, t: number): LatLng {
  const d = centralAngle(a, b);
  if (d < 1e-9) return { ...a };
  const φ1 = toRad(a.lat), λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat), λ2 = toRad(b.lng);
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) };
}

/** Uchish davomiyligi: masofaga qarab 2–4 soniya */
export function flightDurationMs(km: number): number {
  return 2000 + Math.min(1, km / 15000) * 2000;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Quyoshning hozirgi geografik nuqtasi (taxminiy, vizual maqsadlar uchun yetarli) */
export function sunPosition(date = new Date()): LatLng {
  const dayMs = 86400000;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / dayMs;
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = 180 - utcHours * 15;
  return { lat: declination, lng: ((lng + 540) % 360) - 180 };
}

/**
 * Foydalanuvchi joylashuvini ruxsat so'ramasdan taxmin qilish (vaqt mintaqasi bo'yicha).
 * Topilmasa — Toshkent.
 */
type Home = LatLng & { name: { uz: string; ru: string; en: string } };
const n = (uz: string, ru: string, en: string) => ({ uz, ru, en });
const TZ_COORDS: Record<string, Home> = {
  'Asia/Tashkent': { lat: 41.2995, lng: 69.2401, name: n('Toshkent', 'Ташкент', 'Tashkent') },
  'Asia/Samarkand': { lat: 39.6542, lng: 66.9597, name: n('Samarqand', 'Самарканд', 'Samarkand') },
  'Asia/Almaty': { lat: 43.2389, lng: 76.8897, name: n('Olmaota', 'Алматы', 'Almaty') },
  'Asia/Bishkek': { lat: 42.8746, lng: 74.5698, name: n('Bishkek', 'Бишкек', 'Bishkek') },
  'Asia/Dushanbe': { lat: 38.5598, lng: 68.787, name: n('Dushanbe', 'Душанбе', 'Dushanbe') },
  'Asia/Ashgabat': { lat: 37.9601, lng: 58.3261, name: n('Ashxobod', 'Ашхабад', 'Ashgabat') },
  'Europe/Moscow': { lat: 55.7558, lng: 37.6173, name: n('Moskva', 'Москва', 'Moscow') },
  'Europe/Istanbul': { lat: 41.0082, lng: 28.9784, name: n('Istanbul', 'Стамбул', 'Istanbul') },
  'Europe/London': { lat: 51.5072, lng: -0.1276, name: n('London', 'Лондон', 'London') },
  'Europe/Berlin': { lat: 52.52, lng: 13.405, name: n('Berlin', 'Берлин', 'Berlin') },
  'Europe/Paris': { lat: 48.8566, lng: 2.3522, name: n('Parij', 'Париж', 'Paris') },
  'Asia/Dubai': { lat: 25.2048, lng: 55.2708, name: n('Dubay', 'Дубай', 'Dubai') },
  'Asia/Seoul': { lat: 37.5665, lng: 126.978, name: n('Seul', 'Сеул', 'Seoul') },
  'Asia/Tokyo': { lat: 35.6762, lng: 139.6503, name: n('Tokio', 'Токио', 'Tokyo') },
  'Asia/Shanghai': { lat: 31.2304, lng: 121.4737, name: n('Shanxay', 'Шанхай', 'Shanghai') },
  'Asia/Kolkata': { lat: 28.6139, lng: 77.209, name: n('Dehli', 'Дели', 'New Delhi') },
  'America/New_York': { lat: 40.7128, lng: -74.006, name: n('Nyu-York', 'Нью-Йорк', 'New York') },
  'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, name: n('Los-Anjeles', 'Лос-Анджелес', 'Los Angeles') },
};

export function guessHome(): Home {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_COORDS[tz]) return TZ_COORDS[tz];
  } catch {
    /* ignore */
  }
  return TZ_COORDS['Asia/Tashkent'];
}
