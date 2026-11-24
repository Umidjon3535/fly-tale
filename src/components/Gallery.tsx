import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category, WikiImage } from '../data/types';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORY_COLOR, CATEGORY_ICON } from '../lib/categories';
import { Icon } from '../lib/icons';
import { fetchWikimediaImages } from '../services/wikimedia';

interface Props {
  query: string;
  title: string;
  category: Category;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; images: WikiImage[] };

/** Rasm yuklanmaganda chiqadigan chiroyli zaxira tasvir */
export function Placeholder({ title, category, note }: { title: string; category: Category; note?: string }) {
  const color = CATEGORY_COLOR[category];
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden text-center"
      style={{ background: `radial-gradient(circle at 30% 20%, ${color}33, transparent 60%), linear-gradient(160deg, #1b3a8c 0%, #0a1230 70%)` }}
    >
      <div className="girih absolute inset-0 opacity-25" aria-hidden="true" />
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative">
        <path d={CATEGORY_ICON[category]} />
      </svg>
      <p className="font-display relative max-w-[80%] text-base text-white/90">{title}</p>
      {note && <p className="relative text-xs text-white/55">{note}</p>}
    </div>
  );
}

function ImageWithFallback({ img, title, category, className, eager }: { img: WikiImage; title: string; category: Category; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [img.thumbUrl]);
  if (failed) return <Placeholder title={title} category={category} />;
  return (
    <>
      {!loaded && <div className="shimmer absolute inset-0" aria-hidden="true" />}
      <img
        src={img.thumbUrl}
        alt={img.description || title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${className ?? ''} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}

export function Gallery({ query, title, category }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    setIndex(0);
    fetchWikimediaImages(query)
      .then((images) => alive && setState({ status: 'ready', images }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [query]);

  if (state.status === 'loading') {
    return <div className="shimmer aspect-[16/10] max-h-[32dvh] w-full rounded-2xl md:max-h-[38dvh]" aria-busy="true" aria-label={t.gallery} />;
  }
  if (state.status === 'error' || state.images.length === 0) {
    return (
      <div className="aspect-[16/10] max-h-[32dvh] w-full overflow-hidden rounded-2xl md:max-h-[38dvh]">
        <Placeholder title={title} category={category} note={state.status === 'error' ? t.imagesError : t.noImages} />
      </div>
    );
  }

  const images = state.images;
  const img = images[index];
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <section aria-label={t.gallery} aria-roledescription="carousel">
      <div
        className="group relative aspect-[16/10] max-h-[32dvh] w-full overflow-hidden rounded-2xl bg-night-800 md:max-h-[38dvh]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
      >
        <button type="button" className="absolute inset-0 h-full w-full cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={t.zoomImage}>
          <ImageWithFallback key={img.thumbUrl} img={img} title={title} category={category} eager={index === 0} className="h-full w-full object-cover" />
        </button>
        {images.length > 1 && (
          <>
            <CarouselBtn dir="left" label={t.prev} onClick={() => go(-1)} />
            <CarouselBtn dir="right" label={t.next} onClick={() => go(1)} />
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
              {images.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white/90" aria-live="polite">
          {index + 1} / {images.length}
        </span>
      </div>
      <Attribution img={img} />

      {images.length > 1 && (
        <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button
              key={im.thumbUrl}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${images.length}`}
              aria-current={i === index}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === index ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={im.thumbUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            </button>
          ))}
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {lightbox && <Lightbox images={images} index={index} setIndex={setIndex} onClose={() => setLightbox(false)} title={title} category={category} />}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}

function CarouselBtn({ dir, label, onClick }: { dir: 'left' | 'right'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 ${dir === 'left' ? 'left-2' : 'right-2'} grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100`}
    >
      <Icon name={dir === 'left' ? 'chevronLeft' : 'chevronRight'} />
    </button>
  );
}

/** Muallif va litsenziya — Wikimedia talablariga ko'ra majburiy */
function Attribution({ img, dark }: { img: WikiImage; dark?: boolean }) {
  const { t } = useI18n();
  return (
    <p className={`mt-1.5 text-[11px] leading-snug ${dark ? 'text-white/75' : 'text-white/55'}`}>
      {t.photoBy}: <span className="text-white/80">{img.author}</span> · {t.license}:{' '}
      {img.licenseUrl ? (
        <a href={img.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:text-turquoise">
          {img.license}
        </a>
      ) : (
        img.license
      )}{' '}
      ·{' '}
      <a href={img.pageUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 hover:text-turquoise">
        Wikimedia Commons
      </a>
    </p>
  );
}

function Lightbox({
  images,
  index,
  setIndex,
  onClose,
  title,
  category,
}: {
  images: WikiImage[];
  index: number;
  setIndex: (fn: (i: number) => number) => void;
  onClose: () => void;
  title: string;
  category: Category;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = (d: number) => {
    setZoom(false);
    setIndex((i) => (i + d + images.length) % images.length);
  };

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const img = images[index];
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between p-3 text-sm text-white/80">
        <span>
          {index + 1} / {images.length}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <Icon name="close" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2">
        <div
          className={`relative h-full w-full ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            setZoom((z) => !z);
          }}
        >
          <div
            className="relative h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom ? 2.2 : 1})`, transformOrigin: origin }}
          >
            <ImageWithFallback key={img.thumbUrl} img={img} title={title} category={category} eager className="h-full w-full object-contain" />
          </div>
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t.prev} className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={t.next} className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <Icon name="chevronRight" />
            </button>
          </>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {img.description && <p className="text-sm text-white/85">{img.description}</p>}
        <Attribution img={img} dark />
      </div>
    </motion.div>
  );
}
