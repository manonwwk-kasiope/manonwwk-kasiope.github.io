// Assemblage des reçus complets déjà produits. Aucun pas de jeu exécuté.
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const here=new URL('./',import.meta.url),manifeste=JSON.parse(fs.readFileSync(new URL('manifeste.json',here)));
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),methode:'Assemblage sans rejeu des paires complètes ; mêmes empreintes sources, protocole officiel, y compris pré-calculs dieu et expert 6–10.',sources:{avant:manifeste.sourcesSha256,apres:manifeste.candidateSha256},cas:[]};
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
  const cas={pilote,graine};let incomplet=false;
  for(const phase of ['avant','apres']){
    const fichier=`parties/${phase}-${pilote}-${graine}.json.gz`,u=new URL(fichier,here);
    if(!fs.existsSync(u)){incomplet=true;break;}
    let r;try{r=JSON.parse(zlib.gunzipSync(fs.readFileSync(u)));}catch{incomplet=true;break;}
    assert.equal(r.sourcesSha256,out.sources[phase],fichier);
    const {journal,sourcesSha256,...resume}=r;cas[phase]={...resume,fichier};
  }
  if(incomplet)continue;
  const sig=r=>JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='fichier')));
  cas.identique=sig(cas.avant)===sig(cas.apres);out.cas.push(cas);
}
out.identiques=out.cas.filter(c=>c.identique).length;out.collecteComplete=out.cas.length===80;
out.finiesSansErreur=out.cas.every(c=>[c.avant,c.apres].every(r=>r.raison==='fin'&&!r.err.count&&!r.erreursConsole.length));
fs.writeFileSync(new URL('parties80-assemble.json',here),JSON.stringify(out,null,2)+'\n');console.log({paires:out.cas.length,identiques:out.identiques,finiesSansErreur:out.finiesSansErreur});
