import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Place } from '../data/types';
import { countryFlag, countryName } from '../data/countries';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR } from '../lib/categories';
import { searchPlaces } from '../lib/filters';
import { Icon } from '../lib/icons';

interface Props {
  places: Place[];
  onSelect: (p: Place) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar({ places, onSelect }, ref) {
  const { t, tr, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const hits = useMemo(() => searchPlaces(places, query, lang), [places, query, lang]);

  const choose = (p: Place) => {
    onSelect(p);
    setQuery('');
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      choose(hits[active].place);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setQuery('');
      setOpen(false);
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <label htmlFor={listId + '-input'} className="sr-only">
        {t.searchLabel}
      </label>
      <div className="glass flex h-12 items-center gap-1 rounded-full pl-5 pr-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition focus-within:border-turquoise/60 focus-within:bg-night-800/80 focus-within:shadow-[0_0_0_3px_rgba(31,181,196,0.25),0_8px_30px_rgba(0,0,0,0.35)]">
        <input
          ref={inputRef}
          id={listId + '-input'}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={t.searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="search-input h-full w-full min-w-0 bg-transparent text-[15px] text-white placeholder:text-white/50 focus:outline-none focus-visible:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label={t.reset}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('');
              setActive(0);
              inputRef.current?.focus();
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="close" size={16} />
          </button>
        )}
        <button
          type="button"
          aria-label={t.searchLabel}
          title={`${t.searchLabel} ( / )`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (hits[active]) choose(hits[active].place);
            else {
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold text-night-900 shadow-[0_4px_14px_rgba(226,166,59,0.45)] transition hover:scale-105 hover:brightness-110 active:scale-95"
        >
          <Icon name="search" size={18} strokeWidth={2.4} />
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="glass-strong absolute left-0 right-0 top-14 z-40 max-h-[60vh] overflow-auto rounded-2xl p-1.5 shadow-2xl"
        >
          {hits.length === 0 && <li className="px-3 py-3 text-sm text-white/60">{t.noResults}</li>}
          {hits.map(({ place }, i) => (
            <li
              key={place.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(place)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-white/10' : ''}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[place.category], boxShadow: `0 0 10px ${CATEGORY_COLOR[place.category]}` }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{tr(place.name)}</span>
                <span className="block truncate text-xs text-white/60">
                  {countryFlag(place.country)} {tr(place.city)}, {countryName(place.country, lang)}
                </span>
              </span>
              <Icon name="plane" size={16} className="shrink-0 text-gold" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
