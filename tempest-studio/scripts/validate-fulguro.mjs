import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {skinLeg} from './leg-skin.mjs';
import {rotate,transforms,durations,pose,solveLeg,paths,world,targetFoot} from './fulguro-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/models/fulgurodrome');
const layout=JSON.parse(fs.readFileSync(path.join(out,'layout.json'))),rig=JSON.parse(fs.readFileSync(path.join(out,'animated.json')));
const assert=(ok,message)=>{if(!ok)throw Error(message);};
// Check velocity through lift-off, touchdown and loop wrap, which
// endpoint-position checks alone cannot establish.
for(const side of ['nearLeg','farLeg'])for(const phase of [0,.58]){
 const time=(phase-(side==='farLeg'?.5:0))*durations.walk,eps=1e-5;
 const foot=t=>targetFoot(side,'walk',t,pose('walk',t)).ankle;
 const a=foot(time-eps),b=foot(time),c=foot(time+eps);
 const velocityJump=Math.hypot(...b.map((v,i)=>(c[i]-v)/eps-(v-a[i])/eps));
 assert(velocityJump<.2,'Abrupt walking foot velocity at support transition');
}
let maxSetupError=0,minAreaRatio=Infinity,maxReachError=0,frames=0,maxJointError=0;
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const source=PNG.sync.read(fs.readFileSync(path.join(root,'source/fulgurodrome/art.png'))),layers=rig.slots.map(slot=>PNG.sync.read(fs.readFileSync(path.join(out,slot.name+'.png'))));
for(let i=0;i<source.width*source.height;i++){
 const occupied=layers.filter(layer=>layer.data[i*4+3]);assert((source.data[i*4+3]?occupied.length>=1&&occupied.length<=3:occupied.length===0),'Reference pixels missing or duplicated');
 if(occupied.length)for(let channel=0;channel<4;channel++)assert(occupied[0].data[i*4+channel]===source.data[i*4+channel],'Changed reference pixel');
}
const body=layers[rig.slots.findIndex(slot=>slot.name==='body')];
const farThigh=layers[rig.slots.findIndex(slot=>slot.name==='farLegUpper')];
for(let y=600;y<635;y++)for(let x=915;x<945;x++){
 const i=(y*source.width+x)*4;
 if(source.data[i+3]>96)assert(farThigh.data[i+3]===source.data[i+3], 'Rear thigh attached to the wrong leg');
}
for(let y=735;y<source.height;y++)for(let x=0;x<source.width;x++)assert(body.data[(y*source.width+x)*4+3]<96,'Foot pixels left behind on torso');
for(const side of ['nearLeg','farLeg'])for(const part of ['Foot']){
 const mesh=layout.layouts[side+part];
 assert(mesh.rigidPiece,'Leg section must be rigid');
 for(const weights of mesh.weights)assert(weights.length===1&&weights[0][0]===side+part&&weights[0][1]===1,'Leg section can change width');
}
function skin(layer,current){if(layer.rigidBlend)return skinLeg(layer,layout.setup,current);return layer.points.map((p,i)=>{
 const result=[0,0];for(const [name,w] of layer.weights[i]){const rest=layout.setup[name],local=rotate([p[0]-rest.x,p[1]-rest.y],-rest.angle),b=current[name],point=rotate(local,b.angle);result[0]+=(point[0]+b.x)*w;result[1]+=(point[1]+b.y)*w;}return result;
});}
for(const [name,layer] of Object.entries(layout.layouts)){
 const setup=skin(layer,layout.setup);
 setup.forEach((p,i)=>{maxSetupError=Math.max(maxSetupError,Math.hypot(p[0]-layer.points[i][0],p[1]-layer.points[i][1]));assert(Math.abs(layer.weights[i].reduce((s,[,w])=>s+w,0)-1)<1e-8,'Unnormalized weights');});
}
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
for(const [animation,duration] of Object.entries(durations)){
 for(let frame=0;frame<=Math.round(duration*60);frame++){
  const time=frame/60,state=transforms(layout.bones,animation,time);
  for(const side of ['nearLeg','farLeg']){
   const solved=solveLeg(side,animation,time,state.pose);maxReachError=Math.max(maxReachError,solved.reachError);
   const chain=['Upper','Lower','Foot'].map(part=>state.bones[side+part]);
   for(let i=0;i<2;i++){const b=chain[i],length=rig.bones.find(b=>b.name===side+['Upper','Lower'][i]).length,end=rotate([length,0],b.angle);maxJointError=Math.max(maxJointError,Math.hypot(b.x+end[0]-chain[i+1].x,b.y+end[1]-chain[i+1].y));}
  }
  for(const [name,layer] of Object.entries(layout.layouts)){
   const points=skin(layer,state.bones);for(const p of points)assert(p.every(Number.isFinite),'Non-finite vertex');
   for(let i=0;i<layer.triangles.length;i+=3){const [a,b,c]=layer.triangles.slice(i,i+3),ratio=area(points[a],points[b],points[c])/area(layer.points[a],layer.points[b],layer.points[c]);minAreaRatio=Math.min(minAreaRatio,ratio);if(layer.rigidPiece)assert(Math.abs(ratio-1)<1e-8,`Rigid leg shape changed in ${animation}`);assert(ratio>.2,`${name} mesh folded/compressed in ${animation}, frame ${frame}: ${ratio}; vertices ${JSON.stringify([layer.points[a],layer.points[b],layer.points[c]])}`);}
  }
  frames++;
 }
}
assert(maxSetupError<1e-8,'Reference assembly mismatch');assert(maxJointError<1e-8,'Disconnected knee/ankle');assert(maxReachError<2,'Foot targets unreachable');
assert(rig.slots.length===11&&!rig.animations.ultimate.slots,'Unexpected effects');
for(const animation of ['idle','walk'])for(const timelines of Object.values(rig.animations[animation].bones))for(const keys of Object.values(timelines))for(const field of Object.keys(keys[0]))if(field!=='time')assert(Math.abs(keys[0][field]-keys.at(-1)[field])<1e-7,'Non-seamless loop');
const report={frames,bones:rig.bones.length,layers:rig.slots.length,maxSetupError,maxJointError,maxReachError,minAreaRatio,skeletalMotionOnly:true,referencePixelsPreserved:true,feetPixelsOnLegs:true};fs.writeFileSync(path.join(root,'FULGURO-VALIDATION.json'),JSON.stringify(report,null,2));console.log(report);
