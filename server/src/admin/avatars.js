/**
 * Cadrage des avatars perso (page admin → onglet Avatars).
 *
 * Les avatars sont générés au build du client à partir de client/avatars/ et de
 * client/avatars/cadrage.json. Sur Render (offre gratuite) le disque est effacé à chaque
 * redémarrage : on enregistre donc le cadrage directement dans le dépôt GitHub, ce qui
 * relance le déploiement automatiquement.
 *
 * Variables d'environnement (service serveur sur Render) :
 *   GITHUB_TOKEN   jeton GitHub « fine-grained » avec accès Contents: Read and write au dépôt
 *   GITHUB_REPO    propriétaire/dépôt (défaut : Ackermannnnnnnn/party-games)
 *   GITHUB_BRANCH  branche (défaut : main)
 */
const FILE = 'client/avatars/cadrage.json';
const repo = () => process.env.GITHUB_REPO || 'Ackermannnnnnnn/party-games';
const branch = () => process.env.GITHUB_BRANCH || 'main';

/** Remplaçable pour les tests. */
export const http = { fetch: (...a) => fetch(...a) };

export function githubEnabled() {
  return !!process.env.GITHUB_TOKEN;
}

/** Nettoie ce qu'envoie la page admin : { "Thor.jpg": { zoom, x, y } | null }. */
export function sanitizeCadrage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const [file, c] of Object.entries(input).slice(0, 500)) {
    if (typeof file !== 'string' || file.length > 200 || file.includes('..') || file.startsWith('/')) continue;
    if (c === null) { out[file] = null; continue; }
    const zoom = Number(c?.zoom); const x = Number(c?.x); const y = Number(c?.y);
    if (![zoom, x, y].every(Number.isFinite)) continue;
    const r = (v) => Math.round(v * 1000) / 1000;
    out[file] = { zoom: r(Math.max(1, Math.min(4, zoom))), x: r(Math.max(0, Math.min(1, x))), y: r(Math.max(0, Math.min(1, y))) };
  }
  return out;
}

async function gh(path, opts = {}) {
  const res = await http.fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'party-games-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

/**
 * Fusionne `changes` dans cadrage.json sur GitHub (null = revenir au cadrage automatique)
 * et crée un commit. Renvoie { commit, cadrage }.
 */
export async function saveCadrage(changes) {
  const path = `/contents/${FILE}`;
  const cur = await gh(`${path}?ref=${encodeURIComponent(branch())}`);
  let current = {};
  let sha;
  if (cur.ok) {
    sha = cur.body.sha;
    try { current = JSON.parse(Buffer.from(cur.body.content || '', 'base64').toString('utf8')) || {}; } catch { current = {}; }
  } else if (cur.status !== 404) {
    const err = new Error(cur.status === 401 || cur.status === 403 ? 'Jeton GitHub refusé (vérifie GITHUB_TOKEN et ses droits).' : `GitHub a répondu ${cur.status}.`);
    err.status = 502;
    throw err;
  }
  const next = { ...current };
  for (const [file, c] of Object.entries(changes)) {
    if (c === null) delete next[file]; else next[file] = c;
  }
  const sorted = Object.fromEntries(Object.keys(next).sort((a, b) => a.localeCompare(b, 'fr')).map((k) => [k, next[k]]));
  const content = `${JSON.stringify(sorted, null, 2)}\n`;
  const n = Object.keys(changes).length;
  const put = await gh(path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Avatars : cadrage de ${n} image${n > 1 ? 's' : ''} (depuis l'admin)`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) {
    const err = new Error(put.status === 409 ? 'Le fichier a changé entre-temps, réessaie.' : put.status === 401 || put.status === 403 || put.status === 404 ? 'Jeton GitHub refusé (vérifie GITHUB_TOKEN et ses droits en écriture).' : `GitHub a répondu ${put.status}.`);
    err.status = 502;
    throw err;
  }
  return { commit: put.body?.commit?.sha?.slice(0, 7) || null, cadrage: sorted };
}
