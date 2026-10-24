import fs from 'node:fs';import zlib from 'node:zlib';import path from 'node:path';import vm from 'node:vm';
import {ICI,compiler,monde,hash,dateParis} from './vm.mjs';
const read=f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,f))));
export function premiereVague({graine}){
 const N=window.__N,S=window.__S;localStorage.clear();S.jour=20261017;S.reglages.actions='doigts';
 N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
 N.pilote.lancer('bon');N.journal.actif(true);N.horloge.avancer();let reel=0,raison='borne';
 while(N.horloge.t()<540&&reel<540*4){
  const j=N.journal.dump();if(j.some(e=>e.type==='vague'&&e.d.evt==='nettoyee'&&e.d.n===1)){raison='V1 nettoyée';break;}
  if(N.game.etat()==='fin'){raison='fin avant nettoyage';break;}
  N.game.dbg.simuler(.25);reel+=.25;if(window.__ERR.count){raison='erreur';break;}
 }
 const journal=N.journal.dump(),a=journal.find(e=>e.type==='vague'&&e.d.evt==='entree'&&e.d.n===1),b=journal.find(e=>e.type==='vague'&&e.d.evt==='nettoyee'&&e.d.n===1);
 return {graine,raison,duree:a&&b?b.t-a.t:null,entree:a||null,nettoyage:b||null,err:window.__ERR.count,journal};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const cas=[],paires=JSON.parse(fs.readFileSync(path.join(ICI,'parties80.json')));
 for(const version of ['avant','apres']){
  const src=read(`sources-${version}.json.gz`),script=compiler(src);
  for(let graine=1;graine<=50;graine++){
   const paire=paires.cas.find(c=>c.pilote==='bon'&&c.graine===graine);let r,erreursConsole,recu=null;
   if(paire){recu=paire[version].fichier;const p=read(recu),journal=p.journal,a=journal.find(e=>e.type==='vague'&&e.d.evt==='entree'&&e.d.n===1),b=journal.find(e=>e.type==='vague'&&e.d.evt==='nettoyee'&&e.d.n===1);r={graine,raison:b?'V1 nettoyée':'fin avant nettoyage',duree:a&&b?b.t-a.t:null,entree:a||null,nettoyage:b||null,err:p.err,journal};erreursConsole=p.erreursConsole;}
   else {const m=monde(script,graine);m.c.options={graine};r=vm.runInContext('('+premiereVague.toString()+')(options)',m.c);erreursConsole=m.erreurs;fs.mkdirSync(path.join(ICI,'v1'),{recursive:true});recu=`v1/${version}-${graine}.json.gz`;fs.writeFileSync(path.join(ICI,recu),zlib.gzipSync(JSON.stringify(r)));}
   const {journal,...resume}=r;cas.push({version,...resume,journalSha256:hash(journal),erreursConsole,recu,reutilise:!!paire});
   fs.writeFileSync(path.join(ICI,'v1.json'),JSON.stringify({dateParis:dateParis(),limite:'V1 observée jusqu’au nettoyage ou à la fin réelle ; pas de fin de partie inventée',cas},null,2)+'\n');
   console.log(JSON.stringify({version,graine,duree:r.duree,raison:r.raison,err:r.err}));if(global.gc)global.gc();
  }
 }
}
