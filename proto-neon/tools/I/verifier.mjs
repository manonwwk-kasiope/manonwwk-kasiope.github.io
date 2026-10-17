/* tools/I/verifier.mjs — vérification du lot I (dépendances de codex-02) sur une COPIE PROPRE du dépôt.
     node tools/I/verifier.mjs [--ref HEAD] [--base REF] [--overlay] [--graines 3] [--max 540] [--section a,b,c] [--sans-rapport]

   La copie : `git archive <ref> proto-neon` extrait dans un dossier temporaire, puis `node build.mjs` DANS cette copie (jamais dans
   le dossier de travail, où d'autres agents écrivent en même temps). --overlay recopie par-dessus les fichiers du lot I tels qu'ils
   sont dans le dossier de travail (pour essayer avant de commiter) ; sans lui, on mesure exactement ce qui est commité.
   Profil iPhone 13 paysage 844 × 390, __SEED fixé, N.intro.skip(), simulation par N.game.dbg.simuler (aucun saut de séquence).

   Sections :
     etats      une partie au doigt (sans pilote) : le crochet __PILOT est-il appelé à chaque pas de chaque état traversé ? les vues
                S.butin, S.vue, S.voies, S.vol, S.tele, S.player.pouvoir, S.ecran.niveaux existent-elles, au schéma ?
                (a : invulnérable, de la plongée au VOL ; b : sans rien faire, jusqu'à la mort et à la fin)
     identique  le jeu au doigt reste identique : même trace (état, score, position, ennemis…) que la version --base, jusqu'aux cartes
     niveaux    S.ecran.niveaux sur l'écran des cartes : le palier de chaque carte, dont l'ULTIME (4) d'une arme déjà montée
     pilote     un pilote de Codex (bon par défaut, --pilotes bon,expert,… pour d'autres) sur N graines : va-t-il jusqu'à la fin sans blocage ? __ERR.count === 0 ?
     console    une vraie boucle d'images (requestAnimationFrame) de 20 s au doigt : aucune erreur console
   Écrit tools/I/sortie.json et tools/I/rapport.md. Sortie 1 si une mesure échoue. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEPOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' }).trim();
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const drapeau = k => process.argv.includes(k);
const REF = arg('--ref', 'HEAD'), BASE = arg('--base', ''), OVERLAY = drapeau('--overlay');
const NB_GRAINES = +arg('--graines', 3), MAXT = +arg('--max', 540);
const SECTIONS = arg('--section', 'etats,horscombat,niveaux,identique,pilote,console').split(',');
const PILOTES = arg('--pilotes', 'bon').split(',');
const FICHIERS_LOT = ['03-socle', '12-cam', '17-vol', '50-fx', '70-joueuse', '71-butin', '72-ennemis', '73-arene', '79-jeu', '80-ecrans'].map(f => `proto-neon/src/${f}.js`);

/* ---------- la copie propre ---------- */
function copiePropre(ref, overlay) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-I-'));
  const tar = execFileSync('git', ['archive', ref, 'proto-neon'], { cwd: DEPOT, maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', D], { input: tar });
  if (overlay) for (const f of FICHIERS_LOT) fs.copyFileSync(path.join(DEPOT, f), path.join(D, f));
  execFileSync('node', ['build.mjs'], { cwd: path.join(D, 'proto-neon'), stdio: 'pipe' });
  const racine = path.join(D, 'proto-neon');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(racine, 'index.html'))).digest('hex');
  const commit = execFileSync('git', ['rev-parse', '--short', ref], { cwd: DEPOT, encoding: 'utf8' }).trim();
  return { racine, sha, commit, ref, overlay };
}
function serveur(racine) {
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]), f = path.resolve(racine, '.' + (u === '/' ? '/index.html' : u));
    if (!f.startsWith(racine + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.json') ? 'application/json' : f.endsWith('.mp4') ? 'video/mp4' : f.endsWith('.png') ? 'image/png' : 'audio/mpeg');
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r(s)));
}

const sortie = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), ref: REF, overlay: OVERLAY, sections: {} };
const echecs = [];
function echec(m) { echecs.push(m); console.log('ÉCHEC : ' + m); }

