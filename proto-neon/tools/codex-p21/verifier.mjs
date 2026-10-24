/* À lancer HORS BAC : cd proto-neon && node tools/codex-p21/verifier.mjs --raccord
   --raccord essaie le petit patch 70 sur le bundle servi, sans modifier le fichier réservé.
   Un Chromium muet, trois profils, puis le banc commandes original après sa fermeture.
   Sans --rapide : R-22/R-33 complets et 50 graines par variante R-23, pour chaque état avant/après. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawnSync} from 'node:child_process';
import {chromium,devices} from 'playwright';
import {Banc,Session,options,mesurerCritere,dateParis} from '../mesure/commun.mjs';
import * as R22 from '../mesure/criteres/R-22-commandes.mjs';import * as R23 from '../mesure/criteres/R-23-un-pouce.mjs';import * as R33 from '../mesure/criteres/R-33-gestes-surs.mjs';
import {Doigts,preparerJeu,serieSecondDoigt,lireGestes} from './gestes.mjs';import {sources,chargerAvant,ROOT,ICI,hash} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {bundleDepuis} from './bundle.mjs';
const out=path.resolve(ICI,'navigateur'),raccord=process.argv.includes('--raccord'),rapide=process.argv.includes('--rapide');fs.mkdirSync(out,{recursive:true});
const phases=[['avant',chargerAvant()],['apres',raccord?avecRaccord(sources()):sources()]],recus=[];let html='';
const server=http.createServer((req,res)=>{
 try{const u=decodeURIComponent(req.url.split('?')[0]);if(u==='/index.html'){res.setHeader('Content-Type','text/html');return res.end(html);}
 const file=path.resolve(ROOT,'.'+u);if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':'audio/mpeg');fs.createReadStream(file).pipe(res);
 }catch(e){res.statusCode=400;res.end(String(e));}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const nav=await chromium.launch({args:['--mute-audio']}).catch(async e=>{await new Promise(r=>server.close(r));throw e;});
const profils={paysage:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},portrait:{...devices['iPhone 13'],viewport:{width:390,height:844}},bureau:{viewport:{width:1440,height:900}}};
try{
 for(const [phase,src]of phases){
  html=bundleDepuis(src);const dir=path.join(out,phase);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
  const b=new Banc({...options([]),url:`http://127.0.0.1:${server.address().port}/index.html`,sortie:dir,rapide,cache:false});b.nav=nav;b.empreinte=hash(html);b.instrument=hash(fs.readFileSync(new URL('./gestes.mjs',import.meta.url)));
  // Les critères héritent la même horloge explicite : les seuils ne dépendent pas du transport CDP.
  b.enfant=function(){const e=Object.create(this);e.sessions=new Set();e.ouvrir=async(profil='paysage',opts={})=>{const s=new Session(e,profil,{dt:1/60,...opts});await s.ouvrir();s.horlogeControlee=true;e.sessions.add(s);return s;};return e;};
  const receipt={dateParis:dateParis(),phase,raccord:phase==='apres'&&raccord,bundleSha256:hash(html),navigateur:nav.version(),limite:'Chromium émulé, Safari physique reste à vérifier.',fixtures:[],criteres:[]};
  receipt.instrumentGestes=true;receipt.instruments={};
  for(const [profil,definition]of Object.entries(profils)){
   // Même sonde commune ; tactile construit au bureau, commandes bureau naturelles testées ensuite.
   const s=await b.ouvrir(profil,{dt:1/60});s.horlogeControlee=true;
   try {
    const prep=await preparerJeu(s);if(!prep.ok)throw Error(prep.raison);
    const d=await new Doigts(s).init(),V=definition.viewport;
    // Vérifier le canal de mesure avec un pouvoir réellement déclenché, sans injection tactile.
    await s.eval(()=>{window.__N.journal.vider();window.__N.joueuse.pouvoirActiver();});
    const canal=await lireGestes(s),etatCanal=await s.eval(()=>window.__N.joueuse.pouvoir.etat);
    const canalOK=canal?.pouvoirs===1&&etatCanal==='actif';
    receipt.fixtures.push({nom:'canal-pouvoir-connu-'+profil,conforme:canalOK,pouvoirs:canal?.pouvoirs,etat:etatCanal,journal:canal?.tout});
    await s.eval(()=>{window.__N.game.dbg.scene('calme');window.__N.game.dbg.god(true);window.__S.reglages.actions='doigts';});
    const avant=await s.eval(()=>({r:performance.now(),t:window.__N.horloge.t(),x:window.__N.joueuse.tete.x,y:window.__N.joueuse.tete.y}));
    const x=V.width*.22,y=V.height*.62,p=await d.poser(x,y);await d.attendre(260);
    const a=await d.poser(V.width*.7,V.height*.5);await d.attendre(70);await d.lever(a);await d.attendre(17);
    const reste=await s.eval(()=>({r:performance.now(),t:window.__N.horloge.t(),x:window.__N.joueuse.tete.x,y:window.__N.joueuse.tete.y,stick:{...window.__S.input.stick},trace:window.__TRACE_DOIGTS.slice(),journal:window.__N.journal.dump()}));
    await d.lever(p);await d.attendre(17);const libere=await s.eval(()=>!window.__S.input.stick.active);
    const horloge=reste.r>avant.r&&reste.t>avant.t&&(reste.x!==avant.x||reste.y!==avant.y);
    const contrat=reste.stick.active&&libere&&reste.trace.some(e=>e.type==='touchend'&&e.actifs===1);
    receipt.fixtures.push({nom:'contrat-CDP-et-horloge-'+profil,conforme:contrat&&horloge,avant,reste,libere,horloge});
    receipt.instruments[profil]=canalOK&&contrat&&horloge;
    if(!receipt.instruments[profil])receipt.instrumentGestes=false;
    if(canalOK&&contrat&&horloge)for(const genre of ['toucher','glisse','tenu']){
     const r=await serieSecondDoigt(s,genre,6,genre==='tenu'?{duree:.5}:{}),action=genre==='toucher'?'pouvoir':genre==='glisse'?'apogee':'boost';
     receipt.fixtures.push({nom:profil+'-'+genre,conforme:r.actions[action]===6&&Object.entries(r.actions).every(([k,n])=>k===action||n===0),resultat:r});
    }
    const t=await s.tampon(false),pixels=Array.from(t.buf),erreurs=await s.bilanErreurs();
    receipt.fixtures.push({nom:'pixels-et-erreurs-'+profil,conforme:pixels.length===t.W*t.H&&pixels.every(v=>v>=0&&v<16)&&pixels.some(v=>v!==0)&&erreurs.zero,W:t.W,H:t.H,PX:t.PX,sha256:hash(t.buf),palette:[...new Set(pixels)],erreurs});
    fs.writeFileSync(path.join(dir,profil+'-tampon.bin'),t.buf);await s.capture(profil);await s.captureTampon(profil);
   }catch(e){receipt.instrumentGestes=false;receipt.instruments[profil]=false;receipt.fixtures.push({nom:'instrument-'+profil,conforme:false,erreur:String(e.stack||e)});}
   finally{await s.fermer();}
  }
  // Un instrument tactile en échec ne produit pas de verdict de jeu R-22/R-33. R-23 reste indépendant.
  for(const mod of [R22,R33,R23]){
   const mesure=mod!==R23&&!receipt.instruments.paysage?{meta:mod.meta,mesurer:async(_b,res)=>res.nonMesurable('instrument tactile','canal connu, contrat CDP ou horloge avec mouvement réel non validé ; aucun verdict sur le jeu')}:mod;
   const r=await mesurerCritere(b,mesure);receipt.criteres.push(r);console.log(phase,mod.meta.id,r.statut);
  }
  receipt.conforme=receipt.fixtures.every(f=>f.conforme)&&receipt.criteres.every(c=>c.statut==='ok');recus.push(receipt);fs.writeFileSync(path.join(dir,'sortie.json'),JSON.stringify(receipt,null,2));
 }
}finally{await nav.close();await new Promise(r=>server.close(r));}
// Banc d'origine inchangé, aucune concurrence de Chromium, sorties dans le seul dossier p21.
for(const phase of ['avant','apres']){
 const outdir=path.join(out,phase,'commandes'),r=spawnSync(process.execPath,[path.join(ROOT,'tools/commandes/banc.mjs'),'--bundle',path.join(out,phase,'index.html'),'--outdir',outdir,'--phase',phase],{encoding:'utf8'});
 fs.writeFileSync(path.join(out,phase,'commandes.log'),r.stdout+'\n'+r.stderr);let preuve=null;try{preuve=JSON.parse(fs.readFileSync(path.join(outdir,'sortie.json')));}catch{}
 const p=recus.find(r=>r.phase===phase);p.commandes={status:r.status,conforme:r.status===0&&preuve?.cas.length===28&&preuve?.conforme,cas:preuve?.cas.length};
}
const bilan={dateParis:dateParis(),raccord,conforme:recus.find(r=>r.phase==='apres')?.conforme&&recus.every(r=>r.commandes.conforme),note:'Les échecs avant sont conservés comme mesures, le verdict porte sur le candidat après.',phases:recus};fs.writeFileSync(path.join(out,'bilan.json'),JSON.stringify(bilan,null,2));if(!bilan.conforme)process.exitCode=1;
