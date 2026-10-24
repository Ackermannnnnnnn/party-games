import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { socket } from '../../lib/socket.js';
import { serverNow } from '../blindtest/audio.js';
import { getMap, MODELS, PLAYER, modelBounds, canDisguiseAs } from './shared.js';
import { World, buildMapGeometry, mapMaterial, modelGeometry, playerBox, rayObb, disguiseCollider, obbToAabb } from './world.js';
import { createInput, attachDesktop, attachTouch, isTouch } from './controls.js';
import { sfx, setVolume, getVolume } from './sfx.js';

/**
 * Prop Hunt — la partie en 3D : le monde, ton personnage, les autres joueurs, les tirs et l'interface.
 */
const SEND_MS = 66;
const INTERP_MS = 120;
const TARGET_RANGE = 5;
const SHOOT_RANGE = 70;
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const angLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };

export default function PropHunt3D({ p, playerId, isHost }) {
  const input = useMemo(() => createInput(), []);
  const net = useRef({ snaps: new Map(), shown: new Map(), fx: [], hitAt: 0, hurtAt: 0, lastShotFx: 0 });
  const me = useRef({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: false, lockedYaw: null, spawnKey: null, specIdx: 0, lastStep: 0 });
  const pRef = useRef(p); pRef.current = p;
  const [hud, setHud] = useState({ target: null, locked: false });
  const [scoreboard, setScoreboard] = useState(false);
  const [menu, setMenu] = useState(false);
  const [stick, setStick] = useState({ active: false });
  const [locked, setLocked] = useState(false);
  const layerRef = useRef(null);
  const canvasWrap = useRef(null);
  const world = useMemo(() => (p.mapId ? new World(getMap(p.mapId)) : null), [p.mapId]);
  const self = p.players.find((x) => x.id === playerId);

  // Leurres : obstacles pour tout le monde
  useEffect(() => {
    if (!world) return;
    world.extraBoxes = (p.decoys || []).map((d) => {
      const ob = playerBox({ model: d.m, scale: d.s, p: d.p, ry: d.ry });
      const c = Math.abs(Math.cos(ob.ry)); const s = Math.abs(Math.sin(ob.ry));
      const hx = ob.hx * c + ob.hz * s; const hz = ob.hx * s + ob.hz * c;
      return { minX: ob.cx - hx, maxX: ob.cx + hx, minY: ob.cy - ob.hy, maxY: ob.cy + ob.hy, minZ: ob.cz - hz, maxZ: ob.cz + hz, kind: 'decoy' };
    });
  }, [world, p.decoys]);

  // Événements temps réel
  useEffect(() => {
    const onEv = (e) => {
      const n = net.current;
      const listener = { x: me.current.pos.x, z: me.current.pos.z, yaw: input.yaw };
      if (e.type === 'snap') {
        for (const [id, x, y, z, ry, pi, alive] of e.s) {
          if (id === playerId) continue;
          const arr = n.snaps.get(id) || [];
          arr.push({ t: e.t, p: [x, y, z], ry, pi, alive });
          while (arr.length > 6) arr.shift();
          n.snaps.set(id, arr);
        }
      } else if (e.type === 'shot') {
        if (e.by === playerId) return;
        if (e.from && e.to) n.fx.push({ kind: 'tracer', from: e.from, to: e.to, at: performance.now() });
        sfx.shot(e.from, listener, false);
      } else if (e.type === 'hit') {
        if (e.by === playerId) { n.hitAt = performance.now(); sfx.hit(); }
        if (e.target === playerId) { n.hurtAt = performance.now(); sfx.hurt(); }
      } else if (e.type === 'kill') {
        if (e.target === playerId) sfx.death(); else if (e.by === playerId) sfx.kill();
        const at = e.target === playerId ? [me.current.pos.x, me.current.pos.y, me.current.pos.z] : n.shown.get(e.target)?.p;
        if (at) n.fx.push({ kind: 'poof', p: at, at: performance.now() });
      } else if (e.type === 'taunt') {
        sfx.taunt(e.sound, e.by === playerId ? null : e.p, listener);
        // la note ne s'affiche que pour les cachés : les chasseurs, eux, doivent se fier à leurs oreilles
        const myRole = pRef.current.players.find((x) => x.id === playerId)?.role;
        if (e.p && myRole !== 'hunter') n.fx.push({ kind: 'note', p: e.p, at: performance.now(), forced: e.forced });
      } else if (e.type === 'disguise') {
        const pos = e.by === playerId ? null : n.snaps.get(e.by)?.at(-1)?.p;
        sfx.disguise(pos, listener);
      } else if (e.type === 'release') sfx.horn();
    };
    socket.on('game:event', onEv);
    return () => socket.off('game:event', onEv);
  }, [playerId]);

  // Commandes
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return undefined;
    const offs = [attachDesktop(input, el, { onScoreboard: setScoreboard })];
    if (isTouch) offs.push(attachTouch(input, el, setStick));
    const lockCheck = () => setLocked(document.pointerLockElement === el);
    document.addEventListener('pointerlockchange', lockCheck);
    return () => { offs.forEach((f) => f()); document.removeEventListener('pointerlockchange', lockCheck); };
  }, []);
  useEffect(() => { input.enabled = !menu; if (menu && document.pointerLockElement) document.exitPointerLock?.(); }, [menu]);

  // Bips du compte à rebours (fin de la cachette)
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 250); return () => clearInterval(id); }, []);
  const left = (p.endsAt || 0) - serverNow();
  const secLeft = Math.ceil(left / 1000);
  const lastBeep = useRef(null);
  useEffect(() => {
    if (p.phase === 'HIDE' && secLeft <= 5 && secLeft >= 1 && lastBeep.current !== secLeft) { lastBeep.current = secLeft; sfx.beep(secLeft === 1); }
  }, [secLeft, p.phase]);

  if (!world || !self) return <div className="ph-screen flex items-center justify-center text-slate-300">Chargement de la map…</div>;
  const role = self.role;
  const alive = self.alive;
  const map = getMap(p.mapId);
  const hiding = p.phase === 'HIDE';
  const blind = hiding && role === 'hunter';
  const propsAlive = p.players.filter((x) => x.role === 'prop' && x.alive).length;
  const propsTotal = p.players.filter((x) => x.role === 'prop').length;
  const huntersAlive = p.players.filter((x) => x.role === 'hunter' && x.alive).length;
  const myDecoys = (p.decoys || []).filter((d) => d.owner === playerId).length;
  const hurt = performance.now() - net.current.hurtAt < 350;
  const hitMark = performance.now() - net.current.hitAt < 220;
  const person = (id) => p.players.find((x) => x.id === id) || { pseudo: '?' };

  return (
    <div ref={canvasWrap} className="ph-screen">
      <Canvas dpr={isTouch ? [1, 1.25] : [1, 1.75]} gl={{ antialias: !isTouch, powerPreference: 'high-performance' }}
        camera={{ fov: 72, near: 0.05, far: 200, position: [0, 2, 5] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}>
        <Scene p={p} playerId={playerId} world={world} map={map} input={input} me={me} net={net} pRef={pRef} setHud={setHud} />
      </Canvas>

      {/* calque qui reçoit souris / doigts */}
      <div ref={layerRef} className="absolute inset-0" style={{ touchAction: 'none' }} />

      {/* ───── Interface ───── */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {hurt && <div className="absolute inset-0 bg-red-600/30" />}
        {blind && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center px-6">
            <p className="font-display text-3xl sm:text-5xl text-slate-50">Tu es chasseur</p>
            <p className="mt-3 text-slate-300">Les cachés se transforment en objets… tu pourras bouger dans</p>
            <p className="font-display text-6xl sm:text-8xl text-amber-300 mt-2">{Math.max(0, secLeft)}</p>
            <p className="mt-4 text-xs text-slate-400 max-w-sm">Tire sur les objets suspects. Attention : tirer sur un vrai objet te coûte de la vie.</p>
          </div>
        )}

        {/* haut : chrono, manche, équipes */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="flex items-center gap-3 rounded-2xl bg-black/55 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-xs text-slate-300">🫥 {propsAlive}/{propsTotal}</span>
            <span className={`font-display text-2xl tabular-nums ${left < 30000 && p.phase === 'HUNT' ? 'text-rose-400' : 'text-white'}`}>{fmt(left)}</span>
            <span className="text-xs text-slate-300">🔫 {huntersAlive}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-200/90 drop-shadow">{hiding ? 'Cachez-vous !' : p.phase === 'HUNT' ? 'La chasse est ouverte' : ''} · Manche {p.round}/{p.totalRounds} · {map.name}</p>
        </div>

        {/* fil des éliminations */}
        <div className="absolute top-2 right-2 space-y-1 max-w-[45%]">
          {(p.feed || []).slice(-4).map((f) => (
            <p key={f.id} className="rounded-lg bg-black/55 px-2 py-1 text-[11px] sm:text-xs text-slate-100 text-right">
              {f.kind === 'kill' ? <><b className="text-amber-300">{person(f.by).pseudo}</b> a trouvé <b>{person(f.target).pseudo}</b>{f.model ? ` (${MODELS[f.model]?.name})` : ''}</>
                : <><b>{person(f.target).pseudo}</b> s'est épuisé à tirer partout</>}
            </p>
          ))}
        </div>

        {/* viseur */}
        {alive && !blind && p.phase !== 'ROUND_END' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {role === 'hunter'
              ? <div className={`relative w-6 h-6 ${hitMark ? 'scale-125' : ''} transition-transform`}>
                  <span className={`absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 ${hitMark ? 'bg-rose-400' : 'bg-white'}`} />
                  <span className={`absolute left-1/2 bottom-0 h-2 w-0.5 -translate-x-1/2 ${hitMark ? 'bg-rose-400' : 'bg-white'}`} />
                  <span className={`absolute top-1/2 left-0 w-2 h-0.5 -translate-y-1/2 ${hitMark ? 'bg-rose-400' : 'bg-white'}`} />
                  <span className={`absolute top-1/2 right-0 w-2 h-0.5 -translate-y-1/2 ${hitMark ? 'bg-rose-400' : 'bg-white'}`} />
                </div>
              : <span className={`block w-2 h-2 rounded-full ${hud.target ? 'bg-teal-300' : 'bg-white/70'}`} />}
          </div>
        )}
        {role === 'prop' && alive && hud.target && p.phase !== 'ROUND_END' && (
          <p className="absolute left-1/2 top-[56%] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm text-teal-200 whitespace-nowrap">
            {isTouch ? 'Touche « Devenir »' : 'E ou clic'} : devenir <b>{MODELS[hud.target.m]?.name}</b>
          </p>
        )}

        {/* bas gauche : vie et rôle */}
        {alive && (
          <div className={`absolute ${isTouch ? 'top-14 left-2' : 'bottom-3 left-3'} w-44 sm:w-56 rounded-2xl bg-black/55 px-3 py-2 backdrop-blur-sm`}>
            <p className="text-xs text-slate-300">{role === 'hunter' ? '🔫 Chasseur' : `🫥 Caché${self.disguise ? ` · ${MODELS[self.disguise.m]?.name}` : ''}`}{role === 'prop' && hud.locked ? ' · 🔒' : ''}</p>
            <div className="mt-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${self.hp / self.maxHp < 0.3 ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, (self.hp / self.maxHp) * 100)}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">{self.hp} / {self.maxHp} PV</p>
          </div>
        )}
        {!alive && p.phase !== 'ROUND_END' && (
          <p className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-slate-200 whitespace-nowrap">
            {role ? '💀 Éliminé' : '👀 Tu joues à la prochaine manche'} · {isTouch ? 'touche « Suivant »' : 'clic'} pour changer de joueur
          </p>
        )}

        {/* aide PC */}
        {!isTouch && alive && !blind && p.phase !== 'ROUND_END' && (
          <p className="absolute bottom-3 right-3 rounded-xl bg-black/45 px-3 py-1.5 text-[11px] text-slate-300 text-right leading-relaxed">
            ZQSD / WASD bouger · Espace sauter · Maj courir<br />
            {role === 'hunter' ? 'Clic : tirer' : `E / clic : devenir l'objet visé · R : bloquer la rotation · F : moquerie · G : leurre (${(p.options?.decoys || 0) - myDecoys})`} · Tab : scores
          </p>
        )}
        {!isTouch && !locked && !menu && p.phase !== 'ROUND_END' && !blind && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-2xl bg-black/70 px-5 py-3 text-slate-100 text-center">Clique pour jouer<br /><span className="text-xs text-slate-400">Échap pour libérer la souris</span></p>
          </div>
        )}

        {/* fin de manche */}
        {p.phase === 'ROUND_END' && p.result && <RoundEnd p={p} person={person} />}
        {(scoreboard || menu) && <Scoreboard p={p} playerId={playerId} />}
      </div>

      {/* ───── Boutons (tactile) et menu ───── */}
      <button type="button" onClick={() => setMenu((m) => !m)} className="ph-btn absolute top-2 left-2 !w-10 !h-10 text-lg" aria-label="Menu">☰</button>
      {menu && <Menu isHost={isHost} onClose={() => setMenu(false)} input={input} />}
      {isTouch && <PortraitHint />}
      {isTouch && <TouchControls input={input} role={role} alive={alive} blind={blind} stick={stick} decoysLeft={(p.options?.decoys || 0) - myDecoys} hud={hud} phase={p.phase} />}
    </div>
  );
}

