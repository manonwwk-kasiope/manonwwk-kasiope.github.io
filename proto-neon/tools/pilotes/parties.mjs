/* codex-02 : node tools/pilotes/parties.mjs [--graines 10] [--pilote nom] [--max 540]
   Une page vierge par partie, départ plongée, simulation officielle, aucun saut de séquence.
   Reçus et journal gzip après chaque partie. Un cache n'est réutilisé que pour le même bundle SHA-256.
   Sortie 1 si une partie bloque, expire, diverge ou remonte une erreur. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const protocole = crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const n = +arg('--graines', 10), maxT = +arg('--max', 540), choice = arg('--pilote', '');
const names = choice ? [choice] : ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'];
const bundle = fs.readFileSync(path.join(ROOT, 'index.html'));
const hash = crypto.createHash('sha256').update(bundle).digest('hex');
fs.mkdirSync(path.join(HERE, 'recus'), { recursive: true });
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const file = path.resolve(ROOT, '.' + u);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.json') ? 'application/json' : 'audio/mpeg');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });
const sortie = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), bundleSha256: hash, protocoleSha256: protocole, navigateur: browser.version(), profil: { width: 844, height: 390 }, graines: n, borneTempsJeu: maxT, cas: [], determinisme: [] };
const save = () => fs.writeFileSync(path.join(HERE, 'sortie.json'), JSON.stringify(sortie, null, 2) + '\n');
async function run(pilote, graine, repetition = false) {
  const cache = `recus/${hash.slice(0, 12)}-${protocole.slice(0, 8)}-lim${maxT}-${pilote}-${graine}${repetition ? '-bis' : ''}.json.gz`;
  const file = path.join(HERE, cache);
  if (fs.existsSync(file)) return { ...JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), cache };
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(seed => { window.__SEED = seed; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }, graine);
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`, { waitUntil: 'load' });
    const result = await page.evaluate(({ pilote, graine, maxT }) => {
      const N = window.__N, S = window.__S;
      localStorage.clear(); S.jour = 20261017;
      if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
      N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
      // Ancien reset ignore depart : le crochet d'état ne saute que l'ouverture initiale, jamais une séquence de partie.
      if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
      N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
      N.journal.actif(true);
      const vus = {};
      let reel = 0, stagnant = 0, last = '', raison = 'borne', temps = 0;
      // Initialiser la boucle au pas fixe, comme prévu par le contrat de simulation.
      N.horloge.avancer();
      const available = () => ({ butin: Array.isArray(S.butin), vue: !!S.vue, voies: Array.isArray(S.voies), vol: !!S.vol, tele: Array.isArray(S.tele), pouvoir: typeof S.player?.pouvoir === 'string', niveaux: !!S.ecran?.niveaux });
      const donneesDebut = available();
      while (temps < maxT && reel < maxT * 4) {
        if (N.game.etat() === 'fin') { raison = 'fin'; break; }
        N.game.dbg.simuler(0.25); reel += 0.25; temps = N.horloge.t();
        const e = N.game.etat(); vus[e] = (vus[e] || 0) + 1;
        // Une séquence a jusqu'à 6 s ; une garde figée plus de 10 s simulées révèle un blocage.
        // Le compteur de pas seul n'est pas une progression du jeu, l'omettre pour le diagnostic de gel.
        const utile = [e, temps, S.ecran?.depuis, S.vol?.t].join('|');
        stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
        if (stagnant > 10) { raison = 'bloque:' + e; break; }
        if (window.__ERR.count) { raison = 'erreur'; break; }
      }
      if (N.game.etat() === 'fin') raison = 'fin';
      const d = N.game.dbg(), journal = N.journal.dump(), morts = journal.filter(e => e.type === 'mort').map(e => e.d);
      const cartes = journal.filter(e => e.type === 'carte').map(e => e.d);
      const decisions = journal.filter(e => e.type === 'pilote');
      return { pilote, graine, raison, fin: N.game.etat() === 'fin', tempsJeu: N.horloge.t(), tempsCombat: d.t, pas: N.horloge.pas(), tempsSimule: reel, vague: d.vague, score: d.score, morts, cartes, err: window.__ERR.count, erreurs: window.__ERR.sigs, donneesDebut, donneesFin: available(), etats: vus, journal, decisions };
    }, { pilote, graine, maxT });
    result.erreursConsole = errors;
    result.journalSha256 = crypto.createHash('sha256').update(JSON.stringify(result.journal)).digest('hex');
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(result)));
    return { ...result, cache };
  } finally { await ctx.close(); }
}
function resume(r) { const { journal, decisions, ...rest } = r; return { ...rest, decisions: decisions.length, evenements: journal.length }; }
function signature(r) { return JSON.stringify([r.raison, r.tempsJeu, r.tempsCombat, r.vague, r.score, r.morts, r.cartes, r.journalSha256]); }
try {
  for (const pilote of names) {
    for (let graine = 1; graine <= n; graine++) {
      const r = await run(pilote, graine); sortie.cas.push(resume(r)); save();
      console.log(JSON.stringify({ pilote, graine, raison: r.raison, secondes: r.tempsJeu, vague: r.vague, score: r.score, err: r.err }));
      if (graine === 1) { const bis = await run(pilote, graine, true); sortie.determinisme.push({ pilote, graine, identique: signature(r) === signature(bis), premier: r.cache, second: bis.cache }); save(); }
    }
  }
  sortie.collecteComplete = sortie.cas.length === names.length * n;
  sortie.conforme = sortie.collecteComplete && sortie.cas.every(c => c.fin && !c.err && !c.erreursConsole.length) && sortie.determinisme.every(c => c.identique);
  save();
  const fmt = x => x.toFixed(2).replace('.', ',');
  const rows = sortie.cas.map(c => `| ${c.pilote} | ${c.graine} | ${fmt(c.tempsJeu)} | ${fmt(c.tempsSimule)} | ${c.vague} | ${c.score} | ${c.morts.map(m => m.cause).join(', ') || '—'} | ${c.cartes.map(m => m.id).join(', ') || '—'} | ${c.err} | ${c.raison} |`);
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  fs.writeFileSync(path.join(HERE, 'rapport.md'), `# codex-02 — parties des pilotes\n\n${date} (Paris).\n\nStatut : **${sortie.conforme ? 'critères du banc satisfaits ; revue Claude attendue' : 'lot non validé'}**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : \`${hash}\`.\n\nProfil iPhone 13 paysage 844 × 390, __DT=1/60, profil vierge par partie, S.jour=20261017. Départ plongée ; simulation officielle par tranches de 0,25 s, arrêt au premier état fin observé ou à ${maxT} s de jeu. Borne de secours à quatre fois ce temps en pas simulés ; détection d’une séquence figée au-delà de dix secondes de pas. Aucun réglage du jeu changé. Les gardes et intermèdes ne sont pas sautés. TempsJeu vient de N.horloge.t(), tempsSimule du nombre de pas (inclut les arrêts d’horloge). Un écran de fin figé reste observé jusqu’à la fin de la tranche en cours. Les éventuelles vues S absentes sont publiées dans donneesDebut/Fin.\n\n| Pilote | Graine | Jeu s | Pas simulés s | Vague | Score | Causes de mort | Cartes | Erreurs | Arrêt |\n|---|---:|---:|---:|---:|---:|---|---|---:|---|\n${rows.join('\n')}\n\nDéterminisme : ${sortie.determinisme.map(d => d.pilote + ' ' + (d.identique ? 'identique' : 'DIVERGE')).join(' ; ')} (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les ${n} graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.\n`);
  if (!sortie.conforme) process.exitCode = 1;
} finally { save(); await browser.close(); await new Promise(r => server.close(r)); }
