import { generatePlayerId } from '../utils/codeGen.js';

export class Player {
  constructor({ pseudo, socketId }) {
    this.id = generatePlayerId();
    this.pseudo = pseudo;
    this.socketId = socketId;
    this.connected = true;
    this.joinedAt = Date.now();
  }

  /** État public envoyé à tous (jamais de données secrètes ici). */
  toPublic() {
    return {
      id: this.id,
      pseudo: this.pseudo,
      connected: this.connected,
    };
  }
}
