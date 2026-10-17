/* tools/musique/chaine.mjs — rend une suite de blocs pour l'ecoute, avec la regle de jointure du jeu.
   node tools/musique/chaine.mjs sortie.wav nv-01 nv-02 nv-05 nv-08 nv-09 ...
   (sortie en .mp3 si le nom finit par .mp3). Chaque bloc joue son coeur, de sa premiere barre a sa
   derniere ; fondu sin2/cos2 de 10 ms centre sur chaque barre, ou commence sur la barre quand le bloc
   entrant n'a rien avant (nv-01). Le premier bloc demarre net, le dernier va au bout de son fichier
   (l'OUTRO garde sa queue). Ecrit aussi la liste des jointures (instant, blocs). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SORTIE, SR, decode, ecrisWav, arr } from './lib.mjs';

const [sortie, ...ids] = process.argv.slice(2);
if (!sortie || ids.length === 0) { console.error('usage : node tools/musique/chaine.mjs sortie.wav nv-01 nv-02 ...'); process.exit(2); }
const P = JSON.parse(fs.readFileSync(path.join(SORTIE, 'piste.json'), 'utf8'));
const blocs = new Map(P.blocs.map(b => [b.id, b]));
const pcm = new Map();
for (const id of new Set(ids)) { if (!blocs.has(id)) throw new Error('bloc inconnu : ' + id); pcm.set(id, decode(path.join(SORTIE, blocs.get(id).fichier))); }
const F = Math.round(0.010 * SR), H = F >> 1;
let total = 0;
ids.forEach((id, k) => { const b = blocs.get(id); total += (k === ids.length - 1 ? b.echantillons.fichier - b.echantillons.coeurDebut : b.echantillons.coeurFin - b.echantillons.coeurDebut); });
const L = new Float32Array(total + F), R = new Float32Array(total + F);
let T = 0; const jonctions = [];
ids.forEach((id, k) => {
  const b = blocs.get(id), x = pcm.get(id), dernier = k === ids.length - 1;
  const sansAvant = b.echantillons.coeurDebut < H;
  const d0 = k === 0 ? 0 : sansAvant ? 0 : -H;                          /* debut du fondu d'entree */
  const nxt = dernier ? null : blocs.get(ids[k + 1]);
  const dF = nxt && nxt.echantillons.coeurDebut < H ? 0 : -H;            /* debut du fondu de sortie */
  const long = b.echantillons.coeurFin - b.echantillons.coeurDebut;
  const finK = dernier ? x.n - b.echantillons.coeurDebut : long + dF + F;
  for (let i = d0; i < finK; i++) {
    const s = b.echantillons.coeurDebut + i, o = T + i;
    if (s < 0 || s >= x.n || o < 0 || o >= L.length) continue;
    let g = 1;
    if (k > 0 && i < d0 + F) g *= Math.sin(0.5 * Math.PI * (i - d0) / F) ** 2;
    if (!dernier && i >= long + dF) g *= Math.cos(0.5 * Math.PI * (i - long - dF) / F) ** 2;
    L[o] += x.L[s] * g; R[o] += x.R[s] * g;
  }
  T += long;
  if (!dernier) jonctions.push({ t: arr(T / SR, 3), de: id, vers: ids[k + 1] });
});
if (sortie.endsWith('.mp3')) {
  const wav = sortie.replace(/\.mp3$/, '') + '.tmp.wav';
  ecrisWav(wav, L, R);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', sortie]);
  fs.rmSync(wav);
  if (r.status !== 0) throw new Error(r.stderr.toString());
} else ecrisWav(sortie, L, R);
console.log('ecrit', sortie, arr(L.length / SR, 2), 's ; jointures :', jonctions.map(j => `${j.t} s ${j.de}->${j.vers}`).join(', '));
