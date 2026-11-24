import { useMemo, useState } from 'react';
import { CONTACT } from '../config';
import { countryName } from '../data/countries';
import type { Place, TravelStyle, VisaStatus } from '../data/types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useI18n } from '../i18n/I18nContext';
import { distanceKm, type LatLng } from '../lib/geo';
import { Icon, type IconName } from '../lib/icons';
import {
  addDays,
  estimateTrip,
  flightsUrl,
  formatMoney,
  formatRange,
  hotelsUrl,
  partnersFor,
  recommendedNights,
  TRAIN_URL,
  travel,
} from '../lib/tripCost';

interface Props {
  place: Place;
  home: LatLng;
  onToast: (msg: string) => void;
}

interface TripPrefs {
  origin: string;
  travelers: number;
  style: TravelStyle;
}

const VISA_UI: Record<VisaStatus, { color: string; icon: IconName }> = {
  domestic: { color: '#5fd38d', icon: 'pin' },
  free: { color: '#5fd38d', icon: 'sparkle' },
  evisa: { color: '#1fb5c4', icon: 'globe' },
  required: { color: '#e2a63b', icon: 'ticket' },
  check: { color: '#ff9f7a', icon: 'info' },
};

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export function TripPlanner({ place, home, onToast }: Props) {
  const { t, tr, lang } = useI18n();

  // Foydalanuvchiga eng yaqin aeroport — standart jo'nash nuqtasi
  const nearestOrigin = useMemo(
    () => [...travel.origins].sort((a, b) => distanceKm(home, a) - distanceKm(home, b))[0]?.airport ?? 'TAS',
    [home],
  );
  const [prefs, setPrefs] = useLocalStorage<TripPrefs>('tg:trip', { origin: nearestOrigin, travelers: 2, style: 'standard' });
  const origin = travel.origins.find((o) => o.airport === prefs.origin) ?? travel.origins[0];
  const [nights, setNights] = useState(() => recommendedNights(place, origin));
  const [date, setDate] = useState(() => toInputDate(addDays(new Date(), 30)));

  const est = useMemo(
    () => estimateTrip({ place, origin, nights, travelers: prefs.travelers, style: prefs.style }),
    [place, origin, nights, prefs.travelers, prefs.style],
  );
  const partnerList = useMemo(() => partnersFor(place.country), [place.country]);

  const visa = est.country?.visa ?? 'check';
  const visaText =
    visa === 'domestic' ? t.visaDomestic
    : visa === 'free' ? t.visaFree
    : visa === 'evisa' ? t.visaEvisa
    : visa === 'required' ? (est.country?.visaType === 'schengen' ? t.visaSchengen : t.visaRequired)
    : t.visaCheck;
  const visaUi = VISA_UI[visa];
  const departDate = new Date(date + 'T00:00:00');
  const styleLabel = { budget: t.styleBudget, standard: t.styleStandard, comfort: t.styleComfort };
  const destCity = tr(place.city).split(/[(/]/)[0].trim();

  const copyRequest = async () => {
    const text = t.requestText
      .replace('{place}', tr(place.name))
      .replace('{country}', countryName(place.country, lang))
      .replace('{from}', tr(origin.name))
      .replace('{date}', date)
      .replace('{nights}', String(nights))
      .replace('{people}', String(prefs.travelers))
      .replace('{style}', styleLabel[prefs.style])
      .replace('{budget}', formatRange(est.total, lang));
    try {
      await navigator.clipboard.writeText(text);
      onToast(t.requestCopied);
    } catch {
      window.prompt(t.requestBtn, text);
    }
  };

  const hours = est.travelHours < 1 ? est.travelHours.toFixed(1) : Math.round(est.travelHours);

  return (
    <div className="space-y-5">
      {/* 1. Viza */}
      <section className="rounded-2xl border p-4" style={{ borderColor: visaUi.color + '66', background: visaUi.color + '14' }}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: visaUi.color + '30', color: visaUi.color }}>
            <Icon name={visaUi.icon} size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{t.visa}</p>
            <p className="font-semibold text-white">{visaText}</p>
            {visa !== 'domestic' && <p className="mt-1 text-xs leading-relaxed text-white/65">{visa === 'free' ? t.visaFreeHint + ' ' : ''}{t.visaHint}</p>}
            {est.country?.visaUrl && (
              <a href={est.country.visaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-turquoise hover:underline">
                {t.visaOfficial} ↗
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. Parametrlar */}
      <section className="grid grid-cols-2 gap-3">
        <Field label={t.tripFrom}>
          <select
            value={origin.airport}
            onChange={(e) => setPrefs({ ...prefs, origin: e.target.value })}
            className="h-11 w-full rounded-xl border border-white/15 bg-night-800/80 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-turquoise/70"
          >
            {travel.origins.map((o) => (
              <option key={o.airport} value={o.airport}>
                {tr(o.name)} ({o.airport})
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.tripDate}>
          <input
            type="date"
            value={date}
            min={toInputDate(new Date())}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/15 bg-night-800/80 px-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-turquoise/70"
          />
        </Field>
        <Field label={t.tripNights}>
          <Stepper value={nights} min={1} max={30} onChange={setNights} />
        </Field>
        <Field label={t.tripTravelers}>
          <Stepper value={prefs.travelers} min={1} max={10} onChange={(v) => setPrefs({ ...prefs, travelers: v })} />
        </Field>
        <div className="col-span-2">
          <Field label={t.tripStyle}>
            <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl border border-white/15 bg-night-800/60 p-1">
              {(['budget', 'standard', 'comfort'] as TravelStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={prefs.style === s}
                  onClick={() => setPrefs({ ...prefs, style: s })}
                  className={`h-9 rounded-lg text-xs font-semibold transition ${prefs.style === s ? 'bg-lojuvard text-white shadow-[0_0_0_1px_rgba(31,181,196,0.6)]' : 'text-white/70 hover:text-white'}`}
                >
                  {styleLabel[s]}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </section>

      {/* 3. Yo'l */}
      <section className="grid grid-cols-2 gap-2 text-sm">
        <Info icon="route" label={t.distance} value={`${Math.round(est.km).toLocaleString(lang)} ${t.km}`} />
        <Info
          icon={est.mode === 'flight' ? 'plane' : 'clock'}
          label={t.travelTime}
          value={`~${hours} ${t.hoursShort}`}
          sub={est.mode === 'flight' && est.km > 4000 ? t.transferLikely : undefined}
        />
      </section>

      {/* 4. Xarajatlar */}
      <section className="overflow-hidden rounded-2xl border border-white/10">
        <dl className="divide-y divide-white/[0.07] text-sm">
          <CostRow label={est.mode === 'flight' ? t.costTransportFlight : t.costTransportGround} value={formatRange(est.transport, lang)} sub={`${formatRange(est.transportPerPerson, lang)} × ${prefs.travelers}`} />
          <CostRow
            label={t.costStay}
            value={formatRange(est.stay, lang)}
            sub={t.costStayHint.replace('{days}', String(nights + 1)).replace('{people}', String(prefs.travelers)).replace('{daily}', formatMoney(est.dailyPerPerson, lang))}
          />
          <CostRow label={t.costContingency} value={formatRange(est.contingency, lang)} />
          <CostRow label={t.costEntry} value={t.costNotIncluded} muted />
          {visa !== 'domestic' && visa !== 'free' && <CostRow label={t.costVisa} value={t.costNotIncluded} muted />}
        </dl>
        <div className="bg-gradient-to-r from-lojuvard/60 to-night-800/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-white/60">{t.costTotal}</p>
          <p className="font-display text-xl text-gold-light">{formatRange(est.total, lang)}</p>
          <p className="text-xs text-white/65">
            ≈ {formatRange(est.perPerson, lang)} {t.costPerPerson}
          </p>
        </div>
      </section>
      <p className="text-[11px] leading-relaxed text-white/50">
        {t.estimateNote} {t.dataReviewed}: {travel.lastReviewed}.
      </p>

      {/* 5. Haqiqiy narxlar */}
      <section>
        <h3 className="font-display mb-2 text-base text-gold-light">{t.checkPrices}</h3>
        <div className="flex flex-wrap gap-2">
          {est.mode === 'flight' ? (
            <a className="action-btn" target="_blank" rel="noopener noreferrer" href={flightsUrl(origin.airport, place.airport, departDate, nights, prefs.travelers)}>
              <Icon name="plane" size={16} /> {t.searchFlights}
            </a>
          ) : (
            <a className="action-btn" target="_blank" rel="noopener noreferrer" href={TRAIN_URL}>
              <Icon name="route" size={16} /> {t.searchTrains}
            </a>
          )}
          <a className="action-btn" target="_blank" rel="noopener noreferrer" href={hotelsUrl(destCity, departDate, nights, prefs.travelers)}>
            <Icon name="pin" size={16} /> {t.searchHotels}
          </a>
        </div>
      </section>

      {/* 6. Hamkorlar */}
      <section>
        <h3 className="font-display mb-2 text-base text-gold-light">{t.partnersTitle}</h3>
        {partnerList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/70">
            <p>{t.partnersEmpty}</p>
            {(CONTACT.telegram || CONTACT.email) && (
              <a
                href={CONTACT.telegram ? `https://t.me/${CONTACT.telegram}` : `mailto:${CONTACT.email}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-semibold text-turquoise hover:underline"
              >
                {t.becomePartner} →
              </a>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {partnerList.map((p) => (
              <li key={p.id} className="rounded-2xl bg-white/[0.05] p-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{p.name}</span>
                  {p.verified && <span className="rounded-full bg-turquoise/20 px-2 py-0.5 text-[10px] font-bold text-turquoise">✓ {t.verifiedPartner}</span>}
                </div>
                {p.description && <p className="mt-1 text-xs text-white/65">{tr(p.description)}</p>}
                <p className="mt-1 text-xs text-white/55">{p.services.map((s) => t.svc[s]).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.telegram && <a className="action-btn" target="_blank" rel="noopener noreferrer" href={`https://t.me/${p.telegram}`}>Telegram</a>}
                  {p.phone && <a className="action-btn" href={`tel:${p.phone.replace(/\s/g, '')}`}>{p.phone}</a>}
                  {p.website && <a className="action-btn" target="_blank" rel="noopener noreferrer" href={p.website}>{t.contactPartner} ↗</a>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={copyRequest} className="btn-primary mt-3 w-full">
          <Icon name="share" size={16} /> {t.requestBtn}
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border border-white/15 bg-night-800/80 px-1">
      <button type="button" aria-label="−" disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-30">
        <Icon name="minus" size={16} />
      </button>
      <span className="text-base font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-30">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

function Info({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5">
      <Icon name={icon} size={16} className="mt-0.5 shrink-0 text-turquoise" />
      <div className="min-w-0">
        <p className="text-[11px] text-white/55">{label}</p>
        <p className="font-semibold text-white">{value}</p>
        {sub && <p className="text-[11px] text-white/50">{sub}</p>}
      </div>
    </div>
  );
}

function CostRow({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="min-w-0">
        <span className="text-white/85">{label}</span>
        {sub && <span className="block text-[11px] text-white/50">{sub}</span>}
      </dt>
      <dd className={`shrink-0 text-right ${muted ? 'max-w-[45%] text-xs text-gold-light/90' : 'font-semibold tabular-nums text-white'}`}>{value}</dd>
    </div>
  );
}
