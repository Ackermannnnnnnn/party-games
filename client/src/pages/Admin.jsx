import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

/** API helper avec mot de passe en header. */
async function adminFetch(password, path, opts = {}) {
  const res = await fetch(`${SERVER}/admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export default function Admin() {
  const [password, setPassword] = useState(() => localStorage.getItem('adminPassword') || '');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState('quiz');

  // Auto-login si on a un mot de passe stocké
  useEffect(() => {
    if (password && !loggedIn) {
      // Test silencieux
      adminFetch(password, '/quiz/categories').then(() => setLoggedIn(true)).catch(() => setLoggedIn(false));
    }
  }, []);

  const tryLogin = async (pw) => {
    try {
      const res = await fetch(`${SERVER}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) throw new Error('Mauvais mot de passe');
      localStorage.setItem('adminPassword', pw);
      setPassword(pw);
      setLoggedIn(true);
    } catch (e) {
      alert('Mauvais mot de passe.');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminPassword');
    setPassword('');
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <div className="card max-w-md mx-auto mt-10">
        <h2 className="font-display text-2xl text-brand-light mb-4">🔑 Admin</h2>
        <p className="text-slate-300 text-sm mb-3">Mot de passe défini dans <code>server/.env</code></p>
        <input
          type="password"
          autoFocus
          placeholder="Mot de passe admin"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          onKeyDown={(e) => {
            if (e.key === 'Enter') tryLogin(e.currentTarget.value);
          }}
        />
        <p className="text-xs text-slate-500 mt-2">Tape Entrée pour valider.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <h2 className="font-display text-2xl text-brand-light">🔧 Administration</h2>
        <button onClick={logout} className="btn btn-ghost text-sm">Se déconnecter</button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('quiz')}
          className={`flex-1 px-3 py-2 rounded-lg font-medium ${tab === 'quiz' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'}`}
        >🎯 Quiz</button>
        <button
          onClick={() => setTab('imposter')}
          className={`flex-1 px-3 py-2 rounded-lg font-medium ${tab === 'imposter' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-300'}`}
        >🎭 Imposter</button>
      </div>

      {tab === 'quiz' && <QuizAdmin password={password} />}
      {tab === 'imposter' && <ImposterAdmin password={password} />}
    </div>
  );
}

// ─────── ONGLET QUIZ ───────
function QuizAdmin({ password }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null); // null | { id, ... } | 'new'

  const reload = useCallback(async () => {
    try {
      const list = await adminFetch(password, `/quiz/questions?category=${selectedCat}`);
      setQuestions(list);
    } catch {}
  }, [password, selectedCat]);

  useEffect(() => {
    adminFetch(password, '/quiz/categories').then(setCategories).catch(() => {});
  }, [password]);

  useEffect(() => { reload(); }, [reload]);

  const onSave = async (q) => {
    try {
      if (q.id) {
        await adminFetch(password, `/quiz/questions/${q.id}`, { method: 'PUT', body: JSON.stringify(q) });
      } else {
        await adminFetch(password, `/quiz/questions`, { method: 'POST', body: JSON.stringify(q) });
      }
      setEditing(null);
      reload();
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Supprimer cette question ?')) return;
    try {
      await adminFetch(password, `/quiz/questions/${id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
          ))}
        </select>
        <button onClick={() => setEditing('new')} className="btn btn-primary text-sm px-3 py-2">+ Nouvelle question</button>
        <span className="text-xs text-slate-400 ml-auto">{questions.length} affichées</span>
      </div>

      {editing && (
        <QuestionEditor
          q={editing === 'new' ? { category: selectedCat === 'all' ? 'culture' : selectedCat, question: '', answers: ['', '', '', ''], correct: 0, difficulty: 1 } : editing}
          categories={categories.filter(c => c.id !== 'all')}
          onSave={onSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ul className="space-y-2 max-h-[60vh] overflow-y-auto scrollable">
        {questions.map(q => (
          <li key={q.id} className="bg-slate-900/40 rounded-lg p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{q.question}</p>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-emerald-300">{q.answers[q.correct]}</strong>
                {' · '}{q.category} · diff.{q.difficulty}
              </p>
            </div>
            <button onClick={() => setEditing(q)} className="text-xs text-brand-light hover:underline shrink-0">Éditer</button>
            <button onClick={() => onDelete(q.id)} className="text-xs text-rose-300 hover:underline shrink-0">Suppr</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionEditor({ q, categories, onSave, onCancel }) {
  const [form, setForm] = useState(q);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateAnswer = (i, v) => {
    const a = [...form.answers]; a[i] = v;
    update('answers', a);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 border border-brand rounded-xl p-3 space-y-3">
      <h3 className="font-semibold text-brand-light">{form.id ? '✏️ Édition' : '+ Nouvelle question'}</h3>
      <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input value={form.question} onChange={(e) => update('question', e.target.value)} placeholder="Question…" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"/>
      <div className="space-y-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={form.correct === i}
              onChange={() => update('correct', i)}
              className="accent-emerald-500"
            />
            <input
              value={form.answers[i]}
              onChange={(e) => updateAnswer(i, e.target.value)}
              placeholder={`Réponse ${i + 1}`}
              className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 ${form.correct === i ? 'border-emerald-500' : 'border-slate-700'}`}
            />
          </div>
        ))}
        <p className="text-xs text-slate-400">Sélectionne la bonne réponse via le rond à gauche.</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm">Difficulté :</label>
        <select value={form.difficulty} onChange={(e) => update('difficulty', parseInt(e.target.value, 10))} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
          <option value={1}>1 - Facile</option>
          <option value={2}>2 - Moyen</option>
          <option value={3}>3 - Difficile</option>
          <option value={4}>4 - Extrême</option>
        </select>
      </div>
      <input value={form.image || ''} onChange={(e) => update('image', e.target.value)} placeholder="URL d'image (optionnel)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"/>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn btn-ghost flex-1">Annuler</button>
        <button onClick={() => onSave(form)} className="btn btn-primary flex-1">Enregistrer</button>
      </div>
    </motion.div>
  );
}

