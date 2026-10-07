/**
 * Règles de comparaison des mots (indices donnés pendant le tour de parole).
 * ⚠️ Copie de server/src/games/imposter/wordRules.js : le serveur reste l'arbitre,
 *    cette copie sert seulement à prévenir le joueur avant l'envoi.
 */

/** Minuscules, sans accents, sans espaces ni ponctuation. "Coca-Cola" -> "cocacola" */
export function normalizeWord(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Retire un pluriel simple ("chats" -> "chat") pour les mots de plus de 3 lettres. */
function stem(s) {
  const n = normalizeWord(s);
  return n.length > 3 ? n.replace(/[sx]$/, '') : n;
}

/** Vrai si les deux mots sont identiques à la casse, aux accents et au pluriel près. */
export function sameWord(a, b) {
  const x = stem(a);
  const y = stem(b);
  return x.length > 0 && x === y;
}

/**
 * Vérifie un indice avant envoi. Renvoie un message d'erreur, ou null si le mot est accepté.
 * @param {string} text          le mot que le joueur veut donner
 * @param {string|null} ownWord  son mot secret (null pour Mr White)
 * @param {Record<string, string[]>} descriptions  mots déjà donnés, par joueur
 */
export function clueError(text, ownWord, descriptions) {
  if (ownWord && sameWord(text, ownWord)) return 'Tu ne peux pas donner ton propre mot.';
  const taken = Object.values(descriptions || {}).some(words => words.some(w => sameWord(w, text)));
  if (taken) return 'Ce mot a déjà été donné, trouves-en un autre.';
  return null;
}
