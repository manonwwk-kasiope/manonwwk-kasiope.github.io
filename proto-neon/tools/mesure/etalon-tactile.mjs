/* Étalon indépendant du jeu : vrais événements CDP, vraie rAF, réponse de cap
   connue à l'image suivante. Le témoin IGNORE doit être refusé par le même calcul.
   Aucun mode CDP n'est accepté sur la foi de son seul acquittement. */
import { Doigts } from './gestes.mjs';
import { PROFILS, reglesNode } from './commun.mjs';
import { installerTrace, contratEvenements, latence, horlogeReelle } from './tactile.mjs';
export async function validerInstrument(session) {
  const R=await reglesNode();
  const ctx = await session.banc.nav.newContext({ ...PROFILS[session.profil], hasTouch: true });
  const cas = [], erreurs = [];
  let mode = null;
  async function fixture(contrat) {
    const page = await ctx.newPage();
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
    await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><style>html,body{margin:0;touch-action:none}#app{position:fixed;inset:0;touch-action:none}</style><canvas id="app"></canvas>');
    await page.evaluate(R => {
      const el = document.querySelector('#app'); el.width = innerWidth; el.height = innerHeight;
      const ctx = el.getContext('2d'), buf = new Uint8Array(el.width * el.height);
      const p = { x: innerWidth / 2, y: innerHeight / 2, ang: 0, angVise: 0 };
      const S = window.__S = { player: p, input: { stick: {}, gestes: [] } };
      const E = window.__EFFETS = []; window.__ERR = { count: 0 };
      let t = 0, origin = null, second = null, attente = 0;
      const N = window.__N = {
        gfx: { W: el.width, H: el.height, buf: () => buf, present() {
          buf.fill(0); const x = (p.x + el.width) % el.width | 0, y = (p.y + el.height) % el.height | 0;
          buf[y * el.width + x] = 7; ctx.clearRect(0, 0, el.width, el.height); ctx.fillRect(x, y, 8, 8);
        } }, pal: { i: n => n === 'cyan' ? 7 : 8 }, horloge: { t: () => t }, game: { etat: () => 'etalon' }
      };
      for (const type of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(type, e => {
        e.preventDefault(); if (window.__IGNORE) return;
        for (const c of e.changedTouches) {
          if (type === 'touchstart') {
            if (!origin) { origin = { id: c.identifier, x: c.clientX, y: c.clientY }; S.input.stick.active = true; }
            else { second = { id: c.identifier, x: c.clientX, y: c.clientY }; }
          } else if (type === 'touchmove') {
            if (origin && c.identifier === origin.id) { attente = Math.atan2(c.clientY - origin.y, c.clientX - origin.x); }
            else if (second && c.identifier === second.id && Math.hypot(c.clientX - second.x, c.clientY - second.y) >= R.gestes.glisse.distancePt) {
              E.push({ action: 'glisse', x: c.clientX, y: c.clientY }); second.glisse = true;
            }
          } else {
            if (origin && c.identifier === origin.id) { origin = null; S.input.stick.active = false; }
            if (second && c.identifier === second.id) { if (!second.glisse) E.push({ action: 'toucher', x: c.clientX, y: c.clientY }); second = null; }
          }
        }
      }, { passive: false });
      let last;
      function frame(r) {
        requestAnimationFrame(frame); const dt = last === undefined ? 0 : (r - last) / 1000; last = r;
        t += dt; p.ang = p.angVise = attente; p.x += R.joueuse.vitesse.v1 * dt * Math.cos(p.ang); p.y += R.joueuse.vitesse.v1 * dt * Math.sin(p.ang);
        window.__FRAME = (window.__FRAME || 0) + 1; N.gfx.present();
      }
      requestAnimationFrame(frame);
    },R);
    await page.evaluate(installerTrace);
    await page.waitForFunction(() => window.__TACTILE_P43.images.length > 1);
    const s = { page, profil: session.profil, contratTactile: contrat, eval: (fn, a) => page.evaluate(fn, a), cdpSession: () => ctx.newCDPSession(page) };
    return { s, d: await new Doigts(s).init(), page };
  }
  try {
    // Le protocole local documente touchEnd vide ; les variantes sont essayées uniquement
    // sur cet étalon jetable. Un mode non conforme reste publié et n'atteint jamais le jeu.
    for (const candidat of ['mouvement-restants', 'fin-restants', 'fin-leves', 'fin-vide']) {
      const { s, d, page } = await fixture(candidat);
      try {
        const a = await d.poser(100, 160); await d.bouger(a, 130, 160);
        const b = await d.poser(250, 200); await d.lever(b); await d.bouger(a, 130, 150); await d.lever(a);
        const E = await s.eval(() => window.__TRACE_DOIGTS);
        const r = contratEvenements(E, a, b);
        cas.push({ nom: 'contrat-' + candidat, attendu: 'start 1, move 1, start 2, end action seul (pouce actif), end pouce', ...r, evenements: E });
        if (r.ok) { mode = candidat; break; }
      } catch (e) { cas.push({ nom: 'contrat-' + candidat, ok: false, erreur: String(e) }); }
      finally { await page.close(); }
    }
    if (!mode) return { ok: false, mode, cas, erreurs, raison: 'aucun relâchement partiel CDP validé sur DOM' };
    for (const ignore of [false, true]) {
      const { s, d, page } = await fixture(mode);
      try {
        const a = await d.poser(100, 180); await d.bouger(a, 130, 180); await d.attendre(80);
        await s.eval(ignore => { window.__IGNORE = ignore; }, ignore);
        const debut = await s.eval(() => window.__TRACE_DOIGTS.length);
        await d.bouger(a, 100, 150); await d.attendre(350);
        const preuve = await s.eval(() => ({ evenements: window.__TRACE_DOIGTS, images: window.__TACTILE_P43.images }));
        const e = preuve.evenements.slice(debut).find(e => e.type === 'touchmove');
        const mesure = latence(e, preuve.images, -Math.PI / 2, 4 * Math.PI / 180);
        const horloge = horlogeReelle(preuve.images);
        const ok = horloge.ok && (ignore ? !mesure.ok && mesure.images === null : mesure.ok && mesure.images === 1 && mesure.tourne !== null);
        cas.push({ nom: ignore ? 'temoin-geste-ignore' : 'glisse-cap-moins90', attendu: ignore ? 'échec mesuré (aucune réponse)' : 'cap réel -90°, latence 1 image', ok, mesure, horloge, preuve });
        await d.toutLever();
        if (!ignore) {
          const pouce = await d.poser(100, 180); await d.attendre(260);
          const b = await d.poser(250, 200); await d.attendre(70); await d.lever(b);
          const c = await d.poser(250, 200); await d.bouger(c, 285, 200); await d.lever(c); await d.lever(pouce);
          const effets = await s.eval(() => window.__EFFETS);
          cas.push({ nom: 'toucher-et-glisse-effets-connus', ok: effets.length === 2 && effets[0].action === 'toucher' && effets[1].action === 'glisse', effets });
        }
      } finally { await page.close(); }
    }
    return { ok: cas.filter(c => !c.nom.startsWith('contrat-')).every(c => c.ok) && erreurs.length === 0, mode, cas, erreurs };
  } finally { await ctx.close(); await session.page.bringToFront(); }
}