// ───────────────────────── Scène 3D ─────────────────────────
function Scene({ p, playerId, world, map, input, me, net, pRef, setHud }) {
  const geo = useMemo(() => buildMapGeometry(map), [map]);
  const { scene } = useThree();
  useEffect(() => { scene.background = new THREE.Color(map.sky); scene.fog = new THREE.Fog(...map.fog); }, [map]);
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x8a7a68, 2.1 * map.light]} />
      <directionalLight position={[20, 35, 12]} intensity={2.4 * map.light} />
      <directionalLight position={[-15, 20, -25]} intensity={0.7 * map.light} />
      <ambientLight intensity={0.5} />
      <mesh geometry={geo} material={mapMaterial} />
      {(p.decoys || []).map((d) => <ModelMesh key={d.id} m={d.m} s={d.s} p={d.p} ry={d.ry} />)}
      {p.players.filter((x) => x.id !== playerId && x.role).map((x) => <Remote key={x.id} pl={x} net={net} />)}
      <Local p={p} playerId={playerId} world={world} input={input} me={me} net={net} pRef={pRef} setHud={setHud} />
      <Effects net={net} />
    </>
  );
}

function ModelMesh({ m, s = 1, p, ry = 0 }) {
  return <mesh geometry={modelGeometry(m)} material={mapMaterial} position={p} rotation={[0, ry, 0]} scale={s} />;
}

