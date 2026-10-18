import { role, withArticle } from './roles.js';

/**
 * Texte du meneur de jeu pour l'état courant (identique pour tout le monde :
 * rien de secret ici). `name(id)` renvoie le pseudo d'un joueur.
 */
export function narrate(s, name) {
  if (!s) return { title: '', text: '' };
  const n = s.night;
  const reveal = s.options?.revealRoles;
  const deathLine = (d) => {
    const who = name(d.id);
    const was = d.role ? ` C'était ${withArticle(d.role, true)}.` : '';
    if (d.cause === 'love') return `${who} est mort de chagrin.${was}`;
    return d.role ? `${who} était ${withArticle(d.role, true)}.` : '';
  };
  switch (s.phase) {
    case 'DEAL':
      return { title: 'Thiercelieux', text: 'Découvrez vos cartes en secret. Ne montrez votre écran à personne.' };
    case 'NIGHT':
      switch (s.step) {
        case 'DUSK': return { title: `Nuit ${n}`, text: n === 1 ? 'La nuit tombe sur Thiercelieux. Tout le village ferme les yeux…' : 'La nuit retombe sur le village. Fermez les yeux…' };
        case 'CUPIDON': return { title: 'Cupidon', text: 'Cupidon se réveille et décoche ses flèches : il désigne deux amoureux.' };
        case 'LOVERS': return { title: 'Les amoureux', text: 'Les amoureux se réveillent, se découvrent… et se rendorment, le cœur battant.' };
        case 'GUARD': return { title: 'Le garde', text: 'Le garde se réveille et choisit qui protéger cette nuit.' };
        case 'WOLVES': return { title: 'Les loups-garous', text: 'Les loups-garous se réveillent, se reconnaissent et choisissent leur victime.' };
        case 'WHITE_WOLF': return { title: 'Le loup blanc', text: 'Le loup blanc se réveille… et peut dévorer l\'un des siens.' };
        case 'SEER': return { title: 'La voyante', text: 'La voyante se réveille et sonde l\'âme d\'un joueur.' };
        case 'WITCH': return { title: 'La sorcière', text: 'La sorcière se réveille. Elle découvre la victime… va-t-elle utiliser ses potions ?' };
        default: return { title: `Nuit ${n}`, text: 'Le village dort.' };
      }
    case 'MORNING': {
      const deaths = s.morning?.deaths || [];
      if (!deaths.length) return { title: `Jour ${n}`, text: 'Le soleil se lève sur Thiercelieux… et miracle, personne n\'est mort cette nuit !' };
      const names = deaths.map((d) => name(d.id));
      const intro = deaths.length === 1 ? `Le soleil se lève. Cette nuit, ${names[0]} a été retrouvé sans vie.` : `Le soleil se lève sur un triste spectacle : ${names.slice(0, -1).join(', ')} et ${names.at(-1)} sont morts cette nuit.`;
      const roles = reveal ? ' ' + deaths.map(deathLine).join(' ') : '';
      return { title: `Jour ${n}`, text: intro + roles };
    }
    case 'HUNTER': return { title: 'Le chasseur', text: `${name(s.hunterId)} était chasseur ! Dans un dernier souffle, il épaule son fusil…` };
    case 'SUCCESSION': return { title: 'Le maire est mort', text: `${name(s.successionFrom)} doit désigner son successeur avant de rendre l'âme.` };
    case 'MAYOR_ELECTION': return { title: 'Élection du maire', text: 'Avant de débattre, le village doit élire son maire. Sa voix comptera double.' };
    case 'MAYOR_ELECTED': return { title: 'Vive le maire !', text: `${name(s.mayorId)} est élu maire de Thiercelieux.` };
    case 'DEBATE': return { title: `Jour ${n} — le débat`, text: 'Qui sont les loups-garous ? Débattez, accusez… puis votez pour éliminer un suspect.' };
    case 'RUNOFF': return { title: 'Égalité !', text: `Second tour entre ${(s.candidates || []).map(name).join(' et ')}. Votez à nouveau.` };
    case 'TIEBREAK': return { title: 'Encore une égalité', text: `Le maire ${name(s.mayorId)} doit trancher entre ${(s.candidates || []).map(name).join(' et ')}.` };
    case 'EXECUTION': {
      const e = s.execution;
      if (!e?.id) return { title: 'Le village hésite', text: e?.tie ? 'Impossible de se départager : personne n\'est éliminé aujourd\'hui.' : 'Le village n\'a désigné personne. Tout le monde rentre chez soi…' };
      const who = name(e.id);
      const what = e.role ? ` C'était ${withArticle(e.role, true)}${e.role === 'loup_garou' || e.role === 'loup_blanc' ? ' !' : '…'}` : '';
      const also = (e.also || []).map((d) => ` ${name(d.id)} meurt de chagrin.`).join('');
      return { title: 'Le verdict', text: `Le village a tranché : ${who} est éliminé.${what}${also}` };
    }
    case 'GAME_OVER': return { title: 'Fin de la partie', text: '' };
    default: return { title: '', text: '' };
  }
}

/** Clé qui change quand il y a quelque chose de nouveau à annoncer. */
export function narrationKey(s) {
  if (!s) return '';
  return `${s.gameNo}-${s.phase}-${s.step || ''}-${s.night}-${s.phase === 'RUNOFF' ? (s.candidates || []).join() : ''}`;
}

// ───────── Voix (synthèse vocale du navigateur) ─────────
let frVoice = null;
function pickVoice() {
  try {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const fr = voices.filter((v) => /^fr/i.test(v.lang));
    frVoice = fr.find((v) => /google|thomas|amelie|audrey|daniel|paul|hortense|denise/i.test(v.name)) || fr[0] || null;
  } catch { frVoice = null; }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function canSpeak() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

export function speak(text) {
  if (!canSpeak() || !text) return;
  try {
    if (localStorage.getItem('soundMuted') === '1') return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (frVoice) u.voice = frVoice;
    u.rate = 0.93;
    u.pitch = 0.85;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

export function roleLine(roleId) {
  const r = role(roleId);
  return `${r.icon} ${r.label}`;
}
