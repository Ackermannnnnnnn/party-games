import { useEffect, useState } from 'react';

/**
 * La bombe au centre de l'arène, avec la syllabe et une mèche qui crépite.
 * Elle s'agite de plus en plus vite à mesure que le temps passe (sans révéler quand elle explose).
 */
export default function Bomb({ syllable, bombStartedAt, angle = null, size = 168 }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const elapsed = bombStartedAt ? (now - bombStartedAt) / 1000 : 0;
  const speed = elapsed > 16 ? 0.28 : elapsed > 10 ? 0.45 : elapsed > 5 ? 0.75 : 1.2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Flèche vers le joueur qui a la bombe */}
      {angle !== null && (
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${angle}deg)` }}
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: size * 0.02, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: '22px solid #fb923c', filter: 'drop-shadow(0 0 6px rgba(251,146,60,.8))' }}
          />
        </div>
      )}
      <div className="bp-wobble" style={{ '--bp-speed': `${speed}s` }}>
        <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="bp-body" cx="38%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="55%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
          </defs>
          {/* Mèche */}
          <path d="M128 52 C 140 30, 158 34, 162 18" stroke="#d6b98c" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="bp-spark">
            <circle cx="163" cy="16" r="10" fill="#fde047" />
            <circle cx="163" cy="16" r="5" fill="#fff7ed" />
          </g>
          <rect x="112" y="46" width="30" height="20" rx="4" transform="rotate(35 127 56)" fill="#374151" />
          {/* Corps */}
          <circle cx="100" cy="112" r="72" fill="url(#bp-body)" />
          <ellipse cx="74" cy="82" rx="18" ry="11" fill="rgba(255,255,255,0.18)" transform="rotate(-30 74 82)" />
        </svg>
      </div>
      {/* Syllabe */}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: size * 0.47 }}>
        <span
          className="px-4 py-1 rounded-xl bg-white text-slate-900 font-black uppercase tracking-wider shadow-lg"
          style={{ fontSize: size * 0.2 }}
          aria-label={`Syllabe : ${syllable}`}
        >
          {syllable}
        </span>
      </div>
    </div>
  );
}
