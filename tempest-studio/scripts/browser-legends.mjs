import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = new URL('../captures/legends/', import.meta.url);
fs.mkdirSync(out, {recursive:true});
const browser = await chromium.launch({channel:'msedge'});
try {
  const page = await browser.newPage({viewport:{width:1600,height:1300}});
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5190/legends.html', {waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('.card img').length===6 && [...document.querySelectorAll('.card img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:fileURLToPath(new URL('gallery.png',out)),fullPage:true});
  for(let i=0;i<6;i++) {
    await page.locator('.card').nth(i).click();
    await page.waitForFunction(()=>document.querySelector('#detail-image').complete&&document.querySelector('#detail-image').naturalWidth>0);
    const name=await page.locator('#detail-name').textContent();
    await page.screenshot({path:fileURLToPath(new URL(`${name.toLowerCase()}.png`,out))});
    await page.locator('#close').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:fileURLToPath(new URL('mobile.png',out)),fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(errors.length||overflow)throw Error(JSON.stringify({errors,overflow}));
  const report={cards:6,detailViews:6,mobileOverflow:overflow,errors};
  fs.writeFileSync(new URL('../LEGENDS-BROWSER-VALIDATION.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {await browser.close();}
