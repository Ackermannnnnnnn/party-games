import { BaseGame } from '../../core/BaseGame.js';
import { logger } from '../../utils/logger.js';
import { randomPrompts } from './prompts.js';
import { sanitizeStrokes } from './drawing.js';

/**
 * Gartic Phone (téléphone arabe en dessins).
 *
 * Chaque joueur démarre un "album" avec une phrase. À chaque étape, les albums
 * tournent : on dessine la phrase reçue, puis on décrit le dessin reçu, etc.
 *
 * Phases :
 *   WRITE -> tout le monde écrit une phrase                       (étape 0)
 *   DRAW  -> tout le monde dessine la phrase reçue                (étapes impaires)
 *   GUESS -> tout le monde écrit ce qu'il voit sur le dessin reçu (étapes paires)
 *   ALBUM -> l'hôte révèle les albums un par un, entrée par entrée
 *
 * Rotation : les joueurs sont dans un ordre mélangé `order`. L'album n°i démarre chez
 * order[i] ; à l'étape s il est chez order[(i + s) % N]. Avec au plus N étapes, personne
 * ne retombe jamais sur un album déjà vu, et personne ne reçoit sa propre phrase.
 */
const PHASES = { WRITE: 'WRITE', DRAW: 'DRAW', GUESS: 'GUESS', ALBUM: 'ALBUM' };

/** Délai laissé après la fin du minuteur pour recevoir les envois automatiques des clients. */
const GRACE_MS = 3000;
/** Compte à rebours quand l'hôte force la suite : laisse le temps d'envoyer les brouillons en cours. */
const FORCE_DELAY_MS = 3000;
const MAX_TEXT_LENGTH = 80;

const DEFAULT_OPTIONS = {
  writeSec: 60,   // temps pour écrire la phrase de départ
  drawSec: 90,    // temps pour dessiner
  guessSec: 45,   // temps pour décrire un dessin
  turns: 0,       // nombre d'étapes ; 0 = automatique (autant que de joueurs)
};

const LIMITS = {
  writeSec: { min: 20, max: 180 },
  drawSec:  { min: 30, max: 300 },
  guessSec: { min: 20, max: 180 },
  turns:    { min: 3,  max: 12 },
};

