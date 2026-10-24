import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {partie} from './protocole.mjs';
export const ICI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(ICI, '../../..');
export const noms = ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'];
export function sources(ref = null) {
  if (!ref && process.env.SNAKE13_SOURCES) return JSON.parse(fs.readFileSync(process.env.SNAKE13_SOURCES, "utf8"));
  const files = ref ? execFileSync('git',['ls-tree','-r','--name-only',ref,'proto-neon/src/'],{cwd:path.dirname(ROOT),encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.js')).sort()
    : fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>'proto-neon/src/'+f);
  return files.map(f=>[path.basename(f),ref ? execFileSync('git',['show',ref+':'+f],{cwd:ROOT,encoding:'utf8'}) : fs.readFileSync(path.join(ROOT,'src',path.basename(f)),'utf8')]);
}
export function instrument(src, overrides = {}) {
  // Substitutions NUMÉRIQUES sur une copie en mémoire avant gel, sans modifier les pilotes/sources disque.
  const inject = `for (var chemin in ${JSON.stringify(overrides)}) { var cles=chemin.split('.'), obj=R; for(var i=0;i<cles.length-1;i++)obj=obj[cles[i]]; obj[cles[cles.length-1]]=${JSON.stringify(overrides)}[chemin]; }`;
  const joined = src.map(([name,s])=>'/* '+name+' */\n'+(name==='02-regles.js'?s.replace('  /* gel profond',inject+'\n  /* gel profond'):s)).join('\n');
  const script = new vm.Script('(function(){var N=window.__N;'+joined+'\n})();',{filename:'reglage.bundle.js'});
  const hash = crypto.createHash('sha256').update(joined).update(partie.toString()).update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
  return {hash, run(pilote,graine,{observer=true, width=844,height=390}={}) {
    const erreursConsole = [], stockage = new Map();
    const c = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    Object.assign(c, {console:{log(){},warn(){},error(...args){erreursConsole.push(args.map(String).join(' '));}},
      URL,URLSearchParams,location:{search:'?journal=1'},navigator:{maxTouchPoints:width===1440?0:1},
      innerWidth:width,innerHeight:height,requestAnimationFrame(){return 0;},cancelAnimationFrame(){},addEventListener(){},
      matchMedia:()=>({matches:false}),ART_SRC:{},CINE_DISPO:[],MUSIQUE_BASE:'musique/',MUSIQUE_EMBED:null,__N:{},
      __DT:1/60,__SEED:graine,
      localStorage:{clear(){stockage.clear();},getItem(k){return stockage.get(k)??null;},setItem(k,v){stockage.set(k,String(v));},removeItem(k){stockage.delete(k);}}});
    c.window=c; c.N=c.__N; script.runInContext(c);
    c.__S=c.__N.S;
    // Équivalent sans DOM des effets du boot nécessaires à la logique, aucun module remplacé.
    const N=c.__N,S=c.__S;
    N.reseed(graine); N.gfx.init(null); const r=N.gfx.resize(width,height);
    S.view.w=r.w;S.view.h=r.h;S.view.safe={l:0,t:0,r:0,b:0};
    N.intro.reset();N.game.reset(S.seed);
    c.opts={pilote,graine,observer};
    const result=vm.runInContext('('+partie.toString()+')(opts)',c);
    return JSON.parse(JSON.stringify({...result,erreursConsole}));
  }};
}

if (process.argv.includes('--valider')) {
  const src=sources('e1bdc6f'), banc=instrument(src), reference=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/pilotes/sortie.json')));
  const selection=reference.cas.filter(c=> c.graine===1 || (c.graine===2 && ['bon','expert'].includes(c.pilote)));
  const cas=[];
  for (const attendu of selection) {
    const debut=Date.now(), mesure=banc.run(attendu.pilote,attendu.graine,{observer:true});
    const egal=['tempsJeu','vague','score','tempsCombat','tempsSimule'].every(k=>mesure[k]===attendu[k]);
    cas.push({pilote:attendu.pilote,graine:attendu.graine,egal,attendu:Object.fromEntries(['tempsJeu','vague','score','tempsCombat','tempsSimule'].map(k=>[k,attendu[k]])),mesure,calculMs:Date.now()-debut});
    console.log(JSON.stringify({pilote:mesure.pilote,graine:mesure.graine,egal,t:mesure.tempsJeu,score:mesure.score,calculMs:Date.now()-debut}));
  }
  const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),ref:'e1bdc6f',hash:banc.hash,conforme:cas.length>=10&&cas.every(c=>c.egal&&!c.mesure.err&&!c.mesure.erreursConsole.length),cas};
  fs.writeFileSync(path.join(ICI,'validation-vm.json'),JSON.stringify(sortie,null,2)+'\n');
  if(!sortie.conforme)process.exitCode=1;
}
