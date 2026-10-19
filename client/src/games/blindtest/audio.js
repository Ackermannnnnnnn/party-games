import { useEffect, useRef, useState } from 'react';
import { socket } from '../../lib/socket.js';

/**
 * Lecture synchronisée des extraits.
 *
 * Le serveur publie { url, playing, posMs, at } : « l'extrait est à la position posMs
 * à l'instant serveur `at` ». Chaque appareil convertit l'heure serveur en heure locale
 * (décalage mesuré via time:sync) et se cale dessus — tout le monde entend la même chose.
 */

// ───────── Horloge serveur ─────────
let offset = 0; // heureServeur ≈ Date.now() + offset
let synced = false;

function ping() {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 3000);
    socket.emit('time:sync', {}, (serverTs) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const t1 = Date.now();
      resolve({ rtt: t1 - t0, offset: serverTs + (t1 - t0) / 2 - t1 });
    });
  });
}

/** Mesure le décalage d'horloge (on garde la mesure au plus petit aller-retour). */
export async function syncClock(samples = 5) {
  const results = [];
  for (let i = 0; i < samples; i++) {
    const r = await ping();
    if (r) results.push(r);
  }
  if (results.length) {
    results.sort((a, b) => a.rtt - b.rtt);
    offset = results[0].offset;
    synced = true;
  }
  return offset;
}

export const serverNow = () => Date.now() + offset;
export const isClockSynced = () => synced;

/** Se recale sur le serveur à partir d'un timestamp reçu dans l'état (secours si time:sync échoue). */
export function roughSync(serverTs) {
  if (!synced && serverTs) offset = serverTs - Date.now();
}

// ───────── Élément audio unique (débloqué une fois pour toutes sur mobile) ─────────
let el = null;
let preEl = null;
let elUrl = null;  // on compare avec l'URL demandée (a.src peut être réencodée par le navigateur)
let preUrl = null;
function audioEl() {
  if (!el && typeof Audio !== 'undefined') {
    el = new Audio();
    el.preload = 'auto';
  }
  return el;
}

/** Précharge l'extrait suivant pour qu'il démarre sans attendre. */
export function preload(url) {
  if (!url || typeof Audio === 'undefined') return;
  if (!preEl) { preEl = new Audio(); preEl.preload = 'auto'; preEl.muted = true; }
  if (preUrl !== url) { preUrl = url; preEl.src = url; try { preEl.load(); } catch {} }
}

export function stopAudio() {
  const a = audioEl();
  if (a) { a.pause(); }
}

/**
 * À appeler dans un clic : débloque l'audio sur iOS/Android (lecture autorisée ensuite).
 */
export function unlockAudio() {
  const a = audioEl();
  if (!a) return Promise.resolve(false);
  if (!a.src) {
    // Petit son vide pour débloquer
    elUrl = 'unlock';
    a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  }
  return a.play().then(() => true).catch(() => false);
}

const VOL_KEY = 'blindtestVolume';
function readVolume() {
  try { const v = parseFloat(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; } catch { return 0.8; }
}

/**
 * Hook : joue `audio` (état serveur) si `enabled`.
 * Renvoie { blocked, unlock, volume, setVolume, progress }.
 */
export function useSyncedAudio(audio, enabled) {
  const [blocked, setBlocked] = useState(false);
  const [volume, setVolumeState] = useState(readVolume);
  const startTimer = useRef(null);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const setVolume = (v) => {
    setVolumeState(v);
    try { localStorage.setItem(VOL_KEY, String(v)); } catch {}
  };

  useEffect(() => { const a = audioEl(); if (a) a.volume = volume; }, [volume]);

  const apply = () => {
    const a = audioEl();
    const st = audioRef.current;
    clearTimeout(startTimer.current);
    if (!a) return;
    if (!enabled || !st?.url) { a.pause(); return; }
    if (elUrl !== st.url) { elUrl = st.url; a.src = st.url; try { a.load(); } catch {} }
    if (!st.playing) {
      a.pause();
      if (a.readyState >= 1) { try { a.currentTime = (st.posMs || 0) / 1000; } catch {} }
      return;
    }
    const pos = (st.posMs || 0) + (serverNow() - st.at); // ms
    const play = () => {
      const cur = audioRef.current;
      if (!cur?.playing || cur.url !== st.url) return;
      const p = (cur.posMs || 0) + (serverNow() - cur.at);
      const seek = () => { try { a.currentTime = Math.max(0, p / 1000); } catch {} };
      if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true });
      a.play().then(() => setBlocked(false)).catch((err) => { if (err?.name === 'NotAllowedError') setBlocked(true); });
    };
    if (pos < 0) {
      a.pause();
      if (a.readyState >= 1) { try { a.currentTime = (st.posMs || 0) / 1000; } catch {} }
      startTimer.current = setTimeout(play, -pos);
    } else {
      play();
    }
  };

  // Réagit à chaque changement d'état (nouvelle manche, pause du buzz, reprise…)
  useEffect(() => {
    apply();
    return () => clearTimeout(startTimer.current);
  }, [enabled, audio?.url, audio?.playing, audio?.posMs, audio?.at]);

  // Corrige la dérive (onglet en arrière-plan, appareil lent…)
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      const a = audioEl();
      const st = audioRef.current;
      if (!a || !st?.playing || a.paused || elUrl !== st.url) return;
      const target = ((st.posMs || 0) + (serverNow() - st.at)) / 1000;
      if (target < 0) return;
      if (Math.abs(a.currentTime - target) > 0.35 && target < (a.duration || 30)) {
        try { a.currentTime = target; } catch {}
      }
    }, 1500);
    return () => clearInterval(id);
  }, [enabled]);

  // On coupe le son en quittant le jeu
  useEffect(() => () => { clearTimeout(startTimer.current); stopAudio(); }, []);

  const unlock = () => {
    unlockAudio().then(() => { setBlocked(false); apply(); });
  };

  return { blocked, unlock, volume, setVolume };
}
