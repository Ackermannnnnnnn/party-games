/** Icône façon Cémantix selon la progression (‰) et la température (°C). */
export function scoreIcon({ progress, temp }) {
  if (progress === 1000) return '🥳';
  if (progress >= 999) return '😱';
  if (progress >= 990) return '🔥';
  if (progress >= 900) return '🥵';
  if (progress != null) return '😎';
  if (temp >= 0) return '🥶';
  return '🧊';
}

/** Couleur de la température : bleu glacial -> rouge brûlant. */
export function tempColor(temp) {
  const t = Math.max(-10, Math.min(70, temp ?? -10));
  const hue = 200 - ((t + 10) / 80) * 200;   // 200 = bleu, 0 = rouge
  return `hsl(${hue}, 85%, 65%)`;
}

export const formatTemp = (temp) => (temp == null ? '—' : `${temp.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} °C`);
