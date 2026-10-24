#!/usr/bin/env node
/* À exécuter HORS BAC depuis la racine : node proto-neon/tools/v0/verifier.mjs
   Importer ce module ne démarre ni serveur ni navigateur.
   --precontrole : contrôle Node uniquement ; --racine /copie : autre dépôt à tester.
   Les nombres ci-dessous sont des bornes du banc, pas des règles ajoutées au jeu (src inchangé).
   Chrome mobile émulé ne qualifie pas le vrai Safari iPhone. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { REPO, inventorier, paris, sha } from './inventaire.mjs';
import { temoin } from './temoin.mjs';

export const BANC = Object.freeze({ attenteMs: 30000, pollingMs: 100, avanceVideo: 0.2, luminanceMin: 16,
  graine: 1, jour: 20261017, dt: 1 / 60, tranche: 0.25, tempsJeuMax: 540, facteurSecours: 4 });
export const profils = [
  { nom: 'iphone-paysage', options: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } } },
  { nom: 'iphone-portrait', options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
  { nom: 'bureau', options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false } }
];
export function precontroler(repo = REPO) {
  const inv = inventorier(repo), html = fs.readFileSync(path.join(repo, 'proto-neon/index.html'), 'utf8');
  const declared = html.match(/var CINE_DISPO = (\[[^;]*\]);/);
  const erreurs = [];
  if (!declared) erreurs.push('CINE_DISPO absent du bundle');
  const dispo = declared ? JSON.parse(declared[1]) : [];
  for (const c of inv.clips) {
    if (!fs.existsSync(path.join(repo, 'proto-neon/cine/' + c.nom + '.mp4'))) erreurs.push('Vidéo CLIPS absente : cine/' + c.nom + '.mp4');
    if (!dispo.includes(c.nom)) erreurs.push('Vidéo CLIPS absente de CINE_DISPO : ' + c.nom);
  }
  for (const m of inv.videosHorsClips) erreurs.push('Vidéo non déclarée dans CLIPS : ' + m);
  for (const r of inv.referencesSansFichier) erreurs.push(r.raison + ' : ' + r.fichier + ' depuis ' + r.depuis);
  // Le build original doit correspondre exactement aux sources et assets reçus :
  // le contrôle du hash est fait par la cheffe via le reçu, aucune reconstruction implicite ici.
  return { ok: !erreurs.length, erreurs, inventaire: inv, bundleSha256: sha(html) };
}
const mimes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.png': 'image/png', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ogg': 'audio/ogg' };
// Serveur de fichiers avec Range (Chrome/Safari média), confinement par realpath, pas de sortie réseau.
export function creerServeur(repo, journal) {
  repo = fs.realpathSync(repo);
  return http.createServer((req, res) => {
    let file, u;
    const send = (code, body = '') => { res.statusCode = code; journal.push({ url: req.url, statut: code }); res.end(body); };
    try {
      u = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      file = fs.realpathSync(path.resolve(repo, '.' + u));
      if (!file.startsWith(repo + path.sep) || !fs.statSync(file).isFile()) return send(404);
    } catch { return send(404); }
    if (!['GET', 'HEAD'].includes(req.method)) return send(405);
    const size = fs.statSync(file).size;
    res.setHeader('Content-Type', mimes[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Cache-Control', 'no-store');
    let start = 0, end = size - 1, status = 200;
    if (req.headers.range) {
      const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!r || (!r[1] && !r[2])) { res.setHeader('Content-Range', 'bytes */' + size); return send(416); }
      if (!r[1]) start = Math.max(0, size - Number(r[2]));
      else { start = Number(r[1]); if (r[2]) end = Math.min(end, Number(r[2])); }
      if (start >= size || start > end) { res.setHeader('Content-Range', 'bytes */' + size); return send(416); }
      status = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.statusCode = status; res.setHeader('Content-Length', end - start + 1);
    journal.push({ url: u, statut: status, octets: end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file, { start, end }); stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy()); stream.pipe(res);
  });
}

