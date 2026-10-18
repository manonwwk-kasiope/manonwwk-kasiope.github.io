// Probes ciblées : horloge publique, puis rejeu des mêmes entrées appliquées au pas.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {monde} from './vm.mjs';
import {corriger} from './raccords.mjs';
import {jeu,comparer,sha} from './rejouer.mjs';
import {installerRAF,amorcerPartie} from '../codex-p16/raf-controle.mjs';
const here=new URL('./',import.meta.url),src=JSON.parse(fs.readFileSync(new URL('sources-recues.json',here)));
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),gel:{},entreesFixes:{}};
for(const [phase,code] of [['avant',src],['apres',corriger(src)]]){
  const {N}=monde(code);N.game.reset(7,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');N.fx.reset();N.horloge.reset();
  N.fx.hitstop(N.R.mortScene.gelImages);
  // Consommer exactement le vrai gel sans incrémenter le compteur d'images (comme dbg.simuler).
  for(let i=0;i<=Math.ceil(N.R.mortScene.gelImages/60/N.R.temps.h)+2&&N.horloge.resteGel()>0;i++){const dt=N.horloge.avancer();N.fx.update(dt);}
  assert.equal(N.horloge.resteGel(),0,'Gel non consommé dans la fixture '+N.game.etat());
  const avant={gel:N.horloge.resteGel(),images:N.fx.hitstopLeft(),image:N.S.frame,pas:N.horloge.pas()};
  const cfg=N.R.scene.niveau;
  N.fx.ralenti(cfg.ralenti,cfg.duree);
  const pasRalenti=[];
  for(let i=0;i<Math.ceil(cfg.duree/N.R.temps.h)+2;i++){
    const dt=N.horloge.avancer();N.fx.update(dt);pasRalenti.push({pas:N.horloge.pas(),temps:N.horloge.t(),dt,k:N.fx.k()});
  }
  out.gel[phase]={avant,requete:cfg,pasRalenti};
}
const copie=x=>JSON.parse(JSON.stringify(x));
function amorcer(code){const m=monde(code),{c,N}=m;c.__DT=1/60;vm.runInContext('('+installerRAF.toString()+')()',c);c.requestAnimationFrame(c.frame);N.reseed(7);N.game.reset(7);c.cfg={graine:7};vm.runInContext('('+amorcerPartie.toString()+')(cfg)',c);return m;}
for(const [phase,code] of [['avant',src],['apres',corriger(src)]]){
  const d=amorcer(code),s=amorcer(code),tape={},appliques={dessine:[],simule:[]};
  const fields=['x','y','mag','boost','pouvoir','apogee','fire','any','pause','valider','retour','chiffre','car','gestes','taps'];
  const snapshot=I=>Object.fromEntries(fields.map(k=>[k,copie(I[k])]));
  const dp=d.c.__PILOT;d.c.__PILOT=function(db){dp(db);const pas=d.N.horloge.pas(),input=snapshot(d.S.input);tape[pas]=input;appliques.dessine.push({pas,input});};
  for(let image=0;image<15*4*60&&d.N.horloge.t()<15&&d.N.game.etat()!=='fin';image++)d.c.__R30RAF.avancer(image*1000/60);
  const finPas=d.N.horloge.pas();
  const sp=s.c.__PILOT;s.c.__PILOT=function(db){sp(db);const pas=s.N.horloge.pas(),input=tape[pas];if(input){for(const k of fields)s.S.input[k]=copie(input[k]);appliques.simule.push({pas,input:snapshot(s.S.input)});}};
  for(let i=0;i<finPas&&s.N.horloge.pas()<finPas;i++)s.N.game.dbg.simuler(.25);
  assert.ok(s.N.horloge.pas()>=finPas,'Rejeu borné incomplet');
  const filtre=J=>jeu(J,Infinity).filter(e=>e.pas<=finPas&&e.type!=='pilote');
  const jd=filtre(d.N.journal.dump()),js=filtre(s.N.journal.dump());
  assert.deepEqual(appliques.dessine,appliques.simule,'Entrées imposées différentes');
  out.entreesFixes[phase]={finPas,inputsSha256:sha(appliques.dessine),nombreEntrees:appliques.dessine.length,entreesIdentiques:true,...comparer(jd,js),journaux:{dessine:jd,simule:js},erreurs:[d.c.__ERR,s.c.__ERR],console:[d.erreurs,s.erreurs]};
  fs.writeFileSync(new URL('sondes.json',here),JSON.stringify(out,null,2)+'\n');console.log(phase,out.entreesFixes[phase].egaux);
}
assert.equal(out.entreesFixes.avant.egaux,false);assert.equal(out.entreesFixes.apres.egaux,true);
