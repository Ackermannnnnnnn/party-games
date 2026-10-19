import { useEffect, useMemo, useRef, useState } from 'react';
import { AVATARS, BUILTIN_WITH_PHOTOS, BUILTIN_CATEGORIES, CHARACTER_CATEGORIES } from '../data/avatars.js';
import SOURCES from '../../avatar-photos/sources.json';

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

/** Où chercher d'autres photos, selon la catégorie (wikis Fandom). */
const FANDOM = { marvel: 'marvel', dc: 'dc', disney: 'disney', simpsons: 'simpsons', starwars: 'starwars', gaming: 'nintendo', cinema: null, anime: null };
const fandomUrl = (u) => (u.includes('static.wikia.nocookie.net') ? u.replace(/\/revision\/latest.*$/, '') + '/revision/latest' : u);

/** Cherche des photos d'un personnage : Wikipédia, Fandom et (anime) AniList. */
async function searchPhotos(label, cat) {
  const found = [];
  const add = (u) => { if (u && !found.includes(u)) found.push(u); };
  const jobs = [];
  jobs.push(fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=6&gsrsearch=${encodeURIComponent(`${label} character`)}&prop=pageimages&pilicense=any&piprop=original`)
    .then((r) => r.json()).then((d) => Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index).forEach((p) => add(p.original?.source))).catch(() => {}));
  if (FANDOM[cat]) {
    jobs.push(fetch(`https://${FANDOM[cat]}.fandom.com/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=6&gsrsearch=${encodeURIComponent(label)}&prop=pageimages&piprop=original`)
      .then((r) => r.json()).then((d) => Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index).forEach((p) => add(p.original?.source && fandomUrl(p.original.source)))).catch(() => {}));
  }
  if (cat === 'anime') {
    jobs.push(fetch('https://graphql.anilist.co', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: 'query($s:String){Page(perPage:6){characters(search:$s,sort:FAVOURITES_DESC){image{large}}}}', variables: { s: label } }),
    }).then((r) => r.json()).then((d) => (d.data?.Page?.characters || []).forEach((c) => add(c.image?.large))).catch(() => {}));
  }
  await Promise.all(jobs);
  return found;
}

