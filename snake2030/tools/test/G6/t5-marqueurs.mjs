// G6 test 5 — (A) marqueur hors champ du boss : ui.offscreen() donne, pendant 30 images consécutives, un
// marqueur à moins de 24 px du bord de l'écran, dans la direction du boss à ±15° ; (B) trancheur sur treillis
// ortho : au plus un coup 'cutter:dash' par charge. La spec chiffrait « 40 → ≥ 38 anneaux », valeur qui
// suppose 1 dégât par coup et une seule charge : defs.cutter.dmg vaut 2 et le coup de CONTACT du trancheur
// est explicitement inchangé par la spec, donc on compte les coups de dash et on borne les anneaux perdus
// par le dash à charges × dmg — l'intention (« un seul coup par passe ») est mesurée telle quelle.
// Bureau 1440×900, pas de temps imposé 1/60 s, graine imposée. Deux scènes indépendantes, deux navigateurs.
//
// Unités de ui.offscreen() : la spec ne les fixe pas. Le repère est déduit des valeurs — pixels CSS du canvas
// si elles y tiennent, sinon pixels du tampon — et la distance au bord est jugée dans ce repère. La direction,
// elle, ne dépend pas du repère (mise à l'échelle uniforme) : elle est comparée à la projection réelle du boss
// (phases.worldToScreen) depuis le centre de l'écran.
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';
import { SEED, emptyArena, installLab, waitGame } from './g6lib.mjs';
import { PROBE_SRC } from '../enprobe.mjs';

deadline(420, 5);
const THRESH = 'A : 30/30 images avec un marqueur ui.offscreen() à < 24 px du bord et à ±15° de la direction du boss ; B : trancheur ortho, au plus un coup de dash (cutter:dash) par charge et anneaux perdus par dash ≤ charges × defs.cutter.dmg (le contact reste inchangé)';
const m = {};
let code = 1;

