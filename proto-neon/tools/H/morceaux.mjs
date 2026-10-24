/* tools/H/morceaux.mjs — essai du lot H : les morceaux Suno longs branchés dans 30-music.js.
   Chromium sans interface, SANS SON (--mute-audio) ; --autoplay-policy=no-user-gesture-required pour que play() soit permis hors geste.
   Sur iPhone 13 paysage, portrait et bureau, dans un navigateur neuf à chaque profil (un seul à la fois, fermé ensuite) :
     1. lance une partie, force les vagues 2, 3, 4, 5 puis le CYCLOPE (N.game.dbg.vague(n), .boss()) et vérifie à chaque fois le morceau
        attendu par N.music.morceau() ({ id, t, duree }) : id, et t qui avance d'une seconde par seconde ; le tempo publié (N.music.tempo()) est
        celui du morceau (mesuré par analyse.mjs) ; PERCU et ÉTINCELLES se taisent ;
     2. l'enchaînement de la vague 4 (voix-machine puis electro-tension), de l'alerte (voix-duo puis electro-titan) et la boucle d'electro-titan,
        en sautant près de la fin du morceau (N.music.morceauSaut, réservé aux essais) ;
     3. la mort (N.joueuse.tuer) : le morceau s'arrête sur place, puis reprend là où il était (t ne repart pas de zéro) ; la pause (étouffoir
        420 Hz, même morceau, même t qui continue) ; suspend / resume ; mute ;
     4. la piste en blocs revient en quittant la partie (victoire) : fondu de 1,5 s, plus de morceau ;
     5. le repli : morceaux/ en 404 (catalogue absent), puis un seul fichier en 404 : la piste en blocs joue, le jeu tourne, aucune erreur.
   Zéro erreur partout : __ERR.count = 0 et console vide (hors les 404 provoqués à dessein, que Chromium écrit lui-même dans la console).
   Usage : node proto-neon/tools/H/morceaux.mjs [--url http://127.0.0.1:8141/proto-neon/index.html] [--profil paysage|portrait|bureau|tous] */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FICHE = JSON.parse(fs.readFileSync(path.resolve(ICI, '../../musique/morceaux/morceaux.json'), 'utf8'));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8141/proto-neon/index.html');
const PROFIL = arg('--profil', 'tous');
const PROFILS = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fiche = id => FICHE.morceaux.find(m => m.id === id);
let echecs = 0, tests = 0;
const dit = (ok, msg) => { tests++; if (!ok) echecs++; console.log((ok ? '  ok  ' : '  ECHEC ') + msg); };
const ARGS = ['--autoplay-policy=no-user-gesture-required', '--mute-audio'];

