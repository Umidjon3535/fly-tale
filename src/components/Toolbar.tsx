import { LANGS, type Lang } from '../data/types';
import { useI18n } from '../i18n/I18nContext';

const LANG_LABEL: Record<Lang, string> = { uz: 'O‘z', ru: 'Ру', en: 'En' };

/** Til tanlash (yuqori o'ng burchak) */
export function LanguageSwitch() {
  const { t, lang, setLang } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.language} className="glass flex h-11 items-center rounded-full p-1">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          lang={l}
          onClick={() => setLang(l)}
          className={`h-9 min-w-10 rounded-full px-2 text-xs font-bold transition ${lang === l ? 'bg-gold text-night-900' : 'text-white/75 hover:text-white'}`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
