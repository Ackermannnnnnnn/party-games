import { useEffect, useMemo, useRef, useState } from 'react';
import { AVATARS } from '../data/avatars.js';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const DRAFT_KEY = 'avatarCadrageDraft';
const DEFAULT = { zoom: 1, x: 0.5, y: 0.5 };
const PREVIEW = 160;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const same = (a, b) => (!a && !b) || (a && b && a.zoom === b.zoom && a.x === b.x && a.y === b.y);

/** Carré recadré dans une image de largeur w / hauteur h (même calcul que le build). */
function region(w, h, { zoom, x, y }) {
  const side = Math.min(w, h) / zoom;
  return { side, left: (w - side) * x, top: (h - side) * y };
}

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}

/**
 * Onglet admin « Avatars » : cadrer chaque avatar perso une fois pour tout le monde.
 * Le cadrage est enregistré dans client/avatars/cadrage.json sur GitHub → Render redéploie.
 */
export default function AvatarsAdmin({ password }) {
  const list = useMemo(() => AVATARS.filter((a) => a.src && a.file), []);
  const [changes, setChanges] = useState(readDraft); // file → crop | null (= automatique)
  const [selected, setSelected] = useState(list[0]?.file || null);
  const [github, setGithub] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saved, setSaved] = useState({}); // enregistré mais pas encore redéployé

  useEffect(() => {
    fetch(`${SERVER}/admin/avatars/status`, { headers: { 'X-Admin-Password': password } })
      .then((r) => r.json()).then((d) => setGithub(!!d.github)).catch(() => setGithub(false));
  }, [password]);

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(changes)); } catch {} }, [changes]);

  if (!list.length) {
    return <div className="card text-slate-300">Aucun avatar perso : dépose des images dans <code>client/avatars/</code>.</div>;
  }

  const current = list.find((a) => a.file === selected) || list[0];
  const baseOf = (a) => (a && a.file in saved ? saved[a.file] : a?.crop);
  const cropOf = (a) => (a.file in changes ? changes[a.file] : baseOf(a));
  const pending = Object.entries(changes).filter(([file, c]) => !same(c, baseOf(list.find((a) => a.file === file))));

  const setCrop = (file, c) => setChanges((ch) => ({ ...ch, [file]: c }));

  const save = async () => {
    if (!pending.length) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch(`${SERVER}/admin/avatars/cadrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ cadrage: Object.fromEntries(pending) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setMessage({ ok: true, text: `✅ Enregistré sur GitHub${data.commit ? ` (commit ${data.commit})` : ''}. Render redéploie le site : les nouveaux cadrages seront visibles d'ici 3 à 5 minutes.` });
      setSaved((s) => ({ ...s, ...Object.fromEntries(pending) }));
      setChanges({});
    } catch (e) {
      setMessage({ ok: false, text: `❌ ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const all = {};
    for (const a of list) { const c = cropOf(a); if (c) all[a.file] = c; }
    const blob = new Blob([`${JSON.stringify(all, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'cadrage.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <h3 className="font-semibold text-lg">🖼️ Cadrage des avatars</h3>
        <p className="text-sm text-slate-300">Choisis un avatar, déplace le carré (glisser) et zoome. Le rond à droite montre le rendu final. Le cadrage s'applique pour tous les joueurs.</p>
        {github === false && (
          <p className="text-xs text-amber-300">
            ⚠️ Enregistrement automatique désactivé : ajoute la variable <code>GITHUB_TOKEN</code> au serveur sur Render.
            En attendant, « Télécharger cadrage.json » puis pose le fichier dans <code>client/avatars/</code> et pousse-le.
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {list.map((a) => {
          const changed = pending.some(([f]) => f === a.file);
          return (
            <button key={a.id} type="button" onClick={() => setSelected(a.file)} title={a.label}
              className={`relative rounded-xl p-1 border-2 transition ${a.file === current.file ? 'border-brand bg-brand/20' : 'border-slate-700 bg-slate-900/50'}`}>
              <Thumb a={a} crop={cropOf(a)} />
              <span className="block text-[10px] truncate text-slate-300 mt-0.5">{a.label}</span>
              {changed && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" title="Modifié, pas encore enregistré" />}
              {!changed && baseOf(a) && <span className="absolute top-0.5 right-0.5 text-[9px]" title="Cadré">✂️</span>}
            </button>
          );
        })}
      </div>

      <Editor key={current.file} avatar={current} crop={cropOf(current) || DEFAULT} isAuto={!cropOf(current)}
        onChange={(c) => setCrop(current.file, c)} onAuto={() => setCrop(current.file, null)}
        onReset={() => setChanges((ch) => { const n = { ...ch }; delete n[current.file]; return n; })}
        dirty={pending.some(([f]) => f === current.file)} />

      <div className="card space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={!pending.length || saving || github === false} className="btn btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Enregistrement…' : `💾 Enregistrer${pending.length ? ` (${pending.length})` : ''}`}
          </button>
          <button type="button" onClick={download} className="btn btn-ghost text-sm">⬇️ Télécharger cadrage.json</button>
        </div>
        {message && <p className={`text-sm ${message.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{message.text}</p>}
        {pending.length > 0 && !message && <p className="text-xs text-slate-400">Modifications gardées sur cet appareil tant qu'elles ne sont pas enregistrées.</p>}
      </div>
    </div>
  );
}

/** Petite vignette ronde qui applique le cadrage en cours (sans attendre le build). */
function Thumb({ a, crop }) {
  if (!crop) return <img src={a.img} alt="" className="w-full aspect-square rounded-full object-cover" />;
  return <CropCanvas src={a.src} crop={crop} size={96} className="w-full aspect-square rounded-full" />;
}

function useImage(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let alive = true;
    const i = new Image();
    i.onload = () => alive && setImg(i);
    i.src = src;
    return () => { alive = false; };
  }, [src]);
  return img;
}

function CropCanvas({ src, crop, size, className }) {
  const img = useImage(src);
  const ref = useRef(null);
  useEffect(() => {
    if (!img || !ref.current) return;
    const ctx = ref.current.getContext('2d');
    const r = region(img.naturalWidth, img.naturalHeight, crop);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, r.left, r.top, r.side, r.side, 0, 0, size, size);
  }, [img, crop.zoom, crop.x, crop.y, size]);
  return <canvas ref={ref} width={size} height={size} className={className} />;
}

function Editor({ avatar, crop, isAuto, onChange, onAuto, onReset, dirty }) {
  const img = useImage(avatar.src);
  const boxRef = useRef(null);
  const drag = useRef(null);
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  const set = (patch) => {
    const n = { ...crop, ...patch };
    onChange({ zoom: Math.round(clamp(n.zoom, 1, 4) * 100) / 100, x: Math.round(clamp(n.x, 0, 1) * 1000) / 1000, y: Math.round(clamp(n.y, 0, 1) * 1000) / 1000 });
  };

  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const scale = boxW / W;
  const r = region(W, H, crop);

  const onDown = (e) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, y0: e.clientY, crop };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || !scale) return;
    const rr = region(W, H, d.crop);
    const dx = (e.clientX - d.x0) / scale;
    const dy = (e.clientY - d.y0) / scale;
    set({
      x: W - rr.side > 0 ? d.crop.x + dx / (W - rr.side) : 0.5,
      y: H - rr.side > 0 ? d.crop.y + dy / (H - rr.side) : 0.5,
    });
  };
  const onUp = () => { drag.current = null; };
  const onWheel = (e) => { set({ zoom: crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }); };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">{avatar.label} <span className="text-xs text-slate-400 font-normal">· {avatar.file}</span></h4>
        <span className="text-xs text-slate-400">{isAuto ? 'Cadrage automatique' : dirty ? 'Modifié' : 'Cadré'}</span>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
        <div ref={boxRef} className="relative mx-auto overflow-hidden rounded-xl bg-slate-900 select-none touch-none" style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, ${Math.round((480 * W) / H)}px)` }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
          {img ? <img src={avatar.src} alt="" draggable={false} className="absolute inset-0 w-full h-full" /> : <p className="p-6 text-slate-400 text-sm">Chargement…</p>}
          {img && scale > 0 && (
            <div className="absolute cursor-move"
              style={{
                left: r.left * scale, top: r.top * scale, width: r.side * scale, height: r.side * scale,
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.65)', outline: '2px solid #fff', borderRadius: 4,
              }}>
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/70" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 sm:w-48">
          <CropCanvas src={avatar.src} crop={crop} size={PREVIEW} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full shadow-lg ring-2 ring-brand/60" />
          <label className="w-full text-xs text-slate-400">🔍 Zoom
            <input type="range" min="1" max="4" step="0.01" value={crop.zoom} onChange={(e) => set({ zoom: Number(e.target.value) })} className="w-full accent-brand" />
          </label>
          <label className="w-full text-xs text-slate-400">↔️ Horizontal
            <input type="range" min="0" max="1" step="0.005" value={crop.x} onChange={(e) => set({ x: Number(e.target.value) })} className="w-full accent-brand" disabled={W - r.side < 1} />
          </label>
          <label className="w-full text-xs text-slate-400">↕️ Vertical
            <input type="range" min="0" max="1" step="0.005" value={crop.y} onChange={(e) => set({ y: Number(e.target.value) })} className="w-full accent-brand" disabled={H - r.side < 1} />
          </label>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {dirty && <button type="button" onClick={onReset} className="text-xs underline text-slate-300" style={{ minHeight: 0 }}>Annuler</button>}
            {!isAuto && <button type="button" onClick={onAuto} className="text-xs underline text-slate-400" style={{ minHeight: 0 }}>Remettre en automatique</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
