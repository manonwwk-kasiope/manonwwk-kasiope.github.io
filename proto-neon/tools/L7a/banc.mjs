/* tools/L7a/banc.mjs — le banc du lot 7a : les critères d'acceptation [U] de REFONTE.md § 8.3 (LOT 7a),
   mesurés en partie réelle sur la page d'essai (Chromium, Web Audio réel, horloge audio réelle).

     node tools/L7a/banc.mjs [--url URL] [--court]      → tools/L7a/mesures.json ; code 1 si un critère tombe

   Phases : démarrage (son avant une mesure, piste avant 3 s) ; jeu (enchaînements, calage du génératif,
   calage du génératif) ; vingt morts
   (reprise jamais au début, jamais sur le bloc de la mort, au début d'une mesure) ; sections (répit, alerte
   et sa coupure, boss, victoire, défaite, titre) ; mémoire ; suspension et reprise ; zéro erreur.
   Les autres critères ont leurs propres scripts : jointures (jointures.mjs), sans piste (repli.mjs), fichier
   autonome (autonome.mjs). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg('--url', 'http://127.0.0.1:8131/proto-neon/tools/L7a/index.html');
const COURT = process.argv.includes('--court');
const R = { quand: new Date().toISOString(), url: URL, criteres: {}, details: {} };
const note = (nom, ok, mesure, seuil) => { R.criteres[nom] = { ok: !!ok, mesure, seuil }; console.log((ok ? '  ok   ' : '  ÉCHEC') + ' ' + nom + ' : ' + JSON.stringify(mesure)); };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const erreurs = [];
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(String(e)));
const attendre = ms => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);

await page.goto(URL);
await attendre(800);


/* ---------- 1. le démarrage ---------- */
await page.mouse.click(420, 200);
const tClic = await ev(() => { const c = window.__N.music.context(); return c ? c.currentTime : 0; });
const dem = { son: null, piste: null };
for (let i = 0; i < 80 && (dem.son === null || dem.piste === null); i++) {
  await attendre(50);
  const r = await ev(() => { const m = window.__N.music, c = m.context(); return { t: c.currentTime, out: m.rmsOut(), info: m.info() }; });
  if (dem.son === null && r.out > 1e-3) dem.son = r.t - tClic;
  if (dem.piste === null && r.info.preuve && r.info.bloc) dem.piste = r.t - tClic;
}
R.details.demarrage = dem;
note('démarrage : son avant une mesure (repli génératif)', dem.son !== null && dem.son < 2.087, dem.son && +dem.son.toFixed(3), '< 2,087 s');
note('démarrage : la piste prend la relève sur une barre, avant 3 s', dem.piste !== null && dem.piste < 3, dem.piste && +dem.piste.toFixed(3), '< 3 s');

/* ---------- 2. le jeu : la plongée, la vague 1, puis la suite des blocs ---------- */
await ev(() => { window.__N.game.dbg.god(true); window.__N.game.dbg.vague(1); window.__T = 0.1; window.__N.game.tension = function () { return window.__T; }; });
const dureeJeu = COURT ? 40 : 75;
const releves = [];
for (let i = 0; i < dureeJeu * 2; i++) {
  await attendre(500);
  /* la tension monte doucement, comme une partie (le directeur de repli donne peu de tension) */
  const u = i / (dureeJeu * 2);
  releves.push(await ev(u => {
    const m = window.__N.music; window.__T = Math.min(1, 0.1 + u * 1.1);
    const i = m.info(); return { t: m.context().currentTime, bloc: i.bloc, role: i.role, piste: i.piste, mem: i.memoire, couches: i.couches, etat: window.__N.game.etat() };
  }, u));
}
R.details.jeu = releves.filter((x, k) => k % 4 === 0);

/* ---------- 3. les jointures : mesurées hors ligne, à l'échantillon, par tools/L7a/jointures.mjs ---------- */

