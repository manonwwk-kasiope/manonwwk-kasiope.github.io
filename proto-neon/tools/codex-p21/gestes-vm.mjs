import {avecRaccord} from './raccord.mjs';
import {monde,sources,chargerAvant,sauver,dateParis} from './vm.mjs';
export function bancGestes(src=sources(),width=844,height=390){
 const m=monde(src,2975,width,height),{N,S,c}=m,B=c.__BOOT_TEST;
 c.__now=0;N.intro.skip();N.intro.stop();N.game.reset(2975);N.game.dbg.vague(1);N.game.dbg.god(true);S.reglages.actions='doigts';S.jour=20261017;
 N.joueuse.force({x:512,y:256,ang:0,trace:true});N.journal.actif(true);N.journal.vider();
 const fingers=new Map(), touch=(type,id,x,y)=>{const t={identifier:id,clientX:x,clientY:y};if(type==='start'||type==='move')fingers.set(id,t);else fingers.delete(id);B[type]({type:type==='end'?'touchend':type==='cancel'?'touchcancel':'touch'+type,changedTouches:[t],touches:[...fingers.values()],cancelable:true,preventDefault(){}});};
 const trace=[], frame=()=>{B.frame(c.__now);trace.push({r:c.__now,boost:S.player.boost,vit:S.player.vit,ang:S.player.ang,cible:S.player.angVise,inputBoost:S.input.boost,reserve:N.joueuse.reserve(),etat:N.game.etat()});c.__MESURE?.echantillonner?.();};
 const advance=ms=>{const end=c.__now+ms;while(c.__now+1000/60<end-1e-6){c.__now+=1000/60;frame();}c.__now=end;frame();};
 return {...m,B,touch,advance,trace};
}
export function mesurerGestes(src){
 const cas=[];
 for(const genre of ['toucher','glisse','tenu']){
 for(let k=0;k<6;k++){
 const m=bancGestes(src),{touch,advance,N,S}=m;
 touch('start',1,220,230);touch('move',1,242,230);advance(260);
 if(genre==='glisse')N.joueuse.apogeeAjouter(100);
 const avant={pv:{...N.joueuse.pouvoir},apo:N.joueuse.apogee,reserve:N.joueuse.reserve()};N.journal.vider();
 touch('start',2,650,230);
 if(genre==='toucher'){advance(70);touch('end',2,650,230);advance(17);}
 if(genre==='glisse'){advance(60);touch('move',2,685,220);advance(17);touch('end',2,720,210);}
 if(genre==='tenu'){advance(500);touch('end',2,650,230);advance(17);}
 const J=N.journal.dump(),act=genre==='toucher'?'pouvoir':genre==='glisse'?'apogee':'boost',evt=act==='boost'?'on':'debut';
 const sortie=act==='pouvoir'?N.joueuse.pouvoir.etat==='actif':act==='apogee'?N.joueuse.apogee<avant.apo:N.joueuse.reserve()<avant.reserve&&m.trace.some(r=>r.boost)&&!S.player.boost;
 cas.push({nom:genre+'-'+k,attendu:act,conforme:sortie&&J.filter(e=>e.type===act&&e.d.evt===evt).length===1&&J.filter(e=>e.type==='geste'&&e.d.genre===genre).length===1,avant,apres:{pv:{...N.joueuse.pouvoir},apo:N.joueuse.apogee,reserve:N.joueuse.reserve(),boost:S.player.boost},journal:J.filter(e=>['geste','pouvoir','apogee','boost'].includes(e.type)),erreurs:m.erreurs,err:m.c.__ERR.count});
 }}
 const m=bancGestes(src);m.touch('start',1,220,230);m.advance(40);m.touch('start',2,650,230);m.advance(80);m.touch('end',1,220,230);m.advance(100);m.touch('end',2,650,230);m.advance(20);
 cas.push({nom:'recentrage-deux-doigts-precoce',conforme:!m.N.journal.dump().some(e=>e.type==='geste'),journal:m.N.journal.dump().filter(e=>e.type==='geste'),err:m.c.__ERR.count,erreurs:m.erreurs});
 const sl=bancGestes(src);sl.touch('start',1,250,195);let a0=sl.S.player.ang;
 for(let k=0;k<60;k++){const a=a0+(k%2?1:-1)*40*Math.PI/180;sl.touch('move',1,250+44*Math.cos(a),195+44*Math.sin(a));sl.advance(150);}
 const images=sl.trace.filter(t=>t.boost).length;
 cas.push({nom:'slalom',conforme:images===0,imagesBoost:images,trace:sl.trace,err:sl.c.__ERR.count,erreurs:sl.erreurs});
 const arme=bancGestes(src);arme.touch('start',1,250,195);arme.touch('move',1,294,195);arme.advance(500);arme.trace.length=0;
 for(let k=0;k<20;k++){const a=(k%2?1:-1)*40*Math.PI/180;arme.touch('move',1,250+44*Math.cos(a),195+44*Math.sin(a));arme.advance(150);}
 cas.push({nom:'slalom-apres-poussee-droite',conforme:!arme.trace.some(t=>t.boost),imagesBoost:arme.trace.filter(t=>t.boost).length,trace:arme.trace,err:arme.c.__ERR.count,erreurs:arme.erreurs});
 const retour=bancGestes(src);retour.touch('start',1,220,230);retour.advance(260);retour.touch('start',2,650,230);retour.advance(30);retour.touch('move',2,662,230);retour.advance(30);retour.touch('move',2,650,230);retour.advance(30);retour.touch('end',2,650,230);retour.advance(17);
 cas.push({nom:'aller-retour-12pt-pas-toucher',conforme:!retour.N.journal.lire('geste').length&&retour.N.joueuse.pouvoir.etat==='pret',journal:retour.N.journal.lire('geste'),pouvoir:{...retour.N.joueuse.pouvoir},err:retour.c.__ERR.count,erreurs:retour.erreurs});
 return {dateParis:dateParis(),cas,conforme:cas.every(c=>c.conforme&&!c.err&&!c.erreurs?.length)};
}
if(process.argv[1]?.endsWith('/gestes-vm.mjs')){
 const phase=process.argv.includes('--avant')?'avant':'apres',r=mesurerGestes(phase==='avant'?chargerAvant():process.argv.includes('--raccord')?avecRaccord(sources()):sources());sauver('gestes-'+phase+(process.argv.includes('--raccord')?'-raccord':'')+'.json',r);console.log(r.cas.map(({nom,conforme,imagesBoost,err,erreurs})=>({nom,conforme,imagesBoost,err,erreurs})));if(!r.conforme)process.exitCode=1;
}
