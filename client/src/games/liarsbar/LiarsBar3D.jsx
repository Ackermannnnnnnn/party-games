import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { imageUrl, imageView, isPhoto, photoUrl, getAvatar } from '../../data/avatars.js';
import { serverNow } from '../blindtest/audio.js';

/**
 * Vue 3D de Liar's Bar (chargée à la demande), à la première personne comme le jeu original :
 *   - tu es assis à la table, tes cartes en éventail en bas de l'écran (clique pour choisir)
 *   - les autres joueurs en face, cartes en main, dans une salle de bar (comptoir, bouteilles, lampe)
 *   - les cartes posées glissent au centre, se relèvent et se retournent quand on crie « Menteur ! »
 *   - roulette russe : le revolver monte à la tempe du tireur, le barillet tourne… clic ou BANG
 */

const TOP = 0.86;          // hauteur du plateau
const TABLE_R = 1.55;
const SEAT_R = 2.2;
const CARD_W = 0.3;
const CARD_H = 0.43;
const EYE = new THREE.Vector3(0, 1.5, 2.15);
const JACKETS = ['#7f1d1d', '#1e3a8a', '#14532d', '#581c87', '#78350f', '#155e75'];
const RANK_STYLE = {
  K: { label: 'ROI', corner: 'R', icon: '♚', color: '#b7791f' },
  Q: { label: 'DAME', corner: 'D', icon: '♛', color: '#a21caf' },
  A: { label: 'AS', corner: 'A', icon: 'A', color: '#0369a1' },
  J: { label: 'JOKER', corner: '★', icon: '🃏', color: '#15803d' },
  D: { label: 'DIABLE', corner: '☠', icon: '😈', color: '#b91c1c' },
};

/** Toi au plus près de la caméra (angle π/2) ; les autres répartis en arc en face, pour qu'on les voie tous. */
const seatAngle = (i, n) => {
  if (i === 0 || n < 2) return Math.PI / 2;
  if (n === 2) return -Math.PI / 2;
  const span = Math.min(0.95, 0.32 * (n - 2)) * Math.PI;
  return -Math.PI / 2 + ((i - 1) / (n - 2) - 0.5) * span;
};
const onCircle = (a, r, y) => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
const headOf = (a) => onCircle(a, SEAT_R + 0.02, 1.47);
const damp = (dt, k) => 1 - Math.exp(-dt * k);

