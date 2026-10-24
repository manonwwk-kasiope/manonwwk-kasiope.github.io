import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { HERE, ROOT, jouerIsole } from './vm.mjs';
const validation = JSON.parse(fs.readFileSync(path.join(HERE, 'validation-vm.json')));
if (validation.controles.length < 10 || validation.controles.some(c => !c.identique)) throw Error('VM non validée');
const resultat = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), base: '098bd37',
  apresSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'index.html'))).digest('hex'), cas: [] };
for (const [version, ref] of [['avant', resultat.base], ['apres', null]]) {
  if (version === 'apres') resultat.apresSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'index.html'))).digest('hex');
  for (const pilote of ['dieu', 'bon']) for (const graine of [1, 2, 3]) {
    const r = jouerIsole(ref, pilote, graine);
    fs.writeFileSync(path.join(HERE, `p4b-${version}-${pilote}-${graine}.json.gz`), zlib.gzipSync(JSON.stringify(r)));
    const { journal, ...resume } = r; resultat.cas.push({ version, ...resume });
    fs.writeFileSync(path.join(HERE, 'parties-p4b-vm.json'), JSON.stringify(resultat, null, 2));
    console.log(JSON.stringify({ version, pilote, graine, jeu: r.tempsJeu, score: r.score, fin: r.raison, mortsCyclope: r.mortsCyclope, err: r.err }));
  }
}
if (resultat.cas.some(c => c.raison !== 'fin' || c.err || c.erreursConsole.length)) process.exitCode = 1;
