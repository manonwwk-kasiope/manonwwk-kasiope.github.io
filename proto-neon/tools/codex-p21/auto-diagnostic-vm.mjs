// Cas construits de l'AUTO existant, utiles à la demande au propriétaire de 70. Aucun correctif AUTO injecté.
import {bancGestes} from './gestes-vm.mjs';import {sources,chargerAvant,sauver,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';
const cas=[];
for(const [phase,src]of [['avant',chargerAvant()],['apres-raccord',avecRaccord(sources())]]){
 for(const [nom,dx,dy,vx,attendu]of [['tir-entrant',20,0,-140,true],['tir-qui-seloigne',20,0,140,false],['tir-lateral-sans-contact',20,20,-140,false]]){
  const m=bancGestes(src);m.advance(17);const {N,S}=m;S.reglages.actions='auto';N.ennemis.reset();const p=N.joueuse.tete;
  N.ennemis.tir(p.x+dx,p.y+dy,vx,0,{r:1,vie:2,src:{genre:'ennemi',type:'tourelle',id:1}});N.journal.vider();N.joueuse.update(N.horloge.H);
  const actif=N.joueuse.pouvoir.etat==='actif';cas.push({phase,nom,attendu,actif,conforme:actif===attendu,journal:N.journal.lire('pouvoir'),err:m.c.__ERR.count});
 }
 const m=bancGestes(src);m.advance(17);const {N,S}=m;S.reglages.actions='auto';N.ennemis.reset();N.joueuse.equiper('ralenti');const V=N.outils.VUE;
 S.tele=Array.from({length:3},(_,i)=>({id:i+1,forme:'disque',x0:V.x+100+i*20,y0:V.y+80,x1:V.x+100+i*20,y1:V.y+80,r:8,a0:0,a1:Math.PI*2,reste:.5,total:1,cible:'tete',par:{type:'tourelle',id:i+1}}));
 const schemas=S.tele.map(t=>N.ids.valider('tele',t));N.journal.vider();N.joueuse.update(N.horloge.H);const actif=N.joueuse.pouvoir.etat==='actif';
 cas.push({phase,nom:'ralenti-3-telegraphes-publics-construits-en-vue',attendu:true,actif,conforme:actif&&schemas.every(s=>!s.length),schemas,journal:N.journal.lire('pouvoir'),err:m.c.__ERR.count});
}
sauver('auto-diagnostic-vm.json',{dateParis:dateParis(),reference:'REFONTE.md §2.16, lignes 692-695 : menace entrante <0,25s / RALENTI 3 télégraphes en vue ; tests construits, pas une attribution des taux R-23.',corrigeDansCeLot:false,cas});console.log(cas.map(({phase,nom,attendu,actif,conforme,err})=>({phase,nom,attendu,actif,conforme,err})));if(cas.some(c=>!c.conforme))process.exitCode=1;
