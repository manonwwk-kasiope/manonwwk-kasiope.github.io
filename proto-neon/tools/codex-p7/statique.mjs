import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT } from './vm.mjs';
import { preparer } from './preparer.mjs';
const calibration = JSON.parse(fs.readFileSync(new URL('./calibration.json', import.meta.url)));
if (!calibration.valide) throw new Error('VM non calibrée : exécuter calibrer.mjs et résoudre les divergences.');
const tmp = preparer(), sortie = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), calibration: '10/10 e1bdc6f', profils: [] };
try {
  for (const [nom, w, h] of [['paysage', 844, 390], ['portrait', 390, 844], ['bureau', 1440, 900]]) {
    for (const option of [{}, { boss: true }, { expiration: true }]) {
      // Un processus à la fois : chaque VM libère sa mémoire avant la suivante.
      const r = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./vm-cas.mjs', import.meta.url)), path.join(tmp.proto, 'src'), nom, String(w), String(h), JSON.stringify(option)], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
      sortie.profils.push(r);
      console.log(nom, JSON.stringify(option), r.controles.filter(c => !c.ok));
    }
  }
  sortie.conforme = sortie.profils.every(p => p.conforme && !p.console.length);
} finally { tmp.nettoyer(); }
fs.writeFileSync(path.join(ROOT, 'tools/codex-p7/statique.json'), JSON.stringify(sortie, null, 2));
if (!sortie.conforme) process.exitCode = 1;
