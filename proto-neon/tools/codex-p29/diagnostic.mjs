import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { HERE, jouer } from './vm.mjs';
const args = process.argv.slice(2), ref = args[1] || 'e1bdc6f';
const save = (n, x) => fs.writeFileSync(path.join(HERE, n), JSON.stringify(x, null, 2) + '\n');
const lire = n => JSON.parse(fs.existsSync(path.join(HERE, n)) ? fs.readFileSync(path.join(HERE, n), 'utf8') : zlib.gunzipSync(fs.readFileSync(path.join(HERE, n + '.gz'))).toString('utf8'));
if (args[0] === 'valider') {
  const reference = JSON.parse(fs.readFileSync(path.resolve(HERE, '../pilotes/sortie.json')));
  const choix = reference.cas.filter(c => c.graine <= 2 && c.pilote !== 'dieu');
  const out = [];
  for (const c of choix) {
    const r = jouer('e1bdc6f', c.pilote, c.graine);
    const champs = ['tempsJeu', 'tempsCombat', 'vague', 'score', 'raison'];
    const ecarts = champs.filter(k => c[k] !== r[k]).map(k => ({ champ: k, attendu: c[k], obtenu: r[k] }));
    out.push({ pilote: c.pilote, graine: c.graine, identique: !ecarts.length && !r.err.count, ecarts, err: r.err });
    console.log(JSON.stringify(out.at(-1))); save('validation-vm.json', out);
  }
  if (out.filter(c => c.identique).length < 10) process.exitCode = 1;
} else if (args[0] === 'mesurer') {
  const valid = lire('validation-vm.json');
  if (valid.filter(c => c.identique).length < 10) throw new Error('VM non validée');
  const n = +(args[2] || 5), cas = [], file = `mesure-${ref}-${n}.json`;
  for (const pilote of ['bon', 'humain', 'expert', 'maladroit']) for (let graine = 1; graine <= n; graine++) {
    const r = jouer(ref, pilote, graine, { protocole: 'batterie', diagnostic: args.includes('--observer') });
    cas.push(r); console.log(JSON.stringify({ ref, pilote, graine, t: r.tempsJeu, morts: r.morts.length, err: r.err.count }));
    const morts = cas.flatMap(c => c.morts.filter(m => !['mur', 'morsure', 'traine'].includes(m.cause)).map(m => ({ pilote: c.pilote, graine: c.graine, ...m })));
    const fautives = morts.filter(m => !(m.visibleDepuis >= 0.6 - 1e-6));
    save(file, { ref, graines: n, morts: morts.length, justes: morts.length - fautives.length, part: (morts.length - fautives.length) / morts.length, fautives, cas });
  }
} else if (args[0] === 'observer') {
  const pilote = args[2], graine = +args[3];
  const r = jouer(ref, pilote, graine, { protocole: 'batterie', diagnostic: true });
  const baseline = lire(`mesure-${ref}-5.json`).cas.find(c => c.pilote === pilote && c.graine === graine);
  const champs = ['raison', 'tempsJeu', 'tempsCombat', 'vague', 'score', 'morts', 'journal'];
  const ecarts = champs.filter(k => JSON.stringify(baseline[k]) !== JSON.stringify(r[k]));
  const out = { ref, pilote, graine, observationNeutre: !ecarts.length, ecarts, ...r };
  save(`observation-${ref}-${pilote}-${graine}.json`, out);
  console.log(JSON.stringify({ ref, pilote, graine, observationNeutre: out.observationNeutre, ecarts, morts: r.traces.length, err: r.err }));
  if (ecarts.length || r.err.count) process.exitCode = 1;
} else throw new Error('valider | mesurer REF [graines=5] | observer REF PILOTE GRAINE');
