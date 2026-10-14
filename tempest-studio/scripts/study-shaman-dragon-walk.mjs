import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {PNG} from 'pngjs';
const dir=new URL('../captures/verdant-shaman/dragon-study/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:800,height:800}});await page.goto('http://127.0.0.1:5190/?species=verdant-shaman');await page.waitForFunction(()=>window.studioPlayer?.loaded);
 await page.evaluate(()=>new Promise((resolve,reject)=>{window.studioPlayer.dispose();const host=document.createElement('div');host.style='position:fixed;inset:0;background:#142126;z-index:10000';document.body.append(host);const base='/reference/robo-ravager/basic_2793_dragon_roboravager_3_HD_spine-3-8-59_dxt5';new window.DragonPackSpine.SpinePlayer(host,{skelUrl:base+'.skel',atlasUrl:base+'.atlas',animation:'walk',showControls:false,premultipliedAlpha:false,backgroundColor:'#142126',success:p=>{window.dragonStudy=p;p.pause();resolve();},error:(_,e)=>reject(e)});}));
 const samples=[];const sheet=new PNG({width:1600,height:800});
 for(let i=0;i<8;i++){
  const result=await page.evaluate(phase=>{const p=window.dragonStudy,s=p.skeleton,a=s.data.findAnimation('walk');p.animationState.getCurrent(0).trackTime=phase*a.duration;s.setToSetupPose();p.animationState.apply(s);s.updateWorldTransform();p.viewportTransitionStart=performance.now()-10000;p.drawFrame(false);return {png:p.canvas.toDataURL(),phase,feet:['feet_l','feet_r'].map(n=>{const b=s.findBone(n);return {name:n,x:b.worldX,y:b.worldY,angle:Math.atan2(b.c,b.a)*180/Math.PI};})};},i/8);
  const png=PNG.sync.read(Buffer.from(result.png.split(',')[1],'base64'));fs.writeFileSync(new URL(`phase-${i}.png`,dir),PNG.sync.write(png));
  for(let y=0;y<400;y++)for(let x=0;x<400;x++){const from=(Math.floor(y*png.height/400)*png.width+Math.floor(x*png.width/400))*4,to=((Math.floor(i/4)*400+y)*1600+(i%4)*400+x)*4;png.data.copy(sheet.data,to,from,from+4);}
  samples.push({phase:result.phase,feet:result.feet});
 }
 fs.writeFileSync(new URL('contact-sheet.png',dir),PNG.sync.write(sheet));fs.writeFileSync(new URL('samples.json',dir),JSON.stringify(samples,null,2));console.log(JSON.stringify(samples));
}finally{await browser.close();}
