import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');const out=path.join(root,'captures/tempestopteryx-pui');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5190/?species=tempestopteryx&stage=pui');await page.waitForFunction(()=>window.studioPlayer?.loaded,{},{timeout:30000});
 await page.locator('#setup').click();await page.screenshot({path:path.join(out,'setup.png')});
 if(await page.locator('#age').inputValue()!=='pui')throw Error('Wrong age selected');
 const rigCheck=await page.evaluate(()=>{const r=window.studioPlayer.raw,s=r.skeleton;return {bones:s.bones.length,slots:s.slots.length,overlay:r.config.debug.bones};});
 const results=[];
 for(const animation of ['idle','walk','attack','ultimate']){
  await page.locator(`[data-animation=${animation}]`).click();await page.locator('#pause').click();
  const duration=await page.evaluate(()=>window.studioPlayer.raw.animationState.getCurrent(0).animation.duration);
  for(const phase of [0,.25,.5,.75,.999]){
   const result=await page.evaluate(({time})=>{
    const p=window.studioPlayer;p.seek(time);const s=p.raw.skeleton,body=s.findBone('body');
    const neck=['neck1','neck2','neck3','head'].map(n=>s.findBone(n).rotation-s.findBone(n).data.rotation);
    const tips={};let maximumGap=0;
    for(const side of ['farWing','nearWing']){
     const chain=['Upper','Fore','Hand'].map(part=>s.findBone(side+part));
     for(let i=0;i<2;i++){const b=chain[i],next=chain[i+1];maximumGap=Math.max(maximumGap,Math.hypot(b.worldX+b.a*b.data.length-next.worldX,b.worldY+b.c*b.data.length-next.worldY));}
     const b=chain[2],end={x:b.worldX+b.a*b.data.length,y:b.worldY+b.c*b.data.length};const local=body.worldToLocal(end);tips[side]=local.y;
    }
    return {neck,maximumGap,tips};
   },{time:duration*phase});
   if(result.maximumGap>.001||result.neck.some(angle=>Math.abs(angle)>.001))throw Error('Actual runtime rig joint/neck failure');
   if(Math.abs((result.tips.farWing-610)-(result.tips.nearWing+295))>.001)throw Error('Actual runtime wing phase mismatch');
   results.push({animation,phase,...result});
   if(animation==='walk'&&[.25,.75].includes(phase))await page.screenshot({path:path.join(out,`flight-${phase}.png`)});
   if(animation==='ultimate'&&phase===.5){
    const slots=await page.evaluate(()=>window.studioPlayer.raw.skeleton.slots.map(slot=>slot.data.name));
    if(slots.length!==3)throw Error('Unexpected visual effects');
    await page.screenshot({path:path.join(out,'storm-skeletal.png')});
   }
  }
  await page.screenshot({path:path.join(out,animation+'.png')});
  if(animation==='ultimate')for(const [label,time] of [['gather',.4],['power-stroke',1.05],['climb',1.3],['bank',2.2]]){
   await page.evaluate(time=>window.studioPlayer.seek(time),time);
   await page.screenshot({path:path.join(out,'storm-'+label+'.png')});
  }
 }
 await page.locator('#setup').click();await page.locator('#compare').click();await page.screenshot({path:path.join(out,'reference-comparison.png')});
 await page.locator('#compare').click();await page.selectOption('#view','skeleton');await page.screenshot({path:path.join(out,'bones-only.png')});await page.selectOption('#view','bones');await page.locator('#mesh').check();await page.screenshot({path:path.join(out,'mesh.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#mesh').uncheck();await page.screenshot({path:path.join(out,'mobile.png')});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile overflow');
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(root,'TEMPEST-PUI-BROWSER-VALIDATION.json'),JSON.stringify({rigCheck,results,mobileOverflow:overflow,pageErrors:errors},null,2));console.log({rigCheck,poses:results.length,mobileOverflow:overflow,errors});
}finally{await browser.close();}
