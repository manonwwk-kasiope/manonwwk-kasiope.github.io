/* tools/codex-p21/gestes.mjs — des doigts simulés par le protocole CDP (Input.dispatchTouchEvent), en points CSS,
   pour les critères des commandes (R-22) et des gestes sûrs (R-33), d'après REFONTE.md § 2.16 et N.R.gestes.
   Chaque envoi liste tous les doigts posés, comme un vrai écran tactile. Les durées sont lues dans la page :
   performance.now, horloge explicite du vérificateur ou horloge réelle du lancement autonome. */
export class Doigts {
  constructor(session) { this.s = session; this.actifs = new Map(); this.id = 1; }
  async init() {
    this.cdp = await this.s.cdpSession();
    if (this.s.profil === 'bureau') await this.cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    // Banc p21 : une seule horloge explicite, indépendante du retard de transport CDP.
    if (this.s.horlogeControlee && !this.s.__p21Clock) {
      const instant = new Date();
      await this.s.page.clock.install({ time: instant });
      await this.s.page.clock.pauseAt(instant);
      this.s.__p21Clock = true;
    }
    await this.s.eval(() => {
      if(window.__TRACE_DOIGTS_INSTALLE)return;
      window.__TRACE_DOIGTS_INSTALLE=true;window.__TRACE_DOIGTS=[];
      for(const type of ['touchstart','touchmove','touchend','touchcancel'])
        window.addEventListener(type,e=>{
          const r=performance.now(),changes=Array.from(e.changedTouches,c=>({id:c.identifier,x:c.clientX,y:c.clientY}));
          queueMicrotask(()=>{const S=window.__S,I=S.input,st=I.stick;
            window.__TRACE_DOIGTS.push({type,r,changes,actifs:e.touches.length,stick:st?{active:st.active,ox:st.ox,oy:st.oy}:null,
              pouvoir:!!I.pouvoir,apogee:!!I.apogee,boost:!!I.boost,gestes:I.gestes.map(g=>({...g}))});
          });
        },{capture:true,passive:true});
    });
    return this;
  }
  points() { return [...this.actifs.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 })); }
  async envoyer(type) { await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: this.points() }); }
  async poser(x, y) { const id = this.id++; this.actifs.set(id, { x, y }); await this.envoyer('touchStart'); return id; }
  async bouger(id, x, y) { const p = this.actifs.get(id); if (!p) return; p.x = x; p.y = y; await this.envoyer('touchMove'); }
  async lever(id) {
    const p = this.actifs.get(id); if (!p) return;
    /* CDP attend l'ensemble ACTIF ; une liste réduite libère le doigt absent.
       touchEnd ne reçoit aucun point (protocol.d.ts, Input.dispatchTouchEvent). */
    this.actifs.delete(id);
    await this.envoyer(this.actifs.size ? 'touchMove' : 'touchEnd');
  }
  async toutLever() { for (const id of [...this.actifs.keys()]) await this.lever(id); }
  attendre(ms) { return this.s.__p21Clock ? this.s.page.clock.runFor(Math.max(0, ms)) : this.s.page.waitForTimeout(Math.max(0, ms)); }
  /* un glissé de (x0,y0) à (x1,y1) en ms, par pas de 16 ms */
  async glisser(id, x1, y1, ms) {
    const p = this.actifs.get(id); const x0 = p.x, y0 = p.y, n = Math.max(1, Math.round(ms / 16));
    for (let k = 1; k <= n; k++) { await this.bouger(id, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n); await this.attendre(ms / n); }
  }
  /* le manche : un pouce posé à gauche, tenu, qui vise vers (dx, dy) */
  async manche(x, y, dx = 30, dy = 0) { const id = await this.poser(x, y); await this.attendre(30); await this.glisser(id, x + dx, y + dy, 60); return id; }
}

/* les gestes et actions journalisés depuis un instant (journal 'geste', 'pouvoir', 'apogee', 'boost') */
export async function lireGestes(session) {
  const J = await session.journal(true);
  if (!J) return null;
  const d = x => x.d || x;
  return {
    // Le boot reçu publie désormais geste : on lit la vraie trace plutôt qu'un compteur d'appels.
    gestes: J.filter(x => x.type === 'geste').map(x => ({...x.d, t:x.t, image:x.image})),
    pouvoirs: J.filter(x => x.type === 'pouvoir' && d(x).evt === 'debut').length,
    apogees: J.filter(x => x.type === 'apogee' && d(x).evt === 'debut').length,
    boosts: J.filter(x => x.type === 'boost').map(x => ({ t: x.t, image: x.image, ...d(x) })),
    traceDoigts: await session.eval(() => window.__TRACE_DOIGTS || []),
    tout: J
  };
}

