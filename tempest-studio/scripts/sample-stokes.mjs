import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}});
 await page.goto('http://127.0.0.1:5190/?species=fulgurodrome');await page.waitForFunction(()=>window.studioPlayer?.loaded);
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const base='/reference/stokes-twins/basic_2996_dragon_stokestwins_3_HD_spine-3-8-59_dxt5';
  const host=document.createElement('div');host.style='position:fixed;inset:0;background:#233;z-index:1000';document.body.append(host);
  new window.DragonPackSpine.SpinePlayer(host,{skelUrl:base+'.skel',atlasUrl:base+'.atlas',showControls:false,premultipliedAlpha:false,success:p=>{window.referencePlayer=p;p.pause();resolve();},error:(_,e)=>reject(e)});
 }));
 const motion=await page.evaluate(()=>{
  const p=window.referencePlayer,s=p.skeleton,a=s.data.findAnimation('walk'),frames=[];
  for(let i=0;i<=Math.round(a.duration*60);i++){
   s.setToSetupPose();a.apply(s,0,i/60,false,[],1,0,0);s.updateWorldTransform();
   frames.push(Object.fromEntries(s.bones.map(b=>[b.data.name,{x:b.worldX,y:b.worldY,angle:Math.atan2(b.c,b.a)*180/Math.PI,localAngle:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY}])));
  }
  return {source:'Stokes Twins Dragons · Adult',animation:'walk',duration:a.duration,fps:60,bones:s.bones.map(b=>({name:b.data.name,parent:b.parent?.data.name,length:b.data.length})),frames};
 });
 fs.writeFileSync(new URL('../source/fulgurodrome/stokes-walk.json',import.meta.url),JSON.stringify(motion));
 console.log({duration:motion.duration,bones:motion.bones});
 await page.evaluate(()=>{const p=window.referencePlayer;p.setAnimation('walk',true);p.pause();p.drawFrame(false);});
 await page.screenshot({path:new URL('../captures/stokes-walk.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
}finally{await browser.close();}
