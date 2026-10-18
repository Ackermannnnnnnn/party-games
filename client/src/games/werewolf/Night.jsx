import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../hooks/useSocket.js';
import Avatar from '../../components/Avatar.jsx';
import Village, { Campfire } from './Village.jsx';
import RoleCard from './RoleCard.jsx';
import { ActionBar } from './Hud.jsx';
import { role, withArticle } from './roles.js';
import { arrowsFrom } from './useWerewolf.js';

const act = (type, payload) => api.gameAction(type, payload);
const STEP_ICON = { DUSK: '🌙', CUPIDON: '💘', LOVERS: '💞', GUARD: '🛡️', WOLVES: '🐺', WHITE_WOLF: '🐺', SEER: '🔮', WITCH: '🧪' };

// ───────── Distribution ─────────
export function Deal({ ctx }) {
  const { s, priv, playerId, name, isHost } = ctx;
  const [flipped, setFlipped] = useState(false);
  const ready = (s.readyIds || []).includes(playerId);
  const r = role(priv.role);
  const total = s.players.filter((p) => !p.left).length;
  if (priv.spectator) {
    return <ActionBar><p className="text-slate-300">👀 Tu regardes cette partie en spectateur.</p></ActionBar>;
  }
  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      <motion.div initial={{ y: 40, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120 }}
        className={flipped ? '' : 'lg-card-glow'}>
        <RoleCard roleId={priv.role} size="lg" flipped={flipped} desc onClick={() => setFlipped((f) => !f)} backLabel="Touche pour découvrir ta carte" />
      </motion.div>
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lg-glass p-4 max-w-md w-full text-center space-y-2">
            <p className="lg-title text-amber-200 text-sm">Objectif : {r.goal}</p>
            {priv.pack?.length > 0 && <p className="text-sm">🐺 Ta meute : <strong className="text-red-300">{priv.pack.map(name).join(', ')}</strong></p>}
            {priv.role === 'loup_garou' && !priv.pack?.length && <p className="text-sm text-red-200">Tu chasses seul cette fois.</p>}
            <p className="text-xs text-slate-400">Touche la carte pour la recacher. Tu pourras la revoir à tout moment avec « Ma carte ».</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col items-center gap-2">
        <button type="button" className="lg-btn" disabled={ready || !flipped} onClick={() => { setFlipped(false); act('ready'); }}>
          {ready ? '✓ Prêt' : flipped ? "J'ai mémorisé ma carte" : 'Découvre ta carte d\'abord'}
        </button>
        <p className="text-xs text-slate-300">{(s.readyIds || []).length} / {total} prêts</p>
        {isHost && !ready && <p className="text-[11px] text-slate-400">La nuit tombe quand tout le monde est prêt.</p>}
        {isHost && ready && (s.readyIds || []).length < total && (
          <button type="button" className="text-xs underline text-slate-300" style={{ minHeight: 0 }} onClick={() => act('skip')}>Lancer la nuit sans attendre</button>
        )}
      </div>
    </div>
  );
}

// ───────── Écran « tu dors » ─────────
function Sleep({ s, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 gap-3">
      <div className="relative">
        <span className="text-7xl sm:text-8xl" aria-hidden="true">😴</span>
        <span className="lg-sleep-z absolute -top-2 -right-4 text-2xl text-indigo-200" aria-hidden="true">z</span>
        <span className="lg-sleep-z absolute -top-6 right-0 text-xl text-indigo-200" style={{ animationDelay: '1s' }} aria-hidden="true">z</span>
      </div>
      <p className="lg-title text-xl sm:text-2xl text-indigo-100">{text || 'Ferme les yeux…'}</p>
      <p className="text-sm text-indigo-200/70 max-w-xs">Pose ton téléphone, écran vers le bas. On te réveillera si c'est ton tour.</p>
      <span className="text-4xl opacity-70 mt-2" aria-hidden="true">{STEP_ICON[s.step] || '🌙'}</span>
    </div>
  );
}

