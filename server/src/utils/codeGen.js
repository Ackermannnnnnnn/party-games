import { customAlphabet } from 'nanoid';

// Alphabet sans caractères ambigus (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generate = customAlphabet(ALPHABET, 6);

export function generateRoomCode() {
  return generate();
}

export function generatePlayerId() {
  // UUID-ish, 16 chars, anti-collision suffisant
  return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16)();
}
