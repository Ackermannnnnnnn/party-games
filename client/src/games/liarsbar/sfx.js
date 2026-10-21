/**
 * Sons de Liar's Bar, synthétisés en direct (Web Audio) : aucun fichier à télécharger.
 *  - chaîne : bruitages → compresseur → sortie, avec un envoi vers une réverbération « salle de bar »
 *  - ambiance : brouhaha sourd de bar (ou la musique client/public/sounds/liarsbar-music.mp3 si elle existe)
 * Deux volumes séparés (ambiance / bruitages), gardés sur l'appareil.
 */
import { useEffect, useState } from 'react';

export const MUSIC_URL = '/sounds/liarsbar-music.mp3';
const KEY = 'liarsbarVolumes';

let ctx = null;
let sfxGain = null;   // volume des bruitages
let dry = null;       // entrée sans écho
let wet = null;       // entrée de la réverbération
let ambGain = null;   // volume de l'ambiance
let noiseBuf = null;
let music = null;
let ambience = null;
const vols = (() => { try { return { music: 0.5, sfx: 0.9, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { music: 0.5, sfx: 0.9 }; } })();
const listeners = new Set();

/** Réponse impulsionnelle d'une petite salle en bois (≈ 1,6 s). */
function roomImpulse(c, seconds = 1.6) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; // un peu étouffé (bois, tissus)
      d[i] = lp * Math.pow(1 - t, 3.2) * (i < c.sampleRate * 0.012 ? 0.3 : 1);
    }
  }
  return buf;
}

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vols.sfx; sfxGain.connect(comp);
    dry = ctx.createGain(); dry.connect(sfxGain);
    const verb = ctx.createConvolver(); verb.buffer = roomImpulse(ctx);
    wet = ctx.createGain(); wet.gain.value = 0.9; wet.connect(verb); verb.connect(sfxGain);
    ambGain = ctx.createGain(); ambGain.gain.value = vols.music * 0.5; ambGain.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Les navigateurs bloquent le son tant qu'on n'a pas touché la page : on le débloque au premier geste, où qu'il soit.
if (typeof window !== 'undefined') {
  const unlock = () => { const c = ac(); if (c && c.state === 'running') { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); } };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

/** À appeler sur un clic : débloque le son (mobile) et lance l'ambiance. */
export function unlockSound() {
  ac();
  startMusic();
}

// ───────── Briques de son ─────────
/** Bruit filtré avec enveloppe. `sweep` = fréquence d'arrivée du filtre. */
function noise(t, dur, { gain = 0.5, type = 'bandpass', freq = 2000, sweep, q = 1, attack = 0.002, verb = 0.15 } = {}) {
  const c = ac(); if (!c) return;
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dry);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s); s.connect(wet); }
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}

function tone(t, dur, { freq = 440, type = 'sine', gain = 0.3, endFreq, attack = 0.002, verb = 0.1 } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dry);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s); s.connect(wet); }
  o.start(t); o.stop(t + dur + 0.05);
}

/** Clic métallique (mécanisme du revolver) : attaque sèche + résonances de l'acier. */
function metal(t, { gain = 0.8, base = 2200, verb = 0.12 } = {}) {
  noise(t, 0.012, { type: 'highpass', freq: 2500, gain: gain * 1.1, attack: 0.0005, verb });
  noise(t, 0.04, { type: 'bandpass', freq: base * 1.6, q: 9, gain: gain * 0.6, attack: 0.0005, verb });
  [1, 2.76, 5.4].forEach((m, i) => tone(t, 0.05 - i * 0.012, { freq: base * m, gain: gain * (0.18 / (i + 1)), attack: 0.0005, verb }));
  tone(t, 0.03, { freq: 180, gain: gain * 0.25, endFreq: 90, attack: 0.001, verb: 0 });
}

const now = () => (ac() ? ctx.currentTime : 0);

