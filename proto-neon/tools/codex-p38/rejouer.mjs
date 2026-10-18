// Vraie frame de 90-boot et vrai raster indexé de 10-gfx. Sans DOM ni Canvas/CRT.
import vm from 'node:vm';
import crypto from 'node:crypto';
import {monde} from './vm.mjs';
import {installerRAF,amorcerPartie,jouerControle} from '../codex-p16/raf-controle.mjs';
export const sha=x=>crypto.createHash('sha256').update(typeof x==='string'||ArrayBuffer.isView(x)?x:JSON.stringify(x)).digest('hex');
const exclus=['perf','vue','sfx','bloc','section','geste','hudBanniere','flash'];
export const jeu=(J,T=60)=>J.filter(e=>e.t<=T&&!exclus.includes(e.type));
export function comparer(a,b) {
  for(let i=0;i<Math.min(a.length,b.length);i++) if(JSON.stringify([a[i].pas,a[i].type,a[i].d])!==JSON.stringify([b[i].pas,b[i].type,b[i].d]))
    return {egaux:false,premier:i,dessine:a[i],simule:b[i],longueurs:[a.length,b.length]};
  return {egaux:a.length===b.length,premier:a.length===b.length?-1:Math.min(a.length,b.length),longueurs:[a.length,b.length],dessine:a[b.length],simule:b[a.length]};
}
export function rejouer(src,{graine=7,width=844,height=390,simulation=false,T=60}={}) {
  const m=monde(src,width,height),{c,N}=m;c.__DT=1/60;
  vm.runInContext('('+installerRAF.toString()+')()',c);
  // frame est exposée par la fermeture identique à celle du build (vm.mjs).
  c.requestAnimationFrame(c.frame);N.reseed(graine);N.game.reset(graine);
  c.cfg={graine};const debut=vm.runInContext('('+amorcerPartie.toString()+')(cfg)',c);
  c.cfg={T,simulation,dessiner:!simulation};const r=vm.runInContext('('+jouerControle.toString()+')(cfg)',c);
  const pixels=N.gfx.buf(),histogramme=Array(16).fill(0);let horsPalette=0;
  for(const p of pixels) {if(p<16)histogramme[p]++;else horsPalette++;}
  return {...JSON.parse(JSON.stringify(r)),debut,console:m.erreurs,pixels:{w:N.gfx.W,h:N.gfx.H,sha256:sha(pixels),histogramme,horsPalette},horloge:N.horloge.etat(),camera:JSON.parse(JSON.stringify(N.S.vue))};
}
