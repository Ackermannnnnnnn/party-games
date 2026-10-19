// Prépare les avatars perso déposés dans client/avatars/ (lancé automatiquement avant `npm run dev` et `npm run build`).
//
//   client/avatars/Hulk.png                → avatar « Hulk » dans l'onglet « ⭐ Perso »
//   client/avatars/Marvel/Iron-Man.jpg     → avatar « Iron Man » dans l'onglet « Marvel »
//   client/avatars/🎌 Mangas/goku.webp     → avatar « Goku » dans l'onglet « 🎌 Mangas »
//
// Chaque image est recadrée en carré et réduite (256 px, WebP) dans public/avatars-gen/,
// et la liste est écrite dans src/generated/customAvatars.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'avatars');
const OUT = path.join(ROOT, 'public', 'avatars-gen');
const LIST = path.join(ROOT, 'src', 'generated', 'customAvatars.json');
const CADRAGE = path.join(SRC, 'cadrage.json'); // { "Thor.jpg": { zoom, x, y } } — réglé depuis la page admin
const SRC_PREVIEW = 640; // image entière (non recadrée) pour l'outil de cadrage
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const SIZE = 256;

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('[avatars] sharp indisponible : images copiées sans réduction.'); }
let smartcrop = null;
try { smartcrop = (await import('smartcrop')).default; } catch { console.warn('[avatars] smartcrop indisponible : cadrage automatique simple.'); }

/**
 * Cadrage automatique : smartcrop repère la zone la plus intéressante (visage, détails, contraste)
 * et on autorise un léger zoom (MIN_SCALE) pour que le sujet remplisse bien le petit rond.
 * Renvoie un cadrage { zoom, x, y } au même format que le cadrage manuel.
 */
const MIN_SCALE = 0.7;
async function autoCrop(data, w, h) {
  if (!smartcrop) return null;
  const iop = {
    open: async (buf) => ({ width: w, height: h, _buf: buf }),
    resample: async (img, width, height) => ({ width: ~~width, height: ~~height, _buf: img._buf }),
    getData: async (img) => {
      const raw = await sharp(img._buf).resize(img.width, img.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
      return new smartcrop.ImgData(img.width, img.height, raw);
    },
  };
  const { topCrop: c } = await smartcrop.crop(data, { width: 100, height: 100, minScale: MIN_SCALE, imageOperations: iop });
  const side = Math.min(c.width, c.height);
  const zoom = Math.min(w, h) / side;
  const fx = w - side > 0 ? c.x / (w - side) : 0.5;
  const fy = h - side > 0 ? c.y / (h - side) : 0.5;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  return { zoom: r3(Math.max(1, Math.min(4, zoom))), x: r3(Math.max(0, Math.min(1, fx))), y: r3(Math.max(0, Math.min(1, fy))) };
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const pretty = (file) => {
  const base = path.parse(file).name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
};
/** « 🎌 Mangas » → icône 🎌, nom « Mangas » ; « Marvel » → icône 🖼️ */
const splitIcon = (name) => {
  const m = /^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)\s*(.*)$/u.exec(name);
  return m ? { icon: m[1], label: m[2] || name } : { icon: '🖼️', label: name };
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LIST), { recursive: true });

/** Cadrages choisis à la main (zoom 1–4, x/y 0–1 = position du carré dans l'image). */
let cadrage = {};
try { cadrage = JSON.parse(fs.readFileSync(CADRAGE, 'utf8')) || {}; } catch {}
const validCrop = (c) => c && Number.isFinite(c.zoom) && Number.isFinite(c.x) && Number.isFinite(c.y)
  ? { zoom: Math.max(1, Math.min(4, c.zoom)), x: Math.max(0, Math.min(1, c.x)), y: Math.max(0, Math.min(1, c.y)) } : null;

/** Même calcul que l'outil de cadrage (et que les photos perso) : un carré de côté min(L, H) / zoom. */
function cropRegion(w, h, { zoom, x, y }) {
  const side = Math.max(1, Math.floor(Math.min(w, h) / zoom));
  const left = Math.round(Math.max(0, Math.min(w - side, (w - side) * x)));
  const top = Math.round(Math.max(0, Math.min(h - side, (h - side) * y)));
  return { left, top, width: side, height: side };
}

const categories = [];
const avatars = [];
const usedIds = new Set();

async function addImage(file, cat) {
  const label = pretty(path.basename(file));
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const crop = validCrop(cadrage[rel]);
  let srcName = null;
  let auto = null; // cadrage calculé automatiquement (point de départ dans l'outil admin)
  let id = `img:${cat.id}/${slug(label)}`.slice(0, 70);
  while (usedIds.has(id)) id += 'x';
  usedIds.add(id);
  const name = id.slice(4).replace('/', '__');
  let outName;
  try {
    if (!sharp) throw new Error('no sharp');
    const anim = path.extname(file).toLowerCase() === '.gif';
    outName = `${name}.webp`;
    let used = null;
    if (!anim) {
      const { data, info } = await sharp(file).rotate().toBuffer({ resolveWithObject: true });
      used = crop;
      if (!used) { try { auto = await autoCrop(data, info.width, info.height); used = auto; } catch (err) { console.warn(`[avatars] cadrage auto impossible (${rel}) : ${err.message}`); } }
      if (used) await sharp(data).extract(cropRegion(info.width, info.height, used)).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(path.join(OUT, outName));
    }
    if (!used) {
      await sharp(file, { animated: anim })
        .rotate()
        .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
        .webp({ quality: 82 })
        .toFile(path.join(OUT, outName));
    }
    if (!anim) {
      srcName = `src__${name}.webp`;
      await sharp(file).rotate().resize(SRC_PREVIEW, SRC_PREVIEW, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, srcName));
    }
  } catch (e) {
    const size = fs.statSync(file).size;
    if (size > 1_500_000) { console.warn(`[avatars] ignoré (trop lourd, ${Math.round(size / 1024)} Ko) : ${file}`); usedIds.delete(id); return; }
    outName = `${name}${path.extname(file).toLowerCase()}`;
    fs.copyFileSync(file, path.join(OUT, outName));
  }
  avatars.push({
    id, cat: cat.id, label, img: `/avatars-gen/${encodeURIComponent(outName)}`,
    file: rel, crop, auto, src: srcName ? `/avatars-gen/${encodeURIComponent(srcName)}` : null,
  });
}

async function scanDir(dir, cat) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (cat.id !== 'perso') { await scanDir(full, cat); continue; } // sous-sous-dossiers : même onglet
      const { icon, label } = splitIcon(e.name);
      const sub = { id: `c-${slug(label)}`, label, icon };
      categories.push(sub);
      await scanDir(full, sub);
    } else if (EXT.has(path.extname(e.name).toLowerCase())) {
      await addImage(full, cat);
    }
  }
}

if (fs.existsSync(SRC)) {
  const perso = { id: 'perso', label: 'Perso', icon: '⭐' };
  categories.push(perso);
  await scanDir(SRC, perso);
}
const used = categories.filter((c) => avatars.some((a) => a.cat === c.id));
fs.writeFileSync(LIST, JSON.stringify({ categories: used, avatars }, null, 1));
console.log(`[avatars] ${avatars.length} avatar(s) perso dans ${used.length} onglet(s).`);
