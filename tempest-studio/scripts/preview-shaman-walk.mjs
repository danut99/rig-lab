import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';
const dir=new URL('../captures/verdant-shaman/',import.meta.url),model=new URL('../public/models/verdant-shaman/',import.meta.url),browser=await chromium.launch({channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:950}});await page.goto('http://127.0.0.1:5190/?species=verdant-shaman');await page.waitForFunction(()=>window.studioPlayer?.loaded);await page.locator('#view').selectOption('art');await page.locator('[data-animation="walk"]').click();
 const duration=await page.evaluate(()=>window.studioPlayer.raw.animationState.getCurrent(0).animation.duration),sheet=new PNG({width:1600,height:800});
 for(let i=0;i<8;i++){
  const data=await page.evaluate(async time=>{const p=window.studioPlayer;p.seek(time);const blob=await p.snapshot();return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});},duration*i/8),png=PNG.sync.read(Buffer.from(data,'base64'));
  fs.writeFileSync(new URL(`walk-phase-${i}.png`,dir),PNG.sync.write(png));
  const scale=Math.min(400/png.width,400/png.height),w=Math.round(png.width*scale),h=Math.round(png.height*scale),padX=Math.floor((400-w)/2),padY=Math.floor((400-h)/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const from=(Math.min(png.height-1,Math.floor(y/scale))*png.width+Math.min(png.width-1,Math.floor(x/scale)))*4,to=((Math.floor(i/4)*400+padY+y)*1600+(i%4)*400+padX+x)*4;png.data.copy(sheet.data,to,from,from+4);}
 }
 fs.writeFileSync(new URL('walk-cycle.png',dir),PNG.sync.write(sheet));
 const performanceReport=await page.evaluate(async()=>{const p=window.studioPlayer;p.setAnimation('walk');p.setLoop(true);p.setPaused(false);const gaps=[];let start=performance.now(),last=start;await new Promise(resolve=>{function frame(t){gaps.push(t-last);last=t;if(t-start<2200)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});return {fps:gaps.length/((last-start)/1000),longestFrameMs:Math.max(...gaps),frames:gaps.length};});
 const video=await page.evaluate(async()=>{const p=window.studioPlayer;p.setAnimation('walk');p.setLoop(true);p.setPaused(false);const stream=p.canvas.captureStream(30),chunks=[],mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm',recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};await new Promise(resolve=>{recorder.onstop=resolve;recorder.start();setTimeout(()=>recorder.stop(),4600);});stream.getTracks().forEach(t=>t.stop());return [...new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer())];});
 fs.writeFileSync(new URL('walk-preview.webm',model),Buffer.from(video));fs.writeFileSync(new URL('../VERDANT-SHAMAN-PERFORMANCE.json',import.meta.url),JSON.stringify(performanceReport,null,2));console.log(JSON.stringify({...performanceReport,videoBytes:video.length}));
}finally{await browser.close();}