/** Autre joueur : position interpolée entre deux instantanés du serveur. */
function Remote({ pl, net }) {
  const g = useRef();
  const head = useRef();
  useFrame(() => {
    const o = g.current; if (!o) return;
    const arr = net.current.snaps.get(pl.id);
    if (!arr?.length) { o.visible = false; return; }
    const t = serverNow() - INTERP_MS;
    let a = arr[0]; let b = arr[arr.length - 1];
    for (let i = 0; i < arr.length - 1; i++) if (arr[i].t <= t && arr[i + 1].t >= t) { a = arr[i]; b = arr[i + 1]; break; }
    const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    o.position.set(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k);
    o.rotation.y = angLerp(a.ry, b.ry, k);
    if (head.current) head.current.rotation.x = -(a.pi + (b.pi - a.pi) * k);
    o.visible = pl.alive;
    // pour les tirs et la caméra de spectateur : la position affichée
    net.current.shown.set(pl.id, { p: [o.position.x, o.position.y, o.position.z], ry: o.rotation.y });
  });
  if (pl.role === 'prop') return <group ref={g}>{pl.disguise && <mesh geometry={modelGeometry(pl.disguise.m)} material={mapMaterial} scale={pl.disguise.s} />}</group>;
  return (
    <group ref={g}>
      <HunterBody head={head} name={pl.pseudo} />
    </group>
  );
}