// Exécuté dans la page : preuves de pixels réels, pas un compteur de draw/play.
function pixels() {
  const N = window.__N, b = N.gfx.buf(), histogramme = Array(16).fill(0); let hash = 2166136261, invalides = 0;
  for (const v of b) { if (v < histogramme.length) histogramme[v]++; else invalides++; hash = Math.imul(hash ^ v, 16777619) >>> 0; }
  return { w: N.gfx.W, h: N.gfx.H, octets: b.length, empreinteFNV32: hash.toString(16), histogramme, couleurs: histogramme.filter(n => n > 0).length, invalides,
    etat: N.game.etat(), err: window.__ERR.count, sigs: window.__ERR.sigs };
}
function dessiner() {
  const N = window.__N;
  const etat = N.game.etat(); N.gfx.origin(0, 0); N.gfx.clear(0);
  if (etat === 'vol' && N.vol.actif()) N.vol.draw();
  else { N.game.draw(); if (etat !== 'aventure') N.fx.draw(); N.game.drawTop(); }
  N.gfx.origin(0, 0);
  if (etat !== 'aventure') N.fx.drawEcran?.();
  if (etat !== 'aventure' && N.horloge.pas() > 0) {
    const film = N.intro.current(), plein = N.ids.tableEtats[etat]?.plein;
    if (film && !N.intro.busy()) N.intro.draw();
    if (!plein && etat !== 'titre' && etat !== 'plongee' && !(film && N.intro.busy())) N.hud.draw();
    if (N.ui.actif()) N.ui.draw();
    if (film && N.intro.busy()) N.intro.draw();
  }
  N.gfx.present(); N.crt.apply(N.R.temps.imageRef);
}
async function toucher(page, profil, x, y) {
  if (profil.options.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
async function attendre(page, fn, arg) { return page.waitForFunction(fn, arg, { timeout: BANC.attenteMs, polling: BANC.pollingMs }); }
async function nouvellePage(ctx, url, resultat, simulation = false) {
  const page = await ctx.newPage(); page.setDefaultTimeout(BANC.attenteMs);
  page.on('pageerror', e => resultat.erreurs.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') resultat.erreurs.push({ type: 'console', message: m.text() }); });
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') resultat.erreurs.push({ type: 'requestfailed', url: r.url(), message: r.failure()?.errorText }); });
  await page.addInitScript(({ simulation, banc }) => {
    localStorage.clear(); window.__SEED = banc.graine;
    if (simulation) { window.__DT = banc.dt; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }
    // Aucun autoplay audible : Chrome est muet dès son lancement. Ne change pas play() ni le décodage.
  }, { simulation, banc: BANC });
  await page.goto(url + '?journal=1', { waitUntil: 'load' });
  await attendre(page, () => !!window.__N?.game && !!window.__N?.gfx && !!window.__ERR);
  return page;
}
async function capturer(page, dir, nom) {
  const p = await page.evaluate(pixels); await page.screenshot({ path: path.join(dir, nom + '.png') }); return p;
}

async function videos(page, inv, dir, resultat, save) {
  await page.evaluate(() => window.__N.art.load());
  for (const { nom } of inv.clips) {
    const r = { nom, ok: false }; resultat.videos.push(r);
    try {
      const debut = await page.evaluate(({ nom, clips }) => {
        const N = window.__N;
        clips.forEach(n => N.art.stop(n));
        const signature = a => { if (!a) return null; let h = 2166136261; for (const x of a.data) h = Math.imul(h ^ x, 16777619) >>> 0; return h; };
        const fixe = signature(N.art.get(nom)), accepte = N.art.play(nom);
        const v = [...document.querySelectorAll('video')].find(v => new URL(v.src).pathname.endsWith('/' + nom + '.mp4'));
        return { accepte, fixe, largeur: v?.videoWidth || 0, t: v?.currentTime ?? null, muet: !!v?.muted };
      }, { nom, clips: inv.clips.map(c => c.nom) });
      r.debut = debut;
      if (!debut.accepte || !debut.muet) throw new Error('N.art.play refusé ou vidéo non muette');
      await attendre(page, ({ nom, debut, banc }) => {
        const N = window.__N, v = [...document.querySelectorAll('video')].find(v => new URL(v.src).pathname.endsWith('/' + nom + '.mp4'));
        if (!v || v.error) return false;
        if (!(v.videoWidth > 0 && v.currentTime > (debut.t || 0) + banc.avanceVideo)) return false;
        const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0);
        const raw = cx.getImageData(0, 0, cv.width, cv.height).data; let nonNoirs = 0;
        for (let i = 0; i < raw.length; i += 4) if ((raw[i] + raw[i + 1] + raw[i + 2]) / 3 > banc.luminanceMin) nonNoirs++;
        const sprite = N.art.get(nom); if (!sprite) return false;
        let hash = 2166136261, invalides = 0, spriteNonNoirs = 0;
        const palette = N.pal.C.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
        for (const x of sprite.data) {
          hash = Math.imul(hash ^ x, 16777619) >>> 0;
          if (x >= palette.length) invalides++;
          else if (palette[x].reduce((a, b) => a + b, 0) / 3 > banc.luminanceMin) spriteNonNoirs++;
        }
        // Un PNG de secours peut être non noir : exiger une image différente du panneau fixe.
        if (!nonNoirs || !spriteNonNoirs || invalides || (debut.fixe !== null && hash === debut.fixe)) return false;
        N.gfx.origin(0, 0); N.gfx.clear(0); N.gfx.blit(sprite, 0, 0); N.gfx.present();
        const buf = N.gfx.buf(); let poses = 0, ecarts = 0;
        const w = Math.min(N.gfx.W, sprite.w), h = Math.min(N.gfx.H, sprite.h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const s = sprite.data[y * sprite.w + x]; if (!s) continue;
          poses++; if (buf[y * N.gfx.W + x] !== s) ecarts++;
        }
        const preuve = { videoWidth: v.videoWidth, videoHeight: v.videoHeight, t: v.currentTime, avance: v.currentTime - (debut.t || 0), readyState: v.readyState, muet: v.muted,
          pixelsVideoNonNoirs: nonNoirs, pixelsConvertisNonNoirs: spriteNonNoirs, imageConvertieHash: hash, differenteDuPanneau: debut.fixe === null ? 'aucun panneau fixe' : hash !== debut.fixe,
          pixelsPoses: poses, ecartsTampon: ecarts, indicesHorsPalette: invalides };
        window.__v0VideoDerniere = preuve; return poses > 0 && ecarts === 0;
      }, { nom, debut, banc: BANC });
      r.preuve = await page.evaluate(() => window.__v0VideoDerniere);
      r.tampon = await capturer(page, dir, 'video-' + nom); r.ok = true;
    } catch (e) {
      r.erreur = String(e.message); r.observation = await page.evaluate(nom => {
        const v = [...document.querySelectorAll('video')].find(v => v.src.endsWith('/' + nom + '.mp4'));
        return v ? { t: v.currentTime, videoWidth: v.videoWidth, readyState: v.readyState, paused: v.paused, erreur: v.error?.message, ended: window.__N.art.ended(nom) } : { absent: true };
      }, nom);
    } finally { await page.evaluate(nom => window.__N.art.stop(nom), nom); save(); }
  }
}

async function actifs(page, inv, resultat, save) {
  // Chaque fichier, y compris les sources de fabrication, est chargé puis décodé en série.
  // La preuve directe est distincte du déclenchement par le jeu décrit par l'inventaire.
  for (const m of inv.medias.filter(m => ['image', 'audio'].includes(m.type))) {
    const r = { fichier: m.fichier, type: m.type, ok: false }; resultat.actifs.push(r);
    try {
      Object.assign(r, await page.evaluate(async ({ fichier, type, timeout }) => {
        const charger = async () => {
          const response = await fetch('/proto-neon/' + fichier);
          if (response.status !== 200) return { statut: response.status, ok: false };
          const ab = await response.arrayBuffer();
          if (type === 'image') {
            const blob = new Blob([ab]), bitmap = await createImageBitmap(blob);
            const v = { statut: response.status, octets: ab.byteLength, w: bitmap.width, h: bitmap.height, ok: bitmap.width > 0 && bitmap.height > 0 };
            bitmap.close(); return v;
          }
          const ac = new AudioContext();
          try {
            const buffer = await ac.decodeAudioData(ab); let pic = 0;
            for (let c = 0; c < buffer.numberOfChannels; c++) for (const p of buffer.getChannelData(c)) pic = Math.max(pic, Math.abs(p));
            return { statut: response.status, duree: buffer.duration, frequence: buffer.sampleRate, canaux: buffer.numberOfChannels, echantillons: buffer.length, pic, ok: buffer.length > 0 && Number.isFinite(pic) && pic > 0 };
          } finally { await ac.close(); }
        };
        let timer; try { return await Promise.race([charger(), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('Décodage expiré : ' + fichier)), timeout); })]); } finally { clearTimeout(timer); }
      }, { fichier: m.fichier, type: m.type, timeout: BANC.attenteMs }));
      if (m.type === 'image' && !m.fichier.slice(4).includes('/')) {
        r.decodeParLeJeu = await page.evaluate(nom => { const a = window.__N.art.get(nom); return !!a?.data?.length && a.w > 0 && a.h > 0; }, m.nom);
        r.ok &&= r.decodeParLeJeu;
      }
    } catch (e) { r.erreur = String(e.message); }
    save();
  }
}

