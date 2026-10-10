import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright-core');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1300,height:1000}});
 await page.goto('http://127.0.0.1:5190/?species=fulgurodrome');await page.waitForFunction(()=>window.studioPlayer?.loaded);
 for(const [id,base] of [['war-thorn','basic_2903_dragon_warthorn_3_HD_spine-3-8-59_dxt5'],['tricky-trunk','basic_2857_dragon_trickytrunk_3_HD_spine-3-8-59_dxt5']]){
  await page.evaluate(({id,base})=>new Promise((resolve,reject)=>{
   document.querySelector('#reference-sampler')?.remove();const host=document.createElement('div');host.id='reference-sampler';host.style='position:fixed;inset:0;background:#233;z-index:1000';document.body.append(host);
   new window.DragonPackSpine.SpinePlayer(host,{skelUrl:`/reference/${id}/${base}.skel`,atlasUrl:`/reference/${id}/${base}.atlas`,showControls:false,premultipliedAlpha:false,success:p=>{window.samplePlayer=p;p.pause();resolve();},error:(_,e)=>reject(e)});
  }),{id,base});
  const data=await page.evaluate(()=>{
   const s=window.samplePlayer.skeleton;
   return {bones:s.bones.map(b=>({name:b.data.name,parent:b.parent?.data.name,length:b.data.length})),animations:s.data.animations.map(a=>({name:a.name,duration:a.duration,frames:['walk','attack','breathe'].includes(a.name)?Array.from({length:Math.ceil(a.duration*30)+1},(_,i)=>{s.setToSetupPose();a.apply(s,0,Math.min(a.duration,i/30),false,[],1,0,0);s.updateWorldTransform();return Object.fromEntries(s.bones.map(b=>[b.data.name,{x:b.worldX,y:b.worldY,angle:Math.atan2(b.c,b.a)*180/Math.PI,rotation:b.rotation}]));}):[]}))};
  });
  fs.writeFileSync(new URL(`../source/tundraceratops/${id}.json`,import.meta.url),JSON.stringify(data));console.log(id,data.animations.map(a=>({name:a.name,duration:a.duration})),data.bones.map(b=>b.name));
  for(const animation of ['walk','attack','breathe']){
   const exists=data.animations.find(a=>a.name===animation);if(!exists)continue;
   for(const phase of [.2,.45,.65]){await page.evaluate(({animation,time})=>{const p=window.samplePlayer;p.setAnimation(animation,false);p.pause();p.animationState.getCurrent(0).trackTime=time;p.animationState.apply(p.skeleton);p.skeleton.updateWorldTransform();p.drawFrame(false);},{animation,time:exists.duration*phase});await page.screenshot({path:new URL(`../captures/tundraceratops/reference-${id}-${animation}-${phase}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});}
  }
 }
}finally{await browser.close();}