const hunterMat = new THREE.MeshLambertMaterial({ color: 0x2f4f6f, flatShading: true });
const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0b48f, flatShading: true });
const gunMat = new THREE.MeshLambertMaterial({ color: 0x222428, flatShading: true });
const stockMat = new THREE.MeshLambertMaterial({ color: 0x6b4526, flatShading: true });
function HunterBody({ head, name }) {
  const label = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 8, 256, 48);
    g.fillStyle = '#fca5a5'; g.font = 'bold 32px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name.slice(0, 14), 128, 33);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [name]);
  return (
    <>
      <mesh material={hunterMat} position={[0, 0.85, 0]}><capsuleGeometry args={[0.28, 0.75, 4, 8]} /></mesh>
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh material={skinMat}><sphereGeometry args={[0.2, 10, 8]} /></mesh>
        <mesh material={gunMat} position={[0, 0.14, 0]}><cylinderGeometry args={[0.22, 0.22, 0.08, 10]} /></mesh>
        <mesh material={gunMat} position={[0.22, -0.25, -0.35]}><boxGeometry args={[0.08, 0.12, 0.55]} /></mesh>
      </group>
      <sprite position={[0, 2.25, 0]} scale={[1.2, 0.3, 1]}><spriteMaterial map={label} depthWrite={false} transparent /></sprite>
    </>
  );
}

