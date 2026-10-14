import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {inside,rot,smooth,deg,clamp} from '../../scripts/lib/geom.mjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {skinLeg} from './leg-skin.mjs';
import {dragonFoot} from './shaman-dragon-walk.mjs';
export function installWalkLayers({rig,original,masks,polygons,setup,indexes,world,field,s,out,source,durations,regions,solePoints,soleFloor}){
 const W=original.width,H=original.height,backing=PNG.sync.read(fs.readFileSync(path.join(source,'hidden-torso.png'))),boneNames=rig.bones.map(b=>b.name),legMask={near:new Uint8Array(W*H),far:new Uint8Array(W*H)};
 const chains={near:[[510,970],[420,1100],[455,1150],[545,1190]],far:[[835,960],[800,1080],[860,1140],[935,1180]]},walkBones={};
 const wrap=a=>((a+180)%360+360)%360-180;
 for(const side of ['near','far']){walkBones[side]=[];const points=chains[side].map(p=>world(p.map(v=>v*s)));for(let i=0;i<3;i++){const name='walk'+side+['Upper','Lower','Foot'][i],parent=i?walkBones[side][i-1]:'body',a=points[i],b=points[i+1],p=setup[parent],pa=deg(Math.atan2(p.c,p.a)),local=rot([a[0]-p.x,a[1]-p.y],-pa),angle=deg(Math.atan2(b[1]-a[1],b[0]-a[0])),r=angle*Math.PI/180;indexes[name]=rig.bones.length;rig.bones.push({name,parent,x:local[0],y:local[1],rotation:wrap(angle-pa),length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],a:Math.cos(r),b:-Math.sin(r),c:Math.sin(r),d:Math.cos(r)};walkBones[side].push(name);rig.animations.walk.bones[name]={rotate:[]};}}
 const frames=Math.round(durations.walk*60);
 for(let i=0;i<=frames;i++){const t=i*durations.walk/frames,p=i/frames,current=pose(rig,'walk',t);for(const side of ['near','far']){const [upper,lower,foot]=walkBones[side],hip=current[upper],rest=setup[side+'Foot'],step=dragonFoot(side,p),tilt=step.tilt,minimum=Math.min(...solePoints[side].map(P=>rot(P,tilt)[1])),x=rest.x+step.x*s,y=rest.y+step.lift*s+soleFloor[side]-minimum,l1=rig.bones[indexes[upper]].length,l2=rig.bones[indexes[lower]].length,dx=x-hip.x,dy=y-hip.y,d=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.001,l1+l2-.001),rHip=setup[upper],rKnee=setup[lower],rFoot=setup[foot],bend=Math.sign(wrap(deg(Math.atan2(rKnee.y-rHip.y,rKnee.x-rHip.x))-deg(Math.atan2(rFoot.y-rHip.y,rFoot.x-rHip.x))))||1,a=deg(Math.atan2(dy,dx))+bend*deg(Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1))),k=rot([l1,0],a),b=deg(Math.atan2(dy-k[1],dx-k[0])),parent=current.body;for(const [name,angle]of [[upper,wrap(a-deg(Math.atan2(parent.c,parent.a))-rig.bones[indexes[upper]].rotation)],[lower,wrap(b-a-rig.bones[indexes[lower]].rotation)],[foot,wrap(deg(Math.atan2(rFoot.c,rFoot.a))+tilt-b-rig.bones[indexes[foot]].rotation)]])rig.animations.walk.bones[name].rotate.push({time:t,angle});}}
 const actual=p=>p.map(([x,y])=>[x*W/1254,y*H/1254]);
 const contours={near:actual([[430,935],[470,940],[500,920],[620,915],[645,970],[640,1005],[615,1035],[578,1058],[545,1074],[539,1100],[565,1120],[590,1160],[605,1210],[570,1250],[340,1250],[296,1210],[298,1160],[318,1115],[340,1080],[355,1050],[370,1025],[370,992],[382,968],[405,945]]),far:actual([[795,910],[920,925],[963,963],[955,1007],[930,1035],[890,1055],[865,1075],[870,1095],[912,1108],[957,1123],[992,1150],[1008,1220],[810,1228],[715,1205],[708,1160],[707,1105],[725,1080],[752,1050],[738,1020],[718,995],[742,948]])};
 const belly=actual([[760,895],[892,910],[867,980],[807,1018],[733,1046],[650,1065],[630,1058],[715,1010],[734,945]]);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;if(!masks.art[i]||!original.data[i*4+3]||inside(belly,x,y))continue;const [r,g,b]=original.data.subarray(i*4,i*4+3);
  // Keep clothing and bottles in the foreground; keep each leg a complete surface.
  if((b>g*1.15&&r>g*1.15)||(y<970*H/1254&&((r>g*1.18&&g>b*1.05)||(b>g*.75&&g>r*1.1))))continue;
  const footOwner=y>1110*H/1254&&x>250*W/1254&&x<670*W/1254?'near':y>1100*H/1254&&x>=690*W/1254&&x<1015*W/1254?'far':null;
  if(footOwner)legMask[footOwner][i]=1;else for(const side of ['near','far'])if(inside(contours[side],x,y)){legMask[side][i]=1;break;}
 }
 const pageSpecs=[],layers=[];
 function savePage(name,rgba){
  let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(rgba[(y*W+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0)throw Error('Empty walking layer '+name);x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(W-1,x1+2);y1=Math.min(H-1,y1+2);
  const w=x1-x0+1,h=y1-y0+1,png=new PNG({width:w,height:h});for(let y=0;y<h;y++)rgba.copy(png.data,y*w*4,((y+y0)*W+x0)*4,((y+y0)*W+x0+w)*4);
  fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(png));regions.push(`${name}.png\nsize: ${w},${h}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${name}\n  rotate: false\n  xy: 0,0\n  size: ${w},${h}\n  orig: ${w},${h}\n  offset: 0,0\n  index: -1\n`);const spec={name,x0,y0,w,h,rgba};pageSpecs.push({...spec,rgba:undefined});return spec;
 }
 function regionAttachment(spec,bone){const b=setup[bone],P=world([spec.x0+spec.w/2,spec.y0+spec.h/2]),angle=deg(Math.atan2(b.c,b.a)),local=rot([P[0]-b.x,P[1]-b.y],-angle);return {type:'region',path:spec.name,x:local[0],y:local[1],rotation:-angle,width:spec.w,height:spec.h};}
 function meshAttachment(spec,weights,step=22){
  const uvs=[],vertices=[],triangles=[],points=[],bindings=[],map=new Map(),nx=Math.ceil(spec.w/step),ny=Math.ceil(spec.h/step);
  function vertex(i,j){const key=j*(nx+1)+i;if(map.has(key))return map.get(key);const q=[spec.x0+Math.min(i*step,spec.w),spec.y0+Math.min(j*step,spec.h)],P=world(q),pairs=weights(q),index=uvs.length/2;map.set(key,index);uvs.push((q[0]-spec.x0)/spec.w,(q[1]-spec.y0)/spec.h);points.push(P);bindings.push(pairs);vertices.push(pairs.length);for(const [name,value]of pairs){const b=setup[name],local=rot([P[0]-b.x,P[1]-b.y],-deg(Math.atan2(b.c,b.a)));vertices.push(indexes[name],local[0],local[1],value);}return index;}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let visible=false;for(let y=spec.y0+j*step;y<Math.min(spec.y0+spec.h,spec.y0+(j+1)*step)&&!visible;y++)for(let x=spec.x0+i*step;x<Math.min(spec.x0+spec.w,spec.x0+(i+1)*step)&&!visible;x++)if(spec.rgba[(y*W+x)*4+3]>10)visible=true;if(!visible)continue;const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);triangles.push(a,b,c,a,c,d);}
  return {attachment:{type:'mesh',path:spec.name,uvs,vertices,triangles,hull:0,width:spec.w,height:spec.h},points,bindings};
 }
 const body=Buffer.alloc(W*H*4),back=Buffer.alloc(W*H*4),weapon=Buffer.alloc(W*H*4);
 const hiddenPoly=[[365,925],[940,925],[920,1030],[820,1080],[560,1080],[390,1040]].map(p=>p.map(v=>v*s));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4;if(masks.art[i]&&!legMask.near[i]&&!legMask.far[i]&&y<1110*H/1254)original.data.copy(body,k,k,k+4);if(masks.staff[i])original.data.copy(weapon,k,k,k+4);if(inside(hiddenPoly,x,y)){const bx=clamp(Math.round(x*backing.width/W),0,backing.width-1),by=clamp(Math.round(y*backing.height/H),0,backing.height-1),bi=(by*backing.width+bx)*4;backing.data.copy(back,k,bi,bi+4);}}
 const backSpec=savePage('walk-back',back),weaponSpec=savePage('walk-staff',weapon),bodySpec=savePage('walk-body',body);
 const newSlots=[{name:'walk-back',bone:'body'},{name:'walk-staff',bone:'staff'}];
 rig.skins[0].attachments['walk-back']={'walk-back':regionAttachment(backSpec,'body')};rig.skins[0].attachments['walk-staff']={'walk-staff':regionAttachment(weaponSpec,'staff')};
 const bodyMesh=meshAttachment(bodySpec,q=>{const result=new Map();for(const [name,value]of field(q)){const owner=/Leg|Foot/.test(name)?'body':name;result.set(owner,(result.get(owner)||0)+value);}return [...result];},26);
 rig.skins[0].attachments.art['walk-body']=bodyMesh.attachment;
 for(const side of ['far','near']){
  const [upper,lower,foot]=walkBones[side],knee=(H-setup[lower].y),ankle=(H-setup[foot].y),hip=(H-setup[upper].y);
  const weights=q=>{const strength=smooth((q[1]-hip+20*s)/(75*s)),low=smooth((q[1]-knee+55*s)/(110*s)),toe=smooth((q[1]-ankle+90*s)/(100*s));return [['body',1-strength],[upper,strength*(1-low)*(1-toe)],[lower,strength*low*(1-toe)],[foot,strength*toe]].filter(([,w])=>w>1e-8);};
  const name='walk-'+side+'Leg',rgba=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++)if(legMask[side][i])original.data.copy(rgba,i*4,i*4,i*4+4);
  const spec=savePage(name,rgba),mesh=meshAttachment(spec,weights,18);newSlots.push({name,bone:'root'});rig.skins[0].attachments[name]={[name]:mesh.attachment};layers.push({name,...mesh});
 }
 rig.slots=[rig.slots.find(s=>s.name==='staff'),...newSlots,rig.slots.find(s=>s.name==='art')];
 for(const [name,animation]of Object.entries(rig.animations)){
  const active=name==='walk';animation.slots??={};for(const slot of newSlots)animation.slots[slot.name]={attachment:[{time:0,name:active?slot.name:null}]};animation.slots.art={attachment:[{time:0,name:active?'walk-body':'art'}]};animation.slots.staff={attachment:[{time:0,name:active?null:'staff'}]};
 }
 delete rig.animations.walk.deform;rig.animations.walk.deform={default:{}};
 const dqSetup=Object.fromEntries(Object.entries(setup).map(([name,b])=>[name,{x:b.x,y:b.y,angle:deg(Math.atan2(b.c,b.a))}]));
 for(const layer of layers){
  const keys=[];for(let frame=0;frame<=60;frame++){
   const time=durations.walk*frame/60,current=pose(rig,'walk',time),dqCurrent=Object.fromEntries(Object.entries(current).map(([name,b])=>[name,{x:b.x,y:b.y,angle:deg(Math.atan2(b.c,b.a))}])),desired=skinLeg({points:layer.points,weights:layer.bindings,preserveStrips:false},dqSetup,dqCurrent),offsets=[];
   // Compute corrections against Spine's linear skinning for this small limb layer.
   const small={...rig,slots:[{name:layer.name,bone:'root',attachment:layer.name}]},existing=meshes({skeleton:small,regions:{}},current)[layer.name].pts;let index=0;
   for(let v=0;v<layer.points.length;v++){const delta=[desired[v][0]-existing[v][0],desired[v][1]-existing[v][1]],count=layer.attachment.vertices[index++];for(let j=0;j<count;j++){const c=current[rig.bones[layer.attachment.vertices[index]].name],local=rot(delta,-deg(Math.atan2(c.c,c.a)));offsets.push(...local.map(value=>Math.round(value*10000)/10000));index+=4;}}
   keys.push({time,vertices:offsets});
  }
  rig.animations.walk.deform.default[layer.name]={[layer.name]:keys};
 }
 fs.writeFileSync(path.join(out,'walk-layers.json'),JSON.stringify({pages:pageSpecs,bodyVertices:bodyMesh.points.length,limbVertices:layers.reduce((sum,l)=>sum+l.points.length,0),method:'Two continuous leg surfaces with rigid toes, no knee cut lines, and a newly authored wide-stance gait.'},null,2));
 return {newSlots,bodyVertices:bodyMesh.points.length,limbVertices:layers.reduce((sum,l)=>sum+l.points.length,0)};
}
