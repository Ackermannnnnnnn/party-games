import { useEffect, useRef, useState } from 'react';

/**
 * Admin → onglet Sons : les moqueries de Prop Hunt (soundboard des cachés, moqueries forcées).
 * On importe un fichier (ou on s'enregistre au micro), on choisit le passage sur la forme d'onde,
 * le volume, la vitesse, le nom et l'émoji. Les sons sont disponibles dès la manche suivante.
 */
const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const MAX_UPLOAD = 5.5 * 1024 * 1024;
const EMOJIS = ['🔊', '😂', '🤪', '💨', '🐔', '🦆', '🐐', '🐱', '🐶', '🎺', '📯', '🥁', '🎵', '👻', '💀', '🤡', '😱', '🙈', '🫥', '🔔', '🚨', '💥', '🍑', '👀'];

let actx = null;
const ctx = () => { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; };
const fmtS = (s) => (s == null ? '—' : `${s.toFixed(2)} s`);

async function api(password, path, body) {
  const res = await fetch(`${SERVER}/admin${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

/** Passage [start, end] d'un AudioBuffer → WAV mono 22 kHz (pour les fichiers trop lourds). */
function encodeWav(buffer, start, end) {
  const rate = 22050;
  const len = Math.max(1, Math.floor((end - start) * rate));
  const out = new Int16Array(len);
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < len; i++) {
    const src = Math.floor((start + i / rate) * buffer.sampleRate);
    let v = 0; for (const c of chans) v += c[src] || 0;
    out[i] = Math.max(-1, Math.min(1, v / chans.length)) * 32767;
  }
  const head = new ArrayBuffer(44); const d = new DataView(head);
  const w = (o, s) => [...s].forEach((ch, i) => d.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, rate, true); d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, len * 2, true);
  return new Blob([head, out.buffer], { type: 'audio/wav' });
}

/** Joue un passage : renvoie une fonction pour l'arrêter. */
function play(buffer, { start, end, volume, rate }, onEnd) {
  const c = ctx();
  const src = c.createBufferSource(); src.buffer = buffer; src.playbackRate.value = rate;
  const g = c.createGain(); g.gain.value = volume;
  src.connect(g); g.connect(c.destination);
  const dur = Math.max(0.05, (end ?? buffer.duration) - start);
  src.start(0, start, dur);
  src.onended = onEnd;
  return { stop: () => { try { src.stop(); } catch { /* déjà fini */ } }, startedAt: c.currentTime, dur: dur / rate };
}

export default function SoundsAdmin({ password }) {
  const [sounds, setSounds] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id?, name, emoji, start, end, volume, rate, enabled, buffer, blob? }
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const reload = () => api(password, '/sounds').then((r) => setSounds(r.sounds)).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const decode = async (blob) => {
    const buf = await blob.arrayBuffer();
    return new Promise((res, rej) => ctx().decodeAudioData(buf, res, () => rej(new Error('Fichier audio illisible.'))));
  };

  const openFile = async (file) => {
    if (!file) return;
    setError('');
    try {
      const buffer = await decode(file);
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 30) || 'Nouveau son';
      setEditing({ name, emoji: '🔊', start: 0, end: Math.min(buffer.duration, 4), volume: 1, rate: 1, enabled: true, buffer, blob: file });
    } catch (e) { setError(e.message); }
  };

  const openExisting = async (s) => {
    setError('');
    try {
      const r = await fetch(`${SERVER}/sounds/file/${s.id}?v=${s.sha || Date.now()}`);
      if (!r.ok) throw new Error('Fichier introuvable.');
      const buffer = await decode(await r.blob());
      setEditing({ ...s, end: s.end ?? buffer.duration, buffer });
    } catch (e) { setError(e.message); }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true); setError('');
    try {
      const e = editing;
      const body = { id: e.id, name: e.name, emoji: e.emoji, start: e.start, end: e.end, volume: e.volume, rate: e.rate, enabled: e.enabled };
      if (e.blob) {
        let blob = e.blob;
        // trop lourd : on ne garde que le passage choisi (WAV mono 22 kHz)
        if (blob.size > MAX_UPLOAD) { blob = encodeWav(e.buffer, e.start, e.end); body.start = 0; body.end = null; }
        if (blob.size > MAX_UPLOAD) throw new Error('Passage trop long : raccourcis-le.');
        body.data = await blobToDataUrl(blob);
        if (!/^data:audio\//.test(body.data)) body.data = body.data.replace(/^data:[^;]*/, 'data:audio/mpeg');
      }
      await api(password, '/sounds/save', body);
      setEditing(null);
      await reload();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const toggle = async (s) => {
    setBusy(true);
    try { await api(password, '/sounds/save', { id: s.id, enabled: !s.enabled }); await reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const remove = async (s) => {
    if (!window.confirm(`Supprimer « ${s.name} » ?`)) return;
    setBusy(true);
    try { await api(password, '/sounds/delete', { id: s.id }); await reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const move = async (i, d) => {
    const ids = sounds.map((s) => s.id); const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setSounds(ids.map((id) => sounds.find((s) => s.id === id)));
    try { await api(password, '/sounds/order', { ids }); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl text-slate-50">🔊 Sons de moquerie · Prop Hunt</h3>
            <p className="text-sm text-slate-400">Ils apparaissent dans le soundboard des cachés (touche T) et servent aux moqueries forcées. Disponibles dès la manche suivante.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-token" onClick={() => fileRef.current?.click()} disabled={busy}>＋ Importer un son</button>
            <Recorder onDone={(blob) => openFile(new File([blob], 'Enregistrement.webm', { type: blob.type }))} />
          </div>
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" className="hidden" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div
          className="rounded-2xl border-2 border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-400"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); openFile(e.dataTransfer.files?.[0]); }}
        >Glisse un fichier audio ici (mp3, wav, ogg, m4a — 6 Mo max, sinon seul le passage choisi est gardé)</div>
        {error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}
      </div>

      {editing && <Editor value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} busy={busy} />}

      <div className="card">
        {!sounds ? <p className="text-slate-400 text-sm">Chargement…</p> : sounds.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun son pour l'instant : les cachés n'ont que les moqueries intégrées (sifflet, klaxon, coin-coin…).</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {sounds.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-3 py-2 ${s.enabled ? '' : 'opacity-50'}`}>
                <span className="text-2xl w-8 text-center">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-400">{fmtS(s.start)} → {fmtS(s.end)} · volume {Math.round(s.volume * 100)} % · vitesse ×{s.rate}</p>
                </div>
                <PreviewButton sound={s} />
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => move(i, 1)} disabled={i === sounds.length - 1}>↓</button>
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => toggle(s)} disabled={busy}>{s.enabled ? 'Désactiver' : 'Activer'}</button>
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => openExisting(s)} disabled={busy}>Modifier</button>
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs text-rose-300" onClick={() => remove(s)} disabled={busy}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PreviewButton({ sound }) {
  const [p, setP] = useState(null);
  const go = async () => {
    if (p) { p.stop(); setP(null); return; }
    try {
      const r = await fetch(`${SERVER}/sounds/file/${sound.id}?v=${sound.sha || ''}`);
      const ab = await r.arrayBuffer();
      const buffer = await new Promise((res, rej) => ctx().decodeAudioData(ab, res, rej));
      const h = play(buffer, sound, () => setP(null)); setP(h);
    } catch { /* ignoré */ }
  };
  return <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={go}>{p ? '■' : '▶'}</button>;
}

