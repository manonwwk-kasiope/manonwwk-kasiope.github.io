/* tools/regen/banc.mjs — le banc du régénérateur (chantier n° 4, src/71-butin.js).
   1. HORS AVENTURE, rien ne change : la même page construite deux fois, « avant » (71-butin.js de la référence
      --ref, par défaut 1aa180f, le commit d'avant le chantier) et « après » (le 71-butin.js courant), toutes deux tirées
      du MÊME bundle, où les autres modules sont ceux de la référence (voir plus bas) : seul le régénérateur diffère. Départ direct
      plongée, graine imposée, __DT = 1/60, pilotes automatiques 'bon' et 'maladroit' (qui se font couper et meurent),
      simulation officielle (dbg.simuler) jusqu'à 90 s de jeu ; à 10, 20, 30, 45, 60 et 90 s, une empreinte : état,
      score, longueur, vague, tête, ennemis (type, position, vie), butin, tirs, ÉTAT DE TOUS LES FLUX de N.rng, puis
      l'empreinte SHA-256 du journal complet. Avant et après doivent être identiques, empreinte pour empreinte.
   2. EN AVENTURE (titre → JOUER → choix → époques sautées → néon, comme tools/voyage/banc.mjs), sur iPhone 13
      paysage 844 × 390, iPhone 13 portrait 390 × 844 et bureau 1440 × 900 : après une coupe, un régénérateur
      s'annonce puis s'allume ; la tête le ramasse ; le serpent repousse segment par segment jusqu'à sa longueur ;
      un second, non pris, clignote puis s'éteint ; une mort en appelle un aussi ; palette fermée (tampon), aucune
      encre cyan ni cyan pâle dans le dessin du butin, zéro erreur. Captures à chaque moment.
   Usage : serveur http à la racine du dépôt (port 8133), puis
     node tools/regen/banc.mjs [--sortie DOSSIER] [--ref COMMIT] [--profils paysage,portrait,bureau]
       [--graines 1,2,3] [--pilotes bon,maladroit] [--etapes identite,aventure] [--sans-isoler]
   Le banc construit lui-même tools/regen/index.html (build.mjs), puis avant.html et apres.html (pages générées, hors dépôt).
   Sortie 0 si tout passe ; mesures.json dans le dossier de sortie. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PROTO = path.resolve(HERE, '../..'), RACINE = path.resolve(PROTO, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SORTIE = arg('--sortie', path.join(os.tmpdir(), 'regen-banc'));
const REF = arg('--ref', '1aa180f');
const PROFILS = arg('--profils', 'paysage,portrait,bureau').split(',');
const GRAINES = arg('--graines', '1,2,3').split(',').map(Number);
const PILOTES = arg('--pilotes', 'bon,maladroit').split(',');
const ETAPES = arg('--etapes', 'identite,aventure').split(',');
const BASE = 'http://127.0.0.1:8133/proto-neon/tools/regen/';
fs.mkdirSync(SORTIE, { recursive: true });
const echecs = [], mesures = { ref: REF, identite: [], aventure: {} };
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); return ok; }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/* ---- « avant » et « après » : le bundle est construit ici, puis ISOLÉ : chaque module qui diffère de la référence
   (les chantiers parallèles en cours, 72-ennemis.js par exemple) y est remis tel qu'il est à --ref, sauf 71-butin.js.
   « après » = la référence + le 71-butin.js courant ; « avant » = la référence entière. Seul le régénérateur diffère.
   --sans-isoler : garder les autres modules tels qu'ils sont sur le disque (dans les deux pages). ---- */
