/* À lancer HORS du bac : cd proto-neon && node tools/codex-09/verifier.mjs
   Serveur HTTP sur port libre, un seul Chromium muet, profils en série.
   Aucun appel du présent script pendant le travail dans le bac à sable. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'navigateur'); fs.mkdirSync(OUT, { recursive: true });
const bundle = fs.readFileSync(path.join(ROOT, 'index.html'));
const resultats = { dateParis: new Date().toLocaleString('fr-FR', { timeZone:'Europe/Paris' }), bundleSha256: crypto.createHash('sha256').update(bundle).digest('hex'), profils: [] };
const server = http.createServer((req,res) => {
  try {
    const url = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(ROOT, '.' + (url === '/' ? '/index.html' : url));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg'};
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end(); }
});
let browser;
const save = () => fs.writeFileSync(path.join(OUT, 'sortie.json'), JSON.stringify(resultats,null,2));
try {
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  browser = await chromium.launch({ args:['--mute-audio'] });
  resultats.navigateur = browser.version();
  for (const [nom, device, width, height] of [
    ['paysage', devices['iPhone 13 landscape'],844,390], ['portrait',devices['iPhone 13'],390,844], ['bureau',{},1440,900]
  ]) {
    const ctx = await browser.newContext({ ...device, viewport:{width,height} });
    const page = await ctx.newPage(), erreurs = [], p = { nom, viewport:{width,height}, captures:[], controles:[], erreurs };
    resultats.profils.push(p);
    page.on('pageerror',e=>erreurs.push(e.message)); page.on('console',m=>{if(m.type()==='error') erreurs.push(m.text());});
    await page.addInitScript(() => {
      localStorage.clear(); window.__SEED=1; window.__DT=1/60;
      window.requestAnimationFrame=fn=>{window.__tick=fn;return 1;}; window.cancelAnimationFrame=()=>{};
    });
    const check = (nom,ok,valeur) => { p.controles.push({nom,ok:!!ok,valeur}); assert.ok(ok, `${p.nom}: ${nom}: ${JSON.stringify(valeur)}`); };
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`, {waitUntil:'load'});
      await page.evaluate(() => {
        const N=window.__N,S=window.__S; S.jour=20261017; N.journal.actif(true);
        window.__test = {
          frame() { window.__tick(0); },
          avance(sec) { for(let i=0;i<Math.ceil(sec/window.__DT);i++) this.frame(); },
          jusqua(type,nom,max=90) { for(let i=0;i<Math.ceil(max/window.__DT);i++) {
            if(type==='etape' ? N.aventure.etape()===nom : N.game.etat()===nom) return true; this.frame();
          } return false; },
          etat() {return {jeu:N.game.etat(),etape:N.aventure.etape(),film:N.film.state(),intro:N.intro.state(),aventure:N.aventure.state(),err:window.__ERR};}
        };
      });
      const avancer = s=>page.evaluate(s=>window.__test.avance(s),s);
      const etat = ()=>page.evaluate(()=>window.__test.etat());
      const jusqua = (type,nom,max)=>page.evaluate(o=>window.__test.jusqua(...o),[type,nom,max]);
      async function toucher(x=width/2,y=height/2) {
        if(device.hasTouch) await page.touchscreen.tap(x,y); else await page.mouse.click(x,y);
        await page.evaluate(()=>window.__test.frame());
      }
      async function capture(label,overlay=false) {
        const m=await page.evaluate(overlay=>{
          const N=window.__N,T=window.__test; let difference=null;
          const original=window.__DT; window.__DT=0; T.frame();
          if(overlay) {
            const obtenu=N.gfx.buf().slice(); N.gfx.origin(0,0); N.gfx.clear(0); N.aventure.draw();
            const attendu=N.gfx.buf(); difference=0;
            for(let i=0;i<attendu.length;i++) if(attendu[i]!==obtenu[i]) difference++;
            T.frame();
          }
          window.__DT=original;
          const b=N.gfx.buf(), histogramme={};let empreinte=2166136261;
          for(const v of b){histogramme[v]=(histogramme[v]||0)+1;empreinte=Math.imul(empreinte^v,16777619)>>>0;}
          return {etat:T.etat(),W:N.gfx.W,H:N.gfx.H,px:N.gfx.PX,pixels:b.length,histogramme,empreinte,difference,musique:N.music.info(),terminal:N.terminal.state(),arcade:N.arcade.state(),journal:N.journal.dump()};
        },overlay);
        const fichier=`${nom}-${label}.png`;await page.screenshot({path:path.join(OUT,fichier)});
        fs.writeFileSync(path.join(OUT,`${nom}-${label}.json`),JSON.stringify(m,null,2));
        p.captures.push({label,fichier,...m,journal:undefined});
        check(label+' palette et tampon',Object.keys(m.histogramme).length>1&&Object.keys(m.histogramme).every(x=>+x<16),m.histogramme);
        check(label+' zéro erreur',m.etat.err.count===0,m.etat.err);
        if(overlay) check(label+' aucun recouvrement',m.difference===0,m.difference);
        if(['1976','1982'].includes(m.etat.etape)) check(label+' piste principale arrêtée',m.musique&&m.musique.running===false,m.musique);
        return m;
      }
      async function sauterFilm(qui) {
        const st=await etat(), id=st.etape;
        // Capture avant saut de CHAQUE film ; la progression est celle de la vraie boucle boot.
        await avancer(0.32); await capture(`${qui}-${id}`);
        await toucher();const apres=await etat();
        check('toucher saute '+qui+' '+id,apres.etape!==id||!apres.film.actif,apres);
        await page.evaluate(()=>window.__test.frame());
      }
      await avancer(0.5);await toucher();
      check('démarrage → titre',(await etat()).jeu==='titre',await etat());
      for(const qui of ['elle','lui']) {
        await avancer(0.5);await capture(`${qui}-titre`);await toucher();
        check('JOUER → aventure '+qui,(await etat()).jeu==='aventure'&&(await etat()).etape==='choix',await etat());
        await avancer(0.5); await capture(`${qui}-choix`,true);
        const z=await page.evaluate(qui=>{
          const N=window.__N,r=N.choix.state().zones[qui],b=document.getElementById('out').getBoundingClientRect();
          return {x:b.left+(r.x+r.w/2)*N.gfx.PX,y:b.top+(r.y+r.h/2)*N.gfx.PX};
        },qui);
        await toucher(z.x,z.y); check('connexion '+qui,await jusqua('etape','connexion',3),await etat());
        await toucher(); check('garde 300 ms '+qui,(await etat()).etape==='connexion',await etat());
        await sauterFilm(qui);
        check('1976 '+qui,(await etat()).etape==='1976',await etat());await avancer(0.5);await capture(`${qui}-1976`,true);
        check('1976 finit naturellement '+qui,await jusqua('etape','fissure',90),await etat());await sauterFilm(qui);
        check('1982 '+qui,(await etat()).etape==='1982',await etat());await avancer(0.5);await capture(`${qui}-1982`,true);
        check('1982 finit naturellement '+qui,await jusqua('etape','eclat',90),await etat());await sauterFilm(qui);
        check('néon '+qui,(await etat()).jeu==='plongee'&&(await etat()).etape==='neon',await etat());
        await page.evaluate(()=>window.__N.game.dbg.god(true));await avancer(1);const neon=await capture(`${qui}-neon`);
        check('piste principale repart '+qui,neon.musique&&neon.musique.running,neon.musique);
        await page.evaluate(()=>window.__N.game.dbg.etat('victoire'));
        check('apothéose '+qui,await jusqua('jeu','panneau',10),await etat());
        await toucher();check('garde apothéose '+qui,(await etat()).intro.busy,await etat());
        await avancer(0.32);await capture(`${qui}-apotheose`);await toucher();await page.evaluate(()=>window.__test.frame());
        check('victoire rend la main '+qui,(await etat()).jeu==='aventure',await etat());
        for(let i=0;i<20&&(await etat()).jeu==='aventure';i++) await sauterFilm(qui);
        const fin=await etat();
        check('fin aventure '+qui,fin.jeu==='fin'&&!fin.aventure.enCours,fin);
        check('aucun film répété '+qui,new Set(fin.aventure.joues).size===fin.aventure.joues.length,fin.aventure.joues);
        if(qui==='lui') check('retrouvailles teaser à suivre',fin.aventure.deux&&['retrouvailles','teaser','asuivre'].every(e=>fin.aventure.vus.includes(e)),fin.aventure);
        await avancer(0.5);await capture(`${qui}-bilan`);
        if(qui==='elle') {
          const b=await page.evaluate(()=>{
            const N=window.__N,r=N.ui.finActions().rejouer,c=document.getElementById('out').getBoundingClientRect();
            return {x:c.left+(r.x+r.w/2)*N.gfx.PX,y:c.top+(r.y+r.h/2)*N.gfx.PX};
          });await toucher(b.x,b.y);check('REJOUER gagné → titre',(await etat()).jeu==='titre',await etat());
        }
      }
      p.final=await etat();p.journal=await page.evaluate(()=>window.__N.journal.dump());
      check('zéro erreur console',!erreurs.length,erreurs);p.conforme=true;
    } catch(e) {p.conforme=false;p.echec=String(e);console.error(nom,e.message);}
    finally {save();await ctx.close();}
  }
  resultats.conforme=resultats.profils.length===3&&resultats.profils.every(p=>p.conforme);
  if(!resultats.conforme) process.exitCode=1;
} finally {save();if(browser) await browser.close();await new Promise(r=>server.close(r));}
