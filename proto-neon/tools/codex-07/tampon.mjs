// Vérification indépendante du navigateur : vrais modules et vrai N.gfx.buf(), sans DOM,
// sans tube, films ni images décodées. Les PNG sont des exports de tampon, pas des captures Safari.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const phase = process.argv[2] || 'apres';
const out = path.join(here, 'tampon-' + phase);
await fs.mkdir(out, { recursive: true });
const sources = await Promise.all((await fs.readdir(path.join(root, 'src'))).filter(n => n.endsWith('.js')).sort().map(async name => {
  const filename = `proto-neon/src/${name}`;
  return { name, code: phase === 'avant' && ['77-score.js', '78-hud.js'].includes(name)
    ? execFileSync('git', ['show', `HEAD:${filename}`], { cwd: path.resolve(root, '..'), encoding: 'utf8' })
    : await fs.readFile(path.join(root, 'src', name), 'utf8') };
}));
const profiles = [
  ['paysage', 844, 390, { l: 24, r: 24, t: 0, b: 11 }],
  ['portrait', 390, 844, { l: 0, r: 0, t: 24, b: 17 }],
  ['bureau', 1440, 900, { l: 0, r: 0, t: 0, b: 0 }]
];
function crc(buf) { let n = 0xffffffff; for (const v of buf) { n ^= v; for (let k = 0; k < 8; k++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0); } return (n ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), len = Buffer.alloc(4), check = Buffer.alloc(4); len.writeUInt32BE(data.length); check.writeUInt32BE(crc(Buffer.concat([name, data]))); return Buffer.concat([len, name, data, check]); }
async function png(name, N) {
  const scale = N.gfx.PX, w = N.gfx.W * scale, h = N.gfx.H * scale, raw = Buffer.alloc(h * (1 + w * 3));
  const colors = N.pal.C.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))), b = N.gfx.buf();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const rgb = colors[b[Math.floor(y / scale) * N.gfx.W + Math.floor(x / scale)]];
    for (let c = 0; c < 3; c++) raw[y * (1 + w * 3) + 1 + x * 3 + c] = rgb[c];
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  await fs.writeFile(path.join(out, name + '.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function runtime(width, height, sf) {
  const errors = [], media = { matches: false }, context = vm.createContext({ console: { log() {}, warn() {}, error(...args) { errors.push(args.map(String).join(' ')); } },
    Math, Uint8Array, Uint8ClampedArray, Float32Array, Float64Array, Uint32Array, Int32Array, ArrayBuffer, Map, Set,
    navigator: { maxTouchPoints: width < 1000 ? 1 : 0 }, location: { search: '?journal=1' },
    performance: { now: () => 0 }, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {},
    matchMedia: () => media, addEventListener() {}, localStorage: { getItem() { return null; }, setItem() {} } });
  context.window = context; context.ART_SRC = {}; context.CINE_DISPO = []; context.MUSIQUE_BASE = ''; context.MUSIQUE_EMBED = null;
  vm.runInContext('var N = window.__N = {};', context);
  for (const s of sources) vm.runInContext(s.code, context, { filename: s.name });
  const N = context.__N;
  N.gfx.resize(width, height, width - (sf.l + sf.r) * 2, height - (sf.t + sf.b) * 2);
  N.S.view = { w: N.gfx.W, h: N.gfx.H, safe: sf }; context.__S = N.S;
  function prepare() {
    N.pilote.activer(false); N.game.reset(2975); N.game.dbg.etat('jeu'); N.S.phase = 'play';
    N.outils.geom(); N.joueuse.force({ x: N.outils.VUE.x + N.gfx.W / 2, y: N.outils.VUE.y + N.gfx.H / 2, ang: 0, len: 8, trace: true });
    N.hud.reset(); N.journal.actif(true); N.journal.vider(); N.gfx.masque(true);
  }
  function render() { N.gfx.origin(0, 0); N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop(); }
  function pixels() {
    const b = N.gfx.buf(), mask = N.gfx.mask(); let cyan = 0, horsCorps = 0, horsAutorise = 0, assigned = 0, sang = 0;
    const ownerCounts = {};
    for (let i = 0; i < b.length; i++) {
      if (mask[i]) assigned++;
      if (b[i] === N.pal.i('sang')) sang++;
      if (b[i] !== N.pal.i('cyan') && b[i] !== N.pal.i('cyanPale')) continue;
      cyan++; ownerCounts[mask[i]] = (ownerCounts[mask[i]] || 0) + 1;
      if (mask[i] !== 1 && mask[i] !== 2) horsCorps++;
      if (!(mask[i] >= 1 && mask[i] <= 4)) horsAutorise++;
    }
    return { w: N.gfx.W, h: N.gfx.H, px: N.gfx.PX, cyan, horsCorps, horsAutorise, assigned, ownerCounts, sang,
      couleurs: [...new Set(b)].sort((a, b) => a - b), vies: N.score.vies, mult: N.score.mult(), erreur: context.__ERR,
      bannieres: N.journal.dump().filter(r => r.type === 'hudBanniere') };
  }
  return { N, context, errors, media, prepare, render, pixels };
}
const result = { phase, contexte: 'Node VM, exports du tampon; ne remplace pas Playwright ni Safari', profils: [] };
for (const [nom, width, height, sf] of profiles) {
  const { N, context, errors, media, prepare, render, pixels } = runtime(width, height, sf);
  const p = { nom, captures: {}, erreurs: errors };
  for (const element of ['vague', 'defi', 'carte', 'cyclope', 'multiplicateur', 'derniere-vie']) {
    prepare();
    if (element === 'vague') N.hud.banniere(['VAGUE 3', 'LE RETOURNEMENT'], { c: 'jaune' });
    if (element === 'defi') N.hud.banniere(['DÉFI RÉUSSI', 'DIX KILLS EN CHAÎNE', '+5000  TIR SURCHARGÉ  +1 ♥'], { c: 'jaune', icone: '✓' });
    if (element === 'carte') N.hud.banniere(['CARTE', 'CANON II'], { c: 'jaune' });
    if (element === 'cyclope') N.hud.banniere("LE CYCLOPE S'EMBALLE", { c: 'magenta', clignote: true });
    if (element === 'multiplicateur') {
      for (let i = 0; i < N.R.score.mult.pas; i++) {
        const e = N.ennemis.spawn('fleche', N.joueuse.tete.x + 60, N.joueuse.tete.y + 40);
        N.ennemis.hit(e, 1e6, { genre: 'joueuse', type: 'canon' });
      }
    }
    if (element === 'derniere-vie') {
      for (let i = 0; i < N.R.vies.depart - 1; i++) { N.joueuse.tuer('mur', { genre: 'decor', type: 'mur' }); N.joueuse.reapparaitre(); }
      N.game.dbg.etat('jeu'); N.hud.reset(); N.fx.reset();
    }
    N.hud.update(0.15); render();
    const raw = new Uint8Array(N.gfx.buf());
    const actual = pixels();
    N.gfx.clear(0); N.outils.origineMonde(); N.joueuse.drawTop(); N.gfx.origin(0, 0);
    const player = new Uint8Array(N.gfx.buf());
    let horsSpriteJoueuse = 0;
    for (let i = 0; i < raw.length; i++) if ((raw[i] === N.pal.i('cyan') || raw[i] === N.pal.i('cyanPale')) && !player[i]) horsSpriteJoueuse++;
    actual.horsSpriteJoueuse = horsSpriteJoueuse;
    actual.partHorsSprite = horsSpriteJoueuse / raw.length;
    render();
    await png(`${nom}-${element}`, N); p.captures[element] = actual;
    // Isolate the actual pixels contributed by the HUD against the identical frozen scene.
    N.gfx.clear(0); N.gfx.origin(0, 0); N.hud.draw();
    p.captures[element].hudCyan = N.gfx.buf().reduce((n, c) => n + (c === N.pal.i('cyan') || c === N.pal.i('cyanPale')), 0);
    p.captures[element].empreinte = raw.reduce((sum, c, i) => (sum + c * (i + 1)) % 4294967296, 0);
  }
  if (phase !== 'avant') {
    p.seuils = [];
    // Cross thresholds through the public enemy API, including a burst in a single update.
    prepare();
    for (let i = 0; i < N.R.score.mult.pas * 2; i++) {
      const e = N.ennemis.spawn('fleche', N.joueuse.tete.x + 60, N.joueuse.tete.y + 40);
      N.ennemis.hit(e, 1e6, { genre: 'joueuse', type: 'canon' });
      if ((i + 1) % N.R.score.mult.pas === 0) p.seuils.push({ kills: i + 1, mult: N.score.mult(), palier: N.score.palier });
    }
    N.hud.update(1 / 60); N.gfx.clear(0); N.hud.draw();
    p.seuilsJaune = N.gfx.buf().reduce((n, c) => n + (c === N.pal.i('jaune')), 0);
    N.score.reset(); p.resetPalier = N.score.palier;
    prepare(); N.hud.banniere(['VAGUE 3', 'LE RETOURNEMENT'], { c: 'jaune' });
    p.animation = [];
    let previous = 0;
    for (const t of [1 / 60, 3 / 60, 5 / 60, 0.15, 0.3, 1.8, 1.95, 2.1]) {
      N.hud.update(t - previous); previous = t; N.gfx.clear(0); N.hud.draw();
      const b = N.gfx.buf();
      p.animation.push({ t, jaune: b.reduce((n, c) => n + (c === N.pal.i('jaune')), 0),
        magenta: b.reduce((n, c) => n + (c === N.pal.i('magenta')), 0),
        violet: b.reduce((n, c) => n + (c === N.pal.i('violet')), 0),
        os: b.reduce((n, c) => n + (c === N.pal.i('os')), 0) });
      if (t === 1 / 60 || t === 1.95) await png(`${nom}-banniere-${t === 1.95 ? 'dissolution' : 'entree'}`, N);
    }
    prepare(); N.joueuse.force({ x: N.outils.VUE.x + 40, y: N.outils.VUE.y + 10, ang: 0, len: 8, trace: true });
    N.gfx.clear(0); N.outils.origineMonde(); N.joueuse.drawTop(); N.gfx.origin(0, 0);
    const before = new Uint8Array(N.gfx.buf()), points = [N.joueuse.tete, N.joueuse.segPos(1), N.joueuse.segPos(2)];
    N.hud.banniere('LE CYCLOPE', { c: 'magenta' }); N.hud.draw();
    let diff = 0, examines = 0;
    for (const [k, pt] of points.entries()) for (let y = Math.round(pt.y - N.outils.VUE.y) - (k ? 6 : 9); y <= Math.round(pt.y - N.outils.VUE.y) + (k ? 6 : 9); y++)
      for (let x = Math.round(pt.x - N.outils.VUE.x) - (k ? 6 : 9); x <= Math.round(pt.x - N.outils.VUE.x) + (k ? 6 : 9); x++) {
        if (x < 0 || y < 0 || x >= N.gfx.W || y >= N.gfx.H) continue;
        const i = y * N.gfx.W + x; examines++; if (before[i] !== N.gfx.buf()[i]) diff++;
      }
    p.protection = { diff, examines };
    prepare();
    for (let i = 0; i < N.R.vies.depart - 1; i++) { N.joueuse.tuer('mur', { genre: 'decor', type: 'mur' }); N.joueuse.reapparaitre(); }
    N.game.dbg.etat('jeu'); N.hud.reset(); N.fx.reset();
    p.alarme = { sang: [], coeurs: [] };
    for (let i = 0; i < 120; i++) {
      N.hud.update(1 / 60); N.gfx.clear(0); N.gfx.origin(0, 0); N.hud.draw();
      p.alarme.sang.push(pixels().sang);
      let rose = 0;
      for (let y = sf.t; y < sf.t + 10; y++) for (let x = sf.l; x < sf.l + 90; x++) if (N.gfx.at(x, y) === N.pal.i('rosePale')) rose++;
      p.alarme.coeurs.push(rose);
    }
    media.matches = true; const sums = [];
    for (let i = 0; i < 60; i++) { N.hud.update(1 / 60); N.gfx.clear(0); N.hud.draw(); sums.push(pixels().sang); }
    p.reduit = { minSang: Math.min(...sums), maxSang: Math.max(...sums) }; await png(`${nom}-mouvement-reduit`, N); media.matches = false;
    // Stress the central budget including calls that bypass 79-scene. Render every frame.
    prepare();
    for (let f = 0; f < 60 * 120; f++) {
      if (f % 60 === 0) N.hud.banniere('VAGUE ' + (f / 60 + 1), { c: 'jaune', duree: 0.5 });
      N.outils.T.t += 1 / 60; N.hud.update(1 / 60); N.gfx.clear(0); N.hud.draw();
    }
    console.log(`${phase} ${nom}: budget 120 s terminé`);
    p.budgetStress = N.journal.dump().filter(r => r.type === 'hudBanniere');
    prepare(); N.pilote.lancer('bon');
    const drawnBanners = [], states = {}, began = performance.now();
    for (let f = 0; f < 60 * 120; f++) {
      N.S.frame++; context.__FRAME = N.S.frame;
      N.game.update(1 / 60); N.fx.update(1 / 60); if (f % 6 === 0) render();
      states[N.game.etat()] = (states[N.game.etat()] || 0) + 1;
      if (f % 60 === 0) {
        const last = N.journal.dump().filter(r => r.type === 'hudBanniere');
        for (const r of last) if (!drawnBanners.some(d => d.d.temps === r.d.temps)) drawnBanners.push(r);
      }
    }
    p.pilote = { frames: 7200, cadenceRenduHz: 10, tempsExecution: (performance.now() - began) / 1000, tJeu: N.outils.T.t, etat: N.game.etat(),
      vies: N.score.vies, states, bannieres: drawnBanners, erreurs: context.__ERR, pixels: pixels() };
    await fs.writeFile(path.join(out, `${nom}-journal.json`), JSON.stringify(N.journal.dump()));
    await png(`${nom}-pilote-120s`, N);
  }
  result.profils.push(p);
  console.log(`${phase} ${nom}: ${Object.keys(p.captures).length} exports, erreurs ${errors.length}`);
}
const failures = [];
if (phase !== 'avant') for (const p of result.profils) {
  if (!p.animation.slice(0, 3).some(a => a.magenta > 0 && a.violet > 0)) failures.push(`${p.nom}: fantômes absents`);
  if (!(p.animation[6].jaune < p.animation[4].jaune)) failures.push(`${p.nom}: dissolution absente`);
  if (p.protection.diff !== 0) failures.push(`${p.nom}: protection ${p.protection.diff}`);
  if (p.reduit.minSang !== p.reduit.maxSang) failures.push(`${p.nom}: mouvement réduit non fixe`);
  if (p.captures.multiplicateur.mult !== 2 || p.captures['derniere-vie'].vies !== 1) failures.push(`${p.nom}: état ciblé non atteint`);
  const normal = p.budgetStress.filter(r => !r.d.cyclope);
  p.intervalleMin = Math.min(...normal.slice(1).map((r, i) => r.d.temps - normal[i].d.temps));
  if (p.intervalleMin < 10) failures.push(`${p.nom}: cadence ${p.intervalleMin}`);
  if (p.pilote.erreurs.count !== 0 || p.erreurs.length) failures.push(`${p.nom}: erreurs`);
  for (const [element, c] of Object.entries(p.captures)) {
    if (c.partHorsSprite >= 0.005) failures.push(`${p.nom}/${element}: cyan ${c.partHorsSprite}`);
    for (const r of c.bannieres) {
      const b = r.d, sf = profiles.find(v => v[0] === p.nom)[3];
      if (b.echelle < 2 || b.x < sf.l || b.y < sf.t || b.x + b.w > c.w - sf.r || b.y + b.h > c.h - sf.b) failures.push(`${p.nom}/${element}: débordement ou police`);
    }
  }
}
result.echecs = failures;
await fs.writeFile(path.join(out, 'mesures.json'), JSON.stringify(result, null, 2));
if (failures.length) { console.error(failures); process.exitCode = 1; }