// ───────── Textures générées (aucun fichier à charger) ─────────
const texCache = new Map();
function canvasTex(key, w, h, draw, { repeat } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  texCache.set(key, t);
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Carte face visible : papier crème usé, index dans les coins, grand symbole. */
const cardFront = (rank) => canvasTex(`front-${rank}`, 300, 430, (g, w, h) => {
  const s = RANK_STYLE[rank] || RANK_STYLE.K;
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#fbf3df'); grd.addColorStop(1, '#eadcb8');
  g.fillStyle = grd; roundRect(g, 0, 0, w, h, 26); g.fill();
  g.lineWidth = 5; g.strokeStyle = 'rgba(60,40,10,0.35)'; roundRect(g, 14, 14, w - 28, h - 28, 16); g.stroke();
  g.fillStyle = s.color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 56px Georgia, serif'; g.fillText(s.corner, 42, 52);
  g.save(); g.translate(w - 42, h - 52); g.rotate(Math.PI); g.fillText(s.corner, 0, 0); g.restore();
  g.font = `bold ${rank === 'A' ? 190 : 170}px Georgia, serif`; g.fillText(s.icon, w / 2, h / 2 - 6);
  g.font = 'bold 34px Georgia, serif'; g.fillStyle = '#3b2a12'; g.fillText(s.label, w / 2, h - 70);
});

/** Dos de carte : bordeaux, motif losangé, liseré doré. */
const cardBack = () => canvasTex('back', 300, 430, (g, w, h) => {
  g.fillStyle = '#6b1414'; roundRect(g, 0, 0, w, h, 26); g.fill();
  g.save(); roundRect(g, 18, 18, w - 36, h - 36, 14); g.clip();
  g.strokeStyle = 'rgba(255,215,140,0.16)'; g.lineWidth = 3;
  for (let i = -h; i < w + h; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
  g.restore();
  g.lineWidth = 8; g.strokeStyle = '#d6a84a'; roundRect(g, 14, 14, w - 28, h - 28, 16); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, 54, 0, Math.PI * 2); g.fillStyle = '#4a0d0d'; g.fill(); g.lineWidth = 5; g.stroke();
  g.fillStyle = '#e9c46a'; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♠', w / 2, h / 2 + 2);
});

/** Plateau : bois usé, cernes, taches de verres. */
const tableTex = () => canvasTex('table', 1024, 1024, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2);
  grd.addColorStop(0, '#9a6434'); grd.addColorStop(0.7, '#6f4220'); grd.addColorStop(1, '#4a2a12');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) {
    g.strokeStyle = `rgba(40,20,6,${0.05 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 2.5;
    g.beginPath(); const y = Math.random() * h; g.moveTo(0, y);
    for (let x = 0; x <= w; x += 48) g.lineTo(x, y + Math.sin(x / 110 + i) * 10);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) { // cernes de verres
    g.strokeStyle = 'rgba(30,14,4,0.22)'; g.lineWidth = 6;
    g.beginPath(); g.arc(150 + Math.random() * 720, 150 + Math.random() * 720, 36 + Math.random() * 10, 0, Math.PI * 2); g.stroke();
  }
});

const floorTex = () => canvasTex('floor', 512, 512, (g, w, h) => {
  g.fillStyle = '#3a2414'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) {
    const y = (r * h) / 8; const off = (r % 2) * 128;
    for (let x = -off; x < w; x += 256) {
      g.fillStyle = `hsl(25, 40%, ${14 + Math.random() * 8}%)`; g.fillRect(x + 2, y + 2, 252, h / 8 - 4);
    }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, w, 2);
  }
}, { repeat: [10, 10] });

const wallTex = () => canvasTex('wall', 512, 512, (g, w, h) => {
  g.fillStyle = '#2b1a10'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 64) { // lambris
    g.fillStyle = `hsl(24, 35%, ${12 + Math.random() * 5}%)`; g.fillRect(x + 3, h * 0.45, 58, h * 0.55);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, h * 0.45, 3, h * 0.55);
  }
  g.fillStyle = '#3d2a1a'; g.fillRect(0, 0, w, h * 0.45); // papier peint
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,80,40,0.12)'; g.fillRect(Math.random() * w, Math.random() * h * 0.45, 2, 20); }
  g.fillStyle = '#1b0f08'; g.fillRect(0, h * 0.43, w, 10);
}, { repeat: [8, 1] });

const labelTex = (text, color = '#fde68a') => canvasTex(`label-${text}-${color}`, 512, 128, (g, w, h) => {
  g.fillStyle = 'rgba(10,6,3,0.72)'; roundRect(g, 8, 22, w - 16, h - 44, 40); g.fill();
  g.fillStyle = color; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.length > 18 ? `${text.slice(0, 17)}…` : text, w / 2, h / 2 + 2);
});

const emojiTex = (id) => {
  const a = getAvatar(id);
  return canvasTex(`emoji-${id}`, 256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#57534e'); grd.addColorStop(1, '#292524');
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
    const view = isPhoto(id) ? null : imageView(id);
    const key = `avatar-${url}-${JSON.stringify(view)}`;
    if (texCache.has(key)) { setTex(texCache.get(key)); return undefined; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const t = canvasTex(key, 256, 256, (g, w, h) => {
        g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.clip();
        if (view) {
          const side = Math.min(img.width, img.height) / view.zoom;
          g.drawImage(img, (img.width - side) * view.x, (img.height - side) * view.y, side, side, 0, 0, w, h);
        } else {
          const s = Math.max(w / img.width, h / img.height);
          g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
        }
      });
      if (alive) setTex(t);
    };
    img.onerror = () => alive && setTex(emojiTex(id));
    img.src = url;
    return () => { alive = false; };
  }, [id]);
  return tex;
}

// ───────── Cartes ─────────
/** Une carte (recto + verso) qui rejoint en douceur sa position / orientation cible. */
function Card({ rank, faceUp, pos, rot = [0, 0, 0], from, delay = 0, scale = 1, onClick, onHover, glow }) {
  const ref = useRef();
  const born = useRef(performance.now());
  const target = useMemo(() => new THREE.Vector3(...pos), [pos[0], pos[1], pos[2]]);
  const targetQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')), [rot[0], rot[1], rot[2]]);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.position.copy(from ? new THREE.Vector3(...from) : target);
    ref.current.quaternion.copy(targetQ);
    ref.current.scale.setScalar(scale);
  }, []);
  useFrame((_, dt) => {
    const o = ref.current; if (!o) return;
    if (performance.now() - born.current < delay) return;
    const k = damp(dt, 9);
    o.position.lerp(target, k);
    o.quaternion.slerp(targetQ, k);
    o.scale.setScalar(o.scale.x + (scale - o.scale.x) * k);
  });
  const front = rank ? cardFront(rank) : null;
  // La carte est un plan : recto vers +z, verso vers -z
  return (
    <group ref={ref}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={onClick ? (e) => { e.stopPropagation(); onHover?.(true); document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={onClick ? () => { onHover?.(false); document.body.style.cursor = ''; } : undefined}>
      <mesh position={[0, 0, 0.0015]} castShadow>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial map={faceUp && front ? front : cardBack()} roughness={0.75} emissive={glow ? '#f59e0b' : '#000'} emissiveIntensity={glow ? 0.35 : 0} />
      </mesh>
      <mesh position={[0, 0, -0.0015]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial map={faceUp || !front ? cardBack() : front} roughness={0.75} />
      </mesh>
    </group>
  );
}

/** Ma main : éventail tenu devant les yeux, qui suit la caméra. */
function MyHand({ hand, selected, onToggle, canSelect, dealing }) {
  const group = useRef();
  const { camera } = useThree();
  const [hover, setHover] = useState(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
  });
  const n = hand.length; const mid = (n - 1) / 2;
  return (
    <group ref={group}>
      <group position={[0, -0.235, -0.62]} rotation={[-0.3, 0, 0]} scale={0.31}>
        {hand.map((c, i) => {
          const d = i - mid;
          const sel = selected.includes(c.id);
          return (
            <Card key={c.id} rank={c.rank} faceUp
              pos={[d * 0.2, -Math.abs(d) * Math.abs(d) * 0.012 + (sel ? 0.16 : hover === c.id && canSelect ? 0.05 : 0), i * 0.004 + (sel ? 0.03 : 0)]}
              rot={[0, 0, -d * 0.14]} from={dealing ? [0, -0.8, 0] : undefined} delay={dealing ? i * 130 : 0}
              glow={sel} onClick={canSelect ? () => onToggle(c.id) : undefined}
              onHover={(on) => setHover(on ? c.id : null)} />
          );
        })}
      </group>
    </group>
  );
}

// ───────── Personnages ─────────
function Opponent({ seat, index, angle, current, shooting, fell, dealing, round }) {
  const tex = useAvatarTexture(seat.avatar);
  const body = useRef();
  const ring = useRef();
  const base = onCircle(angle, SEAT_R, 0);
  const label = labelTex(`${seat.pseudo} · ${seat.shots}/6`, seat.alive ? '#fde68a' : '#a8a29e');
  const jacket = JACKETS[index % JACKETS.length];
  const fallSide = index % 2 ? 1 : -1;
  useFrame(({ clock }, dt) => {
    if (body.current) {
      const k = damp(dt, 3.5);
      const tz = fell ? 1.25 * fallSide : 0;
      const tx = fell ? 0.35 : Math.sin(clock.elapsedTime * 1.3 + index) * 0.015; // respiration
      body.current.rotation.z += (tz - body.current.rotation.z) * k;
      body.current.rotation.x += (tx - body.current.rotation.x) * k;
    }
    if (ring.current) {
      ring.current.material.opacity = current || shooting ? 0.9 : 0;
      ring.current.material.emissiveIntensity = shooting ? 2.2 : 1 + Math.sin(clock.elapsedTime * 5) * 0.5;
    }
  });
  const n = seat.alive ? seat.cards : 0; const mid = (n - 1) / 2;
  return (
    <group position={base.toArray()} rotation={[0, Math.PI / 2 - angle, 0]}>
      {/* chaise */}
      <mesh position={[0, 0.48, 0.12]} castShadow receiveShadow><boxGeometry args={[0.62, 0.07, 0.56]} /><meshStandardMaterial color="#3b2414" roughness={0.8} /></mesh>
      <mesh position={[0, 1.0, 0.38]} castShadow><boxGeometry args={[0.62, 0.95, 0.07]} /><meshStandardMaterial color="#3b2414" roughness={0.8} /></mesh>
      {[[-0.27, 0.24, -0.12], [0.27, 0.24, -0.12], [-0.27, 0.24, 0.36], [0.27, 0.24, 0.36]].map((p, i) => (
        <mesh key={i} position={p}><cylinderGeometry args={[0.025, 0.025, 0.48, 6]} /><meshStandardMaterial color="#2a190d" /></mesh>
      ))}
      {/* corps qui peut s'effondrer */}
      <group ref={body} position={[0, 0.55, 0.1]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.36, 6, 16]} />
          <meshStandardMaterial color={seat.alive ? jacket : '#3f3f46'} roughness={0.85} />
        </mesh>
        {/* bras posés sur la table */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.22, 0.42, -0.25]} rotation={[1.2, 0, s * 0.25]} castShadow>
            <capsuleGeometry args={[0.07, 0.38, 4, 8]} />
            <meshStandardMaterial color={seat.alive ? jacket : '#3f3f46'} roughness={0.85} />
          </mesh>
        ))}
        {/* tête : portrait encadré */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <sphereGeometry args={[0.21, 24, 16]} />
          <meshStandardMaterial color="#2a1d14" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.92, -0.2]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.3, 48]} />
          <meshBasicMaterial color={current ? '#f59e0b' : seat.alive ? '#d6a84a' : '#57534e'} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.92, -0.215]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.27, 48]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} color={seat.alive ? '#ffffff' : '#78716c'} side={THREE.DoubleSide} />
        </mesh>
        {/* cartes en main, dos vers la table */}
        {Array.from({ length: n }).map((_, i) => {
          const d = i - mid;
          return (
            <Card key={`${round}-${i}`} pos={[d * 0.07, 0.62 - Math.abs(d) * 0.01, -0.42 - i * 0.003]} rot={[-0.35, 0, d * 0.18]}
              scale={0.62} from={dealing ? [0, 0.4, -1.6] : undefined} delay={dealing ? i * 130 + index * 60 : 0} />
          );
        })}
      </group>
      <mesh ref={ring} position={[0, 0.015, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.03, 8, 48]} />
        <meshStandardMaterial color="#f59e0b" emissive={shooting ? '#ef4444' : '#f59e0b'} emissiveIntensity={1} transparent opacity={0} />
      </mesh>
      <sprite position={[0, 2.12, 0.1]} scale={[1.1, 0.28, 1]}>
        <spriteMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

// ───────── Revolver ─────────
/**
 * Revolver (canon le long de +z). Posé à plat au centre de la table et tourné vers le joueur dont c'est le tour ;
 * pendant la roulette il monte à la tempe du tireur (ou devant tes yeux si c'est toi).
 */
function Revolver({ mode, shot, revealed, aimAngle, shakeRef }) {
  const g = useRef();
  const drum = useRef();
  const flash = useRef();
  const flashMesh = useRef();
  const { camera } = useThree();
  const spinStart = useRef(performance.now());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => { spinStart.current = performance.now(); }, [shot?.startedAt]);
  useEffect(() => {
    if (revealed && shot?.fired) {
      if (flash.current) flash.current.intensity = 60;
      if (flashMesh.current) flashMesh.current.scale.setScalar(1);
      if (shakeRef) shakeRef.current = performance.now() + 900;
    }
  }, [revealed, shot?.fired]);
  useFrame((_, dt) => {
    if (!g.current) return;
    // position / orientation visées
    if (mode.type === 'me') {
      // canon collé contre ta tempe droite : on le voit de profil sur le bord droit, pointé vers toi
      dummy.position.copy(camera.localToWorld(new THREE.Vector3(0.17, -0.1, -0.3)));
      dummy.lookAt(camera.localToWorld(new THREE.Vector3(0.12, 0.12, -0.05)));
    } else if (mode.type === 'head') {
      const head = mode.head;
      const side = new THREE.Vector3(-Math.sin(mode.angle), 0, Math.cos(mode.angle));
      const toCenter = new THREE.Vector3(-Math.cos(mode.angle), 0, -Math.sin(mode.angle));
      dummy.position.copy(head).add(side.multiplyScalar(0.5)).add(toCenter.multiplyScalar(0.12)).add(new THREE.Vector3(0, 0.05, 0));
      dummy.lookAt(head);
    } else {
      dummy.position.set(0, TOP + 0.04, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.rotateY(-aimAngle + Math.PI / 2); // canon vers le joueur dont c'est le tour
      dummy.rotateZ(Math.PI / 2); // couché sur le flanc
    }
    const k = damp(dt, mode.type === 'table' ? 4 : 6);
    g.current.position.lerp(dummy.position, k);
    g.current.quaternion.slerp(dummy.quaternion, k);
    const sc = mode.type === 'me' ? 0.5 : mode.type === 'head' ? 2 : 1.15;
    g.current.scale.setScalar(g.current.scale.x + (sc - g.current.scale.x) * k);
    if (drum.current) {
      if (shot && !revealed) {
        const t = (performance.now() - spinStart.current) / 1000;
        drum.current.rotation.y += dt * Math.max(1, 26 - t * 8);
      } else {
        const snap = Math.round(drum.current.rotation.y / (Math.PI / 3)) * (Math.PI / 3);
        drum.current.rotation.y += (snap - drum.current.rotation.y) * k;
      }
    }
    if (flash.current) flash.current.intensity *= Math.exp(-dt * 7);
    if (flashMesh.current) flashMesh.current.scale.multiplyScalar(Math.exp(-dt * 14));
  });
  // peu métallique : sans reflets d'environnement, un métal pur paraîtrait noir
  const steel = <meshStandardMaterial color="#b8bcc4" metalness={0.45} roughness={0.3} emissive="#2a2d33" emissiveIntensity={0.4} />;
  const dark = <meshStandardMaterial color="#5b6068" metalness={0.45} roughness={0.35} emissive="#15171a" emissiveIntensity={0.4} />;
  return (
    <group ref={g} position={[0, TOP + 0.04, 0]} scale={1.15}>
      {/* canon */}
      <mesh position={[0, 0.035, 0.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.024, 0.32, 16]} />{steel}</mesh>
      <mesh position={[0, 0.062, 0.2]}><boxGeometry args={[0.012, 0.012, 0.3]} />{dark}</mesh>
      {/* barillet à 6 chambres */}
      <group position={[0, 0.02, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={drum}>
          <mesh><cylinderGeometry args={[0.058, 0.058, 0.11, 6]} />{dark}</mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 3) * 0.034, 0.056, Math.sin((i * Math.PI) / 3) * 0.034]}>
              <cylinderGeometry args={[0.011, 0.011, 0.004, 10]} /><meshBasicMaterial color="#050505" />
            </mesh>
          ))}
        </group>
      </group>
      {/* carcasse, chien, pontet, crosse */}
      <mesh position={[0, 0.02, -0.08]}><boxGeometry args={[0.045, 0.1, 0.09]} />{steel}</mesh>
      <mesh position={[0, 0.08, -0.12]} rotation={[0.6, 0, 0]}><boxGeometry args={[0.014, 0.04, 0.02]} />{dark}</mesh>
      <mesh position={[0, -0.05, -0.04]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.03, 0.006, 6, 16, Math.PI]} />{dark}</mesh>
      <mesh position={[0, -0.08, -0.16]} rotation={[-0.45, 0, 0]}><boxGeometry args={[0.042, 0.17, 0.065]} /><meshStandardMaterial color="#5a3015" roughness={0.55} /></mesh>
      {/* éclair de la détonation */}
      <mesh ref={flashMesh} position={[0, 0.035, 0.42]} scale={0}>
        <sphereGeometry args={[0.09, 12, 8]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.05, 0.45]} color="#ffb347" intensity={0} distance={7} decay={1.5} />
    </group>
  );
}

// ───────── Décor ─────────
function Lamp() {
  const light = useRef();
  const bulb = useRef();
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, TOP, 0); return o; }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 2.1) * 0.03 + (Math.sin(t * 13.7) > 0.985 ? -0.25 : 0); // grésillement de temps en temps
    if (light.current) light.current.intensity = 34 * f;
    if (bulb.current) bulb.current.material.color.setScalar(f);
  });
  return (
    <group>
      <primitive object={target} />
      <spotLight ref={light} position={[0, 2.75, 0]} angle={0.95} penumbra={0.6} intensity={34} distance={9} decay={1.4} color="#ffcf8a" castShadow target={target}
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} />
      <mesh position={[0, 2.82, 0]}>
        <coneGeometry args={[0.42, 0.32, 32, 1, true]} />
        <meshStandardMaterial color="#1f3a2a" side={THREE.DoubleSide} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh ref={bulb} position={[0, 2.7, 0]}><sphereGeometry args={[0.08, 16, 12]} /><meshBasicMaterial color="#fff1c9" toneMapped={false} /></mesh>
      <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[0.008, 0.008, 1.6, 6]} /><meshBasicMaterial color="#111" /></mesh>
    </group>
  );
}

/** Poussière qui flotte dans le faisceau de la lampe. */
function Dust() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 260; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(Math.random()) * 1.3; const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = TOP + 0.1 + Math.random() * 1.8; pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
  }, []);
  useFrame((_, dt) => {
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * 0.03; if (y > TOP + 1.9) y = TOP + 0.1;
      a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(y * 3 + i) * dt * 0.01);
    }
    a.needsUpdate = true;
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.012} color="#ffd9a0" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Room() {
  const bottles = useMemo(() => {
    const out = []; const colors = ['#3f6212', '#7c2d12', '#a16207', '#14532d', '#1e3a8a', '#713f12', '#e5e7eb'];
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let i = 0; i < 16; i++) {
        if ((i * 7 + shelf * 3) % 5 === 0) continue;
        out.push({ x: -2.6 + i * 0.34 + (((i * 13 + shelf) % 7) - 3) * 0.012, y: 1.25 + shelf * 0.55, h: 0.22 + ((i * 5 + shelf * 11) % 7) * 0.02, c: colors[(i + shelf * 3) % colors.length] });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {/* sol et murs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[9, 48]} /><meshStandardMaterial map={floorTex()} roughness={0.9} /></mesh>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[6.2, 6.2, 4.4, 40, 1, true]} /><meshStandardMaterial map={wallTex()} side={THREE.BackSide} roughness={0.95} /></mesh>
      <mesh position={[0, 4.4, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[6.2, 40]} /><meshStandardMaterial color="#120b07" side={THREE.DoubleSide} /></mesh>
      {/* comptoir et étagères derrière les adversaires */}
      <group position={[0, 0, -5.2]}>
        <mesh position={[0, 0.55, 0.9]} castShadow receiveShadow><boxGeometry args={[6.4, 1.1, 0.7]} /><meshStandardMaterial color="#3b2212" roughness={0.6} /></mesh>
        <mesh position={[0, 1.12, 0.9]}><boxGeometry args={[6.6, 0.06, 0.82]} /><meshStandardMaterial color="#5c3418" roughness={0.4} /></mesh>
        {[0, 1, 2].map((s) => <mesh key={s} position={[0, 1.13 + s * 0.55, 0.15]}><boxGeometry args={[6, 0.04, 0.3]} /><meshStandardMaterial color="#4a2b15" /></mesh>)}
        {bottles.map((b, i) => (
          <mesh key={i} position={[b.x, b.y + b.h / 2, 0.15]}>
            <cylinderGeometry args={[0.045, 0.05, b.h, 10]} />
            <meshStandardMaterial color={b.c} roughness={0.15} metalness={0.1} transparent opacity={0.85} emissive={b.c} emissiveIntensity={0.25} />
          </mesh>
        ))}
        <pointLight position={[0, 2.3, 0.9]} color="#ff9d4d" intensity={6} distance={5} decay={1.6} />
      </group>
      {/* appliques murales */}
      {[[-4.6, 2.4, -3.2], [4.6, 2.4, -3.2], [-5.4, 2.4, 1.8], [5.4, 2.4, 1.8]].map((p, i) => (
        <group key={i} position={p}>
          <mesh><sphereGeometry args={[0.09, 12, 8]} /><meshBasicMaterial color="#ffc27a" toneMapped={false} /></mesh>
          <pointLight color="#ff9b45" intensity={3.2} distance={4.5} decay={1.6} />
        </group>
      ))}
    </group>
  );
}

function Table() {
  return (
    <group>
      <mesh position={[0, TOP - 0.05, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[TABLE_R, TABLE_R, 0.1, 64]} />
        <meshStandardMaterial attach="material-0" color="#3e2410" roughness={0.6} />
        <meshStandardMaterial attach="material-1" map={tableTex()} roughness={0.55} />
        <meshStandardMaterial attach="material-2" color="#2a1709" />
      </mesh>
      <mesh position={[0, TOP - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TABLE_R, 0.06, 12, 96]} /><meshStandardMaterial color="#2c180a" roughness={0.45} />
      </mesh>
      <mesh position={[0, TOP / 2 - 0.05, 0]}><cylinderGeometry args={[0.16, 0.4, TOP - 0.1, 20]} /><meshStandardMaterial color="#1f1209" /></mesh>
      {/* verres posés sur la table */}
      {[[-0.95, 0.75], [1.05, 0.55], [0.6, -1.05]].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP + 0.06, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.12, 14]} />
          <meshStandardMaterial color="#d97706" transparent opacity={0.55} roughness={0.05} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Caméra : tes yeux, assis à la table. Regarde le centre, le tireur, ou baisse les yeux sur ta main. */
function CameraRig({ focusRef, shakeRef, zoom, selfShot }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, TOP + 0.2, -0.3));
  const roll = useRef(0);
  // écran en portrait : champ plus large pour garder tout le monde visible
  const aspect = size.width / size.height;
  const baseFov = aspect < 0.8 ? 74 : aspect < 1.2 ? 64 : 55;
  useFrame(({ clock }, dt) => {
    const k = damp(dt, 3);
    // zoom dramatique sur le tireur pendant la roulette
    const fov = baseFov * zoom;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * damp(dt, 2.2); camera.updateProjectionMatrix(); }
    const t = clock.elapsedTime;
    const pos = EYE.clone();
    let target = focusRef.current || new THREE.Vector3(pointer.x * 0.5, TOP + 0.25, -0.3);
    let rollTo = 0; let kk = k;
    if (selfShot && !selfShot.revealed) {
      // le canon contre ta tempe : tête légèrement penchée, regard qui baisse, main qui tremble
      rollTo = 0.13;
      pos.add(new THREE.Vector3(-0.04, -0.04, 0));
      target = new THREE.Vector3(-0.15, TOP + 0.05, 0.1);
      pos.x += Math.sin(t * 23) * 0.0025; pos.y += Math.sin(t * 31) * 0.002;
    } else if (selfShot && selfShot.fired) {
      // BANG : tu t'effondres sur la table
      rollTo = 0.75; kk = damp(dt, 2.2);
      pos.add(new THREE.Vector3(-0.3, -0.5, -0.4));
      target = new THREE.Vector3(-0.9, TOP, 0.2);
    } else {
      pos.x += pointer.x * 0.18;
      pos.y += pointer.y * 0.08 + Math.sin(t * 0.7) * 0.01;
    }
    camera.position.lerp(pos, kk);
    look.current.lerp(target, kk);
    camera.lookAt(look.current);
    roll.current += (rollTo - roll.current) * kk;
    camera.rotateZ(roll.current);
    if (shakeRef.current && performance.now() < shakeRef.current) {
      const s = ((shakeRef.current - performance.now()) / 900) * 0.08;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      camera.rotation.z += (Math.random() - 0.5) * s;
    }
  });
  return null;
}

function Scene({ p, playerId, ordered, myHand, selected, onToggle, canSelect, nowFn }) {
  const shakeRef = useRef(0);
  const focusRef = useRef(null);
  const n = ordered.length || 1;
  const idx = (id) => Math.max(0, ordered.findIndex((s) => s.id === id));
  const angleOf = (id) => seatAngle(idx(id), n);
  const shot = p.phase === 'ROULETTE' ? p.shot : null;
  const revealed = !!shot && (shot.revealed || nowFn() >= shot.revealAt);
  const fallen = new Set(ordered.filter((s) => !s.alive).map((s) => s.id));
  if (revealed && shot?.fired) fallen.add(shot.playerId);
  const dealing = p.phase === 'DEAL';
  const revealStart = p.phaseEndsAt - 3800;

  // Où regarder
  if (p.phase === 'REVEAL') focusRef.current = new THREE.Vector3(0, TOP + 0.3, 0.3);
  else if (shot && shot.playerId !== playerId) focusRef.current = headOf(angleOf(shot.playerId)).add(new THREE.Vector3(0, -0.15, 0));
  else if (shot) focusRef.current = new THREE.Vector3(0, TOP + 0.05, 0.4);
  else focusRef.current = null;

  const gunMode = shot && !(shot.playerId === playerId && revealed && shot.fired)
    ? (shot.playerId === playerId ? { type: 'me' } : { type: 'head', head: headOf(angleOf(shot.playerId)), angle: angleOf(shot.playerId) })
    : { type: 'table' };

  const flat = -Math.PI / 2; // carte couchée face cachée (verso vers le haut)
  return (
    <>
      <color attach="background" args={['#0d0805']} />
      <fog attach="fog" args={['#140b06', 5, 11]} />
      <ambientLight intensity={0.55} color="#ffd9b0" />
      <hemisphereLight args={['#ffcf99', '#2a1408', 0.55]} />
      <CameraRig focusRef={focusRef} shakeRef={shakeRef} zoom={shot && shot.playerId !== playerId ? 0.5 : p.phase === 'REVEAL' ? 0.85 : shot ? 0.92 : 1}
        selfShot={shot && shot.playerId === playerId ? { revealed, fired: !!shot.fired } : null} />
      <Room />
      <Lamp />
      <Dust />
      <Table />

      {ordered.map((s, i) => (s.id === playerId ? null : (
        <Opponent key={s.id} seat={s} index={i} angle={seatAngle(i, n)} round={p.round} dealing={dealing}
          current={p.phase === 'TURN' && p.currentId === s.id} shooting={shot?.playerId === s.id} fell={fallen.has(s.id)} />
      )))}

      {/* pile au centre */}
      {Array.from({ length: Math.min(p.pile || 0, 20) }).map((_, i) => (
        <Card key={`pile-${p.round}-${i}`} pos={[Math.sin(i * 2.3) * 0.1, TOP + 0.004 + i * 0.003, Math.cos(i * 1.7) * 0.1]} rot={[-flat, i * 0.9, 0]} />
      ))}

      {/* dernière pose : glisse depuis le joueur vers le centre */}
      {p.phase === 'TURN' && p.lastPlay && Array.from({ length: p.lastPlay.count }).map((_, i) => {
        const from = onCircle(angleOf(p.lastPlay.by), 1.1, TOP + 0.3).toArray();
        return <Card key={`lp-${p.lastPlay.at}-${i}`} from={from} pos={[(i - (p.lastPlay.count - 1) / 2) * 0.24, TOP + 0.075 + i * 0.003, 0.42]} rot={[-flat, (i - 1) * 0.12, 0]} />;
      })}

      {/* révélation : les cartes se relèvent face à toi et se retournent une à une */}
      {(p.phase === 'REVEAL' || p.phase === 'ROULETTE') && p.reveal && p.reveal.cards.map((c, i, arr) => {
        const up = p.phase === 'REVEAL';
        return (
          <Card key={`rv-${c.id}`} rank={c.rank}
            faceUp={!up || nowFn() - revealStart > 500 + i * 300}
            from={[(i - (arr.length - 1) / 2) * 0.24, TOP + 0.08, 0.42]}
            pos={[(i - (arr.length - 1) / 2) * 0.34, up ? TOP + 0.33 : TOP + 0.01, up ? 0.55 : 0.75]}
            rot={up ? [-0.25, 0, 0] : [flat, 0, 0]} scale={up ? 1.15 : 1} />
        );
      })}

      <Revolver mode={gunMode} shot={shot} revealed={revealed} aimAngle={angleOf(p.currentId)} shakeRef={shakeRef} />
      {!(shot && shot.playerId === playerId) && <MyHand hand={myHand} selected={selected} onToggle={onToggle} canSelect={canSelect} dealing={dealing} />}
    </>
  );
}

export default function LiarsBar3D({ p, playerId, ordered, myHand, selected, onToggle, canSelect }) {
  // re-rendu régulier pour les moments liés à l'horloge (retournement, résultat du tir)
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 150); return () => clearInterval(id); }, []);
  return (
    <div className="lb-3d">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 55, position: EYE.toArray(), near: 0.05, far: 40 }} gl={{ antialias: true }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.35; }}>
        <Scene p={p} playerId={playerId} ordered={ordered} myHand={myHand} selected={selected} onToggle={onToggle} canSelect={canSelect} nowFn={serverNow} />
      </Canvas>
      <div className="lb-vignette" aria-hidden="true" />
    </div>
  );
}
