/* tools/musique2/vivant.mjs — la coupure, la veille et la reprise, mesurees EN DIRECT sur un vrai
   AudioContext, dans le jeu construit (tools/musique2/index.html), par le chemin reel :
     - le premier toucher passe par 90-boot.js (geste -> N.music.init + start) ;
     - l'arriere-plan est simule par visibilitychange (document.hidden force), donc c'est 90-boot.js qui
       appelle N.music.suspend() puis N.music.resume() ;
     - une suspension imposee par le systeme (contexte suspendu dans le dos du moteur, comme iOS apres
       un appel) doit etre relancee seule.
   Mesure : rmsOut() (sortie apres la porte) echantillonne toutes les 5 ms sur l'horloge audio.
   Usage : node tools/musique2/vivant.mjs [bureau|paysage|portrait|tous] */
import { chromium, devices } from 'playwright';

const which = process.argv[2] || 'tous';
const PROFS = {
  bureau: { viewport: { width: 1440, height: 900 } },
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
};
const list = which === 'tous' ? Object.keys(PROFS) : [which];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const bilan = {};
let echec = 0;

for (const nom of list) {
  const ctx = await browser.newContext(PROFS[nom]);
  const page = await ctx.newPage();
  const errs = [], res404 = [];
  page.on('console', m => { if (m.type() === 'error') { if (/404|Failed to load resource/.test(m.text())) res404.push(m.text()); else errs.push(m.text()); } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    window.__SEED = 2084;
    let hid = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid });
    window.__hide = (v) => { hid = v; document.dispatchEvent(new Event('visibilitychange')); };
    /* echantillonneur : rmsOut sur l'horloge audio, toutes les 5 ms */
    window.__rec = (ms) => new Promise(res => {
      const M = window.__N.music, c = M.context(), out = [];
      const id = setInterval(() => out.push([+c.currentTime.toFixed(4), M.rmsOut(), M.muted()]), 5);
      setTimeout(() => { clearInterval(id); res(out); }, ms);
    });
  });
  await page.goto('http://127.0.0.1:8112/proto-neon/tools/musique2/index.html');
  await page.waitForFunction(() => window.__N && window.__N.music && window.__N.game && window.__S);
  await page.waitForTimeout(400);
  const vp = PROFS[nom].viewport;
  /* le premier toucher : c'est 90-boot.js qui cree et lance le son */
  if (PROFS[nom].hasTouch) await page.touchscreen.tap(vp.width / 2, vp.height / 2); else await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.waitForTimeout(300);
  /* la partie, pas l'ouverture : le jeu n'ecoute la touche M qu'une fois l'ouverture passee */
  await page.evaluate(() => { if (window.__S.phase === 'intro' && window.__N.intro.skip) window.__N.intro.skip(); });
  await page.waitForTimeout(2500);
  const R = { profil: nom };
  R.phase = await page.evaluate(() => window.__S.phase);
  R.depart = await page.evaluate(() => { const i = window.__N.music.info(); return { state: i.state, bar: i.bar, layers: i.layers, rmsOut: +window.__N.music.rmsOut().toFixed(4) }; });

  /* ---- 1. la coupure, par le bouton son du jeu (touche M : 70-game.js -> N.music.mute) ---- */
  const avant = await page.evaluate(async () => {
    const M = window.__N.music, v = []; for (let i = 0; i < 20; i++) { v.push(M.rmsOut()); await new Promise(r => setTimeout(r, 10)); }
    window.__ref = v.reduce((a, b) => a + b, 0) / v.length; window.__bar0 = M.info().bar;
    window.__trA = window.__rec(600);
    return window.__ref;
  });
  await page.keyboard.press('KeyM');
  R.coupure = await page.evaluate(async () => {
    const M = window.__N.music, ref = window.__ref;
    await new Promise(r => setTimeout(r, 200));
    const j0 = M.journal().ignores; M.sfx('kill', { pitch: 3 }); M.sfx('bigkill'); const j1 = M.journal().ignores;
    const tr = await window.__trA;
    /* l'instant de la coupure : premier echantillon ou muted() est vrai ; puis -30 et -60 dB du niveau
       d'avant (la fenetre de l'analyseur, 2048 echantillons, retarde la mesure de 43 ms au plus) */
    const k0 = tr.findIndex(e => e[2]), t0 = k0 >= 0 ? tr[k0][0] : null;
    const sous = (k) => { const x = tr.find(e => t0 !== null && e[0] >= t0 && e[1] < ref * k); return x ? +((x[0] - t0) * 1000).toFixed(0) : null; };
    await new Promise(r => setTimeout(r, 1200));
    return { niveauAvant: +ref.toFixed(4), coupeParLeJeu: k0 >= 0, msSous30dB: sous(0.0316), msSous60dB: sous(0.001),
      niveauPendant: +M.rmsOut().toExponential(2), sonsIgnoresPendantCoupure: j1 - j0, mesureAvant: window.__bar0, mesurePendant: M.info().bar,
      gatePendant: +M.info().gate.toExponential(2) };
  });
  await page.evaluate(() => { window.__trB = window.__rec(700); });
  await page.keyboard.press('KeyM');
  Object.assign(R.coupure, await page.evaluate(async () => {
    const M = window.__N.music, ref = window.__ref, tr = await window.__trB;
    const k1 = tr.findIndex(e => !e[2]), t1 = k1 >= 0 ? tr[k1][0] : null;
    const sur = (k) => { const x = tr.find(e => t1 !== null && e[0] >= t1 && e[1] > ref * k); return x ? +((x[0] - t1) * 1000).toFixed(0) : null; };
    await new Promise(r => setTimeout(r, 2500));
    const i = M.info();
    return { rendParLeJeu: k1 >= 0, msRetourA50pc: sur(0.5), niveauApres: +M.rmsOut().toFixed(4), mesureApres: i.bar, mutedApres: i.muted, gateApres: +i.gate.toFixed(3) };
  }));

  /* ---- 2. l'arriere-plan : visibilitychange -> 90-boot.js -> suspend() / resume() ---- */
  R.veille = await page.evaluate(async () => {
    const M = window.__N.music, S = window.__S;
    const bar0 = M.info().bar;
    window.__hide(true);
    await new Promise(r => setTimeout(r, 400));
    const i1 = M.info(), out1 = M.rmsOut(), pause1 = S.paused;
    await new Promise(r => setTimeout(r, 1500));          /* aucune relance automatique pendant la veille */
    const i2 = M.info();
    M.sfx('kill');                                        /* ignore pendant la veille */
    window.__hide(false);                                 /* retour : 90-boot.js appelle resume() */
    await new Promise(r => setTimeout(r, 600));
    const i3 = M.info(), out3 = M.rmsOut(), pause3 = S.paused;
    return { etatEnVeille: i1.state, sleeping: i1.sleeping, sortieEnVeille: +out1.toExponential(2), pauseJeu: pause1,
      etatApres1s5: i2.state, etatAuRetour: i3.state, sortieAuRetour: +out3.toFixed(4), pauseAuRetour: pause3, etouffoirEnPause: i3.muffle,
      mesureAvant: bar0, mesureAuRetour: i3.bar };
  });
  /* le geste qui leve la pause : l'etouffoir s'ouvre */
  if (PROFS[nom].hasTouch) await page.touchscreen.tap(vp.width / 2, vp.height / 2); else await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.waitForTimeout(500);
  R.veille.apresGeste = await page.evaluate(() => { const i = window.__N.music.info(); return { pause: window.__S.paused, etouffoir: i.muffle, state: i.state }; });

  /* ---- 3. suspension imposee par le systeme (iOS apres un appel) : relance seule ---- */
  R.systeme = await page.evaluate(async () => {
    const M = window.__N.music, c = M.context();
    await c.suspend();
    const s0 = c.state, j0 = M.journal().ignores;
    M.sfx('bigkill');                                     /* pose sur une horloge arretee : doit etre ignore */
    const j1 = M.journal().ignores;
    let ms = null; const t = Date.now();
    while (Date.now() - t < 3000) { await new Promise(r => setTimeout(r, 20)); if (c.state === 'running') { ms = Date.now() - t; break; } }
    await new Promise(r => setTimeout(r, 800));
    return { etatImpose: s0, sonIgnore: j1 - j0, relanceEnMs: ms, etatFinal: c.state, sortie: +M.rmsOut().toFixed(4), mesure: M.info().bar };
  });

  /* ---- 4. quelques secondes de jeu reel avec le son, puis le bilan d'erreurs ---- */
  await page.waitForTimeout(4000);
  R.journal = await page.evaluate(() => window.__N.music.journal());
  R.erreurs = await page.evaluate(() => ({ count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs) }));
  R.erreurs.console = errs.slice(0, 5); R.erreurs.ressources404 = res404.length;
  const ok = R.depart.state === 'running' && R.depart.rmsOut > 0.001 && R.coupure.coupeParLeJeu && R.coupure.msSous60dB !== null && R.coupure.msSous60dB <= 250
    && R.coupure.sonsIgnoresPendantCoupure === 2 && R.coupure.niveauPendant < 1e-4 && R.coupure.rendParLeJeu && R.coupure.msRetourA50pc !== null && R.coupure.msRetourA50pc <= 250
    && R.coupure.mutedApres === false
    && R.coupure.mesureApres > R.coupure.mesureAvant && R.veille.etatEnVeille === 'suspended' && R.veille.etatApres1s5 === 'suspended'
    && R.veille.etatAuRetour === 'running' && R.veille.sortieAuRetour > 0.0005 && R.veille.mesureAuRetour >= R.veille.mesureAvant
    && R.veille.etouffoirEnPause === 420 && R.veille.apresGeste.etouffoir === 0 && R.systeme.etatFinal === 'running' && R.systeme.sonIgnore === 1
    && R.erreurs.count === 0 && errs.length === 0;
  R.ok = ok; if (!ok) echec++;
  bilan[nom] = R;
  console.log(JSON.stringify(R, null, 1));
  await ctx.close();
}
await browser.close();
console.log('\nBILAN : ' + Object.entries(bilan).map(([k, v]) => k + ' ' + (v.ok ? 'OK' : 'ECHEC')).join(', '));
process.exit(echec ? 1 : 0);
