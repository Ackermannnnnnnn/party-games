import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATARS, AVATAR_CATEGORIES, getAvatar } from '../data/avatars.js';
import Avatar from './Avatar.jsx';

/**
 * Picker d'avatars : modal avec onglets par catégorie.
 *
 * @param {string} currentId  id actuellement sélectionné
 * @param {(id: string) => void} onSelect  callback quand le user choisit
 * @param {boolean} open
 * @param {() => void} onClose
 */
export default function AvatarPicker({ currentId, onSelect, open, onClose }) {
  const [activeCat, setActiveCat] = useState(AVATAR_CATEGORIES[0].id);
  const filtered = AVATARS.filter(a => a.cat === activeCat);

  const handlePick = (id) => {
    onSelect?.(id);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentId && <Avatar id={currentId} size="md" />}
                <div>
                  <h3 className="font-display text-xl text-brand-light">Choisis ton avatar</h3>
                  <p className="text-xs text-slate-400">{currentId && getAvatar(currentId).label}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">×</button>
            </div>

            {/* Tabs catégories */}
            <div className="flex flex-wrap gap-1 p-3 border-b border-slate-700 overflow-x-auto scrollable">
              {AVATAR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                    activeCat === cat.id
                      ? 'bg-brand text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Grille avatars */}
            <div className="flex-1 overflow-y-auto p-4 scrollable">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filtered.map(a => {
                  const isCurrent = a.id === currentId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handlePick(a.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition border-2 ${
                        isCurrent
                          ? 'bg-brand/20 border-brand'
                          : 'bg-slate-800/40 border-transparent hover:border-slate-500'
                      }`}
                    >
                      <Avatar id={a.id} size="lg" />
                      <span className="text-xs text-slate-300 truncate max-w-full">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700 text-center text-xs text-slate-500">
              {AVATARS.length} avatars disponibles · clique pour choisir
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
