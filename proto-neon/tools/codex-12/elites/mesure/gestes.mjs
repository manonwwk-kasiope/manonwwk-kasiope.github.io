/* tools/mesure/gestes.mjs — des doigts simulés par le protocole CDP (Input.dispatchTouchEvent), en points CSS,
   pour les critères des commandes (R-22) et des gestes sûrs (R-33), d'après REFONTE.md § 2.16 et N.R.gestes.
   Chaque envoi liste tous les doigts posés, comme un vrai écran tactile. Les durées sont en temps réel :
   90-boot.js classe les gestes sur performance.now. */
export class Doigts {
  constructor(session) { this.s = session; this.actifs = new Map(); this.id = 1; }
  async init() {
    this.cdp = await this.s.cdpSession();
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
    /* Chromium relâche les points LISTÉS dans un touchEnd : on n'y met que le doigt levé */
    this.actifs.delete(id);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 }] });
  }
  async toutLever() { for (const id of [...this.actifs.keys()]) await this.lever(id); }
  attendre(ms) { return this.s.page.waitForTimeout(Math.max(0, ms)); }
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
    // Lire les valeurs effectivement livrées au jeu : le journal geste n'est pas produit par boot.
    gestes: await session.eval(() => (window.__GESTES_MESURE || []).slice()),
    pouvoirs: J.filter(x => x.type === 'pouvoir' && d(x).evt === 'debut').length,
    apogees: J.filter(x => x.type === 'apogee' && d(x).evt === 'debut').length,
    boosts: J.filter(x => x.type === 'boost').map(x => ({ t: x.t, image: x.image, ...d(x) })),
    traceDoigts: await session.eval(() => window.__TRACE_DOIGTS || []),
    tout: J
  };
}

/* met une partie en jeu, invulnérable, pour tester les doigts sans mourir */
export async function preparerJeu(session) {
  const r = await session.demarrer({ graine: 3, god: true });
  if (!r.ok) return r;
  await session.eval(() => {
    const N=window.__N; window.__S.reglages.actions='doigts';
    window.__GESTES_MESURE=[];
    const update=N.game.update;
    N.game.update=function(dt){
      const I=window.__S.input, neufs=[];
      for(const g of I.gestes || []) {
        const action=g.genre==='toucher'&&I.pouvoir?'pouvoir':g.genre==='glisse'&&I.apogee?'apogee':g.genre==='tenu'&&I.boost?'boost':'aucune';
        neufs.push({...g,action,t:N.horloge.t(),image:window.__FRAME});
      }
      const r=update.apply(this,arguments), p=window.__S.player;
      for(const g of neufs)window.__GESTES_MESURE.push({...g,sortie:p?{boost:p.boost,apogee:p.apogee,pouvoirPret:p.pouvoirPret,etat:p.etat}:null});
      return r;
    };
    try { N.journal.dump({vider:true}); } catch(e){}
  });
  await session.images(20);
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
  /* les accélérations : suites d'images où S.input.boost est vrai */
  const runs = []; let deb = null;
  for (let i = 0; i < I.length; i++) { if (I[i].b && deb === null) deb = I[i].r; if (!I[i].b && deb !== null) { runs.push((I[i].r - deb) / 1000); deb = null; } }
  const parGenre = {};
  for (const g of (L ? L.gestes : [])) { const c = parGenre[g.genre] || (parGenre[g.genre] = {}); c[g.action] = (c[g.action] || 0) + 1; }
  /* durées d'appui du second doigt vues par la page (le pouce est le premier identifiant posé) */
  const E = await session.eval(() => window.__DOIGTS || []), pouceId = E.length ? E[0].id : null, tenues = [];
  for (const e of E) if (e.t === 'touchstart' && e.id !== pouceId) { const f = E.find(x => x.t === 'touchend' && x.id === e.id && x.r >= e.r); if (f) tenues.push((f.r - e.r) / 1000); }
  const ips = I.length > 2 ? (I.length - 1) / ((I[I.length - 1].r - I[0].r) / 1000) : 60;
  void pouce;
  return { source: 'S.input.gestes + impulsions avant update ; sortie S.player après update', entrees: L ? L.gestes : [], traceDoigts: L ? L.traceDoigts : [], gestes: parGenre, journal: !!L, actions: L ? L.gestes.reduce((o2, g) => { o2[g.action] = (o2[g.action] || 0) + 1; return o2; }, {}) : null, boosts: runs, tenues, ips };
}
