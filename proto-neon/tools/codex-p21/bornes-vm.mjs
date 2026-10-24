import {sources,chargerAvant,sauver,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {bancGestes} from './gestes-vm.mjs';import {hasard} from './gestes.mjs';
const phase=process.argv.includes('--avant')?'avant':'apres',src=phase==='avant'?chargerAvant():avecRaccord(sources()),cas=[];
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const essais=[
  ['toucher-179ms-9pt',179,9,'toucher'],['deplacement-10pt-exclu',70,10,null],
  ['glisse-24pt-219ms',219,24,'glisse'],['glisse-24pt-220ms-exclu',220,24,null],
  ['aller-retour-12pt',90,12,null],['cancel-70ms',70,0,null],['deplacement-tardif-30pt',230,30,null]
 ];
 for(const [nom,temps,dist,attendu]of essais){const m=bancGestes(src,w,h),x=w*.7,y=h*.5;m.touch('start',1,w*.22,h*.62);m.advance(260);m.touch('start',2,x,y);
  // Blocage ponctuel de la boucle : les événements arrivés tard doivent être refusés selon leurs vrais seuils.
  m.c.__now+=temps;m.touch('move',2,x+dist,y);
  if(nom.startsWith('aller-retour'))m.touch('move',2,x,y);
  if(nom==='deplacement-tardif-30pt')m.B.update();
  if(nom.startsWith('cancel')){m.B.end({type:'touchcancel',changedTouches:[{identifier:2,clientX:x,clientY:y}],cancelable:true,preventDefault(){}});}else m.touch('end',2,x+(nom.startsWith('aller-retour')?0:dist),y);
  m.advance(17);const J=m.N.journal.lire('geste'),pouvoir=m.N.joueuse.pouvoir.etat;
  cas.push({profil,nom,attendu,obtenu:J.map(e=>e.d.genre),conforme:attendu?J.length===1&&J[0].d.genre===attendu:!J.length&&pouvoir==='pret',journal:J,pouvoir,err:m.c.__ERR.count,erreurs:m.erreurs});
 }
 const m=bancGestes(src,w,h),r=hasard(2975);let poses=0,courts=0,autres=0;const start=m.c.__now;
 while(m.c.__now-start<120000){const x=w*(.1+.35*r()),y=h*(.35+.5*r()),court=r()<.3,autre=r()<.1,id=++poses;
  m.touch('start',id,x,y);
  if(autre){autres++;m.advance(40+90*r());const id2=10000+id;m.touch('start',id2,w*.7,h*.5);m.advance(80);m.touch('end',id2,w*.7,h*.5);}
  if(court){courts++;m.advance(60+120*r());m.touch('end',id,x,y);}
  else{const a=r()*Math.PI*2,X=x+30*Math.cos(a),Y=y+30*Math.sin(a);m.advance(80);m.touch('move',id,X,Y);m.advance(500+2500*r());m.touch('end',id,X,Y);}
  m.advance(30+120*r());
 }
 const J=m.N.journal.dump().filter(e=>['geste','pouvoir','apogee','boost'].includes(e.type)),boost=m.trace.filter(t=>t.inputBoost).length;
 cas.push({profil,nom:'recentrages-120s',poses,courts,autres,dureeMs:m.c.__now-start,actionsParasites:J.length,imagesBoost:boost,conforme:!J.length&&!boost,journal:J,err:m.c.__ERR.count,erreurs:m.erreurs});
}
const r={dateParis:dateParis(),limite:'Handlers et frame réels en VM ; ni navigation, ni zoom, ni sélection système mesurés.',conforme:cas.every(c=>c.conforme&&!c.err&&!c.erreurs.length),cas};sauver('bornes-'+phase+'.json',r);console.log(r.cas.map(({profil,nom,conforme,obtenu,poses,actionsParasites,imagesBoost})=>({profil,nom,conforme,obtenu,poses,actionsParasites,imagesBoost})));if(!r.conforme)process.exitCode=1;