export const sfx = {
  /** Cartes qui glissent sur le bois puis se posent. */
  card(n = 1) {
    if (!ac()) return; const t0 = now();
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.09;
      noise(t, 0.16, { freq: 1600, sweep: 4200, q: 0.8, gain: 0.55, attack: 0.02 });
      noise(t + 0.13, 0.07, { type: 'lowpass', freq: 900, gain: 0.7, verb: 0.2 });
      tone(t + 0.13, 0.08, { freq: 150, endFreq: 70, gain: 0.35 });
    }
  },
  /** Distribution : une volée de cartes. */
  deal(n = 6) {
    if (!ac()) return; const t0 = now();
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.13;
      noise(t, 0.1, { freq: 2200, sweep: 5200, q: 0.9, gain: 0.45, attack: 0.008 });
      noise(t + 0.08, 0.04, { type: 'lowpass', freq: 1100, gain: 0.4 });
    }
  },
  /** Carte qu'on retourne. */
  flip() {
    if (!ac()) return; const t = now();
    noise(t, 0.035, { type: 'highpass', freq: 2600, gain: 0.8, attack: 0.001 });
    noise(t + 0.03, 0.08, { freq: 1300, q: 1.2, gain: 0.45 });
  },
  /** « Menteur ! » : poing sur la table + accord grave. */
  liar() {
    if (!ac()) return; const t = now();
    tone(t, 0.4, { freq: 75, endFreq: 38, gain: 1, attack: 0.001, verb: 0.3 });
    noise(t, 0.3, { type: 'lowpass', freq: 380, gain: 1, attack: 0.001, verb: 0.5 });
    noise(t, 0.06, { type: 'bandpass', freq: 1800, q: 1, gain: 0.5, attack: 0.001 });
    [55, 82.4, 110, 164.8].forEach((f) => tone(t + 0.05, 1.6, { freq: f, type: 'sawtooth', gain: 0.07, attack: 0.04, verb: 0.6 }));
  },
  /** Barillet qu'on fait tourner : cliquetis qui ralentissent. */
  spin(durationMs = 3000) {
    if (!ac()) return; const t0 = now();
    noise(t0, 0.25, { freq: 3000, sweep: 1500, q: 2, gain: 0.25, attack: 0.01 }); // le geste
    let t = 0.05; let gap = 0.028;
    while (t < durationMs / 1000 - 0.25) {
      metal(t0 + t, { gain: 0.32, base: 2600 + Math.random() * 500, verb: 0.05 });
      t += gap; gap *= 1.075;
    }
  },
  /** Le chien qu'on arme. */
  cock() {
    if (!ac()) return; const t = now();
    metal(t, { gain: 0.8, base: 1700 });
    metal(t + 0.11, { gain: 1, base: 2300 });
  },
  /** Percussion à vide : *clic*. */
  click() {
    if (!ac()) return; const t = now();
    metal(t, { gain: 1.2, base: 2000, verb: 0.35 });
    tone(t + 0.02, 0.6, { freq: 220, gain: 0.05, verb: 0.4 }); // soupir de soulagement de la salle
  },
  /** Coup de feu : claquement, souffle, grondement, écho de la salle et sifflement d'oreilles. */
  bang() {
    const c = ac(); if (!c) return; const t = now();
    noise(t, 0.006, { type: 'highpass', freq: 800, gain: 1.6, attack: 0.0003, verb: 1 });
    noise(t, 0.45, { type: 'lowpass', freq: 3500, sweep: 300, q: 0.4, gain: 1.4, attack: 0.0008, verb: 1.2 });
    noise(t + 0.01, 0.9, { type: 'lowpass', freq: 600, sweep: 120, gain: 0.9, attack: 0.003, verb: 1.4 });
    tone(t, 0.55, { freq: 95, endFreq: 30, gain: 1.3, attack: 0.0005, verb: 0.6 });
    tone(t + 0.25, 2.8, { freq: 4100, gain: 0.035, attack: 0.3, verb: 0 }); // acouphène
    if (ambGain) { ambGain.gain.cancelScheduledValues(t); ambGain.gain.setValueAtTime(0.0001, t); ambGain.gain.linearRampToValueAtTime(vols.music * 0.5, t + 3.5); }
    if (music) { const v = music.volume; music.volume = v * 0.15; setTimeout(() => { if (music) music.volume = vols.music; }, 3000); }
  },
  /** Battements de cœur pendant le suspense. */
  heartbeat(durationMs = 3000) {
    if (!ac()) return; const t0 = now();
    let t = 0; let gap = 0.8;
    while (t < durationMs / 1000 - 0.2) {
      tone(t0 + t, 0.14, { freq: 58, endFreq: 40, gain: 0.7, attack: 0.008, verb: 0.05 });
      tone(t0 + t + 0.17, 0.12, { freq: 52, endFreq: 38, gain: 0.5, attack: 0.008, verb: 0.05 });
      t += gap; gap = Math.max(0.42, gap * 0.9);
    }
  },
  /** C'est à toi de jouer. */
  yourTurn() {
    if (!ac()) return; const t = now();
    tone(t, 0.5, { freq: 660, type: 'triangle', gain: 0.12, verb: 0.4 });
    tone(t + 0.09, 0.6, { freq: 990, type: 'triangle', gain: 0.09, verb: 0.4 });
  },
  win() { if (!ac()) return; const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, 0.6, { freq: f, type: 'triangle', gain: 0.16, verb: 0.5 })); },
  tick() { if (!ac()) return; tone(now(), 0.05, { freq: 900, type: 'square', gain: 0.04, verb: 0 }); },
};

