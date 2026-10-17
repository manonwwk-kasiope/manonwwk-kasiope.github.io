/* tools/mesure/commun.mjs — le banc commun des critères R-01 à R-38 (REFONTE.md § 8.5).
   Un critère est un module de tools/mesure/criteres/ qui exporte `meta` et `mesurer(banc, res)`. Il se lance
   seul (node tools/mesure/criteres/R-02-palette.mjs [options]) ou par le lanceur (node tools/mesure/lancer.mjs).
   Ce fichier fournit : les options, les trois profils, le serveur statique de secours, le navigateur, les
   sessions (une page ouverte sur le jeu, avec la sonde), les résultats et quelques statistiques.
   Le format des sorties est décrit dans tools/mesure/LISEZMOI.md. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { encodeIndex } from './png.mjs';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const PROTO = path.resolve(ICI, '..', '..');
export const DEPOT = path.resolve(PROTO, '..');
const SONDE = fs.readFileSync(path.join(ICI, 'sonde.js'), 'utf8');

/* ---------------------------------------------------------------- options */
export function options(argv = process.argv.slice(2)) {
  const a = (k, d) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const has = k => argv.includes(k);
  const plage = (s, d) => {
    if (!s) return d;
    const out = [];
    for (const p of String(s).split(',')) { const m = p.match(/^(\d+)-(\d+)$/); if (m) { for (let i = +m[1]; i <= +m[2]; i++) out.push(i); } else if (p) out.push(+p); }
    return out;
  };
  const rapide = has('--rapide');
  return {
    url: a('--url', 'http://127.0.0.1:8112/proto-neon/index.html'),
    snake2030: a('--snake2030', null),
    profils: a('--profil', null) ? a('--profil').split(',') : null,
    graines: plage(a('--graines', null), null),
    rapide,
    long: has('--long'),
    sortie: path.resolve(a('--sortie', path.join(ICI, 'sortie'))),
    seulement: a('--seulement', null) ? a('--seulement').split(',').map(s => s.trim().toUpperCase().replace(/^R(\d)/, 'R-$1').replace(/^R-(\d)$/, 'R-0$1')) : null,
    sans: a('--sans', null) ? a('--sans').split(',') : [],
    cache: !has('--sans-cache'),
    visible: has('--visible'),
    bavard: has('--bavard')
  };
}

/* ---------------------------------------------------------------- profils */
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const PROFILS = {
  paysage: { viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA_IPHONE },
  portrait: { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA_IPHONE },
  bureau: { viewport: { width: 1440, height: 900 }, screen: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};
export const TOUS_PROFILS = ['paysage', 'portrait', 'bureau'];

/* ---------------------------------------------------------------- seuils
   Les seuils viennent de N.R (N.R.criteres, N.R.pilotes, N.R.decor.lumiere, N.R.camera…) quand le bundle les
   publie ; sinon de src/02-regles.js lu dans Node ; sinon de ces valeurs du plan (§ 8.5). */
export const SEUILS_PLAN = {
  R02: { palette: 1.0 }, R03: { cyanHorsMasque: 0.005 }, R05: { causes: 8 }, R06: { apparitionsVue: 0, armementsHorsVue: 0 },
  R07: { tele: 0.5, cyclope: 0.8, convoi: 1.5 }, R08: { visible: 0.6, part: 0.95 }, R09: { cadre: [0.15, 0.85], segments: 2 },
  R10: { vitesses: 5, changes: 0.15, duree: 0.5 }, R12: { brasier: 0.08, images: 4, camera: 6 }, R13: { flashsParSeconde: 3, aire: 0.066 },
  R14: { secouees: 0.12, banniere: 10 }, R16: { cartes: 10, tolerance: 2, mortV3: 4 }, R17: { duree: 1.3, fin: 1.5, relance: 2 },
  R19: { attente: 15 }, R20: { x1: 11, x4: 25, iphone: 16.7 }, R21: { profils: 3, pilotes: 8, graines: 5, grainesPaysage: 50 },
  R22: { latenceImages: 1 }, R23: { diriger: 0.15, auto: 0.35 }, R24: { teteHorsQuartBas: 0.95 }, R26: { aigus: 0.25 },
  R29: { arrierePlan: 10, sonRevenu: 1 }, R31: { mouvement: 0.25, vols: 5, convoisV4: 4 }, R32: { quartiers: 7, iou: 0.5, premiereFois: 60 },
  R34: { court: 0.5, long: 0.4, rapport: 0.8 }, R35: { relance: 2, v1Max: 24 }, R37: { cyan: 0.08, silence: 3 }
};
let REGLES_NODE = null;
export async function reglesNode() {
  if (REGLES_NODE !== null) return REGLES_NODE;
  try {
    const vm = await import('node:vm');
    const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
    for (const f of ['00-pal.js', '02-regles.js']) vm.runInContext(fs.readFileSync(path.join(PROTO, 'src', f), 'utf8'), ctx);
    REGLES_NODE = JSON.parse(JSON.stringify(ctx.__N.R || null));
  } catch (e) { REGLES_NODE = undefined; }
  return REGLES_NODE;
}

/* ---------------------------------------------------------------- serveur de secours */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
let SERVEUR = null;
async function joignable(url) {
  try { const r = await fetch(url, { method: 'GET' }); return r.ok; } catch (e) { return false; }
}
export async function assurerServeur(url) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) return { url, propre: false };
  if (await joignable(url)) return { url, propre: false };
  const u = new URL(url);
  const port = +u.port || 80;
  SERVEUR = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(DEPOT, p);
    if (!f.startsWith(DEPOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('absent'); }
    const st = fs.statSync(f), type = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1, 'Accept-Ranges': 'bytes' });
      return fs.createReadStream(f, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((ok, ko) => { SERVEUR.once('error', ko); SERVEUR.listen(port, '127.0.0.1', ok); });
  return { url, propre: true };
}

