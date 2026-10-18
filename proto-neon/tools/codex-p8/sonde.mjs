// Fonction autonome : mêmes vraies sources et mesures du tampon en VM et dans Playwright.
export function mesurer() {
  const N = window.__N, S = N.S, g = N.gfx, O = N.outils, j = N.joueuse;
  localStorage.clear(); S.jour = 20261017;
  N.reseed(7); N.intro.skip(); N.game.reset(7, { depart: 'jeu' }); N.game.dbg.etat('jeu'); N.game.dbg.god(true);
  N.ennemis.reset(); j.reset({ x: 512, y: 256, ang: 0, len: 3 }); N.cam.reset(); O.geom();
  const checks = [], check = (nom, ok, mesure) => checks.push({ nom, ok: !!ok, mesure });
  for (const len of [1,2,3,4]) { j.force({ len, trace: true }); check('critique L=' + len, j.critique() === (len <= N.R.longueur.critique.seuil), j.critique()); }
  j.force({ len: 3, trace: true });
  const draw = ak => { O.T.ak=ak; O.geom(); O.origineMonde(); g.clear(0); j.drawTop(); return Array.from(g.buf()); };
  const halo = ak => {
    j.force({len:4}); const sans=draw(ak); j.force({len:3}); const avec=draw(ak);
    return avec.map((v,i)=>v!==sans[i]?v:-1);
  };
  const a=halo(0), b=halo(0.5), c=halo(1);
  const difference = (x,y) => x.reduce((s,v,i)=>s+(v!==y[i]),0);
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q=N.R.longueur.critique, head=()=>N.cam.toScreen(j.tete.x,j.tete.y);
  // Couronne seule : la police, le pouvoir et l'animation native de tête sont exclus.
  function couronne(buf) { const p=head(), r=q.rayon+q.amplitude, out=[]; for(let y=-r;y<=r;y++)for(let x=0;x<=r;x++)if(x*x+y*y>=q.rayon*q.rayon)out.push(buf[(Math.round(p.y)+y)*g.W+Math.round(p.x)+x]);return out; }
  const battement=difference(couronne(a),couronne(b));
  check(reduit?'couronne fixe en mouvement réduit':'couronne bat loin du mur',reduit?battement===0:battement>0,battement);
  check('période couronne 1 seconde',difference(couronne(a),couronne(c))===0,difference(couronne(a),couronne(c)));
  draw(0); O.origine(0,0); N.hud.draw();
  const p=head(), dots=q.pastilles, demi=(q.seuil-1)*dots.pas/2;
  const dotsX=O.clamp(Math.round(p.x),S.view.safe.l+dots.marge+demi,g.W-S.view.safe.r-dots.marge-demi);
  const dotsY=O.clamp(Math.round(p.y-dots.recul),S.view.safe.t+dots.marge,g.H-S.view.safe.b-dots.marge);
  const pastilles=Array.from({length:q.seuil},(_,k)=>g.at(dotsX-demi+k*dots.pas,dotsY));
  check('trois pastilles L=3',pastilles.every(v=>v===N.pal.i('cyanPale')),pastilles);
  // Le vrai manche déclenche le boost : pas d'affectation artificielle à j.boost.
  Object.assign(S.input,{x:1,y:0,mag:1,boost:false,stick:{active:true}});
  for(let i=0;i<30;i++) { N.horloge.avancer(); j.update(N.R.temps.h); }
  check('boost effectif au manche seul',j.boost && !S.input.boost,{boost:j.boost,doigt:S.input.boost,vit:j.tete.vit});
  j.force({x:512,y:256,ang:0,trace:true}); N.cam.reset();
  for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);
  const avance=N.cam.devant();
  draw(0);
  const t=head(), tr=N.R.boost.trainee, ambre=[];
  // Extrémités des deux filets, au-delà de la jauge de réserve (rayon existant 9).
  for(const signe of [-1,1])for(let d=10;d<=tr.recul+tr.longueur;d++) {
    const x=Math.round(t.x-d),y=Math.round(t.y+signe*tr.demiLargeur);
    if(g.buf()[y*g.W+x]===N.pal.i('ambre'))ambre.push({x,y});
  }
  check('ambre derrière tête après drawTop',ambre.length>0,ambre);
  // Même tête et même entrée, référence de caméra sans boost ; aucun pas de logique entre les deux.
  const effectif=j.boost; j.boost=false; N.cam.reset(); for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);
  const croisiere=N.cam.devant(); j.boost=effectif;
  check('avance caméra au manche',avance>croisiere,{croisiere,boost:avance,delta:avance-croisiere});
  j.god(false); j.tuer('mur');
  check('critique désactivé après mort',!j.critique(),{etat:j.etat,critique:j.critique()});
  N.cam.reset();for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);const mortAvecDrapeau=N.cam.devant();
  j.boost=false;N.cam.reset();for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);const mortSansDrapeau=N.cam.devant();
  check('drapeau boost résiduel sans avance après mort',mortAvecDrapeau===mortSansDrapeau,{avec:mortAvecDrapeau,sans:mortSansDrapeau});
  check('zéro erreur',window.__ERR.count===0,window.__ERR);
  return {taille:{w:g.W,h:g.H,px:g.PX},reduit,checks,critique:j.critique(),journal:N.journal.dump(),err:window.__ERR};
}
export function capturer(type) {
  const N=window.__N,O=N.outils; N.game.dbg.etat('jeu');
  N.joueuse.reset({x:512,y:256,ang:0,len:type==='critique'?3:8});
  Object.assign(N.S.input,{x:1,y:0,mag:1,boost:false,stick:{active:type==='boost'}});
  if(type==='boost')for(let i=0;i<30;i++){N.horloge.avancer();N.joueuse.update(N.R.temps.h);}
  N.cam.reset();
  for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);
  O.geom(); N.game.draw(); N.game.drawTop(); O.origine(0,0); N.hud.draw(); N.gfx.present();
  return {etat:N.game.etat(),longueur:N.joueuse.len(),boost:N.joueuse.boost,erreurs:window.__ERR.count};
}
