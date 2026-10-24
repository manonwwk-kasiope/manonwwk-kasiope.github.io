/* Par défaut : contrôles locaux seulement. Aucun listen(), aucun lancement Chrome.
   Hors bac : node tools/jury2/verifier.mjs --navigateur --valider-instrument --carte CHEMIN
   Le serveur sur port libre et le Chrome exclusif sont ceux de banc.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transitions } from '../codex-di5/r13.mjs';
import { P,paris } from './protocole.mjs';
import { flashs,sync,sensibilite,repereCarte,alignerSources,difficulte,mediane } from './analyse.mjs';
import { testsJury } from './tests-jury.mjs';
import { testsTemoins } from './tests-temoins.mjs';
import { testsOracle } from './tests-oracle.mjs';
import { testsCanarisRegards } from './tests-canaris-regards.mjs';
import { installer } from './sonde.mjs';
import { conduireAventure } from './aventure.mjs';
import { tampon,lireTampon,planche } from './images.mjs';
import { construireTemoin,batirCopie } from './temoin.mjs';
import { main,carteAlignee,audioPhysique,fichierStatique,optionsInstrumentSeul } from './banc.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const j=(f,v)=>fs.writeFileSync(path.join(HERE,f),JSON.stringify(v,null,2)+'\n');
export async function statique() {
  const preuve={dateParis:paris(),portee:'Instrument et construction uniquement ; aucun jeu simulé, aucun serveur, aucun navigateur, aucune sortie réseau.',controles:[]};
  const test=async(nom,f)=>{try{const valeur=await f();preuve.controles.push({nom,ok:true,valeur:valeur??null});}catch(e){preuve.controles.push({nom,ok:false,erreur:String(e.stack||e)});}};
  const fixtures=path.join(HERE,'fixtures-instrument');fs.mkdirSync(fixtures,{recursive:true});
  await test('Syntaxe de tous les modules ESM',()=>{
    const files=fs.readdirSync(HERE).filter(x=>x.endsWith('.mjs'));
    for(const f of files){const r=spawnSync(process.execPath,['--check',path.join(HERE,f)],{encoding:'utf8'});assert.equal(r.status,0,f+':'+r.stderr);}
    return files;
  });
  await test('Import du banc sans lancement',async()=>{const b=await import('./banc.mjs');assert.equal(typeof b.main,'function');assert.equal(typeof b.produire,'function');return 'Aucun effet de bord à l’import';});
  await test('Fonctions navigateur sérialisables',()=>{new vm.Script('('+installer.toString()+')');new vm.Script('('+conduireAventure.toString()+')');});
  const flashes=n=>{const a=[];let old=null;for(let k=0;k<n*2;k++){const b=new Uint8Array(100).fill(k%2?0:5);a.push({w:Math.floor(k/2)*.2+(k%2)*.05,...transitions(old||new Uint8Array(100),b,[0,0,0,0,0,.24],.1,.8)});old=b;}return a;};
  await test('Un flash rouge et lumineux simultané compte une fois',()=>assert.equal(flashs(flashes(1),.066).maxParSeconde,1));
  await test('Trois flashs restent trois ; quatre sont refusés',()=>{assert.equal(flashs(flashes(3),.066).maxParSeconde,3);assert.equal(flashs(flashes(4),.066).maxParSeconde,4);});
  await test('R-13 emploie la seconde réelle malgré les images manquantes',()=>{const a=flashes(4);a[6].w=1.2;a[7].w=1.25;assert.equal(flashs(a,.066).maxParSeconde,3);});
  const events=()=>Array.from({length:100},(_,i)=>({type:'apparition',d:{},ecartAudioMs:i<95?40:41,audioRunning:true,musiqueMuette:false,rmsMusique:1}));
  await test('Synchronisation : ±40 ms et 95 % inclusifs',()=>{assert.equal(sync(events()).apparition.conforme,true);});
  await test('Un audio inconnu ne disparaît pas du dénominateur',()=>{const a=events();a[0].audioRunning=false;assert.equal(sync(a).apparition.conforme,false);assert.equal(sync(a).apparition.inconnus,1);});
  await test('Le RMS avant mute ne prouve jamais la musique audible',()=>{const a=events().map(x=>({...x,musiqueMuette:true}));assert.equal(sync(a).apparition.mesurables,0);assert.equal(sync(a).apparition.part,null);});
  await test('Carte r1 : mesures numérotées à partir de 1',()=>{const c={morceaux:{x:{barres:[0,2,4,5],drops:[{t:4,mesure:3}],breaks:[{de:2,a:3}]}}};assert.equal(repereCarte(c,{id:'x',t:4}).breaks[0].t,2);assert.equal(repereCarte(c,{id:'x',t:4}).breaks[0].fin,5);assert.equal(repereCarte(c,{id:'x',t:4}).mesure,3);});
  await test('Planches : phase quelconque du drop, sans élargir le seuil de 150 ms',()=>{let pire=0;for(let phase=0;phase<.5;phase+=.001){for(let k=0;k<9;k++){const t=phase+k*.5,pas=Math.ceil(P.capturePas*60)/60,proche=Math.round(t/pas)*pas;pire=Math.max(pire,Math.abs(t-proche));}}assert(pire<=P.tolerancePlanche);return {synthetique:true,pireSec:pire,seuilSec:P.tolerancePlanche};});
  await test('Alignement : latence retirée une seule fois ; curseur accéléré suivi',()=>{const frames=[0,1,2].map(w=>({w,latence:.1,morceau:{id:'x',t:w*2}}));alignerSources(frames);assert(Math.abs(frames[1].sourceCarte.t-1.8)<1e-9);assert.equal(frames[0].sourceCarte,null);});
  await test('Boucle musicale : aucun faux drop en remontant le curseur',()=>{const c={morceaux:{x:{barres:[0,1,2],drops:[{t:1}],breaks:[]}}},f=[{w:0,sourceCarte:{id:'x',t:1.9}},{w:1,sourceCarte:{id:'x',t:.2}},{w:2,sourceCarte:{id:'x',t:1.2}}];const a=carteAlignee(f,c);assert.equal(a.length,1);assert(a[0].w>1);return a;});
  await test('Difficulté : victoires et censures ne sont pas des défaites',()=>{const c=(issue,t)=>({genre:'partie',profil:'paysage',pilote:'humain',moments:[],mesures:{fin:issue!=='censure',issue,tempsJeu:t}});const b=difficulte([c('defaite',150),c('defaite',240),c('victoire',10),c('censure',999)])[1];assert.equal(b.medianeDefaite,195);assert.equal(b.defaites,2);assert.equal(b.conforme,null,'n = 4 : indéterminé, jamais conforme');assert.match(b.statut,/indéterminé/);assert.equal(mediane([]),null);});
  function dossier(rms,decales=false){return{protocoleSha256:'fixture',cas:[{genre:'partie',profil:'paysage',pilote:'humain',graine:1,syncGeometrique:Array.from({length:50},(_,i)=>decales&&i>=20?100:0),mesures:{synchronisation:sync(events()),audio:{rmsMusique:1}}},{genre:'audio-probe',mesures:{audio:{captureRms:rms,rmsMusique:1,rmsSortie:rms}}}]};}
  await test('Sensibilité : le témoin connu dégradé est distingué sur deux axes',()=>{const r=sensibilite(dossier(.2),dossier(.001,true));assert.equal(r.valide,true);j('fixture-sensibilite-positive.json',{synthetique:true,...r});return {ratio:r.ratioAudio,perteSync:r.perteSync};});
  await test('Deux dossiers identiques invalident l’instrument',()=>{const r=sensibilite(dossier(.2),dossier(.2));assert.equal(r.valide,false);j('fixture-sensibilite-negative.json',{synthetique:true,...r});});
  await test('Un seul axe ou aucune donnée ne suffisent pas',()=>{assert.equal(sensibilite(dossier(.2),dossier(.001)).valide,false);assert.equal(sensibilite(dossier(.2),dossier(.2,true)).valide,false);assert.equal(sensibilite({cas:[]},{cas:[]}).valide,false);});
  await test('Capteur dans une fixture VM indépendante du jeu : pixels et objets réels',()=>{
    let now=0,id=0;const queue=[],handlers={};class AN{connect(){return this;}}class HM{play(){return Promise.resolve();}}class HV extends HM{}
    const buf=new Uint8Array(4),ctx={state:'running',baseLatency:.01,outputLatency:0,get currentTime(){return now/1000;}};
    const N={pal:{C:['#000000','#ffffff'],L:[0,1]},gfx:{buf:()=>buf,W:2,H:2,PX:2},
      music:{context:()=>ctx,beat:()=>({phase:.1,bar:0,beat:0}),tempo:()=>120,rms:()=>.25,rmsOut:()=>.2,muted:()=>false},
      ev:{on:(type,rank,f)=>{handlers[type]=f;}},ennemis:{list:[],tirs:[],count:()=>0},dir:{vague:()=>1},score:{score:0,resume:()=>({victoire:false})},
      game:{etat:()=> 'jeu',tension:()=>{throw Error('L’observateur ne doit pas rappeler tension()');},dbg:()=>({vague:1,score:0,stats:{}})},horloge:{t:()=>now/1000,pas:()=>id},R:{criteres:{R13:{aire:.066,flashsParSeconde:3},R14:{secouees:.12,banniere:10}}}};
    const w={__N:N,__S:{shake:0,tension:.2},__ERR:{count:0},__FRAME:0,requestAnimationFrame:f=>{queue.push(f);return ++id;}};
    const fixture={window:w,AudioNode:AN,HTMLMediaElement:HM,HTMLVideoElement:HV,performance:{now:()=>now,timeOrigin:0},cfg:{media:false,pixels:true,capturePas:.5},Uint8Array,WeakSet,Map,Set,JSON,btoa:s=>Buffer.from(s,'binary').toString('base64')};
    vm.runInNewContext('('+installer.toString()+')(cfg)',fixture);
    w.__jury.commencer();const draw=value=>{now+=16;buf.fill(value);w.requestAnimationFrame(()=>w.__FRAME++);queue.shift()(now);};
    draw(0);draw(1);draw(0);
    const tir={id:2,x:3,y:4,vx:5,vy:6};assert.equal(N.ennemis.tirs.push(tir),1);
    handlers.apparition({id:7,x:1,y:1});N.ennemis.list.push({id:7,etat:'vivant'});draw(0);
    const r=w.__jury.vider();assert.equal(r.frames[1].up,1);assert.equal(r.frames[2].dn,1);assert.equal(flashs(r.frames,.066).flashs,1);
    assert.equal(r.evenements.find(e=>e.type==='tir-ennemi').d.vx,5);assert.equal(r.evenements.find(e=>e.type==='apparition').preuve.apresRendu,true);assert.equal(r.erreurs.length,0);assert.equal(r.frames[0].tension,.2);
    return {synthetique:true,images:r.frames.length,flashs:1,tirsEffectivementInseres:N.ennemis.tirs.length};
  });
  await test('PNG du tampon : aller-retour RGB exact et planche',()=>{
    const i={w:0,t:0,etat:'fixture',W:2,H:2,buf:Buffer.from([0,1,1,0]).toString('base64'),pal:['#000000','#ffffff']};
    const f=path.join(fixtures,'tampon.png'),a=tampon(i,f),b=lireTampon(i,f);assert.deepEqual(a.rgb,b.rgb);
    const p=planche([{...a,fichier:'tampon.png'},{...a,w:.5,fichier:'tampon.png'}],path.join(fixtures,'planche.png'));assert.equal(p.images.length,2);
    const r=spawnSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',path.join(fixtures,'planche.png')],{encoding:'utf8'});assert.equal(r.status,0);assert.deepEqual(JSON.parse(r.stdout).streams[0],{width:4,height:2});
    return {sha256:sha(fs.readFileSync(f)),synthetique:true};
  });
  await test('Mesure audio du fichier réel : sinusoïde et silence décodés sans lecture',async()=>{
    async function onde(amplitude,nom){const rate=8000,n=rate*2,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let k=0;k<n;k++)b.writeInt16LE(Math.round(amplitude*32767*Math.sin(k/rate*2*Math.PI*440)),44+k*2);const file=path.join(fixtures,nom);fs.writeFileSync(file,b);return audioPhysique(file);}
    const a=await onde(.1,'sinus-fixture.wav'),b=await onde(0,'silence-fixture.wav');assert(Math.abs(a.rms-.1/Math.sqrt(2))<.001);assert.equal(b.rms,0);return {synthetique:true,sinusRms:a.rms,silenceRms:b.rms};
  });
  await test('Serveur : Range 206 et gel des actifs, sans ouvrir de port',()=>{
    const root=path.join(fixtures,'http'),out=path.join(fixtures,'http-snapshot');fs.mkdirSync(root,{recursive:true});fs.mkdirSync(out,{recursive:true});const file=path.join(root,'sample.mp3');fs.writeFileSync(file,'0123456789');
    const actifs=new Map(),call=(url,range)=>{let code=200,body;const heads={};fichierStatique(root,{url,headers:{range}},{setHeader:(k,v)=>heads[k]=v,writeHead:(c,h)=>{code=c;Object.assign(heads,h);},end:b=>body=b},Buffer.from('bundle'),actifs,out);return{code,body,heads};};
    const a=call('/sample.mp3','bytes=2-4');assert.equal(a.code,206);assert.equal(a.body.toString(),'234');assert.equal(a.heads['Content-Range'],'bytes 2-4/10');fs.writeFileSync(file,'changed');assert.equal(call('/sample.mp3').body.toString(),'0123456789');assert.equal(call('/sample.mp3','bytes=20-').code,416);assert.equal(call('/%2e%2e%2fsecret').code,404);
  });
  await test('Build du jeu reçu : sortie 0, dans une copie temporaire (la copie de travail n’est pas reconstruite)',()=>{
    const avant=sha(fs.readFileSync(path.join(ROOT,'index.html'))),r=batirCopie(null),apres=sha(Buffer.from(r.html));
    fs.writeFileSync(path.join(HERE,'build.log'),r.journal);assert.equal(r.status,0);
    assert.equal(sha(fs.readFileSync(path.join(ROOT,'index.html'))),avant);
    preuve.bundle={avant,apres,identique:avant===apres,code:r.status};assert.equal(preuve.bundle.identique,true,'index.html n’est pas à jour avec src/');return preuve.bundle;
  });
  await test('Témoin construit dans une copie temporaire, syntaxe valide',()=>{
    const sources=()=>sha(Buffer.concat(fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync(path.join(ROOT,'src',f)))));
    const avant=sources(),t=construireTemoin();const html=fs.readFileSync(t.fichier,'utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
    assert.equal(sources(),avant);assert.notEqual(t.sha256,preuve.bundle.apres);assert(html.includes('__JURY_TEMOIN'));assert(html.includes('o.rythmeFin=maintenant+o.portail'));
    preuve.temoin=t;return {code:t.buildCode,sha256:t.sha256,srcInchanges:true};
  });
  await test('Témoin reproductible, actifs identiques à la pointe, aucun chemin temporaire',()=>{
    const premier=preuve.temoin.sha256,second=construireTemoin();assert.equal(second.sha256,premier);
    const html=fs.readFileSync(second.fichier,'utf8'),ajout=fs.readFileSync(path.join(HERE,'temoin/ajout.js'),'utf8');
    assert.equal(html.includes('snake-jury2-temoin-'),false);
    const sansAjout=html.replace('\n/* ===== 99-jury2-temoin.js ===== */\n'+ajout,'');
    assert.equal(sha(sansAjout),preuve.bundle.apres,'Le témoin doit être exactement la pointe plus le seul module de dégradation');
    const file=path.join(HERE,'correction-actifs-temoin.json');if(fs.existsSync(file)){const p=JSON.parse(fs.readFileSync(file));p.apres={sha256:second.sha256,referencesAuDossierTemporaire:0,identiteHorsDegradation:true,reproductible:true};j('correction-actifs-temoin.json',p);}
    preuve.temoin=second;return {sha256:second.sha256,referencesTemporaires:0,identiqueHorsAjout:true};
  });
  await testsJury({test,fixtures,preuve,HERE,ROOT});
  await testsCanarisRegards({test,preuve});
  await testsOracle({test,preuve});
  await test('VM : dix références e1bdc6f identiques, reçu du chargeur courant',()=>{
    const r=JSON.parse(fs.readFileSync(path.join(HERE,'validation-vm.json')));
    assert.equal(r.harnaisSha256,sha(fs.readFileSync(path.join(HERE,'vm-temoins.mjs'))));
    assert.equal(r.valide,true);assert(r.cas.length>=10);assert(r.cas.every(c=>c.identique&&!c.erreurs&&!c.erreursConsole.length));
    return {reference:r.reference,identiques:r.cas.length};
  });
  await testsTemoins({test,ROOT,HERE});
  await test('Revalidation ciblée : seules les sondes, aucun verdict de campagne',async()=>{
    const r=optionsInstrumentSeul({serie:'etalonnage'});
    assert.deepEqual(r.profils,[]);assert.deepEqual(r.pilotes,[]);assert(r.sansAventures&&r.sansPerformance&&r.instrumentSeul);
    await assert.rejects(main(['--instrument-seul']),/exige --valider-instrument/);
    return {profilsParties:r.profils,pilotesParties:r.pilotes,aventure:false,performance:false,qualificationComplete:false};
  });
  preuve.reussi=preuve.controles.every(x=>x.ok);preuve.nombre=preuve.controles.length;preuve.echecs=preuve.controles.filter(x=>!x.ok).length;
  preuve.navigateur='non exécuté conformément à la mission ; sensibilité réelle et dossiers à vérifier par la cheffe';j('verification-locale.json',preuve);
  console.log(JSON.stringify({reussi:preuve.reussi,controles:preuve.nombre,echecs:preuve.echecs,bundle:preuve.bundle,temoin:preuve.temoin?.sha256},null,2));
  if(!preuve.reussi)process.exitCode=1;
  return preuve;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.includes('--navigateur'))await main(args.filter(x=>x!=='--navigateur'));
  else if(args.includes('--help')){console.log('Sans option ou --statique : contrôles locaux uniquement.\nHors bac : node tools/jury2/verifier.mjs --navigateur --valider-instrument --carte CHEMIN');}
  else await statique();
}
