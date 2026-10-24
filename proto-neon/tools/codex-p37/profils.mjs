// Contrôle logique VM des profils complémentaires ; ne qualifie pas leur rendu ni Safari.
import {compiler,sources,monde} from '../codex-p14/vm.mjs';
import vm from 'node:vm';
import {partie,save,date,hash} from './mesurer.mjs';
const src=sources(),script=compiler(src),cas=[];
for(const [profil,w,h]of [['portrait',390,844],['bureau',1440,900]])for(let graine=1;graine<=5;graine++){
 const m=monde(script,graine,w,h);m.c.opts={pilote:'humain',graine};
 const r=JSON.parse(JSON.stringify(vm.runInContext('('+partie.toString()+')(opts)',m.c)));
 cas.push({profil,graine,tempsJeu:r.tempsJeu,vague:r.vague,score:r.score,etat:r.etat,raison:r.raison,
 err:r.err,erreurs:r.erreurs,erreursConsole:m.erreurs,impulsionsPouvoir:r.sorties.pouvoir.length,impulsionsApogee:r.sorties.apogee.length,pasBoost:r.sorties.boost.length,journalSha256:hash(r.journal)});
 console.log(JSON.stringify(cas.at(-1)));
}
save('profils-vm.json',{dateParis:date(),sourceSha256:hash(src),conforme:cas.every(c=>c.etat==='fin'&&!c.err&&!c.erreursConsole.length&&!c.impulsionsPouvoir&&!c.impulsionsApogee&&!c.pasBoost),limite:'Logique sans DOM ; aucun verdict de pixels ou Safari.',cas});
