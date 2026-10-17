/* Ce que la musique coute au fil d'images, sur le profil iPhone 13 paysage.
   On ne mesure pas l'etat interne : on mesure les ecarts reels entre images (requestAnimationFrame)
   et le temps passe dans l'ordonnanceur, musique eteinte puis allumee, dans la meme page. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
let url = 'http://127.0.0.1:8112/proto-neon/index.html';
await p.goto(url, { waitUntil: 'load' });
if (!await p.evaluate(() => typeof (window.__N || {}).reseed === 'function')) {
  url = 'http://127.0.0.1:8112/proto-neon/tools/compositeur/banc.html';
  errs.length = 0; await p.goto(url, { waitUntil: 'load' });
}
console.log('profil iPhone 13 paysage 844x390 —', url);

await p.evaluate(() => {
  window.__mes = function (sec) {
    return new Promise(res => {
      const d = []; let prev = -1, n = 0;
      function f(ts) {
        if (prev >= 0) d.push(ts - prev);
        prev = ts; n++;
        if (n < sec * 60) requestAnimationFrame(f); else res(d);
      }
      requestAnimationFrame(f);
    });
  };
  window.__stat = function (d) {
    const s = d.slice().sort((a, c) => a - c);
    const q = x => s[Math.min(s.length - 1, Math.floor(x * s.length))];
    return { n: s.length, med: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1] };
  };
});

const run = async (label) => {
  const d = await p.evaluate(s => window.__mes(s), 8);
  const st = await p.evaluate(d => window.__stat(d), d);
  console.log('  ' + label.padEnd(26) + 'median ' + st.med.toFixed(2) + ' ms   p95 ' + st.p95.toFixed(2) +
    ' ms   p99 ' + st.p99.toFixed(2) + ' ms   max ' + st.max.toFixed(2) + ' ms   (' + st.n + ' images)');
  return st;
};
await p.waitForTimeout(600);
const off = await run('musique eteinte');
await p.tap('#app').catch(() => p.mouse.click(400, 200));
await p.waitForTimeout(400);
await p.evaluate(() => window.__N.music.tension(1));           // pire cas : les quatre couches
const on = await run('musique, 4 couches');
// sous mitraille de sons d'information, le cas le plus charge
await p.evaluate(() => {
  let i = 0;
  window.__barrage = setInterval(() => {
    const m = window.__N.music;
    m.sfx('tir', { pitch: i }); if (i % 6 === 0) m.sfx('kill', { pitch: i % 9 });
    if (i % 24 === 0) m.sfx('bigkill', {}); i++;
  }, 90);
});
const barr = await run('4 couches + barrage sfx');
await p.evaluate(() => clearInterval(window.__barrage));
console.log('  surcout median de la musique : ' + (on.med - off.med).toFixed(2) + ' ms/image, p95 : ' + (on.p95 - off.p95).toFixed(2) + ' ms');
console.log('  erreurs : ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : '0'));
await b.close();
