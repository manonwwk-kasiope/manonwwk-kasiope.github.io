import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { ROOT } from './vm.mjs';
export function preparer() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-p7-')), proto = path.join(temp, 'proto-neon');
  fs.mkdirSync(proto);
  fs.cpSync(path.join(ROOT, 'src'), path.join(proto, 'src'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'build.mjs'), path.join(proto, 'build.mjs'));
  for (const d of ['art', 'cine', 'musique']) if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(proto, d));
  const patch = path.join(ROOT, 'tools/codex-p7/raccord-jeu.patch');
  // Intégré : le raccord est déjà dans src/79-jeu.js de la branche ; on ne l'applique que s'il manque.
  if (!fs.readFileSync(path.join(temp, 'proto-neon/src/79-jeu.js'), 'utf8').includes('function continuer()')) {
    execFileSync('git', ['apply', '--check', patch], { cwd: temp });
    execFileSync('git', ['apply', patch], { cwd: temp });
  }
  execFileSync(process.execPath, ['build.mjs'], { cwd: proto });
  return { temp, proto, nettoyer: () => fs.rmSync(temp, { recursive: true, force: true }) };
}