/** Traînées de balles, notes de musique des moqueries. */
function Effects({ net }) {
  const group = useRef();
  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true }), []);
  const noteMat = useMemo(() => new THREE.SpriteMaterial({ map: noteTexture(), transparent: true, depthWrite: false }), []);
  const poofMat = useMemo(() => new THREE.SpriteMaterial({ map: noteTexture('💥'), transparent: true, depthWrite: false }), []);
  const sprites = useRef([]);
  useFrame(() => {
    const now = performance.now();
    const fx = net.current.fx = net.current.fx.filter((f) => now - f.at < (f.kind === 'tracer' ? 140 : 1500));
    const pts = [];
    for (const f of fx) if (f.kind === 'tracer') pts.push(...f.from, ...f.to);
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    lineMat.opacity = 0.9;
    const notes = fx.filter((f) => f.kind === 'note' || f.kind === 'poof');
    while (sprites.current.length < notes.length) { const s = new THREE.Sprite(noteMat); s.scale.set(0.6, 0.6, 1); group.current.add(s); sprites.current.push(s); }
    sprites.current.forEach((s, i) => {
      const f = notes[i];
      s.visible = !!f;
      if (f) {
        const k = (now - f.at) / 1500;
        s.material = f.kind === 'poof' ? poofMat : noteMat;
        if (f.kind === 'poof') { s.position.set(f.p[0], f.p[1] + 0.6, f.p[2]); s.scale.setScalar(0.5 + k * 2.5); s.material.opacity = 1 - k; }
        else { s.scale.setScalar(0.6); s.position.set(f.p[0] + Math.sin(k * 8) * 0.2, f.p[1] + 1 + k * 1.5, f.p[2]); s.material.opacity = 1 - k; }
      }
    });
  });
  return <group ref={group}><lineSegments geometry={lineGeo} material={lineMat} /></group>;
}

const _tex = {};
function noteTexture(ch = '🎵') {
  if (_tex[ch]) return _tex[ch];
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d'); g.font = '52px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 34);
  _tex[ch] = new THREE.CanvasTexture(c); return _tex[ch];
}

