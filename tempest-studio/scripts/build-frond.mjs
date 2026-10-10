import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {world,deg,rotate,paths,durations,transforms,smooth,origin} from './frond-motion.mjs';
import {skinLeg} from './leg-skin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/models/frondonychus');
fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const image=PNG.sync.read(fs.readFileSync(path.join(root,'source/frondonychus/art.png'))),W=image.width,H=image.height;
const polygons={
 nearArm:[[798,526],[876,554],[867,617],[805,664],[957,701],[1034,814],[1100,1120],[969,1130],[854,1020],[845,850],[770,854],[696,812],[687,727],[711,636],[760,565]],
 farArm:[[1005,529],[1080,600],[1080,659],[1140,669],[1225,709],[1225,1060],[1110,1060],[1040,920],[1050,810],[1020,780],[966,750],[945,660]],
 neck:[[883,477],[958,384],[876,230],[774,204],[770,0],[1225,0],[1225,489],[1056,530],[918,542]],
 nearLeg:[[483,716],[601,790],[643,880],[598,950],[483,1030],[470,1127],[582,1170],[610,1284],[300,1284],[300,1167],[360,1060],[360,980],[416,850]],
 farLeg:[[710,790],[829,825],[808,935],[735,1040],[810,1135],[1000,1190],[1000,1284],[644,1284],[640,1100],[650,999],[678,876]],
 tail:[[0,530],[414,583],[465,627],[479,850],[358,843],[0,878]],
};
const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const bones=[{name:'root'},{name:'body',parent:'root',length:180}],setup={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}},groups={};
function bone(name,parent,a,b){const p=setup[parent],q=rotate([a[0]-p.x,a[1]-p.y],-p.angle),angle=deg([b[0]-a[0],b[1]-a[1]]);bones.push({name,parent,x:q[0],y:q[1],rotation:angle-p.angle,length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],angle};}
for(const side of ['farLeg','nearLeg','farArm','nearArm']){const p=paths[side].map(world),parts=side.endsWith('Leg')?['Upper','Lower','Foot']:['Upper','Lower','Hand'];groups[side]=parts.map((part,i)=>{const n=side+part;bone(n,i?side+parts[i-1]:'body',p[i],p[i+1]);return n;});}
const neck=paths.neck.map(world);groups.neck=neck.slice(0,-1).map((a,i)=>{const n='neck'+(i+1);bone(n,i?'neck'+i:'body',a,neck[i+1]);return n;});bone('head','neck3',neck.at(-1),world(paths.head[1]));groups.neck.push('head');
const tail=paths.tail.map(world);groups.tail=tail.slice(0,-1).map((a,i)=>{const n='tail'+(i+1);bone(n,i?'tail'+i:'body',a,tail[i+1]);return n;});
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-dx*u,p[1]-a[1]-dy*u);};
// A continuous upper-body surface avoids holes when a painted arm
// moves. Every vertex has one shared skin field; no cutout or cloned torso.
const names=['farLegUpper','farLegLower','farLegFoot','nearLegUpper','nearLegLower','nearLegFoot','art'],slots=[],attachments={},layouts={},regions=[],STEP=12;
const owner=(x,y)=>{
 const arm=['nearArm','farArm'].find(n=>inside(polygons[n],x,y));if(arm)return arm;
 if(y>920&&x<1000)return x<620?'nearLeg':'farLeg';
 return ['neck','nearLeg','farLeg','tail'].find(n=>inside(polygons[n],x,y))||'body';
};
const masks=Object.fromEntries(names.map(n=>[n,new Uint8Array(W*H)]));
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!image.data[i*4+3])continue;const side=owner(x,y);
 if(!side.endsWith('Leg')){masks.art[i]=1;continue;}
 const p=paths[side],part=y<p[1][1]?'Upper':y<p[2][1]?'Lower':'Foot';masks[side+part][i]=1;
 for(let joint=1;joint<=2;joint++)if(Math.hypot(x-p[joint][0],y-p[joint][1])<24){masks[side+['Upper','Lower'][joint-1]][i]=1;masks[side+['Lower','Foot'][joint-1]][i]=1;}
}
// Extend skin weights from opaque artwork into its transparent margins.
// Empty space beside a curved claw must not pull it toward the torso.
const closest=new Int32Array(W*H).fill(-1),queue=new Int32Array(W*H);let headIndex=0,tailIndex=0;
for(let i=0;i<W*H;i++)if(masks.art[i]&&image.data[i*4+3]>16){closest[i]=i;queue[tailIndex++]=i;}
while(headIndex<tailIndex){const i=queue[headIndex++],x=i%W,y=Math.floor(i/W);for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&closest[j]<0){closest[j]=closest[i];queue[tailIndex++]=j;}}
function field(x,y){
 x=Math.max(0,Math.min(W-1,Math.round(x)));y=Math.max(0,Math.min(H-1,Math.round(y)));
 const nearest=closest[y*W+x];if(nearest>=0){x=nearest%W;y=Math.floor(nearest/W);}
 const layer=owner(x,y),p=world([x,y]);
 if(layer.endsWith('Leg'))return [['body',1]];
 if(layer.endsWith('Arm')){
  const joint=paths[layer][0],elbow=paths[layer][1],wrist=paths[layer][2],strength=smooth((Math.hypot(x-joint[0],y-joint[1])-20)/175);
  const a=[joint[0]-elbow[0],joint[1]-elbow[1]],b=[wrist[0]-elbow[0],wrist[1]-elbow[1]],la=Math.hypot(...a),lb=Math.hypot(...b),n=[b[0]/lb-a[0]/la,b[1]/lb-a[1]/la],ln=Math.hypot(...n);
  const lower=smooth((((x-elbow[0])*n[0]+(y-elbow[1])*n[1])/ln+55)/110),hand=Math.max(smooth((y-720)/110),smooth((((x-wrist[0])*b[0]+(y-wrist[1])*b[1])/lb+64)/128));
  return [['body',1-strength],[layer+'Upper',strength*(1-hand)*(1-lower)],[layer+'Lower',strength*(1-hand)*lower],[layer+'Hand',strength*hand]];
 }
 if(layer==='body')return [['body',1]];
 const chain=groups[layer],first=setup[chain[0]],strength=smooth((Math.hypot(p[0]-first.x,p[1]-first.y)-45)/140),scores=chain.map(n=>{const b=setup[n],l=bones.find(b=>b.name===n).length,end=rotate([l,0],b.angle);return [n,1/Math.max(25,distance(p,[b.x,b.y],[b.x+end[0],b.y+end[1]]))**3];}),sum=scores.reduce((s,[,w])=>s+w,0);
 const moving=layer==='neck'&&y<190?[['head',1]]:scores.map(([n,w])=>[n,w/sum]);
 return [['body',1-strength],...moving.map(([n,w])=>[n,w*strength])];
}
function influencesAt(x,y){
 const layer=owner(x,y);


 const weights=new Map();
 for(const dy of [-48,-24,0,24,48])for(const dx of [-48,-24,0,24,48]){
  const kernel=Math.exp(-(dx*dx+dy*dy)/(2*32*32));
  for(const [n,w] of field(x+dx,y+dy))weights.set(n,(weights.get(n)||0)+w*kernel);
 }
 const sum=[...weights.values()].reduce((a,b)=>a+b,0);
 const kept=[...weights].map(([n,w])=>[n,w/sum]).filter(([,w])=>w>1e-10),total=kept.reduce((a,[,w])=>a+w,0);return kept.map(([n,w])=>[n,w/total]);
}

