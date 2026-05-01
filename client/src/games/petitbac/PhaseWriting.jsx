import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import Timer from '../../components/Timer.jsx';
import { motion } from 'framer-motion';

export default function PhaseWriting() {
  const { gameState, room, playerId } = useGameStore();
  const p = gameState?.public || {};
  const priv = gameState?.private || {};
  const categories = p.categories || [];
  const letter = p.currentLetter;
  const submittedIds = new Set(p.submittedIds || []);
  const iSubmitted = submittedIds.has(playerId);
  const stopperId = p.stopperId;
  const stopperPseudo = stopperId ? room.players.find(pl => pl.id === stopperId)?.pseudo : null;
  const isStopperMe = stopperId === playerId;

  const initialAnswers = useMemo(() => priv.myAnswers || {}, []);
  const [answers, setAnswers] = useState(initialAnswers);
  const inputRefs = useRef({});

  useEffect(() => {
    if (!iSubmitted && priv.myAnswers) {
      setAnswers(prev => ({ ...priv.myAnswers, ...prev }));
    }
  }, [iSubmitted]);

  useEffect(() => {
    if (iSubmitted) return;
    const firstEmpty = categories.find(c => !answers[c.id]);
    if (firstEmpty && inputRefs.current[firstEmpty.id]) {
      inputRefs.current[firstEmpty.id].focus();
    }
  }, []);

  // Envoi en TEMPS RÉEL à chaque keystroke
  const handleChange = (catId, value) => {
    setAnswers(prev => ({ ...prev, [catId]: value }));
    api.gameAction('submitAnswer', { category: catId, value });
  };

  const flushAll = () => {
    for (const cat of categories) {
      api.gameAction('submitAnswer', { category: cat.id, value: answers[cat.id] || '' });
    }
  };
  const submitAll = () => { flushAll(); api.gameAction('submitAll', {}); };
  const callStop  = () => { flushAll(); api.gameAction('stopRound', {}); };

  const filledCount = categories.filter(c => (answers[c.id] || '').trim().length >= 2).length;
  const allFilled = filledCount === categories.length;

  // Visibilité / état du bouton STOP selon le mode
  const stopMode = p.options?.stopMode || 'anyFull';
  const isMeHost = playerId === room.hostId;
  const stopVisible = stopMode !== 'disabled' && !iSubmitted && !stopperId &&
                      !(stopMode === 'host' && !isMeHost);
  const stopEnabled = stopMode === 'host' || allFilled; // 'host' ne nécessite pas tout rempli
  const stopHint = stopMode === 'anyFull'
    ? (allFilled ? 'Tout est rempli, tu peux tout arrêter !' : `Remplis toutes les catégories (${filledCount}/${categories.length}) pour activer STOP`)
    : 'STOP : les autres ont 10s pour finir';

  return (
    <div className="card space-y-4">
      {/* Header : manche + lettre + timer */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs sm:text-sm text-slate-400">Manche {p.round} / {p.totalRounds}</p>
          <p className="font-display text-3xl sm:text-4xl text-brand-light">Lettre : {letter}</p>
        </div>
        {p.writingEndsAt && <Timer endsAt={p.writingEndsAt} />}
      </div>

      {stopperId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/20 text-rose-200 rounded-lg p-3 text-center font-semibold"
        >
          ⚠️ {isStopperMe ? 'Tu' : stopperPseudo} a appuyé sur STOP ! Il reste 10s max.
        </motion.div>
      )}

      {/* Inputs */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const value = answers[cat.id] || '';
          const valid = value.trim().length >= 2 && value.trim()[0]?.toLowerCase() === letter.toLowerCase();
          return (
            <div key={cat.id} className="flex items-center gap-2">
              <label className="w-32 sm:w-40 flex-shrink-0 text-sm flex items-center gap-1">
                <span>{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </label>
              <input
                ref={(el) => (inputRefs.current[cat.id] = el)}
                type="text"
                disabled={iSubmitted}
                value={value}
                onChange={(e) => handleChange(cat.id, e.target.value.slice(0, 40))}
                placeholder={`En ${letter}…`}
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 outline-none text-base ${
                  iSubmitted ? 'opacity-60' :
                  value && !valid ? 'border-rose-500/50 focus:border-rose-500' :
                  value && valid ? 'border-emerald-500/50 focus:border-emerald-500' :
                  'border-slate-700 focus:border-brand'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Boutons STOP + C'est bon (en bas, en gros) */}
      {!iSubmitted && (
        <div className="space-y-2 pt-2">
          {stopVisible && (
            <button
              onClick={stopEnabled ? callStop : undefined}
              disabled={!stopEnabled}
              title={stopHint}
              className={`w-full font-bold py-3 sm:py-4 rounded-xl shadow-lg text-lg sm:text-xl transition ${
                stopEnabled
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-rose-900/40 text-rose-300/60 cursor-not-allowed'
              }`}
            >
              ⛔ STOP
              {!stopEnabled && stopMode === 'anyFull' && (
                <span className="block text-xs font-normal mt-1 opacity-90">
                  ({filledCount}/{categories.length} remplies — il faut tout remplir)
                </span>
              )}
            </button>
          )}
          <button
            onClick={submitAll}
            className="btn btn-primary w-full"
          >
            ✅ C'est bon ! ({filledCount}/{categories.length} remplie{filledCount > 1 ? 's' : ''})
            {allFilled && ' 🌟'}
          </button>
        </div>
      )}
      {iSubmitted && (
        <p className="text-center text-emerald-300 italic">
          ✓ Tes réponses sont verrouillées. En attente des autres…
        </p>
      )}

      {/* Statut des autres joueurs */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {room.players.map(pl => {
          const sub = submittedIds.has(pl.id);
          return (
            <span
              key={pl.id}
              className={`px-2 py-1 rounded-full text-xs ${
                sub ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {sub ? '✓' : '✏️'} {pl.pseudo}
            </span>
          );
        })}
      </div>
    </div>
  );
}
