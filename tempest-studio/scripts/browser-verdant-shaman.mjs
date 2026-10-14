import {chromium} from 'playwright-core';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge'});
const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[],poses=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5190/?species=verdant-shaman');
 await page.waitForFunction(()=>window.studioPlayer?.loaded,{}, {timeout:30000});
 await page.locator('#view').selectOption('art');
 fs.mkdirSync(new URL('../captures/verdant-shaman/',import.meta.url),{recursive:true});
 await page.locator('#setup').click();
 await page.screenshot({path:new URL('../captures/verdant-shaman/setup.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 for(const name of ['idle','walk','attack']){
  await page.locator(`[data-animation="${name}"]`).click();
  const duration=await page.evaluate(()=>window.studioPlayer.raw.animationState.getCurrent(0).animation.duration);
  for(let i=0;i<=4;i++){
   const state=await page.evaluate(t=>{const p=window.studioPlayer;p.seek(t);const s=p.raw.skeleton;const meshes=s.slots.every(slot=>{const att=slot.getAttachment();if(!att)return true;const mesh=typeof att.worldVerticesLength==='number',points=new Float32Array(mesh?att.worldVerticesLength:8);if(mesh)att.computeWorldVertices(slot,0,points.length,points,0,2);else att.computeWorldVertices(slot.bone,points,0,2);return [...points].every(Number.isFinite);});return {finite:meshes&&s.bones.every(b=>[b.worldX,b.worldY,b.a,b.b,b.c,b.d].every(Number.isFinite)),staff:s.findBone('staff').parent.data.name,parts:s.slots.filter(s=>s.getAttachment()).length};},duration*i/4);
   if(!state.finite||state.staff!=='nearHand'||state.parts!==(name==='walk'?5:2))throw Error('Invalid pose '+name+' '+i+' '+JSON.stringify(state));
  }
  await page.evaluate(t=>window.studioPlayer.seek(t),duration*(name==='attack'?.54:.2));
  await page.screenshot({path:new URL(`../captures/verdant-shaman/${name}.png`,import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
  const png=await page.evaluate(async()=>{const blob=await window.studioPlayer.snapshot();return [...new Uint8Array(await blob.arrayBuffer())];});
  fs.writeFileSync(new URL(`../public/models/verdant-shaman/${name}-preview.png`,import.meta.url),Buffer.from(png));
  poses.push({name,duration,frames:5});
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(new URL('../VERDANT-SHAMAN-VALIDATION.json',import.meta.url),JSON.stringify({poses,errors,bones:21,meshes:2},null,2));
 console.log(JSON.stringify({poses,errors}));
}finally{await browser.close();}

