/* empreinte-tempo.mjs — HORS AVENTURE, RIEN NE CHANGE : empreinte d'état avant / après le chantier n° 1 (le tempo).
   Adapté de proto-neon/tools/serpents/empreinte.mjs. « après » = proto-neon/index.html de la copie (node build.mjs) ;
   « avant » = le MÊME bundle où chaque module touché est remplacé par sa version d'origine (origin/claude/snake-game-mobile-17dqpi),
   tout le reste identique octet pour octet. Deux protocoles par graine, au protocole des pilotes (pas fixe, rAF coupé,
   N.game.reset(graine, { depart })) :
     A. départ « plongee », pilote « bon », jusqu'à 240 s de jeu (ou la fin) ;
     B. départ « jeu », N.game.dbg.vague(4), pilote « bon », 90 s.
   Relevés toutes les 5 s (état, vague, score, tête, longueur, ennemis, tirs, butin, flux de hasard) et journal complet.
   Usage : node empreinte-tempo.mjs <proto-neon> <dossier des originaux> [graines]. Sortie 0 si identiques. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PN = path.resolve(process.argv[2]), ORIG = path.resolve(process.argv[3]), ROOT = path.dirname(PN);
const graines = (process.argv[4] || '1,2,3').split(',').map(Number), FORCE = process.argv.includes('--force-aventure'), PROTOS = FORCE ? ['A'] : ['A', 'B'];
const MODULES = ['02-regles', '15-decor', '17-vol', '30-music', '74-arsenal', '76-directeur'];
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const apres = fs.readFileSync(path.join(PN, 'index.html'), 'utf8');
let avant = apres;
for (const m of MODULES) {
  const cur = fs.readFileSync(path.join(PN, 'src', m + '.js'), 'utf8'), org = fs.readFileSync(path.join(ORIG, m + '.js'), 'utf8');
  const bloc = `/* ===== ${m}.js ===== */\n` + cur + '\n';
  const n = avant.split(bloc).length - 1;
  if (n !== 1) { console.error(`bundle « après » périmé ou ambigu pour ${m} (${n} occurrence) : node build.mjs`); process.exit(2); }
  avant = avant.replace(bloc, () => `/* ===== ${m}.js ===== */\n` + org + '\n');
}
if (avant === apres) { console.error('avant = après : rien à comparer'); process.exit(2); }
console.log(`après ${sha(apres).slice(0, 12)} (${apres.length} o) ; avant ${sha(avant).slice(0, 12)} (${avant.length} o)`);
const pages = { '/proto-neon/empreinte-apres.html': apres, '/proto-neon/empreinte-avant.html': avant };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (pages[u]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(pages[u]); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', f.endsWith('.png') ? 'image/png' : f.endsWith('.json') ? 'application/json' : f.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });

async function partie(quel, graine, proto) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(seed => { window.__SEED = seed; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }, graine);
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/proto-neon/empreinte-${quel}.html?journal=1`, { waitUntil: 'load' });
    const r = await page.evaluate(({ graine, proto, FORCE }) => {
      const N = window.__N, S = window.__S;
      if (FORCE) N.aventure.enCours = () => true;   /* témoin : la même partie « en aventure » doit, elle, différer */
      localStorage.clear(); S.jour = 20261017;
      N.intro.skip();
      N.game.reset(graine, { depart: proto === 'A' ? 'plongee' : 'jeu' });
      if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
      if (proto === 'B') N.game.dbg.vague(4);
      N.pilote.lancer('bon'); N.journal.actif(true);
      N.horloge.avancer();
      const flux = N.ids.flux, r2 = v => Math.round(v * 1000) / 1000;
      const etats = {};
      const releve = () => ({
        t: r2(N.horloge.t()), pas: N.horloge.pas(), etat: N.game.etat(), vague: N.dir.vague(), score: N.score.score,
        P: [r2(N.joueuse.tete.x), r2(N.joueuse.tete.y), r2(N.joueuse.tete.ang), N.joueuse.len(), N.joueuse.etat],
        E: N.ennemis.list.map(e => [e.type, e.id, r2(e.x), r2(e.y), r2(e.pv), e._st, e.etat]),
        tirs: N.ennemis.tirs.length, tirsJ: N.arsenal.tirs.length, butin: N.butin.list.map(o => [o.type, r2(o.x), r2(o.y), o.valeur]),
        rng: flux.map(f => { try { return JSON.stringify(N.rng(f).etat()); } catch (x) { return '?'; } }).join('|')
      });
      const borne = proto === 'A' ? 240 : 90, releves = [];
      let prochain = 0, garde = 0;
      while (N.horloge.t() < borne && garde++ < 4000) {
        if (N.game.etat() === 'fin') break;
        N.game.dbg.simuler(0.25);
        etats[N.game.etat()] = 1;
        if (N.horloge.t() >= prochain) { releves.push(releve()); prochain += 5; }
      }
      releves.push(releve());
      const journal = N.journal.dump();
      return { releves, journal: JSON.stringify(journal), evenements: journal.length, fin: N.game.etat(), vague: N.dir.vague(), t: N.horloge.t(),
        err: window.__ERR ? window.__ERR.count : 0, aventure: !!(N.aventure && N.aventure.enCours()), etats: Object.keys(etats).join(','),
        tempoJeu: N.music.tempoJeu ? N.music.tempoJeu(144.6) : 'absent', armes: JSON.stringify(N.arsenal.equipees ? N.arsenal.equipees() : null) };
    }, { graine, proto, FORCE });
    r.pageErr = erreurs.length;
    return r;
  } finally { await ctx.close(); }
}

let ecarts = 0;
for (const g of graines) for (const proto of PROTOS) {
  const a = await partie('avant', g, proto), b = await partie('apres', g, proto);
  const ra = JSON.stringify(a.releves), rb = JSON.stringify(b.releves);
  const memeReleves = ra === rb, memeJournal = a.journal === b.journal;
  let premier = -1;
  if (!memeReleves) for (let i = 0; i < Math.max(a.releves.length, b.releves.length); i++) if (JSON.stringify(a.releves[i]) !== JSON.stringify(b.releves[i])) { premier = i; break; }
  const ok = memeReleves && memeJournal && a.err === 0 && b.err === 0 && (FORCE || (!b.aventure && b.tempoJeu === 144.6));
  if (!ok) ecarts++;
  console.log(`graine ${g} protocole ${proto} : ${ok ? 'IDENTIQUE' : 'ÉCART'} — ${a.releves.length} relevés, ${a.evenements} événements de journal, `
    + `fin « ${a.fin} » vague ${a.vague} à ${a.t.toFixed(1)} s ; états ${b.etats} ; empreinte relevés ${sha(ra).slice(0, 12)} / ${sha(rb).slice(0, 12)}, `
    + `journal ${sha(a.journal).slice(0, 12)} / ${sha(b.journal).slice(0, 12)} ; erreurs ${a.err}+${a.pageErr} / ${b.err}+${b.pageErr} ; tempoJeu (après) ${b.tempoJeu}`
    + (premier >= 0 ? ` ; premier écart au relevé ${premier}` : ''));
}
await browser.close(); server.close();
console.log(ecarts ? `\n${ecarts} écart(s)` : '\nhors aventure : avant et après identiques');
process.exit(ecarts ? 1 : 0);
