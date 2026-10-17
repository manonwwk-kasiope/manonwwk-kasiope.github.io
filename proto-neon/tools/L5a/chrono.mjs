// Chronologie d'une vague : portails, apparitions, morts, nombre de vivants (pour régler le directeur).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const URL = 'http://127.0.0.1:8127/proto-neon/tools/L5a/index.html';
const g = +(process.argv[2] || 1), vague = +(process.argv[3] || 1), dur = +(process.argv[4] || 40), reflexe = +(process.argv[5] || 1.4);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
await p.goto(URL); await p.waitForTimeout(500);
const r = await p.evaluate(({ g, vague, dur, reflexe }) => {
  const N = __N, S = __S; localStorage.clear();
  N.game.reset(g); N.journal.dump({ vider: true });
  if (vague > 1) N.game.dbg.vague(vague); else N.game.dbg.etat('jeu');
  N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(reflexe > 0);
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
  const upd = N.dir.update, lignes = []; let tl = -1;
  N.dir.update = function (dt) { upd(dt); if (reflexe > 0) { main(reflexe); conduire(); }
    const t = N.horloge.t(); if (t - tl >= 1) { tl = t; const c = {}; for (const e of N.ennemis.list) if (e.etat !== 'mort') c[e.type + (e.etat === 'fuite' ? '~' : '')] = (c[e.type] || 0) + 1; lignes.push(t.toFixed(1) + ' ' + N.dir.phase() + ' tens ' + N.dir.tension().toFixed(2) + ' ' + JSON.stringify(c) + ' port ' + N.dir.entrees().length); } };
  const J = N.game.dbg.simuler(dur);
  N.dir.update = upd;
  const ev = J.filter(x => ['vague', 'portail', 'apparition', 'arene', 'inversion'].includes(x.type) || (x.type === 'kill')).map(x => x.t.toFixed(2) + ' ' + x.type + ' ' + (x.d.type || '') + ' ' + (x.d.evt || '') + (x.type === 'portail' ? ' dur ' + x.d.dur.toFixed(2) + ' @' + x.d.x.toFixed(0) + ',' + x.d.y.toFixed(0) : '') + (x.type === 'kill' ? ' ' + x.d.src.genre : ''));
  return { ev, lignes };
}, { g, vague, dur, reflexe });
console.log(r.lignes.join('\n')); console.log('----'); console.log(r.ev.join('\n'));
await b.close();
