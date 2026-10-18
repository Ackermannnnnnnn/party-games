import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import Village, { Campfire } from './Village.jsx';
import RoleCard from './RoleCard.jsx';
import { ActionBar } from './Hud.jsx';
import { withArticle } from './roles.js';
import { arrowsFrom, weightedCounts } from './useWerewolf.js';

const act = (type, payload) => api.gameAction(type, payload);

function DeadNote({ ctx }) {
  if (ctx.alive || ctx.spectator) return null;
  return <p className="text-center text-xs text-slate-300/80">👻 Tu es mort : tu peux écouter, mais plus parler ni voter.</p>;
}

/** Révélation d'un mort : avatar, nom, puis la carte qui se retourne. */
function DeathCard({ ctx, d, delay = 0 }) {
  const { byId, name } = ctx;
  const [flip, setFlip] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFlip(true), 900 + delay); return () => clearTimeout(t); }, [delay]);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay / 1000 }} className="flex flex-col items-center gap-2 w-28 sm:w-36">
      <div className="relative">
        <Avatar id={byId[d.id]?.avatar} size="md" className="grayscale" />
        <span className="absolute -bottom-1 -right-1 text-xl" aria-hidden="true">{d.cause === 'love' ? '💔' : '🪦'}</span>
      </div>
      <p className="font-bold text-center leading-tight">{name(d.id)}</p>
      {d.role ? <RoleCard roleId={d.role} size="sm" flipped={flip} /> : <p className="text-xs text-slate-400 italic">Rôle gardé secret</p>}
      {d.cause === 'love' && <p className="text-[11px] text-pink-300">mort de chagrin</p>}
    </motion.div>
  );
}

export function Morning({ ctx }) {
  const { s, isHost } = ctx;
  const deaths = s.morning?.deaths || [];
  return (
    <div className="space-y-4">
      <div className="lg-glass p-4 sm:p-6">
        {deaths.length === 0 ? (
          <div className="text-center py-6">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl inline-block" aria-hidden="true">🕊️</motion.span>
            <p className="lg-title text-xl mt-2">Personne n'est mort cette nuit !</p>
          </div>
        ) : (
          <>
            <p className="lg-title text-center text-lg mb-4">{deaths.length > 1 ? 'Les victimes de la nuit' : 'La victime de la nuit'}</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {deaths.map((d, i) => <DeathCard key={d.id} ctx={ctx} d={d} delay={i * 900} />)}
            </div>
          </>
        )}
      </div>
      {isHost && <div className="text-center"><button type="button" className="lg-btn lg-btn-ghost !py-2 text-sm" onClick={() => act('skip')}>Continuer ⏭</button></div>}
    </div>
  );
}

export function Hunter({ ctx }) {
  const { s, playerId, name, known, tags } = ctx;
  const [sel, setSel] = useState(null);
  const mine = s.hunterId === playerId;
  return (
    <div className="space-y-3">
      <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood"
        canPick={mine ? (p) => p.alive : undefined} picked={sel ? [sel] : []} onPick={(id) => setSel(id === sel ? null : id)}
        arrows={sel ? [{ from: playerId, to: sel, color: '#ef4444' }] : []}
        center={<Campfire icon="🏹" label={mine ? (sel ? `Viser ${name(sel)}` : 'Choisis ta cible') : `${name(s.hunterId)} vise…`} />} />
      {mine ? (
        <ActionBar>
          <p className="lg-title text-amber-200">🏹 Ton dernier souffle</p>
          <p className="text-sm text-slate-300">Tu es mort, mais tu emportes quelqu'un avec toi.</p>
          <button type="button" className="lg-btn lg-btn-blood" disabled={!sel} onClick={() => act('hunter', { targetId: sel })}>🔫 Tirer sur {sel ? name(sel) : '…'}</button>
        </ActionBar>
      ) : <DeadNote ctx={ctx} />}
    </div>
  );
}

