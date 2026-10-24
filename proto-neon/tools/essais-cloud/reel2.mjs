import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.addInitScript(() => { if (!sessionStorage.getItem('deja')) { localStorage.removeItem('snake2975.pilotes'); sessionStorage.setItem('deja', '1'); } });
await page.goto('http://127.0.0.1:8133/proto-neon/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure);
const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape ? window.__N.aventure.etape() : null }));
async function voyage(x, nom) {
  const journal = []; const note = async () => { const s = await st(); const k = s.jeu + '/' + s.etape; if (journal[journal.length - 1] !== k) journal.push(k); return s; };
  for (let i = 0; i < 160; i++) { const s = await note(); if (s.jeu === 'aventure') break;
    await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
    await page.touchscreen.tap(600, 200); await page.waitForTimeout(250); }
  for (let i = 0; i < 400; i++) { const s = await note(); if (s.jeu !== 'aventure') break;
    if (s.etape === 'choix') { await page.waitForTimeout(700); await page.screenshot({ path: `reel2-choix-${nom}.png` }); await page.touchscreen.tap(x, 200); await page.waitForTimeout(300); continue; }
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
      if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(200); }
  await page.evaluate(() => window.__N.game.dbg.etat('victoire'));
  for (let i = 0; i < 700; i++) { const s = await note();
    if (s.etape === 'retrouvailles' || s.etape === 'teaser') { await page.waitForTimeout(1500); await page.screenshot({ path: `reel2-${s.etape}.png` }); }
    if (s.jeu === 'fin' || s.jeu === 'titre') break;
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape && N.aventure.etape();
      if (N.intro && N.intro.current && N.intro.current()) N.intro.skip();
      if (et === '2975') N.aventure.sauter(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(250); }
  const joues = await page.evaluate(() => window.__N.aventure.state().joues);
  console.log(nom, ':', journal.join(' | ')); console.log('  films :', joues.join(', '));
}
await voyage(200, 'ELLE');
/* REJOUER → titre → JOUER → choix (ELLE finie) → LUI */
await page.waitForTimeout(1500);
const fa = await page.evaluate(() => { const a = window.__N.ui.finActions(), r = window.__N.gfx.canvas().getBoundingClientRect(), p = window.__N.gfx.PX;
  return { disponible: a.disponible, pret: a.pret, x: r.left + (a.rejouer.x + a.rejouer.w / 2) * p, y: r.top + (a.rejouer.y + a.rejouer.h / 2) * p }; });
console.log('écran de fin :', JSON.stringify(fa)); await page.screenshot({ path: 'reel2-fin-elle.png' });
for (let i = 0; i < 20 && (await st()).jeu === 'fin'; i++) { await page.touchscreen.tap(fa.x, fa.y); await page.waitForTimeout(400); }
console.log('après REJOUER :', JSON.stringify(await st()));
await voyage(650, 'LUI');
console.log('profil :', JSON.stringify(await page.evaluate(() => window.__N.choix.profil())));
console.log('ERR', await page.evaluate(() => window.__ERR ? window.__ERR.count : -1), logs.slice(0, 5));
await browser.close();
