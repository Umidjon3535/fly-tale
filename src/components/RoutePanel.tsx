import type { Place } from '../data/types';
import { countryFlag } from '../data/countries';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR } from '../lib/categories';
import { distanceKm } from '../lib/geo';
import { Icon } from '../lib/icons';

interface Props {
  route: Place[];
  touring: boolean;
  onFly: () => void;
  onStop: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onSelect: (p: Place) => void;
}

export function RoutePanel({ route, touring, onFly, onStop, onClear, onRemove, onMove, onSelect }: Props) {
  const { t, tr, lang } = useI18n();
  const total = route.reduce((sum, p, i) => (i ? sum + distanceKm(route[i - 1], p) : 0), 0);

  if (route.length === 0) return <p className="text-sm leading-relaxed text-white/70">{t.routeEmpty}</p>;

  return (
    <div className="space-y-3">
      <ol className="scroll-thin max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
        {route.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/[0.05] py-1.5 pl-2 pr-1">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-night-900" style={{ background: CATEGORY_COLOR[p.category] }}>
              {i + 1}
            </span>
            <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-white hover:text-turquoise" onClick={() => onSelect(p)}>
              {countryFlag(p.country)} {tr(p.name)}
            </button>
            <IconBtn label={t.moveUp} icon="chevronUp" disabled={i === 0} onClick={() => onMove(p.id, -1)} />
            <IconBtn label={t.moveDown} icon="chevronDown" disabled={i === route.length - 1} onClick={() => onMove(p.id, 1)} />
            <IconBtn label={t.removeItem} icon="close" onClick={() => onRemove(p.id)} />
          </li>
        ))}
      </ol>
      {route.length > 1 && (
        <p className="text-xs text-white/60">
          ≈ {Math.round(total).toLocaleString(lang)} {t.km}
        </p>
      )}
      <div className="flex gap-2">
        {touring ? (
          <button type="button" onClick={onStop} className="btn-primary flex-1 bg-red-500/80">
            <Icon name="stop" size={16} filled /> {t.stopTour}
          </button>
        ) : (
          <button type="button" onClick={onFly} className="btn-primary flex-1">
            <Icon name="play" size={16} filled /> {t.flyRoute}
          </button>
        )}
        <button type="button" onClick={onClear} aria-label={t.clearRoute} title={t.clearRoute} className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 text-white/80 hover:bg-white/10">
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, icon, onClick, disabled }: { label: string; icon: 'chevronUp' | 'chevronDown' | 'close'; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-25">
      <Icon name={icon} size={15} />
    </button>
  );
}