// ───────── Nuit ─────────
export function Night({ ctx }) {
  const { s, priv, alive, ghost } = ctx;
  const step = s.step;
  const r = priv.role;
  const mine = alive && (
    (step === 'CUPIDON' && r === 'cupidon') ||
    (step === 'LOVERS' && priv.lover) ||
    (step === 'GUARD' && r === 'garde') ||
    (step === 'WOLVES' && (r === 'loup_garou' || r === 'loup_blanc' || r === 'petite_fille')) ||
    (step === 'WHITE_WOLF' && r === 'loup_blanc') ||
    (step === 'SEER' && r === 'voyante') ||
    (step === 'WITCH' && r === 'sorciere')
  );
  if (!mine) {
    if (ghost) return <GhostNight ctx={ctx} />;
    return <Sleep s={s} />;
  }
  switch (step) {
    case 'CUPIDON': return <Cupid ctx={ctx} />;
    case 'LOVERS': return <Lovers ctx={ctx} />;
    case 'GUARD': return <Guard ctx={ctx} />;
    case 'WOLVES': return r === 'petite_fille' ? <LittleGirl ctx={ctx} /> : <Wolves ctx={ctx} />;
    case 'WHITE_WOLF': return <WhiteWolf ctx={ctx} />;
    case 'SEER': return <Seer ctx={ctx} />;
    case 'WITCH': return <Witch ctx={ctx} />;
    default: return <Sleep s={s} />;
  }
}

function useStepSelection(s, max = 1) {
  const [sel, setSel] = useState([]);
  useEffect(() => { setSel([]); }, [s.step, s.night]);
  const toggle = (id) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : max === 1 ? [id] : [...cur, id].slice(-max)));
  return [sel, toggle, setSel];
}

function YourTurn({ icon, title, text }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-2">
      <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/90">C'est ton tour</p>
      <p className="lg-title text-xl sm:text-2xl mt-0.5">{icon} {title}</p>
      {text && <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">{text}</p>}
    </motion.div>
  );
}

function Cupid({ ctx }) {
  const { s, priv, playerId, name, known, tags } = ctx;
  const [sel, toggle] = useStepSelection(s, 2);
  if (priv.cupidDone) {
    return (
      <div className="space-y-3">
        <YourTurn icon="💘" title="Flèches décochées" />
        <Village players={s.players} meId={playerId} known={known} tags={tags} center={<Campfire icon="💞" label={`${name(priv.lovers[0])} & ${name(priv.lovers[1])}`} />} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <YourTurn icon="💘" title="Cupidon" text="Choisis deux joueurs qui tomberont amoureux (tu peux te choisir)." />
      <Village players={s.players} meId={playerId} known={known} tags={tags} canPick={(p) => p.alive} picked={sel} onPick={toggle}
        center={<Campfire icon="💘" label={sel.length ? sel.map(name).join(' + ') : 'Deux cœurs à unir'} />} />
      <ActionBar>
        <button type="button" className="lg-btn" disabled={sel.length !== 2} onClick={() => act('cupid', { targetIds: sel })}>
          💘 Unir {sel.length === 2 ? `${name(sel[0])} et ${name(sel[1])}` : 'deux cœurs'}
        </button>
      </ActionBar>
    </div>
  );
}

function Lovers({ ctx }) {
  const { priv, byId, name } = ctx;
  const p = byId[priv.lover];
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <motion.span animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-7xl" aria-hidden="true">💞</motion.span>
      <p className="lg-title text-2xl">Tu es amoureux…</p>
      <div className="flex items-center gap-3 lg-glass px-5 py-3">
        <Avatar id={p?.avatar} size="md" />
        <span className="text-xl font-bold text-pink-200">{name(priv.lover)}</span>
      </div>
      <p className="text-sm text-slate-300 max-w-sm">Si l'un de vous meurt, l'autre meurt de chagrin. Et si vous êtes un loup et un villageois, vous gagnez ensemble en restant les deux derniers !</p>
    </div>
  );
}

