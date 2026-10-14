import {meshes} from '../../scripts/lib/spine.mjs';
import {rot} from '../../scripts/lib/geom.mjs';
function eased(u,curve){if(!Array.isArray(curve))return u;let lo=0,hi=1;const bez=(t,a,b)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;for(let i=0;i<20;i++){const t=(lo+hi)/2;if(bez(t,curve[0],curve[2])<u)lo=t;else hi=t;}return bez((lo+hi)/2,curve[1],curve[3]);}
export function shamanSurfaces(rig,world,name,time,{deform=true}={}){
 const slots=[],attachments={},metadata={};
 for(const slot of rig.slots){
  let attachmentName=slot.attachment;for(const key of rig.animations[name]?.slots?.[slot.name]?.attachment||[])if(key.time<=time)attachmentName=key.name;
  if(!attachmentName)continue;let attachment=rig.skins[0].attachments[slot.name][attachmentName],region=attachment.type==='region';
  if(region){const {width:w,height:h,x=0,y=0,rotation=0}=attachment,points=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]].map(p=>{const q=rot(p,rotation);return [q[0]+x,q[1]+y];});attachment={type:'mesh',uvs:[0,0,1,0,1,1,0,1],vertices:points.flat(),triangles:[0,1,2,0,2,3],width:w,height:h};}
  const keys=deform?rig.animations[name]?.deform?.default?.[slot.name]?.[attachmentName]:null;
  if(keys){
   let a=keys[0],b=a;for(let i=0;i<keys.length-1;i++)if(time>=keys[i].time){a=keys[i];b=keys[i+1];}
   const curve=typeof a.curve==='number'?[a.curve,a.c2??0,a.c3??1,a.c4??1]:a.curve,u=a===b?0:eased(Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),curve),vertices=attachment.vertices.slice();let offset=0;
   for(let i=0;i<vertices.length;){const count=vertices[i++];for(let j=0;j<count;j++){for(let k=1;k<=2;k++){const av=a.vertices?.[offset-(a.offset||0)]||0,bv=b.vertices?.[offset-(b.offset||0)]||0;vertices[i+k]+=av+(bv-av)*u;offset++;}i+=4;}}
   attachment={...attachment,vertices};
  }
  slots.push({...slot,attachment:attachmentName});attachments[slot.name]={[attachmentName]:attachment};metadata[slot.name]={attachment,region};
 }
 const result=meshes({skeleton:{...rig,slots,skins:[{...rig.skins[0],attachments}]},regions:{}},world);for(const name of Object.keys(result))Object.assign(result[name],metadata[name]);return result;
}
