/**
 * Accès au dépôt GitHub du projet (API REST + API Git), utilisé pour :
 *   - les avatars (photos, cadrage) → branche principale, ce qui redéploie le site
 *   - l'historique des parties → branche « data », qui ne déclenche aucun déploiement
 *
 * Variables d'environnement (service serveur sur Render) :
 *   GITHUB_TOKEN   jeton GitHub « fine-grained » avec accès Contents: Read and write au dépôt
 *   GITHUB_REPO    propriétaire/dépôt (défaut : Ackermannnnnnnn/party-games)
 *   GITHUB_BRANCH  branche du site (défaut : main)
 */
export const repo = () => process.env.GITHUB_REPO || 'Ackermannnnnnnn/party-games';
export const mainBranch = () => process.env.GITHUB_BRANCH || 'main';

/** Remplaçable pour les tests. */
export const http = { fetch: (...a) => fetch(...a) };

export function githubEnabled() {
  return !!process.env.GITHUB_TOKEN;
}

export const fail = (message, status = 502) => Object.assign(new Error(message), { status });
const TOKEN_ERR = 'Jeton GitHub refusé (vérifie GITHUB_TOKEN et ses droits en écriture).';

export async function gh(path, opts = {}) {
  const { raw, ...rest } = opts;
  const res = await http.fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...rest,
    headers: {
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'party-games-server',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 401 || res.status === 403) throw fail(TOKEN_ERR);
  if (raw === 'binary') return { status: res.status, ok: res.ok, buf: res.ok ? Buffer.from(await res.arrayBuffer()) : null, type: res.headers.get('content-type') };
  if (raw) return { status: res.status, ok: res.ok, text: res.ok ? await res.text() : null };
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

/** Lit un fichier texte du dépôt (null s'il n'existe pas). Fonctionne aussi pour les gros fichiers. */
export async function readText(path, branch = mainBranch()) {
  const r = await gh(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, { raw: true });
  if (r.status === 404) return null;
  if (!r.ok) throw fail(`GitHub a répondu ${r.status}.`);
  return r.text;
}

/** Lit un fichier binaire du dépôt (null s'il n'existe pas). */
export async function readBinary(path, branch = mainBranch()) {
  const r = await gh(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, { raw: 'binary' });
  if (r.status === 404) return null;
  if (!r.ok) throw fail(`GitHub a répondu ${r.status}.`);
  return r.buf;
}

/** Noms des fichiers d'un dossier du dépôt ([] s'il n'existe pas). */
export async function listDir(path, branch = mainBranch()) {
  const r = await gh(`/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
  if (r.status === 404) return [];
  if (!r.ok || !Array.isArray(r.body)) throw fail(`GitHub a répondu ${r.status}.`);
  return r.body.map((f) => f.name);
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

/**
 * Crée UN commit avec plusieurs fichiers (ajout, modification, suppression) via l'API Git.
 * files : [{ path, content: Buffer|string } | { path, remove: true }]
 * Si la branche n'existe pas et que `createIfMissing` est vrai, elle est créée vide (sans le code du site).
 */
export async function commitFiles(files, message, { branch = mainBranch(), createIfMissing = false } = {}) {
  const ref = await gh(`/git/ref/heads/${encodeURIComponent(branch)}`);
  let parentSha = null;
  let baseTree = null;
  if (ref.ok) {
    parentSha = ref.body.object.sha;
    const parent = await gh(`/git/commits/${parentSha}`);
    if (!parent.ok) throw fail(`GitHub a répondu ${parent.status}.`);
    baseTree = parent.body.tree.sha;
  } else if (!(ref.status === 404 && createIfMissing)) {
    throw fail(ref.status === 404 ? 'Branche introuvable sur GitHub.' : `GitHub a répondu ${ref.status}.`);
  }

  const tree = [];
  for (const f of files) {
    if (f.remove) { if (baseTree) tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content), 'utf8');
    const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }) });
    if (!blob.ok) throw fail(`Envoi du fichier ${f.path} refusé (${blob.status}).`);
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.body.sha });
  }
  const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify(baseTree ? { base_tree: baseTree, tree } : { tree }) });
  if (!t.ok) throw fail(`GitHub a répondu ${t.status} (arbre).`);
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.body.sha, parents: parentSha ? [parentSha] : [] }) });
  if (!c.ok) throw fail(`GitHub a répondu ${c.status} (commit).`);
  const upd = parentSha
    ? await gh(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: c.body.sha }) })
    : await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: c.body.sha }) });
  if (!upd.ok) throw fail(upd.status === 422 ? 'Le dépôt a changé entre-temps, réessaie.' : `GitHub a répondu ${upd.status}.`);
  return c.body.sha.slice(0, 7);
}
