/* HORS BAC : cd proto-neon && node tools/codex-p18/verifier.mjs
   Un seul Chromium muet, trois profils en série. Ne pas exécuter dans le bac.
   Mesure états, vrais pixels du HUD/fin et journal ; aucune preuve par compteur d'appels. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
const DIR=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(DIR,'../..'),OUT=path.join(DIR,'navigateur');
fs.mkdirSync(OUT,{recursive:true});
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(ROOT+'/index.html')).digest('hex'),profils:[],limite:'Chromium émulé : Safari sur iPhone reste à vérifier.'};
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const serveur=http.createServer((req,res)=>{
 let fichier;
 try{let p=decodeURIComponent(new URL(req.url,'http://local').pathname);fichier=path.resolve(ROOT,'.'+(p==='/'?'/index.html':p));}catch{res.writeHead(400);res.end();return;}
 if(!fichier.startsWith(ROOT+path.sep)||!fs.existsSync(fichier)||!fs.statSync(fichier).isFile()){res.writeHead(404);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4','.mp3':'audio/mpeg','.png':'image/png'};
 res.writeHead(200,{'Content-Type':types[path.extname(fichier)]||'application/octet-stream'});fs.createReadStream(fichier).pipe(res);
});
const sauver=()=>fs.writeFileSync(OUT+'/resultats.json',JSON.stringify(resultat,null,2)+'\n');
let navigateur;
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 navigateur=await chromium.launch({args:['--mute-audio']});resultat.chromium=navigateur.version();
 for(const[nom,options]of profils){
  const contexte=await navigateur.newContext(options),page=await contexte.newPage(),erreurs=[];
  const profil={nom,viewport:options.viewport,erreurs,mesures:[]};resultat.profils.push(profil);
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  try{
   await page.addInitScript(()=>{window.__SEED=2;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
   await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
   await page.evaluate(()=>{
    const N=window.__N,S=window.__S;localStorage.clear();S.jour=20261017;
    if(S.reglages)S.reglages.actions='doigts';N.intro.skip();N.game.reset(2,{depart:'plongee'});
    if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');N.pilote.lancer('bon');N.journal.actif(true);N.horloge.avancer();
   });
   for(const scene of ['multiplicateur','fin']){
    const mesure=await page.evaluate(scene=>{
     const N=window.__N,S=window.__S;let reel=0;
     while(N.game.etat()!=='fin'&&N.horloge.t()<540&&reel<2160&&!window.__ERR.count){
      if(scene==='multiplicateur'&&N.score.mult()>1&&['jeu','boss','reapparition'].includes(N.game.etat()))break;
      N.game.dbg.simuler(.25);reel+=.25;
     }
     const g=N.gfx;
     // Même empilement public que le boot : le mode de simulation ne lance pas sa boucle de dessin.
     const dessiner=()=>{
      g.origin(0,0);g.clear(N.pal.i('vide'));N.game.draw();N.fx.draw();N.game.drawTop();g.origin(0,0);
      if(N.fx.drawEcran)N.fx.drawEcran();
      const film=N.intro.current(),et=N.game.etat(),plein=N.ids.tableEtats[et]?.plein;
      if(film&&!N.intro.busy())N.intro.draw();
      if(!plein&&et!=='titre'&&et!=='plongee'&&!(film&&N.intro.busy()))N.hud.draw();
      if(N.ui.actif())N.ui.draw();if(film&&N.intro.busy())N.intro.draw();g.present();
     };dessiner();
     const tampon=Array.from(g.buf()),hist=Array(N.pal.C.length).fill(0);let horsPalette=0;
     for(const p of tampon){if(p>=hist.length)horsPalette++;else hist[p]++;}
     // Rendu isolé du vrai HUD : mêmes géométrie, score et multiplicateur, aucun remplacement du dessin.
     let texte=null,hud=null,ligneScore=null;
     if(scene==='fin'){
      const l=S.ecran.retour?.lignes?.find(l=>l.texte?.startsWith('SCORE '));
      if(l){let pixels=0;for(let y=Math.max(0,l.y);y<Math.min(g.H,l.y+l.h);y++)for(let x=Math.max(0,l.x);x<Math.min(g.W,l.x+l.w);x++)if(tampon[y*g.W+x]===l.encre)pixels++;
       ligneScore={...l,pixels,attendu:'SCORE '+N.score.score,conforme:l.texte==='SCORE '+N.score.score&&pixels>0};}
     }
     if(scene==='multiplicateur'){
      const sc=N.score,ob=sc.objectif();texte='×'+sc.mult()+(ob.reste>0?'  ×'+ob.mult+' DANS '+ob.reste:'');
      g.origin(0,0);g.clear(N.pal.i('vide'));N.hud.draw();
      const b=Array.from(g.buf()),x=(N.outils.geo.safe.l|0)+3;
      const motif=N.spr.text(texte),ci=N.pal.i('ambre'),correspondances=[];
      // Recherche du texte complet attendu dans le tampon : l'emplacement varie avec la mise en page du défi.
      for(let y=0;y<=g.H-motif.h;y++){
       let requis=0,poses=0;
       for(let yy=0;yy<motif.h;yy++)for(let xx=0;xx<motif.w;xx++)if(motif.data[yy*motif.w+xx]){requis++;if(b[(y+yy)*g.W+x+xx]===ci)poses++;}
       if(requis&&poses===requis)correspondances.push({x,y,requis,poses});
      }
      hud={correspondances,tampon:b};
      dessiner();
     }
     return{scene,etat:N.game.etat(),score:N.score.score,mult:N.score.mult(),chaine:N.score.chaine(),texte,objectif:N.score.objectif(),resume:N.score.resume(),points:N.score.stats.points||null,tampon,w:g.W,h:g.H,px:g.PX,hist,horsPalette,hud,ligneScore,err:window.__ERR,journal:N.journal.dump()};
    },scene);
    const tampon=mesure.tampon;delete mesure.tampon;
    fs.writeFileSync(`${OUT}/${nom}-${scene}.buf`,Uint8Array.from(tampon));
    mesure.tamponSha256=crypto.createHash('sha256').update(Uint8Array.from(tampon)).digest('hex');
    if(mesure.hud){fs.writeFileSync(`${OUT}/${nom}-hud.buf`,Uint8Array.from(mesure.hud.tampon));delete mesure.hud.tampon;}
    fs.writeFileSync(`${OUT}/${nom}-${scene}-journal.json.gz`,zlib.gzipSync(JSON.stringify(mesure.journal)));delete mesure.journal;
    await page.screenshot({path:`${OUT}/${nom}-${scene}.png`});
    mesure.ok=mesure.err.count===0&&mesure.horsPalette===0&&tampon.some(p=>p!==0)&&(scene==='fin'?mesure.etat==='fin'&&mesure.resume?.score===mesure.score&&mesure.ligneScore?.conforme:mesure.mult>1&&mesure.hud.correspondances.length>0);
    profil.mesures.push(mesure);sauver();
   }
   profil.ok=profil.mesures.every(m=>m.ok)&&erreurs.length===0;
  }catch(e){profil.exception=String(e.stack||e);profil.ok=false;}
  finally{await contexte.close();sauver();}
 }
 resultat.ok=resultat.profils.length===3&&resultat.profils.every(p=>p.ok);if(!resultat.ok)process.exitCode=1;
}catch(e){resultat.exception=String(e.stack||e);process.exitCode=1;}
finally{if(navigateur)await navigateur.close();if(serveur.listening)await new Promise(r=>serveur.close(r));sauver();}
console.log(JSON.stringify({ok:resultat.ok,profils:resultat.profils.map(p=>({nom:p.nom,ok:p.ok}))}));