function Guard({ ctx }) {
  const { s, priv, playerId, name, known, tags } = ctx;
  const [sel, toggle] = useStepSelection(s);
  if (priv.guardDone) {
    return (
      <div className="space-y-3">
        <YourTurn icon="🛡️" title={`Tu veilles sur ${name(priv.guardTarget)}`} text="Rendors-toi, garde." />
        <Village players={s.players} meId={playerId} known={known} tags={tags} picked={[priv.guardTarget]} center={<Campfire icon="🛡️" />} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <YourTurn icon="🛡️" title="Le garde" text={`Qui protèges-tu des loups cette nuit ?${priv.guardLast ? ` (pas ${name(priv.guardLast)}, déjà protégé hier)` : ''}`} />
      <Village players={s.players} meId={playerId} known={known} tags={tags} canPick={(p) => p.alive && p.id !== priv.guardLast} picked={sel} onPick={toggle}
        center={<Campfire icon="🛡️" label={sel[0] ? name(sel[0]) : 'Choisis un joueur'} />} />
      <ActionBar>
        <button type="button" className="lg-btn" disabled={!sel[0]} onClick={() => act('guard', { targetId: sel[0] })}>🛡️ Protéger {sel[0] ? name(sel[0]) : ''}</button>
      </ActionBar>
    </div>
  );
}

function WolfChat({ messages, canWrite, name, anonymous }) {
  const [text, setText] = useState('');
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [messages.length]);
  return (
    <div className="lg-glass p-3 border-red-500/20">
      <p className="text-[11px] uppercase tracking-[0.25em] text-red-300/90 mb-2">{anonymous ? '👀 Ce que murmurent les loups' : '🐺 Murmures de la meute'}</p>
      <div ref={box} className="lg-scroll max-h-40 overflow-y-auto space-y-1.5 text-sm pr-1">
        {messages.length === 0 && <p className="text-slate-400 italic text-xs">{anonymous ? 'Silence… pour l\'instant.' : 'Personne n\'a encore parlé. Coordonnez-vous en silence !'}</p>}
        {messages.map((m, i) => (
          <p key={i} className="leading-snug">
            <span className="font-bold text-red-300">{anonymous ? `Loup ${m.who}` : name(m.from)} :</span> <span className="text-slate-100">{m.text}</span>
          </p>
        ))}
      </div>
      {canWrite && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { act('wolfChat', { text }); setText(''); } }}>
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} placeholder="Chuchote à ta meute…" aria-label="Message à la meute"
            className="flex-1 min-w-0 rounded-full bg-black/50 border border-red-400/30 px-4 py-2 text-sm outline-none focus:border-red-300" />
          <button type="submit" className="lg-btn lg-btn-blood !px-4 !py-2 text-sm" disabled={!text.trim()}>Envoyer</button>
        </form>
      )}
    </div>
  );
}

function Wolves({ ctx }) {
  const { s, priv, playerId, name, known, tags } = ctx;
  const votes = priv.wolfVotes || {};
  const myVote = votes[playerId];
  const counts = {};
  for (const t of Object.values(votes)) counts[t] = (counts[t] || 0) + 1;
  const pack = new Set([playerId, ...(priv.pack || [])]);
  const alivePack = s.players.filter((p) => pack.has(p.id) && p.alive);
  const agreed = alivePack.length > 0 && alivePack.every((p) => votes[p.id] && votes[p.id] === votes[alivePack[0].id]);
  return (
    <div className="space-y-3">
      <YourTurn icon="🐺" title="La meute se réveille" text="Choisissez ensemble votre victime. Quand vous êtes tous d'accord, la nuit continue." />
      {priv.spied && (
        <motion.p animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-center text-sm font-semibold text-amber-200">
          👀 Vous sentez qu'on vous observe… la petite fille a les yeux entrouverts !
        </motion.p>
      )}
      <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood"
        canPick={(p) => p.alive && !pack.has(p.id)} picked={myVote ? [myVote] : []}
        onPick={(id) => act('wolfVote', { targetId: id === myVote ? null : id })}
        arrows={arrowsFrom(votes, '#ef4444')} counts={counts}
        center={<Campfire icon="🐺" label={agreed ? `Accord : ${name(votes[alivePack[0].id])}` : myVote ? `Ton choix : ${name(myVote)}` : 'Touchez votre proie'} sub={agreed ? 'La meute s\'élance…' : `${Object.keys(votes).length}/${alivePack.length} loups ont choisi`} />} />
      <WolfChat messages={priv.wolfChat || []} canWrite name={name} />
    </div>
  );
}

