import { useId } from 'react';

/**
 * FlyTale belgisi: globus + oltin yoy bo'ylab uchayotgan samolyot.
 * Globus ustidagi 8 qirrali yulduz — Samarqand koshinlaridagi girih naqshi (O'zbekiston o'rnida).
 * Xuddi shu rasm public/favicon.svg va public/logo.svg fayllarida ham bor.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const g = `g${uid}`, t = `t${uid}`, c = `c${uid}`, h = `h${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={g} cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor="#4fd8e2" />
          <stop offset="0.5" stopColor="#1b3a8c" />
          <stop offset="1" stopColor="#081236" />
        </radialGradient>
        <radialGradient id={h} cx="50%" cy="50%" r="50%">
          <stop offset="0.7" stopColor="#1fb5c4" stopOpacity="0.45" />
          <stop offset="1" stopColor="#1fb5c4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={t} x1="8" y1="50" x2="48" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e2a63b" stopOpacity="0" />
          <stop offset="0.45" stopColor="#e2a63b" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f6d68a" />
        </linearGradient>
        <clipPath id={c}>
          <circle cx="29" cy="35" r="21" />
        </clipPath>
      </defs>

      {/* atmosfera nuri */}
      <circle cx="29" cy="35" r="27" fill={`url(#${h})`} />
      {/* globus */}
      <circle cx="29" cy="35" r="21" fill={`url(#${g})`} />
      <g clipPath={`url(#${c})`} fill="none" stroke="#a8eef3" strokeOpacity="0.32" strokeWidth="1.1">
        <ellipse cx="29" cy="35" rx="21" ry="7.5" />
        <ellipse cx="29" cy="35" rx="8.5" ry="21" />
        <path d="M8 35h42M29 14v42" />
      </g>
      <circle cx="29" cy="35" r="21" fill="none" stroke="#1fb5c4" strokeOpacity="0.7" strokeWidth="1.4" />

      {/* girih yulduzi — Samarqand */}
      <g transform="translate(34 30)" fill="#e2a63b">
        <rect x="-2.7" y="-2.7" width="5.4" height="5.4" />
        <rect x="-2.7" y="-2.7" width="5.4" height="5.4" transform="rotate(45)" />
        <circle r="1.3" fill="#081236" />
      </g>

      {/* uchish yoyi */}
      <path d="M7 50 C 14 30, 28 13, 47 10.5" fill="none" stroke={`url(#${t})`} strokeWidth="2.6" strokeLinecap="round" />

      {/* samolyot */}
      <g transform="translate(52.5 9.8) rotate(83)">
        <path
          d="M0-7.5C1.2-7.5 1.7-6 1.7-4.4V-1.4L7.6 2.1V3.9L1.7 2.2 1.3 5.6 3.2 7V8.3L0 7.4-3.2 8.3V7L-1.3 5.6-1.7 2.2-7.6 3.9V2.1L-1.7-1.4V-4.4C-1.7-6-1.2-7.5 0-7.5Z"
          fill="#ffffff"
          stroke="#081236"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** To'liq logo: belgi + "FlyTale" yozuvi */
export function Logo({ tagline, compact }: { tagline?: string; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 36 : 42} className="shrink-0 drop-shadow-[0_0_14px_rgba(31,181,196,0.45)]" />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[19px] tracking-tight">
            <span className="text-white">Fly</span>
            <span className="text-gradient">Tale</span>
          </span>
          {tagline && <span className="block text-[11px] text-white/60">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