// ───────── Ambiance : musique si le fichier existe, sinon brouhaha de bar ─────────
function startAmbience() {
  const c = ac(); if (!c || ambience) return;
  // grondement de salle + murmure de voix (bruit filtré dont le volume ondule)
  const room = c.createBufferSource(); room.buffer = noiseBuf; room.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const rg = c.createGain(); rg.gain.value = 0.22;
  room.connect(lp); lp.connect(rg); rg.connect(ambGain);
  const voices = c.createBufferSource(); voices.buffer = noiseBuf; voices.loop = true; voices.playbackRate.value = 0.7;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 1.4;
  const vg = c.createGain(); vg.gain.value = 0.12;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.23;
  const lfoG = c.createGain(); lfoG.gain.value = 0.06;
  lfo.connect(lfoG); lfoG.connect(vg.gain);
  voices.connect(bp); bp.connect(vg); vg.connect(ambGain);
  room.start(); voices.start(); lfo.start();
  // de temps en temps un verre qui tinte au loin
  const clink = () => {
    if (!ambience) return;
    const t = c.currentTime;
    const f = 2400 + Math.random() * 1800;
    [1, 2.4, 4.1].forEach((m, i) => { const o = c.createOscillator(); o.frequency.value = f * m; const g = c.createGain(); g.gain.setValueAtTime(0.012 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); o.connect(g); g.connect(ambGain); o.start(t); o.stop(t + 0.9); });
    ambience.timer = setTimeout(clink, 4000 + Math.random() * 9000);
  };
  ambience = { stop: () => { try { room.stop(); voices.stop(); lfo.stop(); } catch { /* déjà arrêté */ } clearTimeout(ambience?.timer); } };
  ambience.timer = setTimeout(clink, 3000);
}

function startMusic() {
  if (typeof Audio === 'undefined') return;
  if (!music) {
    music = new Audio(MUSIC_URL);
    music.loop = true;
    music.preload = 'auto';
    music.addEventListener('error', () => { music.dataset.missing = '1'; startAmbience(); emit(); });
  }
  music.volume = vols.music;
  if (music.dataset.missing) { startAmbience(); return; }
  music.play().catch(() => {});
}

export function stopMusic() {
  if (music) { music.pause(); music.currentTime = 0; }
  if (ambience) { ambience.stop(); ambience = null; }
}

export const musicMissing = () => !!music?.dataset?.missing;

function emit() { listeners.forEach((fn) => fn({ ...vols, missing: musicMissing() })); }

export function setVolume(kind, v) {
  vols[kind] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(KEY, JSON.stringify(vols)); } catch {}
  if (kind === 'sfx' && sfxGain) sfxGain.gain.value = vols.sfx;
  if (kind === 'music') { if (music) music.volume = vols.music; if (ambGain) ambGain.gain.value = vols.music * 0.5; }
  emit();
}

/** Hook : volumes actuels (+ musique absente ?). */
export function useVolumes() {
  const [state, setState] = useState({ ...vols, missing: musicMissing() });
  useEffect(() => { listeners.add(setState); return () => listeners.delete(setState); }, []);
  return state;
}
