/* tools/jeu/etats.mjs — le parcours des états du lot 0b (REFONTE.md § 8.3, critère « États ») :
     demarrage → titre → plongee → jeu → nettoyage → cartes → vol → jeu → mort → reapparition → … → fin → plongee
   sur le bundle de squelettes, avec les replis, sans erreur, en relevant N.game.etat() à CHAQUE pas.
   Le bus est en mode vérification (charges au schéma, consommateurs prévus), le journal est complet.
   Un premier score entre au tableau : les initiales viennent avant l'écran de fin. Un second passage vérifie la première visite : demarrage → ouverture → plongee.
     node tools/jeu/etats.mjs [--url URL] [--profil paysage|portrait|bureau|tous]
   Sortie 0 si le parcours est complet, sans erreur de console et avec __ERR.count = 0. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8112/proto-neon/index.html');
const PROFIL = arg('--profil', 'tous');
const PROFILS = {
  paysage: { ...devices['iPhone 13 landscape'] },
  portrait: { ...devices['iPhone 13'] },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const ATTENDU = ['demarrage', 'titre', 'plongee', 'jeu', 'nettoyage', 'cartes', 'vol', 'jeu', 'mort', 'reapparition', 'jeu', 'mort', 'reapparition', 'jeu', 'mort',
  'initiales', 'fin', 'plongee', 'jeu'];            // premier score du profil : il entre au tableau, d'où les initiales

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let ok = true;
for (const nom of (PROFIL === 'tous' ? Object.keys(PROFILS) : [PROFIL])) {
  for (const visite of ['suivante', 'premiere']) {
    const ctx = await browser.newContext(PROFILS[nom]);
    const page = await ctx.newPage();
    const cons = [];
    page.on('pageerror', e => cons.push('pageerror : ' + e.message));
    page.on('console', m => { if (m.type() === 'error') cons.push(m.text()); });
    await page.addInitScript(v => {
      window.__SEED = 2975;
      try {
        localStorage.clear();
        if (v === 'suivante') localStorage.setItem('snake2975.v1', JSON.stringify({ v: 1, profil: { energie: 0, deblocages: [], defisFaits: [], parties: 1, codex: [], gestesVus: [] }, records: [], reglages: null }));
      } catch (e) { /* stockage refusé */ }
    }, visite);
    await page.goto(URL_JEU);
    await page.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg && window.__S && window.__S.input, null, { timeout: 15000 });
    const r = await page.evaluate((visite) => {
      const N = window.__N, S = window.__S, g = N.game, d = g.dbg, log = [];
      N.ev.verifier(true); N.rng.verifier(true); N.journal.actif(true);
      /* chaque transition est relevée par 79-jeu au pas où elle a lieu (dbg.historique) */
      const h0 = d.historique().length, vus = [g.etat()];
      const etat = () => g.etat();
      const fini = () => { d.historique().slice(h0).forEach(x => vus.push(x.etat)); };
      function attendre(cible, secMax, pas) {
        for (let k = 0; k < secMax / (pas || 0.25) && etat() !== cible; k++) d.simuler(pas || 0.25);
        return etat() === cible;
      }
      function tap() { d.input({ any: true, valider: true }); d.simuler(0.05); }
      tap();                                                       // demarrage → titre (ou ouverture)
      if (visite === 'premiere') {
        if (etat() !== 'ouverture') return { vus, log: ['attendu ouverture, vu ' + etat()] };
        d.simuler(0.6); tap();                                     // le saut de l'ouverture, après la garde
        attendre('plongee', 20); attendre('jeu', 3);
        fini();
        return { vus, log, fin: etat() };
      }
      d.simuler(0.5); tap();                                       // titre → plongee, après la garde
      attendre('jeu', 3);
      d.god(true);
      if (!attendre('nettoyage', 90, 0.5)) log.push('pas de nettoyage');
      attendre('cartes', 4);
      for (let c = 0; c < 3 && etat() === 'cartes'; c++) { d.simuler(0.6); d.input({ chiffre: 1 }); d.simuler(0.05); }   // la première carte, à chaque main
      if (!attendre('vol', 2)) log.push('pas de VOL après les cartes : ' + etat());
      if (!attendre('jeu', 6)) log.push('pas de retour en jeu après le VOL : ' + etat());
      for (let m = 0; m < 3; m++) {
        if (etat() !== 'jeu') attendre('jeu', 4);
        d.simuler(0.6);                                            // l'invulnérabilité de la réapparition passe
        d.god(false);                                              // seule la mort demandée compte : protégée sinon
        N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
        d.god(true);
        if (etat() !== 'mort') { log.push('tuer sans mort : ' + etat() + ' (joueuse ' + (S.player && S.player.etat) + ', historique ' + JSON.stringify(d.historique().slice(-4)) + ')'); break; }
        if (m < 2) { if (!attendre('reapparition', 3, 0.1)) log.push('pas de réapparition'); if (!attendre('jeu', 3, 0.1)) log.push('pas de retour en jeu'); }
        else {
          if (!attendre('initiales', 3, 0.1)) log.push('pas d initiales');
          d.simuler(0.5); d.input({ car: 'ZZZ' }); d.simuler(0.05); tap();
          if (!attendre('fin', 1, 0.1)) log.push('pas de fin : ' + etat());
        }
      }
      d.simuler(0.7); tap();                                       // fin → plongee (REJOUER), après la garde
      attendre('jeu', 3);
      fini();
      const err = N.journal.dump().filter(x => x.type === 'perdu').length;
      return { vus, log, fin: etat(), perdus: err, death: S.death };
    }, visite);
    await page.waitForTimeout(300);
    const errCount = await page.evaluate(() => window.__ERR.count);
    const sigs = await page.evaluate(() => Object.keys(window.__ERR.sigs).slice(0, 6));
    let bon;
    if (visite === 'suivante') bon = JSON.stringify(r.vus) === JSON.stringify(ATTENDU) && !r.log.length;
    else bon = JSON.stringify(r.vus) === JSON.stringify(['demarrage', 'ouverture', 'plongee', 'jeu']) && !r.log.length;
    bon = bon && errCount === 0 && cons.length === 0;
    console.log(`== ${nom}, visite ${visite} : ${bon ? 'OK' : 'ÉCHEC'}`);
    console.log('  états : ' + r.vus.join(' → '));
    if (r.log.length) console.log('  ' + r.log.join(' ; '));
    console.log(`  __ERR.count = ${errCount}${sigs.length ? ' : ' + sigs.join(' | ') : ''} ; console : ${cons.length}`);
    for (const c of cons.slice(0, 6)) console.log('    ' + c);
    if (!bon) ok = false;
    await ctx.close();
  }
}
await browser.close();
console.log(ok ? 'ÉTATS : OK' : 'ÉTATS : ÉCHEC');
process.exit(ok ? 0 : 1);
