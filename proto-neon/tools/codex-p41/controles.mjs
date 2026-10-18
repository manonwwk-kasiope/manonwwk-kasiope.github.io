import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import vm from 'node:vm';
import assert from 'node:assert/strict';import {ICI,monde,compiler,dateParis} from './vm.mjs';import {raccorder} from './raccords.mjs';import {main} from './relance.mjs';
export function intermedes(){
 const N=window.__N,S=window.__S;N.intro.skip();N.game.reset(1,{depart:'jeu'});N.game.dbg.god(true);N.pilote.arreter();
 const frames=n=>{for(let i=0;i<n;i++)window.__P41Image(0);};
 const rival=()=>N.ev.emit('portail',{type:'rival',x:N.joueuse.tete.x,y:N.joueuse.tete.y,dur:N.R.apparitions.portail,elite:false});
 rival();frames(1);const entree=N.intro.current();
 S.input.any=true;frames(1);const avantGarde={...N.intro.state()};
 frames(Math.ceil(N.R.ecrans.ouverture.garde/window.__DT));
 const pret={...N.intro.state()};S.input.any=true;frames(1);const apresGeste={...N.intro.state()};frames(1);
 rival();frames(1);const secondeDemande=N.intro.current();
 N.game.dbg.scene('fin');frames(40);S.input.valider=true;S.input.any=true;frames(1);
 rival();frames(1);const nouvellePartie=N.intro.current();
 return {entree,avantGarde,pret,apresGeste,secondeDemande,nouvellePartie,err:window.__ERR.count,erreurs:window.__ERR.sigs,journal:N.journal.dump()};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const avant=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,'sources-avant.json.gz')))),apres=raccorder(avant),cas=[];
 for(const [version,src]of [['avant',avant],['apres',apres],['p38+p41',raccorder(apres,'p38')]])for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
  const script=compiler(src.map(([f,s])=>[f,f==='90-boot.js'?s+'\nwindow.__P41Image=frame;':s]));
  const a=monde(script,1,w,h),b=monde(script,1,w,h);
  const priseMain=vm.runInContext('('+main.toString()+')()',a.c),films=vm.runInContext('('+intermedes.toString()+')()',b.c);
  const r={version,profil,priseMain,films,erreursConsole:[...a.erreurs,...b.erreurs]};cas.push(r);console.log(JSON.stringify(r));
 }
 fs.writeFileSync(path.join(ICI,'controles.json'),JSON.stringify({dateParis:dateParis(),cas},null,2)+'\n');
 const candidates=cas.filter(c=>c.version!=='avant');
 assert(candidates.every(c=>c.priseMain.vivant&&c.priseMain.deplacement>0&&Math.abs(c.priseMain.virage)>0&&!c.priseMain.err&&!c.erreursConsole.length));
 assert(candidates.every(c=>c.films.entree==='rival'&&c.films.avantGarde.busy&&c.films.pret.armed&&!c.films.apresGeste.busy&&c.films.secondeDemande===null&&c.films.nouvellePartie==='rival'&&!c.films.err));
}
