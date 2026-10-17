/* tools/A/regles.mjs — les règles de mort de la joueuse (REFONTE.md § 2.3, § 2.4, § 5.4) mesurées une à une,
   en mode simulé (pas de 1/120 s), contre le bundle réel. Les ennemis, les tirs et les lasers sont posés à la main.
   Usage : node tools/A/regles.mjs [--url URL] [--profil paysage|portrait|bureau] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch();
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 11; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const res = await page.evaluate(() => {
  const N = window.__N, S = window.__S, g = N.game, J = N.joueuse, O = N.outils, H = 1 / 120;
  const out = [];
  const T = (nom, f) => { try { const r = f(); out.push({ nom, ok: r === true || (r && r.ok), detail: r && r.detail ? r.detail : '' }); } catch (e) { out.push({ nom, ok: false, detail: 'exception : ' + e.message }); } };
  const pas = n => g.dbg.simuler(n * H);
  const neuf = () => {                       // une partie neuve, sans apparition, la joueuse au milieu de l'arène
    g.lancer(false); g.dbg.etat('jeu');          // une partie neuve à chaque essai (lancer remet tout à zéro)
    N.dir.fin(); N.ennemis.reset(); N.butin.reset(); g.dbg.god(false); S.death = null;
    S.input.mag = 0; O.geom();
    const A = O.A; J.force({ x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2, ang: 0, len: 8, trace: true });
    pas(2);
    if (J.etat !== 'vivant' || N.score.vies !== 3 || g.etat() !== 'jeu') throw new Error('partie neuve manquée : ' + J.etat + ' vies=' + N.score.vies + ' etat=' + g.etat());
  };
  const cause = () => S.death && S.death.cause;
  const valide = () => { const e = N.ids.valider('death', S.death); return e.length === 0 ? true : { ok: false, detail: e.join(';') }; };
  const src = (type) => ({ genre: 'ennemi', type: type || 'tourelle', id: -1 });
  const seg = k => J.segPos(k);

  /* ---- le mur ---- */
  T('mur : la tête qui fonce sur le mur meurt (cause mur, auteur mur)', () => {
    neuf(); const A = O.A; J.force({ x: A.x0 + 30, y: (A.y0 + A.y1) / 2, ang: Math.PI, trace: true });
    pas(120);
    return g.etat() === 'mort' && cause() === 'mur' && S.death.auteur === 'mur' ? valide() : { ok: false, detail: g.etat() + ' ' + cause() };
  });
  T('mur : grâce de 60 ms (vivante à 5 pas, morte à 12 pas), tête retenue sur la limite des 3 px', () => {
    neuf(); const A = O.A, rt = N.R.mort.rayonTete;
    J.force({ x: A.x0 + 2, y: (A.y0 + A.y1) / 2, ang: Math.PI, trace: true });   // le cap pointe vers le mur, sans pilote
    S.input.mag = 0;
    pas(5); const vivante = J.etat === 'vivant', d5 = J.tete.x - A.x0;
    pas(7); const morte = J.etat === 'mort';
    return vivante && morte && d5 >= rt - 0.01 ? true : { ok: false, detail: `vivante5=${vivante} morte17=${morte} d=${d5.toFixed(2)}` };
  });
  T('mur : si le cap repart vers l\'intérieur pendant la grâce, pas de mort', () => {
    neuf(); const A = O.A;
    J.force({ x: A.x0 + 2, y: (A.y0 + A.y1) / 2, ang: 0, trace: true });   // cap vers l'intérieur (cosinus 1)
    pas(60);
    return J.etat === 'vivant' ? true : { ok: false, detail: J.etat };
  });
  /* ---- la morsure ---- */
  const cercle = (sec) => { for (let i = 0; i < sec * 120 && J.etat === 'vivant'; i++) { S.input.x = Math.cos(J.tete.ang + 1.2); S.input.y = Math.sin(J.tete.ang + 1.2); S.input.mag = 1; pas(1); } };
  T('morsure : à 30 segments, tourner en rond mord le corps (cause morsure, auteur corps)', () => {
    neuf(); J.force({ len: 30 }); cercle(4);
    return g.etat() === 'mort' && cause() === 'morsure' && S.death.auteur === 'corps' ? valide() : { ok: false, detail: g.etat() + ' ' + cause() };
  });
  T('morsure : à 9 segments (longueur sûre), jamais', () => {
    neuf(); J.force({ len: 9 }); cercle(4);
    return J.etat === 'vivant' ? true : { ok: false, detail: J.etat + ' ' + cause() };
  });
  /* ---- l'ennemi ---- */
  T('ennemi : le contact tue (cause ennemi, auteur = le type)', () => {
    neuf(); const e = N.ennemis.spawn('fleche', J.tete.x + 1, J.tete.y); pas(3);
    return g.etat() === 'mort' && cause() === 'ennemi' && S.death.auteur === 'fleche' && S.death.auteurId === e.id ? valide() : { ok: false, detail: g.etat() + ' ' + cause() };
  });
  T('ennemi : un ennemi en apparition (portail 0,6 s) ne touche pas', () => {
    neuf(); N.ennemis.spawn('fleche', J.tete.x + 1, J.tete.y, { portail: 0.6 }); pas(40);
    const vivante = J.etat === 'vivant'; pas(60);
    return vivante ? true : { ok: false, detail: J.etat };
  });
  /* ---- le tir ---- */
  T('tir : sur la tête, il tue (cause tir, auteur tourelle) et disparaît', () => {
    neuf(); N.ennemis.tir(J.tete.x, J.tete.y, 0, 0, { src: src('tourelle') }); pas(3);
    return g.etat() === 'mort' && cause() === 'tir' && S.death.auteur === 'tourelle' && N.ennemis.tirs.length === 0 ? valide() : { ok: false, detail: g.etat() + ' ' + cause() + ' tirs=' + N.ennemis.tirs.length };
  });
  T('tir : sur le corps, il COUPE (longueur max(3, k), cellules, chaîne ÷ 2, pas de mort, le tir disparaît)', () => {
    neuf(); J.force({ len: 20 });
    for (let i = 0; i < 4; i++) N.ev.emit('kill', { id: 900 + i, type: 'fleche', x: 0, y: 0, elite: false, boss: false, base: 50, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 10, gen: 0 });
    const ch0 = N.score.chaine(), p = seg(10), n0 = N.butin.list.length;
    let coupe = null; N.ev.on('coupe', 95, c => { coupe = c; }, '03-socle');
    N.ennemis.tir(p.x, p.y, 0, 0, { src: src('tourelle') }); pas(3);
    N.ev.off('coupe', c => 0);
    const ok = J.etat === 'vivant' && J.len() === 10 && N.ennemis.tirs.length === 0 && N.butin.list.length - n0 === 5 && N.score.chaine() === Math.floor(ch0 / 2) && coupe && coupe.k === 10 && coupe.perdus === 10;
    return ok ? true : { ok: false, detail: `etat=${J.etat} len=${J.len()} tirs=${N.ennemis.tirs.length} cellules+${N.butin.list.length - n0} chaine ${ch0}->${N.score.chaine()} coupe=${JSON.stringify(coupe)}` };
  });
  T('tir : coupe au segment 2 → longueur 3 (jamais moins)', () => {
    neuf(); J.force({ len: 12 }); const p = seg(2); N.ennemis.tir(p.x, p.y, 0, 0, { src: src('tourelle') }); pas(3);
    return J.len() === 3 && J.etat === 'vivant' ? true : { ok: false, detail: 'len=' + J.len() };
  });
  T('laser : un laser actif qui croise la tête tue (cause laser)', () => {
    neuf(); const x = J.tete.x, y = J.tete.y;
    N.ennemis.lasers.push({ x0: x - 40, y0: y, x1: x + 40, y1: y, t: 0, d: 0.4, w: 5, src: src('sentinelle'), _dead: false }); pas(3);
    return g.etat() === 'mort' && cause() === 'laser' && S.death.auteur === 'sentinelle' ? valide() : { ok: false, detail: g.etat() + ' ' + cause() };
  });
  T('souffle : une mine qui explose sur la tête tue (cause souffle, auteur mine)', () => {
    neuf(); const e = N.ennemis.spawn('mine', J.tete.x + 12, J.tete.y); e._st = 'arme'; e._stT = 0.01; pas(4);
    return g.etat() === 'mort' && cause() === 'souffle' && S.death.auteur === 'mine' ? valide() : { ok: false, detail: g.etat() + ' ' + cause() };
  });
  T('dbg.god : la joueuse ne meurt pas', () => { neuf(); g.dbg.god(true); const r = J.tuer('tir', src()); g.dbg.god(false); return !r && J.etat === 'vivant'; });
  /* ---- vies, vie bonus, réapparition, prix de la mort ---- */
  T('vies : trois au départ ; la troisième mort mène à l\'écran de fin', () => {
    neuf(); const v0 = N.score.vies; const suite = [];
    for (let i = 0; i < 3; i++) { J.tuer('mur', { genre: 'decor', type: 'mur', id: -1 }); suite.push(N.score.vies); pas(240); if (i < 2) pas(240); }
    return v0 === 3 && suite.join() === '2,1,0' && g.etat() === 'fin' ? true : { ok: false, detail: `v0=${v0} suite=${suite} etat=${g.etat()}` };
  });
  T('vie bonus : une seule, à 80 000 points, quatre vies au plus', () => {
    neuf(); N.score.ajouter(79999); const a = N.score.vies; N.score.ajouter(1); const b = N.score.vies; N.score.ajouter(50000); const c = N.score.vies;
    return a === 3 && b === 4 && c === 4 ? true : { ok: false, detail: [a, b, c].join() };
  });
  T('réapparition : longueur max(8, ⌈L/2⌉), vers le centre, ≥ 40 px des murs, 1,0 s d\'invulnérabilité', () => {
    neuf(); J.force({ len: 21 }); const A = O.A;
    J.tuer('tir', src()); pas(240);                                // la séquence entière
    const e = g.etat(), len = J.len(), t = J.tete;
    const marge = Math.min(t.x - A.x0, A.x1 - t.x, t.y - A.y0, A.y1 - t.y);
    const inv0 = J.invul(); pas(130); const inv1 = J.invul();
    return len === 11 && marge >= 39.9 && inv0 && !inv1 && (e === 'reapparition' || e === 'jeu') ? true : { ok: false, detail: `etat=${e} len=${len} marge=${marge.toFixed(1)} invul ${inv0}->${inv1}` };
  });
  T('réapparition : invulnérable aux ennemis, pas aux murs', () => {
    neuf(); J.tuer('tir', src()); pas(220);
    const inv = J.invul(); N.ennemis.spawn('fleche', J.tete.x, J.tete.y); pas(3); const vivante = J.etat !== 'mort';
    const A = O.A; J.force({ x: A.x0 + 1, y: J.tete.y, ang: Math.PI, trace: true }); pas(15); const mort = J.etat === 'mort';
    return inv && vivante && mort ? true : { ok: false, detail: `inv=${inv} vivante=${vivante} mur=${mort}` };
  });
  T('réapparition : au point choisi, aucun tir vivant à moins de 40 px (les tirs posés au centre sont effacés si le point y tombe)', () => {
    neuf(); J.tuer('tir', src()); pas(60);
    const A = O.A, c = { x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2 };
    for (let i = 0; i < 6; i++) N.ennemis.tir(c.x + (i - 3) * 6, c.y, 0, 0, { src: src(), vie: 99 });
    for (let i = 0; i < 6; i++) N.ennemis.tir(A.x0 + 3, A.y0 + 3, 0, 0, { src: src(), vie: 99 });
    for (let i = 0; i < 400 && g.etat() !== 'reapparition'; i++) pas(1);
    const t = J.tete, proches = N.ennemis.tirs.filter(b => !b._dead && Math.hypot(b.x - t.x, b.y - t.y) < 40).length;
    return g.etat() === 'reapparition' && proches === 0 ? true : { ok: false, detail: `etat=${g.etat()} proches=${proches}` };
  });
  T('prix de la mort : l\'arme perd un palier (CANON III → II au rendu)', () => {
    neuf(); J.force({ len: 21 }); const n0 = N.arsenal.niveau('canon');
    J.tuer('tir', src()); const ch = N.arsenal.chute();
    return n0 === 3 && ch && ch.arme === 'canon' && ch.de === 3 && ch.a === 2 ? true : { ok: false, detail: JSON.stringify(ch) + ' n0=' + n0 };
  });
  /* ---- la séquence ---- */
  T('séquence : réapparition entre 0,9 et 1,4 s après l\'impact ; le serpent est en main (avance) dès la réapparition, avant 2,0 s (G-02)', () => {
    neuf(); J.tuer('tir', src()); let t = 0, tre = -1;
    for (let i = 0; i < 400 && tre < 0; i++) { pas(1); t += H; if (g.etat() === 'reapparition') tre = t; }
    const x0 = J.tete.x, y0 = J.tete.y; pas(36);                                    // 0,3 s plus tard
    const dep = Math.hypot(J.tete.x - x0, J.tete.y - y0);
    return tre >= 0.9 && tre <= 1.4 && dep > 10 && tre + 0.3 < 2.0 ? { ok: true, detail: `réapparition à ${tre.toFixed(2)} s, avance de ${dep.toFixed(0)} px en 0,3 s` } : { ok: false, detail: `tre=${tre} dep=${dep}` };
  });
  T('séquence : game over → écran de fin entre 0,9 et 1,5 s après l\'impact (R-17)', () => {
    neuf(); const gm = () => { J.tuer('mur', { genre: 'decor', type: 'mur', id: -1 }); pas(240); if (g.etat() !== 'fin') pas(240); };
    gm(); gm();
    let tfin = -1, t = 0; J.tuer('mur', { genre: 'decor', type: 'mur', id: -1 });
    for (let i = 0; i < 400 && tfin < 0; i++) { pas(1); t += H; if (g.etat() === 'fin') tfin = t; }
    return tfin >= 0.9 && tfin <= 1.5 ? { ok: true, detail: `fin à ${tfin.toFixed(2)} s` } : { ok: false, detail: 'tfin=' + tfin + ' etat=' + g.etat() };
  });
  T('mort : la chaîne tombe à zéro', () => {
    neuf(); for (let i = 0; i < 4; i++) N.ev.emit('kill', { id: 700 + i, type: 'fleche', x: 0, y: 0, elite: false, boss: false, base: 50, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 10, gen: 0 });
    const c0 = N.score.chaine(); J.tuer('tir', src()); pas(2);
    return c0 >= 4 && N.score.chaine() === 0 ? true : { ok: false, detail: `chaine ${c0} -> ${N.score.chaine()}` };
  });
  T('réapparition : l\'ennemi à moins de 48 px est figé 0,4 s, un tir à 20 px est effacé, un tir à 80 px reste', () => {
    neuf(); J.tuer('tir', src()); pas(2); const A = O.A, c = { x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2 };
    const e = N.ennemis.spawn('tourelle', c.x + 20, c.y); const proche = N.ennemis.tir(c.x, c.y + 20, 0, 0, { src: src(), vie: 99 }), loin = N.ennemis.tir(c.x + 80, c.y, 0, 0, { src: src(), vie: 99 });
    J.reapparaitre({ x: c.x, y: c.y });
    return e._stun > 0.39 && proche._dead && !loin._dead ? true : { ok: false, detail: `stun=${e._stun} proche=${proche._dead} loin=${loin._dead}` };
  });
  T('séquence : un toucher dès 0,5 s saute la fin de la séquence', () => {
    neuf(); J.tuer('tir', src()); pas(60);                 // 0,5 s
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); pas(3);
    const e = g.etat();
    return e === 'reapparition' ? true : { ok: false, detail: e };
  });
  return out;
});
let ok = true;
for (const r of res) { console.log((r.ok ? '  ok  ' : '  ÉCHEC ') + r.nom + (r.detail ? ' — ' + r.detail : '')); if (!r.ok) ok = false; }
const err = await page.evaluate(() => window.__ERR.count);
console.log(`__ERR.count = ${err} ; console : ${logs.length}`); for (const l of logs.slice(0, 5)) console.log('  ' + l);
await browser.close();
console.log(ok && err === 0 && logs.length === 0 ? 'RÈGLES : OK' : 'RÈGLES : ÉCHEC');
process.exit(ok && err === 0 && logs.length === 0 ? 0 : 1);