/* ---------- 4. le calage du génératif sur les barres des blocs ---------- */
const cal = await ev(() => {
  const m = window.__N.music, log = m.segments().log, c = m.calage();
  const barres = [];
  for (const s of log) { if (s.annule) continue; }
  return { entrees: c, log };
});
{
  /* chaque entrée de couche, comparée aux barres des segments du journal (recalculées ici) */
  const piste = JSON.parse(fs.readFileSync(path.join(ICI, '..', '..', 'musique', 'piste.json'), 'utf8'));
  const B = {}; for (const b of piste.blocs) B[b.id] = b;
  const barres = [];
  for (const s of cal.log) {
    if (s.annule) continue;
    const fin = s.fin || s.tFin;
    for (let k = s.de; k <= s.a; k++) { const t = s.t0 + B[s.id].barres[k] - B[s.id].barres[s.de]; if (t <= fin + 1e-6) barres.push(t); }
  }
  const dans = cal.entrees.filter(e => barres.some(b => Math.abs(b - e.t) < 2.2) && e.t >= cal.log[0].t0);
  const ecarts = dans.map(e => Math.min(...barres.map(b => Math.abs(b - e.t))) * 1000);
  R.details.calage = { entrees: dans.length, ecartMaxMs: ecarts.length ? Math.max(...ecarts) : null, couches: [...new Set(dans.map(e => e.couche))] };
  note('calage du génératif : 100 % des entrées de couche à < 10 ms d\'une barre', dans.length >= 3 && Math.max(...ecarts) < 10, R.details.calage, '< 10 ms');
}

/* ---------- 5. vingt morts : jamais au début du morceau, jamais le bloc de la mort ---------- */
const morts = [];
const nMorts = COURT ? 8 : 20;
for (let i = 0; i < nMorts; i++) {
  const r = await ev(async () => {
    const N = window.__N, m = N.music;
    if (N.score) N.score.vies = 9;
    if (['jeu', 'reapparition'].indexOf(N.game.etat()) < 0) { N.game.dbg.vague(2); await new Promise(r => setTimeout(r, 1500)); }
    if (N.joueuse.invul && N.joueuse.invul()) await new Promise(r => setTimeout(r, 1200));
    N.game.dbg.god(false);
    const avant = m.info().bloc, tMort = m.context().currentTime;
    const ok = N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: -1 });
    return { ok, avant, tMort };
  });
  await attendre(3400);
  const apres = await ev(() => { const m = window.__N.music, s = m.segments(); window.__N.game.dbg.god(true); return { info: m.info(), log: s.log.slice(-3), etat: window.__N.game.etat() }; });
  const reprise = apres.log.filter(s => s.t0 > r.tMort && !s.annule)[0] || null;
  morts.push({ tuee: r.ok, bloc: r.avant, reprise: reprise && reprise.id, de: reprise && reprise.de, frais: reprise && reprise.frais, delai: reprise && +(reprise.t0 - r.tMort).toFixed(3), etat: apres.etat });
  await attendre(1200 + (i % 4) * 1300);
}
R.details.morts = morts;
const vraies = morts.filter(x => x.tuee);
const mauvaises = vraies.filter(x => !x.reprise || x.reprise === 'nv-01' || x.reprise === x.bloc || x.de !== 0);
note('après une mort : jamais au début du morceau, jamais le bloc de la mort, au début d\'une mesure', vraies.length >= nMorts * 0.8 && mauvaises.length === 0,
  { morts: vraies.length, fautes: mauvaises.length, delaiMax: Math.max(...vraies.map(x => x.delai || 0)) }, '0 faute');