// ───────────────────────── Ton personnage ─────────────────────────
function Local({ p, playerId, world, input, me, net, pRef, setHud }) {
  const { camera } = useThree();
  const body = useRef();
  const gun = useRef();
  const outline = useRef();
  const lastSend = useRef(0);
  const lastTarget = useRef(0);
  const recoil = useRef(0);
  const targetRef = useRef(null);
  const self = p.players.find((x) => x.id === playerId);

  // nouvelle manche : on se place au point de départ
  useEffect(() => {
    const sp = p.spawns?.[playerId];
    const key = `${p.round}-${p.gameNo}`;
    if (sp && me.current.spawnKey !== key) {
      me.current.spawnKey = key;
      me.current.pos.set(sp[0], sp[1], sp[2]);
      me.current.vel.set(0, 0, 0);
      me.current.lockedYaw = null;
      input.yaw = Math.atan2(sp[0], sp[2]); // face au centre de la map
      input.pitch = -0.05;
      net.current.snaps.clear();
    }
  }, [p.round, p.gameNo, p.spawns]);

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

    // ── les autres joueurs sont solides (un chasseur ne traverse pas un objet… qui est un joueur)
    world.dynBoxes = [];
    for (const pl of P.players) {
      if (pl.id === playerId || !pl.alive || !pl.role) continue;
      const sh = net.current.shown.get(pl.id);
      if (!sh) continue;
      const box = pl.role === 'prop' && pl.disguise
        ? obbToAabb(playerBox({ model: pl.disguise.m, scale: pl.disguise.s, p: sh.p, ry: sh.ry }))
        : { minX: sh.p[0] - 0.3, maxX: sh.p[0] + 0.3, minY: sh.p[1], maxY: sh.p[1] + PLAYER.height, minZ: sh.p[2] - 0.3, maxZ: sh.p[2] + 0.3 };
      world.dynBoxes.push({ ...box, kind: 'player' });
    }

    // ── déplacement
    if (canMove) {
      const w = input.wish();
      const speed = (input.sprint ? PLAYER.sprint : PLAYER.speed) * (role === 'prop' ? 1.05 : 1);
      const fx = -Math.sin(input.yaw); const fz = -Math.cos(input.yaw);
      const rx = Math.cos(input.yaw); const rz = -Math.sin(input.yaw);
      const tx = (rx * w.x + fx * w.y) * speed; const tz = (rz * w.x + fz * w.y) * speed;
      const acc = m.onGround ? 14 : 4;
      m.vel.x += (tx - m.vel.x) * Math.min(1, acc * dt);
      m.vel.z += (tz - m.vel.z) * Math.min(1, acc * dt);
      if (input.jump && m.onGround) { m.vel.y = PLAYER.jump; m.onGround = false; }
      m.onGround = world.move(m.pos, m.vel, dt, col.rx, col.h);
    } else if (alive && playing) {
      m.vel.set(0, m.vel.y, 0);
      m.onGround = world.move(m.pos, m.vel, dt, col.rx, col.h);
    }

    // ── caméra
    const yaw = input.yaw; const pitch = input.pitch;
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    if (alive && role === 'hunter') {
      camera.position.set(m.pos.x, m.pos.y + PLAYER.eye, m.pos.z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    } else {
      // 3ᵉ personne : derrière toi (ou derrière le joueur que tu regardes si tu es éliminé)
      let pivot; let size = 1.5;
      if (alive) {
        const b = dis ? modelBounds(dis.m) : null;
        size = b ? Math.max(b.size[0], b.size[1], b.size[2]) * (dis.s || 1) : 1.6;
        pivot = new THREE.Vector3(m.pos.x, m.pos.y + Math.max(0.3, col.h * 0.75), m.pos.z);
      } else {
        const others = P.players.filter((x) => x.alive && x.id !== playerId && net.current.shown.has(x.id));
        const t = others.length ? net.current.shown.get(others[((m.specIdx % others.length) + others.length) % others.length].id) : null;
        pivot = t ? new THREE.Vector3(t.p[0], t.p[1] + 1.4, t.p[2]) : new THREE.Vector3(0, 8, 0);
        size = 2;
      }
      const dist = Math.max(1.3, Math.min(9, size * 2.2 + 1.0));
      const back = dir.clone().negate();
      const hit = world.raycast(pivot, back, dist, { objects: false });
      const d = hit ? Math.max(0.4, hit.t - 0.25) : dist;
      camera.position.copy(pivot).addScaledVector(back, d);
      camera.lookAt(pivot.clone().addScaledVector(dir, 2));
    }

    // ── mon corps
    if (body.current) {
      const visible = alive && role === 'prop' && !!dis;
      body.current.visible = visible;
      if (visible) {
        body.current.position.copy(m.pos);
        body.current.rotation.y = m.lockedYaw ?? yaw;
      }
    }
    // arme en vue subjective
    if (gun.current) {
      gun.current.visible = alive && role === 'hunter';
      recoil.current *= Math.exp(-dt * 12);
      gun.current.position.copy(camera.position);
      gun.current.quaternion.copy(camera.quaternion);
      gun.current.translateX(0.2); gun.current.translateY(-0.17 + recoil.current * 0.02); gun.current.translateZ(-0.42 + recoil.current * 0.06);
      gun.current.rotateX(recoil.current * 0.15);
    }

    // ── objet visé (cachés)
    const now = performance.now();
    if (role === 'prop' && alive && now - lastTarget.current > 90) {
      lastTarget.current = now;
      const hit = world.raycast(camera.position, dir, 40);
      let target = null;
      if (hit?.kind === 'object') {
        const o = world.map.objects[hit.index];
        const pt = camera.position.clone().addScaledVector(dir, hit.t);
        if (canDisguiseAs(o) && pt.distanceTo(m.pos) < TARGET_RANGE * Math.max(1, o.s / 2)) target = { m: o.m, s: o.s, index: hit.index };
      }
      targetRef.current = target;
      if (outline.current) {
        outline.current.visible = !!target;
        if (target) {
          const ob = world.objectBoxes[target.index];
          outline.current.position.set(ob.cx, ob.cy, ob.cz);
          outline.current.rotation.set(0, ob.ry, 0);
          outline.current.scale.set(ob.hx * 2 + 0.04, ob.hy * 2 + 0.04, ob.hz * 2 + 0.04);
        }
      }
      setHud((h) => (h.target?.index === target?.index && h.locked === (m.lockedYaw !== null) ? h : { target, locked: m.lockedYaw !== null }));
    } else if (outline.current && !(role === 'prop' && alive)) outline.current.visible = false;

    // ── actions
    for (const a of input.take()) {
      if (!alive) { if (a === 'action' || a === 'next') m.specIdx += 1; continue; }
      if (role === 'hunter' && a === 'action' && P.phase === 'HUNT') shoot(camera, dir, P, playerId, world, net, recoil, m);
      if (role === 'prop') {
        if (a === 'action' && targetRef.current && playing) socket.emit('game:action', { type: 'disguise', payload: { m: targetRef.current.m, s: targetRef.current.s } });
        if (a === 'lock' || a === 'alt') m.lockedYaw = m.lockedYaw === null ? yaw : null;
        if (a === 'taunt') socket.emit('game:action', { type: 'taunt', payload: {} });
        if (a === 'decoy') socket.emit('game:action', { type: 'decoy', payload: {} });
      }
    }

    // ── envoi de ma position
    if (alive && playing && now - lastSend.current > SEND_MS) {
      lastSend.current = now;
      const ry = role === 'prop' ? (m.lockedYaw ?? yaw) : yaw;
      socket.volatile.emit('game:action', { type: 'pos', payload: { p: [m.pos.x, m.pos.y, m.pos.z], ry, pi: pitch } });
    }
  });

  return (
    <>
      <group ref={body}>{self?.disguise && <mesh geometry={modelGeometry(self.disguise.m)} material={mapMaterial} scale={self.disguise.s} />}</group>
      <group ref={gun} scale={0.6}>
        <mesh material={gunMat} position={[0, 0, -0.15]}><boxGeometry args={[0.07, 0.1, 0.42]} /></mesh>
        <mesh material={gunMat} position={[0, -0.09, 0.0]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.06, 0.16, 0.08]} /></mesh>
        <mesh material={stockMat} position={[0, -0.02, 0.12]}><boxGeometry args={[0.07, 0.09, 0.2]} /></mesh>
      </group>
      <lineSegments ref={outline} visible={false}>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color={0x5eead4} />
      </lineSegments>
    </>
  );
}

