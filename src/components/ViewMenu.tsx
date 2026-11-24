import { useI18n } from '../i18n/I18nContext';
import { Icon, type IconName } from '../lib/icons';
import type { LightMode } from './Globe';

export interface ViewSettings {
  lightMode: LightMode;
  autoRotate: boolean;
  atmosphere: boolean;
  graticules: boolean;
}

export const DEFAULT_VIEW: ViewSettings = { lightMode: 'real', autoRotate: true, atmosphere: true, graticules: false };

interface Props {
  value: ViewSettings;
  onChange: (v: ViewSettings) => void;
  animations: boolean;
  reducedMotionSystem: boolean;
  onToggleAnimations: () => void;
}

/** "Ko'rinish" menyusi: yoritish va globus qatlamlari */
export function ViewMenu({ value, onChange, animations, reducedMotionSystem, onToggleAnimations }: Props) {
  const { t } = useI18n();
  const modes: { m: LightMode; icon: IconName; label: string }[] = [
    { m: 'real', icon: 'globe', label: t.realMode },
    { m: 'day', icon: 'sun', label: t.dayMode },
    { m: 'night', icon: 'moon', label: t.nightMode },
  ];

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{t.lighting}</legend>
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {modes.map(({ m, icon, label }) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={value.lightMode === m}
              onClick={() => onChange({ ...value, lightMode: m })}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                value.lightMode === m ? 'border-turquoise/70 bg-lojuvard text-white' : 'border-white/15 text-white/75 hover:bg-white/10'
              }`}
            >
              <Icon name={icon} size={20} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Switch label={t.autoRotate} checked={value.autoRotate} onChange={(v) => onChange({ ...value, autoRotate: v })} />
        <Switch label={t.planeAnimation} checked={animations} disabled={reducedMotionSystem} onChange={onToggleAnimations} />
        <Switch label={t.atmosphere} checked={value.atmosphere} onChange={(v) => onChange({ ...value, atmosphere: v })} />
        <Switch label={t.graticules} checked={value.graticules} onChange={(v) => onChange({ ...value, graticules: v })} />
      </div>
    </div>
  );
}

function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 disabled:opacity-50"
    >
      {label}
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-turquoise' : 'bg-white/20'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
