// Aucun réseau, aucune écriture hors tools/codex-p34, aucune règle changée.
// node tools/codex-p34/mesurer.mjs valider | actuel | avant-p14
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sources, compiler, monde } from '../codex-p14/vm.mjs';
import { partie } from '../reglage/protocole.mjs';
import { analyser, bilan } from '../reglage/analyse.mjs';
export const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE,'../..');
export const hash = x => crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export const date = () => new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
export const save = (name,x) => fs.writeFileSync(path.join(HERE,name),JSON.stringify(x,null,2)+'\n');
const mode=process.argv[2];
fs.mkdirSync(path.join(HERE,'recus'),{recursive:true});
let src;
if(mode==='valider') src=sources('e1bdc6f');
else if(fs.existsSync(path.join(HERE,'sources-recues.json.gz'))) src=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,'sources-recues.json.gz'))));
else {src=sources();fs.writeFileSync(path.join(HERE,'sources-recues.json.gz'),zlib.gzipSync(JSON.stringify(src)));}
const shaRecu=hash(src);
if(mode==='avant-p14') src=src.map(([f,s])=>[f,f==='85-pilote.js'?fs.readFileSync(path.join(ROOT,'tools/codex-p14/avant-src/85-pilote.js'),'utf8'):s]);
const sha=hash(src), script=compiler(src);
const champs=['tempsJeu','tempsCombat','tempsSimule','vague','score'];
// Protocole p5 inchangé ; enveloppe de lecture des échantillons après chaque tranche.
// Les simulations et les décisions des pilotes sont celles des vraies sources.
function jouer(pilote,graine,observer=true){
  const m=monde(script,graine),{N,S,c}=m;
  const initial={monde:{...S.monde},player:{x:S.player.x,y:S.player.y,ang:S.player.ang,vit:S.player.vit},view:{...S.view}};
  const samples=[],original=N.game.dbg.simuler;
  N.game.dbg.simuler=function(...a){const r=original.apply(this,a);samples.push({t:N.horloge.t(),etat:N.game.etat(),vague:N.dir.vague(),len:S.player.len,vies:N.score.vies,vivants:N.ennemis.count(),score:N.score.score});return r;};
  c.opts={pilote,graine,observer};
  const r=vm.runInContext('('+partie.toString()+')(opts)',c);
  N.game.dbg.simuler=original;
  return JSON.parse(JSON.stringify({...r,initial,echantillons:samples,erreursConsole:m.erreurs}));
}
if(mode==='valider'){
  const reference=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/pilotes/sortie.json')));
  const selected=reference.cas.filter(c=>c.graine===1||c.graine===2&&['bon','expert'].includes(c.pilote));
  const cas=[];
  for(const a of selected){const r=jouer(a.pilote,a.graine);const egal=champs.every(k=>r[k]===a[k]);
    const recu='recus/validation-'+a.pilote+'-'+a.graine+'.json.gz';fs.writeFileSync(path.join(HERE,recu),zlib.gzipSync(JSON.stringify(r)));
    cas.push({pilote:a.pilote,graine:a.graine,attendu:Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu:Object.fromEntries(champs.map(k=>[k,r[k]])),egal,err:r.err,erreursConsole:r.erreursConsole,recu});console.log(JSON.stringify(cas.at(-1)));}
  const conforme=cas.length>=10&&cas.every(c=>c.egal&&!c.err&&!c.erreursConsole.length);
  save('validation-vm.json',{dateParis:date(),ref:'e1bdc6f',sourceSha256:sha,referenceSha256:hash(reference),champs,conforme,cas});
  if(!conforme)process.exitCode=1;
}else if(['actuel','avant-p14'].includes(mode)){
  const validation=JSON.parse(fs.readFileSync(path.join(HERE,'validation-vm.json')));if(!validation.conforme)throw Error('VM non validée');
  const pilotes=mode==='actuel'?['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']:['humain','bon','expert'];
  const cas=[],debut=Date.now();
  const result={dateParis:date(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),mode,sourceSha256:sha,sourceRecueSha256:shaRecu,description:mode==='actuel'?'Sources reçues inchangées':'Contrefactuel : seul 85-pilote.js est remplacé EN MÉMOIRE par avant-p14 ; aucun fichier src modifié',graines:10,cas};
  const sauver=()=>{result.resume=bilan(cas);result.calculMs=Date.now()-debut;save(mode+'.json',result);};
  // Un processus de courte durée par pilote ; aucun calcul concurrent.
  if(!process.env.P34_WORKER){
    for(const pilote of pilotes)execFileSync(process.execPath,[new URL(import.meta.url).pathname,mode],{env:{...process.env,P34_WORKER:pilote},stdio:'inherit'});
    for(const pilote of pilotes)for(let graine=1;graine<=10;graine++){const recu='recus/'+sha.slice(0,16)+'-'+pilote+'-'+graine+'.json.gz';const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,recu))));cas.push({...analyser(r),recu});}
    result.complete=cas.length===pilotes.length*10;result.censures=cas.filter(c=>!c.fin);sauver();
  }else{
    const pilote=process.env.P34_WORKER;
    for(let graine=1;graine<=10;graine++){
      const file=path.join(HERE,'recus',sha.slice(0,16)+'-'+pilote+'-'+graine+'.json.gz');
      const r=fs.existsSync(file)?JSON.parse(zlib.gunzipSync(fs.readFileSync(file))):jouer(pilote,graine,pilote==='bon');
      if(!fs.existsSync(file))fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(r)));
      console.log(JSON.stringify({mode,pilote,graine,t:r.tempsJeu,score:r.score,raison:r.raison,err:r.err,console:r.erreursConsole.length,ms:Date.now()-debut}));
      if(r.err||r.erreursConsole.length||!['fin','borne'].includes(r.raison))throw Error('Erreur VM dans '+file);
    }
  }
}else throw Error('Mode attendu : valider | actuel | avant-p14');
