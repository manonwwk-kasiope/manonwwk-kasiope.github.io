// node tools/reglage/banc.mjs --serie baseline --graines 20
// node tools/reglage/banc.mjs --sensibilite ; --config tools/reglage/passe-1.json --serie passe-1
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {instrument,sources,ICI,noms} from './vm.mjs';
import {analyser,bilan} from './analyse.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1];};
const n=+arg('--graines',20),serie=arg('--serie','baseline'),config=arg('--config',null);
const validation=JSON.parse(fs.readFileSync(path.join(ICI,'validation-vm.json')));
if(!validation.conforme)throw new Error('VM non validée : aucun verdict permis');
const src=sources(), ref=sources('e1bdc6f');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:path.resolve(ICI,'../..'),encoding:'utf8'}).trim();
const srcHash=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
const analyseHash=crypto.createHash('sha256').update(fs.readFileSync(new URL('./analyse.mjs',import.meta.url))).digest('hex');
const series=[{nom:serie,overrides:config?JSON.parse(fs.readFileSync(config)).valeurs:{}}];
if(process.argv.includes('--sensibilite')){
  series.length=0;
  const groupes={
    plafondV1:{'secteurs.0.vagues.0.plafond':10},plafondV2:{'secteurs.0.vagues.1.plafond':16},
    quotaV2:{'secteurs.0.vagues.1.quota':48},
    approcheFleches:{'ennemis.fleche.approche.0':50,'ennemis.fleche.approche.1':70,'secteurs.0.vitessesFleches.0':50,'secteurs.0.vitessesFleches.1':55,'secteurs.0.vitessesFleches.2':60,'secteurs.0.vitessesFleches.3':65,'secteurs.0.vitessesFleches.4':70},
    fermetureTraine:{'lasso.fermetureTraine':7},traineBase:{'lasso.traine.base':1.2},
    pvCyclope:{'colosse.pvPhase':1500,'colosse.pvTotal':4500},
    dureesVagues:{'secteurs.0.vagues.0.duree':22,'secteurs.0.vagues.1.duree':42,'secteurs.0.vagues.2.duree':44,'secteurs.0.vagues.3.duree':48,'secteurs.0.vagues.4.duree':50}
  };
  const contexte={window:{__N:{}}};
  vm.runInNewContext(src.find(([nom])=>nom==='02-regles.js')[1],contexte);
  const actuel=contexte.window.__N.R;
  for(const groupe of Object.values(groupes))for(const k of Object.keys(groupe))groupe[k]=k.split('.').reduce((o,c)=>o[c],actuel);
  for(const [nom,base] of Object.entries(groupes))for(const facteur of [.8,1.2]){
    const overrides=Object.fromEntries(Object.entries(base).map(([k,v])=>[k, /plafond|quota/.test(k)?Math.round(v*facteur):Math.round(v*facteur*100)/100]));
    series.push({nom:nom+(facteur<1?'-moins':'-plus'),base,facteur,overrides});
  }
}
const filtre=arg('--variante',null);
fs.mkdirSync(path.join(ICI,'recus'),{recursive:true});
for(const spec of series.filter(s=>!filtre||s.nom===filtre)){
  const banc=instrument(src,spec.overrides), cas=[], debut=Date.now();
  const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceHead:head,sourceSha256:srcHash,analyseSha256:analyseHash,
    sourcesIdentiquesReference:JSON.stringify(src)===JSON.stringify(ref),instrumentSha256:banc.hash,graines:n,spec,cas};
  const sauver=()=>{sortie.resume=bilan(cas);sortie.calculMs=Date.now()-debut;const f=path.join(ICI,spec.nom+'.json');fs.writeFileSync(f+'.tmp',JSON.stringify(sortie,null,2)+'\n');fs.renameSync(f+'.tmp',f);};
  for(const pilote of noms){
    // Exécution série, un seul processus de calcul actif ; cache identique, même code de simulation.
    execFileSync(process.execPath,[path.join(ICI,'worker.mjs'),pilote,String(n),JSON.stringify(spec.overrides)],{stdio:'inherit'});
    for(let graine=1;graine<=n;graine++){
      const fichier=path.join(ICI,'recus',banc.hash.slice(0,16)+'-'+pilote+'-'+graine+'.json.gz');
      let r;
      if(fs.existsSync(fichier))r=JSON.parse(zlib.gunzipSync(fs.readFileSync(fichier)));
      else throw new Error('Reçu manquant après le worker : '+fichier);
      cas.push({...analyser(r),recu:path.relative(ICI,fichier)});sauver();
      if((!r.fin&&r.raison!=='borne')||r.err||r.erreursConsole.length)throw new Error(JSON.stringify({pilote,graine,raison:r.raison,err:r.err,console:r.erreursConsole}));
    }
    console.log(JSON.stringify({serie:spec.nom,pilote,graines:n,resume:sortie.resume.pilotes[pilote],ecouleMs:Date.now()-debut}));
  }
  sortie.complete=cas.length===n*noms.length;
  sortie.conformeTechnique=sortie.complete&&cas.every(c=>c.fin&&!c.err&&!c.erreursConsole.length);
  sortie.censures=cas.filter(c=>!c.fin).map(c=>({pilote:c.pilote,graine:c.graine,temps:c.temps,raison:c.raison,recu:c.recu}));sauver();
  if(!sortie.conformeTechnique)process.exitCode=1;
  console.log(JSON.stringify({serie:spec.nom,complete:sortie.complete,nbB:sortie.resume.nbB,B:sortie.resume.B,ms:sortie.calculMs}));
}
