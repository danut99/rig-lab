import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {inside,segDist,rot,smooth,clamp,deg} from '../../scripts/lib/geom.mjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {skinLeg} from './leg-skin.mjs';
import {dragonBody,dragonFoot,walkReference} from './shaman-dragon-walk.mjs';
import {installWalkLayers} from './shaman-walk-layers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),source=path.join(root,'source/verdant-shaman'),out=path.join(root,'public/models/verdant-shaman');
fs.mkdirSync(out,{recursive:true});
const original=PNG.sync.read(fs.readFileSync(path.join(source,'reference.png'))),W=original.width,H=original.height;
const s=W/1280,point=([x,y])=>[x*s,y*H/1280],poly=p=>p.map(point),world=p=>[p[0]-W/2,H-p[1]],wrap=a=>((a+180)%360+360)%360-180;
// Landmarks measured on the assembled reference. Every texture pixel keeps its original setup position.
const boneSpecs=[['body','root',[650,850],[750,850]],['chest','body',[680,650],[780,650]],['head','chest',[780,530],[880,530]],
 ['tail1','body',[435,920],[275,950]],['tail2','tail1',[275,950],[125,850]],['tail3','tail2',[125,850],[30,800]],
 ['nearLegUpper','body',[510,960],[440,1065]],['nearLegLower','nearLegUpper',[440,1065],[455,1150]],['nearFoot','nearLegLower',[455,1150],[545,1190]],
 ['farLegUpper','body',[835,960],[790,1070]],['farLegLower','farLegUpper',[790,1070],[860,1140]],['farFoot','farLegLower',[860,1140],[935,1180]],
 ['farUpper','chest',[415,655],[445,730]],['farHand','farUpper',[445,730],[570,760]],
 ['nearUpper','chest',[945,650],[980,735]],['nearForearm','nearUpper',[980,735],[1080,690]],['nearHand','nearForearm',[1080,690],[1110,690]],
 ['staff','nearHand',[1080,690],[1080,590]],['poncho','chest',[705,725],[805,725]],['charms','body',[490,855],[490,925]]];