async function parcours(page, profil, dir, resultat) {
  const vp = profil.options.viewport, tap = () => toucher(page, profil, vp.width / 2, vp.height * 0.7);
  await attendre(page, () => window.__N.game.etat() === 'demarrage' && window.__S.ecran?.pret);
  resultat.ecrans.push({ nom: 'demarrage', preuve: await capturer(page, dir, 'demarrage') }); await tap();
  await attendre(page, () => window.__N.game.etat() === 'titre' && window.__S.ecran?.pret);
  resultat.ecrans.push({ nom: 'titre', preuve: await capturer(page, dir, 'titre') }); await tap();
  await attendre(page, () => window.__N.choix.actif() && window.__N.choix.phase() === 'choix');
  resultat.ecrans.push({ nom: 'choix', preuve: await capturer(page, dir, 'choix'), etat: await page.evaluate(() => window.__N.choix.state()) });
  await toucher(page, profil, vp.width < vp.height ? vp.width / 2 : vp.width / 4, vp.height < vp.width ? vp.height / 2 : vp.height / 4);
  await attendre(page, () => window.__N.film.actif() && window.__N.film.state().nom?.startsWith('connexion'));
  await attendre(page, () => window.__N.film.state().t >= window.__N.film.CFG.garde);
  const avant = await page.evaluate(() => window.__N.film.state());
  resultat.ecrans.push({ nom: 'intermede', etat: avant, preuve: await capturer(page, dir, 'intermede') });
  await tap();
  await attendre(page, () => window.__N.aventure.etape() === '1976');
  const apres = await page.evaluate(() => ({ aventure: window.__N.aventure.state(), film: window.__N.film.state(), choix: window.__N.choix.personnage() }));
  resultat.intermede = { avant, apres, ok: avant.t >= 0.3 && apres.film.journal.some(j => j.e.startsWith('saut connexion')) && apres.choix === 'elle' };
  resultat.ecrans.push({ nom: '1976-apres-saut', preuve: await capturer(page, dir, '1976-apres-saut') });
}

