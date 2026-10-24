// Repli sans navigateur : vrais modules et vrai tampon d'indices ; aucun DOM/canvas/Safari.
// Ce résultat ne remplace jamais verifier.mjs, bloqué par le bac à sable de cette session.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const stage = process.argv[2] || 'apres';
const files = (await fs.readdir(path.join(root, 'src'))).filter(x => x.endsWith('.js')).sort();
let sources = (await Promise.all(files.map(x => stage === 'avant'
  ? execFileSync('git', ['show', `HEAD:proto-neon/src/${x}`], { cwd: root, encoding: 'utf8' })
  : fs.readFile(path.join(root, 'src', x), 'utf8')))).join('\n');
if (process.argv.includes('--raccord-propose')) {
  const patch = await fs.readFile(path.join(here, 'raccord-joueuse.patch'), 'utf8');
  for (const hunk of patch.split(/^@@[^\n]*\n/m).slice(1)) {
    const lines = hunk.split('\n').filter(x => x && !x.startsWith('\\'));
    const ancien = lines.filter(x => x[0] === ' ' || x[0] === '-').map(x => x.slice(1)).join('\n') + '\n';
    const nouveau = lines.filter(x => x[0] === ' ' || x[0] === '+').map(x => x.slice(1)).join('\n') + '\n';
    if (!sources.includes(ancien)) throw new Error('Raccord proposé désynchronisé des sources');
    sources = sources.replace(ancien, nouveau);
  }
}
const banc = await fs.readFile(path.join(here, 'verifier.mjs'), 'utf8');
function bloc(debut) {
  const i = banc.indexOf(debut) + debut.length, j = banc.indexOf('\n    });', i);
  return '(() => {' + banc.slice(i, j) + '\n})()';
}
const scenes = bloc('const data = await page.evaluate(() => {');
const soak = bloc('const soak = await page.evaluate(() => {');
const result = { stage, revisionBase: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  mode: 'Node VM sans navigateur ni DOM, modules réels, tampon réel', dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), profils: [] };
const precedents = process.argv.includes('--scenes-only') ? JSON.parse(await fs.readFile(path.join(here, `${stage}-etat.json`), 'utf8')) : null;
for (const [nom, w, h, tactile] of [['iphone-paysage', 844, 390, true], ['iphone-portrait', 390, 844, true], ['bureau', 1440, 900, false]]) {
  const erreursConsole = [];
  const sandbox = { console: { log() {}, warn() {}, error(...args) { erreursConsole.push(args.map(String).join(' ')); } },
    performance, location: { search: '?journal=1' }, navigator: { maxTouchPoints: tactile ? 1 : 0 },
    innerWidth: w, innerHeight: h, devicePixelRatio: 1, requestAnimationFrame() {}, addEventListener() {},
    matchMedia() { return { matches: false, addEventListener() {} }; }, ART_SRC: {}, CINE_DISPO: [], MUSIQUE_BASE: '', MUSIQUE_EMBED: null };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext('var N = window.__N = {};\n' + sources + '\nwindow.__S=N.S; N.gfx.init(null); N.game.reset(2975);', context);
  const data = vm.runInContext(scenes, context);
  const endurance = precedents ? precedents.profils.find(p => p.nom === nom).soak :
    process.argv.includes('--sans-endurance') ? [] : vm.runInContext(soak, context);
  if (precedents) result.enduranceReutiliseeDepuis = precedents.dateParis;
  result.profils.push({ nom, viewport: { width: w, height: h }, ...data, soak: endurance, erreursConsole });
  await fs.writeFile(path.join(here, `${stage}-etat.json`), JSON.stringify(result, null, 2));
  console.log(nom, JSON.stringify({ grappe: data.grappe.morts, eperon: data.eperon.joueuse, braise: data.braise.map(x => x.degats), repit: data.repit.seconde, pilotes: data.pilotes.map(x => [x.seed, x.etat, x.tJeu]), erreurs: data.erreurs.count, erreursConsole, soak: endurance }));
}
