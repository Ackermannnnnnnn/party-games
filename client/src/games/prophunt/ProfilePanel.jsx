import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { socket } from '../../lib/socket.js';
import { fetchProfile } from '../../lib/profile.js';

/**
 * Profil Prop Hunt : niveau, XP, titre, statistiques, succès et tenue du chasseur (débloquées par niveau).
 */
const SKIN_NAMES = { survivorMaleB: 'Désert', survivorFemaleA: 'Forêt', skaterMaleA: 'Urbain', skaterFemaleA: 'Arctique', criminalMaleA: 'Commando', cyborgFemaleA: 'Cobalt', zombieA: 'Rouille', zombieC: 'Or' };

export default function ProfilePanel({ onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [skin, setSkin] = useState(null);
  useEffect(() => {
    fetchProfile().then((d) => { setData(d); setSkin(d.profile.skin); }).catch((e) => setErr(e.message));
    const on = ({ skin: s }) => setSkin(s);
    socket.on('profile:updated', on);
    return () => socket.off('profile:updated', on);
  }, []);
  const choose = (s) => { setSkin(s); socket.emit('profile:set', { skin: s }); };
  const p = data?.profile;
  const pct = p ? Math.min(100, ((p.xp - p.levelXp) / Math.max(1, p.nextXp - p.levelXp)) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profil Prop Hunt</p>
            {p && <p className="font-display text-3xl text-slate-50">{p.name || 'Joueur'} <span className="text-teal-300">· niv. {p.level}</span></p>}
            {p && <p className="text-sm text-amber-300">{p.title}</p>}
          </div>
          <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={onClose}>✕</button>
        </div>
        {err && <p className="text-rose-300 text-sm">{err}</p>}
        {!p && !err && <p className="text-slate-400 text-sm">Chargement…</p>}
        {p && (
          <>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{p.xp} XP</span><span>niveau {p.level + 1} à {p.nextXp} XP</span></div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-300" style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {[['Parties', p.games], ['Victoires', p.wins], ['Trouvés', p.kills], ['Survies', p.survived], ['Moqueries', p.taunts], ['Manches', p.rounds]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] py-2"><p className="font-display text-2xl text-slate-50">{v || 0}</p><p className="text-[11px] text-slate-400">{l}</p></div>
              ))}
            </div>
            <section>
              <p className="text-sm font-semibold text-slate-200 mb-2">Armure du chasseur</p>
              <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start">
                <SkinPreview skin={skin} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(data.skins).map(([id, lvl]) => {
                    const locked = p.level < lvl;
                    return (
                      <button key={id} type="button" disabled={locked} onClick={() => choose(id)}
                        className={`rounded-xl px-2 py-2 text-left text-sm ring-1 transition ${skin === id ? 'bg-teal-400/15 ring-teal-300' : 'bg-white/[0.04] ring-white/[0.06]'} ${locked ? 'opacity-40' : 'hover:bg-white/[0.08]'}`}>
                        <span className="block text-slate-100">{SKIN_NAMES[id] || id}</span>
                        <span className="block text-[11px] text-slate-400">{locked ? `🔒 niveau ${lvl}` : skin === id ? '✓ équipée' : 'disponible'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
            <section>
              <p className="text-sm font-semibold text-slate-200 mb-2">Succès ({Object.keys(p.achievements || {}).length}/{data.achievements.length})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.achievements.map((a) => {
                  const got = p.achievements?.[a.id];
                  return (
                    <div key={a.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ring-1 ${got ? 'bg-amber-300/10 ring-amber-300/40' : 'bg-white/[0.03] ring-white/[0.06] opacity-50'}`}>
                      <span className="text-2xl">{got ? a.icon : '🔒'}</span>
                      <span className="min-w-0"><span className="block text-sm text-slate-100 truncate">{a.name}</span><span className="block text-[11px] text-slate-400 leading-tight">{a.desc}</span></span>
                    </div>
                  );
                })}
              </div>
            </section>
            <section>
              <p className="text-sm font-semibold text-slate-200 mb-2">Titres</p>
              <div className="flex flex-wrap gap-1.5">{data.titles.map(([lvl, t]) => <span key={t} className={`rounded-full px-2.5 py-1 text-xs ${p.level >= lvl ? 'bg-amber-300/20 text-amber-200' : 'bg-white/[0.04] text-slate-500'}`}>{t} · niv. {lvl}</span>)}</div>
            </section>
            <p className="text-[11px] text-slate-500">Ta progression est liée à ce navigateur. XP gagnée à chaque partie : participation + points marqués + bonus du podium.</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Aperçu 3D de la tenue (le personnage tourne sur lui-même). */
function SkinPreview({ skin }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!skin || !ref.current) return undefined;
    let raf = 0; let stop = false; let renderer = null;
    (async () => {
      const THREE = await import('three');
      const { loadCharacterBase, createHunterRig } = await import('./scene/rigs.js');
      const base = await loadCharacterBase();
      if (stop) return;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
      const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(2, 4, 3); scene.add(d);
      const rig = createHunterRig(base, skin); rig.setWeapon('smg'); scene.add(rig.root);
      const cam = new THREE.PerspectiveCamera(32, 180 / 240, 0.1, 20); cam.position.set(0, 1.2, 4.2); cam.lookAt(0, 0.95, 0);
      renderer = new THREE.WebGLRenderer({ canvas: ref.current, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(180, 240, false);
      let last = performance.now();
      const loop = (t) => {
        if (stop) return;
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        rig.root.rotation.y += dt * 0.8; rig.update(dt, { speed: 0, pitch: 0 });
        renderer.render(scene, cam); raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })().catch(() => {});
    return () => { stop = true; cancelAnimationFrame(raf); renderer?.dispose(); };
  }, [skin]);
  return <canvas ref={ref} width={180} height={240} className="w-[180px] h-[240px] rounded-2xl bg-gradient-to-b from-slate-700/40 to-slate-900/60 ring-1 ring-white/10" />;
}
