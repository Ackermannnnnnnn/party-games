import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { socket, SERVER_URL } from '../../lib/socket.js';
import { serverNow } from '../blindtest/audio.js';
import { reloadForUpdate } from '../../lib/version.js';
import { getMap, hasMap, PLAYER, WEAPONS, WEAPON_ORDER, ABILITIES, TAUNTS, MODELS, modelBounds, canDisguiseAs } from './shared.js';
import { World, buildMapMeshes, buildPhInstances, material, modelParts, rayModel, disguiseCollider, hitNormal, grenadePath, setQuality as setWorldQuality } from './world.js';
import { createInput, attachDesktop, attachTouch, isTouch } from './controls.js';
import { sfx, loadCustomSounds } from './sfx.js';
import { Environment } from './scene/env.jsx';
import { PropModel, NameTag } from './scene/characters.jsx';
import { GrassField } from './scene/grass.jsx';
import { loadCharacterBase, createHunterRig, loadWeapon } from './scene/rigs.js';
import { Effects, createFx } from './scene/effects.jsx';
import { createViewmodel } from './scene/viewmodel.js';
import { preloadAssets } from './assets3d.js';
import {
  RoleIntro, HunterBlind, TopBar, KillFeed, Crosshair, HealthCard, AmmoCard, PropCard, Soundboard,
  DamageIndicator, RoundEnd, Scoreboard, Menu, TouchControls, PortraitHint, WeaponBar, RadarMarkers,
} from './hud.jsx';

/**
 * Prop Hunt — la partie en 3D : le monde, ton personnage, les autres joueurs, les tirs et l'interface.
 */
const SEND_MS = 50;
const INTERP_MS = 110;
const TARGET_RANGE = 5;
const TAUNT_CD = 2500;
const QUALITY_KEY = 'prophuntQuality';
const angLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
const defaultQuality = () => { try { return localStorage.getItem(QUALITY_KEY) || (isTouch ? 'low' : 'medium'); } catch { return isTouch ? 'low' : 'medium'; } };

