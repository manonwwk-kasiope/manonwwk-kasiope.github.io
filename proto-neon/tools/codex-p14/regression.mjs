import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { sources, chargerAvant, compiler, jouer, ICI, sauver, hash, dateParis } from './vm.mjs';
if (!JSON.parse(fs.readFileSync(path.join(ICI, 'validation-vm.json'))).conformite) throw Error('VM non validée');
const bon = process.argv.includes('--bon'), noms = bon ? ['bon'] : ['inerte','tourneur','maladroit','kamikaze','dieu'];
const avant = chargerAvant(), apres = sources(), cas = [], scripts = { avant: compiler(avant), apres: compiler(apres) };
for (const pilote of noms) for (let graine = 1; graine <= (bon ? 5 : 2); graine++) {
  const versions = {};
  for (const version of ['avant','apres']) {
    const src = version === 'avant' ? avant : apres;
    const fichier = `${hash(src).slice(0,12)}-${pilote}-${graine}.json.gz`, p = path.join(ICI,'recus',fichier);
    const r = fs.existsSync(p) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(p))) : jouer(scripts[version],pilote,graine);
    if (!fs.existsSync(p)) fs.writeFileSync(p,zlib.gzipSync(JSON.stringify(r)));
    versions[version] = { tempsJeu:r.tempsJeu,tempsCombat:r.tempsCombat,tempsSimule:r.tempsSimule,vague:r.vague,score:r.score,raison:r.raison,err:r.err,console:r.erreursConsole,journalSha256:hash(r.journal),recus:fichier,
      lassos:r.journal.filter(x=>x.type==='lasso'&&x.d.n>0).length,apogees:r.journal.filter(x=>x.type==='apogee'&&x.d.evt==='debut').length };
  }
  const {recus:a,...aa}=versions.avant, {recus:b,...bb}=versions.apres;
  const identique = JSON.stringify(aa) === JSON.stringify(bb);
  cas.push({pilote,graine,versions,identique});
  sauver(bon?'bon.json':'regression.json',{dateParis:dateParis(),sourcesAvant:hash(avant),sourcesApres:hash(apres),cas});
  console.log(pilote,graine,identique,versions.apres.tempsJeu);
}
if (cas.some(c=>Object.values(c.versions).some(r=>r.err||r.console.length||r.raison!=='fin')) || !bon && cas.some(c=>!c.identique)) process.exitCode=1;
