/**
 * Détection de nouvelle version : un onglet resté ouvert après une mise en ligne garde l'ancien code
 * (anciennes maps, anciennes règles…) et ne joue plus la même partie que les autres.
 * On compare l'identifiant de build embarqué à /version.json et on recharge.
 */
/** Version du protocole client — doit correspondre à CLIENT_VERSION côté serveur. */
export const CLIENT_VERSION = 4;

const BASE = import.meta.env?.BASE_URL || '/';
// eslint-disable-next-line no-undef
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

export async function latestBuild() {
  try {
    const r = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).build || null;
  } catch { return null; }
}

/** Recharge la page (une fois par 20 s max, pour éviter toute boucle). */
export function reloadForUpdate() {
  try {
    const last = Number(sessionStorage.getItem('updateReloadAt') || 0);
    if (Date.now() - last < 20000) return false;
    sessionStorage.setItem('updateReloadAt', String(Date.now()));
  } catch { /* stockage indisponible */ }
  window.location.reload();
  return true;
}

/** Surveille les mises à jour ; onUpdate() est appelé quand une nouvelle version est en ligne. */
export function watchUpdates(onUpdate) {
  if (BUILD_ID === 'dev') return () => {};
  let stop = false;
  const check = async () => {
    const b = await latestBuild();
    if (!stop && b && b !== BUILD_ID) onUpdate();
  };
  const onVis = () => { if (document.visibilityState === 'visible') check(); };
  const t = setInterval(check, 60000);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', check);
  // un morceau de code (chunk) introuvable = l'ancien build a été remplacé
  const onPreload = (e) => { e.preventDefault?.(); reloadForUpdate(); };
  window.addEventListener('vite:preloadError', onPreload);
  check();
  return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', check); window.removeEventListener('vite:preloadError', onPreload); };
}
