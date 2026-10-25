/**
 * Prop Hunt — ciel, lumières, ombres, reflets et rendu (avec occlusion ambiante en qualité élevée).
 * Le rendu se fait en deux temps : la scène, puis l'arme du chasseur par-dessus (elle ne traverse
 * donc jamais les murs).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const skyVert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */`
varying vec3 vDir;
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform float time; uniform float clouds;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = y > 0.0 ? mix(horizon, top, pow(y, 0.45)) : mix(horizon, ground, pow(min(1.0, -y * 3.0), 0.6));
  float sd = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.92, 0.75) * (pow(sd, 900.0) * 18.0 + pow(sd, 12.0) * 0.35);
  if (y > 0.0 && clouds > 0.0) {
    vec2 uv = d.xz / (y + 0.12) * 1.4 + vec2(time * 0.004, time * 0.002);
    float c = smoothstep(0.48, 0.78, fbm(uv));
    float shade = 0.82 + 0.18 * fbm(uv * 2.0 + 3.0);
    col = mix(col, vec3(1.02, 1.0, 0.98) * shade, c * clouds * smoothstep(0.0, 0.18, y));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makeSky(map) {
  const c = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const sun = new THREE.Vector3(...map.sun).normalize();
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: c(0x3f7fd0) }, horizon: { value: c(0xcfe6f7) }, ground: { value: c(0x7d8b6a) }, sunDir: { value: sun }, time: { value: 0 }, clouds: { value: 1 } },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  return mesh;
}

export function Environment({ map, quality, overlay }) {
  const { gl, scene, camera, size } = useThree();
  const sunRef = useRef();
  const outdoor = map.env === 'outdoor';
  const sky = useMemo(() => (outdoor ? makeSky(map) : null), [map, outdoor]);

  // reflets (environnement) : le ciel dehors, une pièce neutre dedans
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = outdoor ? 0.95 : 1.05;
    gl.shadowMap.enabled = quality !== 'low';
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(gl);
    let rt;
    if (outdoor) {
      const s = new THREE.Scene(); const sk = makeSky(map); sk.material.uniforms.clouds.value = 0.5; s.add(sk);
      rt = pmrem.fromScene(s, 0.02, 0.1, 1000);
      scene.background = null;
    } else {
      rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.background = new THREE.Color(map.sky);
    }
    scene.environment = rt.texture;
    scene.fog = new THREE.Fog(map.fog[0], map.fog[1], map.fog[2]);
    pmrem.dispose();
    return () => { rt.dispose(); scene.environment = null; };
  }, [map, gl, scene, outdoor, quality]);

  // ombres : la caméra d'ombre couvre toute la map
  const shadow = useMemo(() => {
    const [x1, x2, z1, z2] = map.area;
    const cx = (x1 + x2) / 2; const cz = (z1 + z2) / 2;
    const r = Math.hypot(x2 - x1, z2 - z1) / 2 + 4;
    const dir = new THREE.Vector3(...map.sun).normalize();
    return { cx, cz, r, pos: [cx + dir.x * 80, dir.y * 80, cz + dir.z * 80] };
  }, [map]);
  useEffect(() => {
    const l = sunRef.current; if (!l) return;
    l.target.position.set(shadow.cx, 0, shadow.cz); l.target.updateMatrixWorld();
    const cam = l.shadow.camera; cam.left = -shadow.r; cam.right = shadow.r; cam.top = shadow.r; cam.bottom = -shadow.r; cam.near = 5; cam.far = 200; cam.updateProjectionMatrix();
    l.shadow.mapSize.setScalar(quality === 'high' ? 4096 : 2048);
    l.shadow.bias = -0.0003; l.shadow.normalBias = 0.035; l.shadow.radius = 3;
    if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; }
  }, [shadow, quality]);

  // rendu : composer (occlusion ambiante) en qualité élevée, puis l'arme par-dessus
  const composer = useMemo(() => {
    if (quality !== 'high') return null;
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, size.width, size.height);
    ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
    ao.blendIntensity = 0.85;
    c.addPass(ao);
    c.addPass(new OutputPass());
    return c;
  }, [quality, gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (composer) { composer.setSize(size.width, size.height); composer.setPixelRatio(gl.getPixelRatio()); } }, [composer, size, gl]);
  useEffect(() => () => composer?.dispose(), [composer]);

  useFrame((state, dt) => {
    if (sky) { sky.position.copy(camera.position); sky.material.uniforms.time.value += dt; }
    if (composer) composer.render(dt); else gl.render(scene, camera);
    const ov = overlay?.current;
    if (ov && ov.visible) {
      const auto = gl.autoClear; gl.autoClear = false; gl.clearDepth();
      gl.render(ov, camera); gl.autoClear = auto;
    }
  }, 1);

  const k = outdoor ? 1 : 0.85;
  return (
    <>
      {sky && <primitive object={sky} />}
      <hemisphereLight args={[outdoor ? 0xcfe4ff : 0xfff8ee, outdoor ? 0x6f6248 : 0x8a7c6c, outdoor ? 0.75 : 0.9]} />
      <directionalLight ref={sunRef} position={shadow.pos} intensity={(outdoor ? 3.0 : 1.7) * k + (outdoor ? 0 : 0.2)} color={outdoor ? 0xfff0d8 : 0xffffff} castShadow={quality !== 'low'} />
      {!outdoor && <directionalLight position={[-shadow.pos[0], 40, -shadow.pos[2]]} intensity={0.45} />}
      {quality === 'low' && <ambientLight intensity={outdoor ? 0.5 : 0.6} />}
      {quality !== 'low' && (map.lights || []).map((l, i) => <pointLight key={i} position={[l[0], l[1], l[2]]} color={l[3]} intensity={l[4]} distance={l[5]} decay={1.6} />)}
    </>
  );
}
