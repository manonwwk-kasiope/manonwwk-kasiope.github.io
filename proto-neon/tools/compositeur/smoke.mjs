/* Fumee : le moteur demarre-t-il, joue-t-il, sans une seule erreur de console. */
import { chromium } from 'playwright';

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto('http://127.0.0.1:8112/proto-neon/index.html', { waitUntil: 'load' });
await p.evaluate(() => { window.__SEED = 2084; window.__N.reseed(2084); });
await p.mouse.click(700, 450);
await p.waitForTimeout(400);

const probe = async () => p.evaluate(() => ({
  state: window.__N.music.info() ? 'ok' : 'nul',
  info: window.__N.music.info(),
  ctx: (window.__N.music.info() ? 1 : 0),
  rms: window.__N.music.rms(), rmsOut: window.__N.music.rmsOut(),
  err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs)
}));

console.log('t=0.4s', JSON.stringify(await probe()));
// montee de tension, puis sons
for (const v of [0, 0.3, 0.6, 0.9]) {
  await p.evaluate(t => window.__N.music.tension(t), v);
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => ({ info: window.__N.music.info(), rms: +window.__N.music.rms().toFixed(4) }));
  console.log('tension', v, 'couches', r.info.layers, 'bpm', r.info.bpm.toFixed(1), 'mesure', r.info.bar, 'rms', r.rms);
}
for (const [n, o] of [['tir', {}], ['kill', { pitch: 3 }], ['butin', {}], ['degat', {}], ['bigkill', {}], ['defi', {}], ['intro', {}]]) {
  await p.evaluate(([n, o]) => window.__N.music.sfx(n, o), [n, o]);
  await p.waitForTimeout(260);
  const r = await p.evaluate(() => +window.__N.music.rmsSfx().toFixed(4));
  console.log('sfx', n, 'rmsSfx', r);
}
await p.waitForTimeout(2500);
const fin = await probe();
console.log('fin', JSON.stringify(fin));
console.log('console:', logs.length ? logs : 'vide');
// verification des crochets
console.log('crochets', JSON.stringify(await p.evaluate(() => ({
  N: !!window.__N, S: !!window.__S, PAL: Array.isArray(window.__PAL) && window.__PAL.length,
  ERR: !!window.__ERR, FRAME: window.__FRAME > 0
}))));
await b.close();
process.exit(fin.err === 0 && logs.length === 0 ? 0 : 1);
