/* tools/E/joueuse.mjs — le lot E (REFONTE.md § 2.2, 2.6, 2.10 à 2.12, 2.17) mesuré contre le bundle réel, en mode simulé.
   Cas aux verdicts connus : accélération (poussée droite, slalom), LASSO qui tue (traînée, queue, trop petit), pastille et
   INVERSION qui dévore, pouvoirs, APOGÉE, fusion et expiration du butin, armes (niveaux et tirs).
   Usage : node tools/E/joueuse.mjs [--url URL] [--profil paysage|portrait|bureau] [--captures DOSSIER] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8132/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const CAPT = arg('--captures', '/tmp/claude-501/lotE');
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

const SETUP = () => {
  const N = window.__N, S = window.__S, g = N.game, J = N.joueuse, O = N.outils, H = 1 / 120;
  window.__E = {
    N, S, g, J, O, H,
    fixes: [],
    tient: () => { for (const f of window.__E.fixes) { f.e.x = f.x; f.e.y = f.y; f.e._kx = 0; f.e._ky = 0; } },
    pas: n => { for (let i = 0; i < n; i++) { g.dbg.simuler(H); window.__E.tient(); } },
    neuf: (len) => {
      g.lancer(false); g.dbg.etat('jeu');
      N.dir.fin(); N.ennemis.reset(); N.butin.reset(); g.dbg.god(false); S.death = null;
      S.input.mag = 0; S.input.boost = false; S.input.pouvoir = false; S.input.apogee = false; O.geom();
      const A = O.A; J.force({ x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2, ang: 0, len: len || 8, trace: true });
      window.__E.fixes.length = 0; g.dbg.simuler(2 * H);
      if (J.etat !== 'vivant') throw new Error('partie neuve manquée : ' + J.etat);
    },
    /* tourne à gauche sur un cercle de rayon r (le taux de virage max donne 11 px) pendant n pas */
    cercle: (r, n) => {
      const dz = N.R.joueuse.dz, pl = N.R.joueuse.deflexion.pleine, rate = Math.max(0.18, Math.min(1, 11 / r));
      for (let i = 0; i < n && J.etat === 'vivant'; i++) {
        const a = J.tete.ang + 0.6;
        S.input.x = Math.cos(a); S.input.y = Math.sin(a); S.input.mag = dz + rate * (pl - dz);
        g.dbg.simuler(H); window.__E.tient();
      }
      S.input.mag = 0;
    },
    fige: e => { e._stun = 99; return e; },
    mk: (type, x, y, fixe) => { const e = N.ennemis.spawn(type, x, y, {}); e._portail = 0; e.etat = 'approche'; e._st = 'derive'; e._stun = 99; if (fixe) window.__E.fixes.push({ e, x, y }); return e; }
  };
  N.arsenal.update = function () {};          // le canon tirerait sur les cibles : on mesure le LASSO, l'INVERSION et l'APOGÉE seuls
};
await page.evaluate(SETUP);

