// Cas corrigés : remettre l'origine monde APRÈS le décor, qui dessine en espace écran.
import fs from 'node:fs';import vm from 'node:vm';import {sources,monde} from './vm.mjs';import {installer} from './sonde.mjs';
const H=new URL('./',import.meta.url),out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Tampons VM ; la composition garde les échecs de bord créés par les recouvrements.',versions:[]};
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
for(const version of ['avant','apres']){
 const src=version==='avant'?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources(),r={version,cas:[]};out.versions.push(r);
 for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const phase of [1,2,3]){
  const m=monde(src,7);m.N.gfx.resize(w,h);m.S.view.w=m.N.gfx.W;m.S.view.h=m.N.gfx.H;m.c.__p32step=()=>m.c.frame((m.c.__FRAME||0)*1000/60);
  vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),m.c);installer(m.c);m.c.__P32.preparer(phase);
  for(const quartier of m.N.decor.QUARTIERS){
   const mesure=m.c.__P32.construit(quartier);r.cas.push({profil,phase,...mesure,erreursConsole:[...m.erreurs]});
  }
  fs.writeFileSync(new URL('construits.json',H),JSON.stringify(out,null,2)+'\n');
 }
}
const a=out.versions[1].cas;out.isolesValides=a.filter(x=>x.isole.analyse.gaine?.bord>0&&x.isole.analyse.gaine.part===1&&!x.cyan&&!x.erreursConsole.length&&!x.isole.err.count).length;
out.reservesComposition=a.filter(x=>x.compose.analyse.gaine?.bord&&x.compose.analyse.gaine.part!==1).map(x=>({profil:x.profil,phase:x.phase,quartier:x.quartier,gaine:x.compose.analyse.gaine}));
fs.writeFileSync(new URL('construits.json',H),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({isolesValides:out.isolesValides,total:a.length,reservesComposition:out.reservesComposition.length}));
if(out.isolesValides!==63)process.exitCode=1;
