import { Howl, Howler } from 'howler';

/**
 * Sons d'événements. Initialisés une seule fois au premier import.
 * Si un fichier .mp3 manque, Howler échoue silencieusement, le jeu continue.
 *
 * Pour les remplacer/ajouter, déposez les fichiers dans `client/public/sounds/`
 * (et `client/public/sounds/werewolf/` pour ceux du loup-garou).
 */
const SOUNDS_DEF = {
  // Génériques
  vote:      { src: '/sounds/vote.mp3',     volume: 0.5 },
  reveal:    { src: '/sounds/reveal.mp3',   volume: 0.5 },
  victory:   { src: '/sounds/victory.mp3',  volume: 0.6 },
  defeat:    { src: '/sounds/defeat.mp3',   volume: 0.6 },
  tick:      { src: '/sounds/tick.mp3',     volume: 0.3 },

  // Loup-Garou
  ww_night:        { src: '/sounds/werewolf/night.mp3',         volume: 0.5 },
  ww_wolves:       { src: '/sounds/werewolf/wolves_howl.mp3',   volume: 0.6 },
  ww_seer:         { src: '/sounds/werewolf/seer.mp3',          volume: 0.5 },
  ww_witch:        { src: '/sounds/werewolf/witch.mp3',         volume: 0.5 },
  ww_guard:        { src: '/sounds/werewolf/guard.mp3',         volume: 0.5 },
  ww_cupid:        { src: '/sounds/werewolf/cupid.mp3',         volume: 0.5 },
  ww_day:          { src: '/sounds/werewolf/rooster.mp3',       volume: 0.5 },
  ww_death:        { src: '/sounds/werewolf/death.mp3',         volume: 0.6 },
  ww_hunter:       { src: '/sounds/werewolf/hunter_shot.mp3',   volume: 0.6 },
  ww_lover:        { src: '/sounds/werewolf/heart_break.mp3',   volume: 0.5 },
  ww_lynch:        { src: '/sounds/werewolf/crowd_gasp.mp3',    volume: 0.5 },
  ww_village_win:  { src: '/sounds/werewolf/village_win.mp3',   volume: 0.6 },
  ww_wolves_win:   { src: '/sounds/werewolf/wolves_win.mp3',    volume: 0.6 },
};

// Initialisation immédiate (synchrone, dès l'import du module)
const _sounds = {};
try {
  for (const [key, def] of Object.entries(SOUNDS_DEF)) {
    _sounds[key] = new Howl({ src: [def.src], volume: def.volume, html5: false });
  }
} catch (e) {
  // Si Howler n'est pas dispo (SSR ?), on ignore
  console.warn('[sounds] init failed:', e);
}

/**
 * Hook qui retourne `play(name)`.
 * - Synchrone : pas d'attente d'un useEffect, on peut appeler play() au render.
 * - Tente de débloquer l'AudioContext si suspendu (auto-pause des navigateurs).
 */
export function useSounds() {
  return {
    play: (name) => {
      try {
        // Resume audio context si le navigateur l'a suspendu
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume?.();
        }
        const s = _sounds[name];
        if (s) s.play();
      } catch (e) {
        console.warn('[sounds] play failed:', name, e);
      }
    },
  };
}

/**
 * Petit carillon "c'est ton tour" (deux notes), généré à la volée : aucun fichier .mp3 requis.
 * Branché sur la sortie de Howler, donc il respecte le bouton 🔊/🔇 et le volume global.
 */
export function playTurnChime() {
  try {
    const ctx = Howler.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume?.();
    const out = Howler.masterGain || ctx.destination;
    const now = ctx.currentTime;
    [[880, 0], [1318.5, 0.14]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  } catch (e) {
    console.warn('[sounds] turn chime failed:', e);
  }
}

/** Volume global (0..1). Persistant via localStorage. */
export function setGlobalVolume(v) {
  const vol = Math.max(0, Math.min(1, Number(v) || 0));
  Howler.volume(vol);
  try { localStorage.setItem('soundVolume', String(vol)); } catch {}
}

// Charge le volume précédent au démarrage
try {
  const stored = parseFloat(localStorage.getItem('soundVolume') || '1');
  if (!Number.isNaN(stored)) Howler.volume(Math.max(0, Math.min(1, stored)));
} catch {}
