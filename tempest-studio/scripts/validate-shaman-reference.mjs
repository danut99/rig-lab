import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {shamanSurfaces} from './shaman-surfaces.mjs';
const dir=new URL('../public/models/verdant-shaman/',import.meta.url),rig=JSON.parse(fs.readFileSync(new URL('animated.json',dir))),original=PNG.sync.read(fs.readFileSync(new URL('reference.png',dir))),art=PNG.sync.read(fs.readFileSync(new URL('art.png',dir))),staff=PNG.sync.read(fs.readFileSync(new URL('staff.png',dir)));
assert.equal(rig.bones.find(b=>b.name==='staff').parent,'nearHand');
let mismatchedPixels=0;
for(let i=0;i<original.width*original.height;i++){const k=i*4,layer=art.data[k+3]?art:staff;assert.ok(!(art.data[k+3]&&staff.data[k+3]),'Overlapping source masks');if(original.data[k+3]&&[0,1,2,3].some(n=>layer.data[k+n]!==original.data[k+n]))mismatchedPixels++;}
assert.equal(mismatchedPixels,0,'Resting artwork changed');
const results=[];
for(const [name,duration]of Object.entries({idle:4,walk:2.2,attack:2.1})){
 const N=Math.round(duration*60),restSurfaces=shamanSurfaces(rig,pose(rig),name,0,{deform:false});let minAreaRatio=1,frames=0;
 for(let i=0;i<=N;i++){
  const world=pose(rig,name,duration*i/N),surfaces=shamanSurfaces(rig,world,name,duration*i/N);
  for(const [slot,surface]of Object.entries(surfaces)){const att=surface.attachment,pts=surface.pts;assert.ok(pts.every(p=>p.every(Number.isFinite)));
   for(let j=0;j<att.triangles.length;j+=3){const ids=att.triangles.slice(j,j+3),[a,b,c]=ids.map(k=>pts[k]),[u,v,w]=ids.map(k=>restSurfaces[slot].pts[k]),area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),rest=(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]),ratio=area/rest;assert.ok(ratio>.05,`${name} folded ${slot} triangle at ${duration*i/N}`);minAreaRatio=Math.min(minAreaRatio,ratio);}
  }
  frames++;
 }
 results.push({name,frames,minAreaRatio});
}
const report={sourcePixelsChanged:mismatchedPixels,bones:rig.bones.length,meshes:rig.slots.length,results};fs.writeFileSync(new URL('../VERDANT-SHAMAN-MESH-VALIDATION.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
