import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {meshes,pose} from '../../scripts/lib/spine.mjs';
import {readPNG} from '../../scripts/lib/png.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.json'),'utf8'));
const reports=[];
const area=(pts,a,b,c)=>(pts[b*2]-pts[a*2])*(pts[c*2+1]-pts[a*2+1])-(pts[b*2+1]-pts[a*2+1])*(pts[c*2]-pts[a*2]);
for(const model of catalog.models.filter(model=>model.legendary)){
 const skeleton=JSON.parse(fs.readFileSync(path.join(root,'public',model.skeleton),'utf8'));
 const rig={skeleton:{...skeleton,slots:skeleton.slots.filter(slot=>slot.name==='art')},regions:{}};
 const attachment=skeleton.skins[0].attachments.art.art,rest=meshes(rig,pose(skeleton)).art.pts.flat();
 const art=readPNG(path.join(root,'public/models',model.id,'art.png'));
 const visible=[];for(let k=0;k<attachment.triangles.length;k+=3){const ids=attachment.triangles.slice(k,k+3);visible.push([[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]].some(weights=>{const x=Math.min(art.width-1,Math.floor(ids.reduce((sum,id,i)=>sum+attachment.uvs[id*2]*art.width*weights[i],0))),y=Math.min(art.height-1,Math.floor(ids.reduce((sum,id,i)=>sum+attachment.uvs[id*2+1]*art.height*weights[i],0)));return art.data[(y*art.width+x)*4+3]>32;}));}
 const errors=[];let frames=0,flipped=0,emptyFlipped=0,minAreaRatio=Infinity,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,worst;
 const verts=attachment.vertices;for(let i=0;i<verts.length;){const count=verts[i++];let sum=0;for(let k=0;k<count;k++){const bone=verts[i];if(!skeleton.bones[bone])errors.push('Unknown weight bone');sum+=verts[i+3];i+=4;}if(Math.abs(sum-1)>1e-7)errors.push('Unnormalized weights');}
 for(const animation of model.animations){
  const keys=skeleton.animations[animation.name].slots.fx.attachment;
  if(['attack','ultimate'].includes(animation.name)&&!keys.some(key=>key.name))errors.push('Missing attack FX');
  if(['idle','walk'].includes(animation.name)&&keys.some(key=>key.name))errors.push('FX leaks into locomotion');
  for(let i=0;i<=Math.ceil(animation.duration*60);i++){
   const t=Math.min(animation.duration,i/60),pts=meshes(rig,pose(skeleton,animation.name,t)).art.pts.flat();frames++;
   if(pts.some(value=>!Number.isFinite(value)))errors.push('Non-finite mesh');
   for(let k=0;k<pts.length;k+=2){minX=Math.min(minX,pts[k]);maxX=Math.max(maxX,pts[k]);minY=Math.min(minY,pts[k+1]);maxY=Math.max(maxY,pts[k+1]);}
   for(let k=0;k<attachment.triangles.length;k+=3){const [a,b,c]=attachment.triangles.slice(k,k+3),initial=area(rest,a,b,c);if(Math.abs(initial)<1e-7)continue;const ratio=area(pts,a,b,c)/initial;if(!visible[k/3]){if(ratio<=0)emptyFlipped++;continue;}if(ratio<minAreaRatio){minAreaRatio=ratio;worst={animation:animation.name,time:t,pixel:[(attachment.uvs[a*2]+attachment.uvs[b*2]+attachment.uvs[c*2])*art.width/3,(attachment.uvs[a*2+1]+attachment.uvs[b*2+1]+attachment.uvs[c*2+1])*art.height/3]};}if(ratio<=0)flipped++;}
  }
  if(animation.loop){const first=meshes(rig,pose(skeleton,animation.name,0)).art.pts.flat(),last=meshes(rig,pose(skeleton,animation.name,animation.duration)).art.pts.flat();const gap=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));if(gap>1e-6)errors.push(`Loop mismatch ${animation.name}: ${gap}`);}
 }
 if(flipped)errors.push(`Flipped triangles: ${flipped}`);
 const report={id:model.id,bones:skeleton.bones.length,frames,flipped,emptyFlipped,minAreaRatio,worst,bounds:{minX,minY,maxX,maxY},errors:[...new Set(errors)],ok:errors.length===0};reports.push(report);console.log(JSON.stringify(report));
}
fs.writeFileSync(path.join(root,'LEGENDS-RIG-VALIDATION.json'),JSON.stringify(reports,null,2));
if(reports.length!==6||reports.some(report=>!report.ok))process.exitCode=1;