/** Tir du chasseur : ce que vise le centre de l'écran (joueur caché, leurre ou objet de la map). */
function shoot(camera, dir, P, playerId, world, net, recoil, m) {
  const origin = camera.position.clone();
  let best = null;
  for (const pl of P.players) {
    const shown = net.current.shown.get(pl.id);
    if (pl.id === playerId || pl.role !== 'prop' || !pl.alive || !shown || !pl.disguise) continue;
    const ob = playerBox({ model: pl.disguise.m, scale: pl.disguise.s, p: shown.p, ry: shown.ry });
    const t = rayObb(origin, dir, ob);
    if (t !== null && t < SHOOT_RANGE && (!best || t < best.t)) best = { t, hit: { kind: 'player', id: pl.id } };
  }
  for (const d of P.decoys || []) {
    const t = rayObb(origin, dir, playerBox({ model: d.m, scale: d.s, p: d.p, ry: d.ry }));
    if (t !== null && t < SHOOT_RANGE && (!best || t < best.t)) best = { t, hit: { kind: 'decoy', id: d.id } };
  }
  const w = world.raycast(origin, dir, SHOOT_RANGE);
  if (w && (!best || w.t < best.t)) best = { t: w.t, hit: { kind: w.kind === 'object' ? 'object' : 'world' } };
  const t = best ? best.t : SHOOT_RANGE;
  const to = origin.clone().addScaledVector(dir, t);
  const from = origin.clone().add(new THREE.Vector3(0.2, -0.15, 0).applyQuaternion(camera.quaternion));
  net.current.fx.push({ kind: 'tracer', from: from.toArray(), to: to.toArray(), at: performance.now() });
  recoil.current = 1;
  sfx.shot(null, null, true);
  if (best?.hit.kind === 'object' || best?.hit.kind === 'decoy') sfx.penalty();
  socket.emit('game:action', { type: 'shoot', payload: { hit: best?.hit || { kind: 'none' }, from: from.toArray(), to: to.toArray() } });
  void m;
}

// ───────────────────────── Interface ─────────────────────────
function TouchControls({ input, role, alive, blind, stick, decoysLeft, hud, phase }) {
  const btn = (label, action, extra = '') => (
    <button type="button" className={`ph-btn ${extra}`} onPointerDown={(e) => { e.preventDefault(); input.push(action); }}>{label}</button>
  );
  if (phase === 'ROUND_END' || blind) return null;
  return (
    <>
      {stick.active && (
        <div className="pointer-events-none absolute" style={{ left: stick.ox - 60, top: stick.oy - 60 }}>
          <div className="w-[120px] h-[120px] rounded-full border-2 border-white/30 bg-white/5" />
          <div className="absolute w-12 h-12 rounded-full bg-white/40" style={{ left: 36 + (stick.dx || 0), top: 36 + (stick.dy || 0) }} />
        </div>
      )}
      {!stick.active && alive && <p className="pointer-events-none absolute left-6 bottom-6 text-[11px] text-white/50">Pose ton pouce ici<br />pour te déplacer</p>}
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        {alive ? (
          <>
            <div className="flex gap-2">
              {role === 'prop' && btn('🎵', 'taunt', '!w-12 !h-12')}
              {role === 'prop' && decoysLeft > 0 && btn(`👥${decoysLeft}`, 'decoy', '!w-12 !h-12 text-sm')}
              {role === 'prop' && btn(hud.locked ? '🔒' : '🔓', 'lock', '!w-12 !h-12')}
            </div>
            <div className="flex items-end gap-2">
              <button type="button" className="ph-btn !w-14 !h-14 text-xl" onPointerDown={(e) => { e.preventDefault(); input.jump = true; }} onPointerUp={() => { input.jump = false; }} onPointerLeave={() => { input.jump = false; }}>⤒</button>
              {role === 'hunter'
                ? btn('🔫', 'action', '!w-20 !h-20 text-3xl !bg-rose-500/80')
                : <button type="button" className={`ph-btn !w-20 !h-20 !text-xs font-bold ${hud.target ? '!bg-teal-400/90 text-slate-900' : 'opacity-60'}`} onPointerDown={(e) => { e.preventDefault(); input.push('action'); }}>Devenir</button>}
            </div>
          </>
        ) : btn('Suivant', 'next', '!w-20 !h-12 !text-sm')}
      </div>
    </>
  );
}

