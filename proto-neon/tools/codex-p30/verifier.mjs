// HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p30/verifier.mjs
// Un seul Chromium muet, profils successifs ; aucun serveur/service distant.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,devices} from 'playwright';
import {OBSERVER_TETE,ANALYSE} from '../mesure/criteres/R-37-arsenal.mjs';
import {flashs} from '../mesure/criteres/R-13-photosensibilite.mjs';
import {encodeIndex} from '../mesure/png.mjs';
import {construits,r37,r03,r13} from './scenarios.mjs';
function maxGate(journal,comptes=false){const F=journal.filter(e=>e.type==='flash'&&(comptes?e.d._compte:e.d.accepte));let max=0;for(let i=0,j=0;i<F.length;i++){while(F[i].t-F[j].t>=1)j++;max=Math.max(max,i-j+1);}return max;}
const ICI=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(ICI,'../..');
const sonde=fs.readFileSync(path.join(ROOT,'tools/mesure/sonde.js'),'utf8');
const dossier=path.join(ICI,'navigateur');fs.mkdirSync(dossier,{recursive:true});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function bundle(mode){let h=html;
 for(const f of ['02-regles.js','70-joueuse.js','74-arsenal.js','75-cartes.js']){
   const source=fs.readFileSync(path.join(ROOT,'src',f),'utf8');if(!h.includes(source))throw Error('Reconstruire index.html : '+f);
   if(mode==='avant')h=h.replace(source,()=>fs.readFileSync(path.join(ICI,'avant',f),'utf8'));
 }
 const sprite=fs.readFileSync(path.join(ROOT,'src/40-sprites.js'),'utf8');
 if(mode!=='avec-correctif-sprite'){if(!h.includes(sprite))throw Error('Reconstruire index.html : 40-sprites.js');h=h.replace(sprite,()=>fs.readFileSync(path.join(ICI,'avant/40-sprites.js'),'utf8'));}
 if(mode==='avec-correctif-sprite'){
   const needle='d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) continue;';
   const correction='d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) { o.data[j] = NP; continue; }';
   if(h.includes(needle))h=h.replace(needle,correction);else if(!h.includes(correction))throw Error('Source de tête différente : contrôler le correctif avant de relancer');
 }
 return h;
}
const bundles=Object.fromEntries(['avant','apres','avec-correctif-sprite'].map(mode=>[mode,bundle(mode)]));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(bundles[url.searchParams.get('mode')]||bundles.apres);}
 const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'audio/mpeg');fs.createReadStream(file).pipe(res);
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
let browser;const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),bundles:Object.fromEntries(Object.entries(bundles).map(([k,h])=>[k,crypto.createHash('sha256').update(h).digest('hex')])),cas:[]};
const profils=[['paysage',{...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}],['portrait',{...devices['iPhone 13'],viewport:{width:390,height:844}}],['bureau',{viewport:{width:1440,height:900},hasTouch:false}]];
try{
 browser=await chromium.launch({args:['--mute-audio']});sortie.navigateur=browser.version();
 for(const [profil,opts]of profils)for(const mode of Object.keys(bundles)){
   const ctx=await browser.newContext(opts),erreurs=[];
   try{
    await ctx.route('**/*',route=>{const u=route.request().url();return /^(data:|blob:|http:\/\/127\.0\.0\.1:)/.test(u)?route.continue():route.abort();});
    const p=await ctx.newPage();p.on('pageerror',e=>erreurs.push(e.message));p.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
    await p.addInitScript(()=>{try{localStorage.clear();}catch{}window.__SEED=1;window.__DT=1/60;window.requestAnimationFrame=cb=>{window.__P30Frame=()=>cb(0);return 0;};window.cancelAnimationFrame=()=>{};});
    await p.addInitScript({content:sonde});
    const ouvrir=async()=>{await p.goto('http://127.0.0.1:'+server.address().port+'/index.html?journal=1&mode='+mode,{waitUntil:'load'});await p.evaluate(OBSERVER_TETE);await p.evaluate(a=>{window.__P30Analyse=new Function('N','S','M',a);},ANALYSE);};
    await ouvrir();const construit=await p.evaluate(construits);
    await ouvrir();
    await p.evaluate(()=>{window.__P30Captures=[];window.__P30Sauver=nom=>{const g=window.__N.gfx;window.__P30Captures.push({nom,W:g.W,H:g.H,b:Array.from(g.buf()),m:Array.from(window.__N.game.dbg.masque()),pal:window.__N.pal.C});};});
    const R37=await p.evaluate(r37);
    const captures=await p.evaluate(()=>window.__P30Captures);
    for(const t of captures){
      fs.writeFileSync(path.join(dossier,mode+'-'+profil+'-'+t.nom+'.png'),encodeIndex(t.W,t.H,t.b,t.pal.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),3));
      fs.writeFileSync(path.join(dossier,mode+'-'+profil+'-'+t.nom+'.json'),JSON.stringify(t));
    }
    await p.screenshot({path:path.join(dossier,mode+'-'+profil+'-ecran.png')});
    await ouvrir();const R03=await p.evaluate(r03);await ouvrir();const R13=await p.evaluate(r13);const seuil=await p.evaluate(()=>window.__N.R.criteres.R13);R13.compte=flashs(R13.images,seuil.aire,1/60);R13.gateMax=maxGate(R13.journal);R13.compteMax=maxGate(R13.journal,true);
    sortie.cas.push({profil,mode,construit,R37,R03,R13,erreurs});
    fs.writeFileSync(path.join(dossier,'resultats.json'),JSON.stringify(sortie,null,2)+'\n');console.log(profil,mode,'R37',R37.captures.map(c=>[c.gaine===c.bord,c.differences,c.proches]),'R13',R13.compte,'erreurs',erreurs.length);
   }finally{await ctx.close();}
 }
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(dossier,'resultats.json'),JSON.stringify(sortie,null,2)+'\n');}

const bilan=profils.map(([profil])=>{const lignes=sortie.cas.filter(c=>c.profil===profil),a=lignes.find(c=>c.mode==='avant'),b=lignes.find(c=>c.mode==='avec-correctif-sprite');return {profil,R37:b?.R37.captures.length===10&&b.R37.captures.every(c=>c.bord>0&&c.bord===c.gaine&&c.differences===0&&c.tete===c.sprite&&c.proches===0&&c.cyanHors<=.08),R13pixelsAvant:a?.R13.compte,R13pixelsApres:b?.R13.compte,R13gateAvant:a?.R13.gateMax,R13gateApres:b?.R13.gateMax,erreurs:lignes.map(c=>({mode:c.mode,jeu:c.R37.err.count+c.R03.err.count+c.R13.err.count,console:c.erreurs}))};});
sortie.bilan=bilan;sortie.dateParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});fs.writeFileSync(path.join(dossier,'resultats.json'),JSON.stringify(sortie,null,2)+'\n');
// Le critère complet conserve aussi les échecs R13 antérieurs : ce code de sortie ne les masque pas.
if(bilan.some(c=>!c.R37||c.R13pixelsApres?.maxParSeconde>3||c.R13gateApres>3||c.erreurs.some(e=>e.jeu||e.console.length)))process.exitCode=1;
