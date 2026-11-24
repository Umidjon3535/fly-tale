// places.json tuzilmasini tekshiradi: `npm run validate:data`
import fs from 'node:fs';

const LANGS = ['uz', 'ru', 'en'];
const CATEGORIES = ['historic', 'museum', 'religious', 'nature', 'modern', 'city'];
const countriesSrc = fs.readFileSync(new URL('../src/data/countries.ts', import.meta.url), 'utf8');
const knownCountries = new Set([...countriesSrc.matchAll(/\b([A-Z]{2}): '/g)].map((m) => m[1]));

const places = JSON.parse(fs.readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'));
const errors = [];
const ids = new Set();

const isL10n = (v) => v && typeof v === 'object' && LANGS.every((l) => typeof v[l] === 'string' && v[l].trim().length > 0);

for (const [i, p] of places.entries()) {
  const at = `#${i} (${p.id ?? '?'})`;
  if (!/^[a-z0-9-]+$/.test(p.id ?? '')) errors.push(`${at}: id faqat kichik lotin harflari, raqam va "-" bo'lishi kerak`);
  if (ids.has(p.id)) errors.push(`${at}: id takrorlangan`);
  ids.add(p.id);
  for (const k of ['name', 'city', 'era', 'short', 'history']) if (!isL10n(p[k])) errors.push(`${at}: "${k}" uch tilda to'ldirilishi kerak`);
  for (const k of ['hours', 'price', 'bestSeason']) if (p[k] !== null && !isL10n(p[k])) errors.push(`${at}: "${k}" null yoki uch tilli bo'lishi kerak`);
  if (!Array.isArray(p.facts) || p.facts.length < 3 || p.facts.length > 5 || !p.facts.every(isL10n)) errors.push(`${at}: "facts" 3–5 ta uch tilli fakt bo'lishi kerak`);
  if (typeof p.lat !== 'number' || p.lat < -90 || p.lat > 90) errors.push(`${at}: lat noto'g'ri`);
  if (typeof p.lng !== 'number' || p.lng < -180 || p.lng > 180) errors.push(`${at}: lng noto'g'ri`);
  if (!CATEGORIES.includes(p.category)) errors.push(`${at}: category noma'lum: ${p.category}`);
  if (!knownCountries.has(p.country)) errors.push(`${at}: country "${p.country}" src/data/countries.ts ichida yo'q`);
  if (typeof p.unesco !== 'boolean') errors.push(`${at}: unesco boolean bo'lishi kerak`);
  if (typeof p.wikimediaQuery !== 'string' || !p.wikimediaQuery) errors.push(`${at}: wikimediaQuery bo'sh`);
  if (!Array.isArray(p.tags)) errors.push(`${at}: tags massiv bo'lishi kerak`);
  if (!/^[A-Z]{3}$/.test(p.airport ?? '')) errors.push(`${at}: airport 3 harfli IATA kodi bo'lishi kerak (masalan "SKD")`);
}

// Sayohat ma'lumotlari: har bir mamlakat uchun viza/narx darajasi bo'lishi kerak
const travel = JSON.parse(fs.readFileSync(new URL('../src/data/travel.json', import.meta.url), 'utf8'));
const VISA = ['domestic', 'free', 'evisa', 'required', 'check'];
for (const code of new Set(places.map((p) => p.country))) {
  const c = travel.countries[code];
  if (!c) errors.push(`travel.json: "${code}" mamlakati uchun ma'lumot yo'q`);
  else {
    if (!VISA.includes(c.visa)) errors.push(`travel.json: ${code}.visa noma'lum: ${c.visa}`);
    if (![1, 2, 3, 4].includes(c.costLevel)) errors.push(`travel.json: ${code}.costLevel 1–4 bo'lishi kerak`);
  }
}
const partners = JSON.parse(fs.readFileSync(new URL('../src/data/partners.json', import.meta.url), 'utf8'));
for (const [i, p] of partners.entries()) {
  if (!p.id || !p.name || !Array.isArray(p.countries) || !Array.isArray(p.services)) errors.push(`partners.json #${i}: id, name, countries[], services[] majburiy`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} ta xato:\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
const uz = places.filter((p) => p.country === 'UZ').length;
console.log(`✓ ${places.length} ta joy to'g'ri (O'zbekiston: ${uz}, UNESCO: ${places.filter((p) => p.unesco).length})`);
