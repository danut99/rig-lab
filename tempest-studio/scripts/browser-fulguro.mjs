import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),{chromium}=require('playwright-core'),out=path.join(root,'captures/fulgurodrome');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5190/?species=fulgurodrome');await page.waitForFunction(()=>window.studioPlayer?.loaded,{},{timeout:30000});
 const model=await page.evaluate(()=>({model:window.studioPlayer.model.id,bones:window.studioPlayer.raw.skeleton.bones.length,slots:window.studioPlayer.raw.skeleton.slots.length}));
 if(model.model!=='fulgurodrome')throw Error('Wrong species');await page.locator('#setup').click();await page.screenshot({path:path.join(out,'setup.png')});
 const results=[];
 for(const animation of ['idle','walk','attack','ultimate']){
  await page.locator(`[data-animation=${animation}]`).click();await page.locator('#pause').click();
  const duration=await page.evaluate(()=>window.studioPlayer.raw.animationState.getCurrent(0).animation.duration);
  for(const phase of [0,.2,.4,.6,.8,.999]){
   const result=await page.evaluate(time=>{const p=window.studioPlayer;p.seek(time);const s=p.raw.skeleton;let maxGap=0;
    for(const side of ['nearLeg','farLeg','nearArm','farArm']){const chain=['Upper','Lower',side.endsWith('Leg')?'Foot':'Hand'].map(part=>s.findBone(side+part));for(let i=0;i<2;i++){const b=chain[i],next=chain[i+1];maxGap=Math.max(maxGap,Math.hypot(b.worldX+b.a*b.data.length-next.worldX,b.worldY+b.c*b.data.length-next.worldY));}}
    for(const side of ['nearLeg','farLeg'])for(const part of ['Upper','Lower','Foot']){
     const slot=s.findSlot(side+part),attachment=slot.getAttachment(),index=s.findBone(side+part).data.index;
     if(part==='Upper'||part==='Lower'){if(!slot.deform.length)throw Error('Hip transition missing');continue;}
     for(let i=0;i<attachment.bones.length;i+=2)if(attachment.bones[i]!==1||attachment.bones[i+1]!==index)throw Error('Leg piece is not rigid');
     if(slot.deform.length)throw Error('Unexpected leg deformation');
    }
    return {maxGap,animation:p.animation,rigidLegPieces:true};},duration*phase);
   if(result.maxGap>.001)throw Error('Disconnected actual runtime limb '+JSON.stringify({animation,phase,...result}));results.push({animation,phase,...result});
   if([.2,.4,.6].includes(phase))await page.screenshot({path:path.join(out,animation+'-'+phase+'.png')});
  }
 }
 await page.locator('#setup').click();await page.locator('#compare').click();await page.screenshot({path:path.join(out,'comparison.png')});await page.locator('#compare').click();await page.selectOption('#view','skeleton');await page.screenshot({path:path.join(out,'bones.png')});
 await page.setViewportSize({width:390,height:844});await page.selectOption('#view','bones');await page.screenshot({path:path.join(out,'mobile.png')});const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(mobileOverflow)throw Error('Mobile overflow');
 await page.selectOption('#species','tempestopteryx');await page.waitForFunction(()=>window.studioPlayer?.loaded&&window.studioPlayer.model.id==='tempestopteryx',{},{timeout:30000});
 await page.selectOption('#species','fulgurodrome');await page.waitForFunction(()=>window.studioPlayer?.loaded&&window.studioPlayer.model.id==='fulgurodrome',{},{timeout:30000});
 if(errors.length)throw Error(errors.join('\n'));const report={model,poses:results.length,results,mobileOverflow,errors,speciesSwitch:true};fs.writeFileSync(path.join(root,'FULGURO-BROWSER-VALIDATION.json'),JSON.stringify(report,null,2));console.log({model,poses:results.length,mobileOverflow,errors,speciesSwitch:true});
}finally{await browser.close();}