const vrai = copiePropre(REF, OVERLAY);
sortie.copie = { commit: vrai.commit, sha256: vrai.sha };
const srvVrai = await serveur(vrai.racine);
const urlVrai = `http://127.0.0.1:${srvVrai.address().port}/index.html`;
let base = null, srvBase = null, urlBase = '';
if (BASE && SECTIONS.includes('identique')) {
  base = copiePropre(BASE, false); srvBase = await serveur(base.racine);
  urlBase = `http://127.0.0.1:${srvBase.address().port}/index.html`; sortie.base = { commit: base.commit, sha256: base.sha };
}
const browser = await chromium.launch({ args: ['--mute-audio'] });
sortie.navigateur = browser.version();
sortie.pilotes = PILOTES.join(',');

async function page(url, { rafStop = true, seed = 1 } = {}) {
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } });
  const p = await ctx.newPage(), erreursConsole = [];
  p.on('pageerror', e => erreursConsole.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') erreursConsole.push(m.text()); });
  await p.addInitScript(({ seed, rafStop }) => {
    window.__SEED = seed; window.__DT = 1 / 60;
    if (rafStop) { window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }
  }, { seed, rafStop });
  await p.goto(url, { waitUntil: 'load' });
  return { ctx, p, erreursConsole };
}

/* ---------- ce qui tourne DANS la page ---------- */
const DANS_PAGE = () => {
  /* compteurs : appels de update() et du crochet __PILOT, par état (l'état est lu AVANT l'appel, comme le crochet le voit) */
  window.__V = { maj: {}, pilote: {}, pilotesHorsOrdre: 0, vues: {}, formes: {}, errsForme: [] };
  const N = window.__N, S = window.__S, V = window.__V;
  const maj0 = N.game.update;
  N.game.update = function (dt) { const e = N.game.etat(); V.maj[e] = (V.maj[e] || 0) + 1; return maj0.call(N.game, dt); };
  window.__compter = () => {
    const prec = window.__PILOT;
    window.__PILOT = function (d) { const e = N.game.etat(); V.pilote[e] = (V.pilote[e] || 0) + 1; return prec ? prec.apply(this, arguments) : undefined; };
  };
  /* la forme des vues du contrat, relevée à chaque tranche */
  window.__formes = () => {
    const e = N.game.etat(), ids = N.ids;
    const v = V.vues[e] || (V.vues[e] = { tranches: 0, butin: 0, vue: 0, voies: 0, vol: 0, tele: 0, pouvoir: 0, niveaux: 0, ecran: 0, player: 0, nTele: 0, nButin: 0, nVoies: 0, nObjVol: 0 });
    const faute = (genre, o, ou) => { const er = ids.valider(genre, o); if (er.length && V.errsForme.length < 40) V.errsForme.push(e + ' ' + ou + ' : ' + er[0]); return er.length === 0; };
    v.tranches++;
    if (Array.isArray(S.butin)) { v.butin++; v.nButin = Math.max(v.nButin, S.butin.length); S.butin.forEach((b, i) => { if (i < 5) faute('butin', b, 'S.butin[' + i + ']'); }); }
    if (S.vue && faute('vue', S.vue, 'S.vue')) v.vue++;
    if (Array.isArray(S.voies)) { v.voies++; v.nVoies = Math.max(v.nVoies, S.voies.length); S.voies.forEach((o, i) => faute('voie', o, 'S.voies[' + i + ']')); }
    if (S.vol) { if (faute('vol', S.vol, 'S.vol')) { v.vol++; v.nObjVol = Math.max(v.nObjVol, S.vol.objets.length); } }
    if (Array.isArray(S.tele)) { v.tele++; v.nTele = Math.max(v.nTele, S.tele.length); S.tele.forEach((o, i) => faute('tele', o, 'S.tele[' + i + ']')); }
    if (S.player && typeof S.player.pouvoir === 'string') { v.pouvoir++; if (faute('player', S.player, 'S.player')) v.player++; }
    if (S.ecran) { v.ecran++; if (S.ecran.niveaux && faute('ecran', S.ecran, 'S.ecran')) v.niveaux++; }
  };
  /* le doigt : vise la cellule la plus proche, sinon le centre de l'arène ; une seule règle, déterministe */
  window.__doigt = () => {
    const d = N.game.dbg(), P = d.P; let b = null, bd = 1e9;
    for (const c of N.butin.list) { const q = Math.hypot(c.x - P.x, c.y - P.y); if (q < bd) { bd = q; b = c; } }
    const tx = b ? b.x : (d.AL + d.AR) / 2, ty = b ? b.y : (d.AT + d.AB) / 2, a = Math.atan2(ty - P.y, tx - P.x);
    N.game.dbg.input({ x: Math.cos(a), y: Math.sin(a), mag: 0.8 });
  };
  window.__preparer = (graine) => {
    localStorage.clear(); S.jour = 20261017;
    N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
    if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
    N.horloge.avancer();                    // comme les bancs : la boucle au pas fixe
  };
};

