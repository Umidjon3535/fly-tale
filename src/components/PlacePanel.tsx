import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { countryFlag, countryName } from '../data/countries';
import type { L10n, Place } from '../data/types';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useSpeech } from '../hooks/useSpeech';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR, CATEGORY_ICON } from '../lib/categories';
import { distanceKm, type LatLng } from '../lib/geo';
import { Icon, type IconName } from '../lib/icons';
import { countryTravel } from '../lib/tripCost';
import { Gallery } from './Gallery';
import { TripPlanner } from './TripPlanner';

export type PanelTab = 'info' | 'trip' | 'nearby';

interface Props {
  place: Place;
  allPlaces: Place[];
  home: LatLng;
  initialTab?: PanelTab;
  isFavorite: boolean;
  inRoute: boolean;
  reducedMotion: boolean;
  onToggleFavorite: () => void;
  onToggleRoute: () => void;
  onClose: () => void;
  onFlyTo: (p: Place) => void;
  onToast: (msg: string) => void;
}

export function PlacePanel(props: Props) {
  const { place, allPlaces, home, isFavorite, inRoute, reducedMotion, onToggleFavorite, onToggleRoute, onClose, onFlyTo, onToast } = props;
  const { t, tr, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const speech = useSpeech(lang);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [tab, setTab] = useState<PanelTab>(props.initialTab ?? 'info');
  const color = CATEGORY_COLOR[place.category];
  const titleId = `place-title-${place.id}`;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id]);

  useEffect(() => speech.stop, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (speech.voiceMissing) onToast(t.noVoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.voiceMissing]);

  const nearby = useMemo(
    () =>
      allPlaces
        .filter((p) => p.id !== place.id)
        .map((p) => ({ p, km: distanceKm(place, p) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 8),
    [allPlaces, place],
  );

  const openTab = (next: PanelTab) => {
    setTab(next);
    scrollRef.current?.querySelector('[data-tabs]')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const listen = () => {
    if (!speech.supported) return onToast(t.ttsUnsupported);
    if (speech.speaking) return speech.stop();
    speech.speak([tr(place.name), tr(place.short), tr(place.history), ...place.facts.map(tr)].join('. ').replace(/\.\./g, '.'));
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}?place=${place.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${tr(place.name)} — ${t.appName}`, text: tr(place.short), url });
      else {
        await navigator.clipboard.writeText(url);
        onToast(t.copied);
      }
    } catch {
      /* foydalanuvchi bekor qildi */
    }
  };

  const visa = countryTravel(place.country)?.visa;
  const variants = isDesktop
    ? { initial: { x: '105%', opacity: 0.6 }, animate: { x: 0, opacity: 1 }, exit: { x: '105%', opacity: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  const tabs: { id: PanelTab; label: string; icon: IconName }[] = [
    { id: 'info', label: t.tabInfo, icon: 'info' },
    { id: 'trip', label: t.tabTrip, icon: 'plane' },
    { id: 'nearby', label: t.tabNearby, icon: 'pin' },
  ];

  return (
    <motion.aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      {...variants}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 260 }}
      drag={isDesktop ? false : 'y'}
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      className="glass-strong fixed inset-x-0 bottom-0 z-30 flex max-h-[calc(100dvh-124px-env(safe-area-inset-top))] flex-col rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-[440px] md:rounded-3xl lg:w-[480px]"
    >
      {/* Telefonda tortib yopish uchun tutqich */}
      <div className="flex justify-center pt-2.5 md:hidden" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
        <span className="h-1.5 w-12 rounded-full bg-white/30" aria-hidden="true" />
      </div>

      <header className="flex items-center gap-2 px-5 pb-2 pt-3 md:pt-5" onPointerDown={(e) => !isDesktop && dragControls.start(e)} style={{ touchAction: isDesktop ? 'auto' : 'none' }}>
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: color + '26', color }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={CATEGORY_ICON[place.category]} />
          </svg>
          {t.cat[place.category]}
        </span>
        {place.unesco && (
          <span className="flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-light" title={t.unesco}>
            <Icon name="sparkle" size={12} filled /> UNESCO
          </span>
        )}
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <Icon name="close" />
        </button>
      </header>

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="px-5">
          <Gallery query={place.wikimediaQuery} title={tr(place.name)} category={place.category} />
          <h2 id={titleId} className="font-display mt-4 text-2xl leading-tight text-white">
            {tr(place.name)}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {countryFlag(place.country)} {tr(place.city)}, {countryName(place.country, lang)} · {tr(place.era)}
          </p>
        </div>

        {/* Bo'limlar */}
        <div data-tabs role="tablist" aria-label={tr(place.name)} className="sticky top-0 z-10 mt-4 flex gap-1 border-b border-white/10 bg-[#0d1838]/95 px-3 backdrop-blur">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              id={`tab-${tb.id}`}
              aria-selected={tab === tb.id}
              aria-controls={`tabpanel-${tb.id}`}
              onClick={() => openTab(tb.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-1 py-3 text-xs font-semibold transition sm:px-2 sm:text-sm ${tab === tb.id ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
            >
              <Icon name={tb.icon} size={15} className="hidden shrink-0 sm:block" />
              {tb.label}
              {tab === tb.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-turquoise to-gold" />}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`} className="px-5 pt-4">
          {tab === 'info' && (
            <>
              <p className="text-[15px] leading-relaxed text-white/90">{tr(place.short)}</p>

              {/* Sayohat bo'limiga katta, aniq yo'llanma */}
              <button
                type="button"
                onClick={() => openTab('trip')}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/20 to-lojuvard/30 p-3 text-left transition hover:border-gold/70"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-night-900">
                  <Icon name="plane" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{t.calcTripCta}</span>
                  <span className="block text-xs text-white/65">
                    {t.calcTripHint}
                    {visa && ` · ${t.visa}: ${visaShort(visa, t)}`}
                  </span>
                </span>
                <Icon name="chevronRight" className="shrink-0 text-gold-light" />
              </button>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionBtn icon={speech.speaking ? 'stop' : 'speaker'} label={speech.speaking ? t.stopListening : t.listen} onClick={listen} active={speech.speaking} />
                <ActionBtn icon="heart" label={isFavorite ? t.unfavorite : t.favorite} onClick={onToggleFavorite} active={isFavorite} filledIcon={isFavorite} />
                <ActionBtn icon="route" label={inRoute ? t.removeFromRoute : t.addToRoute} onClick={onToggleRoute} active={inRoute} />
                <ActionBtn icon="share" label={t.share} onClick={share} />
                <a href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="action-btn">
                  <Icon name="map" size={16} /> {t.maps}
                </a>
              </div>

              <details className="group mt-5 rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.05]" open>
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-white">
                  {t.history}
                  <Icon name="chevronDown" className="transition group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-white/85">{tr(place.history)}</p>
              </details>

              {place.facts.length > 0 && (
                <section className="mt-5">
                  <h3 className="font-display mb-2 text-base text-gold-light">{t.facts}</h3>
                  <ul className="space-y-2">
                    {place.facts.map((f, i) => (
                      <li key={i} className="flex gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-white/85">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-night-900" style={{ background: color }}>
                          {i + 1}
                        </span>
                        {tr(f)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-5">
                <h3 className="font-display mb-2 text-base text-gold-light">{t.practical}</h3>
                <dl className="space-y-2">
                  <PracticalRow icon="clock" label={t.hours} value={place.hours} />
                  <PracticalRow icon="ticket" label={t.price} value={place.price} />
                  <PracticalRow icon="leaf" label={t.bestSeason} value={place.bestSeason} />
                </dl>
              </section>
            </>
          )}

          {tab === 'trip' && <TripPlanner place={place} home={home} onToast={onToast} />}

          {tab === 'nearby' && (
            <ul className="space-y-1.5">
              {nearby.map(({ p, km }) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onFlyTo(p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[p.category] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{tr(p.name)}</span>
                      <span className="block truncate text-xs text-white/55">
                        {countryFlag(p.country)} {tr(p.city)} · {t.cat[p.category]}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-white/60">
                      {km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString(lang)} {t.km}
                    </span>
                    <Icon name="plane" size={15} className="shrink-0 text-gold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

function visaShort(v: string, t: ReturnType<typeof useI18n>['t']) {
  return v === 'domestic' ? '—' : v === 'free' ? t.visaFree : v === 'evisa' ? 'e-visa' : v === 'required' ? t.visaRequired.split(' — ')[0] : t.needsCheck;
}

function ActionBtn({ icon, label, onClick, active, filledIcon }: { icon: IconName; label: string; onClick: () => void; active?: boolean; filledIcon?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`action-btn ${active ? 'is-active' : ''}`}>
      <Icon name={icon} size={16} filled={filledIcon} /> {label}
    </button>
  );
}

function PracticalRow({ icon, label, value }: { icon: IconName; label: string; value: L10n | null }) {
  const { t, tr } = useI18n();
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
      <Icon name={icon} className="mt-0.5 shrink-0 text-turquoise" />
      <div className="min-w-0">
        <dt className="text-xs text-white/55">{label}</dt>
        {value ? (
          <dd className="text-sm text-white/90">{tr(value)}</dd>
        ) : (
          <dd className="text-sm text-gold-light" title={t.needsCheckHint}>
            {t.needsCheck} <span className="text-xs text-white/45">— {t.needsCheckHint}</span>
          </dd>
        )}
      </div>
    </div>
  );
}
