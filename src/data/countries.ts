import type { Continent, Lang } from './types';

/** Mamlakat kodi -> qit'a. Yangi mamlakat qo'shilsa, shu yerga ham yozing. */
export const COUNTRY_CONTINENT: Record<string, Continent> = {
  UZ: 'asia', TM: 'asia', KZ: 'asia', KG: 'asia', CN: 'asia', IN: 'asia', IR: 'asia',
  JO: 'asia', KH: 'asia', JP: 'asia', ID: 'asia', AE: 'asia', IL: 'asia', SY: 'asia',
  TR: 'asia', RU: 'europe',
  IT: 'europe', GR: 'europe', FR: 'europe', GB: 'europe', ES: 'europe', VA: 'europe',
  CZ: 'europe', HR: 'europe',
  EG: 'africa', ZM: 'africa', ZW: 'africa',
  US: 'north-america', MX: 'north-america', CA: 'north-america',
  PE: 'south-america', BR: 'south-america', AR: 'south-america', CL: 'south-america',
  AU: 'oceania',
};

const displayNamesCache = new Map<Lang, Intl.DisplayNames | null>();

/** Uzbek ICU ma'lumotlari ba'zi brauzerlarda to'liq emas — shuning uchun qo'lda zaxira nomlar */
const UZ_FALLBACK: Record<string, string> = {
  UZ: "O'zbekiston", TM: 'Turkmaniston', KZ: "Qozog'iston", KG: "Qirg'iziston", CN: 'Xitoy',
  IN: 'Hindiston', IR: 'Eron', JO: 'Iordaniya', KH: 'Kambodja', JP: 'Yaponiya', ID: 'Indoneziya',
  AE: 'BAA', IL: 'Isroil', SY: 'Suriya', TR: 'Turkiya', RU: 'Rossiya', IT: 'Italiya',
  GR: 'Gretsiya', FR: 'Fransiya', GB: 'Buyuk Britaniya', ES: 'Ispaniya', VA: 'Vatikan',
  CZ: 'Chexiya', HR: 'Xorvatiya', EG: 'Misr', ZM: 'Zambiya', ZW: 'Zimbabve', US: 'AQSH',
  MX: 'Meksika', CA: 'Kanada', PE: 'Peru', BR: 'Braziliya', AR: 'Argentina', CL: 'Chili',
  AU: 'Avstraliya',
};

export function countryName(code: string, lang: Lang): string {
  if (lang === 'uz' && UZ_FALLBACK[code]) return UZ_FALLBACK[code];
  if (!displayNamesCache.has(lang)) {
    try {
      displayNamesCache.set(lang, new Intl.DisplayNames([lang], { type: 'region' }));
    } catch {
      displayNamesCache.set(lang, null);
    }
  }
  return displayNamesCache.get(lang)?.of(code) ?? code;
}

export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
