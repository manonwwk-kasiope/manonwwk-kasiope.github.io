// Préparation locale seulement : aucun serveur et aucun navigateur.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cameraSimulation, gelSimulation } from './raccords.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..'), REPO = path.dirname(ROOT);
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
export const routeBundle = phase => '/proto-neon/__' + phase + '.html';

function remplacer(html, src, autre, nom) {
  if (!html.includes(src) || html.indexOf(src) !== html.lastIndexOf(src)) throw Error('Source absente ou ambiguë : ' + nom);
  return html.replace(src, () => autre);
}

export function ressources(html, route) {
  // Uniquement le préambule du build, aucun code de jeu ni simulation VM.
  const debut = html.indexOf('<script>') + '<script>'.length;
  const fin = html.indexOf('/* ===== 00-pal.js ===== */', debut);
  if (debut < '<script>'.length || fin < debut) throw Error('Préambule du build absent');
  const p = vm.runInNewContext(html.slice(debut, fin) + '\nreturn {ART_SRC,CINE_BASE,CINE_DISPO,MUSIQUE_BASE};})();', {});
  const refs = Object.entries(p.ART_SRC).filter(([, u]) => !u.startsWith('data:')).map(([n, u]) => ({ type: 'art', nom: n, relatif: u }));
  refs.push(...p.CINE_DISPO.map(n => ({ type: 'cine', nom: n, relatif: p.CINE_BASE + n + '.mp4' })));
  refs.push({ type: 'musique', nom: 'piste', relatif: p.MUSIQUE_BASE + 'piste.json' });
  const assets = refs.map(r => {
    const url = new URL(r.relatif, 'http://local' + route), f = path.resolve(REPO, '.' + url.pathname);
    return { ...r, url: url.pathname, existe: f.startsWith(ROOT + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile() };
  });
  return { route, bases: { cine: p.CINE_BASE, musique: p.MUSIQUE_BASE }, assets, manquants: assets.filter(a => !a.existe) };
}

export function preparerBundles(raccords = false) {
  const journal = execFileSync(process.execPath, ['build.mjs'], { cwd: ROOT, encoding: 'utf8' });
  fs.writeFileSync(path.join(HERE, 'build-p16b.log'), journal);
  const sources = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]));
  const initiales = JSON.parse(fs.readFileSync(path.join(HERE, 'sources-recues-p16c.json'), 'utf8'));
  const versions = { apres: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') };
  versions.avant = versions.apres;
  // Même socle final et mêmes chemins que le jeu ; avant = candidate reçue à la reprise p16c ; après = candidate corrigée.
  const remplacements = ['10-gfx.js', '20-crt.js', '78-hud.js'];
  for (const nom of remplacements) versions.avant = remplacer(versions.avant, sources[nom], initiales[nom], nom);
  for (const phase of ['avant', 'apres']) fs.writeFileSync(path.join(HERE, phase + '.html'), versions[phase]);
  if (raccords) for (const [nom, fn] of [['79-jeu.js', cameraSimulation], ['50-fx.js', gelSimulation]]) versions.apres = remplacer(versions.apres, sources[nom], fn(sources[nom]), nom);
  const manifeste = {
    dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    build: { sortie: 0, journal: 'build-p16b.log', indexSha256: sha(fs.readFileSync(path.join(ROOT, 'index.html'))) },
    sourcesSha256: sha(JSON.stringify(sources)),
    modules: Object.fromEntries(Object.entries(sources).map(([n, s]) => [n, { avant: sha(remplacements.includes(n) ? initiales[n] : s), apres: sha(s) }])),
    fichiers: Object.fromEntries(['avant', 'apres'].map(n => [n, sha(fs.readFileSync(path.join(HERE, n + '.html')))])),
    servis: Object.fromEntries(Object.entries(versions).map(([n, s]) => [n, sha(s)])),
    raccords,
    provenanceAvant: 'sources-recues-p16c.json : 10-gfx, 20-crt, 78-hud ; même socle final et mêmes paramètres N.R du banc',
    raccordsEnMemoire: raccords ? ['79-jeu.js : ordre caméra', '50-fx.js : gel du pas fixe pour borner le ralenti'] : [],
    ressources: Object.fromEntries(Object.entries(versions).map(([n, s]) => [n, ressources(s, routeBundle(n))]))
  };
  // Les bundles conservés et le code réellement servi ont chacun leur empreinte (raccords en mémoire).
  fs.writeFileSync(path.join(HERE, raccords ? 'bundles-raccords.json' : 'bundles.json'), JSON.stringify(manifeste, null, 2) + '\n');
  if (Object.values(manifeste.ressources).some(r => r.manquants.length)) throw Error('Ressources absentes : consulter bundles.json');
  return { versions, manifeste };
}