/* ---------------------------------------------------------------- le banc */
export class Banc {
  constructor(opts) {
    this.o = opts; this.url = opts.url; this.sortie = opts.sortie; this.nav = null; this.sessions = new Set();
    fs.mkdirSync(path.join(this.sortie, 'captures'), { recursive: true });
  }
  async demarrer() {
    await assurerServeur(this.url);
    this.nav = await chromium.launch({ headless: !this.o.visible, args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
    this.empreinte = await empreinteBundle(this.url);
    return this;
  }
  /* une vue du banc pour un critère : mêmes options et même navigateur, mais ses propres sessions, que
     mesurerCritere ferme à la fin du critère sans toucher à celles des critères qui tournent en parallèle */
  enfant() {
    const e = Object.create(this);
    e.sessions = new Set();
    e.ouvrir = async (profil = 'paysage', opts = {}) => { const s = new Session(e, profil, opts); await s.ouvrir(); e.sessions.add(s); return s; };
    return e;
  }
  /* graines à employer : --graines, sinon la valeur du plan, réduite par --rapide */
  graines(plan, rapide = 3) { return this.o.graines || Array.from({ length: this.o.rapide ? rapide : plan }, (_, i) => i + 1); }
  profils(defaut = TOUS_PROFILS) { return this.o.profils || defaut; }
  urlSnake2030() { return this.o.snake2030 || new URL('../snake2030/index.html', this.url).href; }
  /* ouvre une page sur le jeu ; opts : graine, dt, query {k:v}, nodraw, couts, reducedMotion, cpu, url, bloquer (motif d'URL à refuser) */
  async ouvrir(profil = 'paysage', opts = {}) {
    const s = new Session(this, profil, opts);
    await s.ouvrir();
    this.sessions.add(s);
    return s;
  }
  async fermer() {
    for (const s of this.sessions) { try { await s.fermer(); } catch (e) { } }
    if (this.nav) await this.nav.close();
    if (SERVEUR) { SERVEUR.close(); SERVEUR = null; }
  }
}

async function empreinteBundle(url) {
  try { const r = await fetch(url); const t = await r.text(); return crypto.createHash('sha1').update(t).digest('hex').slice(0, 12); } catch (e) { return 'inconnu'; }
}

/* ---------------------------------------------------------------- une session : une page ouverte */
export class Session {
  constructor(banc, profil, opts) { this.banc = banc; this.profil = profil; this.opts = opts; this.console = []; this.pageErreurs = []; }
  async ouvrir() {
    const o = this.opts, P = PROFILS[this.profil];
    if (!P) throw new Error('profil inconnu : ' + this.profil);
    this.ctx = await this.banc.nav.newContext({ ...P, reducedMotion: o.reducedMotion || 'no-preference' });
    if (o.bloquer) await this.ctx.route(o.bloquer, r => r.abort());
    this.page = await this.ctx.newPage();
    this.page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) this.console.push(m.text()); });
    this.page.on('pageerror', e => this.pageErreurs.push(String(e && e.message || e)));
    await this.page.addInitScript(cfg => {
      if (cfg.graine !== undefined) window.__SEED = cfg.graine;
      if (cfg.dt) window.__DT = cfg.dt;
      if (cfg.nodraw) window.__NODRAW = true;
      if (cfg.couts) window.__MESURE_COUTS = true;
      if (cfg.viderStockage) { try { localStorage.clear(); } catch (e) { } }
    }, { graine: o.graine === undefined ? 2975 : o.graine, dt: o.dt, nodraw: o.nodraw, couts: o.couts, viderStockage: o.viderStockage !== false && !o.garderStockage });
    await this.page.addInitScript({ content: SONDE });
    if (o.cpu && o.cpu > 1) { this.cdp = await this.ctx.newCDPSession(this.page); await this.cdp.send('Emulation.setCPUThrottlingRate', { rate: o.cpu }); }
    const u = new URL(o.url || this.banc.url);
    for (const [k, v] of Object.entries(o.query || {})) u.searchParams.set(k, v);
    if (o.journal !== false && !o.url) u.searchParams.set('journal', '1');
    this.urlOuverte = u.href;
    await this.page.goto(u.href, { waitUntil: 'load', timeout: 30000 });
    if (!o.url) {
      try { await this.page.waitForFunction(() => window.__N && window.__S && window.__MESURE, null, { timeout: 15000 }); this.pret = true; }
      catch (e) { this.pret = false; }
    } else this.pret = true;
    return this;
  }
  /* recharge la page (retour à l'état de démarrage, mêmes crochets) */
  async recharger() {
    await this.page.goto(this.urlOuverte, { waitUntil: 'load', timeout: 30000 });
    try { await this.page.waitForFunction(() => window.__N && window.__S && window.__MESURE, null, { timeout: 15000 }); this.pret = true; } catch (e) { this.pret = false; }
  }
  async cdpSession() { if (!this.cdp) this.cdp = await this.ctx.newCDPSession(this.page); return this.cdp; }
  eval(fn, arg) { return this.page.evaluate(fn, arg); }
  /* les chemins d'interface absents de la page ('N.game.dbg.scene', 'S.view.safe', 'N.journal.dump'…) */
  async absents(chemins) {
    if (!this.pret) return chemins.length ? chemins.slice() : ['__N'];
    return this.page.evaluate(l => window.__MESURE.absents(l), chemins);
  }
  etat() { return this.page.evaluate(() => window.__MESURE.etat()); }
  t() { return this.page.evaluate(() => window.__MESURE.t()); }
  image() { return this.page.evaluate(() => window.__FRAME | 0); }
  async attendre(fn, arg, timeout = 15000) {
    try { await this.page.waitForFunction(fn, arg, { timeout, polling: 'raf' }); return true; } catch (e) { return false; }
  }
  /* attend n images (compteur __FRAME), ou s secondes réelles au plus */
  async images(n, maxSec = 30) {
    const f0 = await this.image();
    return this.attendre(o => (window.__FRAME | 0) >= o.f, { f: f0 + n }, maxSec * 1000);
  }
  /* attend que l'horloge de jeu ait avancé de sec secondes */
  async avancer(sec, maxSec = 120) {
    const t0 = await this.t();
    return this.attendre(o => window.__MESURE.t() >= o.t, { t: t0 + sec }, maxSec * 1000);
  }
  /* une scène de référence (§ 7.12) : {ok, raison} */
  async scene(nom, { images = 3 } = {}) {
    const abs = await this.absents(['N.game.dbg.scene']);
    if (abs.length) return { ok: false, raison: 'interface N.game.dbg.scene absente' };
    const r = await this.page.evaluate(n => {
      try { const v = window.__MESURE.dbg().scene(n); return { ok: v !== false, v: v === undefined ? null : (typeof v === 'object' ? null : v), etat: window.__MESURE.etat() }; }
      catch (e) { return { ok: false, raison: 'scène ' + n + ' : ' + (e && e.message || e) }; }
    }, nom);
    if (!r.ok) return { ok: false, raison: r.raison || ('scène ' + nom + ' absente (dbg.scene a rendu false)') };
    if (images) await this.images(images);
    return r;
  }
  /* démarre une partie (§ 4.10 : reset(graine) puis départ direct en plongee) */
  async demarrer(o = {}) {
    const abs = await this.absents(['N.game.reset', 'N.game.etat'].concat(o.pilote ? ['N.pilote.niveau', 'N.pilote.activer'] : []).concat(o.god ? ['N.game.dbg.god'] : []));
    if (abs.length) return { ok: false, raison: (abs.length > 1 ? 'interfaces ' : 'interface ') + abs.join(', ') + (abs.length > 1 ? ' absentes' : ' absente') };
    const r = await this.page.evaluate(x => { try { return window.__MESURE.demarrer(x); } catch (e) { return { ok: false, raison: String(e && e.message || e) }; } }, o);
    if (!r.ok && !r.raison) {
      /* en mode dessiné : quelques touchers simulés pour passer les écrans */
      for (let i = 0; i < 10 && !r.ok; i++) {
        await this.page.evaluate(() => { const d = window.__MESURE.dbg(); if (d && d.input) d.input({ any: true, valider: true }); });
        await this.images(10, 5);
        r.etat = await this.etat(); r.ok = (await this.page.evaluate(() => window.__MESURE.ETATS_JEU)).includes(r.etat);
      }
      if (!r.ok) r.raison = 'départ impossible : état « ' + r.etat + ' » après N.game.reset(graine, {depart:\'plongee\'})';
    }
    return r;
  }
  async tampon(avecMasque = false) {
    const r = await this.page.evaluate(m => window.__MESURE.tamponB64(m), avecMasque);
    r.buf = Buffer.from(r.buf, 'base64'); if (r.masque) r.masque = Buffer.from(r.masque, 'base64');
    return r;
  }
  analyse(o = {}) { return this.page.evaluate(x => window.__MESURE.analyseCourante(x), o); }
  async journal(vider = false) {
    const abs = await this.absents(['N.journal.dump']);
    if (abs.length) return null;
    return this.page.evaluate(v => window.__N.journal.dump(v ? { vider: true } : undefined), vider);
  }
  erreurs() { return this.page.evaluate(() => window.__MESURE ? window.__MESURE.erreurs() : { count: -1, sigs: [] }); }
  async bilanErreurs() {
    const e = this.pret ? await this.erreurs() : { count: -1, sigs: [] };
    return { err: e.count, sigs: e.sigs, console: this.console.slice(0, 20), pageErreurs: this.pageErreurs.slice(0, 20), zero: e.count === 0 && !this.console.length && !this.pageErreurs.length };
  }
  /* capture de l'écran tel qu'affiché (tube compris), en pixels de l'appareil */
  async capture(nom) {
    const f = path.join(this.banc.sortie, 'captures', `${nom}-${this.profil}.png`);
    await this.page.screenshot({ path: f });
    return f;
  }
  /* capture du tampon d'index (avant tube), agrandie ×k, en palette */
  async captureTampon(nom, k = 3, t = null) {
    t = t || await this.tampon(false);
    const pal = await this.page.evaluate(() => (window.__N.pal ? window.__N.pal.C : null));
    const P = (pal || ['#0d0221', '#190b28', '#241734', '#541388', '#2d1b69', '#ff2a6d', '#ff8fab', '#05d9e8', '#d1f7ff', '#ff9e00', '#ffd319', '#ff5714', '#fffce8', '#8a8fa3', '#8b0f3a', '#01012b'])
      .map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    while (P.length < 256) P.push([255, 0, 255]);
    const f = path.join(this.banc.sortie, 'captures', `${nom}-${this.profil}-tampon.png`);
    fs.writeFileSync(f, encodeIndex(t.W, t.H, t.buf, P, k));
    return f;
  }
  async fermer() { this.banc.sessions.delete(this); try { await this.ctx.close(); } catch (e) { } }
}

