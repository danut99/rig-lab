import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {shamanSurfaces} from './shaman-surfaces.mjs';
const trial=process.env.SHAMAN_OUT,dir=trial?pathToFileURL(trial.replace(/[\\/]*$/,'/')):new URL('../public/models/verdant-shaman/',import.meta.url),rig=JSON.parse(fs.readFileSync(new URL('animated.json',dir))),original=PNG.sync.read(fs.readFileSync(new URL('reference.png',dir))),art=PNG.sync.read(fs.readFileSync(new URL('art.png',dir))),staff=PNG.sync.read(fs.readFileSync(new URL('staff.png',dir)));
// Separate pieces are the slots above the art (walk layers excluded), bottom to top; each has its own full-size page.
const artIndex=rig.slots.findIndex(s=>s.name==='art'),pieceNames=rig.slots.slice(artIndex+1).map(s=>s.name).filter(n=>!n.startsWith('walk-'));
const pieces=pieceNames.map(name=>({name,png:PNG.sync.read(fs.readFileSync(new URL(name+'.png',dir)))}));
assert.equal(rig.bones.find(b=>b.name==='staff').parent,'nearHand');
let mismatchedPixels=0;
for(let i=0;i<original.width*original.height;i++){
 const k=i*4,same=(layer,n)=>layer.data[k+n]===original.data[k+n];assert.ok(!(art.data[k+3]&&staff.data[k+3]),'Overlapping source masks');if(!original.data[k+3])continue;
 // Under a piece the host layer holds the painted-in backing, so the resting composite is checked instead: the topmost
 // piece keeps the source colour, and either covers the pixel fully or sits (soft edge) on a layer that still has it.
 const stack=[...pieces.map(p=>p.png).reverse(),art.data[k+3]?art:staff].filter(layer=>layer.data[k+3]);const top=stack[0],below=stack[1];
 if(top!==art&&top!==staff){if(!([0,1,2].every(n=>same(top,n))&&(top.data[k+3]===original.data[k+3]||(below&&[0,1,2].every(n=>same(below,n))))))mismatchedPixels++;continue;}
 if([0,1,2,3].some(n=>!same(top,n)))mismatchedPixels++;
}
assert.equal(mismatchedPixels,0,'Resting artwork changed');
const results=[];
for(const [name,duration]of Object.entries({idle:4,walk:2.2,attack:2.1})){
 const N=Math.round(duration*60),restSurfaces=shamanSurfaces(rig,pose(rig),name,0,{deform:false});let minAreaRatio=1,frames=0;
 for(let i=0;i<=N;i++){
  const world=pose(rig,name,duration*i/N),surfaces=shamanSurfaces(rig,world,name,duration*i/N);
  for(const [slot,surface]of Object.entries(surfaces)){if(process.argv.includes('--exclude-head')&&pieceNames.includes(slot))continue;if(process.argv.includes('--legs')&&!['walk-nearLeg','walk-farLeg'].includes(slot))continue;const att=surface.attachment,pts=surface.pts;assert.ok(pts.every(p=>p.every(Number.isFinite)));
   for(let j=0;j<att.triangles.length;j+=3){const ids=att.triangles.slice(j,j+3),[a,b,c]=ids.map(k=>pts[k]),[u,v,w]=ids.map(k=>restSurfaces[slot].pts[k]),area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),rest=(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]),ratio=area/rest;assert.ok(ratio>.05,`${name} folded ${slot} triangle at ${duration*i/N}`);minAreaRatio=Math.min(minAreaRatio,ratio);}
  }
  frames++;
 }
 results.push({name,frames,minAreaRatio});
}
const scope=process.argv.includes('--legs')?'legs':process.argv.includes('--exclude-head')?'body':'full';
const report={scope,sourcePixelsChanged:mismatchedPixels,pieces:pieceNames,bones:rig.bones.length,meshes:rig.slots.length,results};if(!trial)fs.writeFileSync(new URL(`../VERDANT-SHAMAN-${scope==='full'?'MESH':scope.toUpperCase()}-VALIDATION.json`,import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
