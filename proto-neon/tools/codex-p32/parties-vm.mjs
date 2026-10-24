import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {sources,partie} from './vm.mjs';
const H=new URL('./',import.meta.url),avant=process.argv.includes('--avant');
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
const src=avant?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources();
fs.mkdirSync(new URL('journaux/',H),{recursive:true});
const sortie={r06:[],dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas:[]};
const file=new URL(avant?'parties-avant.json':'parties-apres.json',H),save=()=>fs.writeFileSync(file,JSON.stringify(sortie,null,2)+'\n');
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
 const r=partie(src,pilote,graine);
 const app=r.journal.filter(x=>x.type==='apparition'),arm=r.journal.filter(x=>x.type==='armement');
 const dansVue=app.filter(({d})=>d.vue&&d.x>=d.vue.x&&d.x<=d.vue.x+d.vue.w&&d.y>=d.vue.y&&d.y<=d.vue.y+d.vue.h);
 sortie.r06.push({pilote,graine,apparitions:app.length,sansVue:app.filter(x=>!x.d.vue).length,dansVue:dansVue.length,armements:arm.length,horsVue:arm.filter(x=>x.d.shown===false).length,exemples:dansVue.slice(0,5)});
 fs.writeFileSync(new URL('journaux/'+(avant?'avant':'apres')+'-'+pilote+'-'+graine+'.json.gz',H),zlib.gzipSync(JSON.stringify(r.journal)));
 delete r.journal;sortie.cas.push(r);save();console.log(pilote,graine,r.tempsJeu,r.vague,r.score,r.raison);
}
if(!avant){const before=JSON.parse(fs.readFileSync(new URL('parties-avant.json',H)));sortie.comparaison=sortie.cas.map((r,i)=>({pilote:r.pilote,graine:r.graine,differences:Object.keys(r).filter(k=>JSON.stringify(r[k])!==JSON.stringify(before.cas[i][k]))}));sortie.identiques=sortie.comparaison.filter(r=>!r.differences.length).length;save();if(sortie.identiques!==80)process.exitCode=1;}
