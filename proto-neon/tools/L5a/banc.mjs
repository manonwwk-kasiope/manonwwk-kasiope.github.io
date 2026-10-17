/* tools/L5a/banc.mjs — le banc des critères d'acceptation du lot 5a (REFONTE.md § 8.3, LOT 5a), sur la page
   d'essai tools/L5a/index.html, en mode simulé (N.game.dbg.simuler), graines 1 à 20 × 3 profils.

     node tools/L5a/banc.mjs [--url URL] [--graines 1-20] [--profils paysage,portrait,bureau] [--sortie f.json]

   La joueuse est simulée : le pilote de repli des squelettes (S.input seulement), rendu invulnérable
   (dbg.god), plus une « main » qui détruit, comme le ferait le CANON d'une joueuse correcte, tout ennemi
   entièrement visible depuis `--reflexe` secondes (1,4 par défaut). Ce n'est pas un pilote de la
   spécification gelée : c'est un banc du directeur, qui a besoin que les vagues se vident.
   Critères mesurés :
     apparitions dans la vue (0), portails ≥ 600 ms (≥ 99 %), distance à la tête (0 sous 48 px),
     derrière le mur arrière (0), respiration (8 s sous 40 % de chaque pic), V1 (0 tir ennemi, première
     menace avant 0:20, durée 22 ± 2 s), TRAVELLING (annonce 2 s avant, départ à +12 s en V2, tête à 80 px
     des murs à la création), PASTILLE (+20 s en V2, ≥ 160 px, dans l'arène), plateau en mouvement en V2,
     TRAQUEUR (7 s d'inaction), zéro erreur. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const URL = opt('--url', 'http://127.0.0.1:8127/proto-neon/tools/L5a/index.html');
const plage = s => { const o = []; for (const p of s.split(',')) { const m = p.match(/^(\d+)-(\d+)$/); if (m) for (let i = +m[1]; i <= +m[2]; i++) o.push(i); else o.push(+p); } return o; };
const GRAINES = plage(opt('--graines', '1-20'));
const PROFILS = opt('--profils', 'paysage,portrait,bureau').split(',');
const REFLEXE = +opt('--reflexe', '1.4');
const SORTIE = opt('--sortie', null);
const SUIVANTE = argv.includes('--suivante');           // profil qui a déjà joué : la première FILE entre à + 1 s
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PRO = {
  paysage: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
};

/* une partie : V1, cartes, VOL, V2, jusqu'au nettoyage de V2 (ou 150 s) ; mode 'attente' : V2 sans rien faire */
async function partie(page, graine, mode) {
  return page.evaluate(({ graine, mode, REFLEXE, SUIVANTE }) => {
    const N = __N, S = __S;
    try { localStorage.clear(); } catch (e) { /* stockage refusé */ }
    N.game.reset(graine);
    if (SUIVANTE) N.score.profil.donnees().profil.parties = 3;
    N.journal.dump({ vider: true });
    if (mode === 'attente') N.game.dbg.vague(2); else N.game.dbg.etat('jeu');
    N.game.dbg.god(true);
    N.pilote.niveau('bon'); N.pilote.activer(mode !== 'attente');
    const serie = [], app = [], trav = [], past = [], erreurs0 = __ERR.count;
    let tSerie = -1;
    /* la « main » : détruit ce qui est visible depuis REFLEXE s ; et l'échantillonnage, après chaque pas du directeur */
    /* la joueuse du banc : elle va au contact du plus proche ennemi qui vient (tourne autour à 45 px), évite
       les mines et les murs ; sa « main » détruit ce qu'elle voit depuis r s à moins de 150 px (un CANON) */
    function main(r) {
      const P = S.player; if (!P) return;
      for (const e of N.ennemis.list) if (e.etat !== 'mort' && !e.boss && e.vuDepuis >= r && Math.hypot(e.x - P.x, e.y - P.y) < 150) N.ennemis.hit(e, 1e6, { genre: 'arme', type: 'canon', id: null });
    }
    function conduire() {
      const P = S.player, et = N.game.etat(); if (!P || !(et === 'jeu' || et === 'reapparition' || et === 'nettoyage')) return;
      let c = null, cd = 1e9;
      for (const e of N.ennemis.list) { if (e.etat === 'mort' || e.etat === 'fuite' || e.boss || e.type === 'mine' || e.type === 'traqueur') continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < cd) { cd = d; c = e; } }
      if (!c) for (const b of (S.butin || [])) { const d = Math.hypot(b.x - P.x, b.y - P.y); if (d < cd) { cd = d; c = b; } }
      let a = c ? Math.atan2(c.y - P.y, c.x - P.x) + (cd < 45 ? Math.PI / 2 : 0) : P.ang;
      let vx = Math.cos(a), vy = Math.sin(a);
      for (const e of N.ennemis.list) if (e.type === 'mine' && e.etat !== 'mort') { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < 55) { vx += (P.x - e.x) / d * 2; vy += (P.y - e.y) / d * 2; } }
      const M = S.monde; if (M) { const m = 50; if (P.x - M.x0 < m) vx += 2; if (M.x1 - P.x < m) vx -= 2; if (P.y - M.y0 < m) vy += 2; if (M.y1 - P.y < m) vy -= 2; }
      const n = Math.hypot(vx, vy) || 1; S.input.x = vx / n; S.input.y = vy / n; S.input.mag = 0.8;
    }
    const upd = N.dir.update;
    N.dir.update = function (dt) {
      upd(dt);
      const t = N.horloge.t();
      if (mode !== 'attente') { main(REFLEXE); conduire(); }
      if (t - tSerie >= 0.1) {
        tSerie = t;
        let n = 0; for (const e of N.ennemis.list) if (e.etat !== 'mort' && e.etat !== 'fuite' && !e.boss && e.type !== 'planeur') n++;
        const m = S.monde;
        serie.push([+t.toFixed(2), n, S.vague ? S.vague.n : -1, N.game.etat(), m ? +m.x0.toFixed(1) : 0, m ? +m.x1.toFixed(1) : 0, m && m.mobile ? 1 : 0, N.dir.tension()]);
      }
    };
    N.ev.on('apparition', 95, c => {
      const m = S.monde, p = S.player, v = S.vue;
      app.push({ t: N.horloge.t(), type: c.type, x: c.x, y: c.y, px: p.x, py: p.y, x0: m.x0, x1: m.x1, vx: m.vx, mobile: m.mobile, vue: { x: v.x, y: v.y, w: v.w, h: v.h } });
    }, 'banc-L5a');
    const tr = N.arene._travelling;
    N.arene._travelling = function (vx, depuis, mep, force) {
      const p = S.player, r = tr(vx, depuis, mep, force), A = N.world.mursAnnonces(), a = A && A[0];
      if (r) trav.push({ t: N.horloge.t(), px: p.x, py: p.y, force: !!force, rect: a ? a.slice() : [N.world.x0, N.world.y0, N.world.x1, N.world.y1] });
      return r;
    };
    const la = N.butin.lacher;
    N.butin.lacher = function (x, y, n, o) {
      if (o && o.type === 'pastille') { const p = S.player; past.push({ t: N.horloge.t(), x, y, px: p.x, py: p.y, x0: N.world.x0, x1: N.world.x1, y0: N.world.y0, y1: N.world.y1 }); }
      return la(x, y, n, o);
    };
    let J = [], tFin = null;
    for (let k = 0; k < 80; k++) {
      J = N.game.dbg.simuler(2.5);
      const fin = J.find(x => x.type === 'vague' && x.d.n === 2 && (x.d.evt === 'nettoyee' || x.d.evt === 'soupape'));
      if (fin && tFin === null) tFin = fin.t;
      if ((tFin !== null && N.horloge.t() > tFin + 14) || N.horloge.t() > 170 || (mode === 'attente' && N.horloge.t() > 30)) break;
    }
    N.dir.update = upd; N.arene._travelling = tr; N.butin.lacher = la; N.ev.off('apparition', 'banc-L5a');
    const garder = { vague: 1, portail: 1, apparition: 1, arene: 1, tirEnnemi: 1, ramassage: 1, inversion: 1, mort: 1, coupe: 1 };
    return { J: J.filter(x => garder[x.type]).map(x => ({ t: x.t, type: x.type, d: x.d })), serie, app, trav, past, err: __ERR.count - erreurs0 };
  }, { graine, mode, REFLEXE, SUIVANTE });
}

