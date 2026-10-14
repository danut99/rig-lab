import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';
const base=JSON.parse(fs.readFileSync('source/jade-protector/base-rig.json')),rig=JSON.parse(fs.readFileSync('public/models/jade-protector/animated.json'));
assert.deepEqual(rig.bones,base.bones);
for(const [name,animation]of Object.entries(rig.animations)){const motion=structuredClone(animation);delete motion.slots['protector-cloth'];assert.deepEqual(motion,base.animations[name]);}
assert.equal(rig.slots.find(slot=>slot.name==='protector-cloth').bone,'body');
const browser=await chromium.launch({channel:'msedge'}),errors=[],poses=[];
fs.mkdirSync('captures/jade-protector',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:950}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5190/?species=jade-protector');await page.waitForFunction(()=>window.studioPlayer?.loaded);await page.locator('#view').selectOption('art');
 await page.locator('#setup').click();await page.screenshot({path:'captures/jade-protector/setup.png'});
 const sheet=new PNG({width:1600,height:800});
 for(const name of ['idle','walk','attack']){
  await page.locator(`[data-animation="${name}"]`).click();const duration=await page.evaluate(()=>window.studioPlayer.raw.animationState.getCurrent(0).animation.duration);
  for(let i=0;i<8;i++){
   const state=await page.evaluate(time=>{const p=window.studioPlayer;p.seek(time);const s=p.raw.skeleton;let finite=true;for(const slot of s.slots){const a=slot.getAttachment();if(!a)continue;const mesh=typeof a.worldVerticesLength==='number',v=new Float32Array(mesh?a.worldVerticesLength:8);if(mesh)a.computeWorldVertices(slot,0,v.length,v,0,2);else a.computeWorldVertices(slot.bone,v,0,2);finite&&=[...v].every(Number.isFinite);}return {finite,parts:s.slots.filter(slot=>slot.getAttachment()).length,parent:s.findBone('staff').parent.data.name};},duration*i/8);
   assert.ok(state.finite);assert.equal(state.parts,name==='idle'?3:6);assert.equal(state.parent,'nearHand');
   if(name==='walk'){
    const encoded=await page.evaluate(()=>{const p=window.studioPlayer;p.raw.drawFrame(false);return p.canvas.toDataURL('image/png').split(',')[1];}),png=PNG.sync.read(Buffer.from(encoded,'base64'));assert.ok(png.data.some((value,index)=>index%4===3&&value>0),'Blank walking capture');fs.writeFileSync(`captures/jade-protector/walk-phase-${i}.png`,Buffer.from(encoded,'base64'));
    const scale=Math.min(400/png.width,400/png.height),w=Math.round(png.width*scale),h=Math.round(png.height*scale);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const from=(Math.floor(y/scale)*png.width+Math.floor(x/scale))*4,to=((Math.floor(i/4)*400+y+Math.floor((400-h)/2))*1600+(i%4)*400+x+Math.floor((400-w)/2))*4;png.data.copy(sheet.data,to,from,from+4);}
   }
  }
  await page.evaluate(time=>window.studioPlayer.seek(time),duration*(name==='attack'?.54:.2));await page.screenshot({path:`captures/jade-protector/${name}.png`});
  const encoded=await page.evaluate(()=>{const p=window.studioPlayer;p.raw.drawFrame(false);return p.canvas.toDataURL('image/png').split(',')[1];});fs.writeFileSync(`public/models/jade-protector/${name}-preview.png`,Buffer.from(encoded,'base64'));poses.push({name,duration,frames:8});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('captures/jade-protector/walk-cycle.png',PNG.sync.write(sheet));
 const report={sameBones:true,sameAnimations:true,bones:rig.bones.length,poses,errors};fs.writeFileSync('JADE-PROTECTOR-VALIDATION.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
