import { useEffect, useMemo, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import { getGame } from '../games/registry.js';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const UNIVERSE_ICON = { film: '🎬', serie: '📺', anime: '🍥', musique: '🎵' };
const TEAM_COLOR = { red: 'bg-rose-600', blue: 'bg-sky-600', neutral: 'bg-amber-200 text-slate-900', assassin: 'bg-black', black: 'bg-black' };

const fmtDate = (ts) => new Date(ts).toLocaleString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDuration = (s) => (s == null ? '' : s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const monthLabel = (m) => new Date(`${m}-15`).toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' });

/**
 * Onglet admin « Historique » : toutes les parties terminées, avec joueurs, vainqueur et récap.
 * Les données viennent du serveur (branche « data » du dépôt GitHub).
 */
export default function HistoryAdmin({ password }) {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gameFilter, setGameFilter] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('');
  const [open, setOpen] = useState(null);

  const load = async (m) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${SERVER}/admin/history${m ? `?month=${m}` : ''}`, { headers: { 'X-Admin-Password': password } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `Erreur ${res.status}`);
      setData(d); setMonth(d.month);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(null); }, [password]);

  const records = data?.records || [];
  const q = playerFilter.trim().toLowerCase();
  const filtered = records.filter((r) => (gameFilter === 'all' || r.game === gameFilter) && (!q || r.players.some((p) => p.pseudo.toLowerCase().includes(q))));
  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const gamesInMonth = [...new Set(records.map((r) => r.game))];

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-lg">📜 Historique des parties</h3>
          <div className="flex items-center gap-2">
            <select value={month || ''} onChange={(e) => load(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
              {(data?.months || []).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button type="button" onClick={() => load(month)} className="btn btn-ghost text-sm" style={{ minHeight: 0 }} disabled={loading}>{loading ? '…' : '↻'}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="all">Tous les jeux</option>
            {gamesInMonth.map((g) => <option key={g} value={g}>{getGame(g)?.icon} {getGame(g)?.label || g}</option>)}
          </select>
          <input value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} placeholder="🔎 Joueur…"
            className="flex-1 min-w-[140px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand" />
        </div>
        {data?.storage === 'local' && <p className="text-xs text-amber-300">⚠️ Sans GITHUB_TOKEN, l'historique est perdu à chaque redémarrage du serveur.</p>}
        {error && <p className="text-sm text-rose-300">❌ {error}</p>}
      </div>

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Parties" value={stats.count} sub={stats.totalTime ? `${fmtDuration(stats.totalTime)} de jeu` : null} />
          <Stat label="Jeu le plus joué" value={stats.topGame ? `${getGame(stats.topGame[0])?.icon || ''} ${stats.topGame[1]}×` : '—'} sub={stats.topGame ? getGame(stats.topGame[0])?.label : null} />
          <Stat label="Le plus présent" value={stats.topPlayer ? stats.topPlayer[0] : '—'} sub={stats.topPlayer ? `${stats.topPlayer[1]} partie(s)` : null} />
          <Stat label="Le plus de victoires" value={stats.topWinner ? stats.topWinner[0] : '—'} sub={stats.topWinner ? `🏆 ${stats.topWinner[1]}` : null} />
        </div>
      )}

      {!loading && data && filtered.length === 0 && (
        <div className="card text-sm text-slate-400">Aucune partie {records.length ? 'avec ces filtres' : 'terminée ce mois-ci'}. Une partie apparaît ici dès qu'elle arrive à son écran de fin (podium, résultats…).</div>
      )}

      <ul className="space-y-2">
        {filtered.map((r) => (
          <li key={r.id} className="card !p-0 overflow-hidden">
            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full text-left p-3 sm:p-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{getGame(r.game)?.icon || '🎮'}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{r.label}</span>
                <span className="block text-xs text-slate-400">{fmtDate(r.endedAt)}{r.durationSec ? ` · ${fmtDuration(r.durationSec)}` : ''} · {r.players.length} joueur(s) · salle {r.room}</span>
                {r.winner && <span className="block text-xs text-amber-300 truncate">🏆 {r.winner}</span>}
              </span>
              <span className="hidden sm:flex -space-x-2 shrink-0">
                {r.players.slice(0, 6).map((p, i) => <Avatar key={i} id={p.avatar} size="sm" className="ring-2 ring-slate-900" />)}
                {r.players.length > 6 && <span className="w-8 h-8 rounded-full bg-slate-700 text-xs flex items-center justify-center ring-2 ring-slate-900">+{r.players.length - 6}</span>}
              </span>
              <span className="text-slate-500">{open === r.id ? '▲' : '▼'}</span>
            </button>
            {open === r.id && <Detail r={r} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card !p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-lg font-bold truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
    </div>
  );
}

function computeStats(records) {
  const games = new Map(); const players = new Map(); const wins = new Map();
  let totalTime = 0;
  for (const r of records) {
    games.set(r.game, (games.get(r.game) || 0) + 1);
    totalTime += r.durationSec || 0;
    for (const p of r.players) players.set(p.pseudo, (players.get(p.pseudo) || 0) + 1);
    const winners = r.ranking.some((x) => x.win === true) ? r.ranking.filter((x) => x.win) : r.ranking.filter((x) => x.rank === 1 && (x.score == null || x.score > 0));
    for (const w of winners) wins.set(w.pseudo, (wins.get(w.pseudo) || 0) + 1);
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  return { count: records.length, totalTime, topGame: top(games), topPlayer: top(players), topWinner: top(wins) };
}

function Detail({ r }) {
  return (
    <div className="border-t border-slate-700 p-3 sm:p-4 space-y-4 bg-slate-900/40">
      <section>
        <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Classement & joueurs</h4>
        <ol className="space-y-1">
          {r.ranking.map((p) => (
            <li key={p.rank} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${p.win || (p.win === undefined && p.rank === 1) ? 'bg-amber-500/15' : 'bg-white/[0.03]'}`}>
              <span className="w-6 text-center text-sm font-bold text-slate-400">{p.score != null ? p.rank : ''}</span>
              <Avatar id={p.avatar} size="xs" />
              <span className="flex-1 min-w-0 truncate">{p.pseudo} {p.win && '🏆'}</span>
              {p.detail && <span className="text-xs text-slate-400 truncate max-w-[50%]">{p.detail}</span>}
              {p.score != null && <span className="font-mono font-bold">{p.score}</span>}
            </li>
          ))}
        </ol>
        {r.host && <p className="text-xs text-slate-500 mt-1">Hôte : {r.host}</p>}
      </section>
      <Recap r={r} />
      <details>
        <summary className="text-xs text-slate-500 cursor-pointer">Options de la partie</summary>
        <pre className="text-[11px] text-slate-400 whitespace-pre-wrap mt-1">{formatOptions(r.options)}</pre>
      </details>
    </div>
  );
}