function analyser(r, R) {
  const o = {}, J = r.J;
  const ent = n => { const e = J.find(x => x.type === 'vague' && x.d.n === n && x.d.evt === 'entree' && x.d.etape === 'vague'); return e ? e.t : null; };
  const fin = n => { const e = J.find(x => x.type === 'vague' && x.d.n === n && (x.d.evt === 'nettoyee' || x.d.evt === 'soupape')); return e ? { t: e.t, evt: e.d.evt } : null; };
  const e1 = ent(1), f1 = fin(1), e2 = ent(2), f2 = fin(2);
  /* apparitions : dans la vue, distance, mur arrière ; portails : la dernière annonce au même point */
  const A = J.filter(x => x.type === 'apparition'), P = J.filter(x => x.type === 'portail');
  o.apparitions = A.length; o.reannonces = Math.max(0, P.length - A.length); o.dansVue = 0; o.proches = 0; o.derriere = 0; o.portailsCourts = 0; o.sansPortail = 0; o.exemples = [];
  for (const a of A) {
    const d = a.d, v = d.vue;
    if (v && d.x >= v.x && d.x <= v.x + v.w && d.y >= v.y && d.y <= v.y + v.h) { o.dansVue++; if (o.exemples.length < 3) o.exemples.push({ t: a.t, type: d.type, x: d.x, y: d.y, vue: v }); }
    let best = null; for (const p of P) if (p.t <= a.t + 1e-6 && Math.abs(p.d.x - d.x) < 0.01 && Math.abs(p.d.y - d.y) < 0.01 && p.d.type === d.type) best = p;
    if (!best) o.sansPortail++; else if (a.t - best.t < Math.min(0.6, best.d.dur) - 1 / 120 - 1e-6) o.portailsCourts++;
  }
  for (const a of r.app) {
    if (Math.hypot(a.x - a.px, a.y - a.py) < 48) o.proches++;
    if (a.mobile && ((a.vx > 0 && a.x < a.x0) || (a.vx < 0 && a.x > a.x1))) o.derriere++;
  }
  /* V1 : aucun tir ennemi, première menace (mine ou dard) avant 0:20, durée */
  if (e1 !== null && f1) {
    o.v1Duree = +(f1.t - e1).toFixed(2); o.v1Fin = f1.evt;
    o.v1Tirs = J.filter(x => x.type === 'tirEnnemi' && x.t >= e1 && x.t <= f1.t).length;
    const m = A.find(x => (x.d.type === 'mine' || x.d.type === 'dard') && x.t >= e1);
    o.v1Menace = m ? +m.t.toFixed(2) : null;                                // temps de jeu depuis le début de la partie
  }
  if (e2 !== null) {
    const an = J.find(x => x.type === 'arene' && x.d.evt === 'travellingAnnonce' && x.t >= e2), dep = J.find(x => x.type === 'arene' && x.d.evt === 'travelling' && x.t >= e2);
    if (an && dep) { o.travAnnonce = +(dep.t - an.t).toFixed(3); o.travDepart = +(dep.t - e2).toFixed(2); }
    const tr = r.trav.find(x => x.t >= e2 - 1e-6);
    if (tr) { const [x0, y0, x1, y1] = tr.rect; o.travMarge = +Math.min(tr.px - x0, x1 - tr.px).toFixed(1); o.travMargeY = +Math.min(tr.py - y0, y1 - tr.py).toFixed(1); o.travForce = tr.force; }
    const pa = r.past.find(x => x.t >= e2);
    if (pa) { o.pastT = +(pa.t - e2).toFixed(2); o.pastD = +Math.hypot(pa.x - pa.px, pa.y - pa.py).toFixed(1); o.pastDans = pa.x > pa.x0 && pa.x < pa.x1 && pa.y > pa.y0 && pa.y < pa.y1; }
    if (f2) {
      o.v2Duree = +(f2.t - e2).toFixed(2); o.v2Fin = f2.evt;
      const s = r.serie.filter(x => x[0] >= e2 && x[0] <= f2.t);
      o.v2Mouvement = s.length ? +(s.filter(x => x[6]).length / s.length).toFixed(3) : 0;
    }
  }
  /* la respiration : après le pic de chaque vague, au moins 8 s de suite sous 40 % de ce pic, avant le pic suivant */
  o.respiration = [];
  const S = r.serie;
  for (const n of [1, 2]) {
    const sv = S.filter(x => x[2] === n && x[3] !== 'vol' && x[3] !== 'cartes'); if (!sv.length) continue;
    let pic = 0, tp = 0; for (const x of sv) if (x[1] > pic) { pic = x[1]; tp = x[0]; }
    const apres = S.filter(x => x[0] >= tp);
    let run = 0, best = 0, t0 = null;
    const nextPeak = S.find(x => x[0] > tp && x[2] === n + 1 && x[1] >= pic);   // ne mesurer que jusqu'au pic suivant
    for (const x of apres) {
      if (nextPeak && x[0] >= nextPeak[0]) break;
      if (x[1] < 0.4 * pic) { if (t0 === null) t0 = x[0]; run = x[0] - t0; if (run > best) best = run; } else t0 = null;
    }
    o.respiration.push({ vague: n, pic, t: tp, sous40: +best.toFixed(1) });
  }
  /* la tension : plage par vague, part de V2 au-dessus de 0,6 (percussions), chute au NETTOYAGE */
  o.tension = {};
  for (const n of [1, 2]) {
    const sv = r.serie.filter(x => x[2] === n && x[3] === 'jeu'); if (!sv.length) continue;
    const tv = sv.map(x => x[7]);
    o.tension[n] = { min: +Math.min(...tv).toFixed(2), max: +Math.max(...tv).toFixed(2), moy: +(tv.reduce((a, b) => a + b, 0) / tv.length).toFixed(2), sur06: +(tv.filter(x => x >= 0.6).length / tv.length).toFixed(2) };
    const nv = sv.map(x => x[1]), mt = tv.reduce((a, b) => a + b, 0) / tv.length, mn = nv.reduce((a, b) => a + b, 0) / nv.length;
    let c = 0, a = 0, b = 0; for (let i = 0; i < tv.length; i++) { c += (tv[i] - mt) * (nv[i] - mn); a += (tv[i] - mt) ** 2; b += (nv[i] - mn) ** 2; }
    o.tension[n].corrVivants = +(c / Math.sqrt(a * b || 1)).toFixed(2);
  }
  o.err = r.err;
  return o;
}

