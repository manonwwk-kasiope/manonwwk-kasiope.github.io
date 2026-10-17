/* codex-p3b : Node/VM sans DOM. Validation préalable sur e1bdc6f obligatoire. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const git = (...args) => execFileSync('git', args, { cwd: path.dirname(ROOT), encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
function sources(ref) {
  const names = ref ? git('ls-tree', '--name-only', ref + ':proto-neon/src').trim().split('\n') : fs.readdirSync(path.join(ROOT, 'src'));
  return names.filter(n => n.endsWith('.js')).sort().map(n => [n, ref ? git('show', ref + ':proto-neon/src/' + n) : fs.readFileSync(path.join(ROOT, 'src', n), 'utf8')]);
}
function monde(src, graine = 1) {
  const stockage = new Map(), erreurs = [];
  const c = { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: 844, innerHeight: 390,
    requestAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {}, __SEED: graine, __DT: 1 / 60,
    localStorage: { getItem: k => stockage.get(k) ?? null, setItem: (k,v) => stockage.set(k,String(v)), removeItem: k => stockage.delete(k), clear: () => stockage.clear() } };
  c.window = c; c.N = c.__N; vm.createContext(c);
  for (const [f, code] of src) vm.runInContext(code, c, { filename: f });
  c.__S = c.__N.S; c.__N.gfx.resize(844, 390);
  c.__S.view.w = c.__N.gfx.W; c.__S.view.h = c.__N.gfx.H;
  c.__N.reseed(graine); c.__N.intro.reset(); c.__N.game.reset(c.__S.seed);
  return { c, N: c.__N, S: c.__S, erreurs };
}
function partie(src, pilote, graine) {
  const {c,N,S,erreurs} = monde(src, graine);
  c.localStorage.clear(); S.jour = 20261017; S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0, stagnant = 0, last = '', raison = 'borne';
  while (N.horloge.t() < 540 && reel < 2160) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25;
    const utile = [N.game.etat(), N.horloge.t(), S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + N.game.etat(); break; }
    if (c.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin') raison = 'fin';
  const d = N.game.dbg();
  return { pilote, graine, tempsJeu: N.horloge.t(), tempsCombat: d.t, vague: d.vague, score: d.score, raison, err: c.__ERR.count, erreursConsole: erreurs,
    journal: N.journal.dump(), journalSha256: crypto.createHash('sha256').update(JSON.stringify(N.journal.dump())).digest('hex') };
}
const ref = sources('e1bdc6f'), actuelles = sources();
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json')));
const selection = refs.cas.filter(c => c.pilote === 'inerte');
const preuve = { dateParis: new Date().toLocaleString('fr-FR', { timeZone:'Europe/Paris' }), reference:'e1bdc6f', validation: [], limite:'VM sans DOM : logique et tampon uniquement ; aucun son Web Audio ni écran navigateur.' };
for (const attendu of (process.argv.includes('--probe') ? selection.slice(0,1) : selection)) {
  const obtenu = partie(ref, attendu.pilote, attendu.graine);
  const champs = ['tempsJeu','tempsCombat','vague','score','raison','err','journalSha256'];
  const differences = champs.filter(k => obtenu[k] !== attendu[k]).map(k => ({ champ:k, attendu:attendu[k], obtenu:obtenu[k] }));
  if (differences.length && fs.existsSync(path.join(ROOT,'tools/pilotes',attendu.cache))) {
    const jr = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT,'tools/pilotes',attendu.cache)))).journal;
    const k = jr.findIndex((e,i) => JSON.stringify(e) !== JSON.stringify(obtenu.journal[i]));
    obtenu.premiereDifference = { k, attendu:jr[k], obtenu:obtenu.journal[k] };
  }
  delete obtenu.journal;
  preuve.validation.push({ ...obtenu, identique: !differences.length, differences });
  console.log('référence', obtenu.pilote, obtenu.graine, differences.length ? JSON.stringify(differences) : 'identique');
}
preuve.vmValide = preuve.validation.length >= 10 && preuve.validation.every(v => v.identique);
if (preuve.vmValide) {
  const {c,N,S} = monde(actuelles);
  N.intro.skip(); N.game.reset(7); N.game.dbg.scene('calme');
  vm.runInContext('perfNote(1, 1/60)', c);
  S.reglages.ecran = 'pur'; N.crt.auto(false); N.crt.preset('coupe');
  const avant = N.crt.niveau(); vm.runInContext('perfNote(1, 1/60)', c);
  preuve.tube = { ancien: { avant, apres: N.crt.niveau(), auto: N.crt.auto(), off: N.crt.off } };
  N.crt.auto(false); N.crt.preset('coupe'); vm.runInContext('perfNote(1, 1/60)', c);
  preuve.tube.corrige = { apres: N.crt.niveau(), auto:N.crt.auto(), off:N.crt.off };
  N.game.reset(7); const viesAvant = N.score.vies; N.score.vies = 1;
  N.joueuse.tuer('mur', {genre:'arene',type:'mur',id:0});
  preuve.vies = { avant:viesAvant, affectation:1, apresMort:N.score.vies, journal:N.journal.dump().filter(e => e.type === 'mort') };
  preuve.cites = [];
  for (const q of N.ids.quartiers) preuve.cites.push({ nom:q, masque:Array.from(N.decor.masqueCite(q)) });
  const paires = []; for(let i=0;i<preuve.cites.length;i++)for(let j=i+1;j<preuve.cites.length;j++){
    let inter=0,union=0; const a=preuve.cites[i],b=preuve.cites[j];
    for(let k=0;k<a.masque.length;k++){inter+=a.masque[k]&&b.masque[k]?1:0;union+=a.masque[k]||b.masque[k]?1:0;}
    paires.push({a:a.nom,b:b.nom,inter,union,iou:inter/union});
  }
  preuve.cites = { methode:'N.decor.masqueCite, support P3 réel 640 x 96', paires, distinctes:paires.filter(p=>p.iou<N.R.criteres.R32.iou).length };
}
fs.mkdirSync(path.join(HERE,'diagnostic'), {recursive:true});
fs.writeFileSync(path.join(HERE,'diagnostic/p3b-vm.json'),JSON.stringify(preuve,null,2)+'\n');
if(!preuve.vmValide) process.exitCode=1;
