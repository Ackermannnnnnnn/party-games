/**
 * Profils de joueurs (progression Prop Hunt) : XP, niveau, statistiques, succès, tenue choisie.
 *
 * Pas de compte : chaque navigateur a une clé secrète aléatoire (localStorage) envoyée au
 * serveur après avoir rejoint une room (« profile:hello »). Le profil suit cette clé.
 *
 * Stockage : dépôt GitHub, branche « data », fichier profiles/profiles.json (écriture groupée,
 * aucun redéploiement) ; sans GITHUB_TOKEN : server/data/profiles.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { githubEnabled, readText, commitFiles } from '../utils/github.js';
import { logger } from '../utils/logger.js';

const BRANCH = () => process.env.PROFILES_BRANCH || process.env.HISTORY_BRANCH || 'data';
const FILE = 'profiles/profiles.json';
const LOCAL = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/profiles.json');
const FLUSH_MS = 45_000;
export const KEY_RE = /^[a-z0-9-]{16,64}$/;

/** XP totale nécessaire pour atteindre le niveau L. */
export const xpForLevel = (L) => 60 * L * (L - 1);
export function levelOf(xp) { let L = 1; while (xpForLevel(L + 1) <= xp) L += 1; return L; }

/** Tenues (chasseur) et titres débloqués par niveau. */
export const SKIN_LEVELS = { survivorMaleB: 1, survivorFemaleA: 1, skaterMaleA: 3, skaterFemaleA: 5, criminalMaleA: 8, cyborgFemaleA: 12, zombieA: 16, zombieC: 20 };
export const TITLES = [[1, 'Débutant'], [3, 'Fouineur'], [5, 'Caméléon'], [8, 'Traqueur'], [12, 'Maître du camouflage'], [16, 'Chasseur d\'élite'], [20, 'Légende du Prop Hunt'], [30, 'Fantôme']];
export const titleOf = (level) => TITLES.filter(([l]) => level >= l).pop()[1];

/** Succès : id → { name, desc, test(profil, stats de la partie) }. */
export const ACHIEVEMENTS = {
  firstBlood: { name: 'Premier sang', desc: 'Trouver un caché', icon: '🎯', test: (p) => p.kills >= 1 },
  hunter25: { name: 'Fin limier', desc: 'Trouver 25 cachés', icon: '🐕', test: (p) => p.kills >= 25 },
  hunter100: { name: 'Prédateur', desc: 'Trouver 100 cachés', icon: '🦅', test: (p) => p.kills >= 100 },
  survivor: { name: 'Invisible', desc: 'Survivre à une manche', icon: '🫥', test: (p) => p.survived >= 1 },
  survivor20: { name: 'Fantôme', desc: 'Survivre à 20 manches', icon: '👻', test: (p) => p.survived >= 20 },
  taunter: { name: 'Provocateur', desc: '50 moqueries', icon: '🎺', test: (p) => p.taunts >= 50 },
  grenade: { name: 'Artificier', desc: 'Trouver un caché à la grenade', icon: '💣', test: (p) => p.grenadeKills >= 1 },
  knife: { name: 'Silencieux', desc: 'Trouver un caché au couteau', icon: '🔪', test: (p) => p.knifeKills >= 1 },
  ace: { name: 'Carton plein', desc: '3 cachés trouvés dans une même manche', icon: '🔥', test: (p, g) => (g?.bestRoundKills || 0) >= 3 },
  lastAlive: { name: 'Dernier debout', desc: 'Être le dernier caché en vie à la fin d\'une manche', icon: '🏆', test: (p, g) => !!g?.lastAlive },
  winner: { name: 'Champion', desc: 'Finir premier d\'une partie', icon: '🥇', test: (p) => p.wins >= 1 },
  veteran: { name: 'Vétéran', desc: 'Jouer 10 parties', icon: '🎖️', test: (p) => p.games >= 10 },
  legend: { name: 'Pilier du salon', desc: 'Jouer 50 parties', icon: '🏛️', test: (p) => p.games >= 50 },
  level10: { name: 'Niveau 10', desc: 'Atteindre le niveau 10', icon: '⭐', test: (p) => levelOf(p.xp) >= 10 },
};

const blank = (key) => ({ key, name: '', xp: 0, games: 0, wins: 0, rounds: 0, kills: 0, deaths: 0, survived: 0, taunts: 0, grenadeKills: 0, knifeKills: 0, hunterRounds: 0, propRounds: 0, achievements: {}, skin: 'survivorMaleB', createdAt: Date.now(), updatedAt: Date.now() });

