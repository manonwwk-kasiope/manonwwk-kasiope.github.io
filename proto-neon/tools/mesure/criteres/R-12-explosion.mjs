/* R-12 — Explosion : à la mort du CYCLOPE et des élites, la part de brasier dépasse 8 % de l'écran pendant
   au moins 4 images, et la caméra bouge d'au moins 6 px de jeu (poussée N.cam ou secousse S.shake).
   Mesure : partie dessinée, invulnérable ; l'œil du CYCLOPE (scène boss3) et chaque élite (scène v5, une
   élite posée à 70 px devant la tête) sont détruits par N.ennemis.hit ; chaque image est lue après le dessin. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-12', titre: 'Explosion', seuil: 'brasier > 8 % pendant ≥ 4 images ; caméra ≥ 6 px', bloquant: true };
const ELITES = { flecheBlindee: 'fleche', rival: 'rival', rucheInstable: 'ruche' };
const IMAGE = 'var b = N.gfx.buf(), n = 0; for (var i = 0; i < b.length; i++) if (b[i] === 11) n++; var p = S.player || {x:0,y:0}; return { f: window.__FRAME, br: n / b.length, cx: N.cam.x, cy: N.cam.y, px: p.x, py: p.y, sh: +S.shake || 0, e: M.etat() };';

async function exploser(s, cible) {
  await s.eval(c => window.__MESURE.parImage('r12', c), IMAGE);
  await s.images(30);
  // Créer les élites APRÈS le témoin : l'arsenal maximal ne peut plus les abattre avant le coup.
  if (!cible.boss) cible.id = await s.eval(c => {
    const N=window.__N,p=window.__S.player,mods={};
    for(const nom of N.R.elites[c.elite].mods)mods[nom]=true;
    const e=N.ennemis.spawn(c.type,p.x+Math.cos(p.ang)*70,p.y+Math.sin(p.ang)*70,{elite:c.elite,mods});
    return e ? e.id : null;
  },cible);
  let tue={coups:0,tues:0,reste:0}, imageCoup=null;
  const borne=await s.eval(()=>window.__N.R.tests.scenes.boss.preparationMax / window.__N.R.temps.imageRef);
  // Le CYCLOPE n'accepte les dégâts que dans ses vraies fenêtres d'œil ouvert.
  for(let k=0;k<(cible.boss?borne:1);k++){
    const r=await s.eval(c=>{
      const N=window.__N,l=N.ennemis.list.filter(e=>e.etat!=='mort'&&(c.boss?e.boss&&e.partie==='oeil':e.id===c.id));
      let tues=0;for(const e of l)if(N.ennemis.hit(e,Math.max(1,e.pvMax||e.pv||1)*4,{genre:'arme',type:'canon',id:0}))tues++;
      return {coups:l.length,tues,reste:l.length-tues,image:window.__FRAME};
    },cible);
    tue.coups+=r.coups;tue.tues+=r.tues;tue.reste=r.reste;
    if(r.tues){imageCoup=r.image;break;}
    if(!r.reste)break;
    if(!await s.images(1))break;
  }
  await s.images(60);
  const L = await s.eval(() => window.__MESURE.arreter('r12'));
  const base = imageCoup === null ? L.slice(0,30) : L.filter(x=>x.f<=imageCoup).slice(-30), apres = imageCoup === null ? [] : L.filter(x=>x.f>imageCoup);
  let run = 0, best = 0; for (const x of apres) { if (x.br > 0.08) { run++; best = Math.max(best, run); } else run = 0; }
  /* la caméra suit la tête : on mesure l'écart caméra − tête par rapport à celui d'avant le coup (poussée
     N.cam.jolt), et la secousse en espace écran S.shake ; sur les 30 images qui suivent */
  const ecart = (l, c0) => Math.max(0, ...l.map(x => Math.max(Math.hypot(x.cx - x.px - (c0.cx - c0.px), x.cy - x.py - (c0.cy - c0.py)), x.sh)));
  /* témoin : le même écart sur les 30 images d'avant le coup (suivi qui se pose encore, secousse résiduelle) */
  const temoin = base.length > 1 ? ecart(base.slice(1), base[0]) : 0;
  const brut = ecart(apres.slice(0, 30), base[base.length - 1] || apres[0]);
  return { tue, imageCoup, trace: L, imagesBrasier: best, brasierMax: Math.max(0,...apres.map(x => x.br)), camera: Math.max(0, brut - temoin), brut, temoin };
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R12');
  if (!await exiger(s, res, 'destruction', ['N.ennemis.hit', 'N.ennemis.list', 'N.ennemis.spawn', 'N.cam.x', 'N.gfx.present', 'N.game.dbg.god'])) return;
  const juger = (nom, r) => {
    if (!r.tue.tues) return res.nonMesurable(nom, 'la cible n’a pas été détruite par N.ennemis.hit (' + JSON.stringify(r.tue) + ')');
    res.verifie(`${nom} : images à plus de ${S.brasier * 100} % de brasier (suite la plus longue)`, r.imagesBrasier, '≥ ' + S.images, r.imagesBrasier >= S.images, { brasierMax: r.brasierMax, imageCoup: r.imageCoup, trace: r.trace });
    res.verifie(`${nom} : mouvement de caméra imputable au coup (px)`, r.camera, '≥ ' + S.camera, r.camera >= S.camera, { brut: r.brut, temoin: r.temoin });
  };
  const b = await s.scene('boss3');
  if (!b.ok) res.nonMesurable('CYCLOPE', b.raison);
  else { await s.eval(() => window.__MESURE.dbg().god(true)); juger('mort du CYCLOPE', await exploser(s, { boss: true })); res.capture(await s.capture('R-12-cyclope')); }
  for (const [elite, type] of Object.entries(ELITES)) {
    const v = await s.scene('v5');
    if (!v.ok) { res.nonMesurable(`élite ${elite}`, v.raison); continue; }
    await s.eval(() => window.__MESURE.dbg().god(true));
    juger(`mort de l’élite ${elite}`, await exploser(s, { type, elite }));
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
