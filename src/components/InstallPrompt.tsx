import { AnimatePresence, motion } from 'framer-motion';
import type { InstallMode } from '../hooks/usePwaInstall';
import { useI18n } from '../i18n/I18nContext';
import { Icon } from '../lib/icons';
import { LogoMark } from './Logo';

interface Props {
  open: boolean;
  mode: InstallMode;
  reducedMotion: boolean;
  onInstall: () => void;
  onClose: () => void;
}

/** "FlyTale ilovasini o'rnating" taklifi. Android/Chrome/Edge — bitta tugma; iPhone — qisqa yo'riqnoma. */
export function InstallPrompt({ open, mode, reducedMotion, onInstall, onClose }: Props) {
  const { t } = useI18n();
  const show = open && mode !== 'none';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="install-title"
          className="glass-strong fixed inset-x-2 bottom-[88px] z-40 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:inset-x-auto md:bottom-auto md:right-4 md:top-20 md:w-[380px]"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0f1f52] to-night-950 ring-1 ring-white/15">
              <LogoMark size={46} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="install-title" className="font-display text-base leading-snug text-white">
                {t.installTitle}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-white/70">{t.installText}</p>
            </div>
            <button type="button" onClick={onClose} aria-label={t.close} className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
              <Icon name="close" size={16} />
            </button>
          </div>

          {mode === 'prompt' ? (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onInstall} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold-light to-gold text-sm font-bold text-night-900 shadow-[0_6px_20px_rgba(226,166,59,0.4)] transition hover:brightness-110 active:scale-[0.98]">
                <Icon name="plus" size={18} strokeWidth={2.4} /> {t.installBtn}
              </button>
              <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/80 hover:bg-white/10">
                {t.installLater}
              </button>
            </div>
          ) : (
            <ol className="mt-4 space-y-2 rounded-2xl bg-white/[0.05] p-3 text-[13px] text-white/85">
              <li className="flex items-center gap-2.5">
                <Step n={1} />
                <span>
                  {t.iosStep1} <Icon name="share" size={16} className="-mt-0.5 inline text-turquoise" />
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Step n={2} />
                <span>
                  {t.iosStep2} <span className="inline-grid h-5 w-5 place-items-center rounded border border-white/40 align-middle"><Icon name="plus" size={12} /></span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Step n={3} />
                <span>{t.iosStep3}</span>
              </li>
            </ol>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-night-900">{n}</span>;
}
