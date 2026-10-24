// Contrôle du flux asynchrone de 05-art, avec doubles Image/Canvas, sans simuler le jeu.
// Ne mesure ni le décodage réel ni des pixels ; aucune validation de VM de partie n'en est déduite.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = new URL('./', import.meta.url), racine = new URL('../../', here);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
let raf = 0, delais = 0;
const c = {
  N: {}, ART_SRC: { disponible: 'ok', absente: '404' }, CINE_DISPO: [],
  requestAnimationFrame() { raf++; throw Error('RAF interdit dans ce contrôle'); },
  setTimeout() { delais++; return 0; },
  Image: class {
    naturalWidth = 1; naturalHeight = 1;
    set src(s) { queueMicrotask(() => s === '404' ? this.onerror() : this.onload()); }
  },
  document: { addEventListener() {}, createElement() { return { getContext() { return {
    drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([13, 2, 33, 255]) }; }
  }; } }; } }
};
vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('src/05-art.js', racine), 'utf8'), c);
assert.equal(c.N.art.ready(), false);
await c.N.art.load();
assert.equal(c.N.art.ready(), true);
assert.ok(c.N.art.get('disponible'));
assert.equal(c.N.art.get('absente'), null);
assert.equal(raf, 0);

const sources = Object.fromEntries(fs.readdirSync(new URL('src/', racine)).filter(f => f.endsWith('.js')).sort().map(f => [f, fs.readFileSync(new URL('src/' + f, racine), 'utf8')]));
const originales = JSON.parse(JSON.stringify(sources));
const ajout = '\n  /* codex-p16b — attente du banc, indépendante de requestAnimationFrame neutralisé. */\n  R.perf.attenteP16 = { delaiMs: 30000, pollingMs: 100 };\n';
assert.ok(originales['02-regles.js'].includes(ajout));
originales['02-regles.js'] = originales['02-regles.js'].replace(ajout, '');
const recu = JSON.parse(fs.readFileSync(new URL('parties-apres.json', here), 'utf8'));
const empreinte = sha(JSON.stringify(originales));
assert.equal(empreinte, recu.sourcesSha256, 'Les sources diffèrent des parties validées au-delà du seul ajout de paramètres du banc');
const resultat = {
  dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
  art: { readyAvant: false, readyApres: c.N.art.ready(), appelsRAF: raf, delaisDemandes: delais,
    imageEnErreur: c.N.art.get('absente'), interpretation: 'Le onerror résout la promesse ; ready ne prouve pas que toutes les images sont disponibles.',
    limite: 'Doubles Image/Canvas ; aucun décodage ni pixel navigateur mesuré.' },
  reutilisation80: { sourceHashHorsAjoutAttente: empreinte, sourceHashRecu: recu.sourcesSha256, identiques: true,
    partiesRejouees: 0, raison: 'Seul ajout : paramètres du banc non lus par le jeu ; sources de jeu précédemment validées conservées.' },
  sourcesSha256: sha(JSON.stringify(sources)), ok: true
};
fs.writeFileSync(new URL('controle-sans-navigateur.json', here), JSON.stringify(resultat, null, 2) + '\n');
console.log('Flux art et réemploi des preuves : OK (aucun serveur, aucun navigateur).');
