/* tools/serpents/empreinte.mjs — HORS AVENTURE, RIEN NE CHANGE : empreinte d'état avant / après le chantier n° 8.
   « après » = le bundle tools/serpents/index.html (node build.mjs tools/serpents/index.html) ; « avant » = le MÊME bundle où
   le module 72-ennemis.js est remplacé par sa copie d'origine (--origine) et où 72-serpents.js est retiré : tout le reste
   (autres modules, art, musique, panneau) est identique octet pour octet. Chaque partie dans une page vierge, au protocole
   des pilotes de Codex (tools/pilotes/parties.mjs : pas fixe, requestAnimationFrame coupé, N.game.reset(graine, { depart })).
   Deux protocoles par graine :
     A. départ « plongee », pilote « bon », jusqu'à 240 s de jeu (ou la fin) ;
     B. départ « jeu », N.game.dbg.vague(4) (vagues où naîtraient BROUILLEUR et MIROIR en aventure), pilote « bon », 90 s.
   Toutes les 5 s de jeu : un relevé (état, vague, score, tête, longueur, chaque ennemi : type, id, position, PV, état fin,
   tirs, butin, états de tous les flux de hasard) ; à la fin : le journal complet (?journal=1). Les deux bundles doivent
   donner des relevés et des journaux identiques. Usage : node tools/serpents/empreinte.mjs --origine <72-ennemis d'origine>
   [--graines 1,2,3]. Sortie 0 si identiques. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..'), PN = path.resolve(HERE, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const origine = arg('--origine', null);
if (!origine) { console.error('--origine <copie d’origine de 72-ennemis.js> attendu'); process.exit(2); }
const graines = arg('--graines', '1,2,3').split(',').map(Number);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/* ---- les deux bundles ---- */
const apres = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const enn = fs.readFileSync(path.join(PN, 'src/72-ennemis.js'), 'utf8'), serp = fs.readFileSync(path.join(PN, 'src/72-serpents.js'), 'utf8');
const bloc = '/* ===== 72-ennemis.js ===== */\n' + enn + '\n/* ===== 72-serpents.js ===== */\n' + serp + '\n';
const n = apres.split(bloc).length - 1;
if (n !== 1) { console.error(`bundle « après » périmé ou ambigu (${n} occurrence) : reconstruire tools/serpents/index.html`); process.exit(2); }
const avant = apres.replace(bloc, () => '/* ===== 72-ennemis.js ===== */\n' + fs.readFileSync(origine, 'utf8') + '\n');
console.log(`après ${sha(apres).slice(0, 12)} (${apres.length} o) ; avant ${sha(avant).slice(0, 12)} (${avant.length} o) ; origine 72-ennemis ${sha(fs.readFileSync(origine)).slice(0, 12)}`);
const pages = { '/proto-neon/tools/serpents/apres.html': apres, '/proto-neon/tools/serpents/avant.html': avant };
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
    await page.goto(`http://127.0.0.1:${server.address().port}/proto-neon/tools/serpents/${quel}.html?journal=1`, { waitUntil: 'load' });
    return await page.evaluate(({ graine, proto }) => {
      const N = window.__N, S = window.__S;
      localStorage.clear(); S.jour = 20261017;
      N.intro.skip();
      N.game.reset(graine, { depart: proto === 'A' ? 'plongee' : 'jeu' });
      if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
      if (proto === 'B') N.game.dbg.vague(4);
      N.pilote.lancer('bon'); N.journal.actif(true);
      N.horloge.avancer();
      const flux = N.ids.flux, r2 = v => Math.round(v * 1000) / 1000;
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
        if (N.horloge.t() >= prochain) { releves.push(releve()); prochain += 5; }
      }
      releves.push(releve());
      const journal = N.journal.dump();
      return { releves, journal: JSON.stringify(journal), evenements: journal.length, fin: N.game.etat(), vague: N.dir.vague(), t: N.horloge.t(),
        err: window.__ERR ? window.__ERR.count : 0, serpents: N.serpents ? JSON.stringify(N.serpents.stats.naissances) : 'absent',
        aventure: !!(N.aventure && N.aventure.enCours()) };
    }, { graine, proto });
  } finally { await ctx.close(); }
}

let ecarts = 0;
const rapport = [];
for (const g of graines) for (const proto of ['A', 'B']) {
  const a = await partie('avant', g, proto), b = await partie('apres', g, proto);
  const ra = JSON.stringify(a.releves), rb = JSON.stringify(b.releves);
  const memeReleves = ra === rb, memeJournal = a.journal === b.journal;
  let premier = -1;
  if (!memeReleves) for (let i = 0; i < Math.max(a.releves.length, b.releves.length); i++) if (JSON.stringify(a.releves[i]) !== JSON.stringify(b.releves[i])) { premier = i; break; }
  const ok = memeReleves && memeJournal && a.err === 0 && b.err === 0 && !b.aventure && b.serpents === '{}';
  if (!ok) ecarts++;
  const ligne = `graine ${g} protocole ${proto} : ${ok ? 'IDENTIQUE' : 'ÉCART'} — ${a.releves.length} relevés, ${a.evenements} événements de journal, `
    + `fin « ${a.fin} » vague ${a.vague} à ${a.t.toFixed(1)} s ; empreinte relevés ${sha(ra).slice(0, 12)} / ${sha(rb).slice(0, 12)}, `
    + `journal ${sha(a.journal).slice(0, 12)} / ${sha(b.journal).slice(0, 12)} ; erreurs ${a.err} / ${b.err} ; serpents nés (après) ${b.serpents}`
    + (premier >= 0 ? ` ; premier écart au relevé ${premier}` : '');
  console.log(ligne); rapport.push(ligne);
}
await browser.close(); server.close();
console.log(ecarts ? `\n${ecarts} écart(s)` : '\nhors aventure : avant et après identiques');
process.exit(ecarts ? 1 : 0);
