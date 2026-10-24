// Contre-épreuve de fixture : position publique corrigée APRÈS spawn, AVANT hit.
// Aucun seuil changé. Les résultats officiels camera-*.json restent la référence R-12.
import fs from 'node:fs';
import {sources,ICI} from './vm.mjs';
import {preparer} from './mesures.mjs';
import {scenarioCamera,comparerCamera} from '../mesure/criteres/R-12-explosion.mjs';
const srcAvant=JSON.parse(fs.readFileSync(ICI+'/avant/sources.json'));
const texte=scenarioCamera.toString(),needle='cible.id = e ? e.id : null;';
const code=texte.replace(needle,'if(e){e.x=p.x+Math.cos(p.ang)*70;e.y=p.y+Math.sin(p.ang)*70;}\n'+needle);
if(code===texte)throw Error('Fixture introuvable');
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'diagnostic de placement ; ne remplace pas les zéros officiels, seuils inchangés',cas:[]};
for(const [phase,src] of [['avant',srcAvant],['apres',sources()]])for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(let index=0;index<4;index++){
 const m=preparer(src,{w,h});m.c.options={index};const a=JSON.parse(JSON.stringify(m.run('('+code+')(options)')));
 const n=preparer(src,{w,h});n.c.options={index,sansCoup:true,plan:a};const b=JSON.parse(JSON.stringify(n.run('('+code+')(options)'))),x=a[index],y=b[index];
 let k=0,best=0;for(const q of x.trace.filter(q=>q.f>x.imageCoup)){k=q.br>m.N.R.criteres.R12.brasier?k+1:0;best=Math.max(k,best);}
 const r={phase,profil,cible:x.cible,images:best,camera:comparerCamera(x,y),impact:x,temoin:y,console:[...m.erreurs,...n.erreurs]};out.cas.push(r);console.log(phase,profil,x.cible,best,r.camera.camera);
 fs.writeFileSync(ICI+'/placement-vm.json',JSON.stringify(out,null,2));global.gc?.();
}
