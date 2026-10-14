import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {inside,rot,smooth,deg,clamp} from '../../scripts/lib/geom.mjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {skinSolidLeg} from './leg-skin.mjs';
import {dragonFoot} from './shaman-dragon-walk.mjs';
import {cleanFootFragments,trimStaffFootOutline,cleanThighSpecks,bleedEdges} from './shaman-edge-cleanup.mjs';
export function installWalkLayers({rig,original,masks,polygons,setup,indexes,world,field,s,out,source,durations,regions,solePoints,soleFloor,extra=()=>0}){
 // Rotations added in the bone editor to the named leg bones (farLegUpper, nearFoot, …). The layers shown below follow
 // other bones (walk* in walk/attack, the body in idle), so the edits are forwarded to them; with none, nothing changes.
 const legNames=side=>[side+'LegUpper',side+'LegLower',side+'Foot'];
 const sampled=(anim,name)=>{const n=Math.round(durations[anim]*60);for(let i=0;i<=n;i++)if(extra(name,anim,i*durations[anim]/n))return true;return false;};
 const editedIdle=new Set(['near','far'].filter(side=>legNames(side).some(name=>sampled('idle',name))));
 const W=original.width,H=original.height,backing=PNG.sync.read(fs.readFileSync(path.join(source,'hidden-torso.png'))),boneNames=rig.bones.map(b=>b.name),legMask={near:new Uint8Array(W*H),far:new Uint8Array(W*H)};
 const chains={near:[[510,960],[440,1065],[455,1150],[545,1190]],far:[[835,960],[800,1080],[860,1140],[935,1180]]},walkBones={};
 const wrap=a=>((a+180)%360+360)%360-180;
 for(const side of ['near','far']){walkBones[side]=[];const points=chains[side].map(p=>world(p.map(v=>v*s)));for(let i=0;i<3;i++){const name='walk'+side+['Upper','Lower','Foot'][i],parent=i?walkBones[side][i-1]:'body',a=points[i],b=points[i+1],p=setup[parent],pa=deg(Math.atan2(p.c,p.a)),local=rot([a[0]-p.x,a[1]-p.y],-pa),angle=deg(Math.atan2(b[1]-a[1],b[0]-a[0])),r=angle*Math.PI/180;indexes[name]=rig.bones.length;rig.bones.push({name,parent,x:local[0],y:local[1],rotation:wrap(angle-pa),length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],a:Math.cos(r),b:-Math.sin(r),c:Math.sin(r),d:Math.cos(r)};walkBones[side].push(name);rig.animations.walk.bones[name]={rotate:[]};}}
 const frames=Math.round(durations.walk*60);
 // Breathing keeps the painted legs intact; walking owns the separate leg rig.
 const originalArt=rig.skins[0].attachments.art.art,breathing={...originalArt,vertices:[]},breathOffsets=[];
 for(let v=0;v<originalArt.uvs.length/2;v++){
  const q=[originalArt.uvs[v*2]*W,originalArt.uvs[v*2+1]*H],P=world(q),weights=new Map();
  // Below the belly the tail's share goes to the body, faded in over ~80 px: a hard step at x=350 tore the skin at
  // the tail base as soon as the tail turned more than its own small idle sway.
  const lowerBody=smooth((q[1]-905*s)/(60*s))*smooth((q[0]-300*s)/(80*s))*(q[0]<1005*s?1:0);
  for(const [name,value]of field(q)){const editedLeg=/^(near|far)(Leg|Foot)/.test(name)&&editedIdle.has(name.startsWith('near')?'near':'far');
   if(/^tail/.test(name)&&lowerBody>0){weights.set('body',(weights.get('body')||0)+value*lowerBody);if(lowerBody<1)weights.set(name,(weights.get(name)||0)+value*(1-lowerBody));continue;}
   const owner=/Leg|Foot/.test(name)&&!editedLeg?'body':name;weights.set(owner,(weights.get(owner)||0)+value);}
  breathing.vertices.push(weights.size);
  const rigid=[...weights].reduce((sum,[name,value])=>sum+(!['body','chest','poncho','charms'].includes(name)?value:0),0),envelope=smooth((q[1]-540*s)/(140*s))*smooth((975*s-q[1])/(150*s))*(1-rigid),center=world([680*s,800*s]),delta=[(P[0]-center[0])*.055*envelope,(P[1]-center[1])*.05*envelope];
  for(const [name,value]of weights){const b=setup[name],angle=deg(Math.atan2(b.c,b.a)),local=rot([P[0]-b.x,P[1]-b.y],-angle);breathing.vertices.push(indexes[name],...local,value);breathOffsets.push(...rot(delta,-angle));}
 }
 rig.skins[0].attachments.art['breathing-art']=breathing;
 // Full-size clean pages keep the existing mesh UV registration unchanged.
 for(const layer of ['art','staff']){
  const name='clean-'+layer,png=new PNG({width:W,height:H});original.data.copy(png.data);
  for(let i=0;i<W*H;i++)if(!masks[layer][i])png.data[i*4+3]=0;
  if(layer==='staff')trimStaffFootOutline(png.data,W,H);
  cleanFootFragments(png.data,W,H);bleedEdges(png.data,W,H);fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(png));
  regions.push(`${name}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${name}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 }
 breathing.path='clean-art';
 rig.skins[0].attachments.art['clean-art']={...originalArt,path:'clean-art'};
 rig.skins[0].attachments.staff['clean-staff']={...rig.skins[0].attachments.staff.staff,path:'clean-staff'};
 rig.animations.idle.deform={default:{art:{'breathing-art':[{time:0,curve:.37,c2:0,c3:.63,c4:1},{time:durations.idle/2,vertices:breathOffsets,curve:.37,c2:0,c3:.63,c4:1},{time:durations.idle}]}}};
 // Idle legs stay planted; an edited leg rotates only by what was added in the editor.
 for(const side of ['near','far'])for(const name of legNames(side)){const n=Math.round(durations.idle*60);rig.animations.idle.bones[name]={rotate:editedIdle.has(side)?Array.from({length:n+1},(_,i)=>({time:i*durations.idle/n,angle:extra(name,'idle',i*durations.idle/n)})):[{time:0,angle:0}]};}
 for(const motionName of ['walk','attack']){const frames=Math.round(durations[motionName]*60);for(const chain of Object.values(walkBones))for(const name of chain)rig.animations[motionName].bones[name]={rotate:[]};for(let i=0;i<=frames;i++){const t=i*durations[motionName]/frames,p=i/frames,current=pose(rig,motionName,t);for(const side of ['near','far']){const [upper,lower,foot]=walkBones[side],hip=current[upper],rest=setup[side+'Foot'],step=motionName==='walk'?dragonFoot(side,p):{x:0,lift:0,tilt:0},tilt=step.tilt,minimum=Math.min(...solePoints[side].map(P=>rot(P,tilt)[1])),x=rest.x+step.x*s,y=rest.y+step.lift*s+soleFloor[side]-minimum,l1=rig.bones[indexes[upper]].length,l2=rig.bones[indexes[lower]].length,dx=x-hip.x,dy=y-hip.y,d=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.001,l1+l2-.001),rHip=setup[upper],rKnee=setup[lower],rFoot=setup[foot],bend=Math.sign(wrap(deg(Math.atan2(rKnee.y-rHip.y,rKnee.x-rHip.x))-deg(Math.atan2(rFoot.y-rHip.y,rFoot.x-rHip.x))))||1,a=deg(Math.atan2(dy,dx))+bend*deg(Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1))),k=rot([l1,0],a),b=deg(Math.atan2(dy-k[1],dx-k[0])),parent=current.body;const added=legNames(side).map(name=>extra(name,motionName,t));for(const [name,angle]of [[upper,wrap(a-deg(Math.atan2(parent.c,parent.a))-rig.bones[indexes[upper]].rotation+added[0])],[lower,wrap(b-a-rig.bones[indexes[lower]].rotation+added[1])],[foot,wrap(deg(Math.atan2(rFoot.c,rFoot.a))+tilt-b-rig.bones[indexes[foot]].rotation+added[2])]])rig.animations[motionName].bones[name].rotate.push({time:t,angle});}}}
 const actual=p=>p.map(([x,y])=>[x*W/1254,y*H/1254]);
 const contours={near:actual([[430,935],[470,940],[500,920],[620,915],[645,970],[640,1005],[615,1035],[578,1058],[545,1074],[539,1100],[565,1120],[590,1160],[605,1210],[570,1250],[340,1250],[296,1210],[298,1160],[318,1115],[340,1080],[355,1050],[370,1025],[370,992],[382,968],[405,945]]),far:actual([[795,910],[920,925],[963,963],[955,1007],[930,1035],[890,1055],[865,1075],[870,1095],[912,1108],[957,1123],[992,1150],[1008,1220],[810,1228],[715,1205],[708,1160],[707,1105],[725,1080],[752,1050],[738,1020],[718,995],[742,948]])};
 // Trace the actual curved belly silhouette, including its olive shaded edge.
 // Color thresholds cut away that shadow and turn the belly into a flat wedge.
 const belly=actual([[739,905],[870,914],[861,944],[847,969],[825,989],[797,1008],[764,1021],[730,1029],[692,1033],[657,1033],[680,1010],[700,981],[718,947],[725,918]]);
 const walkArt=new Uint8Array(masks.art),walkStaff=new Uint8Array(masks.staff);
 // The original weapon mask includes the dark outline of the overlapping toe.
 // Give that outline to the moving foot only in the new walk.
 for(let y=Math.ceil(1120*H/1254);y<H;y++)for(let x=690*W/1254|0;x<995*W/1254;x++){const i=y*W+x;if(original.data[i*4+3]){walkArt[i]=1;walkStaff[i]=0;}}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;if(!walkArt[i]||!original.data[i*4+3])continue;const [r,g,b]=original.data.subarray(i*4,i*4+3);
  if(inside(belly,x,y))continue;
  // Tail underside overlaps the near thigh in the source; it stays on the tail.
  if(y<1065*H/1254&&x<470*W/1254&&(r>=g*.96||x<370*W/1254))continue;
  // Keep clothing and bottles in the foreground; keep each leg a complete surface.
  if((b>g*1.15&&r>g*1.15)||(y<970*H/1254&&((r>g*1.18&&g>b*1.05)||(b>g*.75&&g>r*1.1))))continue;
  const footOwner=y>1110*H/1254&&x>250*W/1254&&x<670*W/1254?'near':y>1100*H/1254&&x>=690*W/1254&&x<1015*W/1254?'far':null;
  const lowerLeg=y>1000*H/1254&&x>690*W/1254&&x<990*W/1254?'far':y>1010*H/1254&&x>370*W/1254&&x<625*W/1254?'near':null;
  if(footOwner||lowerLeg)legMask[footOwner||lowerLeg][i]=1;else for(const side of ['near','far'])if(inside(contours[side],x,y)){legMask[side][i]=1;break;}
 }
 const pageSpecs=[],layers=[];
 function savePage(name,rgba){
  if(name==='walk-staff')trimStaffFootOutline(rgba,W,H);
  if(name.endsWith('Leg'))cleanThighSpecks(rgba,W,H);
  cleanFootFragments(rgba,W,H,name.endsWith('Leg')?0:1020);bleedEdges(rgba,W,H);
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
 const hipBacks=[actual([[405,910],[650,910],[650,985],[590,1020],[445,1015],[405,970]]),actual([[760,915],[930,920],[930,980],[885,1010],[770,1000]]),
  // A small overlap behind the tassel closes the left belly/thigh join.
  actual([[610,970],[690,970],[700,995],[690,1015],[640,1020],[610,1005]])];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,k=i*4,[r,g,b]=original.data.subarray(k,k+3),tail=x<470*W/1254&&y<1065*H/1254&&(r>=g*.96||x<370*W/1254),garment=b>g*1.15&&r>g*1.15;
  // Remove residual leg silhouettes, retaining the tail, belly and hanging cloth.
  const bellySkin=inside(belly,x,y),lowerResidue=y>1000*H/1254&&!tail&&!bellySkin&&!garment;
  // This rear hem was exposed when the thigh moved; it is not the front tassel.
  const exposedRearHem=garment&&x>690*W/1254&&x<790*W/1254&&y>1005*H/1254;
  if(walkArt[i]&&!legMask.near[i]&&!legMask.far[i]&&!lowerResidue&&!exposedRearHem&&y<1110*H/1254)original.data.copy(body,k,k,k+4);
  if(walkStaff[i])original.data.copy(weapon,k,k,k+4);
  if(hipBacks.some(poly=>inside(poly,x,y))){const bx=clamp(Math.round(x*backing.width/W),0,backing.width-1),by=clamp(Math.round(y*backing.height/H),0,backing.height-1),bi=(by*backing.width+bx)*4;backing.data.copy(back,k,bi,bi+4);}
  // The rear hem hangs between belly and far thigh: keep it, but behind the legs (walk-back) so the thigh passes in front.
  if(exposedRearHem&&walkArt[i]&&original.data[k+3])original.data.copy(back,k,k,k+4);
 }
 const backSpec=savePage('walk-back',back),weaponSpec=savePage('walk-staff',weapon),bodySpec=savePage('walk-body',body);
 const newSlots=[{name:'walk-back',bone:'body'},{name:'walk-staff',bone:'staff'}];
 rig.skins[0].attachments['walk-back']={'walk-back':regionAttachment(backSpec,'body')};rig.skins[0].attachments['walk-staff']={'walk-staff':regionAttachment(weaponSpec,'staff')};
 const bodyMesh=meshAttachment(bodySpec,q=>{const result=new Map();for(const [name,value]of field(q)){const owner=/Leg|Foot/.test(name)?'body':name;result.set(owner,(result.get(owner)||0)+value);}return [...result];},26);
 rig.skins[0].attachments.art['walk-body']=bodyMesh.attachment;
 for(const side of ['far','near']){
  const [upper,lower,foot]=walkBones[side],knee=(H-setup[lower].y),ankle=(H-setup[foot].y),hip=(H-setup[upper].y);
  // The painted leg has a broad, soft knee rather than a narrow hinge.
  // A continuous thigh-to-foot cage keeps its volume and the whole foot rigid.
  // The far thigh shows right under the belly: it turns with the thigh bone from just below the hip (the hand-over to the
  // body happens under the belly, which hides it), so the leg swings from the hip and bends at the knee instead of
  // the lower leg sliding under a thigh glued to the body. SHAMAN_FAR_HIP overrides "start,span" for trials.
  const [farStart,farSpan]=(process.env.SHAMAN_FAR_HIP||'10,60').split(',').map(Number);
  const weights=q=>{let strength=side==='far'?smooth((q[1]-hip-farStart*s)/(farSpan*s)):smooth((q[1]-hip-55*s)/(100*s));if(side==='near'){const tailJoin=1-smooth((q[0]-420*W/1254)/(65*W/1254));strength*=1-tailJoin*(1-smooth((q[1]-1080*H/1254)/(65*H/1254)));}const toe=side==='near'?smooth((q[1]-knee+20*s)/(ankle-knee+20*s)):smooth((q[1]-hip-25*s)/(ankle-hip-15*s));return [['body',1-strength],[upper,strength*(1-toe)],[foot,strength*toe]].filter(([,w])=>w>1e-8);};
  const name='walk-'+side+'Leg',rgba=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++)if(legMask[side][i])original.data.copy(rgba,i*4,i*4,i*4+4);
  if(side==='far'){
   const edge=[[920,942],[940,952],[960,955],[980,951],[1000,939],[1020,925],[1040,901],[1055,880]];
   for(let y=Math.ceil(920*H/1254);y<1055*H/1254;y++){
    const sy=y*1254/H;let j=0;while(j<edge.length-2&&sy>edge[j+1][0])j++;
    const [y0,x0]=edge[j],[y1,x1]=edge[j+1];let boundary=(x0+(x1-x0)*(sy-y0)/(y1-y0)+1)*W/1254,paintedEdge=-1;
    for(let x=Math.floor(800*W/1254);x<975*W/1254;x++){const k=(y*W+x)*4,[r,g,b,a]=original.data.subarray(k,k+4);if(a>=200&&g>r*1.02&&g>b*1.15)paintedEdge=x;}
    if(paintedEdge>=0)boundary=Math.min(boundary,paintedEdge+3);
    for(let x=Math.ceil(boundary);x<W;x++)rgba[(y*W+x)*4+3]=0;
   }
  }
  // Preserve all three visible original toes. The generated repair merged the
  // small outer toe into its neighbor and changed the foot's silhouette.
  if(side==='far')for(let y=Math.ceil(1105*H/1254);y<H;y++)for(let x=Math.ceil(955*W/1254);x<1030*W/1254;x++){
   const i=y*W+x,k=i*4;
   if(masks.art[i])original.data.copy(rgba,k,k,k+4);else rgba.fill(0,k,k+4);
  }
  // The belly (body layer) is drawn over the far thigh. Extend the thigh's skin a few pixels under the belly so that,
  // once the thigh moves, no gap opens between the belly's edge and the thigh's cut edge.
  if(side==='far'){const grown=Buffer.from(rgba),dist=bleedEdges(grown,W,H,Math.round(5*W/1254));
   for(let i=0;i<W*H;i++)if(!rgba[i*4+3]&&dist[i]>0&&dist[i]<255&&inside(belly,i%W,Math.floor(i/W))){grown.copy(rgba,i*4,i*4,i*4+3);rgba[i*4+3]=255;}}
  const spec=savePage(name,rgba),mesh=meshAttachment(spec,weights,18);newSlots.push({name,bone:'root'});rig.skins[0].attachments[name]={[name]:mesh.attachment};layers.push({name,...mesh});
 }
 rig.slots=[rig.slots.find(s=>s.name==='staff'),...newSlots,rig.slots.find(s=>s.name==='art')];
 for(const [name,animation]of Object.entries(rig.animations)){
  const active=name==='walk'||name==='attack';animation.slots??={};for(const slot of newSlots)animation.slots[slot.name]={attachment:[{time:0,name:active?slot.name:null}]};animation.slots.art={attachment:[{time:0,name:active?'walk-body':name==='idle'?'breathing-art':'clean-art'}]};animation.slots.staff={attachment:[{time:0,name:active?null:'clean-staff'}]};
 }
 delete rig.animations.walk.deform;rig.animations.walk.deform={default:{}};
 const dqSetup=Object.fromEntries(Object.entries(setup).map(([name,b])=>[name,{x:b.x,y:b.y,angle:deg(Math.atan2(b.c,b.a))}]));
 rig.animations.attack.deform={default:{}};for(const motionName of ['walk','attack'])for(const layer of layers){
  const keys=[];for(let frame=0;frame<=60;frame++){
   const time=durations[motionName]*frame/60,current=pose(rig,motionName,time),dqCurrent=Object.fromEntries(Object.entries(current).map(([name,b])=>[name,{x:b.x,y:b.y,angle:deg(Math.atan2(b.c,b.a))}])),desired=skinSolidLeg({points:layer.points,weights:layer.bindings,kneeBones:layer.name==='walk-nearLeg'?walkBones.near:null},dqSetup,dqCurrent),offsets=[];
   // Compute corrections against Spine's linear skinning for this small limb layer.
   const small={...rig,slots:[{name:layer.name,bone:'root',attachment:layer.name}]},existing=meshes({skeleton:small,regions:{}},current)[layer.name].pts;let index=0;
   for(let v=0;v<layer.points.length;v++){const delta=[desired[v][0]-existing[v][0],desired[v][1]-existing[v][1]],count=layer.attachment.vertices[index++];for(let j=0;j<count;j++){const c=current[rig.bones[layer.attachment.vertices[index]].name],local=rot(delta,-deg(Math.atan2(c.c,c.a)));offsets.push(...local.map(value=>Math.round(value*10000)/10000));index+=4;}}
   keys.push({time,vertices:offsets});
  }
  rig.animations[motionName].deform.default[layer.name]={[layer.name]:keys};
 }
 fs.writeFileSync(path.join(out,'walk-layers.json'),JSON.stringify({pages:pageSpecs,bodyVertices:bodyMesh.points.length,limbVertices:layers.reduce((sum,l)=>sum+l.points.length,0),method:'Two continuous leg surfaces with rigid toes, no knee cut lines, and a newly authored wide-stance gait.'},null,2));
 return {newSlots,bodyVertices:bodyMesh.points.length,limbVertices:layers.reduce((sum,l)=>sum+l.points.length,0)};
}
