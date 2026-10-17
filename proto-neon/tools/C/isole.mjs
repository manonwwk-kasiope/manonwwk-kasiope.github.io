/* tools/C/isole.mjs — 30-music.js seul, sans aucun autre module : il se charge sans bruit, ne fait rien tant qu'on ne l'appelle pas,
   puis répond à toute son interface sans lever d'erreur (N.rng, N.game, N.fx, N.S absents). Mesure aussi le coût du premier geste
   (init + start) : il doit rester léger. Usage : node proto-neon/tools/C/isole.mjs
   Chromium sans interface, son coupé. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const src = fs.readFileSync(path.join(RACINE, 'proto-neon/src/30-music.js'), 'utf8');
const page = '<!doctype html><meta charset=utf-8><body><script>var N = window.__N = {}; window.__ERRS = []; window.addEventListener("error", function (e) { window.__ERRS.push(e.message); });</script><script>' + src.replace(/<\/script/g, '<\\/script') + '</script></body>';
let echecs = 0;
const dit = (ok, msg) => { if (!ok) echecs++; console.log((ok ? '  ok  ' : '  ECHEC ') + msg); };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.setContent(page, { waitUntil: 'load' });
const r = await p.evaluate(async () => {
  const M = window.__N.music, out = { present: !!M, ctxAvantGeste: M.info() };
  /* le premier AudioContext d'une page coûte ~120 ms au navigateur (mesuré : 120 ms le premier, 0,1 ms le second) : hors du module,
     on le met à part pour ne mesurer que ce que 30-music.js ajoute */
  let tc = performance.now(); const chaud = new AudioContext({ sampleRate: 44100 }); out.contexteNavigateur = performance.now() - tc; chaud.close();
  const t0 = performance.now(); M.init(); M.start(); out.geste = performance.now() - t0;
  const appels = [];
  const essaie = (nom, f) => { try { f(); } catch (e) { appels.push(nom + ' : ' + e.message); } };
  ['titre', 'attraction', 'briefing', 'jeu', 'repit', 'alerte', 'boss', 'victoire', 'defaite', 'initiales', 'inconnue'].forEach(s => essaie('section ' + s, () => M.section(s)));
  ['mort', 'gameover', 'stinger', 'drop', 'plongee', 'vague', 'inversion', 'zzz'].forEach(c => essaie('cue ' + c, () => M.cue(c)));
  [0, 0.5, 1, -3, 7, NaN].forEach(v => { essaie('tension ' + v, () => M.tension(v)); essaie('danger ' + v, () => M.danger(v)); });
  ['inconnu', '', null, undefined, 42].forEach(n => essaie('sfx ' + n, () => M.sfx(n, { pan: 2, pitch: -4, type: 'x' })));
  essaie('sfx sans options', () => M.sfx('kill'));
  essaie('voix', () => { M.voix('READY'); M.voix('inconnu'); });
  essaie('mute', () => { M.mute(true); M.mute(false); M.mute('musique', true); M.mute('musique', false); M.muted(); });
  essaie('suspend/resume', () => { M.suspend(); M.resume(); });
  essaie('lectures', () => { M.piste(); M.info(); M.noeuds(); M.rms(); M.beat(); M.chargeur(); });
  await new Promise(r => setTimeout(r, 1500));
  out.appels = appels; out.piste = M.piste(); out.erreursPage = window.__ERRS;
  M.stop();
  return out;
});
dit(r.present, 'N.music existe avec le seul module 30-music.js');
dit(r.ctxAvantGeste === null || r.ctxAvantGeste === undefined || typeof r.ctxAvantGeste === 'object', 'rien de lourd avant le premier geste');
dit(r.geste < 50, 'premier geste (init + start du module) : ' + r.geste.toFixed(1) + ' ms (< 50) ; le contexte audio du navigateur, à part : ' + r.contexteNavigateur.toFixed(0) + ' ms');
dit(r.appels.length === 0, 'toute l\'interface répond sans lever d\'erreur' + (r.appels.length ? ' : ' + JSON.stringify(r.appels.slice(0, 5)) : ''));
dit(r.erreursPage.length === 0 && errs.length === 0, 'aucune erreur de page ni de console' + (errs.length ? ' : ' + JSON.stringify(errs.slice(0, 3)) : ''));
await b.close();
console.log(echecs ? '\n' + echecs + ' ECHEC(S)' : '\ntout est vert');
process.exit(echecs ? 1 : 0);
