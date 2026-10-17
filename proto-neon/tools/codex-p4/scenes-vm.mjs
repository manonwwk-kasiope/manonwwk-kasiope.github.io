import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HERE, monde } from './vm.mjs';
const cas = [{ phase: 1, type: 'rayon' }, { phase: 1, type: 'salve' }, { phase: 2, type: 'ciseaux' },
  { phase: 2, type: 'salve' }, { phase: 3, type: 'bond' }, { phase: 3, type: 'salve2' }, { type: 'ruche' }, { type: 'sentinelle' },
  { phase: 3, type: 'mines-contact' }, { phase: 3, type: 'mines-souffle' }];
if (process.argv.includes('--scene')) {
  const i = process.argv.indexOf('--scene'), ref = process.argv[i + 1], opts = JSON.parse(process.argv[i + 2]);
  const m = monde(ref === 'courant' ? null : ref);
  vm.runInContext(fs.readFileSync(path.join(HERE, 'sonde.js'), 'utf8'), m.c);
  m.c.opts = opts;
  const result = vm.runInContext('__P4.scene(opts)', m.c);
  console.log(JSON.stringify({ ...result, erreursConsole: m.erreurs }));
} else {
  const validation = JSON.parse(fs.readFileSync(path.join(HERE, 'validation-vm.json')));
  if (validation.controles.length < 10 || validation.controles.some(c => !c.identique)) throw Error('VM non validée');
  const bilans = [];
  for (const ref of ['85b389d', 'courant']) for (const opts of cas) {
    const r = JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--scene', ref, JSON.stringify(opts)], { maxBuffer: 64000000 }).toString());
    const fichier = `${ref}-${opts.phase || 0}-${opts.type}.json.gz`;
    fs.writeFileSync(path.join(HERE, fichier), zlib.gzipSync(JSON.stringify(r)));
    const { trace, journal, creations, ...resume } = r;
    bilans.push({ ref, fichier, ...resume, creations: creations.length, images: trace.length });
    fs.writeFileSync(path.join(HERE, 'scenes-vm.json'), JSON.stringify(bilans, null, 2));
    console.log(JSON.stringify({ ref, phase: r.phase, type: r.type, avance: r.avance, couverture: r.couverture, borne: r.borne, err: r.err }));
  }
}
