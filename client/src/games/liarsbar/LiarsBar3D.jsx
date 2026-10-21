import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { imageUrl, isPhoto, photoUrl, getAvatar } from '../../data/avatars.js';
import { serverNow } from '../blindtest/audio.js';

/**
 * Vue 3D de Liar's Bar (chargée à la demande).
 * Même état de jeu que la 2D : on ne fait que le mettre en scène.
 *   - caméra derrière la chaise du joueur, table en bois sous une lampe
 *   - avatars des joueurs autour de la table, leurs cartes face cachée devant eux
 *   - ta main face visible devant toi (clique pour sélectionner)
 *   - pose, pile, retournement, revolver au centre qui vise le tireur
 */

const TABLE_R = 2.3;
const TABLE_Y = 0.9;
const SEAT_R = 3.05;
const HAND_R = 1.72;
const CARD_W = 0.36;
const CARD_H = 0.52;
const RANK_STYLE = {
  K: { label: 'ROI', icon: '♚', color: '#d4a017' },
  Q: { label: 'DAME', icon: '♛', color: '#c026d3' },
  A: { label: 'AS', icon: 'A', color: '#0284c7' },
  J: { label: 'JOKER', icon: '🃏', color: '#16a34a' },
  D: { label: 'DIABLE', icon: '😈', color: '#dc2626' },
};

const seatAngle = (i, n) => Math.PI / 2 + (i * 2 * Math.PI) / n;
const onCircle = (a, r, y) => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));

// ───────── Textures générées (pas de fichiers à charger) ─────────
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

const cardFront = (rank) => canvasTex(`front-${rank}`, 256, 370, (g, w, h) => {
  const s = RANK_STYLE[rank] || RANK_STYLE.K;
  g.fillStyle = '#f7ecd2'; roundRect(g, 0, 0, w, h, 22); g.fill();
  g.lineWidth = 10; g.strokeStyle = s.color; roundRect(g, 8, 8, w - 16, h - 16, 18); g.stroke();
  g.fillStyle = s.color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 150px serif'; g.fillText(s.icon, w / 2, h / 2 - 20);
  g.font = 'bold 40px sans-serif'; g.fillStyle = '#1c1917'; g.fillText(s.label, w / 2, h - 60);
});

const cardBack = () => canvasTex('back', 256, 370, (g, w, h) => {
  g.fillStyle = '#5b0f0f'; roundRect(g, 0, 0, w, h, 22); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 6;
  for (let i = -h; i < w + h; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
  g.lineWidth = 10; g.strokeStyle = '#e9c46a'; roundRect(g, 10, 10, w - 20, h - 20, 16); g.stroke();
  g.fillStyle = '#e9c46a'; g.font = 'bold 70px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♠', w / 2, h / 2);
});

const woodTex = () => canvasTex('wood', 1024, 1024, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 2);
  grd.addColorStop(0, '#8a5a2b'); grd.addColorStop(0.75, '#5e3818'); grd.addColorStop(1, '#3a210d');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(30,15,5,${0.08 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 3;
    g.beginPath(); const y = Math.random() * h; g.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x / 90 + i) * 12);
    g.stroke();
  }
});

const labelTex = (text, color = '#fde68a') => canvasTex(`label-${text}-${color}`, 512, 128, (g, w, h) => {
  g.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(g, 4, 20, w - 8, h - 40, 40); g.fill();
  g.fillStyle = color; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.length > 18 ? `${text.slice(0, 17)}…` : text, w / 2, h / 2 + 2);
});

const emojiTex = (id) => {
  const a = getAvatar(id);
  return canvasTex(`emoji-${id}`, 256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#475569'); grd.addColorStop(1, '#1e293b');
    g.fillStyle = grd; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.font = '150px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a?.emoji || '🙂', w / 2, h / 2 + 10);
  });
};