function legWeights(side,x,y){
 const knee=paths[side][1][1],ankle=paths[side][2][1],hip=paths[side][0][1],strength=smooth((y-hip+10)/125),lower=smooth((y-knee+46)/92),foot=smooth((y-ankle+24)/48);
 return [...(strength<1?influencesAt(x,y).map(([n,w])=>[n,w*(1-strength)]):[]),[side+'Upper',strength*(1-lower)],[side+'Lower',strength*lower*(1-foot)],[side+'Foot',strength*lower*foot]].filter(([,w])=>w>1e-10);
}
for(const layer of names){
 const png=new PNG({width:W,height:H});for(let i=0;i<W*H;i++){image.data.copy(png.data,i*4,i*4,i*4+4);if(!masks[layer][i])png.data[i*4+3]=0;}fs.writeFileSync(path.join(out,layer+'.png'),PNG.sync.write(png));
 regions.push(`${layer}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${layer}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 const xs=Array.from({length:Math.ceil(W/STEP)+1},(_,i)=>Math.min(W,i*STEP)),ys=Array.from({length:Math.ceil(H/STEP)+1},(_,i)=>Math.min(H,i*STEP)),points=[],uvs=[],triangles=[],weights=[],vertices=[],lookup=new Map(),rigid=layer.endsWith('Foot'),side=layer.startsWith('near')?'nearLeg':'farLeg';
 const add=(ix,iy)=>{const key=ix+','+iy;if(lookup.has(key))return lookup.get(key);const x=xs[ix],y=ys[iy],p=world([x,y]),index=points.length;lookup.set(key,index);points.push(p);uvs.push(x/W,y/H);
  const influences=layer==='art'?influencesAt(x,y):rigid?[[layer,1]]:legWeights(side,x,y);weights.push(influences);
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
const bounds={x:-755,y:-700,width:1510,height:1450},rig={skeleton:{spine:'3.8.99',name:'Frondonychus · Adult',...bounds},bones,slots,skins:[{name:'default',attachments}],animations};
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'bones.json'),JSON.stringify({...rig,slots:[],skins:[{name:'default',attachments:{}}],animations:Object.fromEntries(Object.entries(animations).map(([name,a])=>[name,{bones:a.bones}]))},null,2));
fs.writeFileSync(path.join(out,'rig.atlas'),regions.join('\n'));fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify({setup,bones,layouts,width:W,height:H,paths}));fs.copyFileSync(path.join(root,'source/frondonychus/art.png'),path.join(out,'reference.png'));
const catalogPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(catalogPath));
const entry={id:'frondonychus',name:'Frondonychus · Adult',skeleton:'models/frondonychus/animated.json',atlas:'models/frondonychus/rig.atlas',bounds,reference:{image:'models/frondonychus/reference.png',width:W,height:H,origin},description:'Mers si atac cu ghearele.',explanation:'Mers adaptat dupa Robo Ravager. Atac scurt cu ghearele pe o suprafata continua. Ultimata este amanata.',animations:Object.entries(durations).map(([name,duration],i)=>({name,label:['Repaus','Mers','Lovitură cu ghearele','Asalt cu ghearele'][i],duration,loop:i<2}))};
catalog.models=catalog.models.filter(m=>m.id!==entry.id).concat(entry);fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2));console.log(`Frondonychus: ${bones.length} bones, ${slots.length} layers, ${Object.keys(durations).length} animations`);
