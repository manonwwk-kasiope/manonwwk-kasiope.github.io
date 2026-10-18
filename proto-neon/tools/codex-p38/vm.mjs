// Même fermeture que build.mjs, sans appel DOM à boot(). Le mode historique reste disponible dans vm.mjs.
import vm from 'node:vm';
export {sources,partie,ROOT} from './protocole-vm.mjs';
export function monde(src,width=844,height=390) {
  const erreurs=[],stockage=new Map();
  const c={Math,console:{log(){},warn(){},error(...a){erreurs.push(a.map(String).join(' '));}},URL,URLSearchParams,location:{search:'?journal=1'},navigator:{maxTouchPoints:width===1440?0:1},innerWidth:width,innerHeight:height,
    requestAnimationFrame(){},addEventListener(){},matchMedia:()=>({matches:false}),ART_SRC:{},CINE_DISPO:[],MUSIQUE_BASE:'musique/',MUSIQUE_EMBED:null,__N:{},
    localStorage:{getItem:k=>stockage.get(k)??null,setItem:(k,v)=>stockage.set(k,v),clear:()=>stockage.clear()}};
  c.window=c;c.N=c.__N;vm.createContext(c);
  vm.runInContext('"use strict";(function(){var N=window.__N;\n'+Object.values(src).join('\n')+'\nwindow.frame=frame;})();',c,{filename:'bundle-vm.js'});
  c.__S=c.__N.S;const dim=c.N.gfx.resize(width,height);c.N.S.view.w=dim.w;c.N.S.view.h=dim.h;c.N.S.phase='play';
  return {c,N:c.N,S:c.N.S,erreurs,stockage};
}
