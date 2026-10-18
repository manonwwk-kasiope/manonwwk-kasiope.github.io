import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ICI, sources, chargerAvant, compiler, jouer, sauver, dateParis, hash } from './vm.mjs';
export function bilan(cas) {
  const out = {};
  for (const pilote of [...new Set(cas.map(c => c.pilote))]) {
    const jeux = cas.filter(c => c.pilote === pilote), tranches = { '8-20': { n: 0, ok: 0, temps: 0 }, '21-29': { n: 0, ok: 0, temps: 0 }, '30-40': { n: 0, ok: 0, temps: 0 } }, raisons = {};
    const tranche = L => L >= 8 && L <= 20 ? '8-20' : L >= 21 && L <= 29 ? '21-29' : L >= 30 && L <= 40 ? '30-40' : null;
    const parties = jeux.map(r => {
      const J = r.journal;
      for (let i = 0; i < J.length; i++) {
        const x = J[i];
        if (x.type === 'pilote' && x.d.evt === 'lassoFin') raisons[x.d.raison] = (raisons[x.d.raison] || 0) + 1;
        if (x.type !== 'pilote' || x.d.evt !== 'lassoTente') continue;
        const cle = tranche(x.d.longueur); if (!cle) continue;
        const t = tranches[cle]; t.n++;
        for (let k = i + 1; k < J.length; k++) {
          if (J[k].type === 'lasso' && J[k].d.n > 0) { t.ok++; break; }
          if (J[k].type === 'pilote' && ['lassoFin', 'lassoTente'].includes(J[k].d.evt)) break;
        }
      }
      for (let i = 1; i < r.echantillons.length; i++) {
        const e = r.echantillons[i], cle = tranche(e.len);
        if (cle) tranches[cle].temps += e.t - r.echantillons[i - 1].t;
      }
      return { graine: r.graine, fin: r.etat === 'fin', temps: r.tempsJeu, vague: r.vague, score: r.score, err: r.err,
        lassos: J.filter(e => e.type === 'lasso' && e.d.n > 0).length, apogees: J.filter(e => e.type === 'apogee' && e.d.evt === 'debut').length };
    });
    for (const t of Object.values(tranches)) { t.reussite = t.n ? t.ok / t.n : null; t.parMinute = t.temps ? t.ok * 60 / t.temps : null; }
    const med = arr => { arr = arr.slice().sort((a,b) => a-b); return arr.length % 2 ? arr[(arr.length-1)/2] : (arr[arr.length/2-1] + arr[arr.length/2])/2; };
    out[pilote] = { tranches, raisons, parties, lassosMediane: med(parties.map(r => r.lassos)), apogeesMediane: med(parties.map(r => r.apogees)), lassosMoyens: parties.reduce((s, r) => s + r.lassos, 0) / parties.length, apogeesMoyennes: parties.reduce((s, r) => s + r.apogees, 0) / parties.length };
  }
  return out;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!JSON.parse(fs.readFileSync(path.join(ICI, 'validation-vm.json'))).conformite) throw Error('VM non validée');
  const label = process.argv[2] || 'avant', n = +(process.argv[3] || 20), names = (process.argv[4] || 'humain,expert').split(',');
  const src = label === 'avant' ? chargerAvant() : sources(), signature = hash(src), script = compiler(src), cas = [];
  fs.mkdirSync(path.join(ICI, 'recus'), { recursive: true });
  for (const pilote of names) for (let graine = 1; graine <= n; graine++) {
    const file = path.join(ICI, 'recus', `${signature.slice(0, 12)}-${pilote}-${graine}.json.gz`);
    const r = fs.existsSync(file) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(file))) : jouer(script, pilote, graine);
    if (!fs.existsSync(file)) fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(r)));
    cas.push(r); sauver(label + '.json', { dateParis: dateParis(), sourcesSha256: signature, bilan: bilan(cas), recus: cas.map(x => `${signature.slice(0, 12)}-${x.pilote}-${x.graine}.json.gz`) });
    console.log(JSON.stringify({ label, pilote, graine, temps: r.tempsJeu, score: r.score, raison: r.raison, err: r.err, ...bilan([r])[pilote].tranches }));
  }
  if (cas.some(r => r.etat !== 'fin' || r.err || r.erreursConsole.length)) process.exitCode = 1;
}
