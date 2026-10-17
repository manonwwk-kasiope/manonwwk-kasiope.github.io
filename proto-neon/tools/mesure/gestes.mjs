/* tools/mesure/gestes.mjs — des doigts simulés par le protocole CDP (Input.dispatchTouchEvent), en points CSS,
   pour les critères des commandes (R-22) et des gestes sûrs (R-33), d'après REFONTE.md § 2.16 et N.R.gestes.
   Chaque envoi liste tous les doigts posés, comme un vrai écran tactile. Les durées sont en temps réel :
   90-boot.js classe les gestes sur performance.now. */
export class Doigts {
  constructor(session) { this.s = session; this.actifs = new Map(); this.id = 1; }
  async init() { this.cdp = await this.s.cdpSession(); return this; }
  points() { return [...this.actifs.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 })); }
  async envoyer(type) { await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' && !this.actifs.size ? [] : this.points() }); }
  async poser(x, y) { const id = this.id++; this.actifs.set(id, { x, y }); await this.envoyer('touchStart'); return id; }
  async bouger(id, x, y) { const p = this.actifs.get(id); if (!p) return; p.x = x; p.y = y; await this.envoyer('touchMove'); }
  async lever(id) {
    if (!this.actifs.has(id)) return;
    const reste = new Map(this.actifs); reste.delete(id);
    /* touchEnd : les points restants seulement (le doigt levé n'y figure plus) */
    this.actifs = reste;
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: this.points() });
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
    gestes: J.filter(x => x.type === 'geste').map(x => ({ t: x.t, image: x.image, ...d(x) })),
    pouvoirs: J.filter(x => x.type === 'pouvoir').length,
    apogees: J.filter(x => x.type === 'apogee').length,
    boosts: J.filter(x => x.type === 'boost').map(x => ({ t: x.t, image: x.image, ...d(x) })),
    tout: J
  };
}

/* met une partie en jeu, invulnérable, pour tester les doigts sans mourir */
export async function preparerJeu(session) {
  const r = await session.demarrer({ graine: 3, god: true });
  if (!r.ok) return r;
  await session.eval(() => { try { window.__N.journal.dump({ vider: true }); } catch (e) { } });
  await session.images(20);
  return r;
}
