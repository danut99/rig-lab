import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pose} from '../../scripts/lib/spine.mjs';
import {shamanSurfaces} from './shaman-surfaces.mjs';
const rig=JSON.parse(fs.readFileSync('public/models/verdant-shaman/animated.json')),rest=shamanSurfaces(rig,pose(rig),'walk',0,{deform:false}),strips=[];
for(const name of ['walk-nearLeg','walk-farLeg']){
 const rows=new Map();rest[name].pts.forEach((p,i)=>{const key=Math.round(p[1]*10000);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(i);});
 for(const row of rows.values()){
  row.sort((a,b)=>rest[name].pts[a][0]-rest[name].pts[b][0]);let group=[];
  const save=()=>{if(group.length>=3){const a=group[0],b=group.at(-1);strips.push({name,a,b,y:rest[name].pts[a][1],width:rest[name].pts[b][0]-rest[name].pts[a][0]});}};
  for(const i of row){if(group.length&&rest[name].pts[i][0]-rest[name].pts[group.at(-1)][0]>19){save();group=[];}group.push(i);}save();
 }
}
let min=1,max=1;
const joints=pose(rig);
for(const [motion,duration]of [['walk',2.2],['attack',2.1]])for(let frame=0;frame<=Math.round(duration*60);frame++){
 const time=frame/60,surfaces=shamanSurfaces(rig,pose(rig,motion,time),motion,time);
 for(const strip of strips){const a=surfaces[strip.name].pts[strip.a],b=surfaces[strip.name].pts[strip.b],ratio=Math.hypot(b[0]-a[0],b[1]-a[1])/strip.width,kneeShape=strip.name==='walk-nearLeg'&&strip.y>joints.walknearFoot.y&&Math.abs(strip.y-joints.walknearLower.y)<110;min=Math.min(min,ratio);max=Math.max(max,ratio);assert.ok(ratio>.995&&ratio<(kneeShape?1.35:1.005),`${motion} ${strip.name} changes width by ${ratio} at ${time}`);}
}
assert.ok(strips.length>20);
const report={frames:260,strips:strips.length,minWidthRatio:min,maxWidthRatio:max,kneeShape:'Controlled opening behind the near knee; other strips and toes retain their width.'};
fs.writeFileSync('VERDANT-SHAMAN-LEG-VOLUME.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
