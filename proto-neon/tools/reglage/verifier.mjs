/* À lancer HORS du bac : cd proto-neon && node tools/reglage/verifier.mjs
   50 graines paysage, 5 par pilote portrait/bureau ; un seul Chromium, toujours muet.
   Aucun navigateur ni serveur n'a été lancé par l'auteur dans le bac. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {chromium, devices} from 'playwright';
import {partie} from './protocole.mjs';
import {analyser,bilan} from './analyse.mjs';
const ICI=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(ICI,'../..');
const noms=['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'];
const profils=[
  {nom:'paysage',options:{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}},graines:50},
  {nom:'portrait',options:{...devices['iPhone 13'],viewport:{width:390,height:844}},graines:5},
  {nom:'bureau',options:{viewport:{width:1440,height:900}},graines:5}
];
const bundle=fs.readFileSync(path.join(ROOT,'index.html'));
const hash=crypto.createHash('sha256').update(bundle).digest('hex');
const out=path.join(ICI,'playwright',hash.slice(0,12));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));}catch{res.writeHead(400);return res.end();}
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const types={'.html':'text/html','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.js':'text/javascript'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let browser;
const resultats={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:hash,cas:[],pixels:[],limite:'Chromium émulé, pas Safari physique'};
const save=()=>fs.writeFileSync(path.join(out,'sortie.json'),JSON.stringify(resultats,null,2)+'\n');
try{
  await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({args:['--mute-audio']});resultats.chromium=browser.version();
  for(const profil of profils)for(const pilote of noms)for(let graine=1;graine<=profil.graines;graine++){
    const ctx=await browser.newContext(profil.options),page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    try{
      await page.addInitScript(seed=>{window.__SEED=seed;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`,{waitUntil:'load'});
      const r=await page.evaluate(partie,{pilote,graine,observer:true});r.erreursConsole=errors;
      const nom=profil.nom+'-'+pilote+'-'+graine;
      fs.writeFileSync(path.join(out,nom+'.json.gz'),zlib.gzipSync(JSON.stringify(r)));
      const a=analyser(r);resultats.cas.push({...a,profil:profil.nom,recu:nom+'.json.gz'});
      if(graine===1){
        const pixels=await page.evaluate(()=>{
          const N=window.__N,g=N.gfx;
          const dessiner=()=>{g.origin(0,0);g.clear(0);N.game.draw();N.fx.draw();N.game.drawTop();g.present();
            const b=Array.from(g.buf()),histogramme=new Array(N.pal.C.length).fill(0);let horsPalette=0;for(const x of b){if(x<0||x>=N.pal.C.length)horsPalette++;else histogramme[x]++;}
            return{etat:N.game.etat(),w:g.W,h:g.H,px:g.PX,horsPalette,histogramme,tampon:b,err:window.__ERR.count};};
          const fin=dessiner();N.game.dbg.scene('calme');const calme=dessiner();return{fin,calme};
        });
        for(const [scene,p] of Object.entries(pixels)){
          fs.writeFileSync(path.join(out,nom+'-'+scene+'-tampon.json.gz'),zlib.gzipSync(JSON.stringify(p)));
          const {tampon,...mesure}=p;resultats.pixels.push({profil:profil.nom,pilote,scene,...mesure,sha256:crypto.createHash('sha256').update(Buffer.from(tampon)).digest('hex')});
        }
        await page.screenshot({path:path.join(out,nom+'-calme.png')});
      }
      resultats.resume=bilan(resultats.cas.filter(c=>c.profil==='paysage'));save();
      console.log(JSON.stringify({profil:profil.nom,pilote,graine,fin:a.fin,err:a.err,temps:a.temps}));
    }finally{await ctx.close();}
  }
  resultats.complete=resultats.cas.length===noms.length*profils.reduce((s,p)=>s+p.graines,0);
  resultats.zeroErreur=resultats.cas.every(c=>c.fin&&!c.err&&!c.erreursConsole.length)&&resultats.pixels.every(p=>!p.err&&!p.horsPalette);
  resultats.ciblesB=Object.values(resultats.resume.B).every(x=>x===true);
  if(!resultats.complete||!resultats.zeroErreur||!resultats.ciblesB)process.exitCode=1;
}catch(e){resultats.erreur=String(e.stack||e);process.exitCode=1;}
finally{save();if(browser)await browser.close();await new Promise(r=>server.close(r));}
