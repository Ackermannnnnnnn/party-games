import { useMemo } from 'react';

/** Décor : ciel (nuit, aube, jour…), étoiles, lune ou soleil, brume et silhouette du village. */
export default function Scene({ sky = 'night', children }) {
  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const r = (n) => { const x = Math.sin(i * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
    return { left: r(1) * 100, top: r(2) * 62, size: r(3) < 0.85 ? 1 + r(4) * 1.5 : 2.5, delay: r(5) * 4, dur: 2.5 + r(6) * 3 };
  }), []);
  const dark = sky === 'night' || sky === 'blood' || sky === 'rose';
  const showStars = sky === 'night' || sky === 'rose' || sky === 'blood';
  const houseColor = sky === 'day' || sky === 'gold' ? '#2a1a10' : sky === 'dawn' ? '#1f0f1c' : '#04050c';
  const lit = dark ? '#fbbf24' : 'transparent';

  return (
    <div className={`lg-scene lg-sky-${sky}`}>
      {showStars && (
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          {stars.map((s, i) => (
            <span key={i} className="lg-star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
        {sky === 'night' || sky === 'rose' ? <div className="lg-moon" /> : sky === 'blood' ? <div className="lg-moon" style={{ filter: 'sepia(1) saturate(6) hue-rotate(-30deg) brightness(0.8)' }} /> : <div className="lg-sun" />}
      </div>
      {dark && <div className="lg-fog" aria-hidden="true" />}
      <svg className="lg-village" viewBox="0 0 800 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ color: houseColor }}>
        <g fill="currentColor">
          <path d="M0 96 Q110 74 220 94 T430 90 T620 96 T800 88 V120 H0Z" />
          {/* maisons */}
          <rect x="52" y="80" width="46" height="30" /><polygon points="46,82 75,58 104,82" />
          <rect x="140" y="86" width="34" height="24" /><polygon points="135,88 157,70 179,88" />
          <rect x="450" y="78" width="54" height="34" /><polygon points="444,80 477,52 510,80" /><rect x="490" y="56" width="7" height="16" />
          <rect x="560" y="88" width="36" height="24" /><polygon points="555,90 578,72 601,90" />
          <rect x="690" y="82" width="44" height="28" /><polygon points="684,84 712,62 740,84" />
          {/* église */}
          <rect x="330" y="64" width="62" height="48" /><polygon points="326,66 361,42 396,66" />
          <rect x="300" y="44" width="24" height="68" /><polygon points="296,46 312,8 328,46" />
          <rect x="310.5" y="0" width="3" height="12" /><rect x="306" y="3" width="12" height="3" />
          {/* arbres */}
          <circle cx="240" cy="78" r="15" /><circle cx="252" cy="70" r="12" /><rect x="243" y="80" width="5" height="28" />
          <circle cx="640" cy="74" r="17" /><circle cx="626" cy="82" r="11" /><rect x="637" y="84" width="6" height="26" />
          <circle cx="770" cy="80" r="13" /><rect x="767" y="86" width="5" height="24" />
          <circle cx="20" cy="84" r="12" /><rect x="17" y="88" width="5" height="22" />
        </g>
        {/* fenêtres éclairées la nuit */}
        <g fill={lit} opacity="0.85">
          <rect x="64" y="88" width="7" height="7" /><rect x="80" y="88" width="7" height="7" />
          <rect x="151" y="93" width="6" height="6" />
          <rect x="462" y="88" width="8" height="8" /><rect x="484" y="88" width="8" height="8" />
          <rect x="356" y="78" width="10" height="16" rx="5" />
          <rect x="705" y="91" width="7" height="7" />
        </g>
      </svg>
      <div className="relative z-0 p-3 sm:p-5 pb-24 sm:pb-28">{children}</div>
    </div>
  );
}
