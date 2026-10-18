/* tools/serpents/banc.mjs — les serpents de 2030 (TIQUE, VOLEUR, MIROIR, BROUILLEUR) dans le VRAI jeu néon, en aventure.
   Pour chaque profil (paysage 844 × 390 iPhone, portrait 390 × 844 iPhone, bureau 1280 × 800 souris) :
   1. l'aventure comme la propriétaire : titre → JOUER → choix → 1976, 1982, films sautés → le néon (tools/voyage/banc.mjs) ;
   2. LES VAGUES : N.game.dbg.vague(2…5), pilote « bon », invulnérable ; chaque serpent prévu naît, annoncé, hors de la vue,
      deux au plus à la fois ; les films d'époque (profondeur, warp) qui s'invitent sont sautés ;
   3. LES SCÈNES : directeur arrêté, ennemis ordinaires retirés, la tête tourne en grand cercle ; pour chaque type, ce qu'il
      fait (accroche et morsure, vol et fuite, rejeu de la trajectoire, champ qui coupe les armes) et comment on le bat
      (tête qui écrase, accélération qui secoue, tir, boucle de LASSO, tête qui traverse) ;
   4. LA PALETTE : pixels dessinés par les ennemis (masque de propriété du jeu) : jamais cyan ni cyan pâle ;
   5. zéro erreur (__ERR, pageerror, console.error).
   Captures dans --sortie (défaut : le scratchpad de la session). Usage : serveur http sur la racine du dépôt (8133),
   node build.mjs tools/serpents/index.html, puis node tools/serpents/banc.mjs [--profils paysage,portrait,bureau]. Sortie 0 si tout passe. */
import fs from 'fs';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SORTIE = arg('--sortie', '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/serpents');
const PROFILS = arg('--profils', 'paysage,portrait,bureau').split(',');
const URL = arg('--url', 'http://127.0.0.1:8133/proto-neon/tools/serpents/index.html');
fs.mkdirSync(SORTIE, { recursive: true });
const echecs = [], mesures = {};
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); return ok; }

