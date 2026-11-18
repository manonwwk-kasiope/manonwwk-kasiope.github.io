'use strict';
const fs=require('node:fs'),z=require('node:zlib'),path=require('node:path');
const from=name=>JSON.parse(z.gunzipSync(fs.readFileSync(path.join(__dirname,name+'.json.gz'))));
const sum=(a,k)=>a.reduce((v,r)=>v+r[k],0), win=r=>['won','cleared'].includes(r.status);
function select(a,geometry){
  return ['balises','maillage'].map(variant=>{
    const f=a.filter(r=>r.variant===variant&&r.read&&r.shield),experts=f.filter(r=>r.pilot==='expert');
    const stats=f.flatMap(r=>r.stats),proof=geometry.filter(g=>g.variant===variant);
    const solved=experts.filter(win).length/experts.length;
    const eligible=solved>=.8&&new Set(proof.map(g=>g.year+'/'+g.n)).size===50&&proof.every(g=>g.opening>0&&g.warning>=1.35);
    return {variant,eligible,expert:solved,rate:60*(sum(stats,'kills')+sum(stats,'evades'))/sum(stats,'seconds')};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.rate-a.rate);
}
if(require.main===module){const rank=select(from('cal'),require('./geometrie.json'));console.log(rank);
fs.writeFileSync(path.join(__dirname,'selection.json'),JSON.stringify(rank,null,2));}
module.exports={from,sum,win,select};
