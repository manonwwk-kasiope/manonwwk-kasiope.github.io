// Fonction commune : mêmes sources et API en VM et dans Chromium, aucune lecture privée.
export function scenarios() {
  const N=window.__N,S=window.__S,h=N.R.temps.h,clone=x=>JSON.parse(JSON.stringify(x));
  const resultat={captures:[],murs:[],boss:[],schemas:[]};
  function init() {
    localStorage.clear();S.jour=20261017;N.intro.skip();N.game.reset(7,{depart:'plongee'});
    if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
    N.world.arena({x:0,y:0,w:N.world.W,h:N.world.H},N.R.monde.mobile.glissementMin);
    N.cam.update(N.R.monde.mobile.glissementMin);N.arene.reset();N.ennemis.reset();N.colosse.reset();
    N.joueuse.reset({x:N.world.W/2,y:N.world.H/2,ang:0});N.cam.reset();N.outils.geom();
    N.journal.actif(true);N.journal.vider();N.horloge.avancer();
  }
  const vue=()=>({x:N.cam.x,y:N.cam.y,w:N.cam.w,h:N.cam.h});
  const dedans=e=>{const v=vue();return e.x>=v.x&&e.x<=v.x+v.w&&e.y>=v.y&&e.y<=v.y+v.h;};
  function tampon(nom,draw) {
    N.gfx.clear(0);N.outils.origineMonde();draw();
    const buf=Array.from(N.gfx.buf());resultat.captures.push({nom,w:N.gfx.W,h:N.gfx.H,buf,nonVide:buf.filter(x=>x!==0).length,horsPalette:buf.filter(x=>x>=N.pal.C.length).length,cyan:buf.filter(x=>x===N.pal.i('cyan')||x===N.pal.i('cyanPale')).length});
  }
  // Les trois collisions de p4c : même départ, même mur bas, même vrai grace timer.
  init();const w=N.world,depart=N.R.tests.scenes.travelling.depuis,avant={x0:w.x0,x1:w.x1},start=N.horloge.t();
  N.arene.travelling(N.R.arene.travelling.vitesses[3],depart);
  let premier=null,zoneDepuis=null;
  for(let t=0;t<N.R.arene.travelling.annonce+N.R.arene.travelling.miseEnPlace;t+=h) {
    N.horloge.avancer();N.arene.update(h);N.joueuse.god(true);N.joueuse.update(h);N.joueuse.god(false);N.cam.update(h);N.ennemis.publierTele();
    if(zoneDepuis===null&&S.tele.some(z=>z.par.type==='murMobile'))zoneDepuis=N.horloge.t();
    if(!premier&&(w.x0!==avant.x0||w.x1!==avant.x1)){premier={delai:N.horloge.t()-start,tele:clone(S.tele)};break;}
  }
  resultat.murs.push({premier,zoneDepuis,start});N.cam.reset(depart,w.H/2);N.outils.geom();
  tampon('annonce-travelling',()=>N.arene.draw());
  N.joueuse.force({x:(w.x0+w.x1)/2,y:w.y1-N.R.joueuse.rayonTete,ang:Math.PI/2,trace:true});
  for(let t=0;t<N.R.mort.mur.grace+N.R.apparitions.rallonge&&N.joueuse.etat!=='mort';t+=h){N.horloge.avancer();N.arene.update(h);N.joueuse.update(h);N.cam.update(h);N.ennemis.publierTele();}
  resultat.collision={etat:N.joueuse.etat,morts:clone(N.journal.dump().filter(j=>j.type==='mort')),annonces:clone(N.journal.dump().filter(j=>j.type==='arene')),zoneDepuis};
  // Entrée puis phases 2/3 obtenues par les vrais dégâts : aucun forçage de PV/phase.
  init();const naissances=[],positions=new Map(),franchissements=[],mouvements=[],finsMouvement=[];
  const spawn=N.ennemis.spawn;
  N.ennemis.spawn=function(...args){const e=spawn.apply(this,args);if(e?.type==='cyclope'){naissances.push({id:e.id,x:e.x,y:e.y,vue:vue(),dansVue:dedans(e)});positions.set(e.id,{x:e.x,y:e.y,vu:false});}return e;};
  let phasePrec=0,murPrec={x0:w.x0,x1:w.x1,y0:w.y0,y1:w.y1},annonceAt=N.horloge.t(),dernierePhase=0;
  try {
    N.colosse.start();
    tampon('boss-naissance',()=>N.colosse.draw());
    tampon('boss-annonce-entree',()=>N.colosse.drawTop());
    for(let t=0;t<N.R.tests.scenes.boss.preparationMax;t+=h){
      const dt=N.horloge.avancer();N.fx.update(dt);N.colosse.update(dt);N.ennemis.publierTele();
      // Joueuse tenue loin du mur ; update assure aussi l'observation des annonces.
      N.joueuse.god(true);N.joueuse.force({x:w.W/2,y:w.H/2,ang:0});N.joueuse.update(dt);
      const ph=N.colosse.phase();
      if(ph!==phasePrec){phasePrec=ph;if(ph===3){annonceAt=N.horloge.t();tampon('boss-annonce-phase3',()=>N.colosse.drawTop());}}
      const mobileAvant=w.enMouvement(),zonesAvant=clone(S.tele.filter(z=>z.par.type==='murMobile'));
      N.cam.update(dt);N.outils.geom();
      if(mobileAvant&&!w.enMouvement())finsMouvement.push({phase:ph,t:N.horloge.t(),zones:zonesAvant});
      const mouvementPhase=ph===3?3:0;
      if((w.x0!==murPrec.x0||w.x1!==murPrec.x1||w.y0!==murPrec.y0||w.y1!==murPrec.y1)&&!mouvements.some(m=>m.phase===mouvementPhase))mouvements.push({phase:mouvementPhase,delai:N.horloge.t()-annonceAt,tele:clone(S.tele)});
      murPrec={x0:w.x0,x1:w.x1,y0:w.y0,y1:w.y1};
      for(const e of N.ennemis.list.filter(e=>e.boss)){
        const p=positions.get(e.id);if(!p)continue;
        if(dedans(e)&&!p.vu){franchissements.push({id:e.id,partie:e.partie,t:N.horloge.t(),x:e.x,y:e.y,deplacement:Math.hypot(e.x-p.x,e.y-p.y)});p.vu=true;tampon('boss-entree-'+e.partie+'-'+e.id,()=>N.colosse.draw());}
        p.x=e.x;p.y=e.y;
        if(e.partie==='oeil'&&ph<3)N.ennemis.hit(e,N.R.colosse.pvTotal,{genre:'joueuse',type:'canon',id:0});
      }
      if(ph===3&&N.horloge.t()-annonceAt>N.R.arene.travelling.annonce+N.R.monde.arenaCyclope.resserreDuree){dernierePhase=ph;break;}
    }
    const journal=clone(N.journal.dump());
    resultat.boss={naissances,franchissements,mouvements,finsMouvement,phase:dernierePhase||N.colosse.phase(),journal};
    resultat.schemas=clone(S.tele).flatMap(z=>N.ids.valider('tele',z));
  }finally{N.ennemis.spawn=spawn;}
  // Contrôle négatif : un glissement externe déjà actif n'acquiert pas un faux préavis après 2 s.
  init();N.world.arena({x:depart,y:0,w:N.R.arene.travelling.largeur,h:w.H},N.R.arene.travelling.miseEnPlace);
  for(let t=0;t<N.R.arene.travelling.annonce+N.R.apparitions.rallonge;t+=h){N.horloge.avancer();N.arene.update(h);N.joueuse.god(true);N.joueuse.force({x:w.W/2,y:w.H/2,ang:0});N.joueuse.update(h);N.cam.update(h);N.ennemis.publierTele();}
  N.joueuse.god(false);N.joueuse.force({x:(w.x0+w.x1)/2,y:w.y1-N.R.joueuse.rayonTete,ang:Math.PI/2,trace:true});
  for(let t=0;t<N.R.mort.mur.grace+N.R.apparitions.rallonge&&N.joueuse.etat!=='mort';t+=h){N.horloge.avancer();N.arene.update(h);N.joueuse.update(h);N.cam.update(h);N.ennemis.publierTele();}
  resultat.sansPreavis={etat:N.joueuse.etat,morts:clone(N.journal.dump().filter(j=>j.type==='mort'))};
  resultat.err=clone(window.__ERR);return resultat;
}

