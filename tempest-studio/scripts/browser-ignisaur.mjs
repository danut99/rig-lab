import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = new URL('../captures/ignisaur/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [], stages = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const stage of ['adult', 'pui', 'juvenil']) {
    await page.goto(`http://127.0.0.1:5190/?species=ignisaur&stage=${stage}`);
    await page.waitForFunction(() => window.studioPlayer?.loaded, {}, { timeout: 30000 });
    const result = await page.evaluate(() => ({ id: window.studioPlayer.model.id, bones: window.studioPlayer.raw.skeleton.bones.length, species: document.querySelector('#species').options.length, ages: document.querySelector('#age').options.length }));
    if (result.bones !== 23 || result.species !== 13 || result.ages !== 3) throw Error(JSON.stringify(result));
    for (const animation of ['idle', 'walk', 'attack', 'ultimate']) {
      await page.locator(`[data-animation="${animation}"]`).click();
      await page.evaluate(() => window.studioPlayer.seek(0.5));
    }
    await page.locator('#setup').click();
    await page.screenshot({ path: new URL(`${stage}.png`, out).pathname.replace(/^\/(\w:)/, '$1') });
    stages.push({ stage, ...result });
  }
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(new URL('../IGNISAUR-BROWSER-VALIDATION.json', import.meta.url), JSON.stringify({ stages, errors }, null, 2));
  console.log(JSON.stringify({ stages, errors }));
} finally { await browser.close(); }
