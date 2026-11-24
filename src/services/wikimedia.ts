import type { WikiImage } from '../data/types';

const API = 'https://commons.wikimedia.org/w/api.php';
const memCache = new Map<string, Promise<WikiImage[]>>();
const STORAGE_PREFIX = 'tg:wm:';

function stripHtml(html: string | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

interface ImageInfo {
  url: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width: number;
  height: number;
  descriptionurl: string;
  mime: string;
  extmetadata?: Record<string, { value: string } | undefined>;
}

interface ApiResponse {
  query?: { pages?: Record<string, { title: string; index?: number; imageinfo?: ImageInfo[] }> };
}

/**
 * Wikimedia Commons'dan joy nomi bo'yicha rasmlarni yuklaydi.
 * Har bir rasm uchun muallif va litsenziya qaytariladi (ko'rsatish majburiy).
 */
export function fetchWikimediaImages(query: string, limit = 8): Promise<WikiImage[]> {
  const key = `${query}|${limit}`;
  const existing = memCache.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const cached = sessionStorage.getItem(STORAGE_PREFIX + key);
      if (cached) return JSON.parse(cached) as WikiImage[];
    } catch {
      /* sessionStorage mavjud emas */
    }

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(limit * 2),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '1280',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName',
    });

    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`Wikimedia: ${res.status}`);
    const data = (await res.json()) as ApiResponse;
    const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const images: WikiImage[] = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
      if (info.width < 600) continue; // juda kichik rasmlar galereyaga yaramaydi
      const meta = info.extmetadata ?? {};
      images.push({
        title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
        thumbUrl: info.thumburl ?? info.url,
        fullUrl: info.url,
        pageUrl: info.descriptionurl,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        author: stripHtml(meta.Artist?.value) || 'Wikimedia Commons',
        license: stripHtml(meta.LicenseShortName?.value) || '—',
        licenseUrl: meta.LicenseUrl?.value ?? null,
        description: stripHtml(meta.ImageDescription?.value ?? meta.ObjectName?.value).slice(0, 200),
      });
      if (images.length >= limit) break;
    }

    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(images));
    } catch {
      /* ignore quota */
    }
    return images;
  })();

  memCache.set(key, promise);
  promise.catch(() => memCache.delete(key));
  return promise;
}