/* ---------------------------------------------------------------- les résultats */
export const STATUTS = ['ok', 'echec', 'partiel', 'non-mesurable', 'hors-banc', 'erreur'];
export class Resultat {
  constructor(meta) {
    this.id = meta.id; this.titre = meta.titre; this.seuil = meta.seuil; this.bloquant = meta.bloquant !== false;
    this.mesures = []; this.notes = []; this.captures = []; this.debut = Date.now();
  }
  /* une mesure chiffrée : ok vaut true/false ; indicatif : n'entraîne pas l'échec du critère */
  verifie(nom, valeur, seuil, ok, extra = {}) {
    this.mesures.push({ nom, valeur: arrondir(valeur), seuil, statut: ok ? 'ok' : (extra.indicatif ? 'hors-cible' : 'echec'), ...extra });
    return ok;
  }
  indicatif(nom, valeur, seuil, ok, extra = {}) { return this.verifie(nom, valeur, seuil, ok, { ...extra, indicatif: true }); }
  /* une mesure impossible : « non mesurable : interface X absente » */
  nonMesurable(nom, raison, extra = {}) { this.mesures.push({ nom, statut: 'non-mesurable', raison: 'non mesurable : ' + raison, ...extra }); return false; }
  absent(nom, interfaces, extra = {}) {
    const l = [].concat(interfaces);
    return this.nonMesurable(nom, (l.length > 1 ? 'interfaces ' : 'interface ') + l.join(', ') + (l.length > 1 ? ' absentes' : ' absente'), extra);
  }
  horsBanc(nom, raison) { this.mesures.push({ nom, statut: 'hors-banc', raison }); }
  note(t) { this.notes.push(t); }
  capture(f) { if (f) this.captures.push(path.relative(PROTO, f)); }
  erreur(e) { this.exception = String(e && e.stack || e); }
  bilan() {
    const m = this.mesures;
    let statut;
    if (this.exception) statut = 'erreur';
    else if (m.some(x => x.statut === 'echec')) statut = 'echec';
    else if (!m.length || m.every(x => x.statut === 'non-mesurable' || x.statut === 'hors-banc')) statut = m.length && m.every(x => x.statut === 'hors-banc') ? 'hors-banc' : 'non-mesurable';
    else if (m.some(x => x.statut === 'non-mesurable')) statut = 'partiel';
    else statut = 'ok';
    const absentes = [...new Set(m.filter(x => x.statut === 'non-mesurable').map(x => x.raison))];
    return {
      id: this.id, titre: this.titre, seuil: this.seuil, bloquant: this.bloquant, statut,
      resume: resumeStatut(statut, m, absentes),
      mesures: m, notes: this.notes, captures: this.captures, duree: +((Date.now() - this.debut) / 1000).toFixed(1),
      ...(this.exception ? { exception: this.exception } : {})
    };
  }
}
function resumeStatut(statut, m, absentes) {
  const n = k => m.filter(x => x.statut === k).length;
  if (statut === 'non-mesurable') return absentes[0] ? absentes.slice(0, 3).join(' ; ') : 'non mesurable : aucune mesure';
  if (statut === 'hors-banc') return m.map(x => x.raison).join(' ; ');
  return `${n('ok')} ok, ${n('echec')} en échec, ${n('hors-cible')} indicatives hors cible, ${n('non-mesurable')} non mesurables`;
}
export function arrondir(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : +v.toFixed(5);
  if (Array.isArray(v)) return v.map(arrondir);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = arrondir(v[k]); return o; }
  return v;
}