export default function PropHunt3D({ p, playerId, isHost }) {
  const input = useMemo(() => createInput(), []);
  const fx = useMemo(() => createFx(), []);
  const net = useRef({ snaps: new Map(), shown: new Map(), hitAt: 0, hurtAt: 0, hurtAngle: null, radar: null, notice: null });
  const me = useRef({
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: false, lockedYaw: null, spawnKey: null, specIdx: 0,
    safe: new THREE.Vector3(), safeAt: 0, colKey: '', ammo: { smg: WEAPONS.smg.mag, shotgun: WEAPONS.shotgun.mag, grenade: WEAPONS.grenade.mag }, weapon: 'smg', lastWeapon: 'shotgun',
    reloadUntil: 0, reloadW: null, lastShot: 0, spread: 0, emptyClick: false, lastTaunt: 0, lastVentri: 0, stepAt: 0, myGrenades: new Map(), shake: 0,
  });
  const pRef = useRef(p); pRef.current = p;
  const [quality, setQualityState] = useState(defaultQuality);
  setWorldQuality(quality);
  const setQuality = (q) => { try { localStorage.setItem(QUALITY_KEY, q); } catch { /* */ } setQualityState(q); };
  const [hud, setHud] = useState({ target: null, locked: false, ammo: WEAPONS.smg.mag, weapon: 'smg', ammoAll: {}, reloading: false, reloadPct: 0, spread: 0, noRoom: 0 });
  const [scoreboard, setScoreboard] = useState(false);
  const [menu, setMenu] = useState(false);
  const [board, setBoard] = useState(false);
  const boardRef = useRef(false); boardRef.current = board;
  const [stick, setStick] = useState({ active: false });
  const [locked, setLocked] = useState(false);
  const [customSounds, setCustomSounds] = useState([]);
  const [intro, setIntro] = useState(null);
  const layerRef = useRef(null);
  const world = useMemo(() => (p.mapId ? new World(getMap(p.mapId)) : null), [p.mapId]);
  const worldRef = useRef(world); worldRef.current = world;
  const self = p.players.find((x) => x.id === playerId);
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__ph = Object.assign(window.__ph || {}, { me, input, world, net });

  // Map inconnue de ce client = onglet resté sur une ancienne version : on recharge (la room est rejointe automatiquement)
  useEffect(() => { if (p.mapId && !hasMap(p.mapId)) reloadForUpdate(); }, [p.mapId]);

  // Modèles 3D de la map (chargés une fois, avant d'afficher la scène)
  const [assetsReady, setAssetsReady] = useState(null);
  const [loadProg, setLoadProg] = useState([0, 0]);
  useEffect(() => {
    if (!p.mapId) return undefined;
    let off = false;
    const ids = getMap(p.mapId).objects.map((o) => MODELS[o.m]?.glb).filter(Boolean);
    preloadAssets(ids, (d, t) => { if (!off) setLoadProg([d, t]); }).then(() => { if (!off) setAssetsReady(p.mapId); });
    return () => { off = true; };
  }, [p.mapId]);

  // Sons de moquerie ajoutés depuis l'admin
  useEffect(() => {
    let off = false;
    fetch(`${SERVER_URL}/sounds/live`).then((r) => r.json()).then(({ sounds = [] }) => {
      if (off) return;
      setCustomSounds(sounds);
      loadCustomSounds(sounds.map((s) => ({ ...s, url: `${SERVER_URL}/sounds/file/${s.id}?v=${s.sha || ''}` })));
    }).catch(() => {});
    return () => { off = true; };
  }, [p.gameNo, p.round]);
  const soundList = useMemo(() => [
    ...customSounds.map((s) => ({ id: `c:${s.id}`, label: s.name, emoji: s.emoji })),
    ...TAUNTS.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji })),
  ], [customSounds]);
  const soundListRef = useRef(soundList); soundListRef.current = soundList;

  // Leurres : obstacles pour tout le monde
  useEffect(() => {
    if (!world) return;
    world.extraBoxes = (p.decoys || []).map((d) => {
      const c = disguiseCollider(d.m, d.s);
      return { minX: d.p[0] - c.rx, maxX: d.p[0] + c.rx, minY: d.p[1], maxY: d.p[1] + c.h, minZ: d.p[2] - c.rx, maxZ: d.p[2] + c.rx, kind: 'decoy' };
    });
  }, [world, p.decoys]);

  // Annonce du rôle à chaque nouvelle manche
  const introKey = `${p.gameNo}-${p.round}`;
  useEffect(() => {
    if (p.phase !== 'HIDE' || !self?.role) return undefined;
    setIntro({ role: self.role }); sfx.intro(self.role === 'hunter');
    fx.clear();
    const id = setTimeout(() => setIntro(null), 3800);
    return () => clearTimeout(id);
  }, [introKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Événements temps réel
  useEffect(() => {
    const onEv = (e) => {
      const n = net.current;
      const listener = { x: me.current.pos.x, z: me.current.pos.z, yaw: input.yaw };
      if (e.type === 'snap') {
        for (const [id, x, y, z, ry, pi, alive, w] of e.s) {
          if (id === playerId) continue;
          const arr = n.snaps.get(id) || [];
          arr.push({ t: e.t, p: [x, y, z], ry, pi, alive, w: w || 0 });
          while (arr.length > 8) arr.shift();
          n.snaps.set(id, arr);
        }
      } else if (e.type === 'shot') {
        if (e.by === playerId) return;
        const tos = Array.isArray(e.to?.[0]) ? e.to : e.to ? [e.to] : [];
        if (e.from) { for (const to of tos) { fx.tracer(e.from, to); fx.impact(to, null, { decal: false, count: 4 }); } fx.muzzle(e.from); }
        if (e.w === 'shotgun') sfx.shotgun(e.from, listener, false); else sfx.shot(e.from, listener, false);
      } else if (e.type === 'hit') {
        if (e.by === playerId) { n.hitAt = performance.now(); sfx.hit(); }
        if (e.target === playerId) {
          n.hurtAt = performance.now(); sfx.hurt();
          const sh = n.shown.get(e.by)?.p;
          if (sh) { const a = Math.atan2(sh[0] - me.current.pos.x, sh[2] - me.current.pos.z); n.hurtAngle = -(a - (input.yaw + Math.PI)); }
        }
      } else if (e.type === 'kill') {
        if (e.target === playerId) sfx.death(); else if (e.by === playerId) sfx.kill();
        const at = e.target === playerId ? [me.current.pos.x, me.current.pos.y, me.current.pos.z] : n.shown.get(e.target)?.p;
        if (at && e.by) fx.confetti(at);
      } else if (e.type === 'taunt') {
        sfx.taunt(e.sound, e.by === playerId ? null : e.p, listener);
        const myRole = pRef.current.players.find((x) => x.id === playerId)?.role;
        if (e.p && myRole !== 'hunter') fx.note(e.p, e.forced);
        if (e.by === playerId) me.current.lastTaunt = Date.now();
      } else if (e.type === 'disguise') {
        const pos = e.by === playerId ? null : n.snaps.get(e.by)?.at(-1)?.p;
        sfx.disguise(pos, listener);
      } else if (e.type === 'reload') {
        if (e.by !== playerId && e.p) sfx.reload();
      } else if (e.type === 'throw') {
        if (e.by !== playerId && worldRef.current) { fx.grenade(e.gid, grenadePath(worldRef.current, e.p, e.v, WEAPONS.grenade.fuseMs)); sfx.throwG(e.p, listener); }
        else if (e.by === playerId) { const mine = me.current.myGrenades.get('pending'); if (mine) { me.current.myGrenades.delete('pending'); me.current.myGrenades.set(e.gid, mine); } }
      } else if (e.type === 'boom') {
        fx.explosion(e.p); sfx.explosion(e.p, listener);
        const d = Math.hypot(e.p[0] - me.current.pos.x, e.p[2] - me.current.pos.z); me.current.shake = Math.max(me.current.shake, Math.max(0, 1 - d / 14));
      } else if (e.type === 'melee') {
        if (e.by !== playerId) sfx.swish(n.shown.get(e.by)?.p, listener);
      } else if (e.type === 'radar') {
        const myRole = pRef.current.players.find((x) => x.id === playerId)?.role;
        if (myRole === 'hunter') { n.radar = { pts: e.pts, at: performance.now() }; sfx.radar(); } else n.notice = { text: '📡 Radar : les chasseurs voient où vous êtes !', at: performance.now() };
      } else if (e.type === 'infected') {
        sfx.infected();
        n.notice = { text: e.target === playerId ? '🧟 Tu as été infecté : chasse les autres !' : `🧟 ${pRef.current.players.find((x) => x.id === e.target)?.pseudo || '?'} rejoint les chasseurs`, at: performance.now() };
      } else if (e.type === 'release') sfx.horn();
    };
    socket.on('game:event', onEv);
    return () => socket.off('game:event', onEv);
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commandes
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return undefined;
    const offs = [attachDesktop(input, el, { onScoreboard: setScoreboard })];
    if (isTouch) offs.push(attachTouch(input, el, setStick));
    const lockCheck = () => setLocked(document.pointerLockElement === el);
    document.addEventListener('pointerlockchange', lockCheck);
    return () => { offs.forEach((f) => f()); document.removeEventListener('pointerlockchange', lockCheck); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { input.enabled = !menu; if (menu && document.pointerLockElement) document.exitPointerLock?.(); }, [menu]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bips du compte à rebours
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const left = (p.endsAt || 0) - serverNow();
  const secLeft = Math.ceil(left / 1000);
  const lastBeep = useRef(null);
  useEffect(() => {
    if (p.phase === 'HIDE' && secLeft <= 5 && secLeft >= 1 && lastBeep.current !== secLeft) { lastBeep.current = secLeft; sfx.beep(secLeft === 1); }
  }, [secLeft, p.phase]);

  const pickTaunt = (id) => {
    if (Date.now() - me.current.lastTaunt < TAUNT_CD) return;
    me.current.lastTaunt = Date.now();
    socket.emit('game:action', { type: 'taunt', payload: { sound: id } });
    setBoard(false);
  };
  const pickRef = useRef(pickTaunt); pickRef.current = pickTaunt;

  if (!world || !self) return <div className="ph-screen flex items-center justify-center text-slate-300">Chargement de la map…</div>;
  const role = self.role;
  const alive = self.alive;
  const map = getMap(p.mapId);
  const hiding = p.phase === 'HIDE';
  const blind = hiding && role === 'hunter';
  const myDecoys = (p.decoys || []).filter((d) => d.owner === playerId).length;
  const now = performance.now();
  const hurt = now - net.current.hurtAt < 350;
  const hitMark = now - net.current.hitAt < 220;
  const person = (id) => p.players.find((x) => x.id === id) || { pseudo: '?' };
  const tauntLeft = Math.max(0, TAUNT_CD - (Date.now() - me.current.lastTaunt));
  const playing = p.phase === 'HIDE' || p.phase === 'HUNT';

  return (
    <div className="ph-screen">
      <Canvas key={quality} shadows={quality !== 'low'} dpr={quality === 'low' ? [1, 1] : quality === 'high' ? [1, 2] : [1, 1.5]}
        gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
        camera={{ fov: 74, near: 0.04, far: 400, position: [0, 2, 5] }}>
        {assetsReady === p.mapId && <Scene p={p} playerId={playerId} world={world} map={map} input={input} me={me} net={net} fx={fx} pRef={pRef} setHud={setHud}
          quality={quality} boardRef={boardRef} setBoard={setBoard} pickRef={pickRef} soundListRef={soundListRef} />}
      </Canvas>
      {assetsReady !== p.mapId && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-slate-200">
          <p className="font-display text-3xl">{map.name}</p>
          <p className="mt-2 text-sm text-slate-400">Chargement des modèles 3D… {loadProg[1] ? `${loadProg[0]} / ${loadProg[1]}` : ''}</p>
          <div className="mt-3 h-1.5 w-64 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-teal-300 transition-all" style={{ width: `${loadProg[1] ? (loadProg[0] / loadProg[1]) * 100 : 5}%` }} /></div>
        </div>
      )}

      {/* calque qui reçoit souris / doigts */}
      <div ref={layerRef} className="absolute inset-0" style={{ touchAction: 'none' }} />

      {/* ───── Interface ───── */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {hurt && <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(220,38,38,0.65)]" />}
        {alive && role && <DamageIndicator angle={net.current.hurtAngle} at={net.current.hurtAt} />}
        {blind && <HunterBlind secLeft={secLeft} />}
        <TopBar p={p} left={left} mapName={map.name} />
        <KillFeed p={p} person={person} />

        {alive && !blind && playing && (hud.scoped
          ? <ScopeOverlay hitMark={hitMark} />
          : <div className="absolute left-1/2 top-1/2"><Crosshair role={role} spread={hud.spread} hitMark={hitMark} target={hud.target} /></div>)}
        {role === 'prop' && alive && playing && (hud.target || now - hud.noRoom < 1500) && (
          <p className={`absolute left-1/2 top-[57%] -translate-x-1/2 rounded-full bg-black/55 backdrop-blur px-3 py-1 text-sm whitespace-nowrap ${now - hud.noRoom < 1500 ? 'text-amber-300' : 'text-teal-200'}`}>
            {now - hud.noRoom < 1500 ? 'Pas assez de place ici pour cet objet' : <>{isTouch ? 'Touche « Devenir »' : 'E ou clic'} : devenir <b>{hud.target.name}</b></>}
          </p>
        )}

        {alive && role && <HealthCard self={self} role={role} hud={hud} isTouch={isTouch} />}
        {alive && role === 'hunter' && !blind && <AmmoCard hud={hud} isTouch={isTouch} />}
        {alive && role === 'hunter' && !blind && <WeaponBar hud={hud} isTouch={isTouch} />}
        {alive && role === 'hunter' && net.current.radar && now - net.current.radar.at < 3500 && <RadarMarkers pts={net.current.radar.pts} me={me.current} yaw={input.yaw} at={net.current.radar.at} />}
        {net.current.notice && now - net.current.notice.at < 3500 && <p className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-black/65 backdrop-blur px-4 py-1.5 text-sm text-amber-200 whitespace-nowrap">{net.current.notice.text}</p>}
        {p.options?.mode === 'infection' && <p className="absolute left-1/2 top-[86px] -translate-x-1/2 text-[11px] text-lime-300/90 drop-shadow">🧟 Mode infection</p>}
        {alive && role === 'prop' && <PropCard hud={hud} decoysLeft={(p.options?.decoys || 0) - myDecoys} tauntLeft={tauntLeft} ventriLeft={Math.max(0, ABILITIES.ventriloquistMs - (Date.now() - me.current.lastVentri))} isTouch={isTouch} />}
        {(!alive || !role) && playing && (
          <p className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur px-4 py-1.5 text-sm text-slate-200 whitespace-nowrap">
            {role ? '💀 Éliminé' : '👀 Tu joues à la prochaine manche'} · {isTouch ? 'touche « Suivant »' : 'clic'} pour changer de joueur
          </p>
        )}
        {!isTouch && !locked && !menu && !board && playing && !blind && !intro && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-2xl bg-black/70 backdrop-blur px-5 py-3 text-slate-100 text-center">Clique pour jouer<br /><span className="text-xs text-slate-400">Échap pour libérer la souris</span></p>
          </div>
        )}
        <AnimatePresence>{intro && !blind && <RoleIntro key={introKey} role={intro.role} map={map.name} round={p.round} total={p.totalRounds} isTouch={isTouch} />}</AnimatePresence>
        {p.phase === 'ROUND_END' && p.result && <RoundEnd p={p} person={person} left={left} />}
        {(scoreboard || menu) && <Scoreboard p={p} playerId={playerId} />}
      </div>

      {board && role === 'prop' && alive && <Soundboard sounds={soundList} onPick={pickTaunt} onClose={() => setBoard(false)} cooldown={tauntLeft} isTouch={isTouch} />}

      {/* ───── Boutons (tactile) et menu ───── */}
      <button type="button" onClick={() => setMenu((m) => !m)} className="ph-btn absolute top-2 left-2 !w-10 !h-10 text-lg" aria-label="Menu">☰</button>
      {menu && <Menu isHost={isHost} onClose={() => setMenu(false)} input={input} quality={quality} setQuality={setQuality} />}
      {isTouch && <PortraitHint />}
      {isTouch && !blind && <TouchControls input={input} role={role} alive={alive} stick={stick} decoysLeft={(p.options?.decoys || 0) - myDecoys} hud={hud} phase={p.phase} onBoard={() => setBoard((b) => !b)} />}
    </div>
  );
}

/** Toutes les copies d'un modèle photoréaliste dans la map (un seul appel de dessin). */
function PhInstances({ g, shadows }) {
  const ref = useRef(null);
  useEffect(() => {
    const im = ref.current; if (!im) return;
    g.matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  }, [g]);
  // les petits objets lointains ne sont plus dessinés (on ne les verrait pas)
  useFrame(({ camera }) => {
    const im = ref.current; if (!im?.boundingSphere || g.far > 1e8) return;
    im.visible = im.boundingSphere.center.distanceTo(camera.position) - im.boundingSphere.radius < g.far;
  });
  if (import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('phLite')) return null;
  return <instancedMesh ref={ref} args={[g.geometry, g.material, g.matrices.length]} castShadow={shadows && g.cast} receiveShadow={shadows} frustumCulled />;
}

/** Lunette du fusil : on voit à travers (cercle net, bords noirs, réticule). */
function ScopeOverlay({ hitMark }) {
  const c = hitMark ? '#fb7185' : 'rgba(10,10,10,0.9)';
  return (
    <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 0, transparent min(38vh, 38vw), rgba(0,0,0,0.55) calc(min(38vh, 38vw) + 3px), #000 calc(min(38vh, 38vw) + 14px))' }}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: c }} />
      <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2" style={{ background: c }} />
      <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ borderColor: c }} />
    </div>
  );
}

// ───────────────────────── Scène 3D ─────────────────────────
function Scene({ p, playerId, world, map, input, me, net, fx, pRef, setHud, quality, boardRef, setBoard, pickRef, soundListRef }) {
  const meshes = useMemo(() => buildMapMeshes(map), [map, quality]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);
  const phGroups = useMemo(() => buildPhInstances(map), [map, quality]); // eslint-disable-line react-hooks/exhaustive-deps
  const overlay = useRef(null);
  const viewer = p.players.find((x) => x.id === playerId);
  return (
    <>
      <Environment map={map} quality={quality} overlay={overlay} />
      {meshes.map((m, i) => <mesh key={`${m.key}-${i}`} geometry={m.geometry} material={material(m.key)} castShadow={m.shadow && quality !== 'low'} receiveShadow={quality !== 'low'} />)}
      {phGroups.map((g) => <PhInstances key={g.key} g={g} shadows={quality !== 'low'} />)}
      {!(import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('phLite')) && <GrassField map={map} quality={quality} />}
      {(p.decoys || []).map((d) => <group key={d.id} position={d.p} rotation={[0, d.ry, 0]}><PropModel m={d.m} s={d.s} /></group>)}
      {p.players.filter((x) => x.id !== playerId && x.role).map((x) => <Remote key={x.id} pl={x} net={net} me={me} input={input} viewerRole={viewer?.role} />)}
      <Local p={p} playerId={playerId} world={world} input={input} me={me} net={net} fx={fx} pRef={pRef} setHud={setHud} overlay={overlay}
        boardRef={boardRef} setBoard={setBoard} pickRef={pickRef} soundListRef={soundListRef} />
      <Effects fx={fx} quality={quality} />
    </>
  );
}

/** Autre joueur : position interpolée entre deux instantanés du serveur. */
function Remote({ pl, net, me, input, viewerRole }) {
  const g = useRef();
  const anim = useRef({ speed: 0, pitch: 0, air: false, w: 0 });
  const last = useRef({ x: 0, y: 0, z: 0, stepAt: 0 });
  useFrame((_, dt) => {
    const o = g.current; if (!o) return;
    const arr = net.current.snaps.get(pl.id);
    if (!arr?.length) { o.visible = false; return; }
    const t = serverNow() - INTERP_MS;
    let a = arr[0]; let b = arr[arr.length - 1];
    if (t >= b.t) a = b;
    else for (let i = 0; i < arr.length - 1; i++) if (arr[i].t <= t && arr[i + 1].t >= t) { a = arr[i]; b = arr[i + 1]; break; }
    const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    o.position.set(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k);
    o.rotation.y = angLerp(a.ry, b.ry, k);
    o.visible = pl.alive;
    const L = last.current;
    const sp = dt > 0 ? Math.hypot(o.position.x - L.x, o.position.z - L.z) / dt : 0;
    const vy = dt > 0 ? (o.position.y - L.y) / dt : 0;
    anim.current.speed += (Math.min(9, sp) - anim.current.speed) * Math.min(1, dt * 8);
    anim.current.air = Math.abs(vy) > 1.5;
    anim.current.pitch = a.pi + (b.pi - a.pi) * k;
    anim.current.w = b.w || 0;
    L.x = o.position.x; L.y = o.position.y; L.z = o.position.z;
    // bruits de pas des chasseurs (les cachés, eux, se déplacent sans bruit)
    if (pl.role === 'hunter' && pl.alive && anim.current.speed > 1.5 && performance.now() - L.stepAt > (anim.current.speed > 6 ? 300 : 400)) {
      L.stepAt = performance.now();
      sfx.step([o.position.x, o.position.y, o.position.z], { x: me.current.pos.x, z: me.current.pos.z, yaw: input.yaw });
    }
    net.current.shown.set(pl.id, { p: [o.position.x, o.position.y, o.position.z], ry: o.rotation.y });
  });
  if (pl.role === 'prop') {
    return (
      <group ref={g}>
        {pl.disguise && <PropModel m={pl.disguise.m} s={pl.disguise.s} />}
        {viewerRole !== 'hunter' && pl.disguise && <NameTag name={pl.pseudo} color="#99f6e4" y={(modelBounds(pl.disguise.m)?.max[1] || 1) * (pl.disguise.s || 1) + 0.45} />}
      </group>
    );
  }
  return (
    <group ref={g}>
      <HunterRig state={anim} skin={pl.skin || 'survivorMaleB'} />
      <NameTag name={pl.level ? `${pl.pseudo} · niv. ${pl.level}` : pl.pseudo} y={2.25} />
    </group>
  );
}

/** Chasseur animé (soldat chargé une fois, une copie par joueur). */
function HunterRig({ state, skin }) {
  const holder = useRef();
  const rig = useRef(null);
  useEffect(() => {
    let off = false;
    loadCharacterBase().then((base) => {
      if (off || !holder.current) return;
      const r = createHunterRig(base, skin);
      rig.current = r; holder.current.add(r.root);
    }).catch(() => {});
    return () => { off = true; if (rig.current && holder.current) holder.current.remove(rig.current.root); rig.current = null; };
  }, [skin]);
  useFrame((_, dt) => {
    const r = rig.current; if (!r) return;
    r.setWeapon(WEAPON_ORDER[state.current.w] || 'smg');
    r.update(Math.min(0.05, dt), { speed: state.current.speed, pitch: state.current.pitch, air: state.current.air });
  });
  return <group ref={holder} />;
}

// ───────────────────────── Ton personnage ─────────────────────────
const highlightMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

function Local({ p, playerId, world, input, me, net, fx, pRef, setHud, overlay, boardRef, setBoard, pickRef, soundListRef }) {
  const { camera, scene } = useThree();
  const body = useRef();
  const hl = useRef();
  const vm = useMemo(() => createViewmodel(), []);
  const lastSend = useRef(0);
  const lastHud = useRef(0);
  const targetRef = useRef(null);
  const noRoomAt = useRef(0);
  const camDist = useRef(3);
  const bob = useRef(0);
  const self = p.players.find((x) => x.id === playerId);
  const [hlModel, setHlModel] = useState(null);
  useEffect(() => { overlay.current = vm.scene; return () => { overlay.current = null; }; }, [vm, overlay]);
  useEffect(() => { for (const w of WEAPON_ORDER) loadWeapon(w).catch(() => {}); vm.setWeapon(me.current.weapon); }, [vm]); // eslint-disable-line react-hooks/exhaustive-deps
  if (import.meta.env.DEV && window.__ph) { window.__ph.camera = camera; window.__ph.scene = scene; }

  // nouvelle manche (ou retour en jeu après infection) : on se place au point de départ
  const sp = p.spawns?.[playerId];
  const spawnKey = `${p.round}-${p.gameNo}-${sp?.[3] || 0}`;
  useEffect(() => {
    if (sp && me.current.spawnKey !== spawnKey) {
      const m = me.current;
      m.spawnKey = spawnKey;
      m.pos.set(sp[0], sp[1], sp[2]); m.safe.copy(m.pos);
      m.vel.set(0, 0, 0); m.lockedYaw = null; m.colKey = '';
      m.ammo = { smg: WEAPONS.smg.mag, shotgun: WEAPONS.shotgun.mag, grenade: WEAPONS.grenade.mag }; m.reloadUntil = 0; m.spread = 0; m.myGrenades.clear();
      m.weapon = 'smg'; vm.setWeapon('smg');
      const [x1, x2, z1, z2] = world.map.area;
      input.yaw = Math.atan2(sp[0] - (x1 + x2) / 2, sp[2] - (z1 + z2) / 2); // face au centre de la map
      input.pitch = -0.05;
      if (!sp[3]) net.current.snaps.clear();
    }
  }, [spawnKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectWeapon = (w) => {
    const m = me.current;
    if (!WEAPONS[w] || m.weapon === w) return;
    if (w === 'grenade' && m.ammo.grenade <= 0) return;
    m.lastWeapon = m.weapon; m.weapon = w; m.reloadUntil = 0; m.lastShot = 0;
    vm.setWeapon(w); sfx.switchW();
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const P = pRef.current;
    const meP = P.players.find((x) => x.id === playerId);
    const m = me.current;
    const role = meP?.role; const alive = !!meP?.alive;
    const playing = P.phase === 'HIDE' || P.phase === 'HUNT';
    const canMove = alive && playing && !(role === 'hunter' && P.phase === 'HIDE');
    const dis = meP?.disguise;
    const col = role === 'prop' && dis ? disguiseCollider(dis.m, dis.s) : { rx: PLAYER.radius, h: PLAYER.height };
    const now = performance.now();
    const W = WEAPONS[m.weapon];

    // ── les autres joueurs sont solides (un chasseur ne traverse pas un objet… qui est un joueur)
    world.dynBoxes = [];
    for (const pl of P.players) {
      if (pl.id === playerId || !pl.alive || !pl.role) continue;
      const sh = net.current.shown.get(pl.id);
      if (!sh) continue;
      const c = pl.role === 'prop' && pl.disguise ? disguiseCollider(pl.disguise.m, pl.disguise.s) : { rx: 0.3, h: PLAYER.height };
      world.dynBoxes.push({ minX: sh.p[0] - c.rx, maxX: sh.p[0] + c.rx, minY: sh.p[1], maxY: sh.p[1] + c.h, minZ: sh.p[2] - c.rx, maxZ: sh.p[2] + c.rx, kind: 'player' });
    }

    // ── nouveau déguisement : on se décale si on est coincé
    const colKey = `${col.rx.toFixed(3)}:${col.h.toFixed(3)}`;
    if (alive && playing && colKey !== m.colKey) { m.colKey = colKey; world.unstuck(m.pos, col.rx, col.h); }

    // ── déplacement
    const wish = input.wish();
    const aiming = role === 'hunter' && input.aim && (m.weapon === 'smg' || m.weapon === 'shotgun');
    if (canMove) {
      const speed = (input.sprint && !aiming ? PLAYER.sprint : PLAYER.speed) * (role === 'prop' ? 1.05 : 1) * (aiming ? 0.6 : 1) * (m.weapon === 'knife' ? 1.1 : 1);
      const fxv = -Math.sin(input.yaw); const fzv = -Math.cos(input.yaw);
      const rxv = Math.cos(input.yaw); const rzv = -Math.sin(input.yaw);
      const tx = (rxv * wish.x + fxv * wish.y) * speed; const tz = (rzv * wish.x + fzv * wish.y) * speed;
      const acc = m.onGround ? 12 : 3;
      m.vel.x += (tx - m.vel.x) * Math.min(1, acc * dt);
      m.vel.z += (tz - m.vel.z) * Math.min(1, acc * dt);
      if (input.jump && m.onGround) { m.vel.y = PLAYER.jump; m.onGround = false; }
      m.onGround = world.move(m.pos, m.vel, dt, col.rx, col.h, PLAYER.step, m.onGround);
    } else if (alive && playing) {
      m.vel.set(0, m.vel.y, 0);
      m.onGround = world.move(m.pos, m.vel, dt, col.rx, col.h, PLAYER.step, m.onGround);
    }
    // filet de sécurité : position sûre récente
    if (alive && playing) {
      if (m.onGround && now - m.safeAt > 400 && world.fits(m.pos, col.rx, col.h)) { m.safe.copy(m.pos); m.safeAt = now; }
      if (m.pos.y < -8) { m.pos.copy(m.safe); m.vel.set(0, 0, 0); }
    }
    const hSpeed = Math.hypot(m.vel.x, m.vel.z);
    if (role === 'hunter' && canMove && m.onGround && hSpeed > 2 && now - m.stepAt > (input.sprint ? 290 : 380)) { m.stepAt = now; sfx.step(null, null); }

    // ── caméra
    const yaw = input.yaw; const pitch = input.pitch;
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const firstPerson = alive && role === 'hunter';
    m.shake *= Math.exp(-dt * 5);
    const fov = aiming ? (m.weapon === 'shotgun' ? 26 : 50) : 74;
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }
    if (firstPerson) {
      bob.current += dt * (m.onGround ? hSpeed * 1.6 : 0);
      const by = Math.sin(bob.current * 2) * 0.035 * Math.min(1, hSpeed / 5) * (aiming ? 0.3 : 1);
      camera.position.set(m.pos.x, m.pos.y + PLAYER.eye + by, m.pos.z);
      camera.rotation.set(pitch + (Math.random() - 0.5) * m.shake * 0.05, yaw + (Math.random() - 0.5) * m.shake * 0.05, 0, 'YXZ');
    } else {
      // 3ᵉ personne : derrière toi (ou derrière le joueur que tu regardes si tu es éliminé)
      let pivot; let size = 1.5;
      if (alive) {
        const b = dis ? modelBounds(dis.m) : null;
        size = b ? Math.max(b.size[0], b.size[1], b.size[2]) * (dis.s || 1) : 1.6;
        pivot = new THREE.Vector3(m.pos.x, m.pos.y + Math.max(0.35, col.h * 0.8), m.pos.z);
      } else {
        const others = P.players.filter((x) => x.alive && x.id !== playerId && net.current.shown.has(x.id));
        const t = others.length ? net.current.shown.get(others[((m.specIdx % others.length) + others.length) % others.length].id) : null;
        pivot = t ? new THREE.Vector3(t.p[0], t.p[1] + 1.4, t.p[2]) : new THREE.Vector3(0, 10, 0);
        size = 2;
      }
      const want = Math.max(1.4, Math.min(8, size * 2.0 + 1.0));
      const back = dir.clone().negate();
      const hit = world.raycast(pivot, back, want + 0.3, { objects: false });
      const d = hit ? Math.max(0.3, hit.t - 0.3) : want;
      camDist.current = d < camDist.current ? d : camDist.current + (d - camDist.current) * Math.min(1, dt * 4);
      camera.position.copy(pivot).addScaledVector(back, camDist.current);
      camera.lookAt(pivot.clone().addScaledVector(dir, 2));
    }

    // ── mon corps (caché)
    if (body.current) {
      const visible = alive && role === 'prop' && !!dis;
      body.current.visible = visible;
      if (visible) { body.current.position.copy(m.pos); body.current.rotation.y = m.lockedYaw ?? yaw; }
    }

    // ── arme du chasseur
    vm.scene.environment = scene.environment;
    vm.setSkin(meP?.skin); vm.update(camera, dt, { yaw, pitch, moving: Math.min(1, hSpeed / 6), speed: hSpeed, grounded: m.onGround, visible: firstPerson && P.phase === 'HUNT' && !(aiming && m.weapon === 'shotgun' && Math.abs(camera.fov - 26) < 6), aim: aiming });
    if (m.reloadUntil && now >= m.reloadUntil) { m.reloadUntil = 0; if (m.reloadW) m.ammo[m.reloadW] = WEAPONS[m.reloadW].mag; }
    m.spread = Math.max(0, m.spread - dt * 0.05);
    // mes grenades : quand la mèche est consumée, on annonce l'explosion
    for (const [gid, g] of m.myGrenades) {
      if (gid !== 'pending' && now - g.at >= WEAPONS.grenade.fuseMs) {
        m.myGrenades.delete(gid);
        socket.emit('game:action', { type: 'boom', payload: { gid, p: g.path[g.path.length - 1].map((v) => Math.round(v * 100) / 100) } });
      }
    }

    // ── objet visé (cachés)
    if (role === 'prop' && alive && playing) {
      const hit = world.raycast(camera.position, dir, 30, { glass: false });
      let target = null;
      if (hit?.kind === 'object') {
        const ob = world.objects[hit.index]; const o = ob.o;
        const pt = camera.position.clone().addScaledVector(dir, hit.t);
        if (canDisguiseAs(o) && pt.distanceTo(new THREE.Vector3(m.pos.x, m.pos.y + col.h / 2, m.pos.z)) < TARGET_RANGE * Math.max(1, (o.s || 1) / 2)) target = { m: o.m, s: o.s || 1, index: hit.index, name: '' };
      }
      if (target) target.name = MODELS[target.m]?.name || target.m;
      targetRef.current = target;
      if (hl.current) {
        hl.current.visible = !!target;
        if (target) { const o = world.objects[target.index].o; hl.current.position.set(o.x, o.y, o.z); hl.current.rotation.set(0, o.ry || 0, 0); hl.current.scale.setScalar((o.s || 1) * 1.015); }
      }
      if ((target?.m || null) !== (hlModel || null)) setHlModel(target?.m || null);
    } else if (hl.current) { hl.current.visible = false; targetRef.current = null; }

    // ── tir (chasseur)
    const hunting = role === 'hunter' && alive && P.phase === 'HUNT';
    if (hunting && W.auto) {
      const reloading = m.reloadUntil > now;
      if (input.fire && !reloading) {
        if (m.ammo[m.weapon] <= 0) {
          if (!m.emptyClick) { m.emptyClick = true; sfx.empty(); startReload(m, vm); }
        } else {
          // plusieurs tirs par image si l'appareil est lent (cadence constante)
          if (now - m.lastShot > W.fireMs * 3) m.lastShot = now - W.fireMs;
          let n = 0;
          while (now - m.lastShot >= W.fireMs && m.ammo[m.weapon] > 0 && n < 3) {
            m.lastShot += W.fireMs; m.ammo[m.weapon] -= 1; n += 1;
            shoot(camera, dir, P, playerId, world, net, fx, vm, m, hSpeed, aiming);
          }
          if (m.ammo[m.weapon] === 0) setTimeout(() => startReload(m, vm), 250);
        }
      }
      if (!input.fire) m.emptyClick = false;
    }

    // ── actions
    for (const a of input.take()) {
      if (!alive || !role) { if (a === 'action' || a === 'next') m.specIdx += 1; continue; }
      if (role === 'hunter') {
        if (a === 'lock' || a === 'reload') startReload(m, vm);
        if (a.startsWith('num:')) selectWeapon(WEAPON_ORDER[Number(a.slice(4)) - 1]);
        if (a === 'wheel+' || a === 'wheel-') {
          const list = WEAPON_ORDER.filter((w) => w !== 'grenade' || m.ammo.grenade > 0);
          const i = list.indexOf(m.weapon); selectWeapon(list[(i + (a === 'wheel+' ? 1 : list.length - 1)) % list.length]);
        }
        if (a === 'lastWeapon') selectWeapon(m.lastWeapon);
        if (a === 'action' && hunting && !W.auto && now - m.lastShot >= W.fireMs) {
          if (m.weapon === 'shotgun') {
            if (m.reloadUntil > now) continue;
            if (m.ammo.shotgun <= 0) { sfx.empty(); startReload(m, vm); continue; }
            m.lastShot = now; m.ammo.shotgun -= 1;
            shoot(camera, dir, P, playerId, world, net, fx, vm, m, hSpeed, aiming);
            if (m.ammo.shotgun === 0) setTimeout(() => startReload(m, vm), 600);
          } else if (m.weapon === 'knife') {
            m.lastShot = now; melee(camera, dir, P, playerId, world, net, fx, vm);
          } else if (m.weapon === 'grenade' && m.ammo.grenade > 0) {
            m.lastShot = now; m.ammo.grenade -= 1;
            throwGrenade(camera, dir, world, fx, vm, m);
            if (m.ammo.grenade <= 0) setTimeout(() => selectWeapon('smg'), 600);
          }
        }
      }
      if (role === 'prop') {
        if (a === 'board') { setBoard((b) => !b); continue; }
        if (a.startsWith('num:') && boardRef.current) { const s = soundListRef.current[Number(a.slice(4)) - 1]; if (s) pickRef.current(s.id); continue; }
        if (a === 'action' && targetRef.current && playing) {
          const t = targetRef.current;
          const c = disguiseCollider(t.m, t.s);
          const test = m.pos.clone();
          if (world.fits(test, c.rx, c.h) || world.unstuck(test, c.rx, c.h)) socket.emit('game:action', { type: 'disguise', payload: { m: t.m, s: t.s } });
          else noRoomAt.current = now;
        }
        if (a === 'lock' || a === 'alt') m.lockedYaw = m.lockedYaw === null ? yaw : null;
        if (a === 'taunt') { const l = soundListRef.current; if (l.length) pickRef.current(l[Math.floor(Math.random() * l.length)].id); }
        if (a === 'decoy') socket.emit('game:action', { type: 'decoy', payload: {} });
        if (a === 'ventri' && P.phase === 'HUNT' && Date.now() - m.lastVentri >= ABILITIES.ventriloquistMs) {
          // ventriloque : la moquerie retentit là où tu regardes (jusqu'à 30 m)
          const hit = world.raycast(camera.position, dir, ABILITIES.ventriloquistRange + 8);
          const pt = camera.position.clone().addScaledVector(dir, hit ? Math.max(0.5, hit.t - 0.3) : ABILITIES.ventriloquistRange);
          if (pt.distanceTo(m.pos) > ABILITIES.ventriloquistRange) pt.sub(m.pos).setLength(ABILITIES.ventriloquistRange).add(m.pos);
          m.lastVentri = Date.now();
          const l = soundListRef.current;
          socket.emit('game:action', { type: 'ventriloquist', payload: { p: [pt.x, pt.y, pt.z].map((v) => Math.round(v * 100) / 100), sound: l.length ? l[Math.floor(Math.random() * l.length)].id : null } });
        }
      }
    }

    // ── interface (≈ 12 fois par seconde)
    if (now - lastHud.current > 80) {
      lastHud.current = now;
      const reloading = m.reloadUntil > now;
      const next = {
        scoped: aiming && m.weapon === 'shotgun' && Math.abs(camera.fov - 26) < 6, target: targetRef.current, locked: m.lockedYaw !== null, ammo: m.ammo[m.weapon] ?? 0, weapon: m.weapon, ammoAll: { ...m.ammo }, reloading,
        reloadPct: reloading && m.reloadW ? 1 - (m.reloadUntil - now) / WEAPONS[m.reloadW].reloadMs : 0,
        spread: Math.min(0.03, (aiming ? 0.3 : 1) * (m.spread + (hSpeed > 1 ? 0.004 : 0) + (m.onGround ? 0 : 0.01))) * (m.weapon === 'shotgun' ? 0.4 : 1), noRoom: noRoomAt.current,
      };
      setHud((h) => (h.target?.index === next.target?.index && h.locked === next.locked && h.ammo === next.ammo && h.weapon === next.weapon && h.reloading === next.reloading
        && h.ammoAll.grenade === next.ammoAll.grenade && Math.abs(h.reloadPct - next.reloadPct) < 0.04 && Math.abs(h.spread - next.spread) < 0.001 && h.noRoom === next.noRoom && h.scoped === next.scoped ? h : next));
    }

    // ── envoi de ma position
    if (alive && playing && now - lastSend.current > SEND_MS) {
      lastSend.current = now;
      const ry = role === 'prop' ? (m.lockedYaw ?? yaw) : yaw;
      socket.volatile.emit('game:action', { type: 'pos', payload: { p: [m.pos.x, m.pos.y, m.pos.z], ry, pi: pitch, w: WEAPON_ORDER.indexOf(m.weapon) } });
    }
  });

  return (
    <>
      <group ref={body}>{self?.disguise && <PropModel m={self.disguise.m} s={self.disguise.s} />}</group>
      <group ref={hl} visible={false}>
        {hlModel && modelParts(hlModel).map(({ key, geometry }) => <mesh key={key} geometry={geometry} material={highlightMat} />)}
      </group>
    </>
  );
}

function startReload(m, vm) {
  const now = performance.now();
  const w = m.weapon;
  const W = WEAPONS[w];
  if (!W.reloadMs || m.reloadUntil > now || m.ammo[w] >= W.mag) return;
  m.reloadUntil = now + W.reloadMs; m.reloadW = w;
  vm.reload(W.reloadMs);
  sfx.reload();
  socket.emit('game:action', { type: 'reload', payload: { w } });
}

const r2 = (v) => v.map((x) => Math.round(x * 100) / 100);

/** Ce que touche un rayon : joueur caché, leurre ou décor (objet qu'on peut imiter = pénalité). */
function traceShot(origin, dir, P, playerId, world, net, range) {
  let best = null;
  for (const pl of P.players) {
    const shown = net.current.shown.get(pl.id);
    if (pl.id === playerId || pl.role !== 'prop' || !pl.alive || !shown || !pl.disguise) continue;
    const t = rayModel(origin, dir, pl.disguise.m, pl.disguise.s, shown.p, shown.ry);
    if (t !== null && t < range && (!best || t < best.t)) best = { t, hit: { kind: 'player', id: pl.id } };
  }
  for (const d of P.decoys || []) {
    const t = rayModel(origin, dir, d.m, d.s, d.p, d.ry);
    if (t !== null && t < range && (!best || t < best.t)) best = { t, hit: { kind: 'decoy', id: d.id } };
  }
  const w = world.raycast(origin, dir, range);
  let wn = null;
  if (w && (!best || w.t < best.t)) {
    const o = w.kind === 'object' ? world.objects[w.index].o : null;
    best = { t: w.t, hit: { kind: o && !w.static && canDisguiseAs(o) ? 'object' : 'world' } };
    wn = hitNormal(w, origin.clone().addScaledVector(dir, w.t));
  }
  return { best, wn };
}

/** Tir (mitraillette : une balle ; fusil à pompe : 8 plombs). */
function shoot(camera, aim, P, playerId, world, net, fx, vm, m, hSpeed, aiming) {
  const W = WEAPONS[m.weapon];
  const origin = camera.position.clone();
  const spread = (W.spread + (W.pellets > 1 ? 0 : m.spread) + (hSpeed > 1 ? 0.004 : 0)) * (aiming ? (W.pellets > 1 ? 0.7 : 0.3) : 1);
  if (W.pellets === 1) m.spread = Math.min(0.025, m.spread + 0.0035);
  const from = vm.muzzleWorld();
  const hits = []; const tos = [];
  let penalty = false; let playerHit = false;
  for (let i = 0; i < W.pellets; i++) {
    const dir = aim.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2 * spread, (Math.random() - 0.5) * 2 * spread, (Math.random() - 0.5) * 2 * spread)).normalize();
    const { best, wn } = traceShot(origin, dir, P, playerId, world, net, W.range);
    const to = origin.clone().addScaledVector(dir, best ? best.t : W.range).toArray();
    tos.push(r2(to)); hits.push(best?.hit || { kind: 'none' });
    if (i < 4 || W.pellets === 1) fx.tracer(from, to);
    if (best) fx.impact(to, wn, { decal: !!wn && best.hit.kind !== 'player', color: best.hit.kind === 'player' ? 0x5eead4 : 0xffd27a, count: W.pellets > 1 ? 3 : 8 });
    if (best?.hit.kind === 'object' || best?.hit.kind === 'decoy') penalty = true;
    if (best?.hit.kind === 'player') playerHit = true;
    if (i === 0 && best && best.hit.kind !== 'player') sfx.impact(to, { x: origin.x, z: origin.z, yaw: 0 });
  }
  fx.muzzle(from, false);
  const heavy = W.pellets > 1 || W.id === 'shotgun';
  vm.kick(heavy ? 2.4 : 1);
  if (heavy) { sfx.shotgun(null, null, true); m.shake = Math.max(m.shake, 0.35); } else sfx.shot(null, null, true);
  if (penalty && !playerHit) sfx.penalty();
  socket.emit('game:action', { type: 'shoot', payload: { w: m.weapon, hits, from: r2(from), to: W.pellets > 1 ? tos : tos[0] } });
}

