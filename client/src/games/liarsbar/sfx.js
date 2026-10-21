/**
 * Sons de Liar's Bar.
 *  - Bruitages synthétisés en direct (Web Audio) : aucun fichier à télécharger.
 *  - Musique de bar : fichier libre de droits déposé dans client/public/sounds/liarsbar-music.mp3
 * Deux volumes séparés (musique / bruitages), gardés sur l'appareil.
 */
import { useEffect, useState } from 'react';

export const MUSIC_URL = '/sounds/liarsbar-music.mp3';
const KEY = 'liarsbarVolumes';

let ctx = null;
let sfxGain = null;
let noiseBuf = null;
let music = null;
const vols = (() => { try { return { music: 0.35, sfx: 0.8, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { music: 0.35, sfx: 0.8 }; } })();
const listeners = new Set();

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = vols.sfx;
    sfxGain.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** À appeler sur un clic : débloque le son (mobile) et lance la musique si présente. */
export function unlockSound() {
  ac();
  startMusic();
}

function noise(t, dur, { gain = 0.5, type = 'bandpass', freq = 2000, q = 1, attack = 0.002 } = {}) {
  const c = ac(); if (!c) return;
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t); src.stop(t + dur + 0.05);
}

function tone(t, dur, { freq = 440, type = 'sine', gain = 0.3, endFreq } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  card() { const c = ac(); if (!c) return; noise(c.currentTime, 0.09, { freq: 3500, q: 0.8, gain: 0.35 }); },
  deal(n = 5) { const c = ac(); if (!c) return; for (let i = 0; i < n; i++) noise(c.currentTime + i * 0.11, 0.08, { freq: 3000 + Math.random() * 1500, q: 0.9, gain: 0.3 }); },
  flip() { const c = ac(); if (!c) return; const t = c.currentTime; noise(t, 0.06, { freq: 2500, gain: 0.3 }); noise(t + 0.07, 0.07, { freq: 1800, gain: 0.25 }); },
  liar() { const c = ac(); if (!c) return; const t = c.currentTime; tone(t, 0.6, { freq: 110, type: 'sawtooth', gain: 0.18, endFreq: 70 }); tone(t, 0.5, { freq: 165, type: 'square', gain: 0.06, endFreq: 100 }); noise(t, 0.25, { type: 'lowpass', freq: 400, gain: 0.4 }); },
  /** Barillet qui tourne (cliquetis qui ralentissent). */
  spin(durationMs = 3400) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime;
    let t = 0; let gap = 0.035;
    while (t < durationMs / 1000 - 0.3) {
      noise(t0 + t, 0.025, { freq: 4200, q: 4, gain: 0.25 });
      tone(t0 + t, 0.02, { freq: 2400, type: 'square', gain: 0.02 });
      t += gap; gap *= 1.07;
    }
  },
  /** Chien qui s'arme, juste avant le résultat. */
  cock() { const c = ac(); if (!c) return; const t = c.currentTime; noise(t, 0.04, { freq: 2200, q: 6, gain: 0.5 }); noise(t + 0.09, 0.05, { freq: 1500, q: 5, gain: 0.45 }); },
  click() { const c = ac(); if (!c) return; const t = c.currentTime; noise(t, 0.03, { freq: 3000, q: 8, gain: 0.7 }); tone(t, 0.04, { freq: 1800, type: 'square', gain: 0.05 }); },
  bang() {
    const c = ac(); if (!c) return; const t = c.currentTime;
    noise(t, 0.9, { type: 'lowpass', freq: 3000, q: 0.5, gain: 1.0, attack: 0.001 });
    noise(t, 0.35, { type: 'highpass', freq: 1500, gain: 0.6, attack: 0.001 });
    tone(t, 0.5, { freq: 120, type: 'sine', gain: 0.9, endFreq: 40 });
  },
  win() { const c = ac(); if (!c) return; const t = c.currentTime; [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, 0.35, { freq: f, type: 'triangle', gain: 0.15 })); },
  tick() { const c = ac(); if (!c) return; tone(c.currentTime, 0.05, { freq: 900, type: 'square', gain: 0.04 }); },
};

// ───────── Musique ─────────
function startMusic() {
  if (typeof Audio === 'undefined') return;
  if (!music) {
    music = new Audio(MUSIC_URL);
    music.loop = true;
    music.preload = 'auto';
    music.addEventListener('error', () => { music.dataset.missing = '1'; emit(); });
  }
  music.volume = vols.music;
  if (music.dataset.missing) return;
  music.play().catch(() => {});
}

export function stopMusic() {
  if (music) { music.pause(); music.currentTime = 0; }
}

export const musicMissing = () => !!music?.dataset?.missing;

function emit() { listeners.forEach((fn) => fn({ ...vols, missing: musicMissing() })); }

export function setVolume(kind, v) {
  vols[kind] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(KEY, JSON.stringify(vols)); } catch {}
  if (kind === 'sfx' && sfxGain) sfxGain.gain.value = vols.sfx;
  if (kind === 'music' && music) music.volume = vols.music;
  emit();
}

/** Hook : volumes actuels (+ musique absente ?). */
export function useVolumes() {
  const [state, setState] = useState({ ...vols, missing: musicMissing() });
  useEffect(() => { listeners.add(setState); return () => listeners.delete(setState); }, []);
  return state;
}
