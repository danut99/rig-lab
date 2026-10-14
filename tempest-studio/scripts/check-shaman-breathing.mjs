import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1400,height:950}});
 await page.goto('http://127.0.0.1:5190/?species=verdant-shaman');
 await page.waitForFunction(()=>window.studioPlayer?.loaded);
 const result=await page.evaluate(()=>{
  const p=window.studioPlayer,s=p.raw.skeleton,body=s.findBone('body'),points=[];
  for(const previous of ['idle','walk','attack']) {
   p.setAnimation(previous);p.seek(.7);p.setAnimation('idle');
   for(let i=0;i<8;i++) {
    p.seek(i*.5);const a=s.findSlot('art').getAttachment(),v=new Float32Array(a.worldVerticesLength);
    a.computeWorldVertices(s.findSlot('art'),0,v.length,v,0,2);
    let error=0,count=0;
    for(let j=0;j<a.uvs.length/2;j++) {
     const x=a.uvs[j*2]*1254,y=a.uvs[j*2+1]*1254;
     if(y<1125||x<300||x>950)continue;
     const localX=x-627-body.data.x,localY=1254-y-body.data.y;
     error=Math.max(error,Math.hypot(v[j*2]-(body.a*localX+body.b*localY+body.worldX),v[j*2+1]-(body.c*localX+body.d*localY+body.worldY)));count++;
    }
    points.push({previous,time:i*.5,error,count,attachment:a.name,visible:s.slots.filter(slot=>slot.getAttachment()).length});
   }
  }
  return points;
 });
 for(const pose of result){assert.equal(pose.attachment,'breathing-art');assert.equal(pose.visible,2);assert.ok(pose.count>0);assert.ok(pose.error<.01,JSON.stringify(pose));}
 await page.locator('#view').selectOption('art');
 await page.evaluate(()=>window.studioPlayer.seek(2));
 await page.screenshot({path:'captures/verdant-shaman/breathing-peak.png'});
 fs.writeFileSync('VERDANT-SHAMAN-BREATHING-VALIDATION.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({poses:result.length,maxToeError:Math.max(...result.map(p=>p.error))}));
} finally {await browser.close();}