/* ---------------------------------------------------------------- statistiques */
export const stats = {
  quantile(a, q) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); },
  p95(a) { return stats.quantile(a, 0.95); },
  mediane(a) { return stats.quantile(a, 0.5); },
  moyenne(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; },
  part(a, f) { return a.length ? a.filter(f).length / a.length : null; },
  correlation(x, y) {
    const n = Math.min(x.length, y.length); if (n < 3) return null;
    const mx = stats.moyenne(x.slice(0, n)), my = stats.moyenne(y.slice(0, n));
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
};
export const pct = v => v === null || v === undefined ? '—' : (100 * v).toFixed(2) + ' %';

/* ---------------------------------------------------------------- exécution d'un critère */
export function principal(urlModule) { return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === urlModule; }

export async function mesurerCritere(banc, mod) {
  const res = new Resultat(mod.meta), b0 = banc.enfant();
  try { await mod.mesurer(b0, res); } catch (e) { res.erreur(e); }
  for (const s of [...b0.sessions]) { try { await s.fermer(); } catch (e) { } }
  const b = res.bilan();
  b.bundle = { url: banc.url, empreinte: banc.empreinte };
  b.date = new Date().toISOString();
  fs.writeFileSync(path.join(banc.sortie, `${mod.meta.id}.json`), JSON.stringify(b, null, 1));
  return b;
}