/* ---------- section etats ---------- */
async function sectionEtats() {
  const res = { a: null, b: null };
  for (const mode of ['a', 'b']) {
    const { ctx, p, erreursConsole } = await page(urlVrai, { seed: mode === 'a' ? 2 : 3 });
    try {
      await p.evaluate(DANS_PAGE);
      const r = await p.evaluate(({ mode }) => {
        const N = window.__N, S = window.__S, V = window.__V;
        window.__preparer(mode === 'a' ? 2 : 3);
        window.__compter();
        if (mode === 'a') N.game.dbg.god(true);
        const vus = {}, niveauxVus = {};
        let temps = 0, reel = 0, derniere = '', immobile = 0, raison = 'borne', ecranCartes = null;
        while (reel < 900) {
          const e = N.game.etat();
          if (mode === 'a') {
            window.__doigt();
            if (e === 'cartes' && S.ecran && S.ecran.pret) {
              if (!ecranCartes) ecranCartes = JSON.parse(JSON.stringify({ cartes: S.ecran.cartes, niveaux: S.ecran.niveaux, depuis: S.ecran.depuis }));
              const k = S.ecran.cartes.indexOf('canon'); const k2 = S.ecran.cartes.indexOf('tourelles');
              const rang = (k >= 0 ? k : (k2 >= 0 ? k2 : 0)) + 1;
              for (const id of S.ecran.cartes) { const n = S.ecran.niveaux[id]; if (!(id in niveauxVus) || n > niveauxVus[id]) niveauxVus[id] = n; }
              N.game.dbg.input({ chiffre: rang }); }
            else N.game.dbg.input({ chiffre: 0 });
          } else N.game.dbg.input({ x: 0, y: 0, mag: 0, chiffre: 0 });
          N.game.dbg.simuler(0.1); reel += 0.1;
          vus[N.game.etat()] = 1; window.__formes();
          const d = N.game.dbg(), cle = [N.game.etat(), N.horloge.t().toFixed(3), d.finT.toFixed(3)].join('|');
          immobile = cle === derniere ? immobile + 0.1 : 0; derniere = cle;
          if (immobile > 10) { raison = 'bloque:' + N.game.etat(); break; }
          if (window.__ERR.count) { raison = 'erreur'; break; }
          if (mode === 'a' && N.game.etat() === 'fin') { raison = 'fin'; break; }
          if (mode === 'b' && N.game.etat() === 'fin') { raison = 'fin'; break; }
        }
        return { raison, etatsVus: Object.keys(vus), tempsSimule: reel, tempsJeu: N.horloge.t(), vague: N.game.dbg().vague, err: window.__ERR.count, sigs: window.__ERR.sigs, maj: V.maj, pilote: V.pilote, vues: V.vues, errsForme: V.errsForme, ecranCartes, niveauxVus };
      }, { mode });
      r.erreursConsole = erreursConsole; res[mode] = r;
    } finally { await ctx.close(); }
  }
  /* verdicts */
  for (const mode of ['a', 'b']) {
    const r = res[mode];
    if (r.err || r.erreursConsole.length) echec(`etats/${mode} : erreurs ${r.err} (console ${r.erreursConsole.length})`);
    if (r.raison.startsWith('bloque') || r.raison === 'erreur') echec(`etats/${mode} : ${r.raison}`);
    for (const e of Object.keys(r.maj)) if ((r.pilote[e] || 0) !== r.maj[e]) echec(`etats/${mode} : état ${e} : ${r.maj[e]} pas, ${r.pilote[e] || 0} appels du pilote`);
    if (r.errsForme.length) echec(`etats/${mode} : forme : ${r.errsForme[0]}`);
  }
  const A = res.a, B = res.b;
  const vol = A.vues.vol; if (!vol || !vol.vol) echec('etats/a : S.vol jamais vu au schéma pendant le VOL');
  const car = A.vues.cartes; if (!car || !car.niveaux) echec('etats/a : S.ecran.niveaux jamais vu sur l\'écran des cartes');
  for (const e of ['plongee', 'jeu']) { const v = A.vues[e]; if (!v || v.butin !== v.tranches || v.vue !== v.tranches || v.voies !== v.tranches || v.tele !== v.tranches || v.pouvoir !== v.tranches) echec(`etats/a : vues incomplètes dans ${e}`); }
  sortie.sections.etats = res;
}