/** Texture de l'avatar (photo / image) découpée en rond ; emoji en secours. */
function useAvatarTexture(id) {
  const [tex, setTex] = useState(() => emojiTex(id));
  useEffect(() => {
    const url = isPhoto(id) ? photoUrl(id) : imageUrl(id);
    if (!url) { setTex(emojiTex(id)); return undefined; }
    const key = `avatar-${url}`;
    if (texCache.has(key)) { setTex(texCache.get(key)); return undefined; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const t = canvasTex(key, 256, 256, (g, w, h) => {
        g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.clip();
        const s = Math.max(w / img.width, h / img.height);
        g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
      });
      if (alive) setTex(t);
    };
    img.onerror = () => alive && setTex(emojiTex(id));
    img.src = url;
    return () => { alive = false; };
  }, [id]);
  return tex;
}

// ───────── Objets ─────────
/** Carte qui glisse en douceur vers sa position cible (pos, rot), avec un délai éventuel. */
function Card({ rank, faceUp, pos, rot = [0, 0, 0], from, delay = 0, onClick, selected, hoverable }) {
  const ref = useRef();
  const born = useRef(performance.now());
  const target = useMemo(() => new THREE.Vector3(...pos), [pos[0], pos[1], pos[2]]);
  const targetQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), [rot[0], rot[1], rot[2]]);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (ref.current && from) ref.current.position.set(...from);
    else if (ref.current) ref.current.position.copy(target);
    if (ref.current) ref.current.quaternion.copy(targetQ);
  }, []);
  useFrame((_, dt) => {
    const o = ref.current; if (!o) return;
    if (performance.now() - born.current < delay) return;
    const k = 1 - Math.exp(-dt * 7);
    const t = target.clone();
    if (selected) t.y += 0.12;
    else if (hover && hoverable) t.y += 0.05;
    o.position.lerp(t, k);
    o.quaternion.slerp(targetQ, k);
  });
  const front = rank ? cardFront(rank) : null;
  return (
    <group ref={ref}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={hoverable ? (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={hoverable ? () => { setHover(false); document.body.style.cursor = ''; } : undefined}>
      {/* face (vers le haut quand faceUp) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} castShadow>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial map={faceUp && front ? front : cardBack()} roughness={0.6} emissive={selected ? '#f59e0b' : '#000'} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
      {onClick && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[CARD_W * 1.15, CARD_H * 1.25]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial map={faceUp || !front ? cardBack() : front} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Lamp() {
  const light = useRef();
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, TABLE_Y, 0); return o; }, []);
  useFrame(({ clock }) => { if (light.current) light.current.intensity = 60 + Math.sin(clock.elapsedTime * 2.3) * 2.5 + Math.sin(clock.elapsedTime * 7.1) * 1.2; });
  return (
    <group>
      <primitive object={target} />
      <spotLight ref={light} position={[0, 4.2, 0]} angle={0.75} penumbra={0.55} intensity={60} distance={12} decay={1.6} color="#ffd8a0" castShadow target={target}
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} />
      <mesh position={[0, 4.15, 0]}>
        <coneGeometry args={[0.75, 0.55, 32, 1, true]} />
        <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.95, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#fff2cc" />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
    </group>
  );
}

function Table() {
  return (
    <group>
      <mesh position={[0, TABLE_Y - 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[TABLE_R, TABLE_R, 0.12, 64]} />
        <meshStandardMaterial attach="material-0" color="#3a210d" roughness={0.7} />
        <meshStandardMaterial attach="material-1" map={woodTex()} roughness={0.55} />
        <meshStandardMaterial attach="material-2" color="#2a1709" />
      </mesh>
      <mesh position={[0, TABLE_Y - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TABLE_R, 0.07, 12, 96]} />
        <meshStandardMaterial color="#24140a" roughness={0.5} />
      </mesh>
      <mesh position={[0, TABLE_Y / 2 - 0.1, 0]}>
        <cylinderGeometry args={[0.25, 0.5, TABLE_Y - 0.1, 24]} />
        <meshStandardMaterial color="#1a0f07" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#120b07" roughness={1} />
      </mesh>
    </group>
  );
}

function PlayerFigure({ seat, angle, current, shooting, fell }) {
  const tex = useAvatarTexture(seat.avatar);
  const group = useRef();
  const ring = useRef();
  const base = onCircle(angle, SEAT_R, 0);
  const label = labelTex(`${seat.pseudo} · ${seat.shots}/6`, seat.alive ? '#fde68a' : '#94a3b8');
  useFrame(({ clock }, dt) => {
    if (group.current) {
      const k = 1 - Math.exp(-dt * 4);
      const tilt = fell ? 1.35 : 0;
      group.current.rotation.x += (tilt - group.current.rotation.x) * k;
    }
    if (ring.current) ring.current.material.emissiveIntensity = current ? 1.2 + Math.sin(clock.elapsedTime * 5) * 0.5 : shooting ? 2 : 0;
  });
  return (
    <group position={base.toArray()} rotation={[0, Math.PI / 2 - angle, 0]}>
      {/* chaise */}
      <mesh position={[0, 0.55, 0.2]} castShadow><boxGeometry args={[0.8, 0.08, 0.7]} /><meshStandardMaterial color="#2b1a0e" /></mesh>
      <mesh position={[0, 1.1, 0.52]} castShadow><boxGeometry args={[0.8, 1.0, 0.08]} /><meshStandardMaterial color="#2b1a0e" /></mesh>
      {/* corps (silhouette) + visage (avatar) */}
      <group ref={group} position={[0, 0.6, 0.2]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.4, 6, 16]} />
          <meshStandardMaterial color={seat.alive ? '#7c4a2a' : '#3f3f46'} roughness={0.75} emissive="#2a160a" emissiveIntensity={0.4} />
        </mesh>
        {/* médaillon-visage devant la tête, toujours lisible */}
        <mesh position={[0, 1.32, -0.06]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.42, 48]} />
          <meshBasicMaterial color={seat.alive ? '#f59e0b' : '#52525b'} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.32, -0.075]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.38, 48]} />
          <meshBasicMaterial map={tex} transparent color={seat.alive ? '#ffffff' : '#6b7280'} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh ref={ring} position={[0, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.04, 8, 48]} />
        <meshStandardMaterial color="#f59e0b" emissive={shooting ? '#ef4444' : '#f59e0b'} emissiveIntensity={0} transparent opacity={current || shooting ? 1 : 0} />
      </mesh>
      <sprite position={[0, 2.35, 0.2]} scale={[1.3, 0.32, 1]}>
        <spriteMaterial map={label} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

