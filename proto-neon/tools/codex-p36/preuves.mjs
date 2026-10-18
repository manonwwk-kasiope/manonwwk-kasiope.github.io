// Relecture pure des reçus Chromium : aucun serveur, navigateur, réseau ou simulation.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {resumer,mediane,medianeFins,ciblesR04,PILOTES} from '../mesure/parties.mjs';
import {analyser,bilan} from '../reglage/analyse.mjs';
import {Resultat} from '../mesure/commun.mjs';
export const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
export const RECUS=process.env.SNAKE_P36_RECUS||'/Users/manonwojciechowski/Projets/wt-snake/recus/batterie-318ce61';
export const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export const save=(n,x)=>fs.writeFileSync(path.join(HERE,n),JSON.stringify(x,null,2)+'\n');
const url=f=>pathToFileURL(path.join(ROOT,f)).href;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
export async function instrument(critere,avant=false){
 const f=critere==='R-04'&&avant?'tools/codex-p36/avant/R-04-difficulte.mjs':`tools/mesure/criteres/${{'R-04':'R-04-difficulte','R-15':'R-15-rythme','R-34':'R-34-lasso'}[critere]}.mjs`;
 const s=fs.readFileSync(path.join(ROOT,f),'utf8').replaceAll("'../commun.mjs'",JSON.stringify(url('tools/mesure/commun.mjs'))).replaceAll("'../parties.mjs'",JSON.stringify(url(avant?'tools/codex-p36/avant/parties.mjs':'tools/mesure/parties.mjs')));
 return import(data(s));
}
export function chargerRecus(){
 const out=[];
 for(const pilote of PILOTES)for(let graine=1;graine<=5;graine++){
  const noms=fs.readdirSync(path.join(RECUS,'parties')).filter(f=>f.includes(`_paysage_${pilote}_-_${graine}_`)&&f.endsWith('_20261017_-.json.gz'));
  assert.equal(noms.length,1,`Un seul reçu attendu : ${pilote}/${graine}`);
  const f=path.join(RECUS,'parties',noms[0]),bytes=fs.readFileSync(f),p=JSON.parse(zlib.gunzipSync(bytes));
  assert.equal(p.params.pilote,pilote);assert.equal(p.params.graine,graine);
  out.push({pilote,graine,p,f,sha256:sha(bytes)});
 }
 return out;
}
/* Adaptateur du banc : ses sessions renvoient les observations déjà reçues,
   sans exécuter la fonction navigateur. Le vrai mesurer et le vrai lot s'exécutent. */
export async function relireCritere(critere,recus,avant=false){
 const mod=await instrument(critere,avant),res=new Resultat(mod.meta);
 const banc={empreinte:'relecture-318ce61',instrument:'codex-p36',sortie:HERE,o:{cache:false},graines:()=>[1,2,3,4,5],
  async ouvrir(){let dernier;return {absents:async()=>[],eval:async(_fn,o)=>{dernier=recus.find(x=>x.pilote===o.pilote&&x.graine===o.graine);assert.ok(dernier,'Reçu absent');return structuredClone(dernier.p);},bilanErreurs:async()=>structuredClone(dernier.p.erreurs),fermer:async()=>{}};}};
 await mod.mesurer(banc,res);return res.bilan();
}
export function versBanc(p){
 return {pilote:p.params.pilote,graine:p.params.graine,journal:p.journal,trace:p.echantillons.map(e=>({t:e.t,reel:e.reel,n:e.vague,e:e.etat,vivants:e.vivants,tirs:e.tirs})),
  fin:p.raison==='fin',raison:p.raison,tempsJeu:p.fin.t,score:p.fin.score,vague:p.echantillons.at(-1)?.vague,
  err:p.erreurs.err??p.fin.err?.count??0,erreursConsole:[...(p.erreurs.console||[]),...(p.erreurs.pageErreurs||[])],tirsAvantV2:p.journal.filter(e=>e.type==='tirEnnemi'&&e.t<(p.journal.find(v=>v.type==='vague'&&v.d.evt==='entree'&&v.d.n===2)?.t??Infinity))};
}
export async function verifierStatique(){
 const recus=chargerRecus(),ancien=await import(url('tools/codex-p36/avant/parties.mjs'));
 // Les archives sont intactes et le résumé avant est bien celui de la batterie.
 assert.equal(fs.readFileSync(path.join(HERE,'avant/parties.mjs'),'utf8'),execFileSync('git',['show','318ce61:proto-neon/tools/mesure/parties.mjs'],{cwd:ROOT,encoding:'utf8'}));
 const cas=recus.map(({p,...provenance})=>{
  const avant=ancien.resumer(p),apres=resumer(p),raw=versBanc(p),banc=analyser(raw);
  assert.equal(apres.cyclopeAtteint,p.journal.some(e=>e.type==='phase'&&e.d.evt==='arrivee'));
  assert.equal(banc.atteint,apres.cyclopeAtteint);assert.equal(banc.battu,apres.victoire);assert.equal(banc.combat,apres.combatCyclope);
  assert.deepEqual(banc.premiereMort,apres.premiereMort);
  assert.equal(p.erreurs.zero,true,'Erreurs historiques');
  return {...provenance,avant:{atteint:avant.cyclopeAtteint,gameOver:avant.gameOver,premiereMort:avant.premiereMort,combat:avant.combatCyclope},apres:{atteint:apres.cyclopeAtteint,fin:apres.finPartie,premiereMort:apres.premiereMort,combat:apres.combatCyclope,combatJusquaVictoire:apres.combatCyclopeJusquaVictoire},victoire:apres.victoire,duree:apres.duree};
 });
 const r04Avant=await relireCritere('R-04',recus,true),r04Apres=await relireCritere('R-04',recus);
 const original=JSON.parse(fs.readFileSync(path.join(RECUS,'R-04.json')));
 assert.deepEqual(r04Avant.mesures,original.mesures,'R-04 avant doit reproduire chaque mesure publiée');
 const autres={};for(const id of ['R-15','R-34']){const a=await relireCritere(id,recus,true),b=await relireCritere(id,recus);assert.deepEqual(a.mesures,b.mesures,`${id} changé`);assert.deepEqual(a.mesures,JSON.parse(fs.readFileSync(path.join(RECUS,id+'.json'))).mesures,`${id} différent du reçu publié`);autres[id]=b;}
 const groupes={};for(const pilote of PILOTES){const l=recus.filter(x=>x.pilote===pilote).map(x=>resumer(x.p));const b=bilan(recus.filter(x=>x.pilote===pilote).map(x=>analyser(versBanc(x.p))));
  assert.equal(b.pilotes[pilote].mediane,medianeFins(l));
  groupes[pilote]={n:l.length,arriveesAvant:cas.filter(c=>c.pilote===pilote&&c.avant.atteint).length,arriveesApres:l.filter(r=>r.cyclopeAtteint).length,victoires:l.filter(r=>r.victoire).length,medianeDefaites:mediane(l.map(r=>r.gameOver)),medianeFins:medianeFins(l),morts:l.map(r=>r.premiereMort),zeroErreur:l.every(r=>r.erreurs.zero)};
 }
 save('relecture-318ce61.json',{dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),provenance:'40 reçus Chromium existants ; aucune partie simulée ici',cas,groupes,zeroErreur:true});
 save('R-04-avant.json',r04Avant);save('R-04-apres.json',r04Apres);save('criteres-inchanges.json',autres);
 return {recus,cas,groupes,r04Avant,r04Apres,autres};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=await verifierStatique();console.log(JSON.stringify({recus:r.cas.length,groupes:r.groupes,R04:r.r04Apres.resume}));}