async function partie(page, profil, dir, resultat) {
  const init = await page.evaluate(banc => {
    const N = window.__N, S = window.__S;
    localStorage.clear(); S.jour = banc.jour;
    const pilote = N.R.ecrans.attraction.pilote;
    S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
    N.intro.skip(); N.game.reset(banc.graine, { depart: 'plongee' });
    if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
    N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
    N.journal.actif(true); N.horloge.avancer(); return { pilote, graine: banc.graine, etat: N.game.etat() };
  }, BANC);
  resultat.partie = { ...init, ok: false, etats: {} };
  let reel = 0, temps = 0, stagnant = 0, last = '', raison = 'borne';
  while (temps < BANC.tempsJeuMax && reel < BANC.tempsJeuMax * BANC.facteurSecours) {
    const r = await page.evaluate(tranche => {
      const N = window.__N;
      if (N.game.etat() !== 'fin') N.game.dbg.simuler(tranche);
      return { etat: N.game.etat(), t: N.horloge.t(), ecranDepuis: window.__S.ecran?.depuis, vol: window.__S.vol?.t, err: window.__ERR.count };
    }, BANC.tranche);
    reel += BANC.tranche; temps = r.t; resultat.partie.etats[r.etat] = (resultat.partie.etats[r.etat] || 0) + 1;
    if (r.etat === 'fin') { raison = 'fin'; break; }
    if (r.err) { raison = 'erreur'; break; }
    const utile = [r.etat, r.t, r.ecranDepuis, r.vol].join('|'); stagnant = utile === last ? stagnant + BANC.tranche : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + r.etat; break; }
  }
  Object.assign(resultat.partie, await page.evaluate(() => {
    const N = window.__N, d = N.game.dbg(); return { etat: N.game.etat(), tempsJeu: N.horloge.t(), vague: d.vague, score: d.score, journal: N.journal.dump(), erreurs: window.__ERR };
  }), { raison, tempsSimule: reel, ok: raison === 'fin' });
  fs.writeFileSync(path.join(dir, 'journal-partie.json'), JSON.stringify(resultat.partie.journal, null, 2));
  resultat.partie.journalSha256 = sha(JSON.stringify(resultat.partie.journal)); resultat.partie.evenements = resultat.partie.journal.length; delete resultat.partie.journal;
  await page.evaluate(dessiner); resultat.partie.tampon = await capturer(page, dir, 'fin');
  if (raison !== 'fin') return;
  const bouton = await page.evaluate(() => {
    const N = window.__N; N.pilote.arreter();
    N.game.dbg.simuler(N.R.ecrans.fin.garde + N.R.temps.h);
    const a = N.ui.finActions(), rc = a.rejouer, rect = document.querySelector('#out').getBoundingClientRect();
    return { pret: a.pret, x: rect.x + (rc.x + rc.w / 2) * N.gfx.PX, y: rect.y + (rc.y + rc.h / 2) * N.gfx.PX, etatAvant: N.game.etat(), scoreAvant: N.score.score };
  });
  await page.evaluate(dessiner); await toucher(page, profil, bouton.x, bouton.y);
  const apres = await page.evaluate(tranche => {
    const N = window.__N; N.game.dbg.simuler(tranche); return { etat: N.game.etat(), t: N.horloge.t(), score: N.score.score, journal: N.journal.dump().slice(-20) };
  }, BANC.tranche);
  await page.evaluate(dessiner);
  resultat.rejouer = { bouton, apres, preuve: await capturer(page, dir, 'rejouer'), ok: bouton.pret && ['jeu', 'plongee'].includes(apres.etat) && apres.score === 0 };
}

