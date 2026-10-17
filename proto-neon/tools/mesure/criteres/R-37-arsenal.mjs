/* R-37 — Lisibilité de l'arsenal : captures de V5 au build maximal (scène `v5`, 10 images à 0,5 s
   d'intervalle) ; cyan et cyan pâle hors tête et corps (codes 1 et 2 du masque) ≤ 8 % ; tête reconnaissable
   sur 100 % des captures (les pixels de la tête, code 1, forment autant de pixels que le sprite de tête et
   leur bord est en nuit profonde : gaine complète) ; 0 pixel de l'arsenal (code 3) à moins de 3 px du
   contour de la tête. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-37', titre: 'Lisibilité de l’arsenal', seuil: 'cyan hors tête et corps ≤ 8 % ; tête reconnaissable 100 % ; 0 pixel d’arsenal à < 3 px de la tête', bloquant: true };

const ANALYSE = `
  var t = M.tampon(), m = M.masque(); if (!m) return null; var W = t.W, H = t.H, b = t.buf, a = M.analyse(b, W, H, m);
  var tete = 0, bord = 0, gaine = 0, x0 = W, y0 = H, x1 = -1, y1 = -1, proches = 0, R = 3;
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var i = y * W + x; if (m[i] !== 1) continue; tete++;
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    var auBord = x === 0 || y === 0 || x === W - 1 || y === H - 1 || (m[i - 1] !== 1 && m[i - 1] !== 2) || (m[i + 1] !== 1 && m[i + 1] !== 2) || (m[i - W] !== 1 && m[i - W] !== 2) || (m[i + W] !== 1 && m[i + W] !== 2);
    if (auBord) { bord++; if (b[i] === 15) gaine++; } }
  if (tete) for (var yy = Math.max(0, y0 - R); yy <= Math.min(H - 1, y1 + R); yy++) for (var xx = Math.max(0, x0 - R); xx <= Math.min(W - 1, x1 + R); xx++) {
    if (m[yy * W + xx] !== 3) continue; var pres = false;
    for (var dy = -R; dy <= R && !pres; dy++) for (var dx = -R; dx <= R && !pres; dx++) { var X = xx + dx, Y = yy + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && m[Y * W + X] === 1 && dx * dx + dy * dy <= R * R) pres = true; }
    if (pres) proches++; }
  var spr = null; try { var p = S.player, dir = N.spr.dir ? N.spr.dir(p.ang) : 0, sp = N.spr.get('tete', dir, 0) || N.spr.get('serpent:tete', dir, 0); if (sp && sp.data) { var n = 0; for (var k = 0; k < sp.data.length; k++) if (sp.data[k]) n++; spr = n; } } catch (e) { }
  return { cyanHors: a.cyanHorsTeteCorps, tete: tete, bord: bord, gaine: gaine, proches: proches, sprite: spr };`;

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R37');
  if (!await exiger(s, res, 'masque', ['N.game.dbg.masque', 'N.game.dbg.scene'])) return;
  const sc = await s.scene('v5');
  if (!sc.ok) return res.nonMesurable('scène v5', sc.raison);
  await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
  const L = [];
  for (let k = 0; k < 10; k++) { await s.images(30); const a = await s.eval(c => (new Function('N', 'S', 'M', c))(window.__N, window.__S, window.__MESURE), ANALYSE); if (a) L.push(a); if (k === 0) res.capture(await s.captureTampon('R-37-v5', 3)); }
  if (!L.length) return res.nonMesurable('captures', 'masque vide');
  const pire = Math.max(...L.map(a => a.cyanHors));
  res.verifie('cyan et cyan pâle hors tête et corps (pire capture)', pire, '≤ ' + S.cyan, pire <= S.cyan, { captures: L.length });
  const avecTete = L.filter(a => a.tete > 0);
  res.verifie('tête présente (code 1) sur les captures', avecTete.length, L.length, avecTete.length === L.length);
  const gaines = avecTete.filter(a => a.bord && a.gaine === a.bord).length;
  res.verifie('tête à gaine complète (bord en nuit profonde)', gaines / Math.max(1, avecTete.length), 1, avecTete.length > 0 && gaines === avecTete.length, { exemples: avecTete.slice(0, 3).map(a => ({ bord: a.bord, gaine: a.gaine })) });
  const avecSpr = avecTete.filter(a => a.sprite !== null);
  if (avecSpr.length) { const id = avecSpr.filter(a => a.tete === a.sprite).length; res.verifie('pixels de la tête = sprite de tête (nombre)', id / avecSpr.length, 1, id === avecSpr.length, { tete: avecSpr.map(a => a.tete), sprite: avecSpr[0].sprite }); }
  else res.absent('pixels de la tête identiques au sprite', 'N.spr.get(\'tete\', dir, 0)');
  const proches = Math.max(...L.map(a => a.proches));
  res.verifie('pixels de l’arsenal à moins de ' + S.silence + ' px de la tête (pire capture)', proches, 0, proches === 0);
}
if (principal(import.meta.url)) executer({ meta, mesurer });
