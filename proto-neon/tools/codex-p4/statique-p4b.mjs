// Orchestration strictement sans serveur, DOM ni lancement navigateur.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { HERE } from './vm.mjs';
for (const [script, args] of [['vm.mjs', ['--valider']], ['scenes-vm.mjs', []], ['hors-champ-vm.mjs', []], ['parties-vm.mjs', []]]) {
  const sortie = execFileSync(process.execPath, [path.join(HERE, script), ...args], { maxBuffer: 64000000 });
  fs.writeFileSync(path.join(HERE, script.replace('.mjs', '-statique.log')), sortie);
  console.log(`${script} : sortie 0`);
}
console.log('VM validée, mines et hors-champ vérifiés, 12 parties avant/après ; pixels et navigateur à vérifier hors bac.');
