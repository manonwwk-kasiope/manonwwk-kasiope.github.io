// Avant/après apparié sur les sources reçues. Protocole exact des 80 pilotes, journaux complets.
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {monde} from './vm.mjs';
import {sha} from './rejouer.mjs';
const here=new URL('./',import.meta.url),lire=n=>JSON.parse(fs.readFileSync(new URL(n,here))),save=(n,r)=>fs.writeFileSync(new URL(n,here),JSON.stringify(r,null,2)+'\n');
assert.equal(lire('calibration.json').cas.filter(r=>r.identique).length,10);
const choix=process.argv.includes('--pilote')?process.argv[process.argv.indexOf('--pilote')+1]:null;
const debut=process.argv.includes('--debut')?Number(process.argv[process.argv.indexOf('--debut')+1]):1;
assert.ok(debut>=1&&debut<=10);
const bilanFichier=choix?'parties80-'+choix+(debut===1?'':'-'+debut)+'.json':'parties80.json';
const sources={avant:lire('sources-recues.json'),apres:lire('sources-candidate.json')};
fs.mkdirSync(new URL('parties/',here),{recursive:true});
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sources:Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,sha(s)])),cas:[]};
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'].filter(n=>!choix||n===choix)) for(let graine=debut;graine<=10;graine++) {
  const cas={pilote,graine};
  for(const [phase,src] of Object.entries(sources)) {
    const fichier=`parties/${phase}-${pilote}-${graine}.json.gz`,url=new URL(fichier,here);
    let r;
    if(fs.existsSync(url)) {r=JSON.parse(zlib.gunzipSync(fs.readFileSync(url)));assert.equal(r.sourcesSha256,sha(src));}
    else {
      const {c,N,S,erreurs}=monde(src);N.reseed(graine);N.game.reset(graine);
      c.localStorage.clear();S.jour=20261017;S.reglages.actions=pilote==='humain'?'auto':'doigts';
      N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
      N.pilote.lancer(pilote);if(pilote==='dieu')N.game.dbg.god(true);N.journal.actif(true);N.horloge.avancer();
      let reel=0,stagnant=0,last='',raison='borne';
      while(N.horloge.t()<540&&reel<2160) {
        if(N.game.etat()==='fin'){raison='fin';break;}
        try{vm.runInContext('N.game.dbg.simuler(0.25)',c,{timeout:5000});}
        catch(e){raison='expiration VM : '+e.message;break;}
        reel+=.25;const utile=[N.game.etat(),N.horloge.t(),S.ecran?.depuis,S.vol?.t].join('|');
        stagnant=utile===last?stagnant+.25:0;last=utile;
        if(stagnant>10){raison='bloque:'+N.game.etat();break;}if(c.__ERR.count){raison='erreur';break;}
      }
      if(N.game.etat()==='fin')raison='fin';
      const d=N.game.dbg(),journal=N.journal.dump();
      r={pilote,graine,raison,tempsJeu:N.horloge.t(),tempsCombat:d.t,pas:N.horloge.pas(),tempsSimule:reel,vague:d.vague,score:d.score,morts:journal.filter(e=>e.type==='mort').map(e=>e.d),cartes:journal.filter(e=>e.type==='carte').map(e=>e.d),err:c.__ERR,erreursConsole:erreurs,journalSha256:sha(journal),sourcesSha256:sha(src),journal};
      fs.writeFileSync(url,zlib.gzipSync(JSON.stringify(r)));
    }
    // Détacher les prototypes VM : le bilan ne doit pas retenir les contextes des parties finies.
    const {journal,sourcesSha256,...resume}=JSON.parse(JSON.stringify(r));cas[phase]={...resume,fichier};
  }
  const signature=r=>JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='fichier')));
  cas.identique=signature(cas.avant)===signature(cas.apres);
  out.cas.push(cas);save(bilanFichier,out);console.log(pilote,graine,cas.identique,cas.avant.tempsJeu,cas.apres.tempsJeu);
}
out.identiques=out.cas.filter(c=>c.identique).length;out.finiesSansErreur=out.cas.every(c=>[c.avant,c.apres].every(r=>r.raison==='fin'&&!r.err.count&&!r.erreursConsole.length));save(bilanFichier,out);
if(out.identiques!==(choix?11-debut:8*(11-debut))||!out.finiesSansErreur)process.exitCode=1;