/* ---------- section hors-combat : le crochet dans les états que le parcours de jeu ne traverse pas ---------- */
async function sectionHorsCombat() {
  const { ctx, p, erreursConsole } = await page(urlVrai, { seed: 13 });
  try {
    await p.evaluate(DANS_PAGE);
    const r = await p.evaluate(() => {
      const N = window.__N, V = window.__V; window.__preparer(13);
      window.__compter();
      const essais = {};
      for (const nom of ['demarrage', 'ouverture', 'titre', 'briefing', 'attraction', 'pause', 'initiales', 'defile', 'reapparition']) {
        const ok = N.game.dbg.etat(nom);
        const avant = (V.maj[nom] || 0);
        N.game.dbg.simuler(0.3);
        essais[nom] = { accepte: ok === true, etatLu: N.game.etat(), pasDansEtat: (V.maj[nom] || 0) - avant, err: window.__ERR.count };
      }
      return { essais, maj: V.maj, pilote: V.pilote, err: window.__ERR.count, sigs: window.__ERR.sigs };
    });
    r.erreursConsole = erreursConsole; sortie.sections.horsCombat = r;
    for (const e of Object.keys(r.maj)) if ((r.pilote[e] || 0) !== r.maj[e]) echec(`horsCombat : état ${e} : ${r.maj[e]} pas, ${r.pilote[e] || 0} appels`);
    if (r.err) echec('horsCombat : erreurs ' + JSON.stringify(r.sigs));
  } finally { await ctx.close(); }
}

/* ---------- section niveaux ---------- */
async function sectionNiveaux() {
  const { ctx, p, erreursConsole } = await page(urlVrai, { seed: 11 });
  try {
    await p.evaluate(DANS_PAGE);
    const r = await p.evaluate(() => {
      const N = window.__N, S = window.__S; window.__preparer(11);
      const sorties = { ouvertures: 0, coherent: true, ultimeVu: null, arme: null, ecartsTexte: [] };
      N.game.dbg.etat('cartes');                                              // (lance la partie : N.cartes est remis à zéro avant)
      N.cartes.choisir('canon'); N.cartes.choisir('canon');                   // le CANON prêt pour son palier IV (ULTIME)
      for (let k = 0; k < 60 && !(S.ecran.cartes || []).includes('canon'); k++) { N.ui.fermer(); N.ui.ouvrir('cartes'); sorties.ouvertures++; }
      const E = S.ecran;
      for (const id of E.cartes) { const attendu = N.cartes.texte(id).palier; if (E.niveaux[id] !== attendu) { sorties.coherent = false; sorties.ecartsTexte.push([id, E.niveaux[id], attendu]); } }
      sorties.cartes = E.cartes.slice(); sorties.niveaux = JSON.parse(JSON.stringify(E.niveaux));
      sorties.ultimeVu = E.niveaux.canon;
      sorties.schema = N.ids.valider('ecran', E);
      N.ui.fermer();
      sorties.horsCartes = JSON.parse(JSON.stringify(S.ecran));
      sorties.schemaHors = N.ids.valider('ecran', S.ecran);
      sorties.err = window.__ERR.count;
      return sorties;
    });
    r.erreursConsole = erreursConsole; sortie.sections.niveaux = r;
    if (r.ultimeVu !== 4) echec(`niveaux : le CANON à deux prises devrait être proposé au palier 4, vu ${r.ultimeVu}`);
    if (!r.coherent) echec('niveaux : écart avec N.cartes.texte : ' + JSON.stringify(r.ecartsTexte));
    if (r.schema.length || r.schemaHors.length) echec('niveaux : schéma ' + (r.schema[0] || r.schemaHors[0]));
    if (r.err || erreursConsole.length) echec('niveaux : erreurs');
  } finally { await ctx.close(); }
}