export function Succession({ ctx }) {
  const { s, playerId, name, known, tags } = ctx;
  const [sel, setSel] = useState(null);
  const mine = s.successionFrom === playerId;
  return (
    <div className="space-y-3">
      <Village players={s.players} meId={playerId} known={known} tags={tags}
        canPick={mine ? (p) => p.alive : undefined} picked={sel ? [sel] : []} onPick={(id) => setSel(id === sel ? null : id)}
        center={<Campfire icon="👑" label={mine ? 'Ton successeur ?' : `${name(s.successionFrom)} choisit…`} />} />
      {mine && (
        <ActionBar>
          <p className="text-sm text-slate-300">Avant de mourir, transmets ton écharpe de maire.</p>
          <button type="button" className="lg-btn" disabled={!sel} onClick={() => act('succession', { targetId: sel })}>👑 Nommer {sel ? name(sel) : '…'}</button>
        </ActionBar>
      )}
    </div>
  );
}

export function MayorElection({ ctx }) {
  const { s, priv, playerId, alive, name, known, tags } = ctx;
  const votes = s.mayorVotes || {};
  const counts = {};
  for (const t of Object.values(votes)) counts[t] = (counts[t] || 0) + 1;
  const voters = s.players.filter((p) => p.alive).length;
  return (
    <div className="space-y-3">
      <Village players={s.players} meId={playerId} known={known} tags={tags}
        canPick={alive ? (p) => p.alive : undefined} picked={priv.myVote ? [priv.myVote] : []}
        onPick={(id) => act('mayorVote', { targetId: id })} arrows={arrowsFrom(votes, '#fde68a')} counts={counts}
        center={<Campfire icon="👑" label="Élection du maire" sub={`${Object.keys(votes).length}/${voters} votes`} />} />
      {alive ? (
        <ActionBar>
          <p className="text-sm text-slate-300">{priv.myVote ? <>Tu votes pour <strong className="text-amber-200">{name(priv.myVote)}</strong>. Tu peux changer d'avis.</> : 'Touche le joueur que tu veux comme maire (tu peux voter pour toi).'}</p>
        </ActionBar>
      ) : <DeadNote ctx={ctx} />}
    </div>
  );
}

export function MayorElected({ ctx }) {
  const { s, byId, name } = ctx;
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <motion.span initial={{ y: -60, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 90 }} className="text-6xl" aria-hidden="true">👑</motion.span>
      <Avatar id={byId[s.mayorId]?.avatar} size="lg" />
      <p className="lg-title text-2xl sm:text-3xl text-amber-200">{name(s.mayorId)}</p>
      <p className="text-slate-200">est le nouveau maire. Sa voix comptera double.</p>
    </div>
  );
}

function AllVotedCountdown({ at }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  if (!at) return null;
  const left = Math.max(0, Math.ceil((at + 10000 - now) / 1000));
  return <p className="text-center text-sm font-semibold text-emerald-300">✓ Tout le monde a voté — clôture dans {left} s (vous pouvez encore changer)</p>;
}

