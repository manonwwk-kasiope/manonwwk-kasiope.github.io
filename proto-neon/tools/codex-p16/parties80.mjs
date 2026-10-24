// Même protocole que pilotes/parties.mjs. Une tranche bloquée est publiée, jamais comptée comme partie finie.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {sources,monde} from './vm.mjs';
const phase=process.argv[2]||'avant', url=new URL('./',import.meta.url);
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',url))).valide)throw Error('VM non calibrée');
const src=phase==='avant'?JSON.parse(fs.readFileSync(new URL('sources-avant.json',url))):sources();
const fichier=new URL('parties-'+phase+'.json',url);
const precedents=fs.existsSync(fichier)?JSON.parse(fs.readFileSync(fichier)).cas:[];
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),phase,sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas:[]};
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']) for(let graine=1;graine<=10;graine++) {
  const cache=precedents.find(r=>r.pilote===pilote&&r.graine===graine&&r.raison==='fin');
  if(cache){out.cas.push(cache);continue;}
  const {c,N,S,erreurs}=monde(src);N.reseed(graine);N.game.reset(graine);
  c.localStorage.clear();S.jour=20261017;S.reglages.actions=pilote==='humain'?'auto':'doigts';
  N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote);if(pilote==='dieu')N.game.dbg.god(true);N.journal.actif(true);N.horloge.avancer();
  let reel=0,stagnant=0,last='',raison='borne',expiration=null;
  console.log('départ',pilote,graine);
  while(N.horloge.t()<540&&reel<2160) {
    if(N.game.etat()==='fin'){raison='fin';break;}
    try{vm.runInContext('N.game.dbg.simuler(0.25)',c,{timeout:2000});}
    catch(e){raison='expiration VM';expiration=String(e.stack||e);break;}
    reel+=.25;if(reel%30===0)console.log('progression',pilote,graine,reel,N.horloge.t(),N.game.etat());
    const utile=[N.game.etat(),N.horloge.t(),S.ecran?.depuis,S.vol?.t].join('|');
    stagnant=utile===last?stagnant+.25:0;last=utile;
    if(stagnant>10){raison='bloque:'+N.game.etat();break;}if(c.__ERR.count){raison='erreur';break;}
  }
  if(N.game.etat()==='fin')raison='fin';
  const d=N.game.dbg(),J=N.journal.dump();
  const r={pilote,graine,raison,tempsJeu:N.horloge.t(),vague:N.dir.vague(),score:N.score.score,err:c.__ERR.count,tempsCombat:d.t,journalSha256:crypto.createHash('sha256').update(JSON.stringify(J)).digest('hex'),erreursConsole:erreurs};
  if(expiration){r.expiration=expiration;r.dernierJournal=J.slice(-20);r.etat=N.game.etat();}
  out.cas.push(r);fs.writeFileSync(fichier,JSON.stringify(out,null,2)+'\n');console.log(pilote,graine,raison,r.tempsJeu,r.score);
}
fs.writeFileSync(fichier,JSON.stringify(out,null,2)+'\n');
if(phase==='apres') {
  const avant=JSON.parse(fs.readFileSync(new URL('parties-avant.json',url)));
  const cas=out.cas.map((r,i)=>({pilote:r.pilote,graine:r.graine,identique:r.raison==='fin'&&JSON.stringify(r)===JSON.stringify(avant.cas[i]),raison:r.raison}));
  fs.writeFileSync(new URL('comparaison80.json',url),JSON.stringify({total:cas.length,identiques:cas.filter(r=>r.identique).length,cas},null,2)+'\n');
  if(cas.some(r=>!r.identique))process.exitCode=1;
}