const formatOptions = (o) => Object.entries(o || {}).map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'object' && v ? JSON.stringify(v) : String(v)}`).join('\n');

function Section({ title, children }) {
  return (
    <section>
      <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">{title}</h4>
      {children}
    </section>
  );
}

const Found = ({ names }) => (names?.length
  ? <span className="text-xs text-emerald-300">✓ {names.join(', ')}</span>
  : <span className="text-xs text-slate-500">personne</span>);

/** Récap détaillé, propre à chaque jeu. */
function Recap({ r }) {
  const x = r.recap || {};
  switch (r.game) {
    case 'quiz':
      return (
        <Section title={`Questions (${x.questions?.length || 0})`}>
          <ol className="space-y-1.5 text-sm">
            {(x.questions || []).map((q, i) => (
              <li key={i} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                <span className="text-slate-400">{i + 1}.</span> {q.question}
                <span className="block"><strong className="text-emerald-300">{q.answer}</strong> · <Found names={q.found} /></span>
              </li>
            ))}
          </ol>
        </Section>
      );
    case 'blindtest':
      return (
        <Section title={`Extraits (${x.rounds?.length || 0})`}>
          <ol className="space-y-1 text-sm">
            {(x.rounds || []).map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                <span>{UNIVERSE_ICON[t.universe] || '🎵'}</span>
                <strong>{t.universe === 'musique' ? t.song : t.answer}</strong>
                <span className="text-xs text-slate-400">{t.artist}{t.universe !== 'musique' ? ` — ${t.song}` : ''}</span>
                <span className="ml-auto"><Found names={t.found} /></span>
              </li>
            ))}
          </ol>
        </Section>
      );
    case 'imposter':
      return (
        <Section title="La manche">
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <p className="rounded-lg bg-white/[0.03] px-2 py-1.5">Mot des civils : <strong className="text-emerald-300">{x.civilWord || '—'}</strong></p>
            <p className="rounded-lg bg-white/[0.03] px-2 py-1.5">Mot de l'imposteur : <strong className="text-rose-300">{x.imposterWord || '— (Mr White)'}</strong></p>
          </div>
          {x.theme && <p className="text-xs text-slate-400 mt-1">Thème : {x.theme}</p>}
          {x.mrWhiteGuess != null && <p className="text-xs text-slate-400">Proposition de Mr White : « {x.mrWhiteGuess} »</p>}
          {x.clues && Object.keys(x.clues).length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(x.clues).map(([who, list]) => (
                <li key={who}><strong>{who}</strong> : <span className="text-slate-300">{[].concat(list).flat().filter(Boolean).join(' · ')}</span></li>
              ))}
            </ul>
          )}
          {x.votes && Object.keys(x.votes).length > 0 && (
            <p className="text-xs text-slate-400 mt-2">Votes : {Object.entries(x.votes).map(([a, b]) => `${a} → ${typeof b === 'object' ? Object.values(b).join('/') : b}`).join(' · ')}</p>
          )}
        </Section>
      );
    case 'werewolf':
      return (
        <Section title={`La partie (${x.nights || 0} nuit${x.nights > 1 ? 's' : ''})`}>
          <ol className="space-y-1 text-sm">
            {(x.deaths || []).map((d, i) => <li key={i}>💀 <strong>{d.id}</strong> — {d.cause} {d.n != null ? `(nuit ${d.n})` : ''}</li>)}
          </ol>
          {x.lovers?.length > 0 && <p className="text-sm mt-1">💘 Amoureux : {x.lovers.join(' & ')}</p>}
        </Section>
      );
    case 'codenames':
      return (
        <Section title="La grille">
          {x.reason && <p className="text-xs text-slate-400 mb-1">Fin : {x.reason}</p>}
          <div className="grid grid-cols-5 gap-1">
            {(x.board || []).map((c, i) => (
              <span key={i} className={`rounded px-1 py-1 text-center text-[11px] font-semibold truncate ${TEAM_COLOR[c.color] || 'bg-slate-700'} ${c.revealed ? '' : 'opacity-50'}`}>{c.word}</span>
            ))}
          </div>
          {x.clues?.length > 0 && (
            <ul className="mt-2 text-sm space-y-0.5">
              {x.clues.map((c, i) => <li key={i}><span className={c.team === 'red' ? 'text-rose-300' : 'text-sky-300'}>●</span> {c.spy} : « {c.word} » {c.count}</li>)}
            </ul>
          )}
        </Section>
      );
    case 'telephone':
      return (
        <Section title="Les albums">
          <div className="space-y-2">
            {(x.albums || []).map((a, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-sm">
                <p className="font-semibold">📒 Album de {a.owner}</p>
                <ol className="text-slate-300">
                  {a.entries.map((e, j) => <li key={j}>{e.type === 'text' ? `✍️ ${e.author} : « ${e.text || '…'} »` : `🎨 ${e.author} a dessiné`}{e.auto ? ' (temps écoulé)' : ''}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      );
    case 'liarsbar':
    case 'whoisit':
    case 'prophunt':
      return (
        <Section title={x.mode ? `Le déroulé · ${x.mode}` : 'Le déroulé'}>
          <ol className="space-y-0.5 text-sm">
            {(x.events || []).map((e, i) => (
              <li key={i} className={e.round ? 'pt-1.5 font-semibold text-amber-300' : e.danger ? 'text-red-400 font-semibold' : e.accent ? 'text-slate-100' : 'text-slate-400'}>{e.text}</li>
            ))}
          </ol>
        </Section>
      );
    case 'cemantix':
      return (
        <Section title="Le mot secret">
          <p className="text-lg font-bold text-emerald-300">{x.secret || '—'}</p>
          {x.top?.length > 0 && <p className="text-xs text-slate-400 mt-1">Mots les plus proches : {x.top.map((t) => (typeof t === 'string' ? t : t.word)).filter(Boolean).join(', ')}</p>}
        </Section>
      );
    case 'petitbac':
      return (
        <Section title={`Manches (${x.rounds?.length || 0})`}>
          <ol className="space-y-1 text-sm">
            {(x.rounds || []).map((round, i) => (
              <li key={i} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                Lettre <strong className="text-amber-300">{round.letter}</strong>
                {round.result && typeof round.result === 'object' && (
                  <ul className="text-xs text-slate-300 mt-0.5">
                    {Object.entries(round.result).map(([who, v]) => (
                      <li key={who}><strong>{who}</strong> <span className="text-amber-300">+{v?.total ?? 0}</span> : {Object.values(v?.perCategory || {}).map((c, k) => (
                        <span key={k} className={c.valid ? '' : 'line-through text-slate-500'}>{c.value || '—'}{k < Object.keys(v.perCategory).length - 1 ? ', ' : ''}</span>
                      ))}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Section>
      );
    default:
      return Object.keys(x).length ? (
        <Section title="Détails">
          <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">{JSON.stringify(x, null, 1)}</pre>
        </Section>
      ) : null;
  }
}