/* ---------- section identique ---------- */
async function trace(url, god) {
  const { ctx, p, erreursConsole } = await page(url, { seed: 5 });
  try {
    await p.evaluate(DANS_PAGE);
    const r = await p.evaluate((god) => {
      const N = window.__N; window.__preparer(5);
      if (god) N.game.dbg.god(true);
      const lignes = []; let reel = 0, finis = false;
      while (reel < 400 && !finis) {
        window.__doigt();
        N.game.dbg.simuler(0.1); reel += 0.1;
        const d = N.game.dbg();
        lignes.push([d.st, d.t.toFixed(4), d.score, d.kills, d.P.len, d.P.x.toFixed(3), d.P.y.toFixed(3), d.P.etat, d.E.length, d.E.reduce((t, e) => t + e.x * 3 + e.y * 7 + e.pv, 0).toFixed(3), d.EB.length, d.CELLS.length, d.vague, N.horloge.pas()].join(','));
        if (d.st === 'panneau' || d.st === 'cartes' || d.st === 'fin') finis = true;     // la version de base ne passe pas les écrans à horloge arrêtée : on s'arrête à leur seuil
      }
      return { lignes, err: window.__ERR.count };
    }, god);
    r.erreursConsole = erreursConsole; return r;
  } finally { await ctx.close(); }
}
async function sectionIdentique() {
  if (!base) { sortie.sections.identique = { ignoree: 'pas de --base' }; return; }
  const h = x => crypto.createHash('sha256').update(x.join('\n')).digest('hex').slice(0, 16);
  sortie.sections.identique = {};
  for (const [nom, god] of [['mortel', false], ['invulnerable', true]]) {
    const a = await trace(urlBase, god), b = await trace(urlVrai, god);
    const n = Math.min(a.lignes.length, b.lignes.length);
    let diverge = -1;
    for (let i = 0; i < n; i++) if (a.lignes[i] !== b.lignes[i]) { diverge = i; break; }
    sortie.sections.identique[nom] = { lignesBase: a.lignes.length, lignesNouveau: b.lignes.length, premiereDivergence: diverge, dernierEtat: b.lignes.at(-1).split(',')[0], empreinteBase: h(a.lignes), empreinteNouveau: h(b.lignes), errBase: a.err, errNouveau: b.err, extraitDivergence: diverge >= 0 ? [a.lignes[diverge], b.lignes[diverge]] : null };
    if (diverge >= 0 || a.lignes.length !== b.lignes.length) echec(`identique/${nom} : divergence à la ligne ${diverge} (${a.lignes.length} / ${b.lignes.length} lignes)`);
    if (b.err || b.erreursConsole.length) echec(`identique/${nom} : erreurs sur le nouveau bundle`);
  }
}

/* ---------- section pilote ---------- */
async function sectionPilote() {
  const cas = [];
  for (const nom of PILOTES) for (let graine = 1; graine <= NB_GRAINES; graine++) {
    const { ctx, p, erreursConsole } = await page(urlVrai, { seed: graine });
    try {
      await p.evaluate(DANS_PAGE);
      const t0 = Date.now();
      const r = await p.evaluate(({ graine, maxT, nom }) => {
        const N = window.__N, S = window.__S, V = window.__V;
        window.__preparer(graine);
        if (nom === 'humain') S.reglages.actions = 'auto';
        N.pilote.lancer(nom);
        if (nom === 'dieu') N.game.dbg.god(true);
        window.__compter();                                   // enveloppe le crochet du pilote : compte ses appels
        let temps = 0, reel = 0, derniere = '', immobile = 0, raison = 'borne'; const vus = {};
        while (temps < maxT && reel < maxT * 4) {
          if (N.game.etat() === 'fin') { raison = 'fin'; break; }
          N.game.dbg.simuler(0.25); reel += 0.25; temps = N.horloge.t();
          vus[N.game.etat()] = (vus[N.game.etat()] || 0) + 1; window.__formes();
          const d = N.game.dbg(), cle = [N.game.etat(), temps.toFixed(3), d.finT.toFixed(3), S.vol ? S.vol.reste.toFixed(3) : ''].join('|');
          immobile = cle === derniere ? immobile + 0.25 : 0; derniere = cle;
          if (immobile > 10) { raison = 'bloque:' + N.game.etat(); break; }
          if (window.__ERR.count) { raison = 'erreur'; break; }
        }
        if (N.game.etat() === 'fin') raison = 'fin';
        const d = N.game.dbg();
        return { pilote: nom, graine, raison, etatFinal: N.game.etat(), tempsJeu: temps, tempsSimule: reel, vague: d.vague, score: d.score, morts: (d.stats.morts || []).map(m => m.cause), cartesPrises: Object.keys(N.cartes.prises ? N.cartes.prises() : {}), err: window.__ERR.count, sigs: window.__ERR.sigs, maj: V.maj, appels: V.pilote, etatsVus: vus, errsForme: V.errsForme, vues: V.vues };
      }, { graine, maxT: MAXT, nom });
      r.erreursConsole = erreursConsole; r.dureeMs = Date.now() - t0; cas.push(r);
      console.log(JSON.stringify({ pilote: nom, graine, raison: r.raison, jeu: +r.tempsJeu.toFixed(1), vague: r.vague, score: r.score, err: r.err, ms: r.dureeMs }));
      if (r.raison !== 'fin') echec(`pilote ${nom} graine ${graine} : arrêt ${r.raison}`);
      if (r.err || r.erreursConsole.length) echec(`pilote ${nom} graine ${graine} : erreurs ${r.err} / console ${r.erreursConsole.length}`);
      if (r.errsForme.length) echec(`pilote ${nom} graine ${graine} : forme : ${r.errsForme[0]}`);
      for (const e of Object.keys(r.maj)) if ((r.appels[e] || 0) !== r.maj[e]) echec(`pilote ${nom} graine ${graine} : état ${e} : ${r.maj[e]} pas, ${r.pilote[e] || 0} appels`);
    } finally { await ctx.close(); }
  }
  sortie.sections.pilote = cas;
}

