/* HORS BAC : cd proto-neon && node tools/codex-p12/verifier.mjs
   Un seul Chromium muet ; trois contextes en série. Aucun lancement lors de la livraison.
   Les captures sont celles des composants publics ; le raccord briefing est vérifié séparément.
*/
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const ICI=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(ICI,'../..');
const OUT=path.join(ICI,'playwright');fs.mkdirSync(OUT,{recursive:true});
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundle:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'index.html'))).digest('hex'),profils:[],limite:'Chromium émulé : ne qualifie pas Safari physique.'};
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(ROOT,'.'+(rel==='/'?'/index.html':rel));
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let navigateur;
try{
 await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
 navigateur=await chromium.launch({args:['--mute-audio']});resultat.chromium=navigateur.version();
 for(const [nom,opts] of profils){
  const contexte=await navigateur.newContext(opts);const page=await contexte.newPage();const erreurs=[];
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.addInitScript(()=>{window.__SEED=1;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
  const p={nom,viewport:opts.viewport,erreurs,captures:[]};resultat.profils.push(p);
  try{
   await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`,{waitUntil:'load'});
   p.jourBoot=await page.evaluate(()=>window.__S.jour??null);
   p.raccordDate=typeof p.jourBoot==='number';
   p.jours=await page.evaluate(()=>{
    const N=window.__N,S=window.__S;localStorage.clear();const jours=[];
    for(const jour of [20261017,20261018]){S.jour=jour;N.intro.skip();N.game.reset(1,{depart:'briefing'});jours.push({jour,defis:N.score.defis.map(d=>d.id)});}
    return jours;
   });
   for(const ecran of ['briefing','fin']){
    const mesure=await page.evaluate(({ecran,nom})=>{
     const N=window.__N,S=window.__S;S.jour=20261017;N.intro.skip();
     N.game.reset(1,{depart:ecran==='briefing'?'briefing':'plongee'});
     const raccord=ecran!=='briefing'||N.ui.ecran()==='briefing';
     if(ecran==='fin'){
      for(let partie=1;partie<=2;partie++){
       if(partie>1)N.game.reset(partie,{depart:'plongee'});
       if(S.reglages)S.reglages.actions='doigts';
       N.pilote.lancer('bon');N.journal.actif(true);N.horloge.avancer();let reel=0;
       while(N.game.etat()!=='fin'&&N.horloge.t()<540&&reel<2160&&!window.__ERR.count){N.game.dbg.simuler(.25);reel+=.25;}
       if(N.game.etat()!=='fin')throw new Error('partie navigateur sans fin');
      }
     }
     // Zones sûres explicites : vérifie le cas encoche/barre d'accueil, même si Chromium retourne env()=0.
     S.view.safe=nom==='paysage'?{l:24,r:24,t:0,b:10}:nom==='portrait'?{l:0,r:0,t:23,b:17}:{l:0,r:0,t:0,b:0};
     N.outils.geom();N.ui.ouvrir(ecran,{victoire:N.score.resume()?.victoire||false});N.ui.update(N.R.ecrans.fin.garde);
     N.gfx.origin(0,0);N.gfx.clear(N.pal.i('vide'));N.ui.draw();N.gfx.present();
     const modele=S.ecran.retour,b=N.gfx.buf(),hist=Array(N.pal.C.length).fill(0);let horsPalette=0;
     for(const ci of b){if(ci>=hist.length)horsPalette++;else hist[ci]++;}
     const lignes=modele.lignes.map(l=>{
      let pixels=0;for(let y=Math.max(0,l.y);y<Math.min(N.gfx.H,l.y+l.h);y++)for(let x=Math.max(0,l.x);x<Math.min(N.gfx.W,l.x+l.w);x++)if(b[y*N.gfx.W+x]===l.encre)pixels++;
      return {...l,pixels,dansZone:l.x>=modele.x&&l.x+l.w<=modele.x+modele.w&&l.y>=modele.y&&l.y+l.h<=modele.bas};
     });
     const boutons=modele.actions?['continuer','rejouer','bilan'].map(k=>({nom:k,...modele.actions[k],wPt:modele.actions[k].w*N.gfx.PX,hPt:modele.actions[k].h*N.gfx.PX})):[];
     return {ecran,raccord,etat:N.game.etat(),resume:N.score.resume(),defis:N.score.defis,defiVague:N.score.defiVague,modele,lignes,boutons,hist,horsPalette,cyan:hist[N.pal.i('cyan')]+hist[N.pal.i('cyanPale')],err:window.__ERR,schemas:N.journal.dump().filter(e=>e.type==='defi').flatMap(e=>N.ids.valider('journal:defi',e)),journal:N.journal.dump(),tampon:{w:N.gfx.W,h:N.gfx.H,px:N.gfx.PX,data:Array.from(b)}};
    },{ecran,nom});
    const pixels=mesure.tampon.data;delete mesure.tampon.data;
    mesure.tampon.sha256=crypto.createHash('sha256').update(Uint8Array.from(pixels)).digest('hex');
    fs.writeFileSync(path.join(OUT,`${nom}-${ecran}.buf`),Uint8Array.from(pixels));
    await page.screenshot({path:path.join(OUT,`${nom}-${ecran}.png`)});p.captures.push(mesure);
   }
   p.ok=p.captures.every(c=>c.err.count===0&&c.schemas.length===0&&c.horsPalette===0&&c.cyan===0&&c.lignes.every(l=>l.echelle>=2&&l.dansZone&&l.pixels>0)&&c.boutons.every(b=>b.wPt>=44&&b.hPt>=44))&&erreurs.length===0&&JSON.stringify(p.jours[0].defis)!==JSON.stringify(p.jours[1].defis);
   p.raccordPret=p.captures.find(c=>c.ecran==='briefing').raccord;
  }catch(e){p.exception=String(e.stack||e);p.ok=false;}
  finally{await contexte.close();fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2));}
 }
 resultat.ok=resultat.profils.every(p=>p.ok&&p.raccordPret&&p.raccordDate);
 if(!resultat.ok)process.exitCode=1;
}catch(e){resultat.exception=String(e.stack||e);process.exitCode=1;}
finally{if(navigateur)await navigateur.close();if(serveur.listening)await new Promise(r=>serveur.close(r));fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2));}
console.log(JSON.stringify({ok:resultat.ok,profils:resultat.profils.map(p=>({nom:p.nom,ok:p.ok,raccordPret:p.raccordPret}))}));
