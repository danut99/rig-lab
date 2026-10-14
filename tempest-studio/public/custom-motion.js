// Motion of a custom (editor-added) bone: optional sway plus hand-placed rotation keyframes.
// Shared by the build (scripts/build-shaman-reference.mjs) and the editor's live preview (public/editor.js).
// `bone` is an entry of source/verdant-shaman/bones.json; `keys` holds {animation:[{time (s), angle (°)}]}.
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
export function customAngle(bone,animation,time,duration,loop=true){
 const sway=bone.sway||{},w=duration?time/duration*2*Math.PI:0;
 const base=(sway.amplitude||0)*Math.sin(w*(sway.cycles||1)+(sway.phase||0)*Math.PI/180);
 // Angles are read within -180..180 so a key like -351° (an old editor bug) can't spin the bone a full turn.
 const keys=(bone.keys?.[animation]||[]).filter(k=>Number.isFinite(k.time)&&Number.isFinite(k.angle)).map(k=>({time:k.time,angle:((k.angle+180)%360+360)%360-180})).sort((a,b)=>a.time-b.time);
 if(!keys.length)return base;if(keys.length===1)return base+keys[0].angle;
 // Looping animations continue from the last key back into the first; one-shot ones hold their end values.
 const list=loop&&duration>0?[{time:keys.at(-1).time-duration,angle:keys.at(-1).angle},...keys,{time:keys[0].time+duration,angle:keys[0].angle}]:keys;
 if(time<=list[0].time)return base+list[0].angle;if(time>=list.at(-1).time)return base+list.at(-1).angle;
 for(let i=0;i<list.length-1;i++){const a=list[i],b=list[i+1];if(time>=a.time&&time<=b.time){const u=b.time>a.time?smooth((time-a.time)/(b.time-a.time)):1;return base+a.angle+(b.angle-a.angle)*u;}}
 return base;
}