class ProfileStore {
  constructor() { this.map = null; this.loading = null; this.dirty = false; this.timer = null; }

  async load() {
    if (this.map) return;
    if (!this.loading) {
      this.loading = (async () => {
        let text = null;
        try {
          if (githubEnabled()) text = await readText(FILE, BRANCH());
          else if (fs.existsSync(LOCAL)) text = fs.readFileSync(LOCAL, 'utf8');
        } catch (e) { logger.warn({ err: e?.message }, 'profiles: load failed'); }
        let obj = {};
        try { obj = JSON.parse(text || '{}') || {}; } catch { /* abîmé */ }
        this.map = new Map(Object.entries(obj));
      })().finally(() => { this.loading = null; });
    }
    await this.loading;
  }

  /** Profil (créé si besoin). */
  async get(key) {
    await this.load();
    if (!this.map.has(key)) this.map.set(key, blank(key));
    return { ...blank(key), ...this.map.get(key) };
  }

  /** Version publique (sans la clé). */
  publicView(p) {
    const level = levelOf(p.xp);
    return {
      name: p.name, xp: p.xp, level, title: titleOf(level), levelXp: xpForLevel(level), nextXp: xpForLevel(level + 1),
      games: p.games, wins: p.wins, rounds: p.rounds, kills: p.kills, deaths: p.deaths, survived: p.survived, taunts: p.taunts,
      grenadeKills: p.grenadeKills, knifeKills: p.knifeKills, hunterRounds: p.hunterRounds, propRounds: p.propRounds,
      skin: p.skin, achievements: p.achievements,
    };
  }

  async update(key, fn) {
    const p = await this.get(key);
    fn(p);
    p.updatedAt = Date.now();
    this.map.set(key, p);
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(() => {}), FLUSH_MS);
    return p;
  }

  async flush() {
    if (!this.dirty || !this.map) return;
    this.dirty = false;
    const json = JSON.stringify(Object.fromEntries(this.map));
    try {
      if (githubEnabled()) await commitFiles([{ path: FILE, content: json }], `Profils (${this.map.size})`, { branch: BRANCH(), createIfMissing: true });
      else { fs.mkdirSync(path.dirname(LOCAL), { recursive: true }); fs.writeFileSync(LOCAL, json); }
    } catch (e) {
      logger.error({ err: e?.message }, 'profiles: flush failed, will retry');
      this.dirty = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush().catch(() => {}), FLUSH_MS * 2);
    }
  }
}

export const profileStore = new ProfileStore();

/**
 * Fin de partie Prop Hunt : XP et statistiques pour chaque joueur qui a un profil.
 * entries : [{ key, name, score, rank, stats: { kills, deaths, survived, taunts, grenadeKills, knifeKills, hunterRounds, propRounds, rounds, bestRoundKills, lastAlive } }]
 * Renvoie { [key]: { gained, xp, level, leveledUp, newAchievements: [{ id, name, icon }] } }.
 */
export async function awardGame(entries) {
  const out = {};
  for (const e of entries) {
    if (!e.key || !KEY_RE.test(e.key)) continue;
    const s = e.stats || {};
    const gained = 25 + Math.max(0, e.score) * 8 + (e.rank === 1 ? 40 : e.rank === 2 ? 20 : e.rank === 3 ? 10 : 0);
    let before = 0;
    const p = await profileStore.update(e.key, (pr) => {
      before = levelOf(pr.xp);
      pr.name = e.name || pr.name;
      pr.xp += gained; pr.games += 1; if (e.rank === 1) pr.wins += 1;
      for (const k of ['kills', 'deaths', 'survived', 'taunts', 'grenadeKills', 'knifeKills', 'hunterRounds', 'propRounds', 'rounds']) pr[k] = (pr[k] || 0) + (s[k] || 0);
    });
    const newAch = [];
    await profileStore.update(e.key, (pr) => {
      for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
        if (!pr.achievements[id] && a.test(pr, s)) { pr.achievements[id] = Date.now(); newAch.push({ id, name: a.name, icon: a.icon }); }
      }
    });
    const level = levelOf(p.xp);
    out[e.key] = { gained, xp: p.xp, level, leveledUp: level > before, newAchievements: newAch, title: titleOf(level) };
  }
  return out;
}

// écrit les profils avant l'arrêt du serveur (voir history.js qui attend ces fonctions)
globalThis.__beforeExit = [...(globalThis.__beforeExit || []), () => profileStore.flush()];