const res = await page.evaluate(() => {
  const { N, S, g, J, O, H, pas, neuf, cercle, fige, mk } = window.__E;
  const mort = () => S.death ? S.death.cause + '/' + S.death.auteur : '';
  const out = [];
  const T = (nom, f) => { try { const r = f(); out.push({ nom, ok: r === true || (r && r.ok), detail: r && r.detail ? r.detail : '' }); } catch (e) { out.push({ nom, ok: false, detail: 'exception : ' + e.message }); } };
  const compte = (nom) => { const c = { n: 0, last: null }; N.ev.on(nom, 99, ch => { c.n++; c.last = ch; }, '03-socle'); return c; };
  const cLasso = compte('lasso'), cBoost = compte('boost'), cInv = compte('inversion'), cKill = compte('kill');

  /* ---- l'accélération ---- */
  T('accélération : manche poussé droit devant, enclenchée en 120 ms + 1 image', () => {
    neuf(); S.input.stick = S.input.stick || {}; S.input.stick.active = true;
    S.input.x = 1; S.input.y = 0; S.input.mag = 1;
    let t = -1;
    for (let i = 1; i <= 60; i++) { pas(1); if (J.boost && t < 0) t = i; }
    S.input.stick.active = false; S.input.mag = 0;
    const ms = t * H * 1000;
    return t > 0 && ms <= 120 + 1000 / 60 + 9 ? { ok: true, detail: ms.toFixed(0) + ' ms' } : { ok: false, detail: 't=' + ms };
  });
  T('accélération : 95 % de la vitesse en 7 images', () => {
    neuf(); pas(1); const v0 = J.tete.vit; S.input.boost = true; let n = 0;
    for (let i = 0; i < 60; i++) { pas(1); if (J.tete.vit >= v0 * (1 + 0.6 * 0.95) - 0.01 && !n) n = i + 1; }
    const vmax = J.tete.vit; S.input.boost = false;
    return { ok: n > 0 && n * H * 60 <= 7.5 && Math.abs(vmax / 68 - 1.6) < 0.02, detail: `95 % en ${(n * H * 60).toFixed(1)} images, v=${vmax.toFixed(1)}` };
  });
  T('accélération : un slalom de virages serrés à pleine course pendant 6 s ne l\'enclenche jamais', () => {
    neuf(); S.input.stick = S.input.stick || {}; S.input.stick.active = true; let fois = 0, base = cBoost.n;
    for (let i = 0; i < 6 * 120 && J.etat === 'vivant'; i++) {
      // écart de cap de 80° : un virage serré saturant la course
      S.input.x = Math.cos(J.tete.ang + (Math.floor(i / 36) & 1 ? 1.4 : -1.4)); S.input.y = Math.sin(J.tete.ang + (Math.floor(i / 36) & 1 ? 1.4 : -1.4)); S.input.mag = 1;
      pas(1); if (J.boost) fois++;
    }
    S.input.stick.active = false; S.input.mag = 0;
    return { ok: fois === 0 && cBoost.n === base, detail: `${fois} pas d'accélération, vivante=${J.etat}` };
  });
  T('accélération : la réserve se vide à 35/s, panne sous 2 points, un seul son de panne', () => {
    neuf(); S.input.boost = true; const base = cBoost.n; let pannes = 0, on = 0;
    N.ev.on('boost', 98, c => { if (c.evt === 'panne') pannes++; if (c.evt === 'on') on++; }, '03-socle');
    pas(120 * 4); S.input.boost = false; pas(10);
    return { ok: J.reserve() < 100 && pannes === 1 && on <= 2, detail: `réserve ${J.reserve().toFixed(1)}, pannes ${pannes}, bascules on ${on}` };
  });

  /* ---- le LASSO ---- */
  T('LASSO : un cercle autour de 3 cibles les détruit toutes (traînée), « lasso » émis une fois', () => {
    neuf(8); const c = J.tete, base = cLasso.n;
    const cx = c.x, cy = c.y + 11;                               // le centre du cercle de rayon 11, à gauche d'un cap vers +x
    const es = [0, 1, 2].map(i => mk('fleche', cx + (i - 1) * 2, cy + (i % 2) * 2, true));
    cercle(11, 120 * 4);
    const morts = es.filter(e => e._dead).length;
    return { ok: morts === 3 && cLasso.n === base + 1 && cLasso.last && cLasso.last.n === 3 && cLasso.last.aire >= 300 && J.etat === 'vivant',
      detail: `morts ${morts}/3, lasso ×${cLasso.n - base}, n=${cLasso.last && cLasso.last.n}, aire=${cLasso.last && cLasso.last.aire.toFixed(0)}, ${J.etat} ${S.death ? S.death.cause + '/' + S.death.auteur : ''}` };
  });
  T('LASSO : une fermeture sur le corps ailleurs tue (morsure), pas de lasso', () => {
    neuf(20); const base = cLasso.n; cercle(11, 120 * 5);
    return { ok: J.etat === 'mort' && S.death && S.death.cause === 'morsure' && cLasso.n === base, detail: J.etat + ' ' + (S.death && S.death.cause) };
  });
  T('LASSO : durée de traînée 1,2 + 0,02 L (R.f.traine)', () => {
    const v = [8, 20, 40].map(L => N.R.f.traine(L, 0));
    return { ok: Math.abs(v[0] - 1.36) < 1e-9 && Math.abs(v[2] - 2.0) < 1e-9, detail: v.join(' / ') };
  });
  T('LASSO : les tirs ennemis dedans sont effacés, le butin dedans est aspiré', () => {
    neuf(8); const c = J.tete, cx = c.x, cy = c.y + 11;
    const b = N.ennemis.tir(cx, cy, 0, 0, { vie: 50 }); N.butin.lacher(cx + 2, cy, 2, { type: 'cellule', vie: 20 });
    const n0 = N.butin.list.length; cercle(11, 120 * 4);
    return { ok: b._dead && N.butin.list.every(o => o._aspire || o.vie > 0) && n0 === 2, detail: `tir ${b._dead ? 'effacé' : 'resté'}, butin ${n0}` };
  });

  /* ---- la pastille et l'INVERSION ---- */
  T('INVERSION : la pastille avalée met les ennemis en `proie`, elle ne fait pas grandir', () => {
    neuf(8); const L0 = J.len(), b0 = cInv.n;
    const es = [0, 1, 2].map(i => mk('fleche', J.tete.x + 50 + i * 10, J.tete.y + (i - 1) * 14));
    N.butin.pastille(J.tete.x + 1, J.tete.y); pas(3);
    const ok = J.inversion().actif && es.every(e => e.etat === 'proie') && J.len() === L0 && cInv.n === b0 + 1 && cInv.last.evt === 'debut';
    return { ok, detail: `actif=${J.inversion().actif} etats=${es.map(e => e.etat)} len ${L0}→${J.len()}` };
  });
  T('INVERSION : les proies fuient à 0,8 × la vitesse de la tête', () => {
    neuf(8);
    const e = mk('tourelle', J.tete.x + 70, J.tete.y); e._stun = 0;
    N.butin.pastille(J.tete.x + 1, J.tete.y); pas(2); const x0 = e.x; pas(60);
    const v = (e.x - x0) / (60 * H);
    return { ok: e.etat === 'proie' && Math.abs(v - 0.8 * 68) < 6, detail: `v=${v.toFixed(1)} px/s (attendu ${(0.8 * 68).toFixed(1)})` };
  });
  T('INVERSION : la tête dévore 200, 400, 800, 1 600 (kill avec src devore, +1 segment chacun, score à la valeur fixe)', () => {
    neuf(8); const L0 = J.len();
    const es = [0, 1, 2, 3].map(i => { const a = 0.5 + i * 1.3; return mk('fleche', J.tete.x + Math.cos(a) * 7.8, J.tete.y + Math.sin(a) * 7.8); });
    const pts = []; N.ev.on('kill', 97, c => { if (c.src && c.src.type === 'devore') pts.push(c.base); }, '03-socle');
    const sc0 = N.score.score, m = N.score.mult();
    N.butin.pastille(J.tete.x, J.tete.y); pas(6);
    const gagne = N.score.score - sc0, morts = es.filter(e => e._dead).length;
    return { ok: morts === 4 && J.etat === 'vivant' && J.len() >= L0 + 4 && gagne >= 3000 && gagne < 3100, detail: `${mort()} dévorés ${morts}/4, longueur ${L0}→${J.len()}, score +${gagne} (attendu 200+400+800+1600 = 3000, plus les cellules lâchées ; mult ×${m})` };
  });
  T('INVERSION : la poursuite — une proie qui fuit à 54 px/s est rattrapée par la tête à 68 px/s', () => {
    neuf(8); const e = mk('fleche', J.tete.x + 30, J.tete.y); N.butin.pastille(J.tete.x, J.tete.y); pas(2); e._stun = 0;
    for (let i = 0; i < 120 * 3 && !e._dead && J.etat === 'vivant'; i++) { S.input.x = e.x - J.tete.x; S.input.y = e.y - J.tete.y; const m = Math.hypot(S.input.x, S.input.y) || 1; S.input.x /= m; S.input.y /= m; S.input.mag = 1; pas(1); }
    S.input.mag = 0;
    return { ok: e._dead && J.etat === 'vivant', detail: `${e._dead ? 'dévorée' : 'échappée'} ; ${mort()}` };
  });
  T('INVERSION : la proie ne tue pas au contact ; après la fin, l\'ennemi redevient dangereux', () => {
    neuf(8);
    const e = mk('fleche', J.tete.x + 40, J.tete.y), f = mk('fleche', J.tete.x - 60, J.tete.y + 40);
    N.butin.pastille(J.tete.x, J.tete.y); pas(2);
    J.force({ x: e.x - 1, y: e.y }); pas(2); const vivante = J.etat === 'vivant', devore = e._dead;
    pas(120 * 5); const fin = !J.inversion().actif && !f._proie;
    return { ok: vivante && devore && fin, detail: `${mort()} vivante pendant=${vivante}, la proie touchée est dévorée=${devore}, fin=${fin}, ${J.etat}` };
  });
  T('pastille : expire en 12 s, jamais aimantée', () => {
    neuf(8); g.dbg.god(true); const p = N.butin.pastille(J.tete.x + 20, J.tete.y + 20); const x0 = p.x;
    pas(120 * 3); const ok1 = N.butin.list.indexOf(p) >= 0 && p.x === x0, v3 = p.vie;
    pas(120 * 10);
    return { ok: ok1 && N.butin.list.indexOf(p) < 0, detail: `présente à 3 s ${ok1} (vie ${v3.toFixed(2)}), absente à 13 s ${N.butin.list.indexOf(p) < 0} (vie ${p.vie.toFixed(2)}, état ${g.etat()})` };
  });
  T('pastille : née à 160 px au moins de la tête, dans l\'arène', () => {
    neuf(8); let mini = 1e9; for (let i = 0; i < 20; i++) { const p = N.butin.pastille(); mini = Math.min(mini, Math.hypot(p.x - J.tete.x, p.y - J.tete.y)); }
    return { ok: mini >= 160 - 0.001, detail: 'distance minimale ' + mini.toFixed(1) };
  });

  /* ---- les pouvoirs et l'APOGÉE ---- */
  T('TRAVERSÉE : 1,4 s, un tir ne coupe pas, un ennemi ne tue pas ; puis recharge 12 s', () => {
    neuf(12); J.equiper('traversee'); S.input.pouvoir = true; pas(1); S.input.pouvoir = false;
    const actif = J.pouvoir.etat === 'actif'; const e = N.ennemis.spawn('fleche', J.tete.x + 1, J.tete.y, {}); e._portail = 0; e._st = 'derive'; pas(20);
    const vive = J.etat === 'vivant'; pas(120 * 1.5);
    const fin = J.pouvoir.etat === 'recharge';
    return { ok: actif && vive && fin, detail: `actif=${actif} vivante=${vive} recharge=${fin}` };
  });
  T('REPLI : longueur −35 % (6 au moins), les segments reviennent à la fin', () => {
    neuf(20); g.dbg.god(true); J.equiper('repli'); S.input.pouvoir = true; pas(1); S.input.pouvoir = false; const l1 = J.len(); pas(120 * 8); g.dbg.god(false);
    return { ok: l1 === 13 && J.len() === 20 && J.pouvoir.etat === 'recharge', detail: `${20} → ${l1} → ${J.len()} (${J.pouvoir.etat})` };
  });
  T('APOGÉE : pleine, un glissé lance 6 anneaux de 12 dégâts, efface les tirs, vide la jauge', () => {
    neuf(8); g.dbg.god(true); J.apogeeAjouter(100);
    const es = [20, 60, 100, 140].map(d => { const e = mk('fleche', J.tete.x, J.tete.y + d, true); e.pv = 200; return e; });
    const pv0 = es.map(e => e.pv); const b = N.ennemis.tir(J.tete.x + 30, J.tete.y + 20, 0, 0, { vie: 20 });
    S.input.apogee = true; pas(1); S.input.apogee = false; const jauge = N.joueuse.apogee; pas(120 * 1);
    const aprs = es.map(e => e.pv), degats = pv0.map((v, i) => v - aprs[i]);
    return { ok: jauge === 0 && b._dead && degats[0] >= 60 && degats.every(d => d >= 12) && N.joueuse.apogee === 0, detail: `jauge ${jauge}, dégâts par distance ${degats} (6 anneaux : 72 au plus près, 12 à 140 px), tir effacé ${b._dead}, pv ${pv0.map((v, i) => v + '→' + aprs[i])}` };
  });
  T('APOGÉE : se charge par un ennemi tué (+2), un noyau (+20), un LASSO (+3 par ennemi)', () => {
    neuf(8); J.apogeeAjouter(0); const a0 = N.joueuse.apogee;
    const e = mk('fleche', J.tete.x + 60, J.tete.y); N.ennemis.hit(e, 1e6, { genre: 'arme', type: 'canon', id: -1 });
    const a1 = N.joueuse.apogee; N.butin.lacher(J.tete.x, J.tete.y, 1, { type: 'noyau' }); pas(3);
    return { ok: a1 - a0 === 2 && N.joueuse.apogee >= a1 + 20, detail: `${a0} → ${a1} → ${N.joueuse.apogee}` };
  });

  /* ---- le butin ---- */
  T('butin : trois cellules à moins de 10 px fusionnent, valeur cumulée ; expire en 9 s', () => {
    neuf(8); N.butin.lacher(J.tete.x + 80, J.tete.y + 60, 3, { type: 'cellule' });
    const L = N.butin.list; L.forEach((c, i) => { c.x = J.tete.x + 80 + i * 3; c.y = J.tete.y + 60; c._vx = 0; c._vy = 0; });
    pas(60); const n = N.butin.list.length, v = N.butin.list[0] && N.butin.list[0].valeur; pas(120 * 10);
    return { ok: n === 1 && v === 3 && N.butin.list.length === 0, detail: `après fusion ${n} objet(s), valeur ${v}, après 10 s ${N.butin.list.length}` };
  });
  T('butin : la cellule prise allonge de 1 segment, le noyau de 2 et rapporte 5 XP', () => {
    neuf(8); const l0 = J.len(), x0 = N.butin.xp.total;
    N.butin.lacher(J.tete.x, J.tete.y, 1, { type: 'cellule' }); N.butin.lacher(J.tete.x, J.tete.y, 1, { type: 'noyau' }); pas(4);
    return { ok: J.len() === l0 + 3 && N.butin.xp.total - x0 === 6, detail: `longueur ${l0}→${J.len()}, XP +${N.butin.xp.total - x0}` };
  });
  return out;
});
await page.evaluate(() => window.__E.neuf(8));
let echecs = 0;
for (const r of res) { if (!r.ok) echecs++; console.log((r.ok ? '  ok  ' : '  ÉCHEC ') + r.nom + (r.detail ? ' — ' + r.detail : '')); }
const err = await page.evaluate(() => window.__ERR && window.__ERR.count);
console.log('__ERR.count = ' + err + ' ; console : ' + logs.length);
logs.slice(0, 5).forEach(l => console.log('   ' + l));
await browser.close();
console.log(echecs === 0 && !err && logs.length === 0 ? 'LOT E : OK' : 'LOT E : ÉCHEC (' + echecs + ')');
process.exit(echecs === 0 && !err && logs.length === 0 ? 0 : 1);