/** Enregistrement au micro. */
function Recorder({ onDone }) {
  const [rec, setRec] = useState(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); onDone(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); setRec(null); };
      mr.start(); setRec(mr);
    } catch { window.alert('Micro indisponible.'); }
  };
  return rec
    ? <button type="button" className="btn btn-ghost text-rose-300 animate-pulse" onClick={() => rec.stop()}>■ Arrêter</button>
    : (typeof MediaRecorder !== 'undefined' ? <button type="button" className="btn btn-ghost" onClick={start}>🎙️ Enregistrer</button> : null);
}

/** Éditeur : forme d'onde avec poignées de début / fin, écoute, volume, vitesse, nom, émoji. */
function Editor({ value: e, onChange, onSave, onCancel, busy }) {
  const canvas = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [head, setHead] = useState(null);
  const drag = useRef(null);
  const dur = e.buffer.duration;
  const set = (patch) => onChange({ ...e, ...patch });

  // forme d'onde
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const W = c.width = c.clientWidth * devicePixelRatio; const H = c.height = 140 * devicePixelRatio;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const data = e.buffer.getChannelData(0); const step = Math.max(1, Math.floor(data.length / W));
    const x0 = (e.start / dur) * W; const x1 = ((e.end ?? dur) / dur) * W;
    g.fillStyle = 'rgba(94,234,212,0.08)'; g.fillRect(x0, 0, x1 - x0, H);
    for (let x = 0; x < W; x++) {
      let mn = 1; let mx = -1;
      for (let i = 0; i < step; i += 4) { const v = data[x * step + i] || 0; if (v < mn) mn = v; if (v > mx) mx = v; }
      const k = Math.min(2, e.volume);
      g.fillStyle = x >= x0 && x <= x1 ? '#5eead4' : 'rgba(148,163,184,0.35)';
      g.fillRect(x, H / 2 - mx * k * H * 0.45, 1, Math.max(1, (mx - mn) * k * H * 0.45));
    }
    g.fillStyle = '#fbbf24'; g.fillRect(x0 - 1.5 * devicePixelRatio, 0, 3 * devicePixelRatio, H); g.fillRect(x1 - 1.5 * devicePixelRatio, 0, 3 * devicePixelRatio, H);
    if (head != null) { g.fillStyle = '#fff'; g.fillRect((head / dur) * W, 0, 2, H); }
  }, [e.buffer, e.start, e.end, e.volume, head, dur]);

  // tête de lecture
  useEffect(() => {
    if (!playing) { setHead(null); return undefined; }
    let raf;
    const tick = () => { const t = (actx.currentTime - playing.startedAt) * e.rate; setHead(Math.min(e.end ?? dur, e.start + t)); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (playing) { playing.stop(); setPlaying(null); return; }
    setPlaying(play(e.buffer, e, () => setPlaying(null)));
  };
  const pos = (ev) => { const r = canvas.current.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur; };
  const down = (ev) => {
    const t = pos(ev); const end = e.end ?? dur;
    drag.current = Math.abs(t - e.start) < Math.abs(t - end) ? 'start' : 'end';
    canvas.current.setPointerCapture(ev.pointerId); moveTo(t);
  };
  const moveTo = (t) => {
    if (drag.current === 'start') set({ start: Math.round(Math.min(t, (e.end ?? dur) - 0.05) * 100) / 100 });
    else if (drag.current === 'end') set({ end: Math.round(Math.max(t, e.start + 0.05) * 100) / 100 });
  };
  const len = (e.end ?? dur) - e.start;

  return (
    <div className="card space-y-4 ring-1 ring-teal-300/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-lg text-slate-50">{e.id ? 'Modifier le son' : 'Nouveau son'}</h4>
        <p className="text-xs text-slate-400">Fichier : {dur.toFixed(2)} s · passage gardé : <b className="text-teal-200">{len.toFixed(2)} s</b>{e.rate !== 1 ? ` (joué en ${(len / e.rate).toFixed(2)} s)` : ''}</p>
      </div>
      <div>
        <canvas ref={canvas} className="w-full h-[140px] rounded-xl bg-slate-950/70 cursor-ew-resize touch-none"
          onPointerDown={down} onPointerMove={(ev) => drag.current && moveTo(pos(ev))} onPointerUp={() => { drag.current = null; }} />
        <p className="mt-1 text-xs text-slate-400">Glisse les barres jaunes pour choisir le début et la fin.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <label className="block text-slate-300">Début <span className="text-slate-400">{fmtS(e.start)}</span>
          <input type="range" min="0" max={dur} step="0.01" value={e.start} onChange={(ev) => set({ start: Math.min(Number(ev.target.value), (e.end ?? dur) - 0.05) })} className="w-full accent-amber-300" />
        </label>
        <label className="block text-slate-300">Fin <span className="text-slate-400">{fmtS(e.end ?? dur)}</span>
          <input type="range" min="0" max={dur} step="0.01" value={e.end ?? dur} onChange={(ev) => set({ end: Math.max(Number(ev.target.value), e.start + 0.05) })} className="w-full accent-amber-300" />
        </label>
        <label className="block text-slate-300">Volume <span className="text-slate-400">{Math.round(e.volume * 100)} %</span>
          <input type="range" min="0" max="2" step="0.05" value={e.volume} onChange={(ev) => set({ volume: Number(ev.target.value) })} className="w-full accent-teal-300" />
        </label>
        <label className="block text-slate-300">Vitesse <span className="text-slate-400">×{e.rate}</span>
          <input type="range" min="0.5" max="2" step="0.05" value={e.rate} onChange={(ev) => set({ rate: Number(ev.target.value) })} className="w-full accent-teal-300" />
        </label>
        <label className="block text-slate-300">Nom
          <input className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2" maxLength={30} value={e.name} onChange={(ev) => set({ name: ev.target.value })} />
        </label>
        <div className="text-slate-300">Émoji
          <div className="mt-1 flex flex-wrap gap-1">
            {EMOJIS.map((em) => <button key={em} type="button" onClick={() => set({ emoji: em })} className={`h-8 w-8 rounded-lg text-lg ${e.emoji === em ? 'bg-teal-400/30 ring-1 ring-teal-300' : 'bg-white/[0.05]'}`}>{em}</button>)}
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={e.enabled} onChange={(ev) => set({ enabled: ev.target.checked })} /> Activé (visible dans le soundboard)</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" onClick={toggle}>{playing ? '■ Stop' : '▶ Écouter le passage'}</button>
        <div className="flex-1" />
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Annuler</button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy || !e.name.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );
}