execFileSync('node', [path.join(PROTO, 'build.mjs'), path.join(HERE, 'index.html')], { stdio: 'ignore' });
const brut = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const ISOLER = !process.argv.includes('--sans-isoler');
const refDe = f => { try { return execFileSync('git', ['-C', RACINE, 'show', `${REF}:proto-neon/src/${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };
const marque = f => `/* ===== ${f} ===== */\n`;
let apres = brut; const isoles = [];
for (const f of fs.readdirSync(path.join(PROTO, 'src')).filter(f => f.endsWith('.js')).sort()) {
  const disque = fs.readFileSync(path.join(PROTO, 'src', f), 'utf8');
  if (!apres.includes(marque(f) + disque)) { console.error(`le bundle ne contient pas ${f} tel qu'il est sur le disque (modifié pendant la construction ?) : relancer`); process.exit(2); }
  if (!ISOLER || f === '71-butin.js') continue;
  const ref = refDe(f);
  if (ref === disque) continue;
  apres = apres.split(marque(f) + disque).join(ref === null ? marque(f) + '/* absent de la référence */' : marque(f) + ref);
  isoles.push(f + (ref === null ? ' (retiré : absent de la référence)' : ' (remis à la référence)'));
}
const butinNeuf = fs.readFileSync(path.join(PROTO, 'src/71-butin.js'), 'utf8');
const butinRef = refDe('71-butin.js');
const avant = apres.split(marque('71-butin.js') + butinNeuf).join(marque('71-butin.js') + butinRef);
fs.writeFileSync(path.join(HERE, 'apres.html'), apres);
fs.writeFileSync(path.join(HERE, 'avant.html'), avant);
mesures.isoles = isoles;
console.log(`avant.html : 71-butin.js de ${REF} (${butinRef.length} octets) ; apres.html : courant (${butinNeuf.length} octets) ; diff ${butinRef === butinNeuf ? 'AUCUNE' : 'présente'}`);
console.log(`modules remis à la référence dans les deux pages : ${isoles.length ? isoles.join(', ') : 'aucun'}`);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });

/* =============================== 1. hors aventure : avant = après =============================== */
async function partie(page, graine, pilote) {
  return page.evaluate(({ graine, pilote }) => {
    const N = window.__N, S = window.__S, O = N.outils;
    localStorage.clear(); S.jour = 20261017;
    if (S.reglages) S.reglages.actions = 'doigts';
    N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
    if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
    N.pilote.lancer(pilote); N.journal.actif(true); N.horloge.avancer();
    const r6 = v => Math.round(v * 1e6) / 1e6;
    const flux = () => (N.rng.noms || []).map(n => [n, N.rng(n).etat()]);
    const empreinte = () => {
      const J = N.joueuse, T = J.tete;
      return { t: r6(N.horloge.t()), etat: N.game.etat(), score: S.score, len: J.len(), joueuse: J.etat, vague: N.dir.vague ? N.dir.vague() : null,
        tete: [r6(T.x), r6(T.y), r6(T.ang)],
        ennemis: N.ennemis.list.map(e => [e.type, r6(e.x), r6(e.y), e.hp !== undefined ? e.hp : e.vie]),
        butin: N.butin.list.map(c => [c.type, r6(c.x), r6(c.y), r6(c.vie), c.valeur]),
        tirs: (N.ennemis.tirs || []).length + '/' + (N.arsenal.tirs || []).length, flux: flux(),
        aventure: !!(N.aventure && N.aventure.enCours && N.aventure.enCours()) };
    };
    const instants = [10, 20, 30, 45, 60, 90], E = [];
    let k = 0, garde = 0;
    while (k < instants.length && garde++ < 2000) {
      if (N.game.etat() === 'fin') { E.push({ fin: true, ...empreinte() }); break; }
      N.game.dbg.simuler(0.25);
      while (k < instants.length && N.horloge.t() >= instants[k]) { E.push(empreinte()); k++; }
    }
    const j = N.journal.dump();
    return { E, journal: JSON.stringify(j), coupes: j.filter(e => e.type === 'coupe').length, morts: j.filter(e => e.type === 'mort').length,
      err: window.__ERR ? window.__ERR.count : 0, regen: N.butin.regenerateur ? N.butin.regenerateur() : null };
  }, { graine, pilote });
}
async function identite(fichier, graine, pilote) {
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(seed => { window.__SEED = seed; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }, graine);
  await page.goto(BASE + fichier + '?journal=1&banc=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.pilote);
  const r = await partie(page, graine, pilote);
  await ctx.close();
  return { ...r, erreurs, journalSha: sha(r.journal), empreintes: r.E.map(e => sha(JSON.stringify(e))) };
}
if (ETAPES.includes('identite')) console.log('\n1. hors aventure : empreintes avant / après');
for (const graine of ETAPES.includes('identite') ? GRAINES : []) for (const pilote of PILOTES) {
  const a = await identite('avant.html', graine, pilote), b = await identite('apres.html', graine, pilote);
  const memes = a.E.length === b.E.length && a.empreintes.every((h, i) => h === b.empreintes[i]) && a.journalSha === b.journalSha;
  const ligne = { graine, pilote, instants: a.E.map(e => e.t), avant: a.empreintes.map(h => h.slice(0, 12)), apres: b.empreintes.map(h => h.slice(0, 12)),
    journalAvant: a.journalSha.slice(0, 16), journalApres: b.journalSha.slice(0, 16), coupes: b.coupes, morts: b.morts,
    dernier: { t: b.E.at(-1).t, score: b.E.at(-1).score, len: b.E.at(-1).len, ennemis: b.E.at(-1).ennemis.length, vague: b.E.at(-1).vague },
    regenApres: b.regen, aventure: b.E.some(e => e.aventure), erreurs: a.err + b.err + a.erreurs.length + b.erreurs.length };
  mesures.identite.push(ligne);
  console.log(`  graine ${graine} ${pilote} : ${ligne.instants.join('/')} s, coupes ${ligne.coupes}, morts ${ligne.morts}, journal ${ligne.journalAvant} / ${ligne.journalApres}`);
  verifie(memes, `graine ${graine} ${pilote} : ${a.E.length} empreintes et journal identiques avant / après`);
  verifie(!ligne.aventure && b.regen && b.regen.apparus === 0 && b.regen.etat === 'aucun', `graine ${graine} ${pilote} : hors aventure, aucun régénérateur (${JSON.stringify(b.regen)})`);
  verifie(ligne.erreurs === 0, `graine ${graine} ${pilote} : zéro erreur (${ligne.erreurs}${a.erreurs.concat(b.erreurs).length ? ' : ' + a.erreurs.concat(b.erreurs).slice(0, 2).join(' | ') : ''})`);
}
if (ETAPES.includes('identite')) verifie(mesures.identite.some(l => l.coupes > 0), `le chemin de la coupe a bien été parcouru hors aventure (${mesures.identite.map(l => l.coupes).join(', ')} coupes)`);

/* =============================== 2. en aventure =============================== */
const PROFIL = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false }
};
async function aventure(nom) {
  console.log(`\n2. en aventure : ${nom}`);
  const M = mesures.aventure[nom] = {};
  const ctx = await browser.newContext(PROFIL[nom]);
  const page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(() => { if (!sessionStorage.getItem('deja')) { localStorage.removeItem('snake2975.pilotes'); sessionStorage.setItem('deja', '1'); } });
  await page.goto(BASE + 'apres.html?banc=1');
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure);
  const vp = PROFIL[nom].viewport, tactile = PROFIL[nom].hasTouch !== false;
  const toucher = async (x, y) => { if (tactile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape ? window.__N.aventure.etape() : null }));
  const cap = async (n) => { await page.screenshot({ path: path.join(SORTIE, `${nom}-${n}.png`) }); };
  /* titre → JOUER → choix (à gauche : ELLE) → époques sautées → néon */
  for (let i = 0; i < 160; i++) { const s = await st(); if (s.jeu === 'aventure') break;
    await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
    await toucher(vp.width * 0.7, vp.height * 0.5); await page.waitForTimeout(250); }
  for (let i = 0; i < 400; i++) { const s = await st(); if (s.jeu !== 'aventure') break;
    if (s.etape === 'choix') { await page.waitForTimeout(700); await toucher(vp.width * 0.25, vp.height * 0.5); await page.waitForTimeout(300); continue; }
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
      if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(200); }
  await page.waitForFunction(() => window.__N.game.etat() === 'jeu' && window.__N.joueuse.etat === 'vivant', null, { timeout: 30000 }).catch(() => {});
  const R = () => page.evaluate(() => ({ ...window.__N.butin.regenerateur(), len: window.__N.joueuse.len(), jeu: window.__N.game.etat(), j: window.__N.joueuse.etat }));
  const enAv = await page.evaluate(() => window.__N.aventure.enCours());
  verifie(enAv && (await st()).jeu === 'jeu', `${nom} : dans le néon, aventure en cours (${JSON.stringify(await st())})`);
  /* l'espion : les encres posées par N.butin.draw (primitives de N.gfx), et la palette du tampon */
  await page.evaluate(() => {
    const N = window.__N, g = N.gfx, B = N.butin, encres = window.__ENCRES = {};
    const noms = ['px', 'line', 'ring', 'circ', 'disc', 'rect', 'ditherCirc', 'ditherRect'];
    const draw0 = B.draw;
    B.draw = function () {
      const orig = {};
      noms.forEach(n => { if (typeof g[n] === 'function') { orig[n] = g[n]; g[n] = function () { const a = arguments, ci = n === 'disc' ? a[4] : n === 'rect' ? a[4] : n === 'ditherRect' ? a[4] : n === 'px' ? a[2] : n === 'line' ? a[4] : a[3]; encres[ci] = (encres[ci] || 0) + 1; return orig[n].apply(g, a); }; } });
      try { return draw0.apply(B, arguments); } finally { noms.forEach(n => { if (orig[n]) g[n] = orig[n]; }); }
    };
    N.game.dbg.god(true);
  });
  const palette = () => page.evaluate(() => { const b = window.__N.gfx.buf(); let hors = 0; for (let i = 0; i < b.length; i++) if (b[i] > 15) hors++; return hors; });
  const cadre = async (n) => {                                   // une capture recadrée autour du régénérateur
    const c = await page.evaluate(() => { const N = window.__N, O = N.outils, r = N.butin.regenerateur(), rc = N.gfx.canvas().getBoundingClientRect(), p = N.gfx.PX;
      return { x: rc.left + (r.x - (O.geo.cam ? O.VUE.x : 0)) * p, y: rc.top + (r.y - (O.geo.cam ? O.VUE.y : 0)) * p, p }; });
    const w = Math.round(c.p * 70), x = Math.max(0, Math.min(vp.width - w, Math.round(c.x - w / 2))), y = Math.max(0, Math.min(vp.height - w, Math.round(c.y - w / 2)));
    await page.screenshot({ path: path.join(SORTIE, `${nom}-${n}-zoom.png`), clip: { x, y, width: w, height: w } });
  };
  /* attendre une condition ; l'écran des cartes (fin de vague) se passe en prenant la première, comme un pilote */
  const attendre = async (cond, ms) => { const t0 = Date.now(); for (;;) { const r = await R(); if (cond(r)) return r; if (Date.now() - t0 > ms) return r;
    if (r.jeu === 'cartes') { M.cartes = (M.cartes || 0) + 1; await page.waitForTimeout(500); await page.keyboard.press('1'); }
    else if (r.jeu === 'panneau' || r.jeu === 'aventure') {                // un film (de vague, d'époque) : sauté
      M.films = (M.films || 0) + 1;
      await page.evaluate(() => { const N = window.__N; if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); else if (N.intro && N.intro.skip) N.intro.skip(); });
    }
    await page.waitForTimeout(60); } };

  /* a. une coupe : il s'annonce, s'allume, on le prend, le serpent repousse */
  await page.evaluate(() => window.__N.joueuse.grandir(16));
  await page.waitForTimeout(500);
  const r0 = await R();
  const perdus = await page.evaluate(() => { const J = window.__N.joueuse; return J.couper(Math.max(3, Math.round(J.len() / 2))); });
  const r1 = await R();
  M.coupe = { longueurAvant: r0.len, perdus, longueurApres: r1.len };
  verifie(perdus > 0 && r1.perdu === perdus, `${nom} : coupe de ${perdus} segments (${r0.len} → ${r1.len}), notés à rendre (${r1.perdu})`);
  await cap('1-coupe');
  const ra = await attendre(r => r.etat === 'annonce', 4000);
  M.annonce = ra.etat === 'annonce';
  verifie(ra.etat === 'annonce', `${nom} : l'annonce vient (${ra.etat})`);
  await page.waitForTimeout(350); await cap('2-annonce'); await cadre('2-annonce');
  const rp = await attendre(r => r.etat === 'pret', 3000);
  verifie(rp.etat === 'pret', `${nom} : le régénérateur s'allume (${rp.etat}, à ${rp.x.toFixed(0)}, ${rp.y.toFixed(0)})`);
  await page.waitForTimeout(400); await cap('3-pret'); await cadre('3-pret');
  M.paletteHors = await palette();
  const lenAvantPrise = (await R()).len;
  await page.evaluate(() => { const r = window.__N.butin.regenerateur(); window.__N.joueuse.force({ x: r.x - 3, y: r.y, ang: 0, trace: true }); });
  const rq = await attendre(r => r.pris >= 1, 2000);
  verifie(rq.pris === 1 && rq.rendre > 0, `${nom} : pris par la tête, ${rq.rendre} segments à rendre`);
  await page.waitForTimeout(450); await cap('4-repousse');
  const rmi = await R();
  const rf = await attendre(r => r.rendre === 0, 8000);
  M.repousse = { avantPrise: lenAvantPrise, pendant: rmi.len, apres: rf.len, rendus: rf.rendus };
  verifie(rmi.len > lenAvantPrise && rmi.len < rf.len, `${nom} : la repousse est progressive (${lenAvantPrise} → ${rmi.len} → ${rf.len})`);
  verifie(rf.rendus === perdus && rf.len >= r0.len && rf.len - lenAvantPrise >= rf.rendus,
    `${nom} : le serpent a retrouvé sa longueur (${rf.len} pour ${r0.len} avant la coupe ; ${rf.rendus} rendus sur ${perdus} perdus, les cellules mangées en plus)`);
  await cap('5-rendu');

  /* b. une seconde coupe : celui-là n'est pas pris, il clignote puis s'éteint */
  await page.evaluate(() => { const J = window.__N.joueuse; J.couper(Math.max(3, Math.round(J.len() * 0.7))); });
  const rb = await attendre(r => r.etat === 'pret', 12000);
  verifie(rb.etat === 'pret' && rb.apparus === 2, `${nom} : un second après la recharge (${rb.etat}, ${rb.apparus} apparus)`);
  /* la tête passe loin : on la tient à distance en l'envoyant de l'autre côté de l'arène */
  const rc = await attendre(r => r.etat === 'pret' && r.vie < 2.2, 12000);
  await cap('6-clignote');
  const re = await attendre(r => r.eteints >= 1, 4000);
  M.extinction = { vieVue: rc.vie, eteints: re.eteints, pris: re.pris };
  verifie(re.eteints === 1 && re.pris === 1, `${nom} : pas pris, il s'éteint (${re.eteints} éteint, ${re.pris} pris)`);

  /* c. une mort : la moitié perdue à la réapparition appelle un régénérateur */
  await page.evaluate(() => { window.__N.game.dbg.god(false); });
  const avantMort = await R();
  await page.evaluate(() => window.__N.joueuse.tuer('tir', null));
  const rm = await attendre(r => (r.j === 'vivant' || r.j === 'reapparition') && r.perdu > avantMort.perdu, 15000).catch(() => null);
  await page.evaluate(() => { window.__N.game.dbg.god(true); });
  const rm2 = await attendre(r => r.etat === 'annonce' || r.etat === 'pret', 12000);
  M.mort = { perduAvant: avantMort.perdu, perduApres: rm ? rm.perdu : null, etat: rm2.etat, len: rm2.len };
  verifie(rm && rm.perdu > avantMort.perdu && (rm2.etat === 'annonce' || rm2.etat === 'pret'), `${nom} : après la mort, segments perdus ${avantMort.perdu} → ${rm ? rm.perdu : '?'}, régénérateur ${rm2.etat} (jeu ${rm2.jeu}, serpent ${rm2.j})`);
  await page.waitForTimeout(1000); await cap('7-apres-mort');

  const encres = await page.evaluate(() => window.__ENCRES);
  const cy = await page.evaluate(() => [window.__N.pal.i('cyan'), window.__N.pal.i('cyanPale')]);
  const noms = await page.evaluate(() => window.__N.pal.NAMES);
  M.encres = Object.fromEntries(Object.entries(encres).map(([k, v]) => [noms[k] || k, v]));
  verifie(!encres[cy[0]] && !encres[cy[1]], `${nom} : aucune encre cyan dans le dessin du butin (${Object.keys(M.encres).join(', ')})`);
  verifie(M.paletteHors === 0, `${nom} : palette fermée, ${M.paletteHors} pixel hors des seize encres`);
  const nerr = await page.evaluate(() => window.__ERR ? window.__ERR.count : 0);
  M.erreurs = { err: nerr, page: erreurs };
  verifie(nerr === 0 && erreurs.length === 0, `${nom} : zéro erreur (__ERR ${nerr}, page ${erreurs.length}${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''})`);
  await ctx.close();
}
for (const p of ETAPES.includes('aventure') ? PROFILS : []) await aventure(p);
await browser.close();
fs.writeFileSync(path.join(SORTIE, 'mesures.json'), JSON.stringify(mesures, null, 2) + '\n');
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\ntout passe', '· mesures :', path.join(SORTIE, 'mesures.json'));
process.exit(echecs.length ? 1 : 0);
