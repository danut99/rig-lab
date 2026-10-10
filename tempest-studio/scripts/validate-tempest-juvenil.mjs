import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {pose,durations,wingPaths,wingTransforms,world} from './tempest-juvenil-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),layout=JSON.parse(fs.readFileSync(path.join(root,'public/models/tempestopteryx-juvenil/layout.json'))),rig=JSON.parse(fs.readFileSync(path.join(root,'public/models/tempestopteryx-juvenil/animated.json')));
let maximumSetupError=0,maximumStretch=0,minimumAreaRatio=Infinity,frames=0;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const source=PNG.sync.read(fs.readFileSync(path.join(root,'source/tempestopteryx-juvenil/art.png')));
const layers=['farWing','nearWing','body'].map(name=>PNG.sync.read(fs.readFileSync(path.join(root,'public/models/tempestopteryx-juvenil',name+'.png'))));
for(let i=0;i<source.width*source.height;i++){
 const occupied=layers.filter(layer=>layer.data[i*4+3]);
 assert(occupied.length===(source.data[i*4+3]?1:0),'Missing/duplicated reference pixel');
 if(occupied.length)for(let channel=0;channel<4;channel++)assert(occupied[0].data[i*4+channel]===source.data[i*4+channel],'Changed reference pixel');
}
for(const [name,layer] of Object.entries(layout.layouts)){
 for(let i=0;i<layer.points.length;i++){
  const q=layer.points[i],influences=layer.weights[i];assert(Math.abs(influences.reduce((s,[,w])=>s+w,0)-1)<1e-8,'Unnormalized weights');
  if(name==='body'&&q[0]>-160)assert(influences.length===1&&influences[0][0]==='body','Torso/head must stay rigid in flight');
 }
}
for(const [animation,duration] of Object.entries(durations)){
 const track=rig.animations[animation].bones;
 if(['idle','walk'].includes(animation))for(const timelines of Object.values(track))for(const keys of Object.values(timelines))for(const field of Object.keys(keys[0]))if(field!=='time')assert(Math.abs(keys[0][field]-keys.at(-1)[field])<1e-8,'Visible loop discontinuity');
 for(const name of ['neck1','neck2','neck3','head'])assert(track[name].rotate.every(k=>k.angle===0),'Independent neck/head motion');
 for(let frame=0;frame<=Math.round(duration*60);frame++){
  const time=frame/60,p=pose(animation,time),transforms={body:{x:0,y:0,angle:0,scaleX:1}};
  for(let i=0;i<4;i++){
   const name='tail'+(i+1),bone=layout.bones.find(b=>b.name===name),parent=transforms[bone.parent],angle=parent.angle*Math.PI/180;
   transforms[name]={x:parent.x+Math.cos(angle)*bone.x-Math.sin(angle)*bone.y,y:parent.y+Math.sin(angle)*bone.x+Math.cos(angle)*bone.y,angle:parent.angle+bone.rotation+p.tail[i],scaleX:1};
  }
  for(const [side,pts] of Object.entries(p.wings)){
   const rest=wingPaths[side].map(world),ts=wingTransforms(pts,rest);
   const other=side==='nearWing'?'farWing':'nearWing';
   for(let i=0;i<pts.length;i++)assert(Math.abs((pts[i][1]-rest[i][1])-(p.wings[other][i][1]-world(wingPaths[other][i])[1]))<1e-8,'Wing phase mismatch');
   ts.forEach((t,i)=>{transforms[side+['Upper','Fore','Hand'][i]]=t;maximumStretch=Math.max(maximumStretch,Math.abs(t.scaleX-1));const end=[t.x+Math.cos(t.angle*Math.PI/180)*t.length,t.y+Math.sin(t.angle*Math.PI/180)*t.length];assert(Math.hypot(end[0]-pts[i+1][0],end[1]-pts[i+1][1])<1e-8,'Disconnected wing joint');});
  }
  for(const layer of Object.values(layout.layouts)){
   const points=layer.points.map((q,i)=>{const sum=[0,0];for(const [name,w] of layer.weights[i]){
    const rest=layout.setup[name],r=-rest.rotation*Math.PI/180,dx=q[0]-rest.x,dy=q[1]-rest.y,lx=Math.cos(r)*dx-Math.sin(r)*dy,ly=Math.sin(r)*dx+Math.cos(r)*dy,t=transforms[name],a=t.angle*Math.PI/180;
    sum[0]+=(t.x+Math.cos(a)*lx*t.scaleX-Math.sin(a)*ly)*w;sum[1]+=(t.y+Math.sin(a)*lx*t.scaleX+Math.cos(a)*ly)*w;
   }assert(sum.every(Number.isFinite),'Non-finite vertex');if(frame===0)maximumSetupError=Math.max(maximumSetupError,Math.hypot(sum[0]-q[0],sum[1]-q[1]));return sum;});
   const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   for(let i=0;i<layer.triangles.length;i+=3){const [a,b,c]=layer.triangles.slice(i,i+3),ratio=area(points[a],points[b],points[c])/area(layer.points[a],layer.points[b],layer.points[c]);minimumAreaRatio=Math.min(minimumAreaRatio,ratio);assert(ratio>.35,`Folded/compressed mesh in ${animation} frame ${frame}: ${ratio}`);}
  }
  frames++;
 }
}
assert(maximumSetupError<1e-8,'Reference assembly mismatch');assert(maximumStretch<.2,'Wing segments stretch too much');
const report={frames,bones:rig.bones.length,maximumSetupError,maximumStretch,minimumAreaRatio,referencePixelsPreserved:true,neckPixelsOnTorso:true,seamlessFlightLoops:true,neckStable:true,wingPhaseSynchronized:true,wingJointsConnected:true};
assert(rig.slots.length===3&&rig.slots.every(slot=>['body','nearWing','farWing'].includes(slot.name)),'Unexpected visual effects');
assert(!rig.animations.ultimate.slots,'Unexpected effect timelines');
assert(Math.max(...rig.animations.ultimate.bones.nearWingUpper.rotate.map(key=>Math.abs(key.angle)))>3,'Effort wing motion too subtle');
report.skeletalMotionOnly=true;
assert(Math.max(...rig.animations.ultimate.bones.body.rotate.map(key=>Math.abs(key.angle)))>13.299999999999999,'Banking pose too subtle');
assert(Math.max(...rig.animations.ultimate.bones.body.translate.map(key=>key.y))>76.0,'Climb pose too subtle');
assert(rig.animations.ultimate.bones.tail4.rotate.some(key=>Math.abs(key.angle)>1),'Tail does not counterbalance');
report.distinctGatherStrokeClimbBank=true;
fs.writeFileSync(path.join(root,'TEMPEST-JUVENIL-VALIDATION.json'),JSON.stringify(report,null,2));console.log(report);
