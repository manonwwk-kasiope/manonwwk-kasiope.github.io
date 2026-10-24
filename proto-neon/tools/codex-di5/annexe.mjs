import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {dossierSynthetique} from '../jury2/tests-jury.mjs';import {construirePaquet} from '../jury2/jure.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'di5-annexe-'));
try{
 const dossier=dossierSynthetique(tmp),manFile=path.join(dossier,'manifeste.json'),man=JSON.parse(fs.readFileSync(manFile));
 for(const c of man.cas){c.mesures.R13={flashs:13,maxParSeconde:13,conforme:false,seuil:3};const file=path.join(dossier,c.dossier,'brut.json.gz');let data=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));data.frames.forEach((f,i)=>{Object.assign(f,{up:i<8&&i%2===0?1:0,dn:i<8&&i%2?1:0,rin:0,rout:0});delete f.r13;});fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(data)));}fs.writeFileSync(manFile,JSON.stringify(man));
 const r=await construirePaquet({dossier,role:'etalonnage-temoin',sortie:path.join(tmp,'sortie'),cles:path.join(tmp,'cles'),sansCanaris:false,code:'J-di5controle',graineTirage:'r13'});
 const annexe=JSON.parse(fs.readFileSync(path.join(r.racine,'annexe/annexe.json')));let n=0;
 for(const s of Object.values(annexe.sequences)){const m=s.mesures.R13;assert.equal(m.statut,'non qualifiable (fractions sans recouvrement spatial)');assert.equal(m.conforme,null);assert.equal(m.maxParSeconde,null);assert.match(m.borneSuperieureNonProbante.libelle,/non probante/);n++;}
 fs.writeFileSync(path.join(HERE,'annexe-controle.json'),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),reussi:true,sequences:n,mesures:Object.values(annexe.sequences).map(s=>s.mesures.R13)},null,2)+'\n');console.log('Annexe réelle montée : '+n+' séquences historiques non qualifiables.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