function LittleGirl({ ctx }) {
  const { s, priv, playerId, known, tags } = ctx;
  const spying = !!priv.spying;
  return (
    <div className="space-y-3">
      <YourTurn icon="👧" title="Les loups rôdent…" text="Tu peux entrouvrir les yeux pour espionner la meute. Attention : ils sentiront ton regard." />
      <div className="relative">
        <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood" counts={spying ? priv.spyTargets || {} : {}} dimmed={!spying}
          center={<Campfire icon={spying ? '👀' : '🙈'} label={spying ? 'Tu les vois…' : 'Les yeux fermés'} />} />
        {spying && <div className="lg-peek rounded-3xl" aria-hidden="true" />}
      </div>
      <ActionBar>
        <button type="button" className={`lg-btn ${spying ? 'lg-btn-ghost' : 'lg-btn-violet'}`} onClick={() => act('spy', { on: !spying })}>
          {spying ? '🙈 Refermer les yeux' : '👀 Entrouvrir les yeux'}
        </button>
      </ActionBar>
      {spying && <WolfChat messages={priv.spyChat || []} anonymous name={() => ''} />}
    </div>
  );
}

function WhiteWolf({ ctx }) {
  const { s, priv, playerId, name, known, tags } = ctx;
  const [sel, toggle] = useStepSelection(s);
  const pack = new Set(priv.pack || []);
  if (priv.wwDone) return <Sleep s={s} text="Le loup blanc se rendort, repu…" />;
  return (
    <div className="space-y-3">
      <YourTurn icon="🐺" title="Le loup blanc" text="Cette nuit, tu peux dévorer un membre de la meute… ou l'épargner." />
      <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood" canPick={(p) => p.alive && pack.has(p.id)} picked={sel} onPick={toggle}
        center={<Campfire icon="🐺" label={sel[0] ? name(sel[0]) : 'Un loup de trop ?'} />} />
      <ActionBar>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="lg-btn lg-btn-blood" disabled={!sel[0]} onClick={() => act('whiteWolf', { targetId: sel[0] })}>Dévorer {sel[0] ? name(sel[0]) : ''}</button>
          <button type="button" className="lg-btn lg-btn-ghost" onClick={() => act('whiteWolf', {})}>Épargner la meute</button>
        </div>
      </ActionBar>
    </div>
  );
}

