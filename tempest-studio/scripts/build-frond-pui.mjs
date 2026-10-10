import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {world,deg,rotate,paths,durations,transforms,smooth,origin,legNames} from './frond-pui-motion.mjs';
import {skinLeg} from './leg-skin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/models/frondonychus-pui');
fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const image=PNG.sync.read(fs.readFileSync(path.join(root,'source/frondonychus-pui/art.png'))),W=image.width,H=image.height;
const polygons={"nearLeg": [[519, 690], [647, 701], [707, 827], [680, 910], [557, 1033], [545, 1124], [703, 1174], [713, 1280], [381, 1280], [379, 1090], [426, 977], [459, 888]], "farLeg": [[742, 876], [860, 877], [904, 938], [858, 1016], [895, 1091], [1058, 1148], [1067, 1256], [784, 1256], [731, 1158], [703, 1050], [729, 966]], "nearArm": [[771, 600], [916, 614], [951, 663], [902, 729], [967, 750], [1069, 789], [1080, 1030], [967, 1080], [934, 941], [817, 843], [742, 791], [745, 723]], "farArm": [[1001, 684], [1125, 689], [1202, 731], [1230, 867], [1240, 1024], [1100, 1024], [1084, 871], [1000, 791]], "head": [[934, 666], [901, 486], [819, 364], [706, 230], [725, 0], [1227, 0], [1227, 430], [1097, 449], [1110, 724]], "tail": [[0, 589], [250, 594], [390, 651], [525, 672], [546, 851], [347, 891], [0, 893]]};
const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const bones=[{name:'root'},{name:'body',parent:'root',length:180}],setup={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}},groups={};
function bone(name,parent,a,b){const p=setup[parent],q=rotate([a[0]-p.x,a[1]-p.y],-p.angle),angle=deg([b[0]-a[0],b[1]-a[1]]);bones.push({name,parent,x:q[0],y:q[1],rotation:angle-p.angle,length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],angle};}
for(const side of ['nearArm','farArm']){const p=paths[side].map(world),parts=['Upper','Lower','Hand'];groups[side]=parts.map((part,i)=>{const n=side+part;bone(n,i?side+parts[i-1]:'body',p[i],p[i+1]);return n;});}
for(const side of legNames){const p=paths[side].map(world),parts=['Upper','Lower','Foot'];groups[side]=parts.map((part,i)=>{const n=side+part;bone(n,i?side+parts[i-1]:'body',p[i],p[i+1]);return n;});}
const neck=paths.neck.map(world);groups.neck=neck.slice(0,-1).map((a,i)=>{const n='neck'+(i+1);bone(n,i?'neck'+i:'body',a,neck[i+1]);return n;});bone('head','neck'+(neck.length-1),neck.at(-1),world(paths.head[1]));groups.neck.push('head');
const tail=paths.tail.map(world);groups.tail=tail.slice(0,-1).map((a,i)=>{const n='tail'+(i+1);bone(n,i?'tail'+i:'body',a,tail[i+1]);return n;});
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-dx*u,p[1]-a[1]-dy*u);};
// A continuous upper-body surface avoids holes when a painted arm
// moves. Every vertex has one shared skin field; no cutout or cloned torso.
const names=[...['farLeg','nearLeg'].flatMap(side=>['Upper','Lower','Foot'].map(part=>side+part)),'art'],slots=[],attachments={},layouts={},regions=[],STEP=12;
const owner=(x,y)=>['nearLeg','farLeg'].find(n=>inside(polygons[n],x,y))||(inside(polygons.head,x,y)?'head':inside(polygons.tail,x,y)?'tail':'body');
const masks=Object.fromEntries(names.map(n=>[n,new Uint8Array(W*H)]));
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!image.data[i*4+3])continue;const side=owner(x,y);
 if(!legNames.includes(side)){masks.art[i]=1;continue;}
 const p=paths[side],part=y<p[1][1]?'Upper':y<p[2][1]?'Lower':'Foot';masks[side+part][i]=1;
 for(let joint=1;joint<=2;joint++)if(Math.hypot(x-p[joint][0],y-p[joint][1])<24){masks[side+['Upper','Lower'][joint-1]][i]=1;masks[side+['Lower','Foot'][joint-1]][i]=1;}
}
// Extend skin weights from opaque artwork into its transparent margins.
// Empty space beside a curved claw must not pull it toward the torso.
const closest=new Int32Array(W*H).fill(-1),queue=new Int32Array(W*H);let headIndex=0,tailIndex=0;
for(let i=0;i<W*H;i++)if(image.data[i*4+3]>16){closest[i]=i;queue[tailIndex++]=i;}
while(headIndex<tailIndex){const i=queue[headIndex++],x=i%W,y=Math.floor(i/W);for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&closest[j]<0){closest[j]=closest[i];queue[tailIndex++]=j;}}
function torsoField(x,y){
 x=Math.max(0,Math.min(W-1,Math.round(x)));y=Math.max(0,Math.min(H-1,Math.round(y)));
 const nearest=closest[y*W+x];if(nearest>=0){x=nearest%W;y=Math.floor(nearest/W);}
 const p=world([x,y]);
 const arm=['nearArm','farArm'].find(n=>inside(polygons[n],x,y));
 if(arm){
  const hip=paths[arm][0],elbow=paths[arm][1],wrist=paths[arm][2],strength=smooth((Math.hypot(x-hip[0],y-hip[1])-10)/90),lower=smooth((Math.hypot(x-hip[0],y-hip[1])-Math.hypot(elbow[0]-hip[0],elbow[1]-hip[1])+35)/70),hand=smooth((y-wrist[1]+20)/40);
  return [['body',1-strength],[arm+'Upper',strength*(1-lower)*(1-hand)],[arm+'Lower',strength*lower*(1-hand)],[arm+'Hand',strength*hand]];
 }
 if(inside(polygons.head,x,y)){
  if(y<345 && x>760)return [['head',1]];
  const strength=smooth((Math.hypot(x-paths.neck[0][0],y-paths.neck[0][1])-25)/150),chain=groups.neck;
  const scores=chain.map(n=>{const b=setup[n],l=bones.find(b=>b.name===n).length,end=rotate([l,0],b.angle);return [n,1/Math.max(25,distance(p,[b.x,b.y],[b.x+end[0],b.y+end[1]]))**3];}),sum=scores.reduce((a,[,w])=>a+w,0);
  return [['body',1-strength],...scores.map(([n,w])=>[n,w/sum*strength])];
 }
 if(!inside(polygons.tail,x,y))return [['body',1]];
 const chain=groups.tail,first=setup[chain[0]],strength=smooth((Math.hypot(p[0]-first.x,p[1]-first.y)-30)/125),scores=chain.map(n=>{const b=setup[n],l=bones.find(b=>b.name===n).length,end=rotate([l,0],b.angle);return [n,1/Math.max(25,distance(p,[b.x,b.y],[b.x+end[0],b.y+end[1]]))**3];}),sum=scores.reduce((s,[,w])=>s+w,0);
 return [['body',1-strength],...scores.map(([n,w])=>[n,w/sum*strength])];
}

