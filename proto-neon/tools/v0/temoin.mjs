#!/usr/bin/env node
/* Témoin obligatoire, sans serveur et sans Chromium : même porte de précontrôle que verifier.mjs.
   Le build réinjecte CINE_DISPO : le repli silencieux ne doit pas cacher une vidéo renommée.
   node proto-neon/tools/v0/temoin.mjs */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO, paris, sha, inventorier } from './inventaire.mjs';

export function temoin(repo = REPO) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-v0-temoin-')), target = path.join(dir, 'proto-neon');
  const dossier = path.join(REPO, 'proto-neon/tools/v0/node'); fs.mkdirSync(dossier, { recursive: true });
  const r = { dateParis: paris(), copieTemporaire: true, navigateurLance: false, serveurLance: false, ok: false, commandes: [] };
  try {
    fs.mkdirSync(target);
    for (const n of ['src', 'art', 'cine', 'musique', 'sons', 'build.mjs']) fs.cpSync(path.join(repo, 'proto-neon', n), path.join(target, n), { recursive: true, mode: fs.constants.COPYFILE_FICLONE });
    const exec = (args, cwd) => {
      const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 60000 });
      r.commandes.push({ arguments: args.map(a => a.replaceAll(dir, '<copie-temporaire>')), cwd: cwd.replaceAll(dir, '<copie-temporaire>'), code: result.status, erreur: result.error?.message, stdout: result.stdout?.slice(-1800), stderr: result.stderr });
      return result.status;
    };
    if (exec(['build.mjs'], target) !== 0) throw new Error('Build initial de la copie en échec');
    r.bundleAvant = sha(fs.readFileSync(path.join(target, 'index.html')));
    const verifier = fileURLToPath(new URL('./verifier.mjs', import.meta.url));
    r.protocoleSha256 = sha(fs.readFileSync(verifier)); r.sourcesSha256 = inventorier(repo).sourcesSha256;
    r.codeAvant = exec([verifier, '--racine', dir, '--precontrole', '--sortie', path.join(dir, 'avant')], REPO);
    if (r.codeAvant !== 0) throw new Error('Le témoin sain ne passe pas');
    const nom = 'boss.mp4', nouveau = 'boss.renommee.mp4';
    fs.renameSync(path.join(target, 'cine', nom), path.join(target, 'cine', nouveau));
    r.mutation = 'cine/' + nom + ' → cine/' + nouveau;
    if (exec(['build.mjs'], target) !== 0) throw new Error('Build muté en échec avant le vérifieur');
    r.bundleApres = sha(fs.readFileSync(path.join(target, 'index.html')));
    r.codeApres = exec([verifier, '--racine', dir, '--precontrole', '--sortie', path.join(dir, 'apres')], REPO);
    r.refus = JSON.parse(fs.readFileSync(path.join(dir, 'apres/resultats.json'), 'utf8'));
    r.ok = r.codeAvant === 0 && r.codeApres === 1 && r.refus.precontrole.erreurs.some(e => e.includes('cine/boss.mp4'));
    // Preuve bornée du raccord livré : appliquer seulement son insertion dans la copie et réinventorier.
    fs.renameSync(path.join(target, 'cine', nouveau), path.join(target, 'cine', nom));
    const invAvant = inventorier(dir);
    const patch = fileURLToPath(new URL('./raccord-64-aventure.patch', import.meta.url));
    const application = spawnSync('git', ['apply', patch], { cwd: dir, encoding: 'utf8', timeout: 60000 });
    if (application.status !== 0) throw new Error('Application du raccord : ' + application.stderr);
    const invApres = inventorier(dir);
    r.raccord = { portee: 'preuve statique uniquement ; aucun essai de progression ou de pixels', avant: invAvant.medias.filter(m => m.type === 'video' && !m.declenchements.some(d => d.operation === 'play')).map(m => m.fichier), apres: invApres.medias.filter(m => m.type === 'video' && !m.declenchements.some(d => d.operation === 'play')).map(m => m.fichier) };
    r.raccord.build = exec(['build.mjs'], target);
    if (r.raccord.build !== 0) r.ok = false;
  } catch (e) { r.erreur = String(e.stack || e); r.ok = false; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); r.copieSupprimee = true; fs.writeFileSync(path.join(dossier, 'temoin.json'), JSON.stringify(r, null, 2) + '\n'); }
  return r;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = temoin(); console.log(JSON.stringify({ temoin: r.ok, codeSain: r.codeAvant, codeRenomme: r.codeApres, erreursAttendues: r.refus?.precontrole?.erreurs, raccord: r.raccord })); if (!r.ok) process.exitCode = 1;
}
