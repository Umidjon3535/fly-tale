import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filters } from './components/Filters';
import { Globe, type GlobeHandle } from './components/Globe';
import { FlightHud, HelpPanel, Intro, Toast } from './components/Overlays';
import { PlacePanel, type PanelTab } from './components/PlacePanel';
import { FlightCancelled } from './components/PlaneAnimation';
import { RoutePanel } from './components/RoutePanel';
import { SearchBar } from './components/SearchBar';
import { InstallPrompt } from './components/InstallPrompt';
import { Logo, LogoMark } from './components/Logo';
import { LanguageSwitch } from './components/Toolbar';
import { DEFAULT_VIEW, ViewMenu, type ViewSettings } from './components/ViewMenu';
import { loadPlaces } from './data/placesRepository';
import type { Place } from './data/types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useIsDesktop, usePrefersReducedMotion } from './hooks/useMediaQuery';
import { useI18n } from './i18n/I18nContext';
import { activeFilterCount, applyFilters, EMPTY_FILTERS, type FilterState } from './lib/filters';
import { guessHome, type LatLng } from './lib/geo';
import { Icon, type IconName } from './lib/icons';

const SAMARKAND: LatLng = { lat: 39.6542, lng: 66.9597 };
type Sheet = 'filters' | 'route' | 'view' | 'help' | null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const { t, tr, lang } = useI18n();
  const globe = useRef<GlobeHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [favorites, setFavorites] = useLocalStorage<string[]>('tg:favorites', []);
  const [routeIds, setRouteIds] = useLocalStorage<string[]>('tg:route', []);
  const [viewRaw, setView] = useLocalStorage<ViewSettings>('tg:view', DEFAULT_VIEW);
  const view = { ...DEFAULT_VIEW, ...viewRaw };
  const [animPref, setAnimPref] = useLocalStorage<boolean>('tg:animations', true);
  const [introSeen, setIntroSeen] = useLocalStorage<boolean>('tg:introSeen', false);
  const reducedMotionSystem = usePrefersReducedMotion();
  const animations = animPref && !reducedMotionSystem;

  const [selected, setSelected] = useState<Place | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('info');
  const [flight, setFlight] = useState<{ target: string; from: string } | null>(null);
  const [flightProgress, setFlightProgress] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [touring, setTouring] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pwa = usePwaInstall();
  const [installOpen, setInstallOpen] = useState(false);
  const [installDismissedAt, setInstallDismissedAt] = useLocalStorage<number>('tg:installDismissed', 0);

  const home = useMemo(guessHome, []);
  /** Samolyotning joriy joylashuvi: oxirgi qo'ngan joy yoki foydalanuvchi shahri */
  const position = useRef<{ point: LatLng; place: Place | null }>({ point: home, place: null });
  const flightCounter = useRef(0);
  const tourToken = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const lastProgress = useRef(0);

  useEffect(() => {
    loadPlaces().then(setPlaces).catch(() => setLoadError(true));
  }, []);

  const filtered = useMemo(() => (places ? applyFilters(places, filters, favorites) : []), [places, filters, favorites]);
  const route = useMemo(() => (places ? routeIds.map((id) => places.find((p) => p.id === id)).filter((p): p is Place => !!p) : []), [places, routeIds]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /** Asosiy harakat: samolyot joriy nuqtadan tanlangan joyga uchadi, qo'ngach panel ochiladi */
  const flyTo = useCallback(
    async (place: Place, opts: { fromTour?: boolean } = {}): Promise<boolean> => {
      const g = globe.current;
      if (!g) return false;
      if (!opts.fromTour) {
        tourToken.current++;
        setTouring(false);
      }
      const id = ++flightCounter.current;
      const from = position.current;
      setSheet(null);
      setPanelOpen(false);
      setSelected(place);
      setPanelTab('info');
      setShowIntro(false);

      if (from.place?.id === place.id) {
        g.pointOfView({ lat: place.lat, lng: place.lng, altitude: 0.55 }, animations ? 800 : 0);
        setPanelOpen(true);
        return true;
      }

      setFlight({ target: tr(place.name), from: from.place ? tr(from.place.name) : tr(home.name) });
      setFlightProgress(0);
      lastProgress.current = 0;
      try {
        await g.flyTo(from.point, place, {
          instant: !animations,
          onProgress: (p) => {
            // React holatini har kadrda emas, ~3% qadam bilan yangilaymiz
            if (p - lastProgress.current > 0.03 || p === 1) {
              lastProgress.current = p;
              setFlightProgress(p);
            }
          },
        });
      } catch (e) {
        if (e instanceof FlightCancelled) return false;
        throw e;
      }
      if (id !== flightCounter.current) return false;
      position.current = { point: place, place };
      setFlight(null);
      setPanelOpen(true);
      history.replaceState(null, '', `?place=${encodeURIComponent(place.id)}`);
      return true;
    },
    [animations, home.name, tr],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSelected(null);
    history.replaceState(null, '', location.pathname);
  }, []);

  const randomTrip = () => {
    const pool = (filtered.length ? filtered : places ?? []).filter((p) => p.id !== position.current.place?.id);
    if (pool.length) flyTo(pool[Math.floor(Math.random() * pool.length)]);
  };

  const startTour = async () => {
    if (route.length === 0) return;
    const token = ++tourToken.current;
    setTouring(true);
    setSheet(null);
    for (const p of route) {
      if (token !== tourToken.current) return;
      const ok = await flyTo(p, { fromTour: true });
      if (!ok || token !== tourToken.current) return;
      await sleep(animations ? 4200 : 3200);
    }
    if (token === tourToken.current) setTouring(false);
  };

  const stopTour = () => {
    tourToken.current++;
    setTouring(false);
  };

  const toggleFavorite = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const toggleRoute = (id: string) => setRouteIds((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  const moveInRoute = (id: string, dir: -1 | 1) =>
    setRouteIds((r) => {
      const i = r.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Globus tayyor bo'lgach: intro (globus Samarqand tomonga aylanadi) yoki havola bo'yicha joyga uchish
  const onGlobeReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (!ready || !places) return;
    const g = globe.current!;
    const deepId = new URLSearchParams(location.search).get('place');
    const deepPlace = deepId ? places.find((p) => p.id === deepId) : undefined;

    if (!introSeen && !deepPlace) {
      setShowIntro(true);
      if (animations) {
        g.pointOfView({ lat: 12, lng: -40, altitude: 3.6 }, 0);
        setTimeout(() => g.pointOfView({ ...SAMARKAND, altitude: 2.1 }, 3200), 200);
      } else {
        g.pointOfView({ ...SAMARKAND, altitude: 2.1 }, 0);
      }
      const timer = setTimeout(() => {
        setShowIntro(false);
        setIntroSeen(true);
      }, 4600);
      return () => clearTimeout(timer);
    }
    g.pointOfView({ ...SAMARKAND, altitude: 2.3 }, 0);
    if (deepPlace) setTimeout(() => flyTo(deepPlace), 400);
    // Faqat bir marta, globus va ma'lumot tayyor bo'lganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, places]);

  // Ilovani o'rnatish taklifi: sayt tayyor bo'lgach 4 soniyadan keyin (rad etilgan bo'lsa — 7 kun ko'rsatilmaydi)
  useEffect(() => {
    if (!ready || showIntro || pwa.mode === 'none') return;
    if (Date.now() - installDismissedAt < 7 * 86400000) return;
    const id = window.setTimeout(() => setInstallOpen(true), 4000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, showIntro, pwa.mode]);

  const dismissInstall = () => {
    setInstallOpen(false);
    setInstallDismissedAt(Date.now());
  };
  const runInstall = async () => {
    const ok = await pwa.install();
    setInstallOpen(false);
    if (ok) showToast(t.installDone);
    else setInstallDismissedAt(Date.now());
  };

  // Klaviatura boshqaruvi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
      if (e.key === 'Escape') {
        if (sheet) setSheet(null);
        else if (panelOpen) closePanel();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // Strelkalar faqat fokus globus ustida (yoki hech qayerda) bo'lganda globusni aylantiradi
      const onGlobe = target === document.body || target.classList.contains('gm');
      if (!onGlobe || flight) return;
      const g = globe.current;
      const map: Record<string, () => void> = {
        ArrowLeft: () => g?.nudge(0, -12),
        ArrowRight: () => g?.nudge(0, 12),
        ArrowUp: () => g?.nudge(8, 0),
        ArrowDown: () => g?.nudge(-8, 0),
        '+': () => g?.zoomBy(0.7),
        '=': () => g?.zoomBy(0.7),
        '-': () => g?.zoomBy(1.4),
      };
      if (map[e.key]) {
        e.preventDefault();
        map[e.key]();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, panelOpen, closePanel, flight]);

  const nameOf = useCallback((p: Place) => tr(p.name), [tr]);
  const clusterLabel = useCallback((n: number) => t.clusterLabel.replace('{n}', String(n)), [t]);
  const filterCount = activeFilterCount(filters);
  const sheetTitle = sheet === 'filters' ? t.filters : sheet === 'route' ? t.myRoute : sheet === 'view' ? t.view : t.help;
  const globeOffset = useMemo<[number, number]>(
    () => (panelOpen ? (isDesktop ? [-230, 0] : [0, -Math.round(window.innerHeight * 0.28)]) : [0, 0]),
    [panelOpen, isDesktop],
  );

  if (loadError) {
    return <div className="grid h-dvh place-items-center bg-night-950 p-6 text-center text-white/80">{t.loadError}</div>;
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-night-950 text-white">
      <h1 className="sr-only">{t.appName}</h1>
      <p className="sr-only">{t.keyboardHint}</p>

      {places && (
        <div className="globe-wrap absolute inset-0 isolate z-0">
          <Globe
            ref={globe}
            places={filtered}
            selectedId={selected?.id ?? null}
            lightMode={view.lightMode}
            autoRotate={view.autoRotate && !panelOpen && !flight && !touring && !showIntro}
            showAtmosphere={view.atmosphere}
            showGraticules={view.graticules}
            lang={lang}
            name={nameOf}
            clusterLabel={clusterLabel}
            onPlaceClick={flyTo}
            onReady={onGlobeReady}
            offset={globeOffset}
          />
        </div>
      )}
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Yuqori panel */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:flex-nowrap md:gap-4 md:p-4 md:pt-[max(1rem,env(safe-area-inset-top))]">
        <a href="/" aria-label={t.appName} className="pointer-events-auto rounded-xl">
          <span className={panelOpen ? '' : 'lg:hidden'}><Logo compact /></span>
          <span className={panelOpen ? 'hidden' : 'hidden lg:block'}><Logo tagline={t.tagline} /></span>
        </a>
        <div
          className={`pointer-events-auto order-3 w-full md:order-none md:flex-1 ${panelOpen ? 'md:mr-auto md:max-w-[calc(100vw-560px)] lg:max-w-[calc(100vw-620px)]' : 'md:mx-auto md:max-w-md'}`}
        >
          <SearchBar ref={searchRef} places={places ?? []} onSelect={flyTo} />
        </div>
        <div className={`pointer-events-auto ml-auto ${panelOpen ? 'md:invisible' : ''}`}>
          <LanguageSwitch />
        </div>
      </header>

      {/* Pastki menyu: har bir tugma yozuvi bilan */}
      <nav
        aria-label={t.menu}
        className={`glass-strong absolute inset-x-2 bottom-2 z-20 flex justify-around gap-1 rounded-2xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-opacity md:inset-x-auto md:bottom-3 md:left-3 md:justify-start md:gap-1.5 ${panelOpen && !isDesktop ? 'pointer-events-none opacity-0' : ''}`}
      >
        <DockBtn compact={panelOpen} icon="filter" label={t.filters} active={sheet === 'filters'} badge={filterCount || undefined} onClick={() => setSheet(sheet === 'filters' ? null : 'filters')} />
        <DockBtn compact={panelOpen} icon="dice" label={t.randomShort} onClick={randomTrip} accent />
        <DockBtn compact={panelOpen} icon="route" label={t.routeShort} active={sheet === 'route' || touring} badge={route.length || undefined} onClick={() => setSheet(sheet === 'route' ? null : 'route')} />
        <DockBtn compact={panelOpen} icon="globe" label={t.view} active={sheet === 'view'} onClick={() => setSheet(sheet === 'view' ? null : 'view')} />
        <DockBtn compact={panelOpen} icon="info" label={t.help} active={sheet === 'help'} onClick={() => setSheet(sheet === 'help' ? null : 'help')} />
      </nav>

      <AnimatePresence>
        {sheet && (
          <motion.section
            key={sheet}
            aria-label={sheetTitle}
            className="glass-strong scroll-thin absolute bottom-[84px] left-2 right-2 z-30 max-h-[calc(100dvh-170px)] overflow-y-auto rounded-3xl p-4 shadow-2xl md:left-3 md:right-auto md:w-[380px]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: animations ? 0.2 : 0 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base">{sheetTitle}</h2>
              <button type="button" onClick={() => setSheet(null)} aria-label={t.close} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">
                <Icon name="close" size={16} />
              </button>
            </div>
            {sheet === 'filters' && places && <Filters places={places} value={filters} onChange={setFilters} resultCount={filtered.length} />}
            {sheet === 'route' && (
              <RoutePanel
                route={route}
                touring={touring}
                onFly={startTour}
                onStop={stopTour}
                onClear={() => setRouteIds([])}
                onRemove={(id) => setRouteIds((r) => r.filter((x) => x !== id))}
                onMove={moveInRoute}
                onSelect={(p) => flyTo(p)}
              />
            )}
            {sheet === 'view' && (
              <ViewMenu
                value={view}
                onChange={setView}
                animations={animations}
                reducedMotionSystem={reducedMotionSystem}
                onToggleAnimations={() => {
                  setAnimPref(!animPref);
                  showToast(animPref ? t.animationOff : t.animationOn);
                }}
              />
            )}
            {sheet === 'help' && (
              <>
                {pwa.mode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setInstallOpen(true);
                    }}
                    className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/20 to-lojuvard/30 p-3 text-left transition hover:border-gold/70"
                  >
                    <LogoMark size={36} className="shrink-0" />
                    <span className="flex-1 font-semibold text-white">{t.installApp}</span>
                    <Icon name="chevronRight" className="text-gold-light" />
                  </button>
                )}
                <HelpPanel />
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Masshtab tugmalari */}
      <div className={`absolute bottom-24 right-3 z-20 hidden flex-col gap-2 md:flex ${panelOpen ? 'md:hidden' : ''}`}>
        <button type="button" aria-label="Zoom +" onClick={() => globe.current?.zoomBy(0.7)} className="glass grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Zoom −" onClick={() => globe.current?.zoomBy(1.4)} className="glass grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
          <Icon name="minus" />
        </button>
      </div>

      {touring && !flight && (
        <button type="button" onClick={stopTour} className="glass-strong absolute left-1/2 top-[120px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm md:top-20">
          <Icon name="stop" size={14} filled className="text-red-400" /> {t.stopTour}
        </button>
      )}

      <FlightHud target={flight?.target ?? null} from={flight?.from ?? ''} progress={flightProgress} />
      <Intro show={showIntro} onSkip={() => { setShowIntro(false); setIntroSeen(true); }} />
      <Toast message={toast} />
      <InstallPrompt open={installOpen && !(panelOpen && !isDesktop) && !flight} mode={pwa.mode} reducedMotion={!animations} onInstall={runInstall} onClose={dismissInstall} />

      <AnimatePresence>
        {panelOpen && selected && places && (
          <PlacePanel
            key={selected.id}
            place={selected}
            allPlaces={places}
            home={home}
            initialTab={panelTab}
            isFavorite={favorites.includes(selected.id)}
            inRoute={routeIds.includes(selected.id)}
            reducedMotion={!animations}
            onToggleFavorite={() => toggleFavorite(selected.id)}
            onToggleRoute={() => toggleRoute(selected.id)}
            onClose={closePanel}
            onFlyTo={(p) => flyTo(p)}
            onToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Yuklanish ekrani */}
      <AnimatePresence>
        {(!places || !ready) && (
          <motion.div className="absolute inset-0 z-50 grid place-items-center bg-night-950" exit={{ opacity: 0, transition: { duration: 0.6 } }} role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-4">
              <div className="relative grid place-items-center">
                <div className="loader absolute h-[92px] w-[92px]" aria-hidden="true" />
                <LogoMark size={64} />
              </div>
              <p className="font-display text-xl"><span className="text-white">Fly</span><span className="text-gradient">Tale</span></p>
              <p className="text-sm text-white/60">{t.loading}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DockBtn({ icon, label, onClick, active, badge, accent, compact }: { icon: IconName; label: string; onClick: () => void; active?: boolean; badge?: number; accent?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-[10.5px] font-semibold transition hover:bg-white/10 min-[400px]:px-2 min-[400px]:text-[11px] md:flex-none md:flex-row md:gap-2 md:px-3.5 md:py-2.5 md:text-sm ${active ? 'bg-white/10 text-turquoise' : accent ? 'text-gold-light' : 'text-white/85'}`}
    >
      <Icon name={icon} size={20} />
      <span className={`whitespace-nowrap ${compact ? 'md:sr-only' : ''}`}>{label}</span>
      {badge !== undefined && (
        <span className="absolute right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-night-900 md:-right-1 md:-top-1.5">{badge}</span>
      )}
    </button>
  );
}