/** Revolver en primitives : canon, barillet (qui tourne), crosse. */
function Revolver({ shot, aimAngle, revealed, shakeRef }) {
  const g = useRef();
  const drum = useRef();
  const flash = useRef();
  const spinStart = useRef(performance.now());
  useEffect(() => { spinStart.current = performance.now(); }, [shot?.startedAt]);
  useFrame((_, dt) => {
    if (!g.current) return;
    const k = 1 - Math.exp(-dt * 5);
    // vise le tireur
    const yaw = -aimAngle - Math.PI / 2;
    g.current.rotation.y += (yaw - g.current.rotation.y) * k;
    g.current.position.y += ((shot ? TABLE_Y + 0.55 : TABLE_Y + 0.08) - g.current.position.y) * k;
    if (drum.current) {
      if (!revealed && shot) {
        const t = (performance.now() - spinStart.current) / 1000;
        drum.current.rotation.y += dt * Math.max(1.2, 22 - t * 6);
      } else {
        const snap = Math.round(drum.current.rotation.y / (Math.PI / 3)) * (Math.PI / 3);
        drum.current.rotation.y += (snap - drum.current.rotation.y) * k;
      }
    }
    if (flash.current) flash.current.intensity *= Math.exp(-dt * 6);
  });
  useEffect(() => {
    if (revealed && shot?.fired && flash.current) { flash.current.intensity = 80; if (shakeRef) shakeRef.current = performance.now() + 700; }
  }, [revealed, shot?.fired]);
  const metal = <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.25} />;
  return (
    <group ref={g} position={[0, TABLE_Y + 0.08, 0]}>
      <group rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, 0.6, 16]} />{metal}</mesh>
        <group position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh ref={drum} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.2, 6]} />
            <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
        <mesh position={[0, 0.02, 0.12]} castShadow><boxGeometry args={[0.12, 0.16, 0.2]} />{metal}</mesh>
        <mesh position={[0, -0.16, 0.25]} rotation={[0.45, 0, 0]} castShadow><boxGeometry args={[0.1, 0.32, 0.13]} /><meshStandardMaterial color="#4a2c17" roughness={0.6} /></mesh>
        <pointLight ref={flash} position={[0, 0, -0.8]} color="#ffb347" intensity={0} distance={8} />
      </group>
    </group>
  );
}