export function Debate({ ctx }) {
  const { s, priv, playerId, alive, name, known, tags, isHost } = ctx;
  const runoff = s.phase === 'RUNOFF';
  const votes = s.votes || {};
  const counts = s.options.publicVotes ? weightedCounts(votes, s.mayorId) : {};
  const aliveCount = s.players.filter((p) => p.alive).length;
  const my = priv.myVote;
  const canVoteFor = (p) => p.alive && p.id !== playerId && (!s.candidates || s.candidates.includes(p.id));
  return (
    <div className="space-y-3">
      {runoff && (
        <div className="lg-glass p-3 text-center">
          <p className="lg-title text-amber-200">⚖️ Second tour</p>
          <p className="text-sm text-slate-300">Égalité entre {s.candidates.map(name).join(' et ')}. Seuls eux peuvent être désignés.</p>
        </div>
      )}
      <AllVotedCountdown at={s.allVotedAt} />
      <Village players={s.players} meId={playerId} known={known} tags={tags}
        canPick={alive ? canVoteFor : undefined} picked={my && my !== 'none' ? [my] : []}
        onPick={(id) => act('vote', { targetId: id === my ? null : id })}
        arrows={s.options.publicVotes ? arrowsFrom(votes, '#fde68a') : []} counts={counts} voted={s.votedIds || []}
        center={<Campfire icon="⚖️" label={runoff ? 'Second tour' : 'Le vote du village'} sub={`${(s.votedIds || []).length}/${aliveCount} ont voté${s.mayorId ? ' · 👑 compte double' : ''}`} />} />
      {alive ? (
        <ActionBar>
          <p className="text-sm text-slate-300">
            {my === 'none' ? 'Tu as voté blanc.' : my ? <>Tu accuses <strong className="text-amber-200">{name(my)}</strong>.</> : runoff ? 'Touche l\'un des ex-æquo pour voter.' : 'Débattez à voix haute, puis touche le joueur que tu accuses.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {my !== 'none' && <button type="button" className="lg-btn lg-btn-ghost !py-2 text-sm" onClick={() => act('vote', { targetId: 'none' })}>🙅 Voter blanc</button>}
            {my && <button type="button" className="lg-btn lg-btn-ghost !py-2 text-sm" onClick={() => act('vote', { targetId: null })}>↩️ Retirer mon vote</button>}
          </div>
        </ActionBar>
      ) : <DeadNote ctx={ctx} />}
      {isHost && (
        <div className="text-center">
          <button type="button" className="text-xs text-slate-300 underline decoration-dotted" style={{ minHeight: 0 }} onClick={() => act('skip')}>⏭ Clore le vote maintenant (hôte)</button>
        </div>
      )}
    </div>
  );
}

export function Tiebreak({ ctx }) {
  const { s, playerId, name, known, tags } = ctx;
  const [sel, setSel] = useState(null);
  const mine = s.mayorId === playerId;
  return (
    <div className="space-y-3">
      <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood"
        canPick={mine ? (p) => s.candidates.includes(p.id) : undefined} picked={sel ? [sel] : []} onPick={(id) => setSel(id === sel ? null : id)}
        counts={s.lastTally || {}}
        center={<Campfire icon="👑" label={mine ? 'À toi de trancher' : `Le maire ${name(s.mayorId)} tranche…`} />} />
      {mine && (
        <ActionBar>
          <p className="text-sm text-slate-300">Toujours l'égalité. En tant que maire, c'est toi qui décides.</p>
          <button type="button" className="lg-btn lg-btn-blood" disabled={!sel} onClick={() => act('tiebreak', { targetId: sel })}>⚖️ Éliminer {sel ? name(sel) : '…'}</button>
        </ActionBar>
      )}
    </div>
  );
}

export function Execution({ ctx }) {
  const { s, byId, name, isHost } = ctx;
  const e = s.execution || {};
  const [flip, setFlip] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFlip(true), 1600); return () => clearTimeout(t); }, [e.id]);
  const wolf = e.role === 'loup_garou' || e.role === 'loup_blanc';
  const tally = Object.entries(e.tally || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <div className="lg-glass p-5 sm:p-7 flex flex-col items-center gap-3 text-center">
        {e.id ? (
          <>
            <motion.div initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
              <Avatar id={byId[e.id]?.avatar} size="lg" className={flip ? 'grayscale' : ''} />
              <span className="absolute -bottom-2 -right-2 text-3xl" aria-hidden="true">⚖️</span>
            </motion.div>
            <p className="lg-title text-2xl">{name(e.id)}</p>
            {e.role ? <RoleCard roleId={e.role} size="md" flipped={flip} /> : <p className="text-slate-400 italic text-sm">Son rôle reste secret…</p>}
            {flip && e.role && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`lg-title text-lg ${wolf ? 'text-emerald-300' : 'text-red-300'}`}>
                {wolf ? `Bien joué ! C'était ${withArticle(e.role, true)} 🐺` : `Hélas… c'était ${withArticle(e.role, true)}.`}
              </motion.p>
            )}
            {(e.also || []).map((d) => <p key={d.id} className="text-pink-300 text-sm">💔 {name(d.id)} meurt de chagrin.</p>)}
          </>
        ) : (
          <>
            <span className="text-6xl" aria-hidden="true">🤷</span>
            <p className="lg-title text-xl">{e.tie ? 'Égalité parfaite : personne n\'est éliminé.' : 'Personne n\'est éliminé aujourd\'hui.'}</p>
          </>
        )}
        {tally.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">Voix : {tally.map(([id, c]) => `${name(id)} ${c}`).join(' · ')}</p>
        )}
      </div>
      {isHost && <div className="text-center"><button type="button" className="lg-btn lg-btn-ghost !py-2 text-sm" onClick={() => act('skip')}>Continuer ⏭</button></div>}
    </div>
  );
}
