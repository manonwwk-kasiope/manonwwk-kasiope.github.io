// HORS BAC SEULEMENT : cd proto-neon && node tools/codex-p34/verifier.mjs
// Serveur de fichiers local ; aucune connexion extérieure, un seul Chromium muet.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
import {partie} from '../reglage/protocole.mjs';
const HERE=path.dirname(new URL(import.meta.url).pathname),ROOT=path.resolve(HERE,'../..');
const OUT=path.join(HERE,'navigateur');fs.mkdirSync(OUT,{recursive:true});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,'sources-recues.json.gz'))));
for(const [f,s] of snapshot)assert.equal(fs.readFileSync(path.join(ROOT,'src',f),'utf8'),s,'Source changée : '+f);
const bundle=fs.readFileSync(path.join(ROOT,'index.html'));
for(const [f,s] of snapshot)assert.ok(bundle.toString().includes('/* ===== '+f+' ===== */\n'+s),'Bundle périmé : '+f);
const serveur=http.createServer((req,res)=>{
  const f=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900}}]];
const result={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundleSha256:sha(bundle),limite:'Chromium émulé, pas Safari physique. Échantillon exploratoire, aucune validation des proportions sur 50 graines.',cas:[]};
let browser;
try{
  await new Promise((ok,ko)=>{serveur.once('error',ko);serveur.listen(0,'127.0.0.1',ok);});
  browser=await chromium.launch({args:['--mute-audio']});result.chromium=browser.version();
  // 80 cas paysage correspondant à la VM ; 5 graines par pilote pour les deux autres profils.
  for(const [profil,opts] of profils)for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=(profil==='paysage'?10:5);graine++){
    const ctx=await browser.newContext(opts),p=await ctx.newPage(),errors=[];
    try{
      p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await ctx.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();});
      await p.addInitScript(seed=>{window.__SEED=seed;window.__DT=1/60;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};},graine);
      await p.goto('http://127.0.0.1:'+serveur.address().port+'/index.html?journal=1');
      await p.evaluate(()=>{window.__S.view.safe={l:0,t:0,r:0,b:0};});
      // Fonction du banc original, passée telle quelle ; observer=true relève les vrais états à chaque pas.
      const r=await p.evaluate('('+partie.toString()+')('+JSON.stringify({pilote,graine,observer:true})+')');
      const pixels=await p.evaluate(()=>{
        const N=window.__N;N.game.draw();if(N.fx?.draw)N.fx.draw();if(N.game.drawTop)N.game.drawTop();N.gfx.present();
        const b=Array.from(N.gfx.buf()),histogramme={};for(const v of b)histogramme[v]=(histogramme[v]||0)+1;
        return {w:N.gfx.W,h:N.gfx.H,indices:b,histogramme,horsPalette:b.filter(v=>v<0||v>=N.pal.C.length).length,etat:N.game.etat(),err:window.__ERR};
      });
      const fichier=profil+'-'+pilote+'-'+graine+'.json.gz';fs.writeFileSync(path.join(OUT,fichier),zlib.gzipSync(JSON.stringify({r,pixels,errors})));
      const item={profil,pilote,graine,tempsJeu:r.tempsJeu,vague:r.vague,score:r.score,fin:r.fin,raison:r.raison,err:Math.max(r.err,pixels.err.count),errors,pixels:{w:pixels.w,h:pixels.h,horsPalette:pixels.horsPalette,histogramme:pixels.histogramme,sha256:sha(Buffer.from(pixels.indices))},recu:fichier};
      if(profil==='paysage'){
        const actuel=JSON.parse(fs.readFileSync(path.join(HERE,'actuel.json'))),c=actuel.cas.find(c=>c.pilote===pilote&&c.graine===graine);
        const ref=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,c.recu))));
        item.equivalenceVM={champs:['tempsJeu','tempsCombat','tempsSimule','vague','score','raison'].filter(k=>r[k]!==ref[k]),journalExact:JSON.stringify(r.journal)===JSON.stringify(ref.journal)};
      }
      result.cas.push(item);if(graine===1)await p.screenshot({path:path.join(OUT,profil+'-'+pilote+'.png')});
      fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(result,null,2)+'\n');
      console.log(JSON.stringify(item));
    }finally{await ctx.close();}
  }
}catch(e){result.erreur=String(e.stack||e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>serveur.close(ok));}
result.termine=result.cas.length===160;
result.zeroErreur=result.termine&&result.cas.every(c=>!c.err&&!c.errors.length&&!c.pixels.horsPalette);
if(!result.zeroErreur)process.exitCode=1;
fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(result,null,2)+'\n');
