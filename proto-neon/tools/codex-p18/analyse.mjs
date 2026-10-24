import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export const mediane=a=>{a=[...a].sort((x,y)=>x-y);return a.length%2?a[a.length>>1]:(a[a.length/2-1]+a[a.length/2])/2;};
export function decompose(r){
 const s={kills:0,multiplicateur:0,defiHistorique:0,defisVague:0,defisP12:r.resume?.primesDefis||0,lasso:0,apogee:0,temps:0,cellules:0,noyaux:0,vagues:0,cyclope:0,autres:0,continuite:0,survie:0,risque:0};
 for(const p of r.points){
  if(p.source&&p.source!=='combat'){s[p.source]=(s[p.source]||0)+p.pts;continue;}
  if(p.appel.includes('defiOk'))s.defiHistorique+=p.pts;
  else if(p.appel.includes('dvOk'))s.defisVague+=p.pts;
  else if(p.evt?.type==='kill'){
   const c=p.evt.c,src=c.src?.type,key=src==='lasso'?'lasso':src==='apogee'?'apogee':'kills';
   s[key]+=Math.min(p.pts,c.base);s.multiplicateur+=Math.max(0,Math.min(p.pts,c.base*p.mult)-c.base);
   s[c.boss?'cyclope':'autres']+=Math.max(0,p.pts-c.base*p.mult);
  }else if(p.evt?.type==='ramassage')s[p.evt.c.type==='cellule'?'cellules':'noyaux']+=p.pts;
  else if(p.evt?.type==='vague')s.vagues+=p.pts;
  else s.autres+=p.pts;
 }
 return {...s,total:Object.values(s).reduce((a,b)=>a+b,0),score:r.score,ecart:r.score-Object.values(s).reduce((a,b)=>a+b,0)};
}
export function bilan(cas){
 const pilotes={};
 for(const p of ['bon','kamikaze','tourneur']){
  const a=cas.filter(r=>r.pilote===p),decomp=a.map(decompose),sources={};
  for(const k of Object.keys(decomp[0]||{}))sources[k]={moyenne:decomp.reduce((s,x)=>s+x[k],0)/a.length,mediane:mediane(decomp.map(x=>x[k]))};
  pilotes[p]={n:a.length,scoreMedian:mediane(a.map(x=>x.score)),tempsMedian:mediane(a.map(x=>x.tempsJeu)),sources};
 }
 return {pilotes,bonKamikaze:pilotes.bon.scoreMedian/pilotes.kamikaze.scoreMedian,tourneurBon:pilotes.tourneur.scoreMedian/pilotes.bon.scoreMedian};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const etats={};for(const mode of ['avant','apres'])if(fs.existsSync(path.join(DIR,mode+'.json'))){const r=JSON.parse(fs.readFileSync(path.join(DIR,mode+'.json')));etats[mode]=bilan(r.cas);}
 fs.writeFileSync(path.join(DIR,'bilan.json'),JSON.stringify(etats,null,2)+'\n');
 console.log(JSON.stringify(etats,null,2));
}