/** Caméra derrière la chaise du joueur ; léger mouvement de tête + tremblement sur un BANG. */
function CameraRig({ myAngle, shakeRef, focusRef }) {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3(0, TABLE_Y, 0));
  useFrame(({ clock }, dt) => {
    const base = onCircle(myAngle, 5.0, 3.3);
    const side = new THREE.Vector3(-Math.sin(myAngle), 0, Math.cos(myAngle));
    const pos = base.clone().add(side.multiplyScalar(pointer.x * 0.5));
    pos.y += pointer.y * 0.25 + Math.sin(clock.elapsedTime * 0.6) * 0.03;
    const k = 1 - Math.exp(-dt * 3);
    camera.position.lerp(pos, k);
    const target = focusRef.current || new THREE.Vector3(0, TABLE_Y + 0.2, 0);
    look.current.lerp(target, k);
    camera.lookAt(look.current);
    if (shakeRef.current && performance.now() < shakeRef.current) {
      camera.position.x += (Math.random() - 0.5) * 0.12;
      camera.position.y += (Math.random() - 0.5) * 0.12;
    }
  });
  return null;
}

function Scene({ p, playerId, ordered, myHand, selected, onToggle, canSelect, nowFn }) {
  const shakeRef = useRef(0);
  const focusRef = useRef(null);
  const n = ordered.length || 1;
  const angleOf = (id) => seatAngle(Math.max(0, ordered.findIndex((s) => s.id === id)), n);
  const handSpot = (id, i, count, r = HAND_R, y = TABLE_Y + 0.01) => {
    const a = angleOf(id);
    const center = onCircle(a, r, y);
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const off = (i - (count - 1) / 2) * 0.24;
    return { pos: center.add(side.multiplyScalar(off)).toArray(), rot: [0, -a + Math.PI / 2 + (i - (count - 1) / 2) * 0.08, 0] };
  };
  const shot = p.phase === 'ROULETTE' ? p.shot : null;
  const revealed = !!shot && (shot.revealed || nowFn() >= shot.revealAt);
  const fallen = new Set(ordered.filter((s) => !s.alive).map((s) => s.id));
  if (revealed && shot?.fired) fallen.add(shot.playerId);
  focusRef.current = p.phase === 'REVEAL' ? new THREE.Vector3(0, TABLE_Y + 0.2, 0) : null;
  const myAngle = seatAngle(0, n);

  return (
    <>
      <color attach="background" args={['#070403']} />
      <fog attach="fog" args={['#070403', 7, 15]} />
      <ambientLight intensity={0.18} color="#ffcf9e" />
      <hemisphereLight args={['#4b3621', '#000000', 0.25]} />
      <CameraRig myAngle={myAngle} shakeRef={shakeRef} focusRef={focusRef} />
      <Lamp />
      <Table />

      {ordered.map((s, i) => (s.id === playerId ? null : (
        <PlayerFigure key={s.id} seat={s} angle={seatAngle(i, n)} current={p.phase === 'TURN' && p.currentId === s.id}
          shooting={shot?.playerId === s.id} fell={fallen.has(s.id)} />
      )))}

      {/* cartes des autres joueurs (face cachée) — distribuées depuis le centre */}
      {ordered.filter((s) => s.id !== playerId && s.alive).flatMap((s) => Array.from({ length: s.cards }).map((_, i) => {
        const h = handSpot(s.id, i, s.cards);
        return <Card key={`${p.round}-${s.id}-${i}`} pos={h.pos} rot={h.rot} from={[0, TABLE_Y + 0.4, 0]} delay={p.phase === 'DEAL' ? i * 140 + ordered.indexOf(s) * 50 : 0} />;
      }))}

      {/* ma main, face visible, cliquable */}
      {myHand.map((c, i) => {
        const h = handSpot(playerId, i, myHand.length, HAND_R + 0.05, TABLE_Y + 0.03);
        return <Card key={c.id} rank={c.rank} faceUp pos={h.pos} rot={[0, h.rot[1], 0]} from={p.phase === 'DEAL' ? [0, TABLE_Y + 0.4, 0] : undefined} delay={p.phase === 'DEAL' ? i * 140 : 0}
          selected={selected.includes(c.id)} hoverable={canSelect} onClick={canSelect ? () => onToggle(c.id) : undefined} />;
      })}

      {/* pile au centre */}
      {Array.from({ length: Math.min(p.pile || 0, 18) }).map((_, i) => (
        <Card key={`pile-${p.round}-${i}`} pos={[Math.sin(i * 2.3) * 0.12, TABLE_Y + 0.005 + i * 0.004, Math.cos(i * 1.7) * 0.12]} rot={[0, i * 0.9, 0]} />
      ))}

      {/* dernière pose : glisse du joueur vers le centre */}
      {p.phase === 'TURN' && p.lastPlay && Array.from({ length: p.lastPlay.count }).map((_, i) => {
        const h = handSpot(p.lastPlay.by, 1, 3);
        return <Card key={`lp-${p.lastPlay.at}-${i}`} from={h.pos} pos={[(i - (p.lastPlay.count - 1) / 2) * 0.3, TABLE_Y + 0.09 + i * 0.004, 0.55]} rot={[0, (i - 1) * 0.15, 0]} />;
      })}

      {/* révélation : les cartes se retournent au-dessus de la table */}
      {(p.phase === 'REVEAL' || p.phase === 'ROULETTE') && p.reveal && p.reveal.cards.map((c, i, arr) => (
        <Card key={`rv-${c.id}`} rank={c.rank} faceUp={p.phase === 'ROULETTE' || nowFn() - (p.phaseEndsAt - 3800) > 500 + i * 250}
          from={[(i - (arr.length - 1) / 2) * 0.3, TABLE_Y + 0.1, 0.55]}
          pos={[(i - (arr.length - 1) / 2) * 0.46, TABLE_Y + (p.phase === 'REVEAL' ? 0.75 : 0.02), p.phase === 'REVEAL' ? 0.6 : 0.9]}
          rot={p.phase === 'REVEAL' ? [1.25, 0, 0] : [0, 0, 0]} />
      ))}

      <Revolver shot={shot} aimAngle={shot ? angleOf(shot.playerId) : myAngle} revealed={revealed} shakeRef={shakeRef} />
    </>
  );
}

export default function LiarsBar3D({ p, playerId, ordered, myHand, selected, onToggle, canSelect }) {
  // re-rendu régulier pour les moments liés à l'horloge (retournement, résultat du tir)
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 150); return () => clearInterval(id); }, []);
  return (
    <div className="lb-3d">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 52, position: [0, 3, 5], near: 0.1, far: 40 }} gl={{ antialias: true }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15; }}>
        <Scene p={p} playerId={playerId} ordered={ordered} myHand={myHand} selected={selected} onToggle={onToggle} canSelect={canSelect} nowFn={serverNow} />
      </Canvas>
    </div>
  );
}