const bones=[{name:'root'}],setup={root:{x:0,y:0,a:1,b:0,c:0,d:1}},indexes={root:0};
for(const [name,parent,a,b]of boneSpecs){const A=world(point(a)),B=world(point(b)),p=setup[parent],pa=deg(Math.atan2(p.c,p.a)),local=rot([A[0]-p.x,A[1]-p.y],-pa),angle=deg(Math.atan2(B[1]-A[1],B[0]-A[0]));indexes[name]=bones.length;bones.push({name,parent,x:local[0],y:local[1],rotation:wrap(angle-pa),length:Math.hypot(B[0]-A[0],B[1]-A[1])});const r=angle*Math.PI/180;setup[name]={x:A[0],y:A[1],a:Math.cos(r),b:-Math.sin(r),c:Math.sin(r),d:Math.cos(r)};}
const polygons={
 head:poly([[355,0],[1060,0],[1060,510],[850,535],[835,587],[710,565],[570,490],[375,455],[350,300]]),
 tail:poly([[0,735],[300,740],[435,835],[440,940],[395,1065],[250,1040],[90,925],[0,860]]),
 nearLeg:poly([[345,970],[405,935],[640,925],[680,1010],[600,1080],[535,1120],[580,1280],[285,1280],[295,1150],[345,1050]]),
 farLeg:poly([[720,1000],[745,925],[930,925],[965,1015],[885,1085],[1005,1130],[1005,1250],[685,1250],[695,1110]]),
 farArm:poly([[355,635],[455,625],[525,680],[650,695],[650,825],[475,835],[365,740]]),
 nearArm:poly([[900,630],[995,610],[1035,585],[1250,585],[1250,900],[940,900],[900,715]]),
 staff:poly([[1090,85],[1280,85],[1280,1250],[975,1250],[975,1130],[990,1000],[1015,900],[1040,800],[1060,750],[1045,600],[1045,540],[1040,430],[1005,345],[1005,285],[1050,250],[1060,180]])
};
const handPoly=poly([[1040,600],[1120,600],[1180,625],[1180,745],[1115,770],[1040,750],[1005,705],[1015,635]]);
const masks={art:new Uint8Array(W*H),staff:new Uint8Array(W*H)};
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!original.data[i*4+3])continue;let staff=inside(polygons.staff,x,y)&&!inside(handPoly,x,y);
 // Trace the overlapping foot/wood boundary by its painted material colors.
 // This keeps the visible trunk whole without moving the ivory toe with the weapon.
 if(staff&&x<1035*s&&y>1080*s){const [r,g,b]=original.data.subarray(i*4,i*4+3);if(g>r*.9||(r>140&&g>r*.72&&b>r*.43))staff=false;}
 if(staff&&x<1050*s&&y>780*s&&y<1080*s){const [r,g,b]=original.data.subarray(i*4,i*4+3);if(b>g||g>r*1.05)staff=false;}
 masks[staff?'staff':'art'][i]=1;
}
const nearest=new Int32Array(W*H).fill(-1),queue=new Int32Array(W*H);let start=0,end=0;
for(let i=0;i<W*H;i++)if(masks.art[i]&&original.data[i*4+3]>20){nearest[i]=i;queue[end++]=i;}
while(start<end){const i=queue[start++],x=i%W;for(const j of [x?i-1:-1,x<W-1?i+1:-1,i-W,i+W])if(j>=0&&j<W*H&&nearest[j]<0){nearest[j]=nearest[i];queue[end++]=j;}}
function combine(...parts){const weights=new Map();for(const [list,k]of parts)for(const [n,v]of list)weights.set(n,(weights.get(n)||0)+v*k);return [...weights].filter(([,v])=>v>1e-8);}
const weightChain=(q,names)=>{const P=world(q),scores=names.map(name=>{const b=setup[name],l=bones[indexes[name]].length;return [name,1/Math.max(24*s,segDist(P,[b.x,b.y],[b.x+b.a*l,b.y+b.c*l]))**3];}),sum=scores.reduce((sum,[,v])=>sum+v,0);return scores.map(([n,v])=>[n,v/sum]);};
function torso(q){const chest=smooth((850*s-q[1])/(220*s));return [['body',1-chest],['chest',chest]];}
function raw(q){
 const [x,y]=q;
 if(inside(polygons.head,x,y)){const k=smooth((600*s-y)/(125*s));return combine([torso(q),1-k],[[['head',1]],k]);}
 if(inside(polygons.tail,x,y)){const k=smooth((440*s-x)/(100*s));return combine([torso(q),1-k],[weightChain(q,['tail1','tail2','tail3']),k]);}
 for(const [side,names]of [['nearLeg',['nearLegUpper','nearLegLower','nearFoot']],['farLeg',['farLegUpper','farLegLower','farFoot']]])if(inside(polygons[side],x,y)){
  const k=smooth((y-940*s)/(95*s)),lower=smooth((y-1020*s)/(130*s)),foot=smooth((y-1085*s)/(100*s));
  return combine([torso(q),1-k],[[[names[0],(1-lower)*(1-foot)],[names[1],lower*(1-foot)],[names[2],foot]],k]);
 }
 if(inside(polygons.nearArm,x,y)){const k=smooth((x-915*s)/(120*s))*smooth((900*s-y)/(145*s)),hand=smooth((x-970*s)/(130*s));return combine([torso(q),1-k],[weightChain(q,['nearUpper','nearForearm']),k*(1-hand)],[[['nearHand',1]],k*hand]);}
 if(inside(polygons.farArm,x,y)){const k=smooth((y-640*s)/(70*s));return combine([torso(q),1-k],[weightChain(q,['farUpper','farHand']),k]);}
 if(y>800*s&&y<960*s&&x<525*s&&x>390*s){const k=.3*smooth((y-810*s)/(55*s));return combine([torso(q),1-k],[[['charms',1]],k]);}
 return torso(q);
}
function field(q){const weights=new Map();for(const dy of [-16,0,16])for(const dx of [-16,0,16]){const x=clamp(Math.round(q[0]+dx*s),0,W-1),y=clamp(Math.round(q[1]+dy*s),0,H-1),i=nearest[y*W+x],k=Math.exp(-(dx*dx+dy*dy)/400);for(const [n,v]of raw([i%W,Math.floor(i/W)]))weights.set(n,(weights.get(n)||0)+k*v);}const sum=[...weights.values()].reduce((a,b)=>a+b,0),kept=[...weights].filter(([,v])=>v/sum>1e-6),total=kept.reduce((a,[,v])=>a+v,0);return kept.map(([n,v])=>[n,v/total]);}
const attachments={},slots=[],regions=[];let totalVertices=0;
for(const layer of ['staff','art']){
 const png=new PNG({width:W,height:H});original.data.copy(png.data);for(let i=0;i<W*H;i++)if(!masks[layer][i])png.data[i*4+3]=0;
 fs.writeFileSync(path.join(out,layer+'.png'),PNG.sync.write(png));
 regions.push(`${layer}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${layer}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 const uvs=[],vertices=[],triangles=[],map=new Map(),grid=14,nx=Math.ceil(W/grid),ny=Math.ceil(H/grid);
 function vertex(i,j){const key=j*(nx+1)+i;if(map.has(key))return map.get(key);const q=[Math.min(i*grid,W),Math.min(j*grid,H)],P=world(q),weights=layer==='staff'?[['staff',1]]:field(q),index=uvs.length/2;map.set(key,index);uvs.push(q[0]/W,q[1]/H);vertices.push(weights.length);for(const[n,k]of weights){const b=setup[n],local=rot([P[0]-b.x,P[1]-b.y],-deg(Math.atan2(b.c,b.a)));vertices.push(indexes[n],local[0],local[1],k);}return index;}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let visible=false;for(let y=j*grid;y<Math.min(H,(j+1)*grid)&&!visible;y++)for(let x=i*grid;x<Math.min(W,(i+1)*grid)&&!visible;x++)if(png.data[(y*W+x)*4+3])visible=true;if(!visible)continue;const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);triangles.push(a,b,c,a,c,d);}
 totalVertices+=uvs.length/2;attachments[layer]={[layer]:{type:'mesh',path:layer,uvs,vertices,triangles,hull:0,width:W,height:H}};slots.push({name:layer,bone:'root',attachment:layer});
}
const rig={skeleton:{spine:'3.8.99',name:'verdant-shaman-reference'},bones,slots,skins:[{name:'default',attachments}],animations:{}};
const durations={idle:4,walk:walkReference.duration,attack:2.1},pulse=(p,a,b)=>p<a||p>b?0:Math.sin(Math.PI*(p-a)/(b-a))**2;
const solePoints={near:[],far:[]};
for(let y=Math.round(1120*s);y<H;y+=3)for(let x=0;x<W;x+=3)if(masks.art[y*W+x]&&original.data[(y*W+x)*4+3]>100){const side=x<650*s?'near':x>710*s&&x<1005*s?'far':null;if(side){const b=setup[side+'Foot'],P=world([x,y]);solePoints[side].push([P[0]-b.x,P[1]-b.y]);}}
const soleFloor=Object.fromEntries(Object.entries(solePoints).map(([side,points])=>[side,Math.min(...points.map(p=>p[1]))]));
for(const [name,duration]of Object.entries(durations)){
 const timelines={},put=(bone,channel,key)=>((timelines[bone]??={})[channel]??=[]).push(key),N=Math.round(duration*60);
 for(let i=0;i<=N;i++){
  const t=i*duration/N,p=i/N,w=p*Math.PI*2,v=Math.sin(w),inhale=(1-Math.cos(w))/2,walking=name==='walk',attacking=name==='attack',wind=pulse(p,.03,.45),hit=pulse(p,.32,.8),gait=walking?dragonBody(p):null;
  put('body','translate',{time:t,x:(attacking?-5*wind+8*hit:walking?gait.x:0)*s,y:(walking?gait.y:attacking?-4*wind+3*hit:3*inhale)*s});
  put('body','rotate',{time:t,angle:attacking?1.5*wind-2*hit:walking?gait.br:.3*v});
  put('chest','translate',{time:t,x:0,y:(attacking?1.8*v:walking?1.8*v:10*inhale)*s});
  put('chest','rotate',{time:t,angle:attacking?1.5*wind-3*hit:walking?gait.ch:.25*v});
  put('head','rotate',{time:t,angle:attacking?-2*wind+3*hit:walking?gait.head:-.8*inhale+.2*v});
  for(let j=1;j<=3;j++)put('tail'+j,'rotate',{time:t,angle:walking?gait.tail/j:(attacking?.6:1.6)*Math.sin(w-j*.4)+(attacking?-2*wind+3*hit:0)});
  put('farUpper','rotate',{time:t,angle:attacking?3*wind-5*hit:walking?gait.farArm:1.2*v});
  put('farHand','rotate',{time:t,angle:attacking?-2*wind+4*hit:walking?-gait.farArm*.4:1.3*Math.sin(w-.3)});
  put('nearUpper','rotate',{time:t,angle:attacking?4*wind-9*hit:walking?gait.nearArm:.7*v});
  put('nearForearm','rotate',{time:t,angle:attacking?4*wind-12*hit:walking?-gait.nearArm*.4:.5*v});
  if(name==='idle'){put('farUpper','translate',{time:t,x:-4*s*inhale,y:0});put('nearUpper','translate',{time:t,x:4*s*inhale,y:0});}
  put('nearHand','rotate',{time:t,angle:attacking?1*wind-2*hit:0});
  put('charms','rotate',{time:t,angle:walking?3.5*Math.sin(w-.6):attacking?-2*wind+4*hit:1.8*Math.sin(w-.5)});
  const current=pose({bones,animations:{frame:{bones:timelines}}},'frame',t);
  for(const [side,phase]of [['near',0],['far',.5]]){
   const upper=side+'LegUpper',lower=side+'LegLower',foot=side+'Foot',hip=current[upper],parent=current.body,rest=setup[foot],q=(p+phase)%1;
   let x=rest.x,y=rest.y,tilt=0;
   if(walking){const step=dragonFoot(side,p);tilt=step.tilt;x+=step.x*s;const minimum=Math.min(...solePoints[side].map(P=>rot(P,tilt)[1]));y+=step.lift*s+soleFloor[side]-minimum;}
   const l1=bones[indexes[upper]].length,l2=bones[indexes[lower]].length,dx=x-hip.x,dy=y-hip.y,d=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.001,l1+l2-.001),restHip=setup[upper],restKnee=setup[lower];
   const bend=Math.sign(wrap(deg(Math.atan2(restKnee.y-restHip.y,restKnee.x-restHip.x))-deg(Math.atan2(rest.y-restHip.y,rest.x-restHip.x))))||1;
   const a=deg(Math.atan2(dy,dx))+bend*deg(Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1))),k=rot([l1,0],a),b=deg(Math.atan2(dy-k[1],dx-k[0]));
   put(upper,'rotate',{time:t,angle:wrap(a-deg(Math.atan2(parent.c,parent.a))-bones[indexes[upper]].rotation)});
   put(lower,'rotate',{time:t,angle:wrap(b-a-bones[indexes[lower]].rotation)});
   put(foot,'rotate',{time:t,angle:wrap(deg(Math.atan2(rest.c,rest.a))+tilt-b-bones[indexes[foot]].rotation)});
  }
 }
 rig.animations[name]={bones:timelines};
}
// Expand the chest surface while preserving the rigid head, staff, limbs and feet.
// Weighted deformation offsets live in each influence bone's setup coordinates.
const artMesh=attachments.art.art,breathOffsets=[];let vi=0;
for(let v=0;v<artMesh.uvs.length/2;v++){
 const q=[artMesh.uvs[v*2]*W,artMesh.uvs[v*2+1]*H],P=world(q),count=artMesh.vertices[vi++],influences=[];let rigid=0;
 for(let j=0;j<count;j++){const index=artMesh.vertices[vi],weight=artMesh.vertices[vi+3],name=bones[index].name;influences.push(index);if(!['body','chest','poncho','charms'].includes(name))rigid+=weight;vi+=4;}
 const envelope=smooth((q[1]-540*s)/(140*s))*smooth((975*s-q[1])/(150*s))*(1-rigid),center=world(point([680,800])),delta=[(P[0]-center[0])*.055*envelope,(P[1]-center[1])*.05*envelope];
 for(const index of influences){const b=setup[bones[index].name],local=rot(delta,-deg(Math.atan2(b.c,b.a)));breathOffsets.push(...local.map(n=>Math.round(n*10000)/10000));}
}
rig.animations.idle.deform={default:{art:{art:[{time:0,curve:.37,c2:0,c3:.63,c4:1},{time:durations.idle/2,vertices:breathOffsets,curve:.37,c2:0,c3:.63,c4:1},{time:durations.idle}]}}};
const accepted=JSON.parse(fs.readFileSync(path.join(source,'accepted-attack.json')));
if(JSON.stringify(accepted.animation)!==JSON.stringify(rig.animations.attack)||JSON.stringify(accepted.bones)!==JSON.stringify(bones)||JSON.stringify(accepted.skins)!==JSON.stringify(rig.skins))throw Error('Accepted attack changed');
const walkingLayers=installWalkLayers({rig,original,masks,polygons,setup,indexes,world,field,s,out,source,durations,regions,solePoints,soleFloor});
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'rig.atlas'),regions.join('\n'));fs.copyFileSync(path.join(source,'reference.png'),path.join(out,'reference.png'));
const rest=meshes({skeleton:{...rig,slots:rig.slots.filter(slot=>['art','staff'].includes(slot.name))},regions:{}},pose(rig));let maxSetupError=0;for(const layer of ['art','staff']){const att=attachments[layer][layer];rest[layer].pts.forEach(([x,y],i)=>{const P=world([att.uvs[i*2]*W,att.uvs[i*2+1]*H]);maxSetupError=Math.max(maxSetupError,Math.hypot(x-P[0],y-P[1]));});}if(maxSetupError>.02)throw Error('Artwork moved in setup: '+maxSetupError);
const catalogPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(catalogPath));
const entry={id:'verdant-shaman',name:'Verdant Shaman',skeleton:'models/verdant-shaman/animated.json',atlas:'models/verdant-shaman/rig.atlas',bounds:{x:-W/2-60,y:-90,width:W+120,height:H+180},reference:{image:'models/verdant-shaman/reference.png',width:W,height:H,origin:[W/2,H]},description:'Original reference artwork, preserved in its exact resting pose.',explanation:'A continuous weighted mesh preserves the painted anatomy. Separate staff follows the gripping hand. Breathing, alternating leg joints and a staff swing move the whole character.',animations:Object.entries(durations).map(([name,duration])=>({name,label:{idle:'Breathing',walk:'Walking',attack:'Staff attack'}[name],duration,loop:name!=='attack'}))};
catalog.models=catalog.models.filter(m=>m.id!==entry.id);catalog.models.push(entry);fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(source,'landmarks.json'),JSON.stringify({boneSpecs,polygons,handPoly},null,2));
fs.writeFileSync(path.join(root,'VERDANT-SHAMAN-SETUP-VALIDATION.json'),JSON.stringify({bones:bones.length,meshes:2,vertices:totalVertices,maxSetupError,source:'e86bacb3-efcf-4384-8a28-ac2f5c94dba7.png'},null,2));
console.log(JSON.stringify({bones:bones.length,walkingLayers,originalVertices:totalVertices,maxSetupError}));
