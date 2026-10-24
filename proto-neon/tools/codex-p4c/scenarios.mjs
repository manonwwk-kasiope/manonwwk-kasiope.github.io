// La même fonction est exécutée sur les vraies API en VM et dans la page Playwright.
export function scenarios() {
  const N = window.__N, S = window.__S, h = N.R.temps.h;
  const clone = x => JSON.parse(JSON.stringify(x));
  const vue = () => ({x:N.cam.x,y:N.cam.y,w:N.cam.w,h:N.cam.h});
  const dedans = e => { const v=vue(); return e.x>=v.x&&e.x<=v.x+v.w&&e.y>=v.y&&e.y<=v.y+v.h; };
  function init() {
    localStorage.clear(); S.jour=20261017;
    N.intro.skip(); N.game.reset(7,{depart:'plongee'});
    if(N.game.etat()==='demarrage') N.game.dbg.etat('plongee');
    N.world.arena({x:0,y:0,w:N.world.W,h:N.world.H},N.R.monde.mobile.glissementMin);
    N.cam.update(N.R.monde.mobile.glissementMin);
    N.arene.reset(); N.ennemis.reset(); N.joueuse.reset({x:N.world.W/2,y:N.world.H/2,ang:0});
    N.cam.reset(); N.outils.geom(); N.journal.actif(true); N.journal.vider();
    N.horloge.avancer();
  }
  const result={ennemis:[],murs:[],captures:[],erreurs:[]};
  function tampon(nom,draw) {
    N.gfx.clear(0); N.outils.origineMonde(); draw();
    const b=Array.from(N.gfx.buf()), pal=N.pal.C.length;
    result.captures.push({nom,w:N.gfx.W,h:N.gfx.H,nonVide:b.filter(v=>v!==0).length,horsPalette:b.filter(v=>v>=pal).length,buf:b});
  }
  for(const type of ['fleche','mine','larve','ruche','tourelle','sentinelle','dard','lame','rival','planeur','traqueur']) {
    init();
    const v=vue(), e=N.ennemis.spawn(type,v.x+v.w/2,v.y+v.h/2,{portail:N.R.apparitions.portail});
    const debut={id:e.id,type:e.type,x:e.x,y:e.y,etat:e.etat,dansVue:dedans(e)};
    for(let t=0;t<N.R.apparitions.portail+N.R.apparitions.rallonge;t+=h) {N.horloge.avancer();N.ennemis.update(h);}
    const apps=N.journal.dump().filter(j=>j.type==='apparition'&&j.d.id===e.id);
    result.ennemis.push({type,debut,fin:{x:e.x,y:e.y,etat:e.etat,dansVue:dedans(e)},apparitions:clone(apps)});
  }
  // Rotation / caméra rejoignant un portail : le marqueur reste sur place et inoffensif.
  init();
  const v=vue(), mine=N.ennemis.spawn('mine',v.x+v.w/2,v.y+v.h/2,{portail:N.R.apparitions.portail});
  N.cam.reset(mine.x,mine.y); N.outils.geom();
  const pos={x:mine.x,y:mine.y};
  for(let t=0;t<N.R.apparitions.portail+N.R.apparitions.rallonge;t+=h) {N.horloge.avancer();N.ennemis.update(h);}
  result.cameraPortail={pos,fin:{x:mine.x,y:mine.y,etat:mine.etat},dansVue:dedans(mine),apparitions:clone(N.journal.dump().filter(j=>j.type==='apparition'&&j.d.id===mine.id))};
  tampon('portail-visible',()=>N.ennemis.drawTele());
  // Mort physique provoquée vers le bas pendant la mise en place, sans pilote/god.
  init();
  const w=N.world, depart=N.R.tests.scenes.travelling.depuis, avant={x0:w.x0,x1:w.x1}, start=N.horloge.t();
  N.arene.travelling(N.R.arene.travelling.vitesses[3],depart);
  let premier=null;
  for(let t=0;t<N.R.arene.travelling.annonce+N.R.arene.travelling.miseEnPlace;t+=h) {
    N.horloge.avancer();N.arene.update(h);N.cam.update(h);N.ennemis.publierTele();
    if(!premier&&(w.x0!==avant.x0||w.x1!==avant.x1)) { premier={delai:N.horloge.t()-start,tele:clone(S.tele),etat:N.arene.etat()}; break; }
  }
  result.murs.push({avant,premier,etat:N.arene.etat(),tele:clone(S.tele)});
  N.cam.reset(depart,N.world.H/2);N.outils.geom();
  tampon('annonce-murs',()=>N.arene.draw());
  N.joueuse.force({x:(w.x0+w.x1)/2,y:w.y1-N.R.joueuse.rayonTete,ang:Math.PI/2,trace:true});
  const aMort=N.horloge.t();
  for(let t=0;t<N.R.mort.mur.grace+N.R.apparitions.rallonge&&N.joueuse.etat!=='mort';t+=h) {
    N.horloge.avancer();N.arene.update(h);N.joueuse.update(h);N.cam.update(h);N.ennemis.publierTele();
  }
  result.collision={depart:aMort,etat:N.joueuse.etat,morts:clone(N.journal.dump().filter(j=>j.type==='mort')),annonces:clone(N.journal.dump().filter(j=>j.type==='arene')),tele:clone(S.tele)};
  result.minesPosees=[];
  for(const cas of ['contact','souffle']) {
    init();const v=vue();
    const creeAt=N.horloge.t(),e=N.ennemis.spawn('mine',v.x+v.w/2,v.y+v.h/2,{portail:N.R.colosse.minesPosees.armement,annoncePose:true,st:'arme',stT:N.R.colosse.phase3.armementMines});
    const naissance={x:e.x,y:e.y,dansVue:dedans(e)},zonePose=clone(S.tele);
    for(let t=0;t<N.R.colosse.minesPosees.armement+N.R.apparitions.rallonge;t+=h) {N.horloge.avancer();N.ennemis.update(h);}
    N.cam.reset(e.x,e.y);N.outils.geom();
    tampon('mine-protegee-'+cas,()=>{N.ennemis.drawEnemies();N.ennemis.drawTele();});
    const visibleAt=naissance.dansVue?creeAt:N.horloge.t();let mort=null;
    const recul=cas==='contact'?0:N.R.ennemis.mine.souffle/2;
    for(let t=0;t<N.R.colosse.minesPosees.armement+N.R.colosse.phase3.armementMines+N.R.apparitions.rallonge;t+=h) {
      N.horloge.avancer();N.joueuse.force({x:e.x+recul,y:e.y,ang:0,trace:true});N.joueuse.update(h);N.ennemis.update(h);
      const m=N.journal.dump().find(j=>j.type==='mort'&&j.d.auteur==='mine'&&j.d.auteurId===e.id);
      if(m) {mort=clone(m);break;}
    }
    result.minesPosees.push({cas,naissance,zonePose,visibleAt,mort,delaiVisible:mort?mort.t-visibleAt:null,armements:clone(N.journal.dump().filter(j=>j.type==='armement')),apparitions:clone(N.journal.dump().filter(j=>j.type==='apparition'))});
  }
  // Cas externe explicitement mesuré, sans exclure les objets du boss du résultat R-06.
  init();N.game.dbg.boss();
  result.cyclope=clone(N.journal.dump().filter(j=>j.type==='apparition'&&j.d.type==='cyclope'));
  result.err=clone(window.__ERR);result.journal=clone(N.journal.dump());
  return result;
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
