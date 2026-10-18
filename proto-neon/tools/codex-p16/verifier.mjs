/* Hors bac : node proto-neon/tools/codex-p16/verifier.mjs
   Un Chromium muet ; serveur Node sur port libre ; profils en série.
   Deux iframes du même navigateur permettent une comparaison de CHAQUE octet sans empreinte probabiliste.
   Le code de frame et les steps restent ceux de 90-boot ; enveloppes injectées uniquement dans le banc.
   --statique : contrôles de l'instrument seulement, ni serveur ni Chromium. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { Banc, options, mesurerCritere, reglesNode } from '../mesure/commun.mjs';
import * as R20 from '../mesure/criteres/R-20-performance.mjs';
import * as R30 from '../mesure/criteres/R-30-rejouabilite.mjs';
import { preparerBundles, routeBundle, ressources } from './preparer-bundles.mjs';
import { distribution, apparier } from './dispersion.mjs';
import { installerRAF } from './raf-controle.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,'../..'), REPO=path.dirname(ROOT);
const dest=path.join(HERE,process.argv.includes('--raccords')?'navigateur-p16c-raccords':'navigateur-p16c');
const save=(n,x)=>fs.writeFileSync(path.join(dest,n),JSON.stringify(x,null,2)+'\n');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const dateParis=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const ATTENTE=(await reglesNode()).perf.attenteP16;
const raccords=process.argv.includes('--raccords');
const criteresSha256=Object.fromEntries(['R-20-performance.mjs','R-30-rejouabilite.mjs'].map(n=>[n,sha(fs.readFileSync(path.join(HERE,'../mesure/criteres',n)))]));
criteresSha256['raf-controle.mjs']=sha(fs.readFileSync(path.join(HERE,'raf-controle.mjs')));
const {versions,manifeste}=preparerBundles(raccords);
const historique=path.join(HERE,'navigateur/resultats.json');
if(fs.existsSync(historique)&&!fs.existsSync(path.join(HERE,'navigateur/echec-0333.json'))) {
  const r=JSON.parse(fs.readFileSync(historique,'utf8'));
  if(r.erreur&&r.profils?.length===0)fs.copyFileSync(historique,path.join(HERE,'navigateur/echec-0333.json'));
}

const inject=`
    // Banc déterministe seulement : tout futur interlude garde aussi son panneau fixe.
    N.art.play=function(){return false;};
    var __profilP16=new URL(location.href).searchParams.get('profilage')==='1';
    var __stepP16=step, __mesP16={steps:{},modules:{},frames:[],actif:true};
    function __noteP16(table,k,t) { if(__mesP16.actif)(table[k]||(table[k]=[])).push(performance.now()-t); }
    if(__profilP16)step=function(k,f){var t=performance.now();try{return __stepP16(k,f);}finally{__noteP16(__mesP16.steps,k,t);}};
    if(__profilP16)for(var m of ['decor','ennemis','joueuse','colosse','hud','fx','scene','score','arsenal','butin','vol']) if(N[m]) for(var k of Object.keys(N[m])) if(/^draw/.test(k)&&typeof N[m][k]==='function')
      (function(o,k,label){var f=o[k];o[k]=function(){var t=performance.now();try{return f.apply(this,arguments);}finally{__noteP16(__mesP16.modules,label,t);}};})(N[m],k,m+'.'+k);
    window.__P16={profilage:__profilP16,mes:__mesP16,tick:function(ts){var t=performance.now();frame(ts);if(__mesP16.actif)__mesP16.frames.push(performance.now()-t);},
      raz:function(){__mesP16.steps={};__mesP16.modules={};__mesP16.frames=[];},
      setup:function(scene){localStorage.clear();S.jour=20261017;S.reglages.actions='doigts';N.intro.skip();N.reseed(7);N.game.reset(7);var ok=N.game.dbg.scene(scene);N.game.dbg.god(true);
        N.crt.preset('riche');N.crt.auto(false);S.reglages.ecran='riche';
        // Images fixes pour cette preuve déterministe ; les horloges des films sont murales.
        for(var nom of N.art.names())N.art.stop(nom);
        return {ok:ok,etat:N.game.etat(),phase:N.colosse.phase(),W:N.gfx.W,H:N.gfx.H};}};
  `;
const instrumenter=html=>{
  const marker='\nboot();})();';
  if(!html.includes(marker))throw Error('Point boot absent');
  return html.replace(marker,()=>inject+marker);
};
const versionsManuelles=Object.fromEntries(Object.entries(versions).map(([n,s])=>[n,sha(instrumenter(s))]));

function statique() {
  const d=distribution([1,2,3]);assert.equal(d.moyenne,2);assert.equal(d.p95,2.9);
  assert.equal(distribution([]).p95,null);
  assert.equal(apparier([1,2],[2,3]).deltaApresMoinsAvant.moyenne,1);
  assert.throws(()=>apparier([1],[]));
  for(const phase of ['avant','apres']) {
    const html=instrumenter(versions[phase]);
    new vm.Script(html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>')));
    assert.equal(ressources(versions[phase],routeBundle(phase)).manquants.length,0);
    assert.ok(versions[phase].includes('var CINE_BASE = "cine/";'));
    assert.ok(versions[phase].includes('var MUSIQUE_BASE = "musique/";'));
  }
  const a={t:0,reel:0,pas:0,r:0}, normal={t:1,reel:1,pas:120,r:1000};
  assert.equal(R20.ratiosTemps(a,normal).ancien,R20.ratiosTemps(a,normal).machine);
  const ralenti=R20.ratiosTemps(a,{...normal,t:.5});
  assert.equal(ralenti.ancien,.5); assert.equal(ralenti.machine,1);
  const perte=R20.ratiosTemps(a,{...normal,t:.5,reel:.9,pas:108});
  assert.equal(perte.machine,.9); assert.ok(perte.machine<.99);
  assert.equal(R20.ratiosTemps(normal,a),null);
  assert.equal(R20.comparerConditions2030([{phase:'dead',paused:false,qualite2030:1}]).ok,false);
  assert.equal(R20.comparerConditions2030([{phase:'play',paused:true,qualite2030:1}]).ok,false);
  assert.equal(R20.comparerConditions2030([{phase:'play',paused:false,qualite2030:1,t:0},{phase:'play',paused:false,qualite2030:2,t:1}]).ok,false);
  assert.equal(R20.comparerConditions2030([{phase:'play',paused:false,qualite2030:1,t:0},{phase:'play',paused:false,qualite2030:1,t:1}]).ok,true);
  assert.equal(R20.comparerConditions2030([{phase:'play',paused:false,qualite2030:1,t:0},{phase:'play',paused:false,qualite2030:1,t:0}]).ok,false);
  const ctx={};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext('('+installerRAF.toString()+')(); var vus=[]; requestAnimationFrame(function(){vus.push(1);requestAnimationFrame(function(){vus.push(2);});}); var annule=requestAnimationFrame(function(){vus.push(3);});cancelAnimationFrame(annule);',ctx);
  ctx.__R30RAF.avancer(0);assert.equal(JSON.stringify(ctx.vus),'[1]');
  ctx.__R30RAF.avancer(1);assert.equal(JSON.stringify(ctx.vus),'[1,2]');
  const flash=[{pas:1,t:0,type:'flash',d:{_image:1}}], flashDecale=[{pas:1,t:0,type:'flash',d:{_image:2}}];
  assert.equal(R30.comparer(R30.cle(flash,1),R30.cle(flashDecale,1)).egaux,false);
  const jeu=[{pas:1,t:0,type:'partie',d:{graine:7}},{pas:2,t:1,type:'kill',d:{id:3}}];
  const dessin=[jeu[0],{pas:1,t:.5,type:'hudBanniere',d:{x:4}},jeu[1]];
  assert.equal(R30.comparer(R30.cle(jeu,2,true),R30.cle(dessin,2,true)).egaux,true);
  assert.equal(R30.comparer(R30.cle(jeu,2),R30.cle(dessin,2)).egaux,false);
  const fautif=[...dessin]; fautif[2]={...jeu[1],d:{id:4}};
  assert.equal(R30.comparer(R30.cle(jeu,2,true),R30.cle(fautif,2,true)).egaux,false);
  assert.equal(R30.comparer(R30.cle(jeu,2,true),R30.cle([jeu[0]],2,true)).egaux,false);
  return {dateParis:dateParis(),normal:R20.ratiosTemps(a,normal),ralenti,perte,
    bundles:manifeste,criteresSha256,versionsManuelles,attente:ATTENTE,r30:'dessin exclu seulement entre modes ; altération et perte de kill refusées',ok:true};
}

async function diagnostic(page, reseau = []) {
  const frames = [];
  for (const f of page.frames()) {
    try {
      frames.push(await f.evaluate(() => {
        const N = window.__N, art = N && N.art;
        const noms = art && art.names ? art.names() : [];
        return { url: location.href, readyState: document.readyState,
          __P16: !!window.__P16, profilage: window.__P16?.profilage ?? null,
          instrument: window.__P16 ? { cles: Object.keys(window.__P16), images: window.__P16.mes.frames.length } : null,
          __N: !!N, modules: N ? Object.keys(N) : [], __S: !!window.__S,
          art: { present: !!art, ready: art?.ready ? art.ready() : null,
            noms: noms.length, manquants: noms.filter(n => !art.get(n)) },
          dimensions: N?.gfx ? { W: N.gfx.W, H: N.gfx.H } : null,
          etat: N?.game?.etat ? N.game.etat() : null,
          erreurs: window.__ERR || null,
          raf: String(window.requestAnimationFrame),
          ressources: performance.getEntriesByType('resource').map(r => ({ url: r.name, duree: r.duration, octets: r.transferSize })) };
      }));
    } catch (e) { frames.push({ url: f.url(), erreur: String(e) }); }
  }
  return { dateParis: dateParis(), frames, reseau: [...reseau], requetes404: reseau.filter(r => r.statut === 404) };
}

async function attendrePret(page, bilan, entree, direct = false) {
  try {
    if(entree) {entree.diagnosticInitial=await diagnostic(page,entree.reseau);save('resultats.json',bilan);}
    await page.waitForFunction(direct => {
      const ws = direct ? [window] : ['avant','apres'].map(id => document.getElementById(id)?.contentWindow);
      return ws.every(w => w && w.__P16 && w.__N && w.__S && w.__N.art?.ready());
    }, direct, { timeout: ATTENTE.delaiMs, polling: ATTENTE.pollingMs });
    const d = await diagnostic(page, entree?.reseau || []);
    const mauvais = d.frames.filter(f => f.__P16 && (f.art.manquants.length || f.erreurs?.count));
    if (mauvais.length) throw Error('Crochets prêts mais illustrations absentes ou erreurs de jeu : ' + JSON.stringify(mauvais));
    if (entree) entree.chargement = d;
  } catch (e) {
    const d = await diagnostic(page, entree?.reseau || []);
    if (entree) entree.diagnostic = d;
    bilan.diagnosticAttente = d;
    save('resultats.json', bilan);
    throw e;
  }
}
if(process.argv.includes('--statique')) {
  fs.writeFileSync(path.join(HERE,raccords?'instrument-statique-raccords.json':'instrument-statique.json'),JSON.stringify(statique(),null,2)+'\n');
  console.log('Instrument : contrôles statiques réussis (aucune mesure navigateur).');
} else {
  fs.mkdirSync(dest,{recursive:true});
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://local');
    if(u.pathname==='/comparaison') {res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><body style="margin:0"></body>');}
    const match=/^\/proto-neon\/__(avant|apres)\.html$/.exec(u.pathname);
    if(match) {
      const html=versions[match[1]];
      res.setHeader('Content-Type','text/html');return res.end(u.searchParams.has('manuel')?instrumenter(html):html);
    }
    let f;try{f=path.resolve(REPO,'.'+decodeURIComponent(u.pathname));}catch{res.writeHead(400);return res.end();}
    if(!f.startsWith(REPO+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
    const types={'.html':'text/html','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'};
    res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
  });
  const bilan={dateParis:dateParis(),raccords,bundles:manifeste,criteresSha256,versionsManuelles,instrumentSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),versions:Object.fromEntries(Object.entries(versions).map(([k,v])=>[k,sha(v)])),limite:'Chromium émulé, pas Safari réel. Profilage instrumenté distinct du coût officiel R-20.',instrument:statique(),profils:[],r20Apparie:[],criteres:[]};
  let browser;
  try {
    await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
    const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({args:['--mute-audio']});
    bilan.navigateur=browser.version();
    for(const mode of ['couts','profilage'])for(const [profil,device,width,height] of [['paysage',devices['iPhone 13 landscape'],844,390],['portrait',devices['iPhone 13'],390,844],['bureau',{},1440,900]]) {
      for(const scene of ['charge','v5','vol','boss3']) {
        const ctx=await browser.newContext({...device,viewport:{width,height},screen:{width,height}}), page=await ctx.newPage(), erreurs=[],reseau=[];
        const entree={profil,scene,mode,erreurs,reseau};bilan.profils.push(entree);save('resultats.json',bilan);
        page.on('response',r=>{if(r.status()>=400)reseau.push({url:r.url(),statut:r.status(),frame:r.frame().url()});});
        page.on('requestfailed',r=>reseau.push({url:r.url(),echec:r.failure(),frame:r.frame()?.url()}));
        try {
        page.on('pageerror',e=>erreurs.push(String(e)));
        page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
        await page.addInitScript({content:'window.__distributionP16='+distribution.toString()});
        await page.addInitScript(()=>{window.__DT=1/60;window.__SEED=7;window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
        await page.goto(base+'/comparaison');
        const reponsesBundles=Promise.all(['avant','apres'].map(phase=>page.waitForResponse(r=>new URL(r.url()).pathname===routeBundle(phase),{timeout:ATTENTE.delaiMs})));
        // Éviter une rejection non gérée si la navigation elle-même échoue avant cet await.
        reponsesBundles.catch(()=>{});
        await page.evaluate(({base,width,height,mode})=>{
          for(const phase of ['avant','apres']) {const f=document.createElement('iframe');f.id=phase;f.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;border:0`;f.src=base+'/proto-neon/__'+phase+'.html?manuel=1&journal=1&profilage='+(mode==='profilage'?'1':'0');document.body.append(f);}
        },{base,width,height,mode});
        entree.empreintesRecues={};
        for(const r of await reponsesBundles) {
          const phase=new URL(r.url()).pathname.includes('__avant.')?'avant':'apres';
          const empreinte=sha(await r.body());
          entree.empreintesRecues[phase]={url:r.url(),statut:r.status(),sha256:empreinte,attendue:versionsManuelles[phase]};
          assert.equal(empreinte,versionsManuelles[phase],'Le bundle reçu diffère du bundle préparé : '+phase);
        }
        await attendrePret(page,bilan,entree);
        const preparer=await page.evaluate(scene=>Object.fromEntries(['avant','apres'].map(id=>[id,document.getElementById(id).contentWindow.__P16.setup(scene)])),scene);
          const resultat=await page.evaluate(()=>{
          const A=document.getElementById('avant').contentWindow,B=document.getElementById('apres').contentWindow;
          const config=B.__N.R.perf.imageP16, images=config.images, chauffe=config.chauffeImages;
          const r={images,chauffe,octetsIndex:0,octetsSortie:0,imagesIndexDifferentes:0,imagesSortieDifferentes:0,premier:null,etats:{avant:{},apres:{}}};
          const diff=(a,b)=>{if(a.length!==b.length)return Math.max(a.length,b.length);let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;};
          for(let i=0;i<images+chauffe;i++) {
            if(i%2===0){A.__P16.tick(i*1000/60);B.__P16.tick(i*1000/60);}else{B.__P16.tick(i*1000/60);A.__P16.tick(i*1000/60);}
            if(i===chauffe-1){A.__P16.raz();B.__P16.raz();}
            if(i<chauffe)continue;
            for(const [nom,w] of [['avant',A],['apres',B]]) {const etat=w.__N.game.etat();r.etats[nom][etat]=(r.etats[nom][etat]||0)+1;}
            const ai=A.__N.gfx.buf(),bi=B.__N.gfx.buf();
            const ac=A.__N.gfx.canvas(),bc=B.__N.gfx.canvas();
            const ar=ac.getContext('2d').getImageData(0,0,ac.width,ac.height).data,br=bc.getContext('2d').getImageData(0,0,bc.width,bc.height).data;
            const di=diff(ai,bi),dr=diff(ar,br);r.octetsIndex+=di;r.octetsSortie+=dr;
            if(di)r.imagesIndexDifferentes++;if(dr)r.imagesSortieDifferentes++;
            if((di||dr)&&!r.premier)r.premier={image:i-chauffe,index:di,sortie:dr};
          }
          const stats=window.__distributionP16;
          r.mondes={};for(const [nom,w] of [['avant',A],['apres',B]]) {
            const p=w.__P16.mes;
            r.mondes[nom]={etat:w.__N.game.etat(),horloge:w.__N.horloge.etat(),dbg:w.__N.game.dbg(),err:w.__ERR,
              journal:w.__N.journal.dump(),coutsBruts:p.frames,frame:stats(p.frames),steps:Object.entries(p.steps).map(([nom,a])=>({nom,...stats(a)})).sort((a,b)=>b.total-a.total),
              modules:Object.entries(p.modules).map(([nom,a])=>({nom,...stats(a)})).sort((a,b)=>b.total-a.total)};
          }
          const signature=m=>JSON.stringify([m.etat,m.horloge,m.dbg,m.journal]);
          r.logiqueIdentique=signature(r.mondes.avant)===signature(r.mondes.apres);
          return r;
        });
        Object.assign(entree,{preparer,...resultat});
        entree.coutsApparies=apparier(resultat.mondes.avant.coutsBruts,resultat.mondes.apres.coutsBruts);
        if(mode==='couts') {
          const seuil=(await reglesNode()).criteres.R20.x1;
          const p95=entree.coutsApparies.apres.p95;
          bilan.r20Apparie.push({profil,scene,seuilX1:seuil,p95,coutDansBudget:p95!==null&&p95<=seuil,
            protocole:'Frame réelle non enveloppée, AB/BA dans la même page ; preuve complémentaire, ni CPU ×4 ni 2030 ni Safari.',
            ...entree.coutsApparies});
        }
        save('resultats.json',bilan);
        const capture=path.join(dest,mode+'-'+profil+'-'+scene+'.png');
        await page.screenshot({path:capture,timeout:ATTENTE.delaiMs});entree.capture=capture;
        if(!preparer.avant.ok||!preparer.apres.ok||!resultat.logiqueIdentique||resultat.octetsIndex||resultat.octetsSortie||erreurs.length||reseau.some(r=>r.statut>=400)||Object.values(resultat.mondes).some(m=>m.err.count))process.exitCode=1;
        console.log(profil,scene,resultat.octetsIndex,resultat.octetsSortie);
        if(scene==='vol'&&mode==='couts') {
          // La fixture VOL revient naturellement au jeu avant 600 images : compléter avec des cycles
          // déclarés, sans modifier sa durée ni son pas. Les transitions sont contrôlées aussi.
          const soutenu=await page.evaluate(()=>{
            const A=document.getElementById('avant').contentWindow,B=document.getElementById('apres').contentWindow,cfg=B.__N.R.perf.imageP16;
            const r={imagesVol:0,transitions:0,rearmements:0,octetsIndex:0,octetsSortie:0,etatsIdentiques:true,preparation:[A.__P16.setup('vol'),B.__P16.setup('vol')],couts:{avant:[],apres:[]}};
            A.__P16.raz();B.__P16.raz();
            let volVu=false;
            const diff=(a,b)=>{if(a.length!==b.length)return Math.max(a.length,b.length);let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;};
            for(let i=0;i<2*(cfg.images+cfg.chauffeImages)&&r.imagesVol<cfg.images;i++) {
              if(volVu&&(A.__N.game.etat()!=='vol'||B.__N.game.etat()!=='vol')){r.rearmements++;r.preparation.push(A.__P16.setup('vol'),B.__P16.setup('vol'));volVu=false;}
              if(i%2===0){A.__P16.tick(i*1000/60);B.__P16.tick(i*1000/60);}else{B.__P16.tick(i*1000/60);A.__P16.tick(i*1000/60);}
              if(A.__N.game.etat()==='vol'&&B.__N.game.etat()==='vol')volVu=true;
              if(i<cfg.chauffeImages)continue;
              r.octetsIndex+=diff(A.__N.gfx.buf(),B.__N.gfx.buf());
              const a=A.__N.gfx.canvas(),b=B.__N.gfx.canvas();r.octetsSortie+=diff(a.getContext('2d').getImageData(0,0,a.width,a.height).data,b.getContext('2d').getImageData(0,0,b.width,b.height).data);
              const ea=A.__N.game.etat(),eb=B.__N.game.etat();if(ea!==eb)r.etatsIdentiques=false;
              if(ea==='vol'&&eb==='vol'){r.imagesVol++;r.couts.avant.push(A.__P16.mes.frames.at(-1));r.couts.apres.push(B.__P16.mes.frames.at(-1));}else r.transitions++;
            }
            r.erreurs=[A.__ERR,B.__ERR];r.fin=[A.__N.game.etat(),B.__N.game.etat()];
            r.horloges=[A.__N.horloge.etat(),B.__N.horloge.etat()];r.journaux=[A.__N.journal.dump(),B.__N.journal.dump()];
            r.logiqueIdentique=JSON.stringify([r.fin[0],r.horloges[0],r.journaux[0]])===JSON.stringify([r.fin[1],r.horloges[1],r.journaux[1]]);
            return r;
          });
          bilan.profils.at(-1).volSoutenu=soutenu;save('resultats.json',bilan);
          if(soutenu.imagesVol!==resultat.images||soutenu.octetsIndex||soutenu.octetsSortie||!soutenu.etatsIdentiques||!soutenu.logiqueIdentique||soutenu.preparation.some(p=>!p.ok)||soutenu.erreurs.some(e=>e.count))process.exitCode=1;
        }
        } catch(e) {entree.erreur=String(e.stack||e);entree.diagnostic=await diagnostic(page,reseau);process.exitCode=1;save('resultats.json',bilan);}
        finally {await ctx.close();}
      }
    }
    // Témoin réel sans ralenti, même boucle : pas de neutralisation des effets.
    {
      const ctx=await browser.newContext({...devices['iPhone 13 landscape'],viewport:{width:844,height:390}}),page=await ctx.newPage();
      await page.addInitScript(()=>{window.__DT=1/60;window.__SEED=7;window.requestAnimationFrame=()=>0;});
      await page.goto(base+routeBundle('apres')+'?manuel=1&journal=1');
      await attendrePret(page,bilan,null,true);
      const temoin=await page.evaluate(()=>{
        const N=window.__N,h=N.horloge;window.__P16.setup('calme');
        const snapshot=r=>({t:h.t(),reel:h.reel(),pas:h.pas(),r});
        let ralentis=0;const avancer=h.avancer;
        h.avancer=function(){const dt=avancer.apply(this,arguments);if(dt!==h.H)ralentis++;return dt;};
        const a=snapshot(0);for(let i=0;i<120;i++)window.__P16.tick(i*1000/60);
        const b=snapshot(2000);h.avancer=avancer;
        return {a,b,ralentis,etat:N.game.etat(),journal:N.journal.dump(),err:window.__ERR};
      });
      temoin.ratios=R20.ratiosTemps(temoin.a,temoin.b);
      temoin.egalite=temoin.ralentis===0&&temoin.ratios.ancien===temoin.ratios.machine;
      bilan.temoinSansRalenti=temoin;save('temoin-sans-ralenti.json',temoin);if(!temoin.egalite||temoin.err.count)process.exitCode=1;
      await ctx.close();
    }
    await browser.close();browser=null;
    // Banc officiel non enveloppé : un seul Chromium, ouvert APRÈS la fermeture du précédent.
    for(const phase of ['avant','apres']) {
      const opts={...options(['--sans-cache']),url:base+routeBundle(phase),snake2030:base+'/snake2030/index.html',sortie:path.join(dest,phase)};
      const banc=new Banc(opts);
      try {await banc.demarrer();for(const mod of [R20,R30]){const r=await mesurerCritere(banc,mod);bilan.criteres.push({phase,...r});save(phase+'-'+mod.meta.id+'.json',r);if(['echec','erreur','non-mesurable','partiel'].includes(r.statut))process.exitCode=1;}}
      finally {await banc.fermer();}
    }
  } catch(e) {bilan.erreur=String(e.stack||e);process.exitCode=1;}
  finally {if(browser)await browser.close();server.close();save('resultats.json',bilan);}
  console.log('Reçu navigateur : '+path.join(dest,'resultats.json'));
}
