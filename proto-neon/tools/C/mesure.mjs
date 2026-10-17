/* tools/C/mesure.mjs — les critères du lot C (REFONTE.md § 5.7, LOT 7a et 7b) mesurés sur la sortie rendue HORS LIGNE
   par le moteur même du jeu (N.music.renderOffline avec les vrais blocs). Chromium sans interface : rien ne sort sur
   les haut-parleurs.
   Usage : node proto-neon/tools/C/mesure.mjs [parties...] [--port=8123]
     parties : jointures mixage sons niveaux charge grille mort repetition repli (toutes par défaut)
   Prérequis : serveur `python3 -m http.server 8123 --bind 127.0.0.1` depuis la racine de la copie, et la page
   `node proto-neon/build.mjs proto-neon/tools/C/index.html` construite.
   Sortie : tableau en clair, et proto-neon/tools/C/mesure.json. */
import fs from 'node:fs';
import { chromium } from 'playwright';

const HERE = new URL('.', import.meta.url).pathname;
const args = process.argv.slice(2);
const port = (args.find(a => a.startsWith('--port=')) || '--port=8123').slice(7);
const choisies = args.filter(a => !a.startsWith('--'));
const TOUT = ['jointures', 'mixage', 'sons', 'niveaux', 'charge', 'grille', 'mort', 'repetition', 'repli'];
const parties = choisies.length ? choisies : TOUT;

