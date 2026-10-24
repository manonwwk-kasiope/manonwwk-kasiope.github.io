import fs from 'node:fs';
import path from 'node:path';
import {ROOT,sources,monde} from './vm.mjs';
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),profils:[]};
for(const [nom,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]) {
  const m=monde(sources(),w,h),{N,S}=m,controles=[],trace=[];
  const check=(nom,ok,valeur)=>controles.push({nom,ok:!!ok,valeur});
  const avancer=s=>N.game.dbg.simuler(s),step=()=>avancer(N.horloge.H);
  const tap=rect=>{S.input.taps.push({x:rect.x+rect.w/2,y:rect.y+rect.h/2});step();S.input.taps.length=0;S.input.any=false;};
  const vue=()=>({jeu:N.game.etat(),aventure:N.aventure.enCours(),etape:N.aventure.etape(),vies:N.score.vies,victoire:N.score.resume()?.victoire??null,marque:N.score.marque()});
  N.game.reset(7,{depart:'titre'});N.horloge.avancer();avancer(1);S.input.valider=true;step();S.input.valider=false;
  // Préparation seulement : les gardes de films ont leur propre preuve dans statique.json.
  for(let i=0;i<100&&N.game.etat()==='aventure';i++){N.aventure.sauter();avancer(0.25);}
  check('néon avec aventure attachée',N.game.etat()==='plongee'&&N.aventure.enCours(),vue());
  avancer(1);
  function mourir(){for(let i=0;i<80&&N.game.etat()!=='fin';i++){N.joueuse.tuer('mur',{genre:'decor',type:'mur',id:null});avancer(0.25);}trace.push(vue());}
  mourir();check('défaite conserve écran fin et aventure en attente',N.game.etat()==='fin'&&N.aventure.enCours()&&!N.score.resume().victoire,vue());
  avancer(N.R.ecrans.fin.garde+N.horloge.H);tap(N.ui.finActions().continuer);
  check('CONTINUER reprend néon',N.game.etat()==='jeu'&&N.aventure.enCours()&&N.score.marque()==='C',vue());
  mourir();avancer(N.R.ecrans.fin.garde+N.horloge.H);tap(N.ui.finActions().rejouer);
  check('REJOUER après défaite reste néon',N.game.etat()==='plongee'&&N.aventure.enCours(),vue());
  N.game.aller('titre');check('titre arrête le voyage après défaite',!N.aventure.enCours(),vue());
  // Intermèdes historiques : temps de jeu et tête réellement gelés, garde et saut au toucher.
  N.game.reset(7,{depart:'jeu'});N.game.dbg.god(true);N.game.dbg.etat('alerte');
  for(let i=0;i<300&&N.game.etat()!=='panneau';i++)step();
  for(const film of ['reveil','boss']) {
    check('intermède '+film,N.intro.current()===film&&N.game.etat()==='panneau',N.intro.state());
    const avant={t:N.horloge.t(),x:N.joueuse.tete.x,y:N.joueuse.tete.y,vagueT:N.dir.tempsVague()};
    S.input.any=true;step();S.input.any=false;
    check('garde '+film,N.intro.current()===film&&N.intro.busy(),N.intro.state());
    avancer(N.R.ecrans.ouverture.garde+N.horloge.H);
    const apres={t:N.horloge.t(),x:N.joueuse.tete.x,y:N.joueuse.tete.y,vagueT:N.dir.tempsVague()};
    check('monde gelé '+film,JSON.stringify(avant)===JSON.stringify(apres),{avant,apres});
    S.input.any=true;step();S.input.any=false;step();
    check('un toucher saute '+film,N.intro.current()!==film,N.intro.state());
  }
  check('retour réel au boss',N.game.etat()==='boss',N.game.etat());
  const err=JSON.parse(JSON.stringify(m.c.__ERR));check('zéro erreur',err.count===0&&!m.erreurs.length,{err,console:m.erreurs});
  sortie.profils.push({nom,controles,trace,err,erreursConsole:m.erreurs,journal:N.journal.dump(),conforme:controles.every(c=>c.ok)});
  console.log(JSON.stringify({nom,conforme:sortie.profils.at(-1).conforme,echecs:controles.filter(c=>!c.ok)}));
}
sortie.conforme=sortie.profils.every(p=>p.conforme);
fs.writeFileSync(path.join(ROOT,'tools/codex-09/complements.json'),JSON.stringify(sortie,null,2));
if(!sortie.conforme)process.exitCode=1;