export function ligneBilan(b) {
  const t = { ok: 'OK', echec: 'ÉCHEC', partiel: 'PARTIEL', 'non-mesurable': 'NON MESURABLE', 'hors-banc': 'HORS BANC', erreur: 'ERREUR' }[b.statut];
  return `${b.id.padEnd(5)} ${t.padEnd(14)} ${b.titre} — ${b.resume}`;
}

/* lancement d'un critère seul : node tools/mesure/criteres/R-xx-….mjs [options] */
export async function executer(mod) {
  const o = options();
  const banc = await new Banc(o).demarrer();
  let b;
  try { b = await mesurerCritere(banc, mod); } finally { await banc.fermer(); }
  console.log(ligneBilan(b));
  for (const m of b.mesures) console.log('   ' + (m.statut === 'ok' ? 'ok   ' : m.statut === 'echec' ? 'ÉCHEC' : m.statut === 'hors-cible' ? '(i)  ' : '·    ') + ' ' + m.nom + (m.valeur !== undefined ? ' = ' + JSON.stringify(m.valeur) : '') + (m.seuil !== undefined ? ' (seuil ' + JSON.stringify(m.seuil) + ')' : '') + (m.raison ? ' — ' + m.raison : ''));
  for (const n of b.notes) console.log('   note : ' + n);
  if (b.exception) console.log(b.exception);
  console.log('   → ' + path.relative(process.cwd(), path.join(o.sortie, b.id + '.json')));
  process.exit(b.statut === 'echec' || b.statut === 'erreur' ? 1 : 0);
}

