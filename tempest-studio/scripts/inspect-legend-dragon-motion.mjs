import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=new URL('../',import.meta.url),out=new URL('captures/dragon-motion/',root),data=new URL('source/legends/motion-references/',root);
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(data,{recursive:true});
const refs=['flamingrock','sea','primal-rage','war-thorn','tricky-trunk'];
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 await page.goto('http://127.0.0.1:5190/');await page.waitForFunction(()=>window.studioPlayer?.loaded);
 for(const id of refs){
  const files=fs.readdirSync(new URL('public/reference/'+id+'/',root)),atlas=files.find(f=>f.endsWith('.atlas')&&!f.includes('_map')),skel=atlas.replace('.atlas','.skel');
  await page.evaluate(async({id,atlas,skel})=>{
   window.studioPlayer?.dispose();window.dragonReference?.dispose();document.body.innerHTML='<div id="ref" style="height:850px;width:1150px"></div>';
   document.body.style.background='#151c24';
   await new Promise((resolve,reject)=>{window.dragonReference=new window.DragonPackSpine.SpinePlayer(document.getElementById('ref'),{skelUrl:'/reference/'+id+'/'+skel,atlasUrl:'/reference/'+id+'/'+atlas,premultipliedAlpha:false,alpha:true,backgroundColor:'#00000000',showControls:false,success:p=>{window.dragonReference=p;p.pause();resolve();},error:(_,e)=>reject(Error(e))});});
  },{id,atlas,skel});
  const result=await page.evaluate(()=>{
   const p=window.dragonReference,s=p.skeleton;const animations=[];
   for(const a of s.data.animations){
    if(!['breathe','walk','fly','attack','special1'].includes(a.name))continue;
    p.setAnimation(a.name,false);const track=p.animationState.getCurrent(0),frames=[];
    for(let i=0;i<=Math.ceil(a.duration*30);i++){
     track.trackTime=Math.min(a.duration,i/30);track.mixDuration=0;s.setToSetupPose();p.animationState.apply(s);s.updateWorldTransform();
     frames.push(Object.fromEntries(s.bones.map(b=>[b.data.name,{x:b.worldX,y:b.worldY,angle:Math.atan2(b.c,b.a)*180/Math.PI,rotation:b.rotation}])));
    }animations.push({name:a.name,duration:a.duration,frames});
   }return {bones:s.data.bones.map(b=>({name:b.name,parent:b.parent?.name,length:b.length})),animations};
  });
  fs.writeFileSync(new URL(id+'.json',data),JSON.stringify(result));
  for(const a of result.animations.filter(a=>['attack','special1','walk'].includes(a.name))){
   for(const fraction of [.2,.45,.7]){
    await page.evaluate(({name,t})=>{const p=window.dragonReference;p.setAnimation(name,false);p.pause();const track=p.animationState.getCurrent(0);track.trackTime=t;track.mixDuration=0;p.skeleton.setToSetupPose();p.animationState.apply(p.skeleton);p.skeleton.updateWorldTransform();p.viewportTransitionStart=performance.now()-10000;p.drawFrame(false);},{name:a.name,t:a.duration*fraction});
    await page.screenshot({path:fileURLToPath(new URL(`${id}-${a.name}-${fraction}.png`,out))});
   }
  }
  console.log(id+': '+result.animations.map(a=>a.name+' '+a.duration.toFixed(2)+'s').join(', '));
 }
}finally{await browser.close();}