/** Lit une image (fichier ou URL lisible par le navigateur) et la réduit en data URL WebP (max 800 px). */
async function toDataUrl(source, max = 800) {
  let blob = source;
  if (typeof source === 'string') {
    const r = await fetch(source, { mode: 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    blob = await r.blob();
  }
  const bm = await createImageBitmap(blob);
  const sc = Math.min(1, max / Math.max(bm.width, bm.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bm.width * sc); canvas.height = Math.round(bm.height * sc);
  canvas.getContext('2d').drawImage(bm, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.86);
}

/**
 * Onglet admin « Avatars » :
 *  - ⭐ Perso : cadrer les images déposées dans client/avatars/
 *  - Personnages (Marvel, Anime…) : choisir la meilleure photo parmi plusieurs propositions, puis la cadrer
 * Tout est enregistré sur GitHub en un commit → Render redéploie.
 */
export default function AvatarsAdmin({ password }) {
  const persoList = useMemo(() => AVATARS.filter((a) => a.src && a.file && a.id.startsWith('img:')), []);
  const charList = useMemo(() => BUILTIN_WITH_PHOTOS.filter((a) => CHARACTER_CATEGORIES.has(a.cat)).map((a) => ({ ...a, file: `@${a.id}` })), []);
  const tabs = useMemo(() => [
    ...(persoList.length ? [{ id: 'perso', label: 'Perso', icon: '⭐' }] : []),
    ...BUILTIN_CATEGORIES.filter((c) => CHARACTER_CATEGORIES.has(c.id)),
  ], [persoList]);
  const [tab, setTab] = useState(tabs[0]?.id);
  const [changes, setChanges] = useState(readDraft); // clé → crop | null (= automatique)
  const [photoChanges, setPhotoChanges] = useState({}); // id → { url?, data?, preview }
  const [extra, setExtra] = useState({}); // id → propositions trouvées par la recherche
  const [selected, setSelected] = useState(null);
  const [github, setGithub] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saved, setSaved] = useState({}); // cadrages enregistrés mais pas encore redéployés
  const [savedPhotos, setSavedPhotos] = useState({}); // id → aperçu des photos enregistrées

  useEffect(() => {
    fetch(`${SERVER}/admin/avatars/status`, { headers: { 'X-Admin-Password': password } })
      .then((r) => r.json()).then((d) => setGithub(!!d.github)).catch(() => setGithub(false));
  }, [password]);

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(changes)); } catch {} }, [changes]);

  const list = tab === 'perso' ? persoList : charList.filter((a) => a.cat === tab);
  const all = [...persoList, ...charList];
  const current = list.find((a) => a.file === selected) || list[0];
  if (!current) return <div className="card text-slate-300">Aucun avatar à régler.</div>;

  const idOf = (a) => (a.file.startsWith('@') ? a.file.slice(1) : null);
  const photoOf = (a) => { const id = idOf(a); return id && (photoChanges[id]?.preview || savedPhotos[id]); };
  const baseOf = (a) => (a && a.file in saved ? saved[a.file] : a?.crop);
  const cropOf = (a) => (a.file in changes ? changes[a.file] : baseOf(a));
  const pending = Object.entries(changes).filter(([file, c]) => !same(c, baseOf(all.find((a) => a.file === file))));
  const nPending = pending.length + Object.keys(photoChanges).filter((id) => !pending.some(([f]) => f === `@${id}`)).length;

  const setCrop = (file, c) => setChanges((ch) => ({ ...ch, [file]: c }));
  const choosePhoto = (id, p) => {
    setPhotoChanges((pc) => ({ ...pc, [id]: p }));
    setCrop(`@${id}`, null); // nouvelle image : on repart du cadrage automatique
  };
  const cancelPhoto = (id) => {
    setPhotoChanges((pc) => { const n = { ...pc }; delete n[id]; return n; });
    setChanges((ch) => { const n = { ...ch }; delete n[`@${id}`]; return n; });
  };

  const save = async () => {
    if (!nPending) return;
    setSaving(true); setMessage(null);
    try {
      // Le navigateur réduit lui-même les images qu'il peut lire ; sinon le serveur les télécharge
      const photos = {};
      for (const [id, p] of Object.entries(photoChanges)) {
        let data = p.data || null;
        if (!data && p.url) { try { data = await toDataUrl(p.url); } catch { data = null; } }
        photos[id] = { url: p.url || null, data };
      }
      const res = await fetch(`${SERVER}/admin/avatars/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ cadrage: Object.fromEntries(pending), photos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      const failed = data.failed || {};
      const okIds = Object.keys(photoChanges).filter((id) => !failed[id]);
      setSavedPhotos((s) => ({ ...s, ...Object.fromEntries(okIds.map((id) => [id, photoChanges[id].preview])) }));
      setSaved((s) => ({ ...s, ...Object.fromEntries(pending) }));
      setPhotoChanges((pc) => Object.fromEntries(Object.entries(pc).filter(([id]) => failed[id])));
      setChanges({});
      const fails = Object.entries(failed);
      setMessage({
        ok: !fails.length,
        text: `✅ Enregistré sur GitHub${data.commit ? ` (commit ${data.commit})` : ''}. Render redéploie le site : visible d'ici 3 à 5 minutes.`
          + (fails.length ? ` ⚠️ Pas récupérées : ${fails.map(([id, why]) => `${id} (${why})`).join(', ')} — choisis une autre image ou importe-la.` : ''),
      });
    } catch (e) {
      setMessage({ ok: false, text: `❌ ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const currentId = idOf(current);
  const newPhoto = currentId && photoChanges[currentId];
  const editorAvatar = newPhoto ? { ...current, src: newPhoto.preview, auto: null } : (currentId && savedPhotos[currentId] ? { ...current, src: savedPhotos[currentId], auto: null } : current);

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <h3 className="font-semibold text-lg">🖼️ Avatars</h3>
        <p className="text-sm text-slate-300">Personnages : choisis la meilleure photo parmi les propositions (ou cherche-en d'autres, colle une adresse, importe un fichier). Puis ajuste le cadrage si besoin. Tout s'applique pour tous les joueurs.</p>
        {github === false && (
          <p className="text-xs text-amber-300">⚠️ Enregistrement désactivé : ajoute la variable <code>GITHUB_TOKEN</code> au serveur sur Render.</p>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelected(null); }} style={{ minHeight: 0 }}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${tab === t.id ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {list.map((a) => {
          const id = idOf(a);
          const changed = pending.some(([f]) => f === a.file) || (id && photoChanges[id]);
          const pic = photoOf(a);
          return (
            <button key={a.file} type="button" onClick={() => setSelected(a.file)} title={a.label}
              className={`relative rounded-xl p-1 border-2 transition ${a.file === current.file ? 'border-brand bg-brand/20' : 'border-slate-700 bg-slate-900/50'}`}>
              {pic ? <img src={pic} alt="" referrerPolicy="no-referrer" className="w-full aspect-square rounded-full object-cover" />
                : a.src || a.img ? <Thumb a={a} crop={cropOf(a)} />
                  : <span className={`w-full aspect-square rounded-full flex items-center justify-center text-3xl bg-gradient-to-br ${a.bg}`}>{a.emoji}</span>}
              <span className="block text-[10px] truncate text-slate-300 mt-0.5">{a.label}</span>
              {changed && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" title="Modifié, pas encore enregistré" />}
              {!changed && !a.img && !pic && <span className="absolute top-0.5 right-0.5 text-[9px]" title="Pas de photo : masqué pour les joueurs">⚠️</span>}
            </button>
          );
        })}
      </div>

      {currentId && (
        <PhotoPicker key={currentId} avatar={current} id={currentId} sources={SOURCES[currentId]} extra={extra[currentId] || []}
          chosen={newPhoto} hasSaved={!!savedPhotos[currentId]}
          onSearchResults={(urls) => setExtra((e) => ({ ...e, [currentId]: [...new Set([...(e[currentId] || []), ...urls])] }))}
          onChoose={(p) => choosePhoto(currentId, p)} onCancel={() => cancelPhoto(currentId)} />
      )}

      {(editorAvatar.src || newPhoto) ? (
        <Editor key={`${current.file}-${editorAvatar.src}`} avatar={editorAvatar} crop={cropOf(current) || editorAvatar.auto || DEFAULT} isAuto={!cropOf(current)}
          onChange={(c) => setCrop(current.file, c)} onAuto={() => setCrop(current.file, null)}
          onReset={() => setChanges((ch) => { const n = { ...ch }; delete n[current.file]; return n; })}
          dirty={pending.some(([f]) => f === current.file)} />
      ) : (
        <div className="card text-sm text-slate-400">Choisis d'abord une photo pour {current.label} : sans photo, il n'est pas proposé aux joueurs.</div>
      )}

      <div className="card space-y-2">
        <button type="button" onClick={save} disabled={!nPending || saving || github === false} className="btn btn-primary w-full disabled:opacity-50">
          {saving ? 'Enregistrement…' : `💾 Enregistrer${nPending ? ` (${nPending})` : ''}`}
        </button>
        {message && <p className={`text-sm ${message.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{message.text}</p>}
        {nPending > 0 && !message && <p className="text-xs text-slate-400">Pense à enregistrer : les photos choisies ne sont pas gardées si tu quittes la page.</p>}
      </div>
    </div>
  );
}

/** Choix de la photo d'un personnage : propositions, recherche, adresse collée, fichier importé. */
function PhotoPicker({ avatar, id, sources, extra, chosen, hasSaved, onSearchResults, onChoose, onCancel }) {
  const [searching, setSearching] = useState(false);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const candidates = [...new Set([...(sources?.candidates || []), ...extra])];
  const currentUrl = sources && sources.pick >= 0 ? sources.candidates[sources.pick] : null;

  const search = async () => {
    setSearching(true); setErr(null);
    const found = await searchPhotos(avatar.label, avatar.cat);
    if (!found.length) setErr('Rien trouvé : colle l\'adresse d\'une image ou importe un fichier.');
    onSearchResults(found);
    setSearching(false);
  };
  const useUrl = (e) => {
    e.preventDefault();
    const u = url.trim();
    if (!/^https:\/\//i.test(u)) { setErr('Colle une adresse qui commence par https://'); return; }
    onSearchResults([u]); onChoose({ url: u, preview: u }); setUrl(''); setErr(null);
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const data = await toDataUrl(f); onChoose({ data, preview: data }); setErr(null); } catch { setErr("Impossible de lire cette image."); }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">📸 Photo de {avatar.label}</h4>
        {chosen && <button type="button" onClick={onCancel} className="text-xs underline text-slate-300" style={{ minHeight: 0 }}>Annuler ce choix</button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(avatar.img || hasSaved) && (
          <figure className={`w-24 text-center ${!chosen ? 'ring-2 ring-emerald-400 rounded-xl' : 'opacity-60'}`}>
            <img src={avatar.img} alt="" className="w-24 h-24 rounded-xl object-cover bg-slate-800" />
            <figcaption className="text-[10px] text-slate-400 mt-0.5">{chosen ? 'Actuelle' : '✓ Actuelle'}</figcaption>
          </figure>
        )}
        {candidates.filter((u) => u !== currentUrl || !avatar.img).map((u) => {
          const on = chosen?.url === u;
          return (
            <button key={u} type="button" onClick={() => onChoose({ url: u, preview: u })} title={u}
              className={`w-24 rounded-xl overflow-hidden border-2 transition ${on ? 'border-amber-400' : 'border-transparent hover:border-slate-500'}`}>
              <img src={u} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-24 h-24 object-cover bg-slate-800"
                onError={(e) => { e.currentTarget.closest('button').style.display = 'none'; }} />
              <span className="block text-[10px] truncate text-slate-400 px-1">{on ? '★ Choisie' : new URL(u).hostname.replace('static.wikia.nocookie.net', 'fandom').replace('upload.wikimedia.org', 'wikipedia').replace('s4.anilist.co', 'anilist').replace('raw.githubusercontent.com', 'superheroes')}</span>
            </button>
          );
        })}
        {chosen?.data && (
          <figure className="w-24 text-center ring-2 ring-amber-400 rounded-xl">
            <img src={chosen.data} alt="" className="w-24 h-24 rounded-xl object-cover" />
            <figcaption className="text-[10px] text-amber-300">★ Importée</figcaption>
          </figure>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={search} disabled={searching} className="btn btn-ghost text-sm">{searching ? 'Recherche…' : '🔎 Chercher d\'autres photos'}</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost text-sm">📁 Importer un fichier</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      <form onSubmit={useUrl} className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…ou colle l'adresse d'une image (clic droit → Copier l'adresse de l'image)"
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand" />
        <button className="btn btn-ghost text-sm" disabled={!url.trim()}>Utiliser</button>
      </form>
      {err && <p className="text-xs text-amber-300">{err}</p>}
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
        <span className="text-xs text-slate-400">{isAuto ? 'Cadrage automatique (déplace pour ajuster)' : dirty ? 'Modifié' : 'Cadré à la main'}</span>
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