function rawField(x,y){
 x=Math.max(0,Math.min(W-1,Math.round(x)));y=Math.max(0,Math.min(H-1,Math.round(y)));
 const nearest=closest[y*W+x];if(nearest>=0){x=nearest%W;y=Math.floor(nearest/W);}
 const side=owner(x,y);return legNames.includes(side)?legWeights(side,x,y):torsoField(x,y);
}
function influencesAt(x,y){
 const weights=new Map();
 for(const dy of [-32,-16,0,16,32])for(const dx of [-32,-16,0,16,32]){
  const kernel=Math.exp(-(dx*dx+dy*dy)/(2*24*24));
  for(const [n,w] of rawField(x+dx,y+dy))weights.set(n,(weights.get(n)||0)+w*kernel);
 }
 const sum=[...weights.values()].reduce((a,b)=>a+b,0),kept=[...weights].map(([n,w])=>[n,w/sum]).filter(([,w])=>w>1e-10),total=kept.reduce((a,[,w])=>a+w,0);
 return kept.map(([n,w])=>[n,w/total]);
}
function legWeights(side,x,y){
 const knee=paths[side][1][1],ankle=paths[side][2][1],hip=paths[side][0][1],strength=smooth((y-hip+10)/180),hinge=side==='nearLeg'?80:60,lower=smooth((y-knee+hinge)/(hinge*2)),foot=Math.max(smooth((y-ankle+24)/48),smooth((((x-paths[side][2][0])*(paths[side][3][0]-paths[side][2][0])+(y-ankle)*(paths[side][3][1]-ankle))/Math.hypot(paths[side][3][0]-paths[side][2][0],paths[side][3][1]-ankle)+24)/48));
 return [...(strength<1?torsoField(x,y).map(([n,w])=>[n,w*(1-strength)]):[]),[side+'Upper',strength*(1-lower)*(1-foot)],[side+'Lower',strength*lower*(1-foot)],[side+'Foot',strength*foot]].filter(([,w])=>w>1e-10);
}
// One-pixel source overlap removes filtering seams. Shared vertex weights
// and deform keys keep the joint cap and both adjoining textures welded.
for(const layer of names){const source=masks[layer].slice();for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(source[i]||!image.data[i*4+3])continue;if(source[i-1]||source[i+1]||source[i-W]||source[i+W])masks[layer][i]=1;}}
for(const layer of names){
 const png=new PNG({width:W,height:H});for(let i=0;i<W*H;i++){image.data.copy(png.data,i*4,i*4,i*4+4);if(!masks[layer][i])png.data[i*4+3]=0;}fs.writeFileSync(path.join(out,layer+'.png'),PNG.sync.write(png));
 regions.push(`${layer}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${layer}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 const xs=Array.from({length:Math.ceil(W/STEP)+1},(_,i)=>Math.min(W,i*STEP)),ys=Array.from({length:Math.ceil(H/STEP)+1},(_,i)=>Math.min(H,i*STEP)),points=[],uvs=[],triangles=[],weights=[],vertices=[],lookup=new Map(),rigid=false,side=legNames.find(n=>layer.startsWith(n));
 const add=(ix,iy)=>{const key=ix+','+iy;if(lookup.has(key))return lookup.get(key);const x=xs[ix],y=ys[iy],p=world([x,y]),index=points.length;lookup.set(key,index);points.push(p);uvs.push(x/W,y/H);
  const influences=influencesAt(x,y);weights.push(influences);
  vertices.push(influences.length);for(const [n,w] of influences){const b=setup[n],q=rotate([p[0]-b.x,p[1]-b.y],-b.angle);vertices.push(bones.findIndex(b=>b.name===n),...q,w);}return index;
 };
 for(let iy=0;iy<ys.length-1;iy++)for(let ix=0;ix<xs.length-1;ix++){
  let used=false;for(let y=ys[iy];y<ys[iy+1]&&!used;y++)for(let x=xs[ix];x<xs[ix+1];x++)if(masks[layer][y*W+x]&&image.data[(y*W+x)*4+3]>16){used=true;break;}
  if(!used)continue;const a=add(ix,iy),b=add(ix+1,iy),c=add(ix+1,iy+1),d=add(ix,iy+1);triangles.push(a,c,b,a,d,c);
 }
 slots.push({name:layer,bone:'body',attachment:layer});attachments[layer]={[layer]:{type:'mesh',path:layer,vertices:rigid?vertices:points.flat(),uvs,triangles,hull:0,width:W,height:H}};
 layouts[layer]={points,weights,triangles,rigidPiece:rigid,rigidBlend:!rigid,preserveStrips:false};
}
const animations={};
for(const [name,duration] of Object.entries(durations)){
 const softParts=names.filter(n=>layouts[n].rigidBlend),deform={default:Object.fromEntries(softParts.map(n=>[n,{[n]:[]}]))},tracks=Object.fromEntries(bones.filter(b=>b.name!=='root').map(b=>[b.name,{translate:[],rotate:[]}]))
 for(let frame=0;frame<=Math.round(duration*60);frame++){
  const time=Math.min(duration,frame/60),state=transforms(bones,name,time),p=state.pose;
  for(const layer of softParts){const mesh=layouts[layer],points=skinLeg(mesh,setup,state.bones);deform.default[layer][layer].push({time,vertices:points.flatMap((point,i)=>point.map((v,k)=>Math.round((v-mesh.points[i][k])*1000)/1000))});}
  tracks.body.translate.push({time,x:p.x,y:p.y});tracks.body.rotate.push({time,angle:p.rotation});
  for(const b of bones){if(['root','body'].includes(b.name))continue;const current=state.bones[b.name],parent=state.bones[b.parent],local=rotate([current.x-parent.x,current.y-parent.y],-parent.angle);tracks[b.name].translate.push({time,x:local[0]-b.x,y:local[1]-b.y});tracks[b.name].rotate.push({time,angle:current.angle-parent.angle-b.rotation});}
 }
 animations[name]={bones:tracks,deform};
}
const bounds={x:-origin[0]-180,y:origin[1]-H-180,width:W+360,height:H+360},rig={skeleton:{spine:'3.8.99',name:'Frondonychus - Copil',...bounds},bones,slots,skins:[{name:'default',attachments}],animations};
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'bones.json'),JSON.stringify({...rig,slots:[],skins:[{name:'default',attachments:{}}],animations:Object.fromEntries(Object.entries(animations).map(([name,a])=>[name,{bones:a.bones}]))},null,2));
fs.writeFileSync(path.join(out,'rig.atlas'),regions.join('\n'));fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify({setup,bones,layouts,width:W,height:H,paths}));fs.copyFileSync(path.join(root,'source/frondonychus-pui/art.png'),path.join(out,'reference.png'));
const catalogPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(catalogPath));
const entry={id:'frondonychus-pui',baseSpecies:'frondonychus',stage:'pui',stageLabel:'Copil',name:'Frondonychus - Copil',skeleton:'models/frondonychus-pui/animated.json',atlas:'models/frondonychus-pui/rig.atlas',bounds,reference:{image:'models/frondonychus-pui/reference.png',width:W,height:H,origin},description:'Mers de raptor. Atac rapid.',explanation:'Mers biped inspirat de Robo Ravager. Atac cu pregatire joasa, impuls inainte si revenire. Ghearele raman coerente; fara efecte vizuale.',animations:Object.entries(durations).map(([name,duration],i)=>({name,label:['Repaus','Mers','Atac rapid'][i],duration,loop:i<2}))};
catalog.models=catalog.models.filter(m=>m.id!==entry.id).concat(entry);fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2));console.log(`Frondonychus: ${bones.length} bones, ${slots.length} layers, ${Object.keys(durations).length} animations`);