const b = await chromium.launch();
const res = { url: URL, reflexe: REFLEXE, parties: [] };
for (const pr of PROFILS) {
  const ctx = await b.newContext(PRO[pr]);
  const page = await ctx.newPage();
  const cons = []; page.on('console', m => { if (m.type() === 'error') cons.push(m.text()); }); page.on('pageerror', e => cons.push(String(e)));
  await page.goto(URL); await page.waitForTimeout(600);
  for (const g of GRAINES) {
    const r = await partie(page, g, 'normal');
    const a = analyser(r);
    a.profil = pr; a.graine = g; a.console = cons.length;
    res.parties.push(a);
    process.stdout.write(`${pr} g${g} : app ${a.apparitions} reann ${a.reannonces} vue ${a.dansVue} court ${a.portailsCourts} sansP ${a.sansPortail} proches ${a.proches} derr ${a.derriere} | V1 ${a.v1Duree}s ${a.v1Fin} tirs ${a.v1Tirs} menace ${a.v1Menace} | trav ${a.travAnnonce}/${a.travDepart} marge ${a.travMarge} | past ${a.pastT} ${a.pastD} ${a.pastDans} | V2 ${a.v2Duree}s ${a.v2Fin} mvt ${a.v2Mouvement} | resp ${a.respiration.map(x => x.pic + ':' + x.sous40).join(' ')} | tens ${Object.entries(a.tension).map(([k, t]) => k + ':' + t.min + '-' + t.max + '/' + t.sur06 + '/r' + t.corrVivants).join(' ')} | err ${a.err}/${cons.length}\n`);
  }
  /* l'INVERSION : à +10 s en V2, 6 s d'INVERSION ; aucune apparition pendant, les portails réannoncés après */
  const ri = await page.evaluate(() => {
    const N = __N; localStorage.clear(); N.game.reset(5); N.journal.dump({ vider: true }); N.game.dbg.vague(2); N.game.dbg.god(true);
    N.pilote.niveau('bon'); N.pilote.activer(true);
    N.game.dbg.simuler(10); const t0 = N.horloge.t(), att = N.dir.entrees().length; N.ennemis.inverser(6);
    const J = N.game.dbg.simuler(9).filter(x => x.t >= t0);
    const fin = J.find(x => x.type === 'inversion' && x.d.evt === 'fin');
    return { attente: att, pendant: J.filter(x => x.type === 'apparition' && x.t > t0 + 0.01 && fin && x.t < fin.t).length,
      reannonces: J.filter(x => x.type === 'portail' && fin && Math.abs(x.t - fin.t) < 0.02).length, finT: fin ? +(fin.t - t0).toFixed(2) : null,
      apres: J.filter(x => x.type === 'apparition' && fin && x.t >= fin.t).length };
  });
  console.log(pr, 'INVERSION (6 s à +10 s en V2) :', JSON.stringify(ri));
  res.inversion = res.inversion || []; res.inversion.push({ profil: pr, ...ri });
  /* la soupape : V1 sans rien détruire ; les survivants fuient à 22 + 12 s, puis NETTOYAGE et cartes */
  const rs = await page.evaluate(() => {
    const N = __N; localStorage.clear(); N.game.reset(6); N.journal.dump({ vider: true }); N.game.dbg.etat('jeu'); N.game.dbg.god(true);
    N.pilote.activer(false);
    const J = N.game.dbg.simuler(38), e = J.find(x => x.type === 'vague' && x.d.evt === 'entree');
    const so = J.find(x => x.type === 'vague' && x.d.evt === 'soupape'), ne = J.find(x => x.type === 'vague' && x.d.evt === 'nettoyee');
    return { soupape: so ? +(so.t - e.t).toFixed(2) : null, nettoyee: ne ? +(ne.t - e.t).toFixed(2) : null, etat: N.game.etat(), hist: N.game.dbg.historique().slice(-3).map(h => h.etat) };
  });
  console.log(pr, 'SOUPAPE (V1 sans rien détruire) :', JSON.stringify(rs));
  res.soupape = res.soupape || []; res.soupape.push({ profil: pr, ...rs });
  /* le TRAQUEUR : V2 sans rien faire */
  const rt = await partie(page, 7, 'attente');
  const P = rt.J.filter(x => x.type === 'portail' && x.d.type === 'traqueur'), e2 = rt.J.find(x => x.type === 'vague' && x.d.evt === 'entree');
  res.traqueur = res.traqueur || [];
  res.traqueur.push({ profil: pr, portails: P.map(x => +(x.t - (e2 ? e2.t : 0)).toFixed(2)), durs: P.map(x => x.d.dur) });
  console.log(pr, 'TRAQUEUR (V2 sans action) : portails à', P.map(x => +(x.t - (e2 ? e2.t : 0)).toFixed(2)).join(', '), 's, durées', P.map(x => +x.d.dur.toFixed(2)).join(', '));
  res.console = (res.console || 0) + cons.length;
  if (cons.length) console.log('console :', cons.slice(0, 5));
  await ctx.close();
}
await b.close();