/** Coup de couteau : ce qui est devant, à portée de bras. */
function melee(camera, dir, P, playerId, world, net, fx, vm) {
  vm.swing(); sfx.swish(null, null);
  const { best, wn } = traceShot(camera.position.clone(), dir, P, playerId, world, net, WEAPONS.knife.range);
  if (best) {
    const to = camera.position.clone().addScaledVector(dir, best.t).toArray();
    fx.impact(to, wn, { decal: false, count: 6, color: best.hit.kind === 'player' ? 0x5eead4 : 0xcccccc });
    sfx.impact(to, null);
  }
  socket.emit('game:action', { type: 'melee', payload: { hit: best?.hit || { kind: 'none' } } });
}

/** Lancer de grenade : trajectoire calculée ici (et chez les autres à partir du même départ). */
function throwGrenade(camera, dir, world, fx, vm, m) {
  vm.throwAnim(); sfx.pin(); sfx.throwG(null, null);
  const start = camera.position.clone().addScaledVector(dir, 0.5); start.y -= 0.1;
  const v = dir.clone().multiplyScalar(WEAPONS.grenade.speed); v.y += 3;
  const p0 = r2(start.toArray()); const v0 = r2(v.toArray());
  const path = grenadePath(world, p0, v0, WEAPONS.grenade.fuseMs);
  fx.grenade('mine', path);
  m.myGrenades.set('pending', { path, at: performance.now() });
  socket.emit('game:action', { type: 'throw', payload: { p: p0, v: v0 } });
}
