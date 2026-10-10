import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {SPECIES} from '../source/landmarks.mjs';
import {world,degrees,wingPaths,pose,wingTransforms,durations} from './motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const out=path.join(root,'public/model');fs.mkdirSync(out,{recursive:true});
const image=PNG.sync.read(fs.readFileSync(path.join(root,'source/art.png'))), {width:W,height:H}=image;
const anatomy=SPECIES.tempestopteryx;
const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const masks={farWing:new Uint8Array(W*H),nearWing:new Uint8Array(W*H),body:new Uint8Array(W*H)};
const neckCover=[[1090,395],[1205,395],[1175,430],[1138,475],[1105,515],[1075,550],[1048,580],[1010,620],[975,650],[945,600],[990,525],[1040,455]];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!image.data[i*4+3])continue;
 const layer=inside(anatomy.artLayers.body,x+.5,y+.5)||inside(neckCover,x+.5,y+.5)?'body':inside(anatomy.artLayers.nearWing,x+.5,y+.5)?'nearWing':'farWing';masks[layer][i]=1;
}
// Pin the painted seam itself, not only the shoulder landmark. This keeps
// every cut edge continuous even where the membrane attaches to the belly.
const bodyDistance=new Float32Array(W*H);for(let i=0;i<W*H;i++)bodyDistance[i]=masks.body[i]&&image.data[i*4+3]>96?0:1e6;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;let d=bodyDistance[i];if(x)d=Math.min(d,bodyDistance[i-1]+1);if(y)d=Math.min(d,bodyDistance[i-W]+1);if(x&&y)d=Math.min(d,bodyDistance[i-W-1]+Math.SQRT2);if(x<W-1&&y)d=Math.min(d,bodyDistance[i-W+1]+Math.SQRT2);bodyDistance[i]=d;}
for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;let d=bodyDistance[i];if(x<W-1)d=Math.min(d,bodyDistance[i+1]+1);if(y<H-1)d=Math.min(d,bodyDistance[i+W]+1);if(x<W-1&&y<H-1)d=Math.min(d,bodyDistance[i+W+1]+Math.SQRT2);if(x&&y<H-1)d=Math.min(d,bodyDistance[i+W-1]+Math.SQRT2);bodyDistance[i]=d;}
const bones=[{name:'root'},{name:'body',parent:'root',length:130}], setup={root:{x:0,y:0,rotation:0},body:{x:0,y:0,rotation:0}};
function bone(name,parent,a,b){
 const p=setup[parent], angle=degrees([b[0]-a[0],b[1]-a[1]]),rad=-p.rotation*Math.PI/180;
 const dx=a[0]-p.x,dy=a[1]-p.y;
 bones.push({name,parent,x:Math.cos(rad)*dx-Math.sin(rad)*dy,y:Math.sin(rad)*dx+Math.cos(rad)*dy,rotation:angle-p.rotation,length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],rotation:angle};
}
const wingNames={};
for(const [side,points] of Object.entries(wingPaths)){
 const pts=points.map(world);wingNames[side]=['Upper','Fore','Hand'].map((part,i)=>{const name=side+part;bone(name,'body',pts[i],pts[i+1]);return name;});
}
// Static neck chain holds its shape in flight; the whole torso pitches
// during a dive, rather than bending each painted neck segment separately.
const neck=[[972,588],[1010,538],[1054,480],[1098,428]].map(world);
neck.slice(0,-1).forEach((a,i)=>bone('neck'+(i+1),i?'neck'+i:'body',a,neck[i+1]));
bone('head','neck3',neck[3],world([1520,424]));
const tail=anatomy.tail.map(world);tail.slice(0,-1).forEach((a,i)=>bone('tail'+(i+1),i?'tail'+i:'body',a,tail[i+1]));
for(const [side,leg] of [['near',anatomy.hind],['far',anatomy.farHind]]){
 const p=['hip','knee','ankle','toe'].map(k=>world(leg[k]));['Thigh','Shin','Foot'].forEach((part,i)=>bone(side+part,i?side+['Thigh','Shin','Foot'][i-1]:'body',p[i],p[i+1]));
}
const slots=[],attachments={},layouts={},STEP=12;
const seg=(q,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.min(1,Math.max(0,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t);};
const regions=[];
for(const layer of ['farWing','nearWing','body']){
 const png=new PNG({width:W,height:H});for(let i=0;i<W*H;i++)if(masks[layer][i])image.data.copy(png.data,i*4,i*4,i*4+4);
 fs.writeFileSync(path.join(out,layer+'.png'),PNG.sync.write(png));
 regions.push(`${layer}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${layer}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 const xs=Array.from({length:Math.ceil(W/STEP)+1},(_,i)=>Math.min(W,i*STEP)),ys=Array.from({length:Math.ceil(H/STEP)+1},(_,i)=>Math.min(H,i*STEP));
 const vertices=[],uvs=[],triangles=[],points=[],weights=[],lookup=new Map();
 const add=(ix,iy)=>{const key=ix+','+iy;if(lookup.has(key))return lookup.get(key);const x=xs[ix],y=ys[iy],q=world([x,y]);const index=points.length;lookup.set(key,index);points.push(q);uvs.push(x/W,y/H);
  let influences=[['body',1]];
  if(layer==='body'&&x<700&&y>680){
   const distances=tail.slice(0,-1).map((a,i)=>['tail'+(i+1),seg(q,a,tail[i+1])]);
   const distance=Math.min(...distances.map(([,d])=>d));
   const feather=Math.min(1,Math.max(0,(52-distance)/30));
   const reach=Math.min(1,Math.max(0,(700-x)/160));
   const strength=feather*feather*(3-2*feather)*reach*reach*(3-2*reach);
   const scores=distances.map(([name,d])=>[name,1/Math.max(12,d)**3]),total=scores.reduce((s,[,w])=>s+w,0);
   influences=[['body',1-strength],...scores.map(([name,w])=>[name,w/total*strength])].filter(([,w])=>w>.00001);
  }
  if(layer!=='body'){
   const p=wingPaths[layer].map(world),ds=wingNames[layer].map((name,i)=>[name,seg(q,p[i],p[i+1])]);
   const anchorDistance=seg(q,p[0],world(layer==='farWing'?[748,690]:[950,700]));
   const seamDistance=bodyDistance[Math.min(H-1,Math.round(y))*W+Math.min(W-1,Math.round(x))];
   const seam=Math.min(1,Math.max(0,(seamDistance-20)/100));
   const strength=Math.min(1,Math.max(0,(anchorDistance-35)/140))*seam*seam*(3-2*seam);
   const scores=ds.map(([name,d])=>[name,1/Math.max(18,d)**3]);const total=scores.reduce((s,[,v])=>s+v,0);
   influences=[['body',1-strength],...scores.map(([name,v])=>[name,v/total*strength])].filter(([,v])=>v>.00001);
  }
  const total=influences.reduce((s,[,v])=>s+v,0);influences=influences.map(([name,v])=>[name,v/total]);weights.push(influences);
  vertices.push(influences.length);for(const [name,w] of influences){const b=setup[name],rad=-b.rotation*Math.PI/180,dx=q[0]-b.x,dy=q[1]-b.y;vertices.push(bones.findIndex(b=>b.name===name),Math.cos(rad)*dx-Math.sin(rad)*dy,Math.sin(rad)*dx+Math.cos(rad)*dy,w);}return index;
 };
 for(let iy=0;iy<ys.length-1;iy++)for(let ix=0;ix<xs.length-1;ix++){
  let occupied=false;for(let y=ys[iy];y<ys[iy+1]&&!occupied;y++)for(let x=xs[ix];x<xs[ix+1];x++)if(masks[layer][y*W+x]){occupied=true;break;}
  if(!occupied)continue;const a=add(ix,iy),b=add(ix+1,iy),c=add(ix+1,iy+1),d=add(ix,iy+1);triangles.push(a,c,b,a,d,c);
 }
 slots.push({name:layer,bone:'body',attachment:layer});attachments[layer]={[layer]:{type:'mesh',path:layer,vertices,uvs,triangles,hull:0,width:W,height:H}};layouts[layer]={points,weights,triangles};
}
const animations={};
for(const [name,duration] of Object.entries(durations)){
 const tracks={body:{translate:[],rotate:[]}};
 for(const names of Object.values(wingNames))for(const n of names)tracks[n]={translate:[],rotate:[],scale:[]};
 for(let i=0;i<4;i++)tracks['tail'+(i+1)]={rotate:[]};
 for(const b of bones)if(!tracks[b.name])tracks[b.name]={rotate:[{time:0,angle:0},{time:duration,angle:0}]};
 for(let i=0;i<=Math.round(duration*60);i++){
  const time=Math.min(duration,i/60),p=pose(name,time);tracks.body.translate.push({time,x:p.x,y:p.y});tracks.body.rotate.push({time,angle:p.rotation});
  p.tail.forEach((angle,i)=>tracks['tail'+(i+1)].rotate.push({time,angle}));
  for(const side of Object.keys(wingPaths)){
   const transforms=wingTransforms(p.wings[side],wingPaths[side].map(world));
   transforms.forEach((t,j)=>{const n=wingNames[side][j],b=setup[n];tracks[n].translate.push({time,x:t.x-b.x,y:t.y-b.y});tracks[n].rotate.push({time,angle:t.angle-b.rotation});tracks[n].scale.push({time,x:t.scaleX,y:1});});
  }
 }
 animations[name]={bones:tracks};
}
const skeleton={skeleton:{spine:'3.8.99',name:'Tempestopteryx · studio',x:-900,y:-500,width:1700,height:1250},bones,slots,skins:[{name:'default',attachments}],animations};
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(skeleton));
fs.writeFileSync(path.join(out,'bones.json'),JSON.stringify({...skeleton,slots:[],skins:[{name:'default',attachments:{}}]},null,2));
fs.writeFileSync(path.join(out,'rig.atlas'),regions.join('\n'));
fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify({setup,layouts,bones,wingPaths,width:W,height:H}));
fs.copyFileSync(path.join(root,'source/art.png'),path.join(out,'reference.png'));
const catalogPath=path.join(root,'public/manifest.json');const otherModels=fs.existsSync(catalogPath)?JSON.parse(fs.readFileSync(catalogPath)).models.filter(m=>m.id!=='tempestopteryx'):[];
fs.writeFileSync(catalogPath,JSON.stringify({models:[{id:'tempestopteryx',name:'Tempestopteryx · Adult',description:'Zbor cu b?t?i ?i planaj.',explanation:'Picajul include preg?tire ?i fr?nare. Asaltul aerian combin? urcarea, virajul ?i plonjarea.',skeleton:'model/animated.json',atlas:'model/rig.atlas',bounds:{x:-970,y:-480,width:1810,height:1410},animations:Object.entries(durations).map(([name,duration],i)=>({name,label:['Plutire','Zbor','Picaj','Asalt aerian'][i],duration,loop:i<2}))},...otherModels]}));
console.log(`Built ${bones.length} bones, 3 reference layers, 4 animations.`);
