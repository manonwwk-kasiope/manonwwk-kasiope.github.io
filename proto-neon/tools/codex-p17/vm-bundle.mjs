import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function sources(ref) {
  if (!ref) return fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,fs.readFileSync(path.join(ROOT,'src',f),'utf8')]);
  const opts={cwd:path.dirname(ROOT),encoding:'utf8',timeout:5000,maxBuffer:8388608};
  const names=execFileSync('git',['ls-tree','-r','--name-only',ref,'proto-neon/src/'],opts).trim().split('\n');
  const out=[];
  for (const name of names) out.push([path.basename(name),execFileSync('git',['show',ref+':'+name],opts)]);
  return out;
}
export function monde(src, stockage = new Map(), viewport = [844,390], graine = 1) {
  const erreurs=[];
  const c={Math,Object,Array,Number,String,JSON,isFinite,isNaN,parseInt,parseFloat,console:{log(){},warn(){},error(...args){erreurs.push(args.map(String).join(' '));}},URL,URLSearchParams,
    location:{search:'?journal=1'}, navigator:{maxTouchPoints:1},innerWidth:viewport[0],innerHeight:viewport[1],requestAnimationFrame(){return 0;},cancelAnimationFrame(){},addEventListener(){},matchMedia:()=>({matches:false}),ART_SRC:{},CINE_DISPO:[],MUSIQUE_BASE:'musique/',MUSIQUE_EMBED:null,
    __SEED:1,__DT:1/60,__N:{},localStorage:{getItem:k=>stockage.get(k)??null,setItem:(k,v)=>stockage.set(k,String(v)),removeItem:k=>stockage.delete(k),clear:()=>stockage.clear()}};
  c.window=c;c.N=c.__N;vm.createContext(c);
  vm.runInContext('(function(){var N=window.__N;\n'+src.map(([f,code])=>'/* '+f+' */\n'+code).join('\n')+'\n})();',c,{filename:'sources-assemblees.js'});
  c.__S=c.__N.S;c.__N.gfx.resize(...viewport);c.__N.reseed(graine);c.__N.intro.reset();c.__N.game.reset(graine);return {c,N:c.__N,S:c.__S,erreurs,stockage};
}
export function jouer(w,pilote,graine,{jour=20261017,max=540}={}) {
  const {N,S,c}=w;const avantJournal=N.journal.compte();S.jour=jour;
  if(S.reglages) S.reglages.actions=pilote==='humain'?'auto':'doigts';
  N.intro.skip();N.game.reset(graine,{depart:'plongee'});
  if(N.game.etat()==='demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote);if(pilote==='dieu') N.game.dbg.god(true);
  N.journal.actif(true);N.horloge.avancer();
  let reel=0,temps=0;
  while(N.game.etat()!=='fin'&&temps<max&&reel<max*4&&!c.__ERR.count){N.game.dbg.simuler(.25);reel+=.25;temps=N.horloge.t();}
  const d=N.game.dbg(),J=N.journal.dump().slice(-(N.journal.compte()-avantJournal));
  return JSON.parse(JSON.stringify({pilote,graine,raison:N.game.etat()==='fin'?'fin':'borne',tempsJeu:N.horloge.t(),tempsCombat:d.t,vague:d.vague,score:d.score,err:c.__ERR.count,erreurs:w.erreurs,energie:N.score.energie,resume:N.score.resume(),defis:N.score.defis,defiVague:N.score.defiVague,journal:J.filter(e=>['defi','deblocage'].includes(e.type))}));
}
