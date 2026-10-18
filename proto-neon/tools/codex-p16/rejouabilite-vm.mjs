// Diagnostic de journal sur les sources réelles ; ni RAF natif ni Canvas, R-30 navigateur reste requis.
import fs from 'node:fs';
import vm from 'node:vm';
import {sources,monde} from './vm.mjs';
import {cle,comparer} from '../mesure/criteres/R-30-rejouabilite.mjs';
import {ratiosTemps} from '../mesure/criteres/R-20-performance.mjs';
import {cameraSimulation} from './raccords.mjs';
const src=sources(),sonde=fs.readFileSync(new URL('../mesure/sonde.js',import.meta.url),'utf8');
const raccord=process.argv.includes('--raccord');if(raccord)src['79-jeu.js']=cameraSimulation(src['79-jeu.js']);
const creer=()=>{const m=monde(src);vm.runInContext(sonde,m.c);m.N.reseed(7);m.N.game.reset(7);return m;};
const run=dessin=>{
  const m=creer(),{c,N}=m;c.__DT=1/60;
  N.journal.dump({vider:true});
  const dem=c.__MESURE.demarrer({graine:7,pilote:'bon'});
  if(!dem.ok)throw Error(JSON.stringify(dem));
  if(dessin){for(let i=0;i<6000&&N.horloge.t()<15.5&&N.game.etat()!=='fin';i++)c.frame(i*1000/60);}
  else for(let i=0;i<500&&N.horloge.t()<15&&N.game.etat()!=='fin';i++)N.game.dbg.simuler(.25);
  return {journal:N.journal.dump(),err:c.__ERR,etat:N.game.etat(),temps:N.horloge.t()};
};
const a=run(false),b=run(true),c=run(true),sansPas=x=>x.map(s=>s.replace(/^\[\d+,/,'['));
const types=J=>Object.fromEntries([...new Set(J.map(x=>x.type))].map(t=>[t,J.filter(x=>x.type===t).length]));
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),avantFiltrage:comparer(sansPas(cle(b.journal,15)),sansPas(cle(a.journal,15))),apresFiltrage:comparer(sansPas(cle(b.journal,15,true)),sansPas(cle(a.journal,15,true))),dessineRepete:comparer(cle(b.journal,15),cle(c.journal,15)),journaux:{simule:a,dessine:b,repete:c},types:{simule:types(a.journal),dessine:types(b.journal)}};
// Scène calme, aucun facteur modifié : contrôle pas à pas de l'absence de ralenti.
const m=creer(),{N}=m;N.game.dbg.scene('calme');N.game.dbg.god(true);m.c.__DT=1/60;
const snapshot=r=>({t:N.horloge.t(),reel:N.horloge.reel(),pas:N.horloge.pas(),r});
const debut=snapshot(0);let ralentis=0;const avancer=N.horloge.avancer;N.horloge.avancer=function(){const d=avancer();if(d!==N.horloge.H)ralentis++;return d;};
for(let i=0;i<120;i++)m.c.frame(i*1000/60);
const fin=snapshot(2000);out.temoinSansRalenti={debut,fin,ralentis,ratios:ratiosTemps(debut,fin),err:m.c.__ERR};
fs.writeFileSync(new URL(raccord?'rejouabilite-raccord-vm.json':'rejouabilite-vm.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,journaux:undefined},null,2));
if(!out.apresFiltrage.egaux||!out.dessineRepete.egaux||ralentis||a.err.count||b.err.count||c.err.count)process.exitCode=1;
