/* HORS BAC : cd proto-neon && node tools/codex-p17/verifier.mjs
   72 captures comparables avant/après. Un seul Chromium muet ; contextes en série.
   Aucun serveur ni navigateur lancé dans le bac de livraison. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {scenario} from './scenarios.mjs';
import {retourValide,sondeRetour} from '../mesure/criteres/R-36-raison-de-revenir.mjs';
const ICI=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(ICI,'../..'),OUT=path.join(ICI,'playwright');
fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),courant=fs.readFileSync(path.join(ROOT,'src/80-ecrans.js'),'utf8'),ancien=fs.readFileSync(path.join(ICI,'avant/80-ecrans.js'),'utf8');
assert.ok(html.includes(courant),'Reconstruire index.html avant le contrôle');
const avant=html.replace(courant,()=>ancien);
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundle:crypto.createHash('sha256').update(html).digest('hex'),avant:'80-ecrans reçu, autres sources identiques au candidat',profils:[],limite:'Chromium émulé, aucune qualification Safari physique.'};
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(rel==='/avant.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(avant);return;}
 const file=path.resolve(ROOT,'.'+(rel==='/'?'/index.html':rel));
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let navigateur;
const sauver=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2));
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 navigateur=await chromium.launch({args:['--mute-audio']});resultat.chromium=navigateur.version();
 for(const [profil,opts] of profils){
  const p={profil,captures:[]};resultat.profils.push(p);
  for(const phase of ['avant','apres'])for(const nom of ['briefing','pause','fin'])for(const stade of ['zero','encours','faits','tout']){
   const contexte=await navigateur.newContext(opts),page=await contexte.newPage(),erreurs=[];
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   try{
    await page.addInitScript(()=>{window.__SEED=1;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
    await page.goto(`http://127.0.0.1:${serveur.address().port}/${phase==='avant'?'avant.html':'index.html'}?journal=1`,{waitUntil:'load'});
    // Les vraies ressources doivent être décodées avant de figer l'image (aucune attente arbitraire).
    await page.evaluate(()=>window.__N.art.load());
    const r=await page.evaluate('('+scenario.toString()+')({N:window.__N,S:window.__S,...'+JSON.stringify({nom,stade,profil})+'})');
    const id=`${phase}-${profil}-${nom}-${stade}`,pixels=r.tampon.data;delete r.tampon.data;
    r.tampon.sha256=crypto.createHash('sha256').update(Uint8Array.from(pixels)).digest('hex');
    fs.writeFileSync(path.join(OUT,id+'.buf'),Uint8Array.from(pixels));
    await page.screenshot({path:path.join(OUT,id+'.png')});
    r.phase=phase;r.erreursConsole=erreurs;
    const right=r.lignes.filter(l=>/^\d+\/\d+$/.test(l.texte)).map(l=>l.x+l.w);
    r.compteursAlignes=right.length===4&&right.every(x=>x===right[0]);
    r.groupesEntiers=r.lignes.every(l=>!['PROCHAIN','JOUR','SECTEUR','>'].includes(l.texte)&&!(/\b(DU|LE)$/.test(l.texte)));
    r.sansNon=r.lignes.every(l=>!/(^| )NON( |$)/.test(l.texte));
    r.ciblesSures=r.boutons.every(b=>b.x>=r.modele.x&&b.x+b.w<=r.modele.x+r.modele.w&&b.y+b.h<=r.tampon.h-(profil==='paysage'?10:profil==='portrait'?17:0));
    r.barresSures=r.modele.barres.every(b=>b.x>=r.modele.x&&b.x+b.w<=r.modele.x+r.modele.w&&b.y>=r.modele.y&&b.y+b.h<=r.modele.bas);
    if(nom==='fin'&&stade==='tout'){
      r.preuveTerminale=await page.evaluate(sondeRetour.replace(/^/,'(function(){const N=window.__N,S=window.__S;')+'})()');
      // Le scénario de composition n'impose pas un faux état fin : on contrôle le même rendu directement.
      const l=r.lignes.find(l=>l.texte==='TOUT DÉBLOQUÉ');
      r.terminalValide=retourValide({energie:r.resume.energie,prochain:r.prochain},{catalogue:r.catalogue,acquis:r.acquis,toutVisible:!!l&&l.pixels>0&&l.dansZone});
    }
    r.ok=r.err.count===0&&!erreurs.length&&!r.collisions.length&&r.horsPalette===0&&r.cyan===0&&r.groupesEntiers&&r.compteursAlignes&&r.sansNon&&r.ciblesSures&&r.barresSures&&r.lignes.every(l=>l.echelle>=2&&l.dansZone&&l.pixels>0)&&r.boutons.every(b=>b.wPt>=44&&b.hPt>=44)&&(nom!=='fin'||stade!=='tout'||r.terminalValide);
    p.captures.push(r);
   }catch(e){p.captures.push({phase,nom,stade,ok:false,exception:String(e.stack||e)});}
   finally{await contexte.close();sauver();}
  }
  p.ok=p.captures.length===24&&p.captures.every(c=>!c.exception)&&p.captures.filter(c=>c.phase==='apres').every(c=>c.ok);sauver();
 }
 resultat.ok=resultat.profils.every(p=>p.ok);if(!resultat.ok)process.exitCode=1;
}catch(e){resultat.exception=String(e.stack||e);process.exitCode=1;}
finally{if(navigateur)await navigateur.close();if(serveur.listening)await new Promise(r=>serveur.close(r));sauver();}
console.log(JSON.stringify({ok:resultat.ok,profils:resultat.profils.map(p=>({profil:p.profil,ok:p.ok}))}));
