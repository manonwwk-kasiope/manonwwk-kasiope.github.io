import { installerTrace, horlogeReelle } from './tactile.mjs';
/* tools/mesure/gestes.mjs — codex-p43 ; horloge réelle uniquement.
   Contrat de relâchement partiel étalonné sur DOM avant tout verdict.
   Des doigts simulés par le protocole CDP (Input.dispatchTouchEvent), en points CSS,
   pour les critères des commandes (R-22) et des gestes sûrs (R-33), d'après REFONTE.md § 2.16 et N.R.gestes.
   Chaque envoi liste tous les doigts posés, comme un vrai écran tactile. Les durées sont lues dans la page :
   performance.now et rAF réels, sans __DT ni horloge Playwright. */
export class Doigts {
  constructor(session) { this.s = session; this.actifs = new Map(); this.id = 1; }
  async init() {
    this.cdp = await this.s.cdpSession();
    if (this.s.horlogeControlee || this.s.__p21Clock) throw Error('instrument p43 : horloge artificielle refusée');
    if (await this.s.eval(() => typeof window.__DT === 'number')) throw Error('instrument p43 : __DT forcé refusé');
    await this.s.eval(installerTrace);
    return this;
  }
  points() { return [...this.actifs.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 })); }
  async envoyer(type) { await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: this.points() }); }
  async poser(x, y) { const id = this.id++; this.actifs.set(id, { x, y }); await this.envoyer('touchStart'); return id; }
  async bouger(id, x, y) { const p = this.actifs.get(id); if (!p) return; p.x = x; p.y = y; await this.envoyer('touchMove'); }
  async lever(id) {
    const p = this.actifs.get(id); if (!p) return;
    this.actifs.delete(id);
    if (!this.actifs.size) return this.envoyer('touchEnd');
    // Choix validé sur les événements DOM réels du navigateur, jamais deviné du nom CDP.
    const mode = this.s.contratTactile;
    if (!mode) throw Error('relâchement partiel CDP non étalonné');
    const point = { ...p, id, radiusX: 8, radiusY: 8, force: 1 };
    await this.cdp.send('Input.dispatchTouchEvent', {
      type: mode === 'mouvement-restants' ? 'touchMove' : 'touchEnd',
      touchPoints: mode === 'fin-leves' ? [point] : mode === 'fin-vide' ? [] : this.points()
    });
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
  if (!session.instrumentTactile) {
    const { validerInstrument } = await import('./etalon-tactile.mjs');
    session.instrumentTactile = await validerInstrument(session);
    session.contratTactile = session.instrumentTactile.mode;
  }
  if (!session.instrumentTactile.ok) return { ok: false, raison: 'étalon tactile en échec', instrument: session.instrumentTactile };
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
  await session.eval(installerTrace);
  await session.eval(() => {window.__TACTILE_P43.images=[];});
  await session.images(20);
  const images=await session.eval(()=>window.__TACTILE_P43.images);
  r.horloge=horlogeReelle(images);
  if(!r.horloge.ok)return {ok:false,raison:'horloge réelle et déplacement du jeu non validés',horloge:r.horloge};
  return r;
}


/* Position initiale construite pour un cas de commande indépendant. */
export async function preparerScene(session) {
  await session.eval(() => {
    const N=window.__N; N.entree.annuler(); N.game.dbg.scene('calme'); N.joueuse.reset(); N.game.dbg.god(true);
    window.__S.reglages.actions='doigts';
    const A=N.outils.A; N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});
  });
  await session.images(2);
}

/* un tirage reproductible pour les séries « humaines » (mulberry32) */
export function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* la taille de la vue en points CSS */
export function vue(session) { const v = session.page.viewportSize(); return { w: v.width, h: v.height }; }

/* n gestes du second doigt (genre 'toucher' | 'glisse' | 'tenu'), pouce tenu sur le manche ;
   rend {gestes:{genre:{action:n}}, actions, boosts:[durées en s]} */
export async function serieSecondDoigt(session, genre, n, o = {}) {
  const d = await new Doigts(session).init(), V = vue(session);
  const essais = [], J = [], E = [], I = [], runs = [], tenues = [];
  for (let k = 0; k < n; k++) {
    await session.eval(() => {
      const N=window.__N; N.entree.annuler(); N.game.dbg.scene('calme'); N.joueuse.reset(); N.game.dbg.god(true);
      window.__S.reglages.actions='doigts';
      const A=N.outils.A; N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});
      N.joueuse.apogeeAjouter(N.R.apogee.max);
    });
    const pouce = await d.manche(V.w * 0.22, V.h * 0.62, 26, 0);
    await d.attendre(260);
    await session.eval(() => { window.__N.journal.vider(); window.__TRACE_DOIGTS=[]; window.__TACTILE_P43.images=[]; });
    const x=V.w*0.7, y=V.h*0.5, id=await d.poser(x,y);
    if (genre==='toucher') await d.attendre(o.duree || 70);
    else if (genre==='glisse') await d.glisser(id,x+70,y-20,o.duree || 110);
    else await d.attendre((o.duree || 0.5)*1000);
    await d.lever(id); await d.attendre(o.pause || 280);
    const L=await lireGestes(session), images=await session.eval(()=>window.__TACTILE_P43.images);
    const debut=L.traceDoigts.find(e=>e.type==='touchstart'&&e.changes.some(p=>p.id===id));
    const fin=L.traceDoigts.find(e=>e.type==='touchend'&&e.changes.some(p=>p.id===id));
    tenues.push(debut&&fin?(fin.r-debut.r)/1000:null);
    let start=null;
    for (const image of images) {
      if(image.boost&&start===null)start=image.r;
      if(!image.boost&&start!==null){runs.push((image.r-start)/1000);start=null;}
    }
    // Une suite sans front de fin est conservée comme non mesurable, jamais tronquée en réussite.
    if(start!==null)runs.push(null);
    const contrat=!!debut&&!!fin&&fin.ids.length===1&&fin.ids[0]===pouce;
    essais.push({k,contrat,etat:images.at(-1)?.etat,appui:tenues.at(-1),journal:L.tout,images,evenements:L.traceDoigts});
    J.push(...L.tout); E.push(...L.traceDoigts); I.push(...images);
    await d.toutLever(); await d.attendre(200);
  }
  const gestes=J.filter(x=>x.type==='geste').map(x=>({...x.d,t:x.t,image:x.image})), parGenre={};
  for(const g of gestes){const t=parGenre[g.genre]||(parGenre[g.genre]={});t[g.action]=(t[g.action]||0)+1;}
  const intervalles=essais.flatMap(e=>e.images.slice(1).map((im,i)=>im.r-e.images[i].r)).filter(x=>x>0);
  const ips=intervalles.length?1000/(intervalles.reduce((a,b)=>a+b,0)/intervalles.length):null;
  if (!session.preuvesGestes) session.preuvesGestes=[];
  session.preuvesGestes.push({genre,essais});
  return {source:'CDP étalonné, journal et états réels, essais indépendants ; horloge réelle',sortie:I,essais,
    entrees:gestes,traceDoigts:E,gestes:parGenre,journal:essais.every(e=>e.contrat),
    actions:{pouvoir:J.filter(x=>x.type==='pouvoir'&&x.d.evt==='debut').length,
      apogee:J.filter(x=>x.type==='apogee'&&x.d.evt==='debut').length,boost:J.filter(x=>x.type==='boost'&&x.d.evt==='on').length},boosts:runs,tenues,ips};
}