function Seer({ ctx }) {
  const { s, priv, playerId, name, known, tags, byId } = ctx;
  const [sel, toggle] = useStepSelection(s);
  const tonight = (priv.seerHistory || []).find((h) => h.n === s.night);
  const [flip, setFlip] = useState(false);
  useEffect(() => { setFlip(false); if (tonight) { const t = setTimeout(() => setFlip(true), 500); return () => clearTimeout(t); } return undefined; }, [tonight?.id]);
  if (tonight) {
    const wolf = tonight.role === 'loup_garou' || tonight.role === 'loup_blanc';
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <YourTurn icon="🔮" title="Ta vision" />
        <div className="flex items-center gap-2"><Avatar id={byId[tonight.id]?.avatar} size="sm" /><span className="font-bold text-lg">{name(tonight.id)}</span></div>
        <RoleCard roleId={tonight.role} size="md" flipped={flip} />
        <AnimatePresence>
          {flip && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`lg-title text-lg ${wolf ? 'text-red-300' : 'text-violet-200'}`}>
              {name(tonight.id)} est {withArticle(tonight.role, true)}{wolf ? ' !' : '.'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <YourTurn icon="🔮" title="La voyante" text="Sonde l'âme d'un joueur pour découvrir son vrai rôle." />
      <Village players={s.players} meId={playerId} known={known} tags={tags} canPick={(p) => p.alive && p.id !== playerId && !known[p.id]} picked={sel} onPick={toggle}
        center={<Campfire icon="🔮" label={sel[0] ? name(sel[0]) : 'Qui sonder ?'} />} />
      <ActionBar>
        <button type="button" className="lg-btn lg-btn-violet" disabled={!sel[0]} onClick={() => act('seer', { targetId: sel[0] })}>🔮 Sonder {sel[0] ? name(sel[0]) : ''}</button>
      </ActionBar>
    </div>
  );
}

function Witch({ ctx }) {
  const { s, priv, playerId, name, known, tags, byId } = ctx;
  const [heal, setHeal] = useState(false);
  const [kill, toggleKill] = useStepSelection(s);
  const potions = priv.potions || {};
  if (priv.witchDone) return <Sleep s={s} text="La sorcière range ses fioles…" />;
  const victim = priv.victim;
  return (
    <div className="space-y-3">
      <YourTurn icon="🧪" title="La sorcière" />
      <div className="lg-glass p-4 text-center">
        {victim ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-slate-300">Cette nuit, les loups ont attaqué…</p>
            <div className="flex items-center gap-2"><Avatar id={byId[victim]?.avatar} size="md" /><span className="text-2xl font-bold text-red-300">{name(victim)}</span></div>
            {potions.heal ? (
              <button type="button" onClick={() => setHeal((h) => !h)} className={`lg-btn ${heal ? 'lg-btn-green' : 'lg-btn-ghost'}`}>
                {heal ? '✓ Potion de vie versée' : '💚 Utiliser la potion de vie'}
              </button>
            ) : <p className="text-xs text-slate-400">Ta potion de vie est déjà utilisée.</p>}
          </div>
        ) : <p className="text-sm text-slate-300">Personne n'a été attaqué cette nuit.</p>}
      </div>
      {potions.kill ? (
        <>
          <p className="text-center text-sm text-slate-300">☠️ Potion de mort : touche un joueur pour l'empoisonner (facultatif).</p>
          <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood" canPick={(p) => p.alive && p.id !== playerId} picked={kill} onPick={toggleKill}
            center={<Campfire icon="🧪" label={kill[0] ? `Poison : ${name(kill[0])}` : 'Aucun poison'} />} />
        </>
      ) : <p className="text-center text-xs text-slate-400">Ta potion de mort est déjà utilisée.</p>}
      <ActionBar>
        <button type="button" className="lg-btn" onClick={() => act('witch', { heal, killId: kill[0] || null })}>
          {heal || kill[0] ? `Valider${heal ? ' 💚' : ''}${kill[0] ? ' ☠️' : ''}` : 'Ne rien faire et se rendormir'}
        </button>
      </ActionBar>
    </div>
  );
}

/** Les morts suivent la nuit en coulisses. */
function GhostNight({ ctx }) {
  const { s, playerId, known, tags, ghost, name } = ctx;
  const votes = ghost.wolfVotes || {};
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-slate-300">👻 Depuis l'au-delà, tu vois tout… mais tu ne peux rien dire.</p>
      <Village players={s.players} meId={playerId} known={known} tags={tags} pickTone="blood" arrows={arrowsFrom(votes, '#ef4444')}
        center={<Campfire icon={STEP_ICON[s.step] || '🌙'} label={s.step === 'WOLVES' && Object.keys(votes).length ? `Cible : ${[...new Set(Object.values(votes))].map(name).join(', ')}` : ''} />} />
    </div>
  );
}
