/**
 * Prop Hunt — commandes.
 *  PC : ZQSD / WASD (position des touches, donc AZERTY et QWERTY marchent pareil), souris (pointeur verrouillé),
 *       Espace saut, Maj sprint, clic / E action, R rotation, F moquerie, G leurre, Tab scores.
 *  Tactile : joystick à gauche, glisser n'importe où ailleurs pour regarder, boutons à l'écran.
 */
export const isTouch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

const SENS_KEY = 'prophuntSensitivity';

export function createInput() {
  const input = {
    keys: new Set(),
    move: { x: 0, y: 0 },      // joystick tactile (-1..1)
    yaw: 0,
    pitch: 0,
    jump: false,
    sprint: false,
    // actions ponctuelles (consommées par la boucle de jeu)
    queue: [],
    sensitivity: (() => { try { return Number(localStorage.getItem(SENS_KEY)) || 1; } catch { return 1; } })(),
    locked: false,
    enabled: true,
    push(a) { if (this.enabled) this.queue.push(a); },
    take() { const q = this.queue; this.queue = []; return q; },
    setSensitivity(v) { this.sensitivity = v; try { localStorage.setItem(SENS_KEY, String(v)); } catch {} },
    look(dx, dy, scale) {
      this.yaw -= dx * scale * this.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * scale * this.sensitivity));
    },
    /** Direction voulue dans le repère du joueur : x = droite, y = avant. */
    wish() {
      let x = this.move.x; let y = this.move.y;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },
  };
  return input;
}

/** Branche clavier + souris sur un élément (le canvas). Renvoie une fonction de nettoyage. */
export function attachDesktop(input, el, { onScoreboard } = {}) {
  const typing = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
  const down = (e) => {
    if (typing(e) || !input.enabled) return;
    if (e.code === 'Tab') { e.preventDefault(); onScoreboard?.(true); return; }
    input.keys.add(e.code);
    if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = true;
    if (e.repeat) return;
    if (e.code === 'KeyE') input.push('action');
    if (e.code === 'KeyR') input.push('lock');
    if (e.code === 'KeyF') input.push('taunt');
    if (e.code === 'KeyG') input.push('decoy');
    if (e.code === 'KeyV') input.push('view');
  };
  const up = (e) => {
    if (e.code === 'Tab') { onScoreboard?.(false); return; }
    input.keys.delete(e.code);
    if (e.code === 'Space') input.jump = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = false;
  };
  const mouse = (e) => { if (document.pointerLockElement === el) input.look(e.movementX, e.movementY, 0.0022); };
  const click = (e) => {
    if (!input.enabled) return;
    if (document.pointerLockElement !== el) { el.requestPointerLock?.()?.catch?.(() => {}); return; }
    if (e.button === 0) input.push('action');
    if (e.button === 2) input.push('alt');
  };
  const lockChange = () => { input.locked = document.pointerLockElement === el; if (!input.locked) { input.keys.clear(); input.jump = false; input.sprint = false; } };
  const ctx = (e) => e.preventDefault();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  document.addEventListener('mousemove', mouse);
  document.addEventListener('pointerlockchange', lockChange);
  el.addEventListener('mousedown', click);
  el.addEventListener('contextmenu', ctx);
  const blur = () => { input.keys.clear(); input.jump = false; input.sprint = false; };
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    document.removeEventListener('mousemove', mouse);
    document.removeEventListener('pointerlockchange', lockChange);
    el.removeEventListener('mousedown', click);
    el.removeEventListener('contextmenu', ctx);
    window.removeEventListener('blur', blur);
    if (document.pointerLockElement === el) document.exitPointerLock?.();
  };
}

/**
 * Tactile : zone de joystick (moitié gauche, en bas) + regard avec le reste de l'écran.
 * `stick` reçoit la position du joystick pour l'afficher.
 */
export function attachTouch(input, el, onStick) {
  let stickId = null; let origin = null;
  const looks = new Map();
  const R = 60;
  const start = (e) => {
    for (const t of e.changedTouches) {
      const rect = el.getBoundingClientRect();
      const x = t.clientX - rect.left; const y = t.clientY - rect.top;
      if (stickId === null && x < rect.width * 0.42 && y > rect.height * 0.35) {
        stickId = t.identifier; origin = { x: t.clientX, y: t.clientY };
        onStick?.({ active: true, ox: x, oy: y, dx: 0, dy: 0 });
      } else {
        looks.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    e.preventDefault();
  };
  const move = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - origin.x; let dy = t.clientY - origin.y;
        const l = Math.hypot(dx, dy);
        if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
        input.move.x = dx / R; input.move.y = -dy / R;
        input.sprint = l > R * 0.95;
        onStick?.((s) => ({ ...s, dx, dy }));
      } else if (looks.has(t.identifier)) {
        const last = looks.get(t.identifier);
        input.look(t.clientX - last.x, t.clientY - last.y, 0.0055);
        looks.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    e.preventDefault();
  };
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; input.move.x = 0; input.move.y = 0; input.sprint = false; onStick?.({ active: false }); }
      looks.delete(t.identifier);
    }
  };
  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);
  return () => {
    el.removeEventListener('touchstart', start);
    el.removeEventListener('touchmove', move);
    el.removeEventListener('touchend', end);
    el.removeEventListener('touchcancel', end);
  };
}