async function ouvrir(prof, route404) {
  const b = await chromium.launch({ args: ARGS });
  const ctx = await b.newContext(prof);
  const p = await ctx.newPage();
  const errs = [], f404 = [];
  p.on('console', m => { if (m.type() === 'error') { if (/Failed to load resource|404/.test(m.text())) f404.push(m.text()); else errs.push(m.text()); } });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  if (route404) await p.route(route404, r => r.fulfill({ status: 404, body: 'absent' }));
  await p.goto(URL_JEU, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.music, null, { timeout: 15000 });
  await p.evaluate(() => window.__N.intro.skip());
  /* depuis le nouveau démarrage (horloge à pas fixes), sauter l'ouverture ne suffit plus : on touche l'écran comme une joueuse, jusqu'à la partie */
  for (let k = 0; k < 12; k++) { const e0 = await p.evaluate(() => window.__N.game.etat()); if (!['demarrage', 'ouverture', 'titre', 'briefing'].includes(e0)) break; const v = p.viewportSize(); if (prof.hasTouch) await p.touchscreen.tap(v.width / 2, v.height / 2); else await p.mouse.click(v.width / 2, v.height / 2); await p.waitForFunction(e => window.__N.game.etat() !== e && (window.__N.game.etat() === 'titre' || window.__N.game.etat() === 'plongee' || window.__N.game.etat() === 'jeu' ? (window.__N.game.dbg.god(true), true) : true), e0, { timeout: 3000, polling: 'raf' }).catch(() => {}); }
  await p.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
  await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); });          // le premier geste : le contexte audio, la partition, les trois emplacements
  return { b, p, errs, f404 };
}
const mz = p => p.evaluate(() => window.__N.music.morceau());
const ts = p => p.evaluate(() => { const M = window.__N.music, m = M.morceau(); return { m, tempo: +M.tempo().toFixed(2), piste: M.piste(), info: M.info(), err: window.__ERR.count, dg: M.morceaux() }; });
async function attendre(p, cond, ms, arg) {                  // vrai dès que cond(état) l'est ; sinon null
  const t0 = Date.now();
  for (;;) {
    const s = await ts(p);
    if (cond(s, arg)) return s;
    if (Date.now() - t0 > ms) return null;
    await sleep(150);
  }
}
async function avance(p, id, nom) {                          // le morceau id sonne et t avance de ~1 s par seconde
  const a = await mz(p); await sleep(1000); const b = await mz(p);
  const d = a && b ? b.t - a.t : -1;
  dit(a && b && a.id === id && b.id === id && d > 0.8 && d < 1.3, nom + ' : t avance (' + (a ? a.t.toFixed(2) : '-') + ' -> ' + (b ? b.t.toFixed(2) : '-') + ', +' + d.toFixed(2) + ' s en 1 s)');
}
const forcer = (p, n) => p.evaluate(n => window.__N.game.dbg.vague(n), n);
/* le niveau de sortie échantillonné toutes les 20 ms : un fondu ne doit ni creuser un trou ni empiler les deux sources */
const demarrerEchantillon = p => p.evaluate(() => { window.__S2 = []; window.__T2 = setInterval(() => { const M = window.__N.music; window.__S2.push([M.context().currentTime, M.rmsOut()]); }, 20); });
const finEchantillon = p => p.evaluate(() => { clearInterval(window.__T2); return window.__S2; });
function analyseFondu(dat, tb, dur) {
  const seg = (a, b) => dat.filter(x => x[0] >= a && x[0] < b).map(x => x[1]);
  const moy = v => v.length ? Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length) : 0;
  const avant = moy(seg(tb - 2, tb - 0.2)), apres = moy(seg(tb + dur + 0.4, tb + dur + 2.4));
  let mini = 1e9, maxi = 0;
  for (let t = tb; t + 0.2 <= tb + dur + 0.2; t += 0.1) { const v = moy(seg(t, t + 0.2)); mini = Math.min(mini, v); maxi = Math.max(maxi, v); }
  const ref = Math.min(avant, apres), ref2 = Math.max(avant, apres);
  return { avant, apres, mini, maxi, creuxDb: 20 * Math.log10(mini / Math.max(ref, 1e-6)), pileDb: 20 * Math.log10(maxi / Math.max(ref2, 1e-6)), n: dat.length };
}
const dernierTb = (dg, types) => { const l = dg.historique.filter(h => types.indexOf(h.type) >= 0 && /tb ([\d.]+)/.test(h.raison || '')); return l.length ? +/tb ([\d.]+)/.exec(l[l.length - 1].raison)[1] : null; };
async function controleFondu(p, dat, types, nom) {
  const dg = (await ts(p)).dg, tb = dernierTb(dg, types);
  if (tb === null) { dit(false, nom + ' : aucune transition dans le journal'); return; }
  const a = analyseFondu(dat, tb, 1.5);
  dit(a.n > 100 && a.creuxDb > -6 && a.pileDb < 5, nom + ' : niveau continu pendant le fondu de 1,5 s (creux ' + a.creuxDb.toFixed(1) + ' dB, surcharge ' + a.pileDb.toFixed(1) + ' dB ; avant ' + a.avant.toFixed(3) + ', pendant ' + a.mini.toFixed(3) + ' à ' + a.maxi.toFixed(3) + ', après ' + a.apres.toFixed(3) + ', ' + a.n + ' relevés)');
}

