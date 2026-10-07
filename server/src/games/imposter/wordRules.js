/**
 * Règles de comparaison des mots (indices donnés pendant le tour de parole).
 * ⚠️ Dupliqué côté client dans client/src/games/imposter/wordRules.js :
 *    garder les deux fichiers identiques sur `normalizeWord` / `sameWord`.
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