/* met une partie en jeu, invulnérable, pour tester les doigts sans mourir */
export async function preparerJeu(session) {
  await session.eval(() => window.__N.intro.skip());
  const r = await session.demarrer({ graine: 3, god: true });
  if (!r.ok) return r;
  await session.eval(() => {
    const N=window.__N; window.__S.reglages.actions='doigts';
    try { N.journal.dump({vider:true}); } catch(e){}
  });
  await session.images(20);
  if (session.attendre && !await session.attendre(() => window.__N.game.etat() === 'jeu'))
    return { ok: false, raison: 'aucun état jeu réel après la plongée' };
  return r;
}

/* un tirage reproductible pour les séries « humaines » (mulberry32) */
export function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* la taille de la vue en points CSS */
export function vue(session) { const v = session.page.viewportSize(); return { w: v.width, h: v.height }; }

/* n gestes du second doigt (genre 'toucher' | 'glisse' | 'tenu'), pouce tenu sur le manche ;
   rend {gestes:{genre:{action:n}}, actions, boosts:[durées en s]} */
export async function serieSecondDoigt(session, genre, n, o = {}) {
  const d = await new Doigts(session).init(), V = vue(session);
  await session.eval(() => {
    // Une scène jouable indépendante évite de mesurer les menus atteints par le scénario précédent.
    const N=window.__N; N.game.dbg.scene('calme'); N.game.dbg.god(true); window.__S.reglages.actions='doigts';
  });
  await session.eval(() => {
    try { window.__N.journal.dump({ vider: true }); } catch (e) { }
    window.__GESTES_MESURE=[]; window.__TRACE_DOIGTS=[];
    window.__MESURE.parImage('boost', 'return { b: !!(S.input && S.input.boost), p: !!(S.player && S.player.boost), r: performance.now() };');
    /* les instants de pose et de relâcher vus par la page, par identifiant */
    window.__DOIGTS = []; if (!window.__DOIGTS_ECOUTE) { window.__DOIGTS_ECOUTE = true;
      for (const t of ['touchstart', 'touchend']) window.addEventListener(t, e => { for (const c of e.changedTouches) (window.__DOIGTS || []).push({ t, id: c.identifier, r: performance.now() }); }, { capture: true, passive: true }); }
  });
  const pouce = await d.manche(V.w * 0.22, V.h * 0.62, 26, 0);
  await d.attendre(260);
  for (let k = 0; k < n; k++) {
    const x = V.w * (0.6 + 0.2 * ((k * 7) % 5) / 5), y = V.h * (0.3 + 0.3 * ((k * 3) % 5) / 5);
    // Chaque essai possède un pouvoir prêt, une jauge pleine et sa réserve.
    // Ce sont des cas indépendants ; aucune recharge naturelle n'est revendiquée.
    await session.eval(() => { const N=window.__N, p=window.__S.player;
      const pos={x:p.x,y:p.y,ang:p.ang,trace:true}; N.joueuse.reset(); N.joueuse.god(true);
      N.joueuse.force(pos); N.joueuse.apogeeAjouter(100); });
    const id = await d.poser(x, y);
    if (genre === 'toucher') await d.attendre(o.duree || 70);
    else if (genre === 'glisse') await d.glisser(id, x + 70, y - 20, o.duree || 110);
    else if (genre === 'tenu') await d.attendre((o.duree || 0.5) * 1000);
    await d.lever(id);
    await d.attendre(o.pause || 280);
  }
  await d.toutLever(); await d.attendre(200);
  const I = await session.eval(() => window.__MESURE.arreter('boost'));
  const L = await lireGestes(session);
  /* les accélérations : suites d'images où la sortie S.player.boost est vraie */
  const runs = []; let deb = null;
  for (let i = 0; i < I.length; i++) { if (I[i].p && deb === null) deb = I[i].r; if (!I[i].p && deb !== null) { runs.push((I[i].r - deb) / 1000); deb = null; } }
  const parGenre = {};
  for (const g of (L ? L.gestes : [])) { const c = parGenre[g.genre] || (parGenre[g.genre] = {}); c[g.action] = (c[g.action] || 0) + 1; }
  /* durées d'appui du second doigt vues par la page (le pouce est le premier identifiant posé) */
  const E = await session.eval(() => window.__DOIGTS || []), pouceId = E.length ? E[0].id : null, tenues = [];
  for (const e of E) if (e.t === 'touchstart' && e.id !== pouceId) { const f = E.find(x => x.t === 'touchend' && x.id === e.id && x.r >= e.r); if (f) tenues.push((f.r - e.r) / 1000); }
  const ips = I.length > 2 ? (I.length - 1) / ((I[I.length - 1].r - I[0].r) / 1000) : 60;
  void pouce;
  return { sortie: I, source: 'journal geste du boot ; pouvoirs/APOGÉE début réels ; boost S.player ; essais indépendants prêts', entrees: L ? L.gestes : [], traceDoigts: L ? L.traceDoigts : [], gestes: parGenre, journal: !!L, actions: L ? {pouvoir:L.pouvoirs,apogee:L.apogees,boost:L.boosts.filter(x=>x.evt==='on').length} : null, boosts: runs, tenues, ips };
}