// ─────── ONGLET IMPOSTER ───────
function ImposterAdmin({ password }) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('random');
  const [pairs, setPairs] = useState([]);
  const [editing, setEditing] = useState(null);

  const reload = useCallback(async () => {
    try {
      const list = await adminFetch(password, `/imposter/pairs?theme=${selectedTheme}`);
      setPairs(list);
    } catch {}
  }, [password, selectedTheme]);

  useEffect(() => {
    adminFetch(password, '/imposter/themes').then(setThemes).catch(() => {});
  }, [password]);

  useEffect(() => { reload(); }, [reload]);

  const onSave = async (p) => {
    try {
      if (p.id) await adminFetch(password, `/imposter/pairs/${p.id}`, { method: 'PUT', body: JSON.stringify(p) });
      else await adminFetch(password, `/imposter/pairs`, { method: 'POST', body: JSON.stringify(p) });
      setEditing(null);
      reload();
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Supprimer cette paire ?')) return;
    try {
      await adminFetch(password, `/imposter/pairs/${id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
          {themes.map(t => <option key={t.id} value={t.id}>{t.label} ({t.pairCount})</option>)}
        </select>
        <button onClick={() => setEditing('new')} className="btn btn-primary text-sm px-3 py-2">+ Nouvelle paire</button>
        <span className="text-xs text-slate-400 ml-auto">{pairs.length} affichées</span>
      </div>

      {editing && (
        <PairEditor
          p={editing === 'new' ? { themeId: selectedTheme === 'random' ? 'animaux' : selectedTheme, civil: '', imposter: '' } : editing}
          themes={themes.filter(t => t.id !== 'random')}
          onSave={onSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ul className="space-y-2 max-h-[60vh] overflow-y-auto scrollable">
        {pairs.map(p => (
          <li key={p.id} className="bg-slate-900/40 rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <span className="text-emerald-300 font-medium truncate">{p.civil}</span>
              <span className="text-slate-500">↔</span>
              <span className="text-rose-300 font-medium truncate">{p.imposter}</span>
              <span className="text-xs text-slate-500 ml-2 shrink-0">{p.themeId}</span>
            </div>
            <button onClick={() => setEditing(p)} className="text-xs text-brand-light hover:underline shrink-0">Éditer</button>
            <button onClick={() => onDelete(p.id)} className="text-xs text-rose-300 hover:underline shrink-0">Suppr</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PairEditor({ p, themes, onSave, onCancel }) {
  const [form, setForm] = useState(p);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 border border-brand rounded-xl p-3 space-y-3">
      <h3 className="font-semibold text-brand-light">{form.id ? '✏️ Édition' : '+ Nouvelle paire'}</h3>
      <select value={form.themeId} onChange={(e) => update('themeId', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
        {themes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <input value={form.civil} onChange={(e) => update('civil', e.target.value)} placeholder="Mot des civils" className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg px-3 py-2"/>
      <input value={form.imposter} onChange={(e) => update('imposter', e.target.value)} placeholder="Mot de l'imposteur (proche !)" className="w-full bg-slate-900 border border-rose-500/40 rounded-lg px-3 py-2"/>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn btn-ghost flex-1">Annuler</button>
        <button onClick={() => onSave(form)} className="btn btn-primary flex-1">Enregistrer</button>
      </div>
    </motion.div>
  );
}
