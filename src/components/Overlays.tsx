import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '../data/types';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR } from '../lib/categories';
import { Icon } from '../lib/icons';

/** Birinchi kirishdagi qisqa intro */
export function Intro({ show, onSkip }: { show: boolean; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-end pb-[22vh] text-center md:justify-center md:pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <motion.h1
            className="font-display text-gradient text-4xl drop-shadow-xl sm:text-6xl"
            initial={{ y: 20, opacity: 0, letterSpacing: '0.3em' }}
            animate={{ y: 0, opacity: 1, letterSpacing: '0.02em' }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          >
            {t.introTitle}
          </motion.h1>
          <motion.p className="mt-3 max-w-sm px-6 text-base text-white/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}>
            {t.introText}
          </motion.p>
          <motion.button
            type="button"
            onClick={onSkip}
            className="pointer-events-auto mt-6 rounded-full border border-white/20 px-4 py-2 text-sm text-white/75 hover:bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {t.skipIntro}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Uchish paytidagi kichik ko'rsatkich */
export function FlightHud({ target, from, progress }: { target: string | null; from: string; progress: number }) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {target && (
        <motion.div
          role="status"
          aria-live="polite"
          className="glass-strong fixed left-1/2 top-[120px] z-20 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl px-4 py-3 md:top-20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="flex items-center gap-2 text-sm">
            <Icon name="plane" size={16} className="rotate-90 text-gold" />
            <span className="truncate text-white/70">{from}</span>
            <span className="text-white/40">→</span>
            <span className="truncate font-semibold text-white">{target}</span>
          </div>
          <span className="sr-only">
            {t.flyingTo} {target}
          </span>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-turquoise to-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div key={message} className="glass-strong rounded-full px-4 py-2 text-sm text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Yordam" menyusi: qanday foydalanish + belgilar */
export function HelpPanel() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{t.howTitle}</h3>
        <ol className="space-y-2">
          {t.howSteps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/85">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-night-900">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="border-t border-white/10 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">{t.legend}</h3>
        <Legend />
      </section>
      <p className="hidden border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/55 md:block">{t.keyboardHint}</p>
    </div>
  );
}

export function Legend() {
  const { t } = useI18n();
  return (
    <ul className="space-y-1.5" aria-label={t.legend}>
      {CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-2 text-xs text-white/85">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLOR[c], boxShadow: `0 0 8px ${CATEGORY_COLOR[c]}` }} />
          {t.cat[c]}
        </li>
      ))}
      <li className="flex items-center gap-2 border-t border-white/10 pt-1.5 text-xs text-white/85">
        <span className="h-3 w-3 rounded-full border-2 border-gold" />
        {t.uzbekistan}
      </li>
    </ul>
  );
}