/* ---------------------------------------------------------------- aides communes aux critères */
/* lit les seuils du critère dans la page (N.R.criteres), sinon dans src/02-regles.js, sinon dans le plan */
export async function seuils(session, cle) {
  let R = null;
  if (session && session.pret) R = await session.eval(() => { try { return window.__N.R ? JSON.parse(JSON.stringify(window.__N.R)) : null; } catch (e) { return null; } });
  if (!R) R = await reglesNode();
  const c = R && R.criteres && R.criteres[cle];
  return { R: R || {}, s: c || SEUILS_PLAN[cle] || {}, source: c ? (session && session.pret ? 'N.R' : 'src/02-regles.js') : 'REFONTE.md § 8.5' };
}
/* vérifie des interfaces ; si l'une manque, inscrit « non mesurable » et rend false */
export async function exiger(session, res, nom, chemins) {
  const abs = await session.absents(chemins);
  if (abs.length) { res.absent(nom, abs); return false; }
  return true;
}
/* les scènes de jeu de référence pour les dix captures de jeu (R-02, R-03) */
export const SCENES_JEU = ['calme', 'montee', 'chaos', 'colosse', 'charge', 'v5', 'boss3', 'travelling', 'convoi', 'lasso6'];
export const SCENES_SPECIALES = ['vol', 'inversion', 'cartes', 'fin', 'mortTir'];
