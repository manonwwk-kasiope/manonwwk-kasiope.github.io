/* HORS BAC : cd proto-neon && node tools/codex-p43/verifier.mjs
   LOCAL SANS NAVIGATEUR : node tools/codex-p43/verifier.mjs --statique
   Un serveur HTTP local port libre, un seul Chromium muet, profils en série.
   Aucun accès externe ; aucune horloge Playwright, aucun __DT ni simulation.
   Sortie 0 = étalons validés + R-22/R-33 complets OK + zéro erreur + bureau OK.
   Sortie 1 conserve les échecs et les exceptions chiffrés, sans relancer les essais. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { Banc, Session, options, mesurerCritere, dateParis, PROTO } from '../mesure/commun.mjs';
import { validerInstrument } from '../mesure/etalon-tactile.mjs';
import { installerTrace, horlogeReelle, latence } from '../mesure/tactile.mjs';
import { preparerJeu, Doigts } from '../mesure/gestes.mjs';
import * as R22 from '../mesure/criteres/R-22-commandes.mjs';
import * as R33 from '../mesure/criteres/R-33-gestes-surs.mjs';
if (process.argv.includes('--statique')) { await import('./vm.mjs'); }
else {
  const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.join(HERE,'navigateur');
  fs.mkdirSync(OUT,{recursive:true});
  const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
  const html=fs.readFileSync(path.join(PROTO,'index.html'));
  const srcHash=()=>sha(fs.readdirSync(path.join(PROTO,'src')).filter(n=>n.endsWith('.js')).sort().map(n=>n+'\n'+fs.readFileSync(path.join(PROTO,'src',n),'utf8')).join('\n'));
  const resultat={dateParis:dateParis(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),bundleSha256:sha(html),sourcesSha256:srcHash(),
    instrumentSha256:sha(['../mesure/gestes.mjs','../mesure/tactile.mjs','../mesure/etalon-tactile.mjs','../mesure/criteres/R-22-commandes.mjs','../mesure/criteres/R-33-gestes-surs.mjs','./verifier.mjs'].map(f=>fs.readFileSync(new URL(f,import.meta.url),'utf8')).join('\n')),
    limite:'Chromium émulé en onglet ; Safari physique et gestes système iOS restent à vérifier.',profils:[],conforme:false};
  const save=()=>fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(resultat,null,2)+'\n');
  const server=http.createServer((req,res)=>{
    try {
      const u=new URL(req.url,'http://local'),f=path.resolve(PROTO,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
      if(!f.startsWith(PROTO+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
      const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'}[path.extname(f)]||'application/octet-stream';
      const stat=fs.statSync(f),range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
      if(range){const start=+range[1],end=range[2]?+range[2]:stat.size-1;res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});return fs.createReadStream(f,{start,end}).pipe(res);}
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Content-Length':stat.size});fs.createReadStream(f).pipe(res);
    }catch{res.writeHead(400);res.end();}
  });
  let browser;
  try {
    await new Promise((ok,ko)=>{server.once('error',ko);server.listen(0,'127.0.0.1',ok);});
    browser=await chromium.launch({headless:true,args:['--mute-audio','--disable-background-networking']});
    resultat.navigateur=browser.version();resultat.deviceReference=devices['iPhone 13'].name||'iPhone 13';
    const url=`http://127.0.0.1:${server.address().port}/index.html`;
    for(const profil of ['paysage','portrait','bureau']) {
      const dir=path.join(OUT,profil);fs.mkdirSync(dir,{recursive:true});
      const banc=new Banc({...options([]),url,sortie:dir,cache:false,rapide:false,profilTactile:profil});
      banc.nav=browser;banc.empreinte=resultat.bundleSha256;
      banc.enfant=function(){const e=Object.create(this);e.sessions=new Set();return e;};
      const P={profil,instrument:null,criteres:[],preuves:[]};resultat.profils.push(P);save();
      // Partage du navigateur uniquement ; chaque session possède un contexte frais et une horloge réelle.
      banc.ouvrir=async function(p=profil,o={}){
        if(o.dt!==undefined||o.nodraw)throw Error('temps imposé / rendu absent interdits');
        const s=new Session(this,p,o);await s.ouvrir();this.sessions.add(s);
        s.toutesErreurs=[...s.console];s.page.on('console',m=>{if(m.type()==='error')s.toutesErreurs.push(m.text());});
        if(P.instrument){s.instrumentTactile=P.instrument;s.contratTactile=P.instrument.mode;}
        return s;
      };
      const s=await banc.ouvrir();
      try {
        if(profil!=='bureau'){
          P.instrument=await validerInstrument(s);save();
          fs.writeFileSync(path.join(dir,'instrument.json'),JSON.stringify(P.instrument,null,2)+'\n');
          s.instrumentTactile=P.instrument;s.contratTactile=P.instrument.mode;
          const prep=await preparerJeu(s);
          if(!prep.ok)P.preparation=prep;
          else {
            const d=await new Doigts(s).init(),V=s.page.viewportSize();
            await s.eval(()=>{const N=window.__N;N.game.dbg.scene('calme');N.game.dbg.god(true);const A=N.outils.A;N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});window.__TACTILE_P43.images=[];window.__TRACE_DOIGTS=[];});
            const id=await d.poser(V.width*.3,V.height*.5);await d.bouger(id,V.width*.3+30,V.height*.5);await d.attendre(350);
            const debut=await s.eval(()=>window.__TRACE_DOIGTS.length);
            await d.bouger(id,V.width*.3,V.height*.5-30);await d.attendre(450);
            const preuve=await s.eval(()=>({images:window.__TACTILE_P43.images,evenements:window.__TRACE_DOIGTS,journal:window.__N.journal.dump(),err:window.__ERR}));
            const evt=preuve.evenements.slice(debut).find(e=>e.type==='touchmove');
            const mesure=latence(evt,preuve.images,-Math.PI/2,4*Math.PI/180),horloge=horlogeReelle(preuve.images);
            // Ce cas mesure le JEU : un échec de cap n'invalide pas l'étalon indépendant.
            P.preuveJeu={mesure,horloge,preuve};await d.toutLever();
          }
        } else {
          await s.eval(()=>{const N=window.__N;N.intro.skip();N.game.dbg.scene('calme');N.game.dbg.god(true);const A=N.outils.A;N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});});
          await s.eval(installerTrace);await s.page.keyboard.down('ArrowRight');await s.page.waitForTimeout(350);await s.page.keyboard.up('ArrowRight');
          const avant=await s.eval(()=>({...window.__S.player}));await s.page.keyboard.down('ArrowUp');await s.page.waitForTimeout(350);await s.page.keyboard.up('ArrowUp');
          const apres=await s.eval(()=>({ang:window.__S.player.ang,vise:window.__S.player.angVise,x:window.__S.player.x,y:window.__S.player.y}));
          const images=await s.eval(()=>window.__TACTILE_P43.images);
          P.bureau={avant,apres,horloge:horlogeReelle(images),ok:Math.abs(Math.atan2(Math.sin(apres.ang+Math.PI/2),Math.cos(apres.ang+Math.PI/2)))<4*Math.PI/180&&Math.hypot(apres.x-avant.x,apres.y-avant.y)>0};
        }
        const tampon=await s.tampon(false);fs.writeFileSync(path.join(dir,'tampon.bin'),tampon.buf);
        P.tampon={W:tampon.W,H:tampon.H,sha256:sha(tampon.buf),nonVide:tampon.buf.some(v=>v!==0),palette:[...new Set(tampon.buf)]};
        P.erreurs=await s.bilanErreurs();P.erreurs.consoleCompletes=s.toutesErreurs;
        await s.capture('jeu');await s.captureTampon('jeu');
      } catch(e){P.exception=String(e.stack||e);}
      finally{await s.fermer();save();}
      if(profil!=='bureau')for(const mod of [R22,R33]){
        // mesurerCritere crée une vue enfant héritant ouvrir ; aucun deuxième Chromium.
        const wrapper={meta:mod.meta,mesurer:async(b,res)=>{
          if(!P.instrument?.ok)return res.nonMesurable('instrument tactile','étalon indépendant non validé ; voir instrument.json');
          try{await mod.mesurer(b,res);}finally{
            for(const active of b.sessions){
              const erreurs=await active.bilanErreurs();
              res.verifie('zéro erreur du jeu et de la console',erreurs,0,erreurs.zero&&active.toutesErreurs.length===0,{consoleCompletes:active.toutesErreurs});
              if(active.preuvesGestes)fs.writeFileSync(path.join(dir,mod.meta.id+'-gestes.json'),JSON.stringify(active.preuvesGestes,null,2)+'\n');
              const brut=await active.eval(()=>({journal:window.__N.journal.dump(),evenements:window.__TRACE_DOIGTS,images:window.__TACTILE_P43?.images,err:window.__ERR}));
              fs.writeFileSync(path.join(dir,mod.meta.id+'-brut.json'),JSON.stringify(brut,null,2)+'\n');
              const t=await active.tampon(false);fs.writeFileSync(path.join(dir,mod.meta.id+'-tampon.bin'),t.buf);
              res.verifie('tampon réel non vide',t.buf.filter(x=>x!==0).length,'> 0',t.buf.some(x=>x!==0));
              await active.captureTampon(mod.meta.id);
            }
          }
        }};
        const r=await mesurerCritere(banc,wrapper);P.criteres.push(r);save();console.log(profil,mod.meta.id,r.statut,r.resume);
      }
      // Ne pas appeler banc.fermer() : son navigateur appartient au lanceur.
      for(const active of banc.sessions)await active.fermer();
    }
    resultat.sourcesInchangees=srcHash()===resultat.sourcesSha256;
    resultat.conforme=resultat.sourcesInchangees&&resultat.profils.every(p=>!p.exception&&p.erreurs?.zero&&p.erreurs.consoleCompletes.length===0&&p.tampon?.nonVide&&
      (p.profil==='bureau'?p.bureau?.ok&&p.bureau.horloge.ok:p.instrument?.ok&&p.preuveJeu?.horloge.ok&&p.preuveJeu.mesure.ok&&p.preuveJeu.mesure.tourne&&p.criteres.length===2&&p.criteres.every(c=>c.statut==='ok')));
  }catch(e){resultat.exception=String(e.stack||e);}
  finally{if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));resultat.dateParisFin=dateParis();save();}
  console.log('Résultats : '+path.join(OUT,'resultats.json'));if(!resultat.conforme)process.exitCode=1;
}
