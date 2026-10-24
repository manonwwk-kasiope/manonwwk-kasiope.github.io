#!/usr/bin/env node
/* Recettes locales reproductibles, sans listen() et sans processus navigateur. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO, inventorier, sauverInventaire, paris, sha } from './inventaire.mjs';
import { precontroler } from './verifier.mjs';
import { temoin } from './temoin.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(REPO, 'proto-neon'), dir = path.join(here, 'node');
fs.mkdirSync(path.join(dir, 'precontrole'), { recursive: true });
const avant = inventorier(REPO);
const r = { dateParis: paris(), serveurLance: false, navigateurLance: false, avant: { sourcesSha256: avant.sourcesSha256, bundleSha256: avant.bundleSha256, inventaire: avant.resume }, controles: [], ok: false };
function run(nom, args, cwd = REPO) {
  const p = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 60000 });
  r.controles.push({ nom, code: p.status, stdout: p.stdout, stderr: p.stderr, erreur: p.error?.message });
  if (p.status !== 0) throw new Error(nom + ' en échec : ' + p.stderr);
}
try {
  for (const nom of ['inventaire.mjs', 'verifier.mjs', 'temoin.mjs', 'controle-node.mjs']) run('syntaxe ' + nom, ['--check', path.join(here, nom)]);
  run('import du vérifieur sans effet', ['--input-type=module', '-e', 'const m = await import(' + JSON.stringify(new URL('./verifier.mjs', import.meta.url).href) + '); console.log(JSON.stringify({exports:Object.keys(m), profils:m.profils.map(p=>p.nom)}));']);
  run('node build.mjs', ['build.mjs'], root);
  const build = r.controles.at(-1); fs.writeFileSync(path.join(dir, 'build.log'), build.stdout + build.stderr);
  const apres = sauverInventaire(REPO);
  r.apres = { sourcesSha256: apres.sourcesSha256, bundleSha256: apres.bundleSha256, inventaire: apres.resume };
  r.sourcesInchangees = r.avant.sourcesSha256 === r.apres.sourcesSha256;
  r.bundleIdentique = r.avant.bundleSha256 === r.apres.bundleSha256;
  const pre = precontroler(REPO); r.precontrole = { ok: pre.ok, erreurs: pre.erreurs };
  fs.writeFileSync(path.join(dir, 'precontrole/resultats.json'), JSON.stringify({ dateParis: paris(), navigateurLance: false, ...r.precontrole, sourcesSha256: apres.sourcesSha256, bundleSha256: apres.bundleSha256 }, null, 2) + '\n');
  const t = temoin(REPO); r.temoin = { ok: t.ok, codeSain: t.codeAvant, codeRenomme: t.codeApres, raccord: t.raccord };
  r.protocoleSha256 = sha(fs.readFileSync(path.join(here, 'verifier.mjs')));
  r.ok = r.sourcesInchangees && pre.ok && t.ok;
} catch (e) { r.erreur = String(e.stack || e); }
finally { r.finParis = paris(); fs.writeFileSync(path.join(dir, 'preuves.json'), JSON.stringify(r, null, 2) + '\n'); }
console.log(JSON.stringify({ ok: r.ok, sourcesInchangees: r.sourcesInchangees, bundleIdentique: r.bundleIdentique, temoin: r.temoin, erreur: r.erreur }));
if (!r.ok) process.exitCode = 1;
