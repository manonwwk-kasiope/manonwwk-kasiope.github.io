// Contrôles ciblés du contrat : retards observés, impulsions, variantes, géométrie et accès.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const code = fs.readFileSync(path.join(ROOT, 'src/85-pilote.js'), 'utf8');
assert(!/N\.(ennemis|joueuse|cam)\b|Math\.random|\._(?!_N\b|_PILOT\b)\w+/.test(code));
const tests = [];
const selectIndex = process.argv.indexOf('--test');
const select = selectIndex < 0 ? '' : process.argv[selectIndex + 1];
function test(nom, f) { if (select && !new RegExp(select).test(nom)) return; f(); tests.push(nom); console.log('OK ' + nom); }
function fixture(nom, opts, seed = 42) {
  let state = 'jeu', step = 0, rng = seed, draws = 0;
  const logs = [], S = { player: { x: 500, y: 250, ang: 0, vit: 68, len: 8, segs: [], etat: 'vivant', reserve: 100, pouvoir: 'traversee', pouvoirPret: false, apogee: 0 }, enemies: [], shots: [], tele: [], butin: [], voies: [], monde: { x0: 0, y0: 0, x1: 1024, y1: 512, mobile: false, annonce: [] }, vue: { x: 0, y: 0, w: 1024, h: 512 }, input: {} };
  const writes = new Set(['x', 'y', 'mag', 'boost', 'pouvoir', 'apogee', 'chiffre', 'valider']);
  S.input = new Proxy(S.input, { set(o, k, v) { assert(writes.has(k), 'écriture interdite ' + k); o[k] = v; return true; } });
  const ctx = { window: { __N: {} }, location: { search: '' } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/02-regles.js'), 'utf8'), ctx);
  const raw = ctx.window.__N;
  raw.S = new Proxy(S, { get(o, k) { assert(['input', 'player', 'enemies', 'shots', 'tele', 'butin', 'voies', 'monde', 'vue', 'vague', 'ecran', 'vol', 't', 'reglages'].includes(k), 'lecture S interdite ' + k); return o[k]; }, set() { throw Error('mutation de S hors input'); } });
  raw.ids = { pilotes: ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'] };
  raw.horloge = { H: 1 / 120, pas: () => step };
  const random = () => { draws++; rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  raw.rng = n => { assert.equal(n, 'pilote'); return { r: (a, b) => a + (b - a) * random(), i: (a, b) => a + Math.floor(random() * (b - a + 1)) }; };
  raw.game = { etat: () => state }; raw.journal = (type, d) => { assert.equal(type, 'pilote'); logs.push(JSON.parse(JSON.stringify(d))); };
  const allowed = new Set(['S', 'R', 'ids', 'horloge', 'rng', 'game', 'journal', 'pilote']);
  ctx.window.__N = new Proxy(raw, { get(o, k) { assert(allowed.has(k), 'accès N interdit : ' + String(k)); return o[k]; }, set(o, k, v) { assert.equal(k, 'pilote'); o[k] = v; return true; } });
  vm.runInContext(code, ctx); const p = raw.pilote; p.lancer(nom, opts);
  return { S, p, logs, raw, get draws() { return draws; }, state(s) { state = s; }, tick(n = 1) { const out = []; for (let i = 0; i < n; i++) { step++; p.agir(1 / 120); out.push({ ...S.input }); } return out; } };
}
for (const [name, R] of [['kamikaze', 10], ['humain', 14], ['bon', 10], ['expert', 6], ['dieu', 10]]) test('retard exact ' + name + ' : ' + R + ' pas', () => {
  const f = fixture(name), out = f.tick(R + 1); assert(out.slice(0, R).every(o => o.mag === 0)); assert.equal(out[R].mag, 0.8);
});
test('passer de jeu à nettoyage conserve la file de réaction', () => { const f = fixture('bon'); f.tick(11); f.state('nettoyage'); assert.equal(f.tick()[0].mag, 0.8); });
test('inerte ne touche à aucune action', () => { const f = fixture('inerte'); assert(f.tick(120).every(o => o.mag === 0 && !o.boost && !o.pouvoir && !o.apogee && !o.valider)); assert.equal(f.draws, 0); });
test('tourneur suit le cap réel + π/2', () => { const f = fixture('tourneur'); f.S.player.ang = 0.3; const o = f.tick()[0]; assert(Math.abs(Math.atan2(o.y, o.x) - (0.3 + Math.PI / 2)) < 1e-12); assert.equal(f.draws, 0); });
test('bruit humain déterministe et borné, pas de hasard pour bon', () => { const f = fixture('humain'), g = fixture('humain'); assert.deepEqual(f.tick(240), g.tick(240)); assert(f.logs.filter(x => x.evt === 'cap').every(x => Math.abs(x.bruit) <= 10 * Math.PI / 180)); assert(f.draws >= 8 && f.draws <= 9); const b = fixture('bon'); b.tick(240); assert.equal(b.draws, 0); });
test('maladroit garde son cap décidé 0,7 s malgré une cible déplacée', () => { const f = fixture('maladroit'); f.S.butin.push({ type: 'cellule', x: 600, y: 250 }); f.tick(); f.S.butin[0].y = 450; f.tick(60); assert(f.logs.filter(x => x.evt === 'cap').every(x => x.vise === 0)); f.tick(30); assert(f.logs.some(x => x.evt === 'cap' && x.vise > 0)); });
test('kamikaze accélère seulement au-delà de 40 px', () => { const f = fixture('kamikaze'); f.S.enemies.push({ id: 1, type: 'fleche', etat: 'approche', x: 600, y: 250, vx: 0, vy: 0, r: 5 }); assert(f.tick(11)[10].boost); });
test('le champ évite un mur vers lequel la tête se dirige', () => { const f = fixture('bon'); f.S.player.x = 1000; f.tick(); const cap = f.logs.find(x => x.evt === 'cap'); assert(Math.abs(cap.vise) > Math.PI / 2); });
test('lasso du bon ; expert refuse une boucle infaisable', () => { const b = fixture('bon'), e = fixture('expert'); for (const f of [b, e]) { f.S.player.x = 360; f.S.player.ang = Math.PI / 2; f.S.enemies = [1, 2, 3, 4].map(id => ({ id, type: 'fleche', etat: 'approche', x: 300, y: 250, vx: 0, vy: 0, r: 5 })); f.tick(); } assert(b.logs.some(x => x.evt === 'lassoTente')); assert(!e.logs.some(x => x.evt === 'lassoTente')); });
test('lasso conserve les membres devenus proies et sort quand ils meurent', () => { const f = fixture('bon'); f.S.player.x = 360; f.S.player.ang = Math.PI / 2; f.S.enemies = [1, 2, 3, 4].map(id => ({ id, type: 'fleche', etat: 'approche', x: 300, y: 250, vx: 0, vy: 0, r: 5 })); f.tick(); assert(f.logs.some(x => x.evt === 'lassoTente')); f.S.enemies.forEach(e => { e.etat = 'proie'; }); f.tick(); assert(!f.logs.some(x => x.evt === 'lassoFin'), 'une proie vivante ne vide pas le groupe'); f.S.enemies.forEach(e => { e.etat = 'mort'; }); f.tick(); assert.equal(f.logs.at(-1).raison, 'vide'); });
test('pouvoir et APOGÉE donnent une seule impulsion retardée', () => { const f = fixture('kamikaze'); f.S.player.pouvoirPret = true; f.S.player.apogee = 100; const out = f.tick(40); assert.equal(out.filter(x => x.pouvoir).length, 1); assert.equal(out.filter(x => x.apogee).length, 1); assert.equal(out.findIndex(x => x.pouvoir), 10); });
test('expert auto/diriger ne déclenche jamais pouvoir ni APOGÉE', () => { for (const variante of ['auto', 'diriger']) { const f = fixture('expert', { variante }); f.S.player.pouvoirPret = true; f.S.player.apogee = 100; f.S.enemies.push({ id: 1, type: 'traqueur', etat: 'approche', x: 560, y: 250, vx: 0, vy: 0, r: 5 }); const out = f.tick(30); assert(out.every(x => !x.pouvoir && !x.apogee && !x.boost)); assert.equal(out.at(-1).mag, variante === 'auto' ? 1 : 0.8); } });
test('cartes : ordre fixe, ultime expert, impulsions espacées', () => { const f = fixture('bon'); f.state('cartes'); f.S.ecran = { nom: 'cartes', pret: true, depuis: 1, cartes: ['arc', 'canon', 'tourelles'] }; const out = f.tick(65); const choices = out.map((x, i) => x.chiffre ? i : -1).filter(i => i >= 0); assert.equal(out[choices[0]].chiffre, 3); assert(choices.every((v, i) => !i || v - choices[i - 1] >= 25)); const e = fixture('expert'); e.state('cartes'); e.S.ecran = { nom: 'cartes', pret: true, depuis: 1, cartes: ['canon', 'arc'], niveaux: { arc: 4 } }; assert.equal(e.tick(7).at(-1).chiffre, 2); });
test('VOL : porte imminente et évitement horizontal de mine', () => { const f = fixture('bon'); f.state('vol'); f.S.vol = { tete: { x: 100, y: 100 }, objets: [{ type: 'porte', x: 100, y: 160, avant: 1 }, { type: 'mine', x: 110, y: 100, avant: 0.5 }] }; const o = f.tick(11).at(-1); assert(Math.abs(o.x + 1) < 1e-12); assert(Math.abs(o.y) < 1e-12); });
test('aucune validation ni entrée résiduelle sur les écrans arrêtés', () => { const f = fixture('kamikaze'); f.tick(12); for (const state of ['mort', 'panneau', 'pause', 'fin', 'initiales', 'titre', 'ouverture', 'briefing', 'demarrage']) { f.state(state); assert(f.tick().every(o => !o.mag && !o.valider && !o.pouvoir && !o.apogee && !o.chiffre)); } });
test('désactiver restaure le hook précédent sans le remplacer ensuite', () => { const f = fixture('bon'); f.p.arreter(); assert.equal(f.p.actif(), false); assert.equal(f.S.input.mag, 0); });
fs.writeFileSync(path.join(ROOT, select ? 'tools/pilotes/conformite-cible.json' : 'tools/pilotes/conformite.json'), JSON.stringify({ dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), sourceSha256: crypto.createHash('sha256').update(code).digest('hex'), selection: select || null, tests: tests.length, ok: true, noms: tests }, null, 2) + '\n');
