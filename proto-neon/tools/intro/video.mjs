// La voie vidéo de N.art (play / get / stop) avec 60-intro.js. Le dépôt n'a pas de dossier cine/ : ce test
// fabrique un clip d'essai JETABLE (le panneau « eveil » et un carré blanc qui défile, VP9 dans un .mp4,
// le Chromium de Playwright ne lisant pas le H.264), vérifie que l'étape « eveil » pose l'image COURANTE du
// clip avec ses effets et une palette fermée, puis efface le clip. Prérequis : ffmpeg.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const here = new URL('.', import.meta.url).pathname, dir = here + 'cine';
fs.mkdirSync(dir, { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-i', here + '../../art/eveil.png', '-f', 'lavfi', '-i', 'color=c=white:s=28x28:r=12',
  '-filter_complex', "[0]scale=384:216:flags=neighbor,fps=12[bg];[bg][1]overlay=x='mod(t*90\\,356)':y=20,format=yuv420p",
  '-t', '5', '-r', '12', '-c:v', 'libvpx-vp9', '-b:v', '600k', '-an', dir + '/eveil.mp4']);
try {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
  await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.intro.state().etape === 'eveil', null, { polling: 'raf', timeout: 30000 });
  for (let i = 0; i < 5; i++) {
    console.log(JSON.stringify(await page.evaluate(() => {
      const N = window.__N, v = [...document.querySelectorAll('video')].find(v => /eveil/.test(v.src)), a = N.art.get('eveil'), b = N.gfx.buf();
      let x0 = -1; for (let x = 0; x < a.w; x++) if (a.data[30 * a.w + x] === N.pal.i('os')) { x0 = x; break; }
      let bad = 0; for (const q of b) if (q > 15) bad++;
      return { etape_u: +N.intro.state().u.toFixed(2), clip_s: +v.currentTime.toFixed(2), carre_x_dans_image: x0, pixels_hors_palette: bad };
    })));
    if (i === 3) await page.screenshot({ path: here + 'cap/video-eveil.png' });
    await page.waitForTimeout(300);
  }
  console.log('erreurs', errs.length);
  await browser.close();
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