/* le bilan */
const T = res.parties, som = k => T.reduce((s, x) => s + (x[k] || 0), 0);
const appTot = som('apparitions');
const bil = {
  apparitionsDansVue: som('dansVue'), apparitions: appTot, reannonces: som('reannonces'),
  portails600: appTot ? +(1 - (som('portailsCourts') + som('sansPortail')) / appTot).toFixed(4) : null,
  proches48: som('proches'), derriereMur: som('derriere'),
  respiration8s: T.every(x => x.respiration.every(r => r.sous40 >= 8)),
  respirationMin: Math.min(...T.flatMap(x => x.respiration.map(r => r.sous40))),
  v1SansTir: T.every(x => x.v1Tirs === 0),
  v1MenaceAvant20: T.filter(x => x.v1Menace !== null && x.v1Menace < 20).length + ' / ' + T.length,
  v1Durees: [Math.min(...T.map(x => x.v1Duree)), Math.max(...T.map(x => x.v1Duree))],
  v1Dans22pm2: T.filter(x => Math.abs(x.v1Duree - 22) <= 2).length + ' / ' + T.length,
  travAnnonce: [...new Set(T.map(x => x.travAnnonce))], travDepart: [...new Set(T.map(x => x.travDepart))],
  travMargeMin: Math.min(...T.map(x => x.travMarge)),
  pastT: [...new Set(T.map(x => x.pastT))], pastDmin: Math.min(...T.map(x => x.pastD)), pastDans: T.every(x => x.pastDans),
  v2Durees: [Math.min(...T.map(x => x.v2Duree)), Math.max(...T.map(x => x.v2Duree))],
  v2MouvementMin: Math.min(...T.map(x => x.v2Mouvement)),
  erreurs: som('err'), console: res.console
};
res.bilan = bil;
console.log('\nBILAN', JSON.stringify(bil, null, 1));
if (SORTIE) fs.writeFileSync(SORTIE, JSON.stringify(res, null, 1));
