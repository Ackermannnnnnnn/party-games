import { motion } from 'framer-motion';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import RoleCard from './RoleCard.jsx';
import { WINNERS } from './roles.js';
import { groupLog, publicLine, secretLine } from './Chronicle.jsx';

const CAUSE = { wolves: 'dévoré', witch: 'empoisonné', white_wolf: 'dévoré par le loup blanc', vote: 'éliminé par le village', hunter: 'abattu par le chasseur', love: 'mort de chagrin', left: 'parti' };

export default function GameOver({ ctx }) {
  const { s, playerId, name, isHost } = ctx;
  const res = s.result || { winner: 'nobody', winners: [] };
  const w = WINNERS[res.winner] || WINNERS.nobody;
  const iWon = res.winners.includes(playerId);
  const deaths = Object.fromEntries((s.deaths || []).map((d) => [d.id, d]));
  const groups = groupLog(s.log || [], s.secret || []);
  const lovers = new Set(s.lovers || []);

  return (
    <div className="space-y-5">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 90 }}
        className="text-center pt-4">
        <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="inline-block text-7xl sm:text-8xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          style={{ filter: res.winner === 'white_wolf' ? 'grayscale(1) brightness(1.6)' : undefined }} aria-hidden="true">{w.icon}</motion.span>
        <h2 className="lg-title text-3xl sm:text-5xl font-bold mt-2" style={{ color: w.color, textShadow: `0 0 30px ${w.color}66` }}>{w.title}</h2>
        <p className="text-slate-200 mt-2 max-w-lg mx-auto text-sm sm:text-base">{w.text}</p>
        {!ctx.spectator && (
          <p className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${iWon ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40' : 'bg-red-500/15 text-red-200 border border-red-300/30'}`}>
            {iWon ? '🏆 Tu as gagné !' : '💀 Tu as perdu…'}
          </p>
        )}
      </motion.div>

      <div className="lg-glass p-4">
        <p className="lg-title text-sm text-amber-100/90 mb-3 text-center">Les cartes révélées</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
          {s.players.map((p, i) => {
            const d = deaths[p.id];
            const winner = res.winners.includes(p.id);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
                className={`flex flex-col items-center gap-1 text-center ${winner ? '' : 'opacity-75'}`}>
                <div className={`relative rounded-[1.1rem] ${winner ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent' : ''}`}>
                  <RoleCard roleId={p.role} size="sm" flipped />
                  <span className="absolute -top-2 -left-2"><Avatar id={p.avatar} size="xs" /></span>
                  {lovers.has(p.id) && <span className="absolute -top-2 -right-2 text-lg" aria-hidden="true">❤️</span>}
                  {p.mayor && <span className="absolute -bottom-2 -left-2 text-lg" aria-hidden="true">👑</span>}
                </div>
                <p className={`text-xs font-bold leading-tight mt-1 max-w-[6rem] truncate ${p.id === playerId ? 'text-amber-200' : ''}`}>{p.pseudo}</p>
                <p className="text-[10px] text-slate-300 leading-tight">{d ? `${d.day ? 'jour' : 'nuit'} ${d.n} · ${CAUSE[d.cause] || 'mort'}` : '✨ survivant'}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="lg-glass p-4">
        <p className="lg-title text-sm text-amber-100/90 mb-3 text-center">📜 Ce qui s'est vraiment passé</p>
        <ol className="relative border-l border-white/15 ml-2 space-y-4">
          {groups.map((g) => (
            <li key={g.n} className="relative pl-4">
              <span className="absolute -left-[9px] mt-0.5 w-4 h-4 rounded-full bg-indigo-400/80 ring-4 ring-indigo-400/20" aria-hidden="true" />
              <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-200/90">🌙 Nuit {g.n}</p>
              <div className="mt-1 space-y-1 text-sm">
                {g.night.map((e, i) => { const l = secretLine(e, name); return l && <p key={i} className="text-violet-200/95"><span aria-hidden="true">{l.icon}</span> {l.text}</p>; })}
                {g.dawn && (() => { const l = publicLine(g.dawn, name); return <p className="text-slate-100"><span aria-hidden="true">{l.icon}</span> {l.text}</p>; })()}
              </div>
              {g.day.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/90 mt-2">☀️ Jour {g.n}</p>
                  <div className="mt-1 space-y-1 text-sm">
                    {g.day.map((e, i) => { const l = publicLine(e, name); return l && <p key={i}><span aria-hidden="true">{l.icon}</span> {l.text}</p>; })}
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>

      {isHost ? (
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" className="lg-btn" onClick={() => api.gameAction('restart')}>🔁 Rejouer (mêmes réglages)</button>
          <button type="button" className="lg-btn lg-btn-ghost" onClick={() => api.gameAction('endGame')}>🏠 Retour au salon</button>
        </div>
      ) : <p className="text-center text-sm text-slate-300 italic">L'hôte peut relancer une partie…</p>}
    </div>
  );
}