/* ------------------------------------------------------------------ A ---- */
async function partA() {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  try {
    await startGame(ctx, { seed: SEED });
    await emptyArena(page, { noFire: true, onlyLab: true });
    await installLab(page);
    // scène figée et à plat : la caméra ne bouge plus, la projection reste orthogonale
    await page.evaluate(() => {
      const S = window.__S, M = window.__M;
      window.__DT = 1 / 60;
      S.opt.reduceShake = true;
      try { M.phases.reset(); } catch (e) {}
      M.phases.update = function () {};
      window.__pin = { x: 1600, y: 900, ang: 0 };
      if (!window.__pinOn) {
        window.__pinOn = true;
        (function g() { requestAnimationFrame(g); const p = window.__pin, s = S.snake; if (!p || !s) return; s.x = p.x; s.y = p.y; s.ang = p.ang; s.aim = p.ang; s.speed = 0; s.invuln = 1e9; s.ghost = 1e9; S.cam.x = p.x; S.cam.y = p.y; })();
      }
    });
    await sleep(500);
    const api = await page.evaluate(() => ({
      offscreen: typeof (window.__M.ui && window.__M.ui.offscreen) === 'function',
      worldToScreen: typeof (window.__M.phases && window.__M.phases.worldToScreen) === 'function'
    }));
    if (!api.offscreen) return { api, pourquoi: 'ui.offscreen() absent' };
    if (!api.worldToScreen) return { api, pourquoi: 'phases.worldToScreen() absent' };
    // boss posé hors champ, à droite et un peu en bas, maintenu à sa place à chaque image
    const setup = await page.evaluate(() => {
      const S = window.__S, M = window.__M;
      S.enemies.length = 0;
      const id = window.__lab.spawn('chaser', 1500, 420, { elite: true, boss: true });
      const e = window.__lab.get(id);
      e.hp = e.maxHp = 100000; e.speed = 0;
      S.boss = e; S.bossHpMax = e.maxHp;
      window.__bossPin = { id, x: e.x, y: e.y };
      (function g() {
        requestAnimationFrame(g);
        const p = window.__bossPin; if (!p) return;
        const b = S.enemies.find(q => q.id === p.id);
        if (b) { b.x = p.x; b.y = p.y; b.vx = 0; b.vy = 0; b.dead = false; b.hp = b.maxHp; S.boss = b; }
      })();
      const V = M.phases.visibleExtent ? M.phases.visibleExtent() : null;
      return { id, bx: e.x, by: e.y, sx: S.snake.x, sy: S.snake.y, view: { w: S.view.w, h: S.view.h }, extent: V ? { x0: V.x0, x1: V.x1, y0: V.y0, y1: V.y1 } : null };
    });
    await sleep(400);
    const rows = await page.evaluate(() => new Promise(resolve => {
      const S = window.__S, M = window.__M, cv = document.getElementById('game');
      const rect = cv.getBoundingClientRect();
      const out = [];
      (function tick() {
        if (out.length >= 30) { resolve({ rows: out, CW: cv.width, CH: cv.height, cssW: rect.width, cssH: rect.height }); return; }
        requestAnimationFrame(tick);
        const b = S.boss;
        if (!b) { out.push({ err: 'S.boss perdu' }); return; }
        let list = null, err = null;
        try { list = M.ui.offscreen(); } catch (e) { err = String(e && e.message || e).slice(0, 120); }
        const p = M.phases.worldToScreen(b.x, b.y);
        const V = M.phases.visibleExtent ? M.phases.visibleExtent() : null;
        const inView = V ? (b.x > V.x0 && b.x < V.x1 && b.y > V.y0 && b.y < V.y1)
          : (Math.abs(b.x - S.cam.x) < S.view.w / 2 && Math.abs(b.y - S.cam.y) < S.view.h / 2);
        out.push({ t: S.t, err, inView,
          list: Array.isArray(list) ? list.map(o => ({ x: o && o.x, y: o && o.y, kind: o && o.kind })).slice(0, 12) : null,
          typeofList: Array.isArray(list) ? 'array' : typeof list,
          boss: { x: b.x, y: b.y, sx: p.sx, sy: p.sy } });
      })();
    }));
    // repère des coordonnées : CSS si les marqueurs y tiennent, sinon tampon
    const all = rows.rows.flatMap(r => r.list || []).filter(o => typeof o.x === 'number' && typeof o.y === 'number');
    const maxX = all.length ? Math.max(...all.map(o => o.x)) : 0, maxY = all.length ? Math.max(...all.map(o => o.y)) : 0;
    const buffer = maxX > rows.cssW + 2 || maxY > rows.cssH + 2;
    const W = buffer ? rows.CW : rows.cssW, H = buffer ? rows.CH : rows.cssH;
    const sc = rows.CW / rows.cssW;                     // tampon par px CSS (identique en x et y)
    const cx = W / 2, cy = H / 2;
    let ok = 0; const details = [];
    for (const r of rows.rows) {
      if (r.err || !r.list) { details.push({ t: r.t, cause: r.err || ('ui.offscreen() a rendu ' + r.typeofList) }); continue; }
      if (r.inView) { details.push({ t: r.t, cause: 'boss dans le champ, mesure invalide' }); continue; }
      const bx = buffer ? r.boss.sx : r.boss.sx / sc, by = buffer ? r.boss.sy : r.boss.sy / sc;
      const want = Math.atan2(by - cy, bx - cx);
      let best = null;
      for (const o of r.list) {
        if (typeof o.x !== 'number' || typeof o.y !== 'number') continue;
        const kind = String(o.kind || '');
        if (r.list.some(q => String(q.kind || '').indexOf('boss') >= 0) && kind.indexOf('boss') < 0) continue;
        const edge = Math.min(o.x, o.y, W - o.x, H - o.y);
        let d = Math.atan2(o.y - cy, o.x - cx) - want;
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        const cand = { kind, x: +o.x.toFixed(1), y: +o.y.toFixed(1), edge: +edge.toFixed(1), ecartDeg: +(d * 180 / Math.PI).toFixed(1) };
        if (!best || (Math.abs(cand.ecartDeg) < Math.abs(best.ecartDeg))) best = cand;
      }
      if (best && best.edge < 24 && Math.abs(best.ecartDeg) <= 15) ok++;
      else details.push({ t: r.t, cause: best ? ('bord ' + best.edge + ' px, écart ' + best.ecartDeg + '°') : 'aucun marqueur', marqueurs: r.list.length });
    }
    return { api, setup, repere: buffer ? 'tampon' : 'css', ecran: { W, H, CW: rows.CW, cssW: rows.cssW },
      images: rows.rows.length, conformes: ok, exemples: details.slice(0, 8) };
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------ B ---- */
async function partB() {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  try {
    await startGame(ctx, { seed: SEED });
    await emptyArena(page, { noFire: true, onlyLab: true });
    await installLab(page);
    await page.evaluate(PROBE_SRC);
    const hasGrid = await page.evaluate(() => typeof window.__M.phases.forceGrid === 'function');
    if (!hasGrid) return { pourquoi: 'phases.forceGrid absent' };
    await page.evaluate(() => {
      const S = window.__S, M = window.__M;
      window.__DT = 1 / 60;
      M.phases.forceGrid('ortho');
      S.snake.len = 40; S.snake.hp = 40; S.snake.maxHp = 40;
      S.enemies.length = 0;
    });
    await page.keyboard.down('ArrowRight');
    await waitGame(page, 3000);                     // le corps s'aligne derrière la tête sur le rail
    const dmg = await page.evaluate(() => window.__M.enemies.defs.cutter.dmg || 1);
    const before = await page.evaluate(() => {
      const S = window.__S;
      window.__EP.reset();
      const s = S.snake;
      window.__lab.spawn('cutter', Math.cos(s.ang) * 500, Math.sin(s.ang) * 500, null);
      return { len: s.len, railed: window.__M.phases.railed(), ang: s.ang };
    });
    await waitGame(page, 4000);
    await page.keyboard.up('ArrowRight');
    const after = await page.evaluate(() => {
      const S = window.__S, L = window.__EP.L;
      const dash = L.tele.filter(e => e.type === 'cutter' && e.kind === 'attack').length;
      const hits = L.hurts.filter(h => h.src === 'cutter:dash' || h.type === 'cutter');
      const dashHits = L.hurts.filter(h => h.src === 'cutter:dash');
      const contactHits = hits.filter(h => h.src !== 'cutter:dash');
      return { len: S.snake.len, charges: dash, coups: hits.length,
        coupsDash: dashHits.length, coupsContact: contactHits.length,
        detail: hits.map(h => ({ t: Math.round(h.t), src: h.src, seg: h.segIdx, headD: h.headD })).slice(0, 12),
        vivants: S.enemies.length };
    });
    return { avant: before, apres: after, anneauxPerdus: before.len - after.len,
      dmgTrancheur: dmg,
      coupsDashParCharge: after.charges ? +(after.coupsDash / after.charges).toFixed(2) : null,
      coupsParCharge: after.charges ? +(after.coups / after.charges).toFixed(2) : null };
  } finally { await ctx.close(); }
}

try {
  m.A = await partA();
  m.B = await partB();
  const A = m.A, B = m.B;
  if (A.pourquoi || B.pourquoi) { m.pourquoi = A.pourquoi || B.pourquoi; code = 2; }
  else {
    const okA = A.conformes === 30;
    // « <= 1 coup par dash » : on compte les coups de DASH (le contact est explicitement
    // inchange par la spec) et on verifie que les anneaux perdus par le dash ne depassent
    // pas 1 coup par charge x les degats du trancheur (defs.cutter.dmg, ici 2).
    const okB = !!(B.apres && B.avant.railed === true && B.apres.charges >= 1 &&
      B.apres.coupsDash <= B.apres.charges &&
      (B.anneauxPerdus - B.apres.coupsContact * B.dmgTrancheur) <= B.apres.charges * B.dmgTrancheur);
    m.verdict = { marqueurBoss: okA, trancheurOrtho: okB };
    if (!B.avant || B.avant.railed !== true) { m.pourquoi = 'treillis ortho non actif pendant la mesure du trancheur'; code = 2; }
    else code = (okA && okB) ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 500);
  code = 2;
}
save('G6-t5-marqueurs.json', m);
finish(5, { pass: code === 0, code, measured: m, threshold: THRESH });
