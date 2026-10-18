import {sources,chargerAvant,sauver,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {bancGestes} from './gestes-vm.mjs';
const cas=[];
for(const [phase,src]of [['avant',chargerAvant()],['apres-raccord',avecRaccord(sources())]]){
 const m=bancGestes(src),{touch,advance,S}=m;touch('start',1,250,195);touch('move',1,294,195);advance(500);const droit=S.player.boost;
 touch('move',1,250+44*Math.cos(20*Math.PI/180),195+44*Math.sin(20*Math.PI/180));advance(17);const virage20=S.player.boost;
 touch('move',1,250+44*Math.cos(-40*Math.PI/180),195+44*Math.sin(-40*Math.PI/180));advance(17);const virage40=S.player.boost;
 cas.push({phase,nom:'poussee-implicite-20-40-degres',conforme:droit&&virage20&&!virage40,droit,virage20,virage40,err:m.c.__ERR.count,erreurs:m.erreurs});
 const e=bancGestes(src);e.touch('start',1,250,195);e.advance(260);e.touch('start',2,650,230);e.advance(200);const tenu=e.S.player.boost;
 e.touch('move',1,250,239);e.advance(17);const tourne=e.S.player.boost;
 e.touch('move',1,250+22*Math.cos(e.S.player.ang),195+22*Math.sin(e.S.player.ang));e.advance(17);const repris=e.S.player.boost;
 e.touch('end',2,650,230);e.advance(17);const fini=e.S.player.boost;
 cas.push({phase,nom:'tenu-explicite-suspension-reprise-relache',conforme:tenu&&!tourne&&repris&&!fini,tenu,tourne,repris,fini,err:e.c.__ERR.count,erreurs:e.erreurs});
}
sauver('boost-bords.json',{dateParis:dateParis(),cas,conforme:cas.every(c=>c.conforme&&!c.err&&!c.erreurs.length)});console.log(cas);if(!cas.every(c=>c.conforme))process.exitCode=1;