/* ---------- 6. les sections ---------- */
async function section(nom, ms) {
  const t = await ev(n => { const m = window.__N.music; m.section(n); return m.context().currentTime; }, nom);
  await attendre(ms);
  return ev((a) => { const m = window.__N.music; return { info: m.info(), log: m.segments().log.filter(s => s.t0 > a - 0.01), t: m.context().currentTime, t0: a }; }, t);
}
const secs = {};
await ev(() => { window.__T = 0.3; });
secs.repit = await section('repit', 12000);
secs.jeu = await section('jeu', 10000);
secs.alerte = await section('alerte', 5000);
secs.boss = await section('boss', 6000);
secs.victoire = await section('victoire', 5000);
secs.defaite = await section('defaite', 4000);
secs.titre = await section('titre', 5000);
R.details.sections = Object.fromEntries(Object.entries(secs).map(([k, v]) => [k, { bloc: v.info.bloc, role: v.info.role, segs: v.log.map(s => s.id + ':' + s.de + '-' + s.a + (s.frais ? '*' : '')) }]));
const ids = k => secs[k].log.map(s => s.id);
note('section repit : le PONT en levée, puis la RESPIRATION', ids('repit')[0] === 'nv-08' && ids('repit').includes('nv-09'), ids('repit'), 'nv-08 puis nv-09');
note('section alerte : coupure de 250 ms sur la barre, puis la mesure 56 en boucle', (() => {
  const a = secs.alerte.log[0]; return a && a.id === 'nv-07' && a.de === 7 && a.a === 8;
})(), secs.alerte.log.map(s => s.id + ':' + s.de), 'nv-07, mesure 56');
{
  /* la demande est urgente : nv-12 sur la barre suivante (au plus une mesure de la boucle d'alerte avant) */
  const k = secs.boss.log.find(x => x.id === 'nv-12'), att = k ? k.t0 - secs.boss.t0 : null;
  note('section boss : RETOUR (nv-12) à la mesure suivante', k && att <= 2.087 + 0.4, { segs: ids('boss'), attente: att && +att.toFixed(3) }, '≤ une mesure');
}
note('sections victoire, défaite, titre : OUTRO puis INTRO', ids('victoire')[0] === 'nv-17' && ids('titre')[0] === 'nv-01', { victoire: ids('victoire'), defaite: ids('defaite'), titre: ids('titre') }, 'nv-17, nv-01');
{
  /* le trou de l'alerte : la fin du bloc sortant et le départ de la boucle d'alerte */
  const all = await ev(() => window.__N.music.segments().log);
  const k = all.findIndex(s => s.role === 'alerte' && !s.annule);
  const prev = k > 0 ? all.slice(0, k).reverse().find(s => !s.annule) : null;
  const trou = prev ? all[k].t0 - (prev.fin || prev.tFin) : null;
  note('alerte : trou de 250 ms sur la barre', trou !== null && Math.abs(trou - 0.25) < 0.002, trou && +trou.toFixed(4), '0,25 s ± 2 ms');
}

/* ---------- 7. la mémoire ---------- */
const memMax = Math.max(...releves.map(r => r.mem), ...Object.values(secs).map(s => s.info.memoire));
note('mémoire audio décodée ≤ 25 Mo', memMax <= 25 * 1048576, +(memMax / 1048576).toFixed(2) + ' Mo', '≤ 25 Mo');

/* ---------- 8. suspension et reprise, sous 1 s ---------- */
await section('jeu', 4000);
const sus = await ev(async () => {
  const m = window.__N.music, ctx = m.context();
  m.suspend();
  await new Promise(r => setTimeout(r, 1500));
  const t0 = performance.now();
  m.resume();
  let t = null;
  for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 20)); if (ctx.state === 'running' && m.rmsOut() > 1e-3) { t = performance.now() - t0; break; } }
  /* coupure générale, puis retour */
  m.mute(true); await new Promise(r => setTimeout(r, 600)); const coupe = m.rmsOut();
  const t1 = performance.now(); m.mute(false);
  let t2 = null;
  for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 20)); if (m.rmsOut() > 1e-3) { t2 = performance.now() - t1; break; } }
  return { repriseMs: t, coupe, retourMs: t2 };
});
R.details.suspension = sus;
note('suspension, puis reprise du son sous 1 s (J-19)', sus.repriseMs !== null && sus.repriseMs < 1000 && sus.retourMs !== null && sus.retourMs < 1000 && sus.coupe < 1e-3, sus, '< 1000 ms');

/* ---------- 9. zéro erreur ---------- */
const err = await ev(() => (window.__ERR && window.__ERR.count) || 0);
note('zéro erreur (console et __ERR)', erreurs.length === 0 && err === 0, { console: erreurs.slice(0, 5), err }, '0');
R.details.info = await ev(() => window.__N.music.info());
R.details.journalSons = await ev(() => window.__N.music.journal());

fs.writeFileSync(path.join(ICI, COURT ? 'mesures-court.json' : 'mesures.json'), JSON.stringify(R, null, 1));
await browser.close();
const fautes = Object.values(R.criteres).filter(c => !c.ok).length;
console.log(fautes ? `BANC L7a : ${fautes} critère(s) en échec` : 'BANC L7a : tout est tenu');
process.exit(fautes ? 1 : 0);
