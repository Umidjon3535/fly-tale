/**
 * PWA: Service Worker'ni ro'yxatdan o'tkazish va "ilovani o'rnatish" taklifini boshqarish.
 * `beforeinstallprompt` hodisasi sahifa yuklanishi bilan juda erta keladi, shuning uchun
 * tinglovchi React ishga tushishidan oldin (main.tsx'da) qo'yiladi.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // brauzerning o'z mini-bannerini emas, bizning chiroyli taklifni ko'rsatamiz
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service Worker ro‘yxatdan o‘tmadi', err));
    });
  }
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Ilova allaqachon o'rnatilgan va bosh ekrandan ochilganmi */
export function isStandalone(): boolean {
  return (
    installed ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad Safari — u yerda o'rnatish faqat "Ulashish → Bosh ekranga qo'shish" orqali */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

export function canPromptInstall() {
  return deferred !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}
