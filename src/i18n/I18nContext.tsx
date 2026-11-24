import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { LANGS, type L10n, type Lang } from '../data/types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { translations, type Dict } from './translations';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  /** Uch tilli maydondan joriy tildagi matnni oladi */
  tr: (v: L10n | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  const nav = (navigator.language || 'uz').slice(0, 2) as Lang;
  return LANGS.includes(nav) ? nav : 'uz';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useLocalStorage<Lang>('tg:lang', detectLang());
  const safeLang: Lang = LANGS.includes(lang) ? lang : 'uz';

  useEffect(() => {
    document.documentElement.lang = safeLang;
    document.title = translations[safeLang].appName;
  }, [safeLang]);

  const tr = useCallback((v: L10n | null | undefined) => (v ? v[safeLang] || v.en || v.uz : ''), [safeLang]);

  const value = useMemo(
    () => ({ lang: safeLang, setLang, t: translations[safeLang], tr }),
    [safeLang, setLang, tr],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n faqat I18nProvider ichida ishlaydi');
  return ctx;
}
