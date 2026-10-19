#!/usr/bin/env node
/**
 * Vérifie que chaque extrait du catalogue Blind Test est bien trouvé sur Deezer.
 *
 *   node tools/blindtest/check-deezer.mjs            → tout le catalogue
 *   node tools/blindtest/check-deezer.mjs anime      → un seul univers
 *
 * Affiche les titres introuvables (à corriger dans server/src/games/blindtest/catalog.js :
 * orthographe de l'artiste/du titre, `q` pour forcer une requête, ou `dz` pour l'id Deezer exact)
 * et écrit un rapport complet dans tools/blindtest/report.json.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATALOG } from '../../server/src/games/blindtest/catalog.js';
import { resolveEntry } from '../../server/src/games/blindtest/deezer.js';

const only = process.argv[2];
const list = CATALOG.filter((e) => !only || e.universe === only);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const report = [];
let ok = 0;
console.log(`Vérification de ${list.length} extraits sur Deezer…\n`);
for (const [i, e] of list.entries()) {
  let info = null; let error = null;
  try { info = await resolveEntry(e); } catch (err) { error = err.message; }
  const line = `${e.universe.padEnd(8)} ${e.artist} — ${e.song}`;
  if (info) {
    ok += 1;
    const same = info.dzArtist.toLowerCase() === e.artist.toLowerCase() && info.dzTitle.toLowerCase() === e.song.toLowerCase();
    if (!same) console.log(`  ~ ${line}\n      → trouvé : ${info.dzArtist} — ${info.dzTitle}`);
  } else {
    console.log(`  ✗ ${line}${error ? `  (${error})` : ''}`);
  }
  report.push({ id: e.id, universe: e.universe, artist: e.artist, song: e.song, found: !!info, dzId: info?.trackId || null, dzArtist: info?.dzArtist || null, dzTitle: info?.dzTitle || null, error });
  if ((i + 1) % 20 === 0) console.log(`  … ${i + 1}/${list.length}`);
  await sleep(250); // reste sous la limite de Deezer
}

const out = join(dirname(fileURLToPath(import.meta.url)), 'report.json');
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n✓ ${ok}/${list.length} trouvés · ✗ ${list.length - ok} introuvables (ignorés automatiquement en partie)`);
console.log(`  « ~ » = trouvé sous un nom un peu différent : à vérifier à l'oreille si besoin.`);
console.log(`Rapport : ${out}`);
