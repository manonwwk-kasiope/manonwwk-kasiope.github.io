'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');

const url = new URL('https://manonwwk-kasiope.github.io/snake-2985/?muet=1');
const scope = new URL('./', url).href;
const years = [1976, 1985, 1995, 2185, 2985];

async function main() {
  if (!process.argv[2]) throw Error('Fournir le fichier sw.js exact de la distribution publiée.');
  const source = fs.readFileSync(process.argv[2]);
  const edition = source.toString().match(/const version = prefix \+ "([0-9a-f]{16})";/)?.[1];
  assert(edition, 'Édition attendue du worker inconnue');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  const manifest = JSON.parse(source.toString().match(/const gameHashes = (\{[\s\S]*?\});/)[1]);
  const executable = process.env.SNAKE_HEADLESS_SHELL || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1187/chrome-mac/headless_shell');
  assert.equal(path.basename(fs.realpathSync(executable)), 'headless_shell');
  const browser = await chromium.launch({executablePath:executable, headless:true, args:['--mute-audio', '--autoplay-policy=user-gesture-required']});
  try {
    const context = await browser.newContext({viewport:{width:852,height:320}, reducedMotion:'reduce'});
    await context.addInitScript({path:path.join(__dirname, '../charge-ios/silence.js')});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const landing = await page.goto(url.href, {waitUntil:'load'});
    assert.equal(landing.status(), 200);
    assert.equal(page.url(), url.href);
    assert(await page.evaluate(() => window.silenceReady));
    // Vérifier la révision avant d'attendre l'installation ; une ancienne version répond immédiatement.
    const published = await page.evaluate(async () => {
      const response = await fetch('./sw.js', {cache:'no-store', redirect:'error'});
      if (response.status !== 200) throw Error('Worker indisponible');
      const bytes = await response.arrayBuffer();
      return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    });
    assert.equal(published, hash, 'SHA-256 du worker public différent de la distribution attendue');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {timeout:90000});
    const cacheName = 'snake2985:' + new URL(scope).pathname + ':' + edition;
    const installation = await page.evaluate(async ({cacheName, scope}) => {
      const reg = await navigator.serviceWorker.ready;
      if (!(await caches.has(cacheName))) throw Error('Cache de la révision attendue absent');
      const entries = await (await caches.open(cacheName)).keys();
      return {scope:reg.scope, worker:reg.active.scriptURL, controller:navigator.serviceWorker.controller.scriptURL,
        files:entries.map(key => key.url.startsWith(scope) ? key.url.slice(scope.length) : key.url).sort(),
        audio:{...window.silence}};
    }, {cacheName, scope});
    assert.equal(installation.scope, scope);
    assert.equal(installation.worker, scope+'sw.js');
    assert.equal(installation.controller, installation.worker);
    assert.deepEqual(installation.files, Object.keys(manifest).sort());
    assert.deepEqual(installation.audio, {media:0, context:0});
    await context.setOffline(true);
    const response = await page.reload({waitUntil:'load'});
    assert.equal(response.status(), 200);
    assert(response.fromServiceWorker());
    await page.waitForFunction(() => document.body.dataset.screen === 'prep');
    assert.deepEqual(await page.evaluate(() => SnakeArcade.eras.map(era => era.year)), years);
    await page.getByRole('button', {name:'Jouer en silence', exact:true}).click();
    await page.waitForFunction(() => document.body.dataset.screen === 'play');
    await page.locator('#pause').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'pause');
    const after = await page.evaluate(() => ({armed:window.silenceReady, audio:window.silence, online:navigator.onLine}));
    assert.deepEqual(after, {armed:true, audio:{media:0, context:0}, online:false});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),url:url.href,
      edition,workerSha256:hash,files:installation.files.length,years,offlineNavigation:response.fromServiceWorker(),
      screens:['prep','play','pause'],audioCalls:after.audio,pageErrors:errors}, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
