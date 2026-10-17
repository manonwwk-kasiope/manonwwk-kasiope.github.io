/* À lancer hors bac : node proto-neon/tools/codex-p1b/verifier.mjs
   Serveur HTTP sur port libre ; un seul Chromium, muet ; profils successifs.
   Aucun registre simulé ici : le bundle réellement construit est le seul objet mesuré. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),profils:[]};
let browser;
try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({args:['--mute-audio']});
  out.navigateur=browser.version();
  for(const [nom,width,height,mobile] of [['paysage',844,390,true],['portrait',390,844,true],['bureau',1440,900,false]]) {
    const ctx=await browser.newContext({...mobile?devices['iPhone 13']:{},viewport:{width,height},hasTouch:mobile,isMobile:mobile});
    try {
      const page=await ctx.newPage(),erreurs=[];
      page.on('pageerror',e=>erreurs.push(String(e)));
      page.on('console',m=>{if(m.type()==='error') erreurs.push(m.text());});
      await page.addInitScript(()=>{window.__SEED=2975;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`,{waitUntil:'load'});
      await page.addScriptTag({path:path.join(here,'scenes.js')});
      const result=await page.evaluate(()=>{
        const N=window.__N,T=window.__P1B;
        const manquants=T.ids.filter(id=>!N.ids.cartes.includes(id));
        const result={manquants,scenes:[],endurances:[],pixels:[],flashs:[],erreurs:window.__ERR};
        if(manquants.length) {result.statut='bloqué : registre absent';return result;}
        for(const id of T.ids) {
          const avant=T.scene(id,false),apres=T.scene(id,true);
          result.scenes.push({id,avant,apres});
          // Dessin complet : pas de masque nul interprété comme une réussite.
          N.gfx.clear(0); N.outils.origineMonde(); N.game.draw();N.fx.draw();N.game.drawTop();
          const b=N.gfx.buf(),m=N.game.dbg.masque(),valide=m&&m.length===b.length&&m.some(v=>v!==0);
          let horsPalette=0,cyanHors=0,empreinte=2166136261;
          for(let i=0;i<b.length;i++) {const c=b[i];if(c>=N.pal.C.length)horsPalette++;
            if(valide&&(c===N.pal.i('cyan')||c===N.pal.i('cyanPale'))&&!(m[i]>=1&&m[i]<=4))cyanHors++;
            empreinte=Math.imul(empreinte^c,16777619);}
          result.pixels.push({id,w:N.gfx.W,h:N.gfx.H,horsPalette,cyanHorsJoueuse:valide?cyanHors:null,
            masque:valide?'réel':'indisponible, à vérifier',empreinte:empreinte>>>0});
          result.endurances.push(T.endurance(id,true));
        }
        result.cartes=T.cartes();result.controle=T.controle();
        // Mesure de sortie réelle des anneaux sur quatre secondes, pas un compteur d'appels.
        // Les tentatives sont volontairement serrées pour éprouver flashGate ; aucun hit/kill ici.
        T.preparer();N.cartes.choisir('onde');
        let precedent=null,montees=[],maxFenetre=0,portillonRefuse=0;
        const L=N.pal.L||[0.002,0.006,0.012,0.041,0.024,0.240,0.438,0.555,0.873,0.457,0.679,0.281,0.967,0.277,0.061,0.002];
        const seuil=N.R.criteres.R13.aire,budget=N.R.criteres.R13.flashsParSeconde;
        for(let f=0;f<240;f++) {
          const aire=N.gfx.W*N.gfx.H;
          const permis=N.fx.flashGate(aire);
          if(!permis)portillonRefuse++;
          // Ne dessiner l'aplat d'épreuve que si le vrai limiteur l'admet.
          N.gfx.origin(0,0);N.gfx.clear(0);if(permis)N.gfx.rect(0,0,N.gfx.W,N.gfx.H,N.pal.i('os'));
          const actuel=N.gfx.buf().slice();let hausse=0;
          if(precedent)for(let i=0;i<actuel.length;i++)if(L[actuel[i]]-L[precedent[i]]>=0.1)hausse++;
          if(hausse/aire>seuil)montees.push(f/60);
          const recents=montees.filter(t=>f/60-t<1);maxFenetre=Math.max(maxFenetre,recents.length);
          precedent=actuel;N.S.frame++;N.fx.update(1/60);
        }
        result.flashs.push({type:'portillon global, sortie pixel d’une mire d’épreuve',maxFenetre,budget,portillonRefuse,montees,conforme:maxFenetre<=budget});
        // Les cinq effets : trames réelles, flashes allumés puis coupés.
        for(const id of T.ids)for(const active of [true,false]) {
          T.scene(id,true);N.fx.setFlash(active);
          let last=null,events=[],max=0,hors=0;
          for(let f=0;f<240;f++) {
            T.pas(2);N.gfx.clear(0);N.outils.origineMonde();N.arsenal.draw();N.fx.draw();
            const b=N.gfx.buf().slice();let hausse=0;
            for(let i=0;i<b.length;i++){if(b[i]>=N.pal.C.length)hors++;if(last&&L[b[i]]-L[last[i]]>=0.1)hausse++;}
            if(hausse/b.length>seuil)events.push(f/60);
            max=Math.max(max,events.filter(t=>f/60-t<1).length);last=b;
          }
          result.flashs.push({id,active,maxFenetre:max,budget,horsPalette:hors,conforme:max<=budget&&hors===0});
        }
        N.fx.setFlash(true);
        result.conforme=result.scenes.every(s=>s.apres.degats.some((d,i)=>d>s.avant.degats[i])&&!s.apres.err)
          &&result.endurances.every(e=>e.tempsJeu>=60&&!e.err&&!e.perdusBus)
          &&result.pixels.every(p=>p.horsPalette===0&&p.cyanHorsJoueuse===0)
          &&result.cartes.textesConformes&&!result.cartes.schemaMods.length&&result.flashs.every(f=>f.conforme)&&!window.__ERR.count;
        return result;
      });
      const fichier=path.join(here,`${nom}.png`);
      await page.screenshot({path:fichier});
      out.profils.push({nom,width,height,...result,console:erreurs,capture:path.basename(fichier)});
      fs.writeFileSync(path.join(here,'playwright.json'),JSON.stringify(out,null,2)+'\n');
    } finally {await ctx.close();}
  }
  out.conforme=out.profils.length===3&&out.profils.every(p=>p.conforme&&!p.console.length);
  if(!out.conforme)process.exitCode=1;
} catch(e) {out.erreur=String(e.stack||e);process.exitCode=1;}
finally {if(browser)await browser.close();await new Promise(resolve=>server.listening?server.close(resolve):resolve());
  fs.writeFileSync(path.join(here,'playwright.json'),JSON.stringify(out,null,2)+'\n');}