/* ---------- section console : la vraie boucle d'images, au doigt ---------- */
async function sectionConsole() {
  const { ctx, p, erreursConsole } = await page(urlVrai, { rafStop: false, seed: 7 });
  try {
    await p.evaluate(DANS_PAGE);
    await p.evaluate(() => { localStorage.clear(); window.__N.intro.skip(); window.__N.game.reset(7, { direct: true }); window.__compter(); });
    const vus = {};
    for (let i = 0; i < 100; i++) {                                       // 20 s en vrai, un doigt qui tourne autour de l'arène
      const a = i * 0.35;
      await p.mouse.move(420 + Math.cos(a) * 120, 195 + Math.sin(a) * 60);
      if (i === 0) await p.mouse.down();
      vus[await p.evaluate(() => window.__N.game.etat())] = 1;
      await p.waitForTimeout(200);
    }
    await p.mouse.up();
    const r = await p.evaluate(() => ({ err: window.__ERR.count, sigs: window.__ERR.sigs, maj: window.__V.maj, pilote: window.__V.pilote, etat: window.__N.game.etat(), t: window.__N.horloge.t() }));
    r.etatsVus = Object.keys(vus); r.erreursConsole = erreursConsole; sortie.sections.console = r;
    if (r.err || erreursConsole.length) echec(`console : ${r.err} erreurs, ${erreursConsole.length} messages d'erreur : ${erreursConsole[0] || r.sigs}`);
    for (const e of Object.keys(r.maj)) if ((r.pilote[e] || 0) !== r.maj[e]) echec(`console : état ${e} : ${r.maj[e]} pas, ${r.pilote[e] || 0} appels`);
  } finally { await ctx.close(); }
}

try {
  if (SECTIONS.includes('etats')) await sectionEtats();
  if (SECTIONS.includes('horscombat')) await sectionHorsCombat();
  if (SECTIONS.includes('niveaux')) await sectionNiveaux();
  if (SECTIONS.includes('identique')) await sectionIdentique();
  if (SECTIONS.includes('pilote')) await sectionPilote();
  if (SECTIONS.includes('console')) await sectionConsole();
} finally {
  await browser.close(); srvVrai.close(); if (srvBase) srvBase.close();
}
sortie.echecs = echecs; sortie.conforme = echecs.length === 0;
fs.writeFileSync(path.join(HERE, 'sortie.json'), JSON.stringify(sortie, null, 1) + '\n');
console.log(echecs.length ? `${echecs.length} échec(s)` : 'toutes les mesures passent');
if (!drapeau('--sans-rapport')) {
  const { ecrireRapport } = await import('./rapport-ecrire.mjs');
  ecrireRapport(sortie, { NB_GRAINES, MAXT });
}
process.exit(echecs.length ? 1 : 0);