async function scenario(nom, prof) {
  console.log('\n=== ' + nom + ' ===');
  const { b, p, errs, f404 } = await ouvrir(prof, null);
  const ND = await p.evaluate(() => window.__N.dir.nombreVagues());

  /* ---- 1. les vagues 1 et 2 : la piste en blocs ---- */
  await forcer(p, 1); await sleep(300); await p.evaluate(() => window.__N.game.dbg.god(true));
  await forcer(p, 2);
  let s = await attendre(p, s => !s.piste.repli && s.piste.bloc, 12000);
  dit(s && s.m === null && s.piste.bloc, 'vague 2 : la piste en blocs joue (' + (s && s.piste.bloc) + '), aucun morceau long');
  const base = await ts(p);
  dit(base.dg.etat === 'pret' && base.dg.ids.length === 6, 'le catalogue de six morceaux est chargé (état ' + base.dg.etat + ')');
  dit(Math.abs(base.tempo - 143.76) < 0.1, 'tempo publié sur la piste : ' + base.tempo + ' BPM');
  await sleep(2500);                                          // le morceau suivant est préchargé dès la vague 2
  const pre = await ts(p);
  dit(pre.dg.emplacements.some(e => e.id === 'electro-calme' && e.pret), 'préchargement : electro-calme est prêt dès la vague 2 (emplacements ' + pre.dg.emplacements.map(e => e.id || '-').join(', ') + ')');

  /* ---- 1 bis. la mort pendant que l'entrée est armée : tout est annulé proprement, puis le morceau revient ---- */
  await p.evaluate(() => window.__N.game.dbg.god(false));
  await forcer(p, 3);
  s = await attendre(p, s => s.dg.plan, 4000);
  const dgArme = s && s.dg.plan;
  await p.evaluate(() => window.__N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }));
  await sleep(1500);
  s = await ts(p);
  dit(!!dgArme && s.dg.plan === null && s.m === null && s.dg.stats.annulees >= 1 || (s.m && s.m.id === 'electro-calme'), 'mort pendant l\'entrée armée (' + (dgArme ? dgArme.type + ' ' + dgArme.id : 'aucune') + ') : annulée ou conclue sans reste (plan ' + JSON.stringify(s.dg.plan) + ', morceau ' + JSON.stringify(s.m) + ')');
  await p.evaluate(() => window.__N.game.dbg.god(true));
  s = await attendre(p, s => s.m && s.m.id === 'electro-calme' && s.dg.plan === null, 25000);
  dit(!!s && s.err === 0 && !s.dg.ko['electro-calme'], 'après cette mort : electro-calme revient (' + JSON.stringify(s && s.m) + '), aucun échec compté, __ERR.count = ' + (s && s.err));
  await forcer(p, 2);
  s = await attendre(p, s => s.m === null && s.piste.bloc && s.dg.plan === null, 20000);
  dit(!!s, 'retour à la vague 2 : la piste en blocs reprend (' + (s && s.piste.bloc) + ')');

  /* ---- 2. la suite du programme ---- */
  const etapes = [
    { v: 3, id: 'electro-calme', bpm: [114, 116] },
    { v: 4, id: 'voix-machine', bpm: [120, 131] },
    { v: 5, id: 'voix-plus-vite', bpm: [121, 130] }
  ];
  for (const e of etapes) {
    if (e.v <= 4) await demarrerEchantillon(p);
    await forcer(p, e.v); await p.evaluate(() => window.__N.game.dbg.god(true));
    s = await attendre(p, s => s.m && s.m.id === e.id, 20000);
    if (e.v <= 4) { await sleep(3200); await controleFondu(p, await finEchantillon(p), ['entree'], 'vague ' + e.v + (e.v === 3 ? ' (piste en blocs -> morceau)' : ' (morceau -> morceau)')); }
    dit(!!s, 'vague ' + e.v + ' : ' + e.id + ' sonne (N.music.morceau() = ' + JSON.stringify(s && s.m) + ')');
    if (!s) continue;
    await avance(p, e.id, 'vague ' + e.v);
    s = await ts(p);
    dit(s.tempo >= e.bpm[0] && s.tempo <= e.bpm[1], 'vague ' + e.v + ' : tempo publié ' + s.tempo + ' BPM (attendu ' + e.bpm.join(' à ') + ', mesuré ' + fiche(e.id).bpm + ')');
    dit(!s.info.perc && !s.info.spark && s.info.morceau === true, 'vague ' + e.v + ' : PERCU et ÉTINCELLES coupées (perc ' + s.info.perc + ', spark ' + s.info.spark + ')');
    dit(s.piste.repli === true && s.piste.bloc === null, 'vague ' + e.v + ' : la piste en blocs est tue (le morceau tient l\'antenne)');
  }
  /* un morceau qui se termine sans suite dans la vague (vague 3 : electro-calme seul) rend l'antenne à la piste en blocs */
  await forcer(p, 3); await p.evaluate(() => window.__N.game.dbg.god(true));
  s = await attendre(p, s => s.m && s.m.id === 'electro-calme', 25000);
  await p.evaluate(d => window.__N.music.morceauSaut(d - 9), fiche('electro-calme').duree);
  s = await attendre(p, s => s.m === null && s.piste.bloc && s.dg.plan === null, 25000);
  dit(!!s && s.dg.stats.retours >= 1, 'fin d\'electro-calme sans suite : la piste en blocs revient (' + (s && s.piste.bloc) + ')');
  /* l'enchaînement de la vague 4 : voix-machine, puis electro-tension quand elle se termine avant la fin de la vague */
  await forcer(p, 4); await p.evaluate(() => window.__N.game.dbg.god(true));
  s = await attendre(p, s => s.m && s.m.id === 'voix-machine', 25000);
  dit(!!s, 'retour à la vague 4 : voix-machine (depuis voix-plus-vite, fondu de 1,5 s)');
  await attendre(p, s => s.dg.emplacements.some(e => e.id === 'electro-tension' && e.pret), 15000);
  await p.evaluate(d => window.__N.music.morceauSaut(d - 9), fiche('voix-machine').duree);
  s = await attendre(p, s => s.m && s.m.id === 'electro-tension', 20000);
  dit(!!s, 'fin de voix-machine avant la fin de la vague : electro-tension prend la suite (' + JSON.stringify(s && s.m) + ')');
  if (s) await avance(p, 'electro-tension', 'vague 4 (suite)');
  dit(s && s.tempo > 115 && s.tempo < 119, 'tempo publié ' + (s && s.tempo) + ' BPM (mesuré ' + fiche('electro-tension').bpm + ')');

  /* ---- 3. l'alerte, puis le CYCLOPE ---- */
  await forcer(p, ND); await p.evaluate(() => window.__N.game.dbg.god(true));
  s = await attendre(p, s => s.m && s.m.id === 'voix-plus-vite', 25000);
  dit(!!s, 'dernière vague (' + ND + ') : voix-plus-vite');
  await p.evaluate(() => window.__N.game.dbg.etat('alerte'));
  s = await attendre(p, s => s.m && s.m.id === 'voix-duo', 25000);
  dit(!!s, 'section alerte : voix-duo (son intro dit « Warning, Titan approaching »), ' + JSON.stringify(s && s.m));
  if (s) {
    dit(s.info.morceau === true && s.piste.repli === true, 'alerte : ni la coupure de 250 ms ni la sirène de la piste ne passent sous la voix');
    const gr = s.dg.grille[s.dg.grille.length - 1];
    dit(!!gr && gr.id === 'voix-duo' && gr.to > 1e11, 'alerte : la grille du moteur suit la carte des barres de voix-duo (segment ' + (gr && gr.id) + ')');
  }
  await p.evaluate(() => window.__N.game.dbg.boss());
  await sleep(1500);
  s = await ts(p);
  dit(s.m && s.m.id === 'voix-duo', 'section boss : voix-duo continue sans repartir (t = ' + (s.m && s.m.t.toFixed(1)) + ' s)');
  if (s.m && s.m.t > 0) await avance(p, 'voix-duo', 'CYCLOPE');
  s = await ts(p);
  dit(s.tempo > 126 && s.tempo < 131, 'CYCLOPE : tempo publié ' + s.tempo + ' BPM (mesuré ' + fiche('voix-duo').bpm + ')');
  await attendre(p, s => s.dg.emplacements.some(e => e.id === 'electro-titan' && e.pret), 15000);
  await p.evaluate(d => window.__N.music.morceauSaut(d - 9), fiche('voix-duo').duree);
  s = await attendre(p, s => s.m && s.m.id === 'electro-titan', 20000);
  dit(!!s, 'fin de voix-duo, combat qui dure : electro-titan (' + JSON.stringify(s && s.m) + ')');
  if (s) await avance(p, 'electro-titan', 'electro-titan');
  /* la boucle : près de la fin du motif bouclable, le morceau repart plus tôt dans le fichier, sans silence */
  const bo = fiche('electro-titan').boucle;
  const avantBoucle = (await ts(p)).dg.stats.boucles;
  await p.evaluate(a => window.__N.music.morceauSaut(a - 5), bo.a);
  const tB0 = Date.now();
  s = await attendre(p, s => s.dg.stats.boucles > avantBoucle && s.m && s.m.id === 'electro-titan' && s.m.t < bo.a - 5, 25000);
  dit(!!s, 'electro-titan en boucle : repart à ' + (s && s.m ? s.m.t.toFixed(1) : '?') + ' s (boucle ' + bo.de + ' -> ' + bo.a + ' s)');
  s = await ts(p);
  dit(s.m && s.m.id === 'electro-titan' && s.m.t < bo.a, 'la boucle tient : toujours electro-titan, t = ' + (s.m && s.m.t.toFixed(1)));

  /* ---- 4. la mort, la pause, suspend, mute ---- */
  await sleep(2000);
  const avantMort = await ts(p);
  await p.evaluate(() => { window.__N.game.dbg.god(false); window.__N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }); });
  await sleep(700);
  const m1 = await mz(p); await sleep(500); const m2 = await mz(p);
  dit(m1 && m2 && m1.id === 'electro-titan' && Math.abs(m2.t - m1.t) < 0.05, 'mort : le morceau s\'arrête sur place (t ' + (m1 && m1.t.toFixed(2)) + ' -> ' + (m2 && m2.t.toFixed(2)) + ')');
  dit(avantMort.m && m1 && m1.t >= avantMort.m.t, 'mort : il ne repart pas au début (t avant ' + (avantMort.m && avantMort.m.t.toFixed(1)) + ', à l\'arrêt ' + (m1 && m1.t.toFixed(1)) + ')');
  s = await attendre(p, s => s.m && s.m.t > m2.t + 0.5 && !s.dg.enPause, 14000);
  dit(!!s && s.m.id === 'electro-titan' && s.m.t < avantMort.m.t + 25, 'après la mort : electro-titan reprend où il était (t = ' + (s && s.m && s.m.t.toFixed(1)) + ', à l\'arrêt ' + m2.t.toFixed(1) + ')');
  await p.evaluate(() => { window.__N.game.dbg.god(true); });
  await sleep(500);
  s = await ts(p);
  dit(s.err === 0, 'après la mort : __ERR.count = ' + s.err);

  await p.waitForFunction(() => window.__N.game.etat() === 'boss', null, { timeout: 12000 }).catch(() => {});
  const etatAvant = await p.evaluate(() => window.__N.game.etat());
  const tAvantPause = (await mz(p)) || { t: 0 };
  await p.evaluate(() => window.__N.game.dbg.etat('pause'));
  await sleep(1200);
  s = await ts(p);
  dit(s.info.muffle === 420 && s.m && s.m.id === 'electro-titan', 'pause : étouffé à ' + s.info.muffle + ' Hz comme la piste, toujours ' + (s.m && s.m.id));
  await p.evaluate(e => window.__N.game.dbg.etat(e), etatAvant === 'pause' ? 'boss' : etatAvant);
  await sleep(1200);
  s = await ts(p);
  dit(s.info.muffle === 0 && s.m && s.m.id === 'electro-titan' && s.m.t > tAvantPause.t, 'après la pause : ni étouffoir (' + s.info.muffle + '), ni retour au début (t ' + tAvantPause.t.toFixed(1) + ' -> ' + (s.m && s.m.t.toFixed(1)) + ')');

  const tS = await mz(p);
  await p.evaluate(() => window.__N.music.suspend());
  await sleep(800);
  const tS2 = await mz(p); await sleep(600); const tS3 = await mz(p);
  dit(tS2 && tS3 && Math.abs(tS3.t - tS2.t) < 0.05, 'suspend : le morceau est figé (t ' + (tS2 && tS2.t.toFixed(2)) + ' -> ' + (tS3 && tS3.t.toFixed(2)) + ')');
  await p.evaluate(() => window.__N.music.resume());
  s = await attendre(p, s => s.m && s.m.t > tS3.t + 0.6, 6000);
  dit(!!s && s.m.id === 'electro-titan' && s.m.t > tS3.t, 'resume : il reprend où il était (t = ' + (s && s.m && s.m.t.toFixed(2)) + ')');
  await p.evaluate(() => window.__N.music.mute(true));
  await sleep(700);
  const q1 = await mz(p); await sleep(600); const q2 = await mz(p);
  dit(q1 && q2 && Math.abs(q2.t - q1.t) < 0.05, 'mute : le morceau est figé sous le mutisme (t ' + (q1 && q1.t.toFixed(2)) + ' -> ' + (q2 && q2.t.toFixed(2)) + ')');
  await p.evaluate(() => window.__N.music.mute(false));
  s = await attendre(p, s => s.m && q2 && s.m.t > q2.t + 0.6, 6000);
  dit(!!s && s.m.id === 'electro-titan', 'fin du mute : il reprend (t = ' + (s && s.m && s.m.t.toFixed(2)) + ')');
  await p.evaluate(() => { window.__N.music.mute('musique', true); });
  await sleep(800);
  const c1 = await mz(p); await sleep(700); const c2 = await mz(p);
  dit(c1 && c2 && c2.t - c1.t > 0.5, 'mute du canal musique : le morceau continue sous le silence (t +' + (c1 && c2 ? (c2.t - c1.t).toFixed(2) : '?') + ' s)');
  await p.evaluate(() => { window.__N.music.mute('musique', false); });

  /* ---- 5. on quitte la partie : la piste en blocs revient ---- */
  await demarrerEchantillon(p);
  await p.evaluate(() => window.__N.music.section('victoire'));
  s = await attendre(p, s => s.m === null && s.piste.bloc && !s.piste.repli, 15000);
  await sleep(2500); await controleFondu(p, await finEchantillon(p), ['retour'], 'morceau -> piste en blocs');
  dit(!!s, 'section victoire : le morceau s\'efface, la piste en blocs revient (' + (s && s.piste.bloc) + ')');
  s = await ts(p);
  dit(Math.abs(s.tempo - 143.76) < 0.1, 'le tempo publié redevient celui de la piste : ' + s.tempo + ' BPM');
  await sleep(1500);
  s = await ts(p);
  const sains = s.dg.emplacements.every(e => !e.occupe || e.id);
  dit(s.err === 0 && errs.length === 0, nom + ' : __ERR.count = ' + s.err + ', console ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'vide') + (f404.length ? ' (hors ' + f404.length + ' 404)' : ''));
  console.log('     bilan : ' + JSON.stringify(s.dg.stats) + ', latence de démarrage ' + s.dg.latence + ' s, ko ' + JSON.stringify(s.dg.ko));
  console.log('     journal : ' + s.dg.historique.map(h => h.t + ' ' + h.type + ' ' + h.id + (h.raison ? ' (' + h.raison + ')' : '')).join(' | '));
  await b.close();

  /* ---- 6. le repli : morceaux/ en 404 ---- */
  {
    const o = await ouvrir(prof, /\/morceaux\//);
    await forcer(o.p, 1); await sleep(300); await o.p.evaluate(() => window.__N.game.dbg.god(true));
    await forcer(o.p, 3);
    await sleep(6000);
    let r = await ts(o.p);
    dit(r.m === null && r.dg.etat === 'absent' && !r.piste.repli && r.piste.bloc, nom + ' / morceaux/ en 404 : vague 3 sur la piste en blocs (' + r.piste.bloc + '), catalogue ' + r.dg.etat);
    await forcer(o.p, 5); await sleep(2500); await o.p.evaluate(() => window.__N.game.dbg.boss()); await sleep(2500);
    r = await ts(o.p);
    dit(r.m === null && r.piste.bloc && r.err === 0 && o.errs.length === 0, nom + ' / morceaux/ en 404 : CYCLOPE sur la piste en blocs, __ERR.count = ' + r.err + ', console ' + (o.errs.length ? JSON.stringify(o.errs.slice(0, 3)) : 'vide hors 404'));
    await o.b.close();
  }
  /* un seul fichier absent : le catalogue est là, electro-calme 404 -> la piste en blocs reste, le reste du programme fonctionne */
  {
    const o = await ouvrir(prof, /\/morceaux\/electro-calme\.mp3/);
    await forcer(o.p, 1); await sleep(300); await o.p.evaluate(() => window.__N.game.dbg.god(true));
    await forcer(o.p, 3);
    await sleep(7000);
    let r = await ts(o.p);
    dit(r.m === null && r.dg.ko['electro-calme'] >= 1 && !r.piste.repli && r.piste.bloc, nom + ' / electro-calme.mp3 en 404 : vague 3 reste sur la piste en blocs (échecs ' + JSON.stringify(r.dg.ko) + ')');
    await forcer(o.p, 4); await o.p.evaluate(() => window.__N.game.dbg.god(true));
    r = await attendre(o.p, s => s.m && s.m.id === 'voix-machine', 20000);
    dit(!!r, nom + ' / electro-calme.mp3 en 404 : la vague 4 joue quand même voix-machine');
    r = await ts(o.p);
    dit(r.err === 0 && o.errs.length === 0, nom + ' / un fichier en 404 : __ERR.count = ' + r.err + ', console ' + (o.errs.length ? JSON.stringify(o.errs.slice(0, 3)) : 'vide hors 404'));
    await o.b.close();
  }
}

const liste = PROFIL === 'tous' ? Object.keys(PROFILS) : [PROFIL];
for (const k of liste) await scenario(k, PROFILS[k]);
console.log(echecs ? '\n' + echecs + ' ECHEC(S) sur ' + tests + ' contrôles' : '\ntout est vert : ' + tests + ' contrôles');
process.exit(echecs ? 1 : 0);