/** Téléphone tenu droit : on conseille de le tourner (le jeu se joue en paysage). */
function PortraitHint() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (!portrait) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-8">
      <span className="text-6xl" style={{ display: 'inline-block', transform: 'rotate(90deg)' }} aria-hidden="true">📱</span>
      <p className="font-display text-2xl text-slate-50">Tourne ton téléphone</p>
      <p className="text-sm text-slate-300">Prop Hunt se joue à l'horizontale. Astuce : le menu ☰ propose le plein écran.</p>
    </div>
  );
}

function RoundEnd({ p, person }) {
  const r = p.result;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
      <div className="rounded-3xl bg-slate-900/90 ring-1 ring-white/10 px-6 py-5 text-center max-w-md w-full">
        <p className="font-display text-3xl sm:text-4xl text-slate-50">{r.winner === 'hunters' ? '🔫 Les chasseurs gagnent' : '🫥 Les cachés gagnent'}</p>
        {r.survivors?.length > 0 && <p className="mt-2 text-slate-300">Survivants : {r.survivors.map((id) => person(id).pseudo).join(', ')} (+4)</p>}
        <p className="mt-3 text-xs text-slate-400">{p.round >= p.totalRounds ? 'Dernière manche terminée…' : 'Les rôles changent pour la manche suivante…'}</p>
      </div>
    </div>
  );
}

function Scoreboard({ p, playerId }) {
  const rows = [...p.players].sort((a, b) => b.score - a.score);
  return (
    <div className="absolute left-1/2 top-16 -translate-x-1/2 w-[min(92vw,420px)] rounded-2xl bg-slate-900/90 ring-1 ring-white/10 p-3">
      <p className="text-sm font-semibold text-slate-200 mb-2">Scores · manche {p.round}/{p.totalRounds}</p>
      <ul className="space-y-1">
        {rows.map((x) => (
          <li key={x.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${x.id === playerId ? 'bg-white/[0.07]' : ''} ${x.alive ? '' : 'opacity-50'}`}>
            <span className="w-5">{x.role === 'hunter' ? '🔫' : x.role === 'prop' ? '🫥' : '👀'}</span>
            <span className="flex-1 truncate text-slate-100">{x.pseudo}</span>
            <span className="tabular-nums text-slate-300">{x.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Menu({ isHost, onClose, input }) {
  const [vol, setVol] = useState(getVolume());
  const [sens, setSens] = useState(input.sensitivity);
  const full = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    else document.exitFullscreen?.();
  };
  return (
    <div className="absolute left-2 top-14 w-64 rounded-2xl bg-slate-900/95 ring-1 ring-white/10 p-3 space-y-3 text-sm">
      <label className="block text-slate-300">Volume
        <input type="range" min="0" max="1" step="0.05" value={vol} onChange={(e) => { setVol(Number(e.target.value)); setVolume(Number(e.target.value)); }} className="w-full accent-teal-300" />
      </label>
      <label className="block text-slate-300">Sensibilité
        <input type="range" min="0.3" max="2.5" step="0.1" value={sens} onChange={(e) => { setSens(Number(e.target.value)); input.setSensitivity(Number(e.target.value)); }} className="w-full accent-teal-300" />
      </label>
      <button type="button" className="btn btn-ghost w-full !py-2" onClick={full}>⛶ Plein écran</button>
      {isHost && <button type="button" className="btn btn-ghost w-full !py-2" onClick={() => { socket.emit('game:action', { type: 'skipRound', payload: {} }); onClose(); }}>Terminer la manche</button>}
      {isHost && <button type="button" className="btn btn-ghost w-full !py-2 text-rose-300" onClick={() => { socket.emit('game:stop'); onClose(); }}>Arrêter la partie</button>}
      <button type="button" className="btn btn-primary w-full !py-2" onClick={onClose}>Reprendre</button>
    </div>
  );
}