const errs = [];
const R = {};
async function partie(nom, f) {
  if (!parties.includes(nom)) return;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });   // une page neuve par partie : la mémoire des rendus ne s'additionne pas
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });   // la boucle du jeu n'a rien à faire ici : les rendus sont hors ligne
  await p.addInitScript({ path: HERE + 'analyse.js' });
  await p.addInitScript({ path: HERE + 'mesure-page.js' });
  await p.goto('http://127.0.0.1:' + port + '/proto-neon/tools/C/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__N && window.__N.music && window.__N.rng && window.__C);
  const t0 = Date.now();
  try {
    const init = await p.evaluate(() => window.__C.init('../../musique/'));
    R.init = init;
    R[nom] = await p.evaluate(f);
  } catch (e) { R[nom] = { erreur: String(e.message || e) }; }
  console.log('[' + nom + '] ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  await b.close();
}
await partie('jointures', () => window.__C.jointures());
await partie('mixage', () => window.__C.mixage());
await partie('sons', () => window.__C.sons());
await partie('niveaux', () => window.__C.niveauxSons());
await partie('charge', () => window.__C.charge());
await partie('grille', () => window.__C.grille());
await partie('mort', () => window.__C.mort());
await partie('repetition', () => window.__C.repetition());
await partie('repli', () => window.__C.repli());
R.erreurs = errs;
fs.writeFileSync(HERE + 'mesure.json', JSON.stringify(R, null, 1));

/* ------------------------------------------------------------------ compte rendu */
const ok = (c) => c ? 'OK ' : 'ECHEC';
const lignes = [];
const L = (...a) => { lignes.push(a.join(' ')); console.log(a.join(' ')); };
if (R.jointures && !R.jointures.erreur) {
  const J = R.jointures, ecart = Math.max(...J.joints.map(x => Math.abs(x.ecartMs)));
  L('\n== Jointures de blocs (corrélation sur 0,5 s de chaque côté, recherche ± 20 ms)');
  J.joints.forEach(x => L('   ' + x.de + ' -> ' + x.vers + ' à ' + x.joint + ' s : retard ' + x.lagAvantMs + ' ms puis ' + x.lagApresMs + ' ms, écart ' + x.ecartMs + ' ms (rho ' + x.rhoAvant + ' / ' + x.rhoApres + ')'));
  L('   écart max ' + ecart.toFixed(3) + ' ms (seuil 1 ms) ' + ok(ecart < 1));
  L('   plus grande dérivée d\'échantillon aux jointures ' + J.maxPiJoint.toFixed(4) + ' contre seuil fixé sur la piste d\'origine ' + J.seuilClic.toFixed(4) + ' ' + ok(J.maxPiJoint <= J.seuilClic));
}
if (R.mixage && !R.mixage.erreur) {
  const M = R.mixage, P = M.paliers;
  L('\n== Mixage (musique seule, jeu, simulation de téléphone : passe-haut de Butterworth d\'ordre 4 à 350 Hz)');
  Object.entries(P).forEach(([t, v]) => L('   tension ' + t + ' : ' + v.telDB + ' dBFS RMS (téléphone), ' + v.rmsDB + ' dBFS (large bande), crête ' + v.creteDB + ' dBFS, centroïde ' + v.centroide + ' Hz'));
  const calme = P['0.15'].telDB, chaos = P['1'].telDB;
  L('   calme >= -20 dBFS :', calme, ok(calme >= -20), '| chaos ~ -14 dBFS :', chaos, ok(Math.abs(chaos + 14) <= 1.5), '| écart >= 6 dB :', (chaos - calme).toFixed(1), ok(chaos - calme >= 6));
  L('   corrélation tension <-> niveau sur 3 minutes (fenêtres de 10 s) :', M.correlation, ok(M.correlation >= 0.5), '| crête sur 3 minutes', M.crete, 'dBFS', ok(M.crete <= -1));
}
if (R.niveaux && !R.niveaux.erreur) {
  const V = R.niveaux;
  L('\n== Sons contre la musique (RMS téléphone sur la durée du son ; plus : momentané 20 ms contre la musique)');
  Object.entries(V.contre).forEach(([t, v]) => L('   tension ' + t + ' : kill ' + v.kill + ' dB (mom. ' + v.kill_momTel + '), coupe ' + v.coupe + ' (' + v.coupe_momTel + '), mort ' + v.mort + ' (' + v.mort_momTel + '), tir ' + v.tir + ' (' + v.tir_momTel + '), bigkill ' + v.bigkill));
  L('   tir sous kill (momentané téléphone) :', V.tirSousKill, 'dB (>= 6)', ok(V.tirSousKill >= 6));
  L('   esquive : profondeur', V.esquive.profondeur, '(visée 0,30), relâchement', V.esquive.relachementMs, 'ms (visé 120)');
  L('   kills muets : demandés', V.kills.demandes, 'joués', V.kills.joues, ok(V.kills.demandes === V.kills.joues));
}
if (R.sons && !R.sons.erreur) {
  const S = R.sons, noms = Object.keys(S).filter(k => !k.startsWith('__'));
  const bas = noms.filter(n => S[n].part400 < 25);
  L('\n== Banque de sons : part d\'énergie au-dessus de 400 Hz (>= 25 %)');
  L('   ' + noms.length + ' sons mesurés, ' + (noms.length - bas.length) + ' conformes ' + ok(bas.length === 0) + (bas.length ? ' ; sous 25 % : ' + bas.map(n => n + ' ' + S[n].part400 + ' %').join(', ') : ''));
  L('   minimum :', noms.map(n => [n, S[n].part400]).sort((a, c) => a[1] - c[1]).slice(0, 5).map(x => x.join(' ')).join(' ; '));
  L('   corrélation tirEnnemi / tir :', S.__correlationTirEnnemi, '(< 0,5)', ok(S.__correlationTirEnnemi < 0.5));
}
if (R.charge && !R.charge.erreur) {
  const C = R.charge;
  L('\n== Scène « charge » (16 tourelles, tir, kills, butin, impacts, tirs ennemis, tension 0,95, 60 s)');
  L('   nœuds créés par seconde :', C.noeudsParSeconde, '(< 60)', ok(C.noeudsParSeconde < 60), '| crête', C.creteDB, 'dBFS (<= -1)', ok(C.creteDB <= -1), '| échantillons écrêtés', C.echantillonsEcretes);
  L('   salve : demandées', C.demandes.salve, 'jouées', C.joues.salve, '| tir demandés', C.demandes.tir, 'joués', C.joues.tir, '| coupés par le budget de nœuds', C.budget);
}
if (R.grille && !R.grille.erreur) {
  const G = R.grille;
  L('\n== Couches et accents sur la grille (3 minutes, tensions variées, danger, INVERSION)');
  L('   changements de couche à moins de 10 ms d\'une barre :', G.couchesDansLes10ms + '/' + G.couchesTotal, ok(G.couchesDansLes10ms === G.couchesTotal));
  L('   accents (stinger, drop, vague, coupure ; plongée sur le temps) :', G.accentsDansLes10ms + '/' + G.accentsTotal, ok(G.accentsDansLes10ms === G.accentsTotal));
  G.accents.forEach(a => L('     ' + a.nom + ' à ' + a.t + ' s : écart barre ' + a.ecartBarreMs + ' ms, écart temps ' + a.ecartTempsMs + ' ms'));
  L('   mesures rendues', G.mesures, '; plus longue série de mesures identiques :', G.consecutivesMax, '(< 3)', ok(G.consecutivesMax < 3));
}
if (R.mort && !R.mort.erreur) {
  const D = R.mort;
  L('\n== Après une mort');
  L('   bloc de la mort', D.blocMort, '-> reprise sur', D.blocReprise, 'à', D.repriseT, 's ; premier bloc du PLATEAU', D.premierBlocDeLaFamille, ok(D.blocReprise !== D.blocMort && D.blocReprise !== D.premierBlocDeLaFamille));
  L('   niveau avant', D.niveauAvant, 'dB, pendant la coupure', D.niveauApresCoupure, 'dB, après la reprise', D.niveauReprise, 'dB');
}
if (R.repetition && !R.repetition.erreur) {
  const Q = R.repetition;
  L('\n== Répétition (3 minutes de jeu, fenêtres de 4 s)');
  L('   distance minimale entre deux fenêtres disjointes :', Q.distanceMin, '(>= 0,01)', ok(Q.distanceMin >= 0.01), '| fenêtres < 1 % :', Q.souslepourcent, '| mesures identiques consécutives (max) :', Q.consecutivesMax);
}
if (R.repli && !R.repli.erreur) {
  const Z = R.repli;
  L('\n== Repli (sans piste)');
  [0.06, 0.5, 1].forEach(t => { const x = Z[t]; L('   tension ' + t + ' : ' + x.rmsDB + ' dBFS (téléphone ' + x.telDB + '), centroïde ' + x.centroide + ' Hz, crête ' + x.creteDB); });
  L('   centroïde au calme 900-1500 Hz :', Z['0.06'].centroide, ok(Z['0.06'].centroide >= 900 && Z['0.06'].centroide <= 1500), '| premier son à', Z.premierSon, 's (< 1 mesure =', Z.mesure, 's)', ok(Z.premierSon >= 0 && Z.premierSon < Z.mesure));
}
L('\nerreurs de console :', errs.length ? JSON.stringify(errs.slice(0, 4)) : '0');
fs.writeFileSync(HERE + 'mesure.txt', lignes.join('\n') + '\n');
