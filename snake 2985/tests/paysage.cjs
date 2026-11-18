'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const { webkit, devices } = require('playwright');

const url = process.env.SNAKE_URL || pathToFileURL(path.join(__dirname, '../labo/livraison/temoin-4-epoques', 'index.html')).href;

test('Témoin de migration quatre époques · Safari tactile, commandes et sauvegarde', async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    for (const [width, height] of [[568, 320], [852, 275]]) {
      const context = await browser.newContext({
        ...devices['iPhone SE landscape'], viewport: { width, height },
      });
      try {
        // Ce test prend uniquement le départ silencieux. Aucune piste ne doit démarrer.
        await context.addInitScript(() => {
          window.lectures = 0;
          Object.defineProperty(HTMLMediaElement.prototype,'muted',{get:()=>true,set(){}});
          Object.defineProperty(HTMLMediaElement.prototype,'volume',{get:()=>0,set(){}});
          window.AudioContext=window.webkitAudioContext=undefined;
          HTMLMediaElement.prototype.play = function () {
            this.muted = true;
            this.volume = 0;
            window.lectures++;
            return Promise.resolve();
          };
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.clock.install();
        await page.goto(url);
        await page.locator('#silence').tap();
        const board = await page.locator('#arene').boundingBox();
        assert.ok(Math.abs(board.width / board.height - 2) < .01);
        assert.ok(board.x >= 0 && board.x + board.width <= width + 1);
        const pause = page.locator('#pause');
        const target = await pause.boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44);
        await page.locator('#nova').tap();
        assert.ok(await page.locator('#nova').isDisabled());
        await page.setViewportSize({ width: height, height: width });
        await page.locator('#rotation').waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.body.dataset.mode === 'paused');
        await page.setViewportSize({ width, height });
        await page.locator('#reprendre').tap();
        // Sans virage, le serpent finit sa course dans la bordure ou sur un drone.
        for (let i = 0; i < 24 && !(await page.locator('#fin').isVisible()); i++) {
          await page.clock.runFor(500);
        }
        await page.locator('#voir-palmares').tap();
        assert.equal(await page.locator('#classement tr').count(), 1);
        await page.locator('#fermer-palmares').tap();
        await page.locator('#destination').selectOption('3');
        await page.locator('#sauter').tap();
        assert.equal(await page.locator('#annee').innerText(), '2985');
        assert.equal(await page.evaluate(() => window.lectures), 0);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
});
