import fs from 'node:fs';
import crypto from 'node:crypto';
import {motionSources} from './legend-dragon-motion.mjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
const root=new URL('../',import.meta.url),report=[];
const preserved=JSON.parse(fs.readFileSync(new URL('source/legends/fulminarch-preserved.json',root)));
for(const [file,hash] of Object.entries(preserved)){
 if(crypto.createHash('sha256').update(fs.readFileSync(new URL('public/models/fulminarch/'+file,root))).digest('hex')!==hash)throw Error('Fulminarch modified: '+file);
}
for(const [id,source] of Object.entries(motionSources)){
 const skeleton=JSON.parse(fs.readFileSync(new URL('public/models/'+id+'/skeleton.json',root))),meta=JSON.parse(fs.readFileSync(new URL('public/models/'+id+'/meta.json',root)));
 if(meta.motionSource?.dragon!==source.dragon)throw Error(id+' source provenance missing');
 const attack=skeleton.animations.attack.bones.root.translate,span=Math.max(...attack.map(k=>k.x))-Math.min(...attack.map(k=>k.x));
 if(span<35)throw Error(id+' attack lacks meaningful anticipation/advance');
 for(const name of ['attack','ultimate']){
  const animation=skeleton.animations[name],root=animation.bones.root.translate;
  if(Math.hypot(root.at(-1).x,root.at(-1).y)>1e-6)throw Error(id+' combat root does not recover');
  const rig={skeleton:{...skeleton,slots:skeleton.slots.filter(slot=>slot.name==='art')},regions:{}},duration=meta.animations.find(a=>a.name===name).duration;
  const first=meshes(rig,pose(skeleton,name,0)).art.pts.flat(),last=meshes(rig,pose(skeleton,name,duration)).art.pts.flat();
  if(Math.max(...first.map((v,i)=>Math.abs(v-last[i])))>1e-6)throw Error(id+' combat joints do not recover: '+name);
  const frames=animation.slots.fx.attachment.filter(k=>k.name);
  if(Math.abs(frames[0].time-duration*source.impact[name])>1e-6)throw Error(id+' FX is not synchronized');
 }
 report.push({id,dragon:source.dragon,attackTravel:span,samplingRate:30,ok:true});
}
fs.writeFileSync(new URL('LEGENDS-MOTION-VALIDATION.json',root),JSON.stringify({fulminarchPreserved:true,models:report},null,2));
console.log(JSON.stringify({fulminarchPreserved:true,models:report}));