/* ---- les aides installées dans la page ---- */
function aides() {
  const B = window.__B = {};
  const N = () => window.__N;
  B.interlude = function () {                        // un film d'époque s'invite (vague 3, 4) : on le saute, le néon reprend
    const n = N();
    for (let i = 0; i < 40 && n.game.etat() === 'aventure'; i++) {
      if (n.film && n.film.actif && n.film.actif()) n.film.sauter(); else if (n.aventure.etape() !== 'neon') n.aventure.sauter();
      n.game.dbg.simuler(0.05);
    }
  };
  B.sim = function (sec, arret) {
    const n = N(); let t = 0;
    while (t < sec - 1e-9) {
      const d = Math.min(0.05, sec - t); n.game.dbg.simuler(d); t += d; B.interlude();
      if (arret && arret()) return t;
    }
    return t;
  };
  B.serp = function (type) { return N().ennemis.list.filter(e => e._serpent && !e._dead && (!type || e.type === type)); };
  B.un = function (type) { return B.serp(type)[0] || null; };
  B.evt = function (k) { return N().serpents.stats.evts[k] || 0; };
  B.morts = function (type) { return N().serpents.stats.morts[type] || {}; };
  /* les pilotes du banc : ils n'écrivent que S.input, comme 85-pilote.js */
  B.pilote = function (mode, o) {
    o = o || {};
    if (!mode) { window.__PILOT = null; const I = N().S.input; I.x = 0; I.y = 0; I.mag = 0; I.boost = false; return; }
    window.__PILOT = function () {
      const n = N(), P = n.joueuse.tete, I = n.S.input; let h = P.ang, mag = 1;
      if (mode === 'cercle') {
        const a = Math.atan2(P.y - o.cy, P.x - o.cx), d = Math.hypot(P.x - o.cx, P.y - o.cy);
        h = a + Math.PI / 2 + Math.max(-1, Math.min(1, (d - o.r) / 40)) * 0.9;
      } else if (mode === 'boucle') { h = P.ang + Math.PI / 2; mag = o.mag; }
      else if (mode === 'vers') { const e = n.ennemis.list.find(x => x.id === o.id); if (e) h = Math.atan2(e.y - P.y, e.x - P.x); }
      I.x = Math.cos(h); I.y = Math.sin(h); I.mag = mag; I.boost = !!o.boost;
    };
  };
  /* une scène contrôlée : vague 2 relancée, directeur arrêté, terrain vidé, la tête au centre gauche, invulnérable */
  B.scene = function () {
    const n = N(), O = n.outils;
    if (B._dirUpd) n.dir.update = B._dirUpd;
    n.game.dbg.vague(2);
    B._dirUpd = n.dir.update; n.dir.update = function () {};
    n.ennemis.list.length = 0; n.ennemis.tirs.length = 0; n.ennemis.lasers.length = 0; n.butin.list.length = 0;
    const A = O.A, cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2;
    n.joueuse.force({ x: cx, y: cy - 120, ang: 0, len: 14, trace: true });
    n.game.dbg.god(true);
    B.cx = cx; B.cy = cy;
    B.pilote('cercle', { cx, cy, r: 120 });
    B.sim(0.3);
  };
  B.finScene = function () { const n = N(); if (B._dirUpd) { n.dir.update = B._dirUpd; B._dirUpd = null; } B.pilote(null); };
  /* l'écran : un ennemi est-il dessiné en entier dans la vue ? et sa boîte en px CSS pour un recadrage */
  B.boite = function (e, demi) {
    const n = N(), V = n.outils.VUE, r = n.gfx.canvas().getBoundingClientRect(), k = r.width / n.outils.geo.W;
    return { x: r.left + (e.x - V.x - demi) * k, y: r.top + (e.y - V.y - demi) * k, w: 2 * demi * k, h: 2 * demi * k };
  };
  B.vu = function (e) { const V = N().outils.VUE; return e.x > V.x + 8 && e.x < V.x + V.w - 8 && e.y > V.y + 8 && e.y < V.y + V.h - 8; };
}