const clampInt = (v, { min, max }, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

function cleanText(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export class TelephoneGame extends BaseGame {
  static id = 'telephone';
  static label = 'Gartic Phone';
  static minPlayers = 3;
  static maxPlayers = 12;

  static getOptionsManifest() {
    return { defaults: DEFAULT_OPTIONS, limits: LIMITS };
  }

  constructor(room, options = {}) {
    super(room, options);
    this.options = this._sanitizeOptions(options);

    this.round = 0;
    this.gameKey = '';            // identifiant unique de la partie (clé des brouillons côté client)
    this.order = [];              // participants, dans l'ordre de rotation
    this.snapshot = new Map();    // playerId -> { pseudo, avatar } (pour l'album, même s'ils partent)
    this.chains = [];             // [{ ownerId, entries: [{ type, authorId, text | strokes, auto }] }]
    this.step = 0;
    this.totalSteps = 0;
    this.stepEndsAt = null;
    this.stepDurationSec = 0;
    this.forcing = false;         // l'hôte a demandé à passer à la suite
    this.submissions = new Map(); // playerId -> contenu envoyé pour l'étape en cours
    this.doneIds = new Set();     // joueurs qui ont validé (peuvent encore modifier)
    this.suggestions = new Map(); // playerId -> [phrases proposées à l'étape 0]

    // Album
    this.albumIdx = 0;
    this.shown = 0;               // nombre d'entrées révélées dans l'album courant
    this.seen = [];               // entrées déjà révélées, par album
    this.albumFinished = false;
  }

  _sanitizeOptions(raw) {
    const o = { ...DEFAULT_OPTIONS, ...(raw || {}) };
    o.writeSec = clampInt(o.writeSec, LIMITS.writeSec, DEFAULT_OPTIONS.writeSec);
    o.drawSec  = clampInt(o.drawSec, LIMITS.drawSec, DEFAULT_OPTIONS.drawSec);
    o.guessSec = clampInt(o.guessSec, LIMITS.guessSec, DEFAULT_OPTIONS.guessSec);
    const turns = parseInt(o.turns, 10);
    o.turns = turns > 0 ? clampInt(turns, LIMITS.turns, 0) : 0;
    return o;
  }

  // ───────── Helpers ─────────
  _isConnected(id) { return !!this.room.players.get(id)?.connected; }
  /** Joueurs dont on attend l'envoi : participants présents et connectés. */
  _requiredIds() { return this.order.filter(id => this._isConnected(id)); }
  _presentCount() { return this.order.filter(id => this.room.players.has(id)).length; }
  _person(id) {
    const s = this.snapshot.get(id);
    return { id, pseudo: s?.pseudo || '?', avatar: s?.avatar || null };
  }
  _typeOfStep(step) {
    if (step === 0) return 'WRITE';
    return step % 2 === 1 ? 'DRAW' : 'GUESS';
  }
  /** Index de l'album que le joueur traite à l'étape en cours. */
  _chainIndexFor(playerId) {
    const n = this.order.length;
    const j = this.order.indexOf(playerId);
    if (j < 0) return -1;
    return ((j - this.step) % n + n) % n;
  }
  /** Ce que le joueur doit dessiner / décrire à cette étape (dernière entrée de son album). */
  _promptFor(playerId) {
    if (this.step === 0) return null;
    const chain = this.chains[this._chainIndexFor(playerId)];
    return chain?.entries[this.step - 1] || null;
  }

  isSpectator(playerId) { return !this.order.includes(playerId); }

  // ───────── Lifecycle ─────────
  start() {
    if (!this._startNewGame()) {
      this.room.broadcast('error', { code: 'NOT_ENOUGH_PLAYERS', message: `Min ${TelephoneGame.minPlayers} joueurs.` });
      this.room.endGame({ aborted: true });
    }
  }

  _startNewGame() {
    const ids = this.playerIds.filter(id => this._isConnected(id));
    if (ids.length < TelephoneGame.minPlayers) return false;

    this.clearAllTimers();
    this.round += 1;
    this.gameKey = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.order = this.shuffle(ids);
    this.snapshot = new Map(ids.map(id => {
      const p = this.room.players.get(id);
      return [id, { pseudo: p.pseudo, avatar: p.avatar }];
    }));
    this.chains = this.order.map(ownerId => ({ ownerId, entries: [] }));
    this.step = 0;
    // Jamais plus d'étapes que de joueurs : sinon quelqu'un reverrait un album
    this.totalSteps = this.options.turns > 0 ? Math.min(this.options.turns, ids.length) : ids.length;
    this.suggestions = new Map(ids.map(id => [id, randomPrompts(3)]));
    this.albumIdx = 0;
    this.shown = 0;
    this.seen = [];
    this.albumFinished = false;

    logger.info({ room: this.room.code, round: this.round, players: ids.length, steps: this.totalSteps }, 'Gartic Phone: new game');
    this._startStep();
    return true;
  }

  _startStep() {
    this.clearAllTimers();
    this.submissions.clear();
    this.doneIds.clear();
    this.forcing = false;
    const type = this._typeOfStep(this.step);
    this.stepDurationSec = type === 'WRITE' ? this.options.writeSec
                         : type === 'DRAW'  ? this.options.drawSec
                         : this.options.guessSec;
    this.stepEndsAt = Date.now() + this.stepDurationSec * 1000;
    this.setPhase(PHASES[type]);
    // Les clients envoient automatiquement leur brouillon à la fin du minuteur :
    // on attend un court délai avant de compléter ce qui manque.
    this.setTimer(this.stepDurationSec * 1000 + GRACE_MS, () => this._resolveStep());
  }

  /** Clôt l'étape : range chaque envoi dans son album (ou un contenu de secours), puis passe à la suite. */
  _resolveStep() {
    if (this.phase === PHASES.ALBUM) return;
    this.clearAllTimers();
    const n = this.order.length;
    const type = this._typeOfStep(this.step);

    this.chains.forEach((chain, i) => {
      const authorId = this.order[(i + this.step) % n];
      const sent = this.submissions.get(authorId);
      if (type === 'DRAW') {
        chain.entries.push({ type: 'drawing', authorId, strokes: sent ?? [], auto: sent === undefined });
      } else {
        let text = sent;
        if (!text) {
          // Rien reçu : phrase suggérée au départ, sinon on reprend le dernier texte de l'album
          const previousText = [...chain.entries].reverse().find(e => e.type === 'text')?.text;
          text = type === 'WRITE'
            ? (this.suggestions.get(authorId)?.[0] || randomPrompts(1)[0])
            : (previousText || randomPrompts(1)[0]);
        }
        chain.entries.push({ type: 'text', authorId, text, auto: !sent });
      }
    });

    this.step += 1;
    if (this.step >= this.totalSteps || this._presentCount() < 2) this._startAlbum();
    else this._startStep();
  }

  _checkAllDone() {
    if (this.phase === PHASES.ALBUM) return;
    const required = this._requiredIds();
    if (required.length > 0 && required.every(id => this.doneIds.has(id))) this._resolveStep();
  }

  _startAlbum() {
    this.clearAllTimers();
    this.stepEndsAt = null;
    this.albumIdx = 0;
    this.shown = 1;
    this.seen = this.chains.map((_, i) => (i === 0 ? 1 : 0));
    this.albumFinished = false;
    this.setPhase(PHASES.ALBUM);
  }

  // ───────── Hooks room ─────────
  onPlayerJoinedMidGame() {
    // Arrivé en cours : spectateur jusqu'à la prochaine partie (il verra quand même l'album).
    this.room.emitGameState();
  }

  /** Un joueur a quitté définitivement : ses prochaines étapes seront complétées automatiquement. */
  onPlayerLeft(playerId) {
    if (this.isSpectator(playerId) || this.phase === PHASES.ALBUM) return;
    this.doneIds.delete(playerId);
    if (this._presentCount() < 2) {
      // Plus assez de monde pour continuer : on montre ce qui a déjà été fait
      if (this.step > 0) {
        this._startAlbum();
      } else {
        this.cleanup();
        this.room.endGame({ aborted: true, game: 'telephone' });
      }
      return;
    }
    this.room.emitGameState();
    this._checkAllDone();
  }

  // ───────── Actions joueurs ─────────
  handleAction(playerId, type, payload) {
    const hostOnly = ['forceNext', 'albumNext', 'albumGoto', 'restart', 'endGame'];
    if (hostOnly.includes(type)) {
      if (playerId !== this.room.hostId) return this._error(playerId, 'NOT_HOST', "Seul l'hôte peut faire ça.");
    } else if (this.isSpectator(playerId)) {
      return this._error(playerId, 'SPECTATOR', 'Tu es spectateur, attends la prochaine partie.');
    }

    switch (type) {
      case 'submitText':    return this._onSubmitText(playerId, payload);
      case 'submitDrawing': return this._onSubmitDrawing(playerId, payload);
      case 'edit':          return this._onEdit(playerId);
      case 'forceNext':     return this._onForceNext(playerId);
      case 'albumNext':     return this._onAlbumNext(playerId);
      case 'albumGoto':     return this._onAlbumGoto(playerId, payload);
      case 'restart':       return this._onRestart(playerId);
      case 'endGame':       return this._onEndGame();
      default:
        return this._error(playerId, 'UNKNOWN_ACTION', `Action inconnue: ${type}`);
    }
  }

  /** Vérifie que l'envoi correspond bien à l'étape en cours (un envoi en retard est ignoré sans bruit). */
  _acceptsSubmission(playerId, payload, phases) {
    if (!phases.includes(this.phase)) return false;
    if (payload?.step !== undefined && payload.step !== this.step) return false;
    return true;
  }

  _onSubmitText(playerId, payload) {
    if (!this._acceptsSubmission(playerId, payload, [PHASES.WRITE, PHASES.GUESS])) return;
    const text = cleanText(payload?.text);
    // `draft` = envoi automatique en fin de minuteur : on garde le texte sans valider le joueur
    if (!text) {
      if (payload?.draft) return;
      return this._error(playerId, 'EMPTY_TEXT', 'Écris quelque chose.');
    }
    this.submissions.set(playerId, text);
    this._markDone(playerId, payload);
  }

  _onSubmitDrawing(playerId, payload) {
    if (!this._acceptsSubmission(playerId, payload, [PHASES.DRAW])) return;
    const strokes = sanitizeStrokes(payload?.strokes);
    if (!strokes) return this._error(playerId, 'BAD_DRAWING', 'Dessin invalide.');
    this.submissions.set(playerId, strokes);
    this._markDone(playerId, payload);
  }

  _markDone(playerId, payload) {
    if (payload?.draft) return;   // brouillon : enregistré, mais on n'avance pas l'étape
    this.doneIds.add(playerId);
    this.room.emitGameState();
    this._checkAllDone();
  }

  /** Le joueur veut modifier son envoi tant que l'étape n'est pas finie. */
  _onEdit(playerId) {
    if (this.phase === PHASES.ALBUM) return;
    if (!this.doneIds.delete(playerId)) return;
    this.room.emitGameState();
  }

  /**
   * L'hôte n'attend plus les retardataires : le minuteur tombe à quelques secondes,
   * le temps que chaque joueur envoie automatiquement ce qu'il a déjà fait.
   */
  _onForceNext() {
    if (this.phase === PHASES.ALBUM || this.forcing) return;
    this.forcing = true;
    this.clearAllTimers();
    this.stepEndsAt = Date.now() + FORCE_DELAY_MS;
    this.room.emitGameState();
    this.setTimer(FORCE_DELAY_MS + 1200, () => this._resolveStep());
  }

  _onAlbumNext(playerId) {
    if (this.phase !== PHASES.ALBUM) return this._error(playerId, 'BAD_PHASE');
    const chain = this.chains[this.albumIdx];
    if (this.shown < chain.entries.length) {
      this.shown += 1;
    } else if (this.albumIdx < this.chains.length - 1) {
      this.albumIdx += 1;
      this.shown = Math.max(1, this.seen[this.albumIdx]);
    } else {
      this.albumFinished = true;
    }
    this.seen[this.albumIdx] = Math.max(this.seen[this.albumIdx], this.shown);
    if (this.seen.every((count, i) => count >= this.chains[i].entries.length)) this.albumFinished = true;
    this.room.emitGameState();
  }

  /** Revoir un album : il se rouvre là où on s'était arrêté. */
  _onAlbumGoto(playerId, payload) {
    if (this.phase !== PHASES.ALBUM) return this._error(playerId, 'BAD_PHASE');
    const idx = parseInt(payload?.index, 10);
    if (!(idx >= 0 && idx < this.chains.length)) return this._error(playerId, 'BAD_ALBUM');
    this.albumIdx = idx;
    this.shown = Math.max(1, this.seen[idx]);
    this.seen[idx] = this.shown;
    this.room.emitGameState();
  }

  _onRestart(playerId) {
    if (this.phase !== PHASES.ALBUM) return this._error(playerId, 'BAD_PHASE');
    if (!this._startNewGame()) {
      return this._error(playerId, 'NOT_ENOUGH_PLAYERS', `Il faut au moins ${TelephoneGame.minPlayers} joueurs connectés.`);
    }
  }

  _onEndGame() {
    this.cleanup();
    this.room.endGame({ game: 'telephone', rounds: this.round });
  }

  // ───────── States ─────────
  getPublicState() {
    const base = {
      phase: this.phase,
      round: this.round,
      gameKey: this.gameKey,
      step: this.step,
      totalSteps: this.totalSteps,
      players: this.order.map(id => this._person(id)),
    };

    if (this.phase === PHASES.ALBUM) {
      const chain = this.chains[this.albumIdx];
      return {
        ...base,
        albumIdx: this.albumIdx,
        albumCount: this.chains.length,
        owner: this._person(chain.ownerId),
        total: chain.entries.length,
        // Seules les entrées déjà révélées de l'album courant sont envoyées
        entries: chain.entries.slice(0, this.shown).map(e => ({
          type: e.type,
          author: this._person(e.authorId),
          auto: e.auto,
          ...(e.type === 'text' ? { text: e.text } : { strokes: e.strokes }),
        })),
        albums: this.chains.map((c, i) => ({
          owner: this._person(c.ownerId),
          done: this.seen[i] >= c.entries.length,
        })),
        finished: this.albumFinished,
      };
    }

    return {
      ...base,
      stepEndsAt: this.stepEndsAt,
      stepDurationSec: this.stepDurationSec,
      doneIds: [...this.doneIds],
      requiredIds: this._requiredIds(),
    };
  }

  getPrivateStateFor(playerId) {
    if (this.isSpectator(playerId)) {
      // Les spectateurs regardent l'album avec tout le monde, mais ne jouent pas les étapes
      return { spectator: true };
    }
    if (this.phase === PHASES.ALBUM) return {};

    const data = { done: this.doneIds.has(playerId) };
    if (this.phase === PHASES.WRITE) {
      data.suggestions = this.suggestions.get(playerId) || [];
    } else {
      const prompt = this._promptFor(playerId);
      // On ne dit pas qui a écrit / dessiné : la surprise est pour l'album
      if (prompt?.type === 'text') data.prompt = { type: 'text', text: prompt.text };
      if (prompt?.type === 'drawing') data.prompt = { type: 'drawing', strokes: prompt.strokes };
    }
    return data;
  }

  _error(playerId, code, message) {
    this.room.emitToPlayer(playerId, 'error', { code, message: message || code });
  }
}