export async function verifier({ repo = REPO, sortie = path.join(REPO, 'proto-neon/tools/v0/navigateur'), precontrole = false } = {}) {
  repo = path.resolve(repo); fs.mkdirSync(sortie, { recursive: true });
  const r = { dateParis: paris(), statut: 'en cours', limites: ['Chrome avec émulation iPhone ; Safari iOS réel reste à vérifier.', 'Lecture exhaustive des médias par N.art.play distincte de leur joignabilité en aventure.', 'Partie complète néon suivant tools/pilotes/parties.mjs ; les époques aventures ne sont pas pilotées de bout en bout.'], banc: BANC, protocoleSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), profils: [], serveur: [] };
  const save = () => fs.writeFileSync(path.join(sortie, 'resultats.json'), JSON.stringify(r, null, 2) + '\n');
  let server;
  try {
    const pre = precontroler(repo); r.precontrole = { ok: pre.ok, erreurs: pre.erreurs }; r.bundleSha256 = pre.bundleSha256; r.sourcesSha256 = pre.inventaire.sourcesSha256;
    r.inventaire = pre.inventaire.resume; r.videosSansDeclenchement = pre.inventaire.medias.filter(m => m.type === 'video' && !m.declenchements.some(d => d.operation === 'play')).map(m => m.fichier);
    if (!pre.ok) throw new Error('Précontrôle refusé : ' + pre.erreurs.join(' ; '));
    if (precontrole) { r.statut = 'précontrôle Node seul réussi ; navigateur non exécuté'; r.ok = true; return r; }
    const t = temoin(repo);
    r.temoin = { ok: t.ok, codeSain: t.codeAvant, codeRenomme: t.codeApres, mutation: t.mutation, recus: '../node/temoin.json' }; save();
    if (!t.ok) throw new Error('Témoin négatif non concluant ; voir tools/v0/node/temoin.json');
    server = creerServeur(repo, r.serveur);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = 'http://127.0.0.1:' + server.address().port, url = origin + '/proto-neon/index.html'; r.origine = origin;
    for (const profil of profils) {
      const q = { nom: profil.nom, viewport: profil.options.viewport, erreurs: [], videos: [], actifs: [], ecrans: [], reseauBloque: [], etapes: [], ok: false }; r.profils.push(q); save();
      const dir = path.join(sortie, profil.nom); fs.mkdirSync(dir, { recursive: true });
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-v0-chrome-')); let ctx;
      try {
        ctx = await chromium.launchPersistentContext(userDataDir, { channel: 'chrome', headless: true, args: ['--mute-audio', '--disable-background-networking'], ...profil.options, serviceWorkers: 'block' });
        q.navigateur = ctx.browser()?.version(); q.profilTemporaire = true;
        await ctx.route('**/*', async route => {
          const u = new URL(route.request().url());
          if (['data:', 'blob:'].includes(u.protocol) || u.origin === origin) return route.continue();
          q.reseauBloque.push(u.origin + u.pathname); await route.abort('blockedbyclient');
        });
        const stage = async (nom, fn) => {
          const p = { nom, ok: false }; q.etapes.push(p);
          try { await fn(); p.ok = true; } catch (e) { p.erreur = String(e.stack || e); }
          save();
        };
        await stage('medias', async () => {
          const page = await nouvellePage(ctx, url, q, true);
          try { await videos(page, pre.inventaire, dir, q, save); await actifs(page, pre.inventaire, q, save); q.erreurMedias = await page.evaluate(() => window.__ERR); }
          finally { await page.close(); }
        });
        await stage('parcours', async () => {
          const page = await nouvellePage(ctx, url, q);
          try { await parcours(page, profil, dir, q); q.erreurParcours = await page.evaluate(() => window.__ERR); }
          finally { await page.close(); }
        });
        await stage('partie-rejouer', async () => {
          const page = await nouvellePage(ctx, url, q, true);
          try { await partie(page, profil, dir, q); q.erreurPartie = await page.evaluate(() => window.__ERR); }
          finally { await page.close(); }
        });
        q.ok = q.etapes.every(e => e.ok) && !q.erreurs.length && !q.reseauBloque.length &&
          [q.erreurMedias, q.erreurParcours, q.erreurPartie].every(e => e?.count === 0) &&
          q.videos.length === pre.inventaire.clips.length && q.videos.every(v => v.ok) &&
          q.actifs.length === pre.inventaire.medias.filter(m => ['image', 'audio'].includes(m.type)).length && q.actifs.every(a => a.ok) &&
          q.intermede?.ok === true && q.partie?.ok === true && q.rejouer?.ok === true && q.ecrans.every(e => e.preuve.invalides === 0 && e.preuve.couleurs > 1);
      } catch (e) { q.erreurs.push({ type: 'harnais', message: String(e.stack || e) }); }
      finally { if (ctx) await ctx.close(); fs.rmSync(userDataDir, { recursive: true, force: true }); save(); }
      console.log(JSON.stringify({ profil: q.nom, ok: q.ok, videos: q.videos.filter(v => v.ok).length, actifs: q.actifs.filter(a => a.ok).length, erreurs: q.erreurs.length }));
    }
    r.ok = r.temoin.ok && r.profils.length === profils.length && r.profils.every(p => p.ok) && !r.serveur.some(x => x.statut >= 400);
    r.statut = r.ok ? 'contrôles navigateur demandés satisfaits ; Safari réel et joignabilité des films restent distincts' : 'contrôle de sortie en échec';
  } catch (e) { r.ok = false; r.statut = 'contrôle en échec'; r.erreur = String(e.stack || e); }
  finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } r.finParis = paris(); save(); }
  return r;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
  if (process.argv.includes('--aide')) console.log('node proto-neon/tools/v0/verifier.mjs [--precontrole] [--racine depot] [--sortie dossier]');
  else { const r = await verifier({ repo: arg('--racine', REPO), sortie: arg('--sortie', path.join(REPO, 'proto-neon/tools/v0/navigateur')), precontrole: process.argv.includes('--precontrole') }); console.log(r.statut); if (!r.ok) process.exitCode = 1; }
}
