/**
 * Prop Hunt — sons synthétisés (aucun fichier). Les sons « dans le monde » (tirs, moqueries)
 * sont spatialisés : plus faibles avec la distance, à gauche ou à droite selon où ils se trouvent.
 */
let ctx = null; let master = null; let noiseBuf = null;
let volume = (() => { try { return Number(localStorage.getItem('prophuntVolume') ?? 0.8); } catch { return 0.8; } })();

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = volume; master.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => { const c = ac(); if (c?.state === 'running') { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); } };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

export function setVolume(v) { volume = v; if (master) master.gain.value = v; try { localStorage.setItem('prophuntVolume', String(v)); } catch {} }
export const getVolume = () => volume;

/** Sortie d'un son : volume et panoramique selon la position (listener = { x, z, yaw }). */
function out(pos, listener, base = 1) {
  const c = ac(); if (!c) return null;
  const g = c.createGain();
  let gain = base; let pan = 0;
  if (pos && listener) {
    const dx = pos[0] - listener.x; const dz = pos[2] - listener.z;
    const d = Math.hypot(dx, dz);
    gain *= Math.max(0.04, Math.min(1, 6 / (d + 2)));
    // à droite de la caméra = panoramique positif
    const rx = Math.cos(listener.yaw); const rz = -Math.sin(listener.yaw);
    pan = d > 0.5 ? Math.max(-0.9, Math.min(0.9, (dx * rx + dz * rz) / d)) : 0;
  }
  g.gain.value = gain;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master);
  return g;
}

function noise(dest, t, dur, { gain = 0.5, type = 'bandpass', freq = 2000, sweep, q = 1, attack = 0.002 } = {}) {
  const c = ctx; const src = c.createBufferSource(); src.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(dest, t, dur, { freq = 440, type = 'sine', gain = 0.3, end, attack = 0.005, vibrato = 0 } = {}) {
  const c = ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
  if (vibrato) { const l = c.createOscillator(); l.frequency.value = 7; const lg = c.createGain(); lg.gain.value = vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

const TAUNT_SOUNDS = {
  whistle: (d, t) => { tone(d, t, 0.35, { freq: 900, end: 2200, gain: 0.25 }); tone(d, t + 0.4, 0.5, { freq: 2200, end: 700, gain: 0.25 }); },
  boing: (d, t) => { tone(d, t, 0.6, { freq: 180, end: 520, type: 'triangle', gain: 0.4, vibrato: 30 }); },
  honk: (d, t) => { tone(d, t, 0.25, { freq: 330, type: 'sawtooth', gain: 0.18 }); tone(d, t, 0.25, { freq: 415, type: 'sawtooth', gain: 0.14 }); tone(d, t + 0.3, 0.4, { freq: 330, type: 'sawtooth', gain: 0.18 }); tone(d, t + 0.3, 0.4, { freq: 415, type: 'sawtooth', gain: 0.14 }); },
  quack: (d, t) => { for (let i = 0; i < 2; i++) { tone(d, t + i * 0.28, 0.18, { freq: 620, end: 380, type: 'square', gain: 0.13 }); noise(d, t + i * 0.28, 0.15, { freq: 1400, q: 3, gain: 0.25 }); } },
  cuckoo: (d, t) => { tone(d, t, 0.3, { freq: 784, type: 'sine', gain: 0.35 }); tone(d, t + 0.35, 0.45, { freq: 622, type: 'sine', gain: 0.35 }); },
  laugh: (d, t) => { for (let i = 0; i < 5; i++) tone(d, t + i * 0.13, 0.11, { freq: 520 - i * 25, end: 420 - i * 25, type: 'triangle', gain: 0.25 }); },
};

export const sfx = {
  shot(pos, listener, mine) {
    const c = ac(); if (!c) return; const t = c.currentTime; const d = out(pos, listener, mine ? 0.75 : 1);
    noise(d, t, 0.008, { type: 'highpass', freq: 1200, gain: 1.2, attack: 0.0005 });
    noise(d, t, 0.22, { type: 'lowpass', freq: 3000, sweep: 400, gain: 0.9, attack: 0.001 });
    tone(d, t, 0.18, { freq: 140, end: 50, gain: 0.7, attack: 0.001 });
  },
  hit() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.6); tone(d, t, 0.08, { freq: 1500, type: 'square', gain: 0.15 }); tone(d, t + 0.05, 0.08, { freq: 2000, type: 'square', gain: 0.12 }); },
  hurt() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.8); tone(d, t, 0.25, { freq: 220, end: 110, type: 'sawtooth', gain: 0.25 }); },
  penalty() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.6); tone(d, t, 0.15, { freq: 300, end: 200, type: 'square', gain: 0.1 }); },
  kill() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.7); [660, 880, 1320].forEach((f, i) => tone(d, t + i * 0.07, 0.25, { freq: f, type: 'triangle', gain: 0.2 })); },
  death() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.9); tone(d, t, 0.9, { freq: 400, end: 60, type: 'sawtooth', gain: 0.25 }); },
  disguise(pos, listener) { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(pos, listener, 0.7); tone(d, t, 0.15, { freq: 300, end: 1200, gain: 0.3 }); noise(d, t, 0.12, { freq: 3000, gain: 0.2 }); },
  taunt(sound, pos, listener) { const c = ac(); if (!c) return; const d = out(pos, listener, 1); (TAUNT_SOUNDS[sound] || TAUNT_SOUNDS.boing)(d, c.currentTime); },
  beep(high) { const c = ac(); if (!c) return; const d = out(null, null, 0.5); tone(d, c.currentTime, 0.12, { freq: high ? 1320 : 880, type: 'square', gain: 0.12 }); },
  horn() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.8); [220, 277, 330].forEach((f) => tone(d, t, 1.2, { freq: f, type: 'sawtooth', gain: 0.1, attack: 0.05 })); },
  step(pos, listener) { const c = ac(); if (!c) return; const d = out(pos, listener, 0.25); noise(d, c.currentTime, 0.06, { type: 'lowpass', freq: 500, gain: 0.5 }); },
  win() { const c = ac(); if (!c) return; const t = c.currentTime; const d = out(null, null, 0.6); [523, 659, 784, 1046].forEach((f, i) => tone(d, t + i * 0.12, 0.4, { freq: f, type: 'triangle', gain: 0.18 })); },
};
