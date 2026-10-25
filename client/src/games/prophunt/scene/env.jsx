/**
 * Prop Hunt — éclairage et rendu « réaliste » :
 *  - environnement HDRI photographique (Poly Haven, CC0) pour la lumière ambiante et les reflets,
 *    et comme ciel dehors ; le soleil est placé là où il est sur la photo (ombres cohérentes) ;
 *  - ombres douces, occlusion ambiante (N8AO), bloom, anticrénelage SMAA, tone mapping AgX, vignette ;
 *  - l'arme du chasseur est dessinée par-dessus la scène (elle ne traverse jamais les murs).
 * En qualité basse : rendu direct, sans post-traitement.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  EffectComposer, RenderPass, EffectPass, ClearPass, SMAAEffect, SMAAPreset, BloomEffect, ToneMappingEffect, ToneMappingMode,
  VignetteEffect, BrightnessContrastEffect, HueSaturationEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { wind } from '../assets3d.js';

const BASE = `${import.meta.env?.BASE_URL || '/'}ph-assets/hdri/`;

/** Ambiance par map : HDRI d'éclairage / de fond, exposition, intensités. */
const LOOKS = {
  suburb: { hdri: 'kloppenheim_06_puresky', bg: true, exposure: 1.0, sun: 3.2, env: 1.0 },
  school: { hdri: 'qwantani_puresky', bg: true, exposure: 0.95, sun: 3.0, env: 1.0 },
  manor: { hdri: 'satara_night', bg: true, exposure: 1.15, sun: 0.7, env: 1.0, bgIntensity: 0.45 },
  store: { hdri: 'school_hall', bg: false, exposure: 1.0, sun: 1.2, env: 1.2 },
  office: { hdri: 'lebombo', bg: false, exposure: 1.0, sun: 1.2, env: 1.1 },
  kitchen: { hdri: 'hotel_room', bg: false, exposure: 1.0, sun: 1.6, env: 1.1 },
};

const hdrCache = new Map();
function loadHdr(name) {
  if (!hdrCache.has(name)) {
    hdrCache.set(name, new Promise((resolve) => {
      new RGBELoader().load(`${BASE}${name}.hdr`, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; resolve(t); }, undefined, () => resolve(null));
    }));
  }
  return hdrCache.get(name);
}

/** Direction du soleil sur la photo (pixel le plus lumineux) ; null si trop bas ou pas net. */
function sunFromHdr(tex) {
  const { data, width: W, height: H } = tex.image;
  if (!data) return null;
  const step = data.length / (W * H);
  const half = data instanceof Uint16Array;
  const f = half ? THREE.DataUtils.fromHalfFloat : (v) => v;
  let best = -1; let bx = 0; let by = 0;
  for (let y = 0; y < H / 2; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * step;
      const l = f(data[i]) * 0.3 + f(data[i + 1]) * 0.59 + f(data[i + 2]) * 0.11;
      if (l > best) { best = l; bx = x; by = y; }
    }
  }
  if (best < 20) return null;
  // la texture est retournée (flipY) : la ligne 0 des données est le bas de l'image
  const u = (bx + 0.5) / W; const v = tex.flipY ? (by + 0.5) / H : 1 - (by + 0.5) / H;
  const phi = (u - 0.5) * 2 * Math.PI; const theta = (v - 0.5) * Math.PI;
  const d = new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi));
  if (d.y < 0.25) return null;
  return d;
}

