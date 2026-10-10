import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require('playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}});
 await page.goto('http://127.0.0.1:5190/?species=fulgurodrome');
 await page.waitForFunction(()=>window.studioPlayer?.loaded);
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const base='/reference/robo-ravager/basic_2793_dragon_roboravager_3_HD_spine-3-8-59_dxt5';
  const host=document.createElement('div');host.style='position:fixed;inset:0;background:#233;z-index:1000';document.body.append(host);
  new window.DragonPackSpine.SpinePlayer(host,{skelUrl:base+'.skel',atlasUrl:base+'.atlas',showControls:false,premultipliedAlpha:false,success:p=>{window.robo=p;p.pause();resolve();},error:(_,e)=>reject(e)});
 }));
 const data=await page.evaluate(()=>{
  const p=window.robo,s=p.skeleton;
  return {animations:s.data.animations.map(a=>({name:a.name,duration:a.duration})),bones:s.bones.map(b=>({name:b.data.name,parent:b.parent?.data.name,x:b.data.x,y:b.data.y,length:b.data.length,rotation:b.data.rotation}))};
 });
 const motion=await page.evaluate(()=>{
  const p=window.robo,s=p.skeleton,a=s.data.findAnimation('walk'),names=['hip','pelvis','body','neck_front','head','tail','thai_l','thai_r','upper_leg_l','upper_leg_r','lower_leg_l','lower_leg_r','feet_l','feet_r','arm_l','basic/arm_r'];
  const frames=[];
  for(let i=0;i<=120;i++){
   s.setToSetupPose();a.apply(s,0,i/60,false,[],1,0,0);s.updateWorldTransform();
   frames.push(Object.fromEntries(names.map(name=>{const b=s.findBone(name);return [name,{x:b.worldX,y:b.worldY,angle:Math.atan2(b.c,b.a)*180/Math.PI,localAngle:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY}];})));
  }
  return {source:'Robo Ravager Dragon · Adult',animation:'walk',duration:a.duration,fps:60,frames};
 });
 fs.writeFileSync(new URL('../source/fulgurodrome/robo-walk.json',import.meta.url),JSON.stringify(motion));
 console.log(JSON.stringify({duration:motion.duration,ranges:Object.fromEntries(Object.keys(motion.frames[0]).map(n=>[n,Object.fromEntries(['x','y','angle'].map(k=>[k,[Math.min(...motion.frames.map(f=>f[n][k])),Math.max(...motion.frames.map(f=>f[n][k]))]]))]))},null,2));
 await page.evaluate(()=>{window.robo.setAnimation('walk',true);window.robo.pause();window.robo.drawFrame(false);});
 await page.screenshot({path:new URL('../captures/robo-walk.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
 fs.writeFileSync(new URL('../source/fulgurodrome/robo-description.json',import.meta.url),JSON.stringify(data,null,2));
}finally{await browser.close();}
