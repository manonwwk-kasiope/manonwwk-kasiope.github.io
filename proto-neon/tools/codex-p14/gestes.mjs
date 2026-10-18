import fs from 'node:fs';
import zlib from 'node:zlib';
import { monde, sources, chargerAvant, sauver, dateParis } from './vm.mjs';
// Doigt réel du pilote : aucune force(), god(), charge d'APOGÉE ou mort imposée en cours d'essai.
export function geste({ pilote = 'humain', longueur = 8, graine = 1, mobile = false }) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  N.intro.skip(); N.game.reset(graine); N.game.dbg.scene('calme'); N.ennemis.reset();
  S.reglages.actions = 'doigts'; N.arene.update(N.R.temps.h);
  const r = Math.max(N.R.joueuse.rayonVirage * 1.25, (longueur * 5 + 68 * (N.R.f.traine(longueur) - 0.15) * 0.5) / (2 * Math.PI));
  const c = { x: S.player.x, y: S.player.y };
  N.joueuse.reset({ x: c.x + r, y: c.y, ang: Math.PI / 2, len: longueur });
  const cibles = [];
  for (let k = 0; k < N.R.pilotes.bon.lassoGroupe; k++) {
    const a = 2 * Math.PI * k / N.R.pilotes.bon.lassoGroupe;
    cibles.push(N.ennemis.spawn('larve', c.x + r / 8 * Math.cos(a), c.y + r / 8 * Math.sin(a), { st:'derive' }));
  }
  const pvAvant = cibles.reduce((s,e)=>s+e.pv,0);
  N.journal.actif(true); N.pilote.lancer(pilote);
  const trace = [], h = N.R.temps.h;
  for (let i = 0; i < 6 / h; i++) {
    if (mobile) cibles.forEach((e,k) => { const a = i*h+2*Math.PI*k/cibles.length; e.x=c.x+r/4*Math.cos(a); e.y=c.y+r/4*Math.sin(a); });
    N.pilote.agir(h); N.joueuse.update(h);
    trace.push({ t: i * h, x: N.joueuse.tete.x, y: N.joueuse.tete.y, ang: N.joueuse.tete.ang, mag: S.input.mag, bruit: Math.atan2(S.input.y, S.input.x) });
    if (cibles.reduce((s,e)=>s+e.pv,0) < pvAvant || N.joueuse.etat === 'mort') break;
  }
  return { pilote, longueur, graine, mobile, rayon: r, pvAvant, pvApres: cibles.reduce((s,e)=>s+e.pv,0), etatJoueuse: N.joueuse.etat,
    lenFin: N.joueuse.len(), journal: N.journal.dump(), trace, err: window.__ERR.count };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!JSON.parse((await import('node:fs')).default.readFileSync(new URL('./validation-vm.json',import.meta.url))).conformite) throw Error('VM non validée');
  const label = process.argv[2] || 'apres', src = label === 'avant' ? chargerAvant() : sources(), cas = [];
  for (const pilote of ['humain', 'expert']) for (const longueur of [8, 20, 40]) for (const mobile of [false, true]) for (let graine = 1; graine <= 20; graine++) {
    const m = monde(src, graine); m.c.opts = { pilote, longueur, mobile, graine };
    const r = JSON.parse(JSON.stringify(m.c.eval('(' + geste.toString() + ')(opts)'))); cas.push(r);
  }
  fs.writeFileSync(new URL('./gestes-'+label+'.json.gz',import.meta.url),zlib.gzipSync(JSON.stringify({dateParis:dateParis(),cas})));
  sauver('gestes-' + label + '.json', { dateParis: dateParis(), cas:cas.map(({trace,journal,...r})=>({...r,lassos:journal.filter(e=>e.type==='lasso'),coupes:journal.filter(e=>e.type==='coupe')})) });
  const out = {};
  for (const r of cas) { const k = [r.pilote, r.longueur, r.mobile].join('/'); const c = out[k] ||= { n: 0, ok: 0, morts: 0 }; c.n++; c.ok += r.pvApres < r.pvAvant ? 1 : 0; c.morts += r.etatJoueuse === 'mort' ? 1 : 0; }
  console.log(out);
}