const skyVert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */`
varying vec3 vDir;
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir;
void main() {
  vec3 d = normalize(vDir); float y = d.y;
  vec3 col = y > 0.0 ? mix(horizon, top, pow(y, 0.45)) : mix(horizon, ground, pow(min(1.0, -y * 3.0), 0.6));
  float sd = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.92, 0.75) * (pow(sd, 900.0) * 18.0 + pow(sd, 12.0) * 0.35);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
/** Ciel calculé (secours si l'HDRI ne charge pas, et qualité basse). */
function makeSky(map) {
  const c = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: c(map.look?.top ?? 0x3f7fd0) }, horizon: { value: c(map.look?.horizon ?? 0xcfe6f7) }, ground: { value: c(map.look?.ground ?? 0x7d8b6a) }, sunDir: { value: new THREE.Vector3(...map.sun).normalize() } },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return mesh;
}

export function Environment({ map, quality, overlay }) {
  const { gl, scene, camera, size } = useThree();
  const sunRef = useRef();
  const outdoor = map.env === 'outdoor' || map.env === 'night';
  const night = map.env === 'night';
  const look = { ...(LOOKS[map.id] || { hdri: outdoor ? 'kloppenheim_06_puresky' : 'small_empty_room_1', bg: outdoor, exposure: 1, sun: outdoor ? 3 : 1.4, env: 1 }), ...(map.render || {}) };
  const [hdr, setHdr] = useState(null);
  const [sunDir, setSunDir] = useState(() => new THREE.Vector3(...map.sun).normalize());
  const sky = useMemo(() => (outdoor ? makeSky(map) : null), [map, outdoor]);

  // HDRI : lumière d'ambiance + reflets (+ ciel dehors)
  useEffect(() => {
    let off = false;
    loadHdr(look.hdri).then((t) => {
      if (off || !t) return;
      setHdr(t);
      if (outdoor && !night) { const d = sunFromHdr(t); if (d) setSunDir(d); }
    });
    return () => { off = true; };
  }, [look.hdri, outdoor, night]);

  useEffect(() => {
    gl.shadowMap.enabled = quality !== 'low';
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    let rt = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    if (hdr) rt = pmrem.fromEquirectangular(hdr);
    else rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    if (outdoor && hdr && look.bg && quality !== 'low') {
      scene.background = hdr; scene.backgroundIntensity = look.bgIntensity ?? 1; scene.backgroundBlurriness = 0;
    } else if (outdoor) {
      scene.background = null;
    } else {
      scene.background = new THREE.Color(map.sky);
    }
    scene.fog = new THREE.Fog(map.fog[0], map.fog[1] * 1.3, map.fog[2] * 1.3);
    pmrem.dispose();
    return () => { rt.dispose(); scene.environment = null; scene.background = null; };
  }, [hdr, map, gl, scene, outdoor, quality, look.env, look.bg, look.bgIntensity]);

  // ombres : la caméra d'ombre couvre toute la map
  const shadow = useMemo(() => {
    const [x1, x2, z1, z2] = map.area;
    const cx = (x1 + x2) / 2; const cz = (z1 + z2) / 2;
    const r = Math.hypot(x2 - x1, z2 - z1) / 2 + 4;
    const dir = outdoor ? sunDir : new THREE.Vector3(...map.sun).normalize();
    return { cx, cz, r, pos: [cx + dir.x * 90, Math.max(20, dir.y * 90), cz + dir.z * 90] };
  }, [map, sunDir, outdoor]);
  useEffect(() => {
    const l = sunRef.current; if (!l) return;
    l.target.position.set(shadow.cx, 0, shadow.cz); l.target.updateMatrixWorld();
    const cam = l.shadow.camera; cam.left = -shadow.r; cam.right = shadow.r; cam.top = shadow.r; cam.bottom = -shadow.r; cam.near = 5; cam.far = 260; cam.updateProjectionMatrix();
    l.shadow.mapSize.setScalar(quality === 'high' ? 4096 : 2048);
    l.shadow.bias = -0.00025; l.shadow.normalBias = 0.03; l.shadow.radius = quality === 'high' ? 4 : 3; l.shadow.blurSamples = 12;
    if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; }
  }, [shadow, quality]);

  // post-traitement
  const post = useMemo(() => {
    if (quality === 'low') return null;
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const ao = new N8AOPostPass(scene, camera, size.width, size.height);
    ao.configuration.aoRadius = 1.6;
    ao.configuration.distanceFalloff = 0.6;
    ao.configuration.intensity = quality === 'high' ? 2.6 : 2.2;
    ao.configuration.halfRes = quality !== 'high';
    ao.configuration.gammaCorrection = false;
    ao.setQualityMode(quality === 'high' ? 'Medium' : 'Low');
    composer.addPass(ao);
    // l'arme du chasseur, par-dessus (profondeur effacée)
    const clear = new ClearPass(false, true, false);
    const ov = new RenderPass(null, camera); ov.clear = false; ov.ignoreBackground = true;
    composer.addPass(clear); composer.addPass(ov);
    const bloom = new BloomEffect({ intensity: night ? 0.8 : 0.6, luminanceThreshold: 0.92, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.7 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const effects = [bloom, tone, new BrightnessContrastEffect({ contrast: 0.08 }), new HueSaturationEffect({ saturation: 0.08 }),
      new VignetteEffect({ offset: 0.32, darkness: 0.45 }), new SMAAEffect({ preset: quality === 'high' ? SMAAPreset.HIGH : SMAAPreset.MEDIUM })];
    composer.addPass(new EffectPass(camera, ...effects));
    return { composer, ao, ov, clear };
  }, [quality, gl, scene, camera, night]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (post) post.composer.setSize(size.width, size.height); }, [post, size]);
  useEffect(() => () => post?.composer.dispose(), [post]);
  useEffect(() => {
    gl.toneMapping = post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = look.exposure ?? 1;
  }, [post, gl, look.exposure]);

  useFrame((state, dt) => {
    wind.value += dt;
    if (sky) sky.position.copy(camera.position);
    const ov = overlay?.current;
    if (post) {
      const show = !!(ov && ov.visible);
      post.ov.scene = show ? ov : null; post.ov.enabled = show; post.clear.enabled = show;
      post.composer.render(dt);
    } else {
      gl.render(scene, camera);
      if (ov && ov.visible) { const auto = gl.autoClear; gl.autoClear = false; gl.clearDepth(); gl.render(ov, camera); gl.autoClear = auto; }
    }
  }, 1);

  const showSky = sky && !(hdr && look.bg && quality !== 'low');
  return (
    <>
      {showSky && <primitive object={sky} />}
      <hemisphereLight args={map.look?.hemi ? map.look.hemi : [outdoor ? 0xcfe4ff : 0xfff8ee, outdoor ? 0x6f6248 : 0x8a7c6c, quality === 'low' ? 0.8 : 0.25]} />
      <directionalLight ref={sunRef} position={shadow.pos} intensity={look.sun ?? 3} color={map.look?.sunColor ?? (outdoor ? 0xfff1dc : 0xffffff)} castShadow={quality !== 'low'} />
      {quality === 'low' && <ambientLight intensity={night ? 0.25 : outdoor ? 0.5 : 0.6} />}
      {quality !== 'low' && (map.lights || []).map((l, i) => <pointLight key={i} position={[l[0], l[1], l[2]]} color={l[3]} intensity={l[4]} distance={l[5]} decay={1.6} />)}
    </>
  );
}
