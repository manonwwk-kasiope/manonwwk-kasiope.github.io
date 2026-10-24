// VM sans DOM : charge les vrais modules dans l'ordre de build.mjs. Aucun serveur/navigateur.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const ICI=path.dirname(fileURLToPath(import.meta.url)), PROTO=path.resolve(ICI,'../..');
const cache=new Map();
export function sources(ref=null){
  if(cache.has(ref))return cache.get(ref);
  const files=ref?execFileSync('git',['ls-tree','-r','--name-only',ref,'--','proto-neon/src'],{cwd:path.dirname(PROTO),encoding:'utf8'}).trim().split('\n').map(f=>path.basename(f)).filter(f=>f.endsWith('.js')).sort():fs.readdirSync(path.join(PROTO,'src')).filter(f=>f.endsWith('.js')).sort();
  const a=files.map(f=>[f,ref?execFileSync('git',['show',ref+':proto-neon/src/'+f],{cwd:PROTO,encoding:'utf8',maxBuffer:16e6}):fs.readFileSync(path.join(PROTO,'src',f),'utf8')]);cache.set(ref,a);return a;
}
export function monde(src=sources(),{w=844,h=390,reduit=false,graine=1,camera=false}={}){
  const erreurs=[], stock=new Map();
  const c={console:{log(){},warn(){},error(...x){erreurs.push(x.map(String).join(' '));}},URL,URLSearchParams,location:{search:'?journal=1'},navigator:{maxTouchPoints:1},innerWidth:w,innerHeight:h,requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener(){},matchMedia:()=>({matches:reduit}),localStorage:{getItem:k=>stock.get(k)??null,setItem:(k,v)=>stock.set(k,String(v)),removeItem:k=>stock.delete(k),clear:()=>stock.clear()},ART_SRC:{},CINE_DISPO:[],MUSIQUE_BASE:'musique/',MUSIQUE_EMBED:null,__N:{},__SEED:graine,__DT:1/60};
  c.window=c;c.N=c.__N;vm.createContext(c);
  // Comme build.mjs : UNE fermeture lexicale commune, et non des globaux contextifiés par fichier.
  vm.runInContext('(function(){var N=window.__N;var Math=globalThis.Math;\n'+src.map(([f,s])=>'/* '+f+' */\n'+s).join('\n')+(camera?'\nwindow.__R12Avancer=function(){frame(0);};':'')+'\n})();',c,{filename:'proto-neon-vm.bundle.js'});
  c.S=c.__N.S;
  c.__S=c.__N.S;const g=c.__N.gfx.resize(w,h);c.__S.view.w=g.w;c.__S.view.h=g.h;
  c.__N.reseed(graine);
  // Reprendre les étapes de boot qui ne dépendent pas du DOM : premier reset et profil chargés avant le protocole.
  const boot=src.find(([f])=>f==='90-boot.js')[1];
  if(boot.includes("step('intro.reset'"))c.__N.intro.reset();
  if(boot.includes("S.phase = 'play'"))c.__S.phase='play';
  c.__N.game.reset(graine);return {c,N:c.__N,erreurs,run:s=>vm.runInContext(s,c)};
}
export function partie(src,pilote,graine){
  const m=monde(src,{graine});m.c.params={pilote,graine};
  const r=m.run(`(function(){
    const {pilote,graine}=params,N=window.__N,S=N.S,maxT=540;
    localStorage.clear();S.jour=20261017;if(S.reglages)S.reglages.actions=pilote==='humain'?'auto':'doigts';
    N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
    N.pilote.lancer(pilote);if(pilote==='dieu')N.game.dbg.god(true);N.journal.actif(true);
    let reel=0,temps=0,stagnant=0,last='',raison='borne';N.horloge.avancer();
    while(temps<maxT&&reel<maxT*4){
      if(N.game.etat()==='fin'){raison='fin';break;}
      N.game.dbg.simuler(0.25);reel+=0.25;temps=N.horloge.t();const e=N.game.etat();
      const utile=[e,temps,S.ecran?.depuis,S.vol?.t].join('|');stagnant=utile===last?stagnant+0.25:0;last=utile;
      if(stagnant>10){raison='bloque:'+e;break;}if(window.__ERR.count){raison='erreur';break;}
    }
    if(N.game.etat()==='fin')raison='fin';const d=N.game.dbg(),journal=N.journal.dump();
    return {pilote,graine,raison,fin:N.game.etat()==='fin',tempsJeu:N.horloge.t(),tempsCombat:d.t,pas:N.horloge.pas(),tempsSimule:reel,vague:d.vague,score:d.score,morts:journal.filter(e=>e.type==='mort').map(e=>e.d),err:window.__ERR.count,erreurs:window.__ERR.sigs,phases:journal.filter(e=>e.type==='phase'),vagues:journal.filter(e=>e.type==='vague'),armes:journal.filter(e=>e.type==='armement').map(e=>e.d.type)};
  })()`);return JSON.parse(JSON.stringify({...r,console:m.erreurs}));
}