export function partieNavigateur({pilote,graine}) {
  const N=window.__N,S=window.__S;
  localStorage.clear(); S.jour=20261017;
  if(S.reglages) S.reglages.actions=pilote==='humain'?'auto':'doigts';
  N.intro.skip();N.game.reset(graine,{depart:'plongee'});
  if(N.game.etat()==='demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote);N.journal.actif(true);N.horloge.avancer();
  let reel=0,temps=0,last='',stagnant=0,raison='borne';
  while(temps<540&&reel<540*4) {
    if(N.game.etat()==='fin') {raison='fin';break;}
    N.game.dbg.simuler(0.25);reel+=0.25;temps=N.horloge.t();
    const e=N.game.etat(),utile=[e,temps,S.ecran?.depuis,S.vol?.t].join('|');
    stagnant=utile===last?stagnant+0.25:0;last=utile;
    if(stagnant>10) {raison='bloque:'+e;break;}
    if(window.__ERR.count) {raison='erreur';break;}
  }
  if(N.game.etat()==='fin') raison='fin';
  const journal=N.journal.dump(),dans=d=>{const v=d.vue;return v&&d.x>=v.x&&d.x<=v.x+v.w&&d.y>=v.y&&d.y<=v.y+v.h;};
  const apparitions=journal.filter(j=>j.type==='apparition'),armes=journal.filter(j=>j.type==='armement');
  const morts=journal.filter(j=>j.type==='mort'&&j.d.auteur==='murMobile');
  const sans=morts.filter(m=>!(m.d.teleDuree>=N.R.arene.travelling.annonce-1e-6||journal.some(a=>a.type==='arene'&&['travelling','convoiAnnonce'].includes(a.d.evt)&&a.t<=m.t-N.R.arene.travelling.annonce)));
  return {pilote,graine,raison,tempsJeu:N.horloge.t(),vague:N.dir.vague(),score:N.score.score,err:window.__ERR,
    apparitions:apparitions.length,dansVue:apparitions.filter(j=>dans(j.d)).length,armementsHorsVue:armes.filter(j=>j.d.shown===false).length,
    mortsMurMobile:morts.length,sansAnnonce:sans.length,journal};
}
