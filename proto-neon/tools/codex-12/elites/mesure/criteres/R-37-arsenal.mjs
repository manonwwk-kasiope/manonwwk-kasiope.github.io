/* R-37 — Lisibilité de l'arsenal : captures de V5 au build maximal (scène `v5`, 10 images à 0,5 s
   d'intervalle) ; cyan et cyan pâle hors tête et corps (codes 1 et 2 du masque) ≤ 8 % ; tête reconnaissable
   sur 100 % des captures (les pixels de la tête, code 1, forment autant de pixels que le sprite de tête et
   leur bord est en nuit profonde : gaine complète) ; 0 pixel de l'arsenal (code 3) à moins de 3 px du
   contour de la tête. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-37', titre: 'Lisibilité de l’arsenal', seuil: 'cyan hors tête et corps ≤ 8 % ; tête reconnaissable 100 % ; 0 pixel d’arsenal à < 3 px de la tête', bloquant: true };

// La dernière vraie tête dessinée, avec son orientation et son image d'animation exactes.
export const OBSERVER_TETE = () => {
  const N = window.__N, M = window.__MESURE, sprites = new WeakSet();
  const make = N.spr.make, blit = N.gfx.blit;
  N.spr.make = function(nom) {
    const sp = make.apply(this, arguments);
    if (sp && (nom === 'tete' || String(nom).startsWith('tete:'))) sprites.add(sp);
    return sp;
  };
  N.gfx.blit = function(sp, x, y, opt) {
    if (sprites.has(sp)) M.__tete37 = { x: Math.round(x) - N.gfx.ox(), y: Math.round(y) - N.gfx.oy(),
      w: sp.w, h: sp.h, data: Array.from(sp.data), ink: opt && opt.ci !== undefined ? N.pal.i(opt.ci) : null };
    return blit.apply(this, arguments);
  };
};
export const ANALYSE = `
  var t = M.tampon(), m = M.masque(), sp = M.__tete37; if (!m || !sp) return null;
  var W=t.W,H=t.H,b=t.buf,a=M.analyse(b,W,H,m), R=N.R.criteres.R37.silence;
  var tete=0,bord=0,gaine=0,proches=0,sprite=0,differences=0,points=[];
  // Code 1 dans la boîte de la tête réelle uniquement : le radar code 1 est séparé.
  for(var sy=0;sy<sp.h;sy++)for(var sx=0;sx<sp.w;sx++){
    var v=sp.data[sy*sp.w+sx],x=sp.x+sx,y=sp.y+sy,i=y*W+x;
    if(!v){if(x>=0&&y>=0&&x<W&&y<H&&m[i]===1)differences++;continue;} sprite++;
    if(x<0||y<0||x>=W||y>=H){differences++;continue;}
    var attendu=sp.ink===null?v:sp.ink;
    if(m[i]!==1||b[i]!==attendu)differences++;
    if(m[i]!==1)continue; tete++;points.push([x,y]);
    var edge=x===0||y===0||x===W-1||y===H-1||
      (m[i-1]!==1&&m[i-1]!==2)||(m[i+1]!==1&&m[i+1]!==2)||
      (m[i-W]!==1&&m[i-W]!==2)||(m[i+W]!==1&&m[i+W]!==2);
    if(edge){bord++;if(b[i]===15)gaine++;}
  }
  for(var yy=Math.max(0,sp.y-R);yy<Math.min(H,sp.y+sp.h+R);yy++)
    for(var xx=Math.max(0,sp.x-R);xx<Math.min(W,sp.x+sp.w+R);xx++){
      if(m[yy*W+xx]!==3)continue;
      if(points.some(function(p){var dx=xx-p[0],dy=yy-p[1];return dx*dx+dy*dy<R*R;}))proches++;
    }
  return {cyanHors:a.cyanHorsTeteCorps,tete,bord,gaine,proches,sprite,differences};`;

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R37');
  if (!await exiger(s, res, 'masque', ['N.game.dbg.masque', 'N.game.dbg.scene'])) return;
  await s.eval(OBSERVER_TETE);
  const sc = await s.scene('v5');
  if (!sc.ok) return res.nonMesurable('scène v5', sc.raison);
  await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
  await s.eval(() => window.__MESURE.masque());
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
  if (avecSpr.length) { const id = avecSpr.filter(a => a.differences === 0 && a.tete === a.sprite).length; res.verifie('pixels de la tête identiques au sprite réellement dessiné', id / avecSpr.length, 1, id === avecSpr.length, { tete: avecSpr.map(a => a.tete), sprite: avecSpr[0].sprite, differences: avecSpr.map(a=>a.differences) }); }
  else res.absent('pixels de la tête identiques au sprite', 'N.spr.get(\'tete\', dir, 0)');
  const proches = Math.max(...L.map(a => a.proches));
  res.verifie('pixels de l’arsenal à moins de ' + S.silence + ' px de la tête (pire capture)', proches, 0, proches === 0);
}
if (principal(import.meta.url)) executer({ meta, mesurer });
