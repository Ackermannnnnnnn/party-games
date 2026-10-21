import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATARS, AVATAR_CATEGORIES, getAvatar, isPhoto, loadLiveAvatars } from '../data/avatars.js';
import { useGameStore } from '../store/gameStore.js';
import { api } from '../hooks/useSocket.js';
import Avatar, { AvatarFace } from './Avatar.jsx';
import { useAvatarsVersion } from '../hooks/useAvatarsVersion.js';

const PHOTO_SIZE = 192;
const MAX_DATA_URL = 110_000;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE')); };
    img.src = url;
  });
}

/** Recadre l'image en carré (zoom + position) et la réduit en petite photo de profil. */
function renderPhoto(img, { zoom = 1, x = 0.5, y = 0.5 } = {}) {
  const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
  const sx = Math.max(0, Math.min(img.naturalWidth - side, (img.naturalWidth - side) * x));
  const sy = Math.max(0, Math.min(img.naturalHeight - side, (img.naturalHeight - side) * y));
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE; canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  for (const q of [0.85, 0.72, 0.6, 0.45]) {
    let out = canvas.toDataURL('image/webp', q);
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', q);
    if (out.length <= MAX_DATA_URL) return out;
  }
  return canvas.toDataURL('image/jpeg', 0.35);
}

function PhotoTab({ onDone }) {
  const setPhoto = useGameStore((s) => s.setPhoto);
  const avatar = useGameStore((s) => s.avatar);
  const fileRef = useRef(null);
  const [img, setImg] = useState(null);
  const [crop, setCrop] = useState({ zoom: 1, x: 0.5, y: 0.5 });
  const [error, setError] = useState(null);
  const preview = img ? renderPhoto(img, crop) : null;
  const landscape = img && img.naturalWidth > img.naturalHeight;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      setImg(await loadImage(file));
      setCrop({ zoom: 1, x: 0.5, y: 0.5 });
    } catch {
      setError("Impossible de lire cette image. Essaie une capture d'écran ou un autre format (JPG, PNG).");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {!img && (
        <>
          <div className="relative">
            {isPhoto(avatar) ? <Avatar id={avatar} size="xl" /> : (
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center text-5xl text-slate-500">📷</div>
            )}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            {isPhoto(avatar) ? '🔄 Changer de photo' : '📷 Choisir une photo'}
          </button>
          <p className="text-xs text-slate-400 text-center max-w-sm">
            Prends l'image que tu veux dans ta galerie : ta tête, ton perso préféré, un mème… Elle sera recadrée en rond et visible seulement par les joueurs de tes rooms.
          </p>
        </>
      )}
      {img && (
        <>
          <img src={preview} alt="Aperçu" className="w-36 h-36 rounded-full object-cover ring-4 ring-brand shadow-xl" />
          <div className="w-full max-w-xs space-y-2 text-xs text-slate-300">
            <label className="flex items-center gap-2">🔍 Zoom
              <input type="range" min="1" max="3" step="0.05" value={crop.zoom} className="flex-1 accent-brand"
                onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} />
            </label>
            {(landscape || crop.zoom > 1) && (
              <label className="flex items-center gap-2">↔️ Cadrage
                <input type="range" min="0" max="1" step="0.01" value={crop.x} className="flex-1 accent-brand"
                  onChange={(e) => setCrop((c) => ({ ...c, x: Number(e.target.value) }))} />
              </label>
            )}
            {(!landscape || crop.zoom > 1) && (
              <label className="flex items-center gap-2">↕️ Cadrage
                <input type="range" min="0" max="1" step="0.01" value={crop.y} className="flex-1 accent-brand"
                  onChange={(e) => setCrop((c) => ({ ...c, y: Number(e.target.value) }))} />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Autre image</button>
            <button type="button" className="btn btn-primary" onClick={() => { setPhoto(preview); onDone(); }}>✓ Utiliser cette photo</button>
          </div>
        </>
      )}
      {error && <p className="text-rose-300 text-sm text-center">{error}</p>}
    </div>
  );
}

/**
 * Choix de l'avatar : sa propre photo, ou un des avatars (personnages, animaux…).
 * Met à jour le store et prévient les autres joueurs si on est déjà dans une room.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {boolean} mandatory  pas de croix : il faut choisir (premier lancement)
 */
export default function AvatarPicker({ open, onClose, mandatory = false }) {
  const { avatar, setAvatar, room } = useGameStore();
  useAvatarsVersion();
  useEffect(() => { if (open) loadLiveAvatars(); }, [open]); // nouveaux personnages ajoutés depuis l'admin
  // S'il y a des avatars perso (dossier client/avatars), on ouvre directement leur onglet
  const [activeCat, setActiveCat] = useState(() => (AVATARS[0]?.id?.startsWith('img:') ? AVATAR_CATEGORIES[0].id : 'photo'));
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? AVATARS.filter((a) => a.label.toLowerCase().includes(q))
    : AVATARS.filter((a) => a.cat === activeCat);

  const done = () => {
    if (room) setTimeout(() => api.syncAvatar(), 0);
    onClose?.();
  };
  const handlePick = (id) => {
    setAvatar(id);
    done();
  };

  // Portail vers <body> : la fenêtre reste plein écran même ouverte depuis une carte floutée
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={mandatory ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar id={avatar} size="md" />
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-brand-light">{mandatory ? 'Choisis ton avatar pour jouer' : 'Choisis ton avatar'}</h3>
                  <p className="text-xs text-slate-400 truncate">{isPhoto(avatar) ? 'Ta photo' : getAvatar(avatar).label}</p>
                </div>
              </div>
              {!mandatory && <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none" aria-label="Fermer">×</button>}
            </div>

            {/* Recherche + onglets */}
            <div className="p-3 border-b border-slate-700 space-y-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Chercher un personnage (Goku, Batman, Mario…)"
                aria-label="Chercher un avatar"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand" />
              {!q && (
                <div className="flex gap-1 overflow-x-auto scrollable pb-1">
                  <TabBtn active={activeCat === 'photo'} onClick={() => setActiveCat('photo')}>📷 Ma photo</TabBtn>
                  {AVATAR_CATEGORIES.map((cat) => (
                    <TabBtn key={cat.id} active={activeCat === cat.id} onClick={() => setActiveCat(cat.id)}>{cat.icon} {cat.label}</TabBtn>
                  ))}
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-4 scrollable">
              {!q && activeCat === 'photo' ? <PhotoTab onDone={done} /> : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filtered.map((a) => (
                    <button key={a.id} type="button" onClick={() => handlePick(a.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition border-2 ${a.id === avatar ? 'bg-brand/20 border-brand' : 'bg-slate-800/40 border-transparent hover:border-slate-500'}`}>
                      <AvatarFace id={a.id} className="w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl" />
                      <span className="text-xs text-slate-300 truncate max-w-full">{a.label}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="col-span-full text-center text-slate-400 text-sm py-6">Aucun avatar trouvé. Tu peux mettre ta propre photo dans « 📷 Ma photo » !</p>}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-700 text-center text-xs text-slate-500">
              📷 ta photo ou {AVATARS.length} avatars · touche pour choisir
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{ minHeight: 0 }}
      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${active ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
      {children}
    </button>
  );
}