async function entrerNeon(page, tactile) {
  const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape() }));
  const vp = page.viewportSize();
  const taper = async (x, y) => { if (tactile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  for (let i = 0; i < 160; i++) {
    const s = await st(); if (s.jeu === 'aventure') break;
    await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
    await taper(vp.width * 0.7, vp.height * 0.5); await page.waitForTimeout(250);
  }
  for (let i = 0; i < 400; i++) {
    const s = await st(); if (s.jeu !== 'aventure') break;
    if (s.etape === 'choix') { await page.waitForTimeout(500); await taper(vp.width * 0.25, vp.height * 0.5); await page.waitForTimeout(300); continue; }
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
      if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(200);
  }
  return st();
}

async function capture(page, nom, type, demi) {
  await page.waitForTimeout(90);                      // une image dessinée par la boucle réelle
  const b = await page.evaluate(([t, d]) => { const e = window.__B.un(t); return e ? window.__B.boite(e, d) : null; }, [type, demi || 40]);
  await page.screenshot({ path: `${SORTIE}/${nom}.png` });
  if (b) {
    const vp = page.viewportSize(), x = Math.max(0, b.x), y = Math.max(0, b.y);
    const clip = { x, y, width: Math.min(b.w, vp.width - x), height: Math.min(b.h, vp.height - y) };
    if (clip.width > 8 && clip.height > 8) await page.screenshot({ path: `${SORTIE}/${nom}-zoom.png`, clip });
  }
}

async function profil(nom) {
  console.log(`\n=== ${nom} ===`);
  const ctxOpts = nom === 'paysage' ? { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }
    : nom === 'portrait' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false };
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const page = await (await browser.newContext(ctxOpts)).newPage();
  const logs = []; page.on('pageerror', e => logs.push('page : ' + e.message)); page.on('console', m => { if (m.type() === 'error') logs.push('console : ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.removeItem('snake2975.pilotes'); } catch (x) { /* rien */ } });
  await page.addInitScript(aides);
  await page.goto(URL);
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure && window.__N.serpents);
  const M = mesures[nom] = {};
  const neon = await entrerNeon(page, nom !== 'bureau');
  verifie(neon.etape === 'neon' && neon.jeu !== 'aventure', `${nom} : l'aventure arrive au néon (${neon.jeu}/${neon.etape})`);
  verifie(await page.evaluate(() => window.__N.aventure.enCours()), `${nom} : N.aventure.enCours() vrai pendant le néon`);

  /* ---- 2. les vagues ---- */
  const prevu = { 2: ['tique', 'tique'], 3: ['voleur', 'tique'], 4: ['brouilleur', 'miroir'], 5: ['miroir', '?'] };
  await page.evaluate(() => { const N = window.__N; N.game.dbg.god(true); N.pilote.lancer('bon'); N.serpents.remiseStats(); });
  const annoncesVues = {};
  for (const v of [2, 3, 4, 5]) {
    await page.evaluate(v => { window.__N.serpents.remiseStats(); window.__N.game.dbg.vague(v); window.__B.interlude(); }, v);
    const vus = {}, annonces = {};
    let maxVivants = 0;
    for (let k = 0; k < 34 * 4; k++) {
      const r = await page.evaluate(() => {
        const B = window.__B, N = window.__N; B.sim(0.25);
        const L = B.serp(), V = N.outils.VUE;
        return { tw: N.dir.tempsVague(), etat: N.game.etat(), vivants: L.length, vague: N.dir.vague(),
          visibles: L.filter(e => e.etat !== 'portail' && B.vu(e)).map(e => e.type),
          portails: L.filter(e => e.etat === 'portail').map(e => ({ t: e.type, dedans: e.x > V.x && e.x < V.x + V.w && e.y > V.y && e.y < V.y + V.h, age: e._age })),
          nais: Object.values(N.serpents.stats.naissances).reduce((a, b) => a + b, 0), types: Object.keys(N.serpents.stats.naissances) };
      });
      maxVivants = Math.max(maxVivants, r.vivants);
      for (const t of r.types) if (!annonces[t]) { annonces[t] = 1; if (!annoncesVues[t]) { annoncesVues[t] = 1; await page.waitForTimeout(300); await page.screenshot({ path: `${SORTIE}/annonce-${t}-${nom}.png` }); } }
      for (const t of r.visibles) if (!vus[t]) { vus[t] = r.tw; await capture(page, `vague${v}-${t}-${nom}`, t, 48); }
      if (r.nais >= 2 && Object.keys(vus).length >= (v === 2 ? 1 : 2) && r.tw > 4) break;
      if (r.vague !== v) break;
    }
    const s = await page.evaluate(() => ({ nais: window.__N.serpents.stats.naissances, evts: window.__N.serpents.stats.evts, morts: window.__N.serpents.stats.morts, journal: window.__N.serpents.stats.journal.slice(0, 40) }));
    M['vague' + v] = { naissances: s.nais, evts: s.evts, morts: s.morts, vus, maxVivants };
    const attendus = prevu[v].filter(t => t !== '?');
    const nb = Object.values(s.nais).reduce((a, b) => a + b, 0);
    verifie(attendus.every(t => (s.nais[t] || 0) >= attendus.filter(x => x === t).length) && nb >= 2, `${nom} V${v} : naissances ${JSON.stringify(s.nais)} (prévu ${prevu[v].join(', ')})`);
    verifie(maxVivants <= 2, `${nom} V${v} : au plus deux à la fois (${maxVivants})`);
    const nes = s.journal.filter(j => j.evt === 'naissance');
    verifie(nes.length >= 2 && nes.every(j => !j.dansVue), `${nom} V${v} : aucune naissance dans la vue (${nes.length} naissances)`);
  }
  const ban = await page.evaluate(() => window.__N.serpents.etat().vus);
  verifie(['tique', 'voleur', 'brouilleur', 'miroir'].every(t => ban.includes(t)), `${nom} : les quatre ont eu leur règle de première rencontre (${ban.join(', ')})`);
  await page.evaluate(() => window.__N.pilote.arreter());

  /* ---- 3a. TIQUE ---- */
  let r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene(); N.serpents.remiseStats();
    const e = N.serpents.forcer('tique'); if (!e) return { ok: false };
    B.sim(14, () => e._st === 'accroche');
    const accroche = e._st === 'accroche', len0 = N.joueuse.len();
    return { ok: true, accroche, len0, id: e.id };
  });
  verifie(r.ok && r.accroche, `${nom} TIQUE : elle rejoint le serpent et s'accroche près de la queue`);
  /* accrochée, elle alourdit le virage (N.joueuse.frein) : pas de virage maximal par image, frein en place / frein neutralisé */
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, O = N.outils, t0 = O.turnTo, fr = N.joueuse.frein, pas = [];
    O.turnTo = function (a, b, m) { pas.push(m); return t0.apply(this, arguments); };
    B.sim(0.4, () => false); const avec = pas.splice(0);
    N.joueuse.frein(1, 0); N.joueuse.frein = function () {};
    B.sim(0.4, () => false); const sans = pas.splice(0);
    N.joueuse.frein = fr; O.turnTo = t0;
    const moy = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    return { ratio: moy(avec) / moy(sans), n: avec.length + sans.length, nom: N.ids.texte('ennemi', 'tique') + ' / ' + N.ids.texte('tir', 'voleur') + ' / ' + N.ids.texte('ennemi', 'miroir') + ' / ' + N.ids.texte('ennemi', 'brouilleur') };
  });
  verifie(r.n > 10 && r.ratio > 0.7 && r.ratio < 0.8, `${nom} TIQUE : accrochée, elle alourdit le virage (×${r.ratio.toFixed(2)})`);
  verifie(r.nom === 'TIQUE / TIR DU VOLEUR / MIROIR / BROUILLEUR', `${nom} noms des ennemis de 2030 inscrits au contrat (${r.nom})`);
  await capture(page, `tique-accrochee-${nom}`, 'tique', 36);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, e = B.un('tique'); if (!e) return {};
    B.sim(3, () => e._st === 'mord');
    return { mord: e._st === 'mord', len: N.joueuse.len() };
  });
  verifie(r.mord, `${nom} TIQUE : la morsure s'annonce (anneau qui se resserre, 0,9 s)`);
  await capture(page, `tique-morsure-${nom}`, 'tique', 40);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, e = B.un('tique'), len0 = N.joueuse.len();
    B.sim(1.2, () => B.evt('tique:morsure') > 0);
    const tele = (N.S.tele || []).length;
    return { morsures: B.evt('tique:morsure'), perdu: len0 - N.joueuse.len(), st: e && e._st };
  });
  verifie(r.morsures >= 1 && r.perdu === 1, `${nom} TIQUE : elle mord le dernier segment (−${r.perdu})`);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, e = B.un('tique');
    B.pilote('cercle', { cx: B.cx, cy: B.cy, r: 120, boost: true });
    B.sim(1.5, () => B.evt('tique:secouee') > 0);
    B.pilote('cercle', { cx: B.cx, cy: B.cy, r: 120 });
    const secouee = B.evt('tique:secouee') > 0;
    B.pilote('vers', { id: e.id });
    B.sim(6, () => e._dead);
    return { secouee, morte: e._dead, morts: B.morts('tique') };
  });
  verifie(r.secouee, `${nom} TIQUE : l'accélération tenue la secoue`);
  verifie(r.morte, `${nom} TIQUE : poursuivie, elle est abattue ou écrasée ${JSON.stringify(r.morts)}`);
  const t1 = r;
  r = await page.evaluate(() => {                    // l'écrasement seul : une tique accrochée, la tête posée à côté d'elle
    const B = window.__B, N = window.__N; N.serpents.remiseStats();
    /* grand cercle : la tique accrochée freine le virage, un cercle serré refermerait un LASSO sur elle */
    B.pilote('cercle', { cx: B.cx, cy: B.cy, r: 150 });
    const e = N.serpents.forcer('tique'); if (!e) return {};
    B.sim(14, () => e._st === 'accroche');
    const P = N.joueuse.tete, a = Math.atan2(e.y - P.y, e.x - P.x);
    N.joueuse.force({ x: e.x - Math.cos(a) * 6, y: e.y - Math.sin(a) * 6 });
    B.sim(0.05);
    return { morte: e._dead, morts: B.morts('tique') };
  });
  verifie(r.morte && r.morts['joueuse:devore'] === 1, `${nom} TIQUE : la tête qui passe dessus l'écrase ${JSON.stringify(r.morts)}`);
  M.tique = { poursuite: t1, ecrase: r };

  /* ---- 3b. VOLEUR ---- */
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene(); N.serpents.remiseStats();
    const e = N.serpents.forcer('voleur'); if (!e) return {};
    B.sim(4, () => e.etat !== 'portail' && B.vu(e));
    for (let i = 0; i < 3; i++) N.butin.lacher(e.x + 14 * Math.cos(i * 2), e.y + 14 * Math.sin(i * 2), 1, { type: 'cellule', libre: true });
    B.sim(8, () => e._st === 'alerte');
    return { vols: B.evt('voleur:vol'), sac: e._sac, alerte: e._st === 'alerte' };
  });
  verifie(r.vols >= 3 && r.alerte, `${nom} VOLEUR : il empoche les cellules (${r.vols}) puis crie « IL FUIT ! »`);
  await capture(page, `voleur-fuite-annoncee-${nom}`, 'voleur', 60);
  r = await page.evaluate(() => { const B = window.__B, N = window.__N; N.score.ajouter(1000); const avant = N.score.score; B.sim(10, () => B.evt('voleur:evade') > 0); return { evade: B.evt('voleur:evade'), perte: avant - N.score.score }; });
  verifie(r.evade === 1, `${nom} VOLEUR : non abattu, il s'échappe par le bord (BUTIN VOLÉ)`);
  verifie(r.perte === 120, `${nom} VOLEUR : BUTIN VOLÉ coûte 40 points par objet (3 objets → −${r.perte})`);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; N.serpents.remiseStats();
    const e = N.serpents.forcer('voleur'); if (!e) return {};
    B.sim(4, () => e.etat !== 'portail' && B.vu(e));
    for (let i = 0; i < 2; i++) N.butin.lacher(e.x + 12 * Math.cos(i * 3), e.y + 12 * Math.sin(i * 3), 1, { type: 'cellule', libre: true });
    B.sim(4, () => e._sac >= 2);
    const sac = e._sac, val = e._val, n0 = N.butin.list.length;
    B.pilote('vers', { id: e.id });
    B.sim(8, () => e._dead);
    const grosse = N.butin.list.filter(o => o.type === 'cellule' && o.valeur >= 2).map(o => o.valeur);
    return { sac, val, mort: e._dead, morts: B.morts('voleur'), grosse };
  });
  verifie(r.mort && Object.keys(r.morts).some(k => k.startsWith('arme:')), `${nom} VOLEUR : abattu au tir ${JSON.stringify(r.morts)}`);
  verifie(r.grosse && r.grosse.some(v => v >= r.val), `${nom} VOLEUR : il rend tout en une grosse cellule (valeur ${JSON.stringify(r.grosse)} pour ${r.val} volés)`);
  await capture(page, `voleur-recupere-${nom}`, null, 0);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene(); N.serpents.remiseStats();
    const e = N.serpents.forcer('voleur'); if (!e) return {};
    const len0 = N.joueuse.len();
    B.sim(14, () => e._st === 'arrache');
    return { arrache: e._st === 'arrache', len0 };
  });
  verifie(r.arrache, `${nom} VOLEUR : sans butin au sol, il vient arracher la queue (annonce)`);
  await capture(page, `voleur-arrache-${nom}`, 'voleur', 40);
  r = await page.evaluate(len0 => { const B = window.__B, N = window.__N, e = B.un('voleur'); B.sim(2, () => B.evt('voleur:vol') > 0); return { arr: B.evt('voleur:arrache'), perdu: len0 - N.joueuse.len(), vol: B.evt('voleur:vol') }; }, r.len0);
  verifie(r.arr === 1 && r.perdu === 2 && r.vol >= 1, `${nom} VOLEUR : deux segments arrachés, la cellule tombée empochée (−${r.perdu}, vols ${r.vol})`);
  M.voleur = r;

  /* ---- 3c. MIROIR ---- */
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene(); N.serpents.remiseStats();
    const e = N.serpents.forcer('miroir'); if (!e) return {};
    B.sim(14, () => e._st === 'rejoue');
    let ecartMax = 0;
    for (let i = 0; i < 30; i++) { B.sim(0.05); const p = N.joueuse.segPos(e._kM); ecartMax = Math.max(ecartMax, Math.hypot(p.x - e.x, p.y - e.y)); }
    const v = N.joueuse.tete.vit, retard = e._kM * 5 / v, queue = (N.joueuse.len()) * 5;
    B.sim(8, () => e._st === 'rejoue' && B.vu(e));          // pour la capture : qu'on le voie (il roule derrière la queue)
    return { rejoue: e._st === 'rejoue', ecartMax, retard, derriereQueue: e._kM * 5 - queue };
  });
  verifie(r.rejoue && r.ecartMax < 1.5, `${nom} MIROIR : il roule sur ta trajectoire (écart ${r.ecartMax && r.ecartMax.toFixed(2)} px, retard ${r.retard && r.retard.toFixed(2)} s, ${r.derriereQueue && r.derriereQueue.toFixed(0)} px derrière la queue)`);
  await capture(page, `miroir-${nom}`, 'miroir', 44);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, e = B.un('miroir'), P = N.joueuse.tete, SRC = { genre: 'arme', type: 'canon', id: -1 };
    const pv0 = e.pv; N.ennemis.hit(e, 10, SRC); const face = pv0 - e.pv;
    const x = P.x, y = P.y;
    N.joueuse.force({ x: e.x - Math.cos(e.ang) * 40, y: e.y - Math.sin(e.ang) * 40 });
    const pv1 = e.pv; N.ennemis.hit(e, 10, SRC); const dos = pv1 - e.pv;
    N.joueuse.force({ x, y });
    return { face, dos };
  });
  verifie(r.face === 0 && r.dos === 10, `${nom} MIROIR : de face il renvoie le tir (−${r.face} PV), de dos il le prend (−${r.dos} PV)`);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, R = N.R, e = B.un('miroir');
    const dz = R.joueuse.dz, pl = R.joueuse.deflexion.pleine, rate = 11 / 26;
    B.pilote('boucle', { mag: dz + rate * (pl - dz) });
    const l0 = N.joueuse.lassos();
    B.sim(6, () => e._dead);
    B.pilote('cercle', { cx: B.cx, cy: B.cy, r: 120 });
    return { mort: e._dead, lassos: N.joueuse.lassos() - l0, morts: B.morts('miroir') };
  });
  verifie(r.mort && r.morts['joueuse:lasso'] >= 1, `${nom} MIROIR : une boucle de LASSO refermée sur lui le brise (${r.lassos} lasso) ${JSON.stringify(r.morts)}`);
  await capture(page, `miroir-lasso-${nom}`, null, 0);
  M.miroir = r;

  /* ---- 3d. BROUILLEUR ---- */
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene(); N.serpents.remiseStats();
    const e = N.serpents.forcer('brouilleur'); if (!e) return {};
    B.sim(14, () => e._dedans);
    let vifs = 0, pas = 0;
    for (let i = 0; i < 12 && e._dedans; i++) { B.sim(0.05); pas++; vifs += N.arsenal.tirs.filter(b => b.life > 0).length; }
    return { dedans: B.evt('brouilleur:brouille') > 0, vifs, pas };
  });
  verifie(r.dedans && r.vifs === 0, `${nom} BROUILLEUR : la tête dans le champ, les armes se taisent (${r.vifs} tir vivant sur ${r.pas} pas)`);
  await capture(page, `brouilleur-champ-${nom}`, 'brouilleur', 60);
  r = await page.evaluate(() => {
    const B = window.__B, N = window.__N, e = B.un('brouilleur'), SRC = { genre: 'arme', type: 'canon', id: -1 };
    const pv0 = e.pv; N.ennemis.hit(e, 10, SRC);
    B.pilote('vers', { id: e.id });
    B.sim(8, () => e._dead);
    return { blinde: pv0 - e.pv === 0 || e._dead, mort: e._dead, morts: B.morts('brouilleur'), avales: B.evt('brouilleur:avale') };
  });
  verifie(r.blinde, `${nom} BROUILLEUR : sa coque avale les tirs (${r.avales} avalés pendant la scène)`);
  verifie(r.mort && r.morts['joueuse:devore'] >= 1, `${nom} BROUILLEUR : la tête qui le traverse le détruit ${JSON.stringify(r.morts)}`);
  M.brouilleur = r;

  /* ---- 4. la palette : les quatre ensemble, pixels possédés par les ennemis ---- */
  await page.evaluate(() => {
    const B = window.__B, N = window.__N; B.scene();
    ['tique', 'voleur', 'miroir', 'brouilleur'].forEach(t => N.serpents.forcer(t));
    B.sim(9);
    N.game.dbg.masque(true);
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SORTIE}/quatre-${nom}.png` });
  const pal = await page.evaluate(() => {
    const N = window.__N, g = N.gfx, buf = g.copyTo(), mk = g.mask(), W = N.outils.geo.W, V = N.outils.VUE, own = N.ids.proprietaires.ennemi;
    const cyan = N.pal.i('cyan'), cyanP = N.pal.i('cyanPale'), parEncre = {};
    let interdits = 0, total = 0;
    const L = window.__B.serp().filter(e => e.etat !== 'portail');
    for (const e of L) {
      const cx = Math.round(e.x - V.x), cy = Math.round(e.y - V.y), d = e.type === 'brouilleur' ? 48 : 12;
      for (let y = cy - d; y <= cy + d; y++) for (let x = cx - d; x <= cx + d; x++) {
        if (x < 0 || y < 0 || x >= W || y * W + x >= buf.length) continue;
        const i = y * W + x; if (mk[i] !== own) continue;
        total++; const c = buf[i]; parEncre[N.pal.NAMES[c]] = (parEncre[N.pal.NAMES[c]] || 0) + 1;
        if (c === cyan || c === cyanP) interdits++;
      }
    }
    N.game.dbg.masque(false);
    return { types: L.map(e => e.type), total, interdits, parEncre };
  });
  verifie(pal.total > 50 && pal.interdits === 0, `${nom} PALETTE : ${pal.total} pixels d'ennemis autour de ${pal.types.join(', ')}, ${pal.interdits} cyan ; encres ${JSON.stringify(pal.parEncre)}`);
  M.palette = pal;
  await page.evaluate(() => window.__B.finScene());

  const err = await page.evaluate(() => ({ n: window.__ERR ? window.__ERR.count : 0, sigs: window.__ERR ? window.__ERR.sigs : null }));
  verifie(err.n === 0 && logs.length === 0, `${nom} : zéro erreur (__ERR ${err.n}, page ${logs.length}${logs.length ? ' : ' + logs.slice(0, 3).join(' | ') : ''})`);
  M.erreurs = { err, logs: logs.slice(0, 10) };
  await browser.close();
}

for (const p of PROFILS) await profil(p);
fs.writeFileSync(`${SORTIE}/mesures.json`, JSON.stringify(mesures, null, 2));
console.log(echecs.length ? `\n${echecs.length} échec(s) :\n - ${echecs.join('\n - ')}` : '\ntout passe');
process.exit(echecs.length ? 1 : 0);
