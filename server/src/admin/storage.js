import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = path.join(path.dirname(__filename), '../../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export function readJSON(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`[storage] Failed to read ${filename}, using default`, e);
    return defaultValue;
  }
}

export function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
