import { useMemo } from 'react';
import { CATEGORIES, CONTINENTS, type Continent, type Place } from '../data/types';
import { countryFlag, countryName } from '../data/countries';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR, CATEGORY_ICON } from '../lib/categories';
import { EMPTY_FILTERS, type FilterState } from '../lib/filters';

interface Props {
  places: Place[];
  value: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
}

export function Filters({ places, value, onChange, resultCount }: Props) {
  const { t, lang } = useI18n();

  const countries = useMemo(() => {
    const codes = [...new Set(places.map((p) => p.country))];
    return codes
      .map((c) => ({ code: c, name: countryName(c, lang) }))
      .sort((a, b) => (a.code === 'UZ' ? -1 : b.code === 'UZ' ? 1 : a.name.localeCompare(b.name, lang)));
  }, [places, lang]);

  const toggleCat = (c: (typeof CATEGORIES)[number]) =>
    onChange({
      ...value,
      categories: value.categories.includes(c) ? value.categories.filter((x) => x !== c) : [...value.categories, c],
    });

  const selectCls =
    'h-10 w-full rounded-xl border border-white/15 bg-night-800/80 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-turquoise/70';

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{t.category}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = value.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCat(c)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  on ? 'border-transparent text-night-900' : 'border-white/15 text-white/85 hover:bg-white/10'
                }`}
                style={on ? { background: CATEGORY_COLOR[c] } : undefined}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={on ? 'currentColor' : CATEGORY_COLOR[c]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={CATEGORY_ICON[c]} />
                </svg>
                {t.cat[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">{t.continent}</span>
          <select className={selectCls} value={value.continent} onChange={(e) => onChange({ ...value, continent: e.target.value as Continent | '' })}>
            <option value="">{t.all}</option>
            {CONTINENTS.map((c) => (
              <option key={c} value={c}>
                {t.cont[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">{t.country}</span>
          <select className={selectCls} value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })}>
            <option value="">{t.all}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle on={value.country === 'UZ'} onClick={() => onChange({ ...value, country: value.country === 'UZ' ? '' : 'UZ' })}>
          🇺🇿 {t.uzbekistan}
        </Toggle>
        <Toggle on={value.unescoOnly} onClick={() => onChange({ ...value, unescoOnly: !value.unescoOnly })}>
          UNESCO
        </Toggle>
        <Toggle on={value.favoritesOnly} onClick={() => onChange({ ...value, favoritesOnly: !value.favoritesOnly })}>
          ♥ {t.onlyFavorites}
        </Toggle>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-white/70" aria-live="polite">
          <b className="text-white">{resultCount}</b> {t.places}
        </span>
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="rounded-lg px-3 py-1.5 text-turquoise hover:bg-white/10">
          {t.reset}
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        on ? 'border-gold bg-gold/20 text-gold-light' : 'border-white/15 text-white/85 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
