// Aucun réseau ni DOM. Une seule simulation à la fois, reçus liés aux sources et au protocole.
// node tools/codex-p37/mesurer.mjs figer | valider | avant | apres | synthese
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sources, compiler, monde } from '../codex-p14/vm.mjs';
export const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'../..');
export const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export const date=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
export const save=(f,x)=>fs.writeFileSync(path.join(HERE,f),JSON.stringify(x,null,2)+'\n');
export const read=f=>JSON.parse(fs.readFileSync(path.join(HERE,f)));
export const snap=f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,f))));
export const pack=(f,x)=>fs.writeFileSync(path.join(HERE,f),zlib.gzipSync(JSON.stringify(x)));
// Même protocole que tools/pilotes/parties.mjs. Le crochet observe la SORTIE d'entrée,
// avant sa consommation par le jeu ; aucune décision n'est remplacée.
export function partie({pilote,graine,maxT=540,observer=true}){
 const N=window.__N,S=window.__S;
 localStorage.clear();S.jour=20261017;if(S.reglages)S.reglages.actions=pilote==='humain'?'auto':'doigts';
 N.intro.skip();N.game.reset(graine,{depart:'plongee'});
 if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
 N.pilote.lancer(pilote);if(pilote==='dieu')N.game.dbg.god(true);
 N.journal.actif(true);
 const hook=window.__PILOT, sorties={pouvoir:[],apogee:[],boost:[],magMax:0};
 if(observer)window.__PILOT=function(...args){hook.apply(this,args);const i=S.input;
   const o={pas:N.horloge.pas(),t:N.horloge.t(),etat:N.game.etat()};
   for(const k of ['pouvoir','apogee','boost'])if(i[k])sorties[k].push(o);
   sorties.magMax=Math.max(sorties.magMax,i.mag);
 };
 N.horloge.avancer();let reel=0,stagnant=0,last='',raison='borne';
 while(N.horloge.t()<maxT&&reel<maxT*4){
  if(N.game.etat()==='fin'){raison='fin';break;}
  N.game.dbg.simuler(0.25);reel+=0.25;
  const utile=[N.game.etat(),N.horloge.t(),S.ecran?.depuis,S.vol?.t].join('|');
  stagnant=utile===last?stagnant+0.25:0;last=utile;
  if(stagnant>10){raison='bloque:'+N.game.etat();break;}if(window.__ERR.count){raison='erreur';break;}
 }
 if(observer)window.__PILOT=hook;
 if(N.game.etat()==='fin')raison='fin';
 const d=N.game.dbg(),journal=N.journal.dump();
 return {pilote,graine,raison,etat:N.game.etat(),tempsJeu:N.horloge.t(),tempsCombat:d.t,tempsSimule:reel,
   pas:N.horloge.pas(),vague:d.vague,score:d.score,err:window.__ERR.count,erreurs:window.__ERR.sigs,journal,sorties};
}
export function jouer(script,pilote,graine,observer=true){
 const m=monde(script,graine);m.c.opts={pilote,graine,observer};
 const r=vm.runInContext('('+partie.toString()+')(opts)',m.c);
 return JSON.parse(JSON.stringify({...r,erreursConsole:m.erreurs}));
}
const mode=process.argv[2];
if(mode==='figer'){
 if(fs.existsSync(path.join(HERE,'sources-avant.json.gz')))throw Error('Instantané déjà présent');
 pack('sources-avant.json.gz',sources());
 save('reprise.json',{dateParis:date(),objectif:'Rétablir uniquement la politique humain du contrat pilotes §4–5',etat:'Sources reçues figées ; VM à valider, puis 120 parties avant et 120 après ; conformité et navigateur prêt sans exécution',budget:'10 calibrations + 240 parties + scènes de conformité ; aucun réglage itératif de difficulté',arret:'VM divergente, erreur réelle ou garde du protocole ; seuils inchangés',prochaineAction:'valider'});
}else if(mode==='valider'){
 const src=sources('e1bdc6f'),script=compiler(src),ref=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/pilotes/sortie.json')));
 const cas=[],champs=['tempsJeu','tempsCombat','tempsSimule','vague','score'];
 for(const a of ref.cas.filter(c=>c.graine===1||c.graine===2&&['bon','expert'].includes(c.pilote))){
  const r=jouer(script,a.pilote,a.graine),attendu=Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu=Object.fromEntries(champs.map(k=>[k,r[k]]));
  cas.push({pilote:a.pilote,graine:a.graine,attendu,obtenu,identique:champs.every(k=>r[k]===a[k])&&r.etat==='fin'&&!r.err&&!r.erreursConsole.length});
  console.log(JSON.stringify(cas.at(-1)));
 }
 save('validation-vm.json',{dateParis:date(),ref:'e1bdc6f',sourceSha256:hash(src),referenceSha256:hash(ref),conforme:cas.length>=10&&cas.every(c=>c.identique),cas});
 if(!cas.every(c=>c.identique))process.exitCode=1;
}else if(mode==='avant'||mode==='apres'){
 if(!read('validation-vm.json').conforme)throw Error('VM non validée');
 const src=mode==='avant'?snap('sources-avant.json.gz'):sources();
 if(mode==='apres')pack('sources-apres.json.gz',src);
 const sha=hash(src),script=compiler(src),protocole=hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8'));
 fs.mkdirSync(path.join(HERE,'recus'),{recursive:true});
 const noms=['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'],cas=[],debut=Date.now();
 for(const pilote of noms)for(let graine=1;graine<=(pilote==='humain'?50:10);graine++){
  const f=`recus/${sha.slice(0,16)}-${protocole.slice(0,12)}-${pilote}-${graine}.json.gz`;
  const r=fs.existsSync(path.join(HERE,f))?snap(f):jouer(script,pilote,graine);
  if(!fs.existsSync(path.join(HERE,f)))pack(f,r);
  if(r.err||r.erreursConsole.length||!['fin','borne'].includes(r.raison))throw Error('Erreur VM : '+f);
  const {journal,sorties,...resume}=r;
  cas.push({...resume,journalSha256:hash(journal),sortiesSha256:hash(sorties),recu:f});
  save(mode+'.json',{dateParis:date(),sourceSha256:sha,protocoleSha256:protocole,calculMs:Date.now()-debut,complete:cas.length===120,cas});
  console.log(JSON.stringify({mode,pilote,graine,t:r.tempsJeu,vague:r.vague,score:r.score,err:r.err,raison:r.raison}));
 }
}else if(mode==='synthese')import('./analyser.mjs');
