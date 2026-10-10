import fs from 'node:fs';
import {createRequire} from 'node:module';
const {PNG}=createRequire(new URL('../../../DCAT-main/package.json',import.meta.url))('pngjs');
import {skinLeg} from './leg-skin.mjs';
import {durations,transforms} from './pelagi-motion.mjs';
const out=new URL('../public/models/pelagisaur/',import.meta.url),layout=JSON.parse(fs.readFileSync(new URL('layout.json',out))),rig=JSON.parse(fs.readFileSync(new URL('animated.json',out))),mesh=layout.layouts.art;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
assert(rig.slots.length===1&&rig.bones.length===13,'Continuous body and articulated fins expected');
assert(PNG.sync.read(fs.readFileSync(new URL('../source/pelagisaur/art.png',import.meta.url))).data.equals(PNG.sync.read(fs.readFileSync(new URL('art.png',out))).data),'Original artwork pixels changed');
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let frames=0,minAreaRatio=Infinity,rigidFinTriangles=0;
for(const [animation,duration] of Object.entries(durations))for(let frame=0;frame<=Math.round(duration*60);frame++){
 const state=transforms(layout.bones,animation,Math.min(duration,frame/60)),points=skinLeg(mesh,layout.setup,state.bones);
 for(const p of points)assert(p.every(Number.isFinite),'Nonfinite vertex');
 for(let i=0;i<mesh.triangles.length;i+=3){const indices=mesh.triangles.slice(i,i+3),[a,b,c]=indices,ratio=area(points[a],points[b],points[c])/area(mesh.points[a],mesh.points[b],mesh.points[c]);minAreaRatio=Math.min(minAreaRatio,ratio);assert(ratio>.2,`Mesh compression ${animation} frame ${frame}: ${ratio}, source ${JSON.stringify(mesh.points[a])}`);
  const single=mesh.weights[a].length===1&&indices.every(j=>mesh.weights[j].length===1&&mesh.weights[j][0][0]===mesh.weights[a][0][0]);if(single){assert(Math.abs(ratio-1)<1e-7,'Rigid fin or head shape changed');rigidFinTriangles++;}
 }
 frames++;
}
for(const animation of ['idle','swim']){const a=rig.animations[animation].deform.default.art.art;assert(a[0].vertices.every((v,i)=>Math.abs(v-a.at(-1).vertices[i])<.0011),'Nonseamless swimming surface');}
assert(!rig.animations.ultimate,'Ultimate deferred');const report={frames,bones:rig.bones.length,layers:1,minAreaRatio,rigidFinTriangles,continuousOriginalArtwork:true,effectsReferenceInspected:'Sea Dragon',ultimateDeferred:true};fs.writeFileSync(new URL('../PELAGI-VALIDATION.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
