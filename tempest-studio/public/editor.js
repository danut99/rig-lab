import {createDinosaurPlayer} from './runtime/dinosaur-runtime.js';
import {customAngle} from './custom-motion.js';
// Bone editor for the Verdant Shaman rig. Reads/writes source/verdant-shaman/bones.json through the
// studio server, shows per-bone skin weights taken from the built animated.json, previews edited motion
// (sway + keyframes) live on top of the built rig, lets you pose a bone by dragging on the animated
// character (which writes a keyframe at the current time), manages the cut-out pieces, and rebuilds on demand.
const $=id=>document.getElementById(id),SVG='http://www.w3.org/2000/svg',MODEL='verdant-shaman';
const state={config:null,baked:null,history:[],selected:null,multi:new Set(),brush:null,brushAt:null,part:null,drawing:null,rig:null,pages:[],player:null,model:null,W:0,H:0,dirty:false,adding:false,drag:null,pose:null,busy:false,animation:'idle',paused:false};
window.editor=state; // inspection from the console and from scripts/browser checks
const el=(name,attrs={})=>{const node=document.createElementNS(SVG,name);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
const byName=name=>state.config.bones.find(b=>b.name===name),rigBone=name=>state.rig?.bones.find(b=>b.name===name),isCustom=b=>!!b?.custom;
const parts=()=>(state.config.parts??={}),currentPart=()=>state.part?parts()[state.part]:null;
// Selection: `selected` is the primary bone (properties, weights, handle); `multi` holds the others moved/rotated with it.
const group=()=>[state.selected,...state.multi].filter((n,i,a)=>n&&a.indexOf(n)===i&&byName(n));
function selectOnly(name){state.selected=name;state.multi.clear();}
function toggleSelect(name){if(name===state.selected){const next=[...state.multi][0]||null;state.multi.delete(next);state.selected=next;}else if(state.multi.has(name))state.multi.delete(name);else{if(state.selected)state.multi.add(state.selected);state.selected=name;}}
const descendants=name=>{const out=new Set();let grew=true;while(grew){grew=false;for(const b of state.config.bones)if(!out.has(b.name)&&(b.parent===name||out.has(b.parent))){out.add(b.name);grew=true;}}return out;};
const wrap=a=>((a+180)%360+360)%360-180,deg=r=>r*180/Math.PI;
const setStatus=text=>$('status').textContent=text;
function log(line){const box=$('log');box.textContent+=line.replace(/\n$/,'')+'\n';box.scrollTop=box.scrollHeight;}
function markDirty(){state.dirty=true;$('save').disabled=false;setStatus('Modificări nesalvate');}
function snapshot(){state.history.push(JSON.stringify(state.config));if(state.history.length>100)state.history.shift();$('undo').disabled=false;}
function undo(){if(!state.history.length)return;state.config=JSON.parse(state.history.pop());$('undo').disabled=!state.history.length;if(state.selected&&!byName(state.selected)&&!rigBone(state.selected))state.selected=null;for(const n of [...state.multi])if(!byName(n))state.multi.delete(n);if(state.part&&!parts()[state.part])state.part=null;state.drawing=null;markDirty();render();refreshPreview();}
function uniqueName(base){let i=1;while(byName(base+i)||rigBone(base+i))i++;return base+i;}

// ---- live player ----
function track(){return state.player?.loaded?state.player.raw.animationState.getCurrent(0):null;}
function playhead(){const tr=track();if(!tr)return {time:0,duration:0,name:state.animation,loop:true};const duration=tr.animation.duration;return {time:tr.loop?tr.trackTime%duration:Math.min(tr.trackTime,duration),duration,name:tr.animation.name,loop:tr.loop};}
// Runs after Spine applied the built animation, before world transforms. The rig already contains the motion
// baked at the last build (bones-built.json), so each bone gets only the difference to the edited motion.
function applyPreview(skeleton){const tr=skeleton&&track();if(!tr||!state.config)return;const duration=tr.animation.duration,time=tr.loop?tr.trackTime%duration:Math.min(tr.trackTime,duration),anim=tr.animation.name;
 for(const c of state.config.bones){const bone=skeleton.findBone(c.name);if(!bone)continue;const edited=customAngle(c,anim,time,duration,tr.loop);
  if(state.baked){const was=state.baked.bones.find(b=>b.name===c.name),delta=edited-(was?customAngle(was,anim,time,duration,tr.loop):0);bone.rotation+=delta;
   // In walk/attack the visible legs follow walk* bones, which the build drives with the same added rotation.
   const leg=c.name.match(/^(near|far)(LegUpper|LegLower|Foot)$/),walkBone=leg&&anim!=='idle'&&skeleton.findBone('walk'+leg[1]+{LegUpper:'Upper',LegLower:'Lower',Foot:'Foot'}[leg[2]]);if(walkBone)walkBone.rotation+=delta;}
  else if(c.custom)bone.rotation=bone.data.rotation+edited;else bone.rotation+=edited;}}
function refreshPreview(){const p=state.player;if(!p?.loaded||!state.paused)return;p.seek(playhead().time);}
async function loadRig(){
 const [rig,layers,baked]=await Promise.all([fetch(state.model.skeleton).then(r=>r.json()),fetch('models/'+MODEL+'/walk-layers.json').then(r=>r.ok?r.json():{pages:[]}).catch(()=>({pages:[]})),fetch('models/'+MODEL+'/bones-built.json').then(r=>r.ok?r.json():null).catch(()=>null)]);
 state.rig=rig;state.pages=layers.pages||[];state.baked=baked;
}
async function loadPlayer(){
 state.player?.dispose();$('player').replaceChildren();$('anims').replaceChildren();
 state.player=await createDinosaurPlayer($('player'),{baseUrl:'',model:MODEL,animation:state.animation,bones:$('showBones').checked,paused:state.paused,onReady:ready=>{
  state.player=ready;const animState=ready.raw.animationState,apply=animState.apply.bind(animState);animState.apply=skeleton=>{const r=apply(skeleton);applyPreview(skeleton);return r;};
  for(const a of ready.model.animations){const b=document.createElement('button');b.textContent=a.label;b.classList.toggle('active',a.name===state.animation);b.onclick=()=>{state.animation=a.name;ready.setAnimation(a.name);setPaused(false);[...$('anims').children].forEach(c=>c.classList.toggle('active',c===b));renderKeys();renderHeat();};$('anims').append(b);}
  if(state.paused)ready.seek(0);
 },onError:error=>log('Player: '+error.message)});
}
function setPaused(value){state.paused=value;state.player?.setPaused(value);$('pause').textContent=value?'▶ Continuă':'Ⅱ Pauză';}
$('pause').onclick=()=>setPaused(!state.paused);$('showBones').onchange=()=>state.player?.setBones($('showBones').checked);
$('scrub').oninput=()=>{const p=state.player;if(!p?.loaded)return;setPaused(true);p.seek(Number($('scrub').value));};
function tick(){
 const {time,duration,name,loop}=playhead();
 if(duration){$('time').textContent=time.toFixed(2)+' / '+duration.toFixed(2)+' s';$('scrub').max=duration;if(document.activeElement!==$('scrub'))$('scrub').value=time;}
 const b=state.config&&byName(state.selected);if(b)$('angleNow').textContent=customAngle(b,name,time,duration,loop).toFixed(1)+'°';
 for(const t of $('ticks').children)t.classList.toggle('current',Math.abs(Number(t.dataset.time)-time)<.03);
 drawHandle();requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---- posing by dragging on the animated character ----
// The player's camera is orthographic, but it zeroes its zoom after every frame, so rebuild it the way
// SpinePlayer.drawFrame does: the current viewport plus padding, fitted into the canvas.
function camera(){const raw=state.player?.raw,v=raw?.currentViewport;if(!v)return null;const vp={x:v.x-v.padLeft,y:v.y-v.padBottom,width:v.width+v.padLeft+v.padRight,height:v.height+v.padBottom+v.padTop},size=raw.scale(vp.width,vp.height,raw.canvas.width,raw.canvas.height);
 return {halfW:vp.width/size.x*raw.canvas.width/2,halfH:vp.width/size.x*raw.canvas.height/2,cx:vp.x+vp.width/2-raw.skeleton.x,cy:vp.y+vp.height/2-raw.skeleton.y};}
window.editorCamera=camera;
function stageToWorld(e){const cam=camera(),rect=state.player.raw.canvas.getBoundingClientRect(),nx=2*(e.clientX-rect.left)/rect.width-1,ny=1-2*(e.clientY-rect.top)/rect.height;return [cam.cx+nx*cam.halfW,cam.cy+ny*cam.halfH];}
function worldToStage([wx,wy],cam=camera()){const pose=$('pose'),nx=(wx-cam.cx)/cam.halfW,ny=(wy-cam.cy)/cam.halfH;return [(nx+1)/2*pose.width,(1-ny)/2*pose.height];}
function poseBone(){const b=state.config&&byName(state.selected);if(!b||!state.player?.loaded)return null;const bone=state.player.raw.skeleton.findBone(b.name);return bone?{config:b,bone}:null;}
function drawHandle(){
 const pose=$('pose'),ctx=pose.getContext('2d'),w=pose.clientWidth,h=pose.clientHeight;if(pose.width!==w||pose.height!==h){pose.width=w;pose.height=h;}ctx.clearRect(0,0,w,h);
 const target=poseBone();const b=state.config&&byName(state.selected);
 const label=state.player?.model?.animations.find(a=>a.name===state.animation)?.label||state.animation;
 $('poseHint').textContent=!b?(state.selected?'Osul generat de mers nu se animează aici.':''):!target?'Osul nu e încă în rig: apasă „Reconstruiește”.':state.heatEmpty?`În „${label}” imaginea nu urmează acest os: se mișcă doar scheletul.`:state.paused?'':'Pune pauză (sau trage direct) ca să fixezi un cadru.';
 const cam=target&&camera();if(!cam)return;
 for(const name of state.multi){const other=state.player.raw.skeleton.findBone(name);if(!other)continue;const l=other.data.length||60,a=worldToStage([other.worldX,other.worldY],cam),z=worldToStage([other.worldX+other.a*l,other.worldY+other.c*l],cam);ctx.lineCap='round';ctx.strokeStyle='rgba(16,25,29,.8)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(z[0],z[1]);ctx.stroke();ctx.strokeStyle=state.pose?'#fff':'#f7d49a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(z[0],z[1]);ctx.stroke();}
 const {bone}=target,len=bone.data.length||60,o=worldToStage([bone.worldX,bone.worldY],cam),t=worldToStage([bone.worldX+bone.a*len,bone.worldY+bone.c*len],cam);
 ctx.lineCap='round';ctx.strokeStyle='rgba(16,25,29,.8)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(t[0],t[1]);ctx.stroke();
 ctx.strokeStyle=state.pose?'#fff':'#f0b25a';ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(t[0],t[1]);ctx.stroke();
 ctx.fillStyle='#10191d';ctx.beginPath();ctx.arc(o[0],o[1],7,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle=state.pose?'#fff':'#f0b25a';ctx.beginPath();ctx.arc(t[0],t[1],9,0,Math.PI*2);ctx.fill();
}
const poseCanvas=$('pose');
poseCanvas.onpointerdown=e=>{
 const target=poseBone();if(!target)return;snapshot();setPaused(true);
 const {time}=playhead(),t=Math.round(time*20)/20,keyFor=config=>{const keys=(config.keys??={})[state.animation]??=[];let key=keys.find(k=>Math.abs(k.time-t)<.005);if(!key){key={time:t,angle:0};keys.push(key);}return key;};
 const others=[...state.multi].map(byName).filter(c=>c&&state.player.raw.skeleton.findBone(c.name)).map(keyFor),key=keyFor(target.config);
 // A group rotates by the pointer's sweep around the primary bone's origin; a single bone points at the pointer.
 const [wx,wy]=stageToWorld(e),origin=[target.bone.worldX,target.bone.worldY];
 state.pose={key,target,others,origin,startAngle:deg(Math.atan2(wy-origin[1],wx-origin[0])),startKeys:[key,...others].map(k=>k.angle)};
 $('stage').classList.add('dragging');poseCanvas.setPointerCapture(e.pointerId);if(!others.length)poseCanvas.onpointermove(e);
};
poseCanvas.onpointermove=e=>{
 const d=state.pose;if(!d)return;const {bone}=d.target,[wx,wy]=stageToWorld(e);
 if(d.others.length){const sweep=wrap(deg(Math.atan2(wy-d.origin[1],wx-d.origin[0]))-d.startAngle);[d.key,...d.others].forEach((k,i)=>k.angle=Math.round(wrap(d.startKeys[i]+sweep)*10)/10);markDirty();refreshPreview();return;}
 // Point the bone at the pointer: the difference between the wanted local angle and the bone's current one (which
 // already includes the authored motion, sway and this key) goes into the key, so it works for every bone.
 const world=deg(Math.atan2(wy-bone.worldY,wx-bone.worldX)),parent=bone.parent?deg(Math.atan2(bone.parent.c,bone.parent.a)):0;
 d.key.angle=Math.round(wrap(d.key.angle+wrap(world-parent-bone.rotation))*10)/10;markDirty();refreshPreview();
};
poseCanvas.onpointerup=poseCanvas.onpointercancel=()=>{if(!state.pose)return;state.pose=null;$('stage').classList.remove('dragging');renderKeys();};

// ---- rendering ----
function render(){renderOverlay();renderTree();renderProps();renderHeat();renderParts();}
function renderOverlay(){
 const svg=$('overlay');svg.replaceChildren();const sel=byName(state.selected);
 // Pieces: every enabled cut as a polygon; the selected one editable (vertices drag, midpoints insert, right-click removes).
 for(const [name,part]of Object.entries(parts())){if(!part.enabled||part.polygon.length<3||(name===state.part&&state.drawing))continue;const g=el('g',{class:'part'+(name===state.part?'':' other')}),pts=part.polygon;g.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' ')}));
  if(name===state.part){pts.forEach((p,i)=>{const n=pts[(i+1)%pts.length],mid=el('circle',{cx:(p[0]+n[0])/2,cy:(p[1]+n[1])/2,r:6,class:'mid'});mid.dataset.insert=i+1;g.append(mid);});pts.forEach((p,i)=>{const v=el('circle',{cx:p[0],cy:p[1],r:8,class:'vtx'});v.dataset.vertex=i;g.append(v);});}
  svg.append(g);}
 if(state.drawing){const g=el('g',{class:'part'});if(state.drawing.length>1)g.append(el('polyline',{points:state.drawing.map(p=>p.join(',')).join(' ')}));state.drawing.forEach(p=>g.append(el('circle',{cx:p[0],cy:p[1],r:6,class:'vtx'})));svg.append(g);}
 if(sel&&sel.parent!=='root'){const p=byName(sel.parent);if(p)svg.append(el('line',{x1:p.from[0],y1:p.from[1],x2:sel.from[0],y2:sel.from[1],class:'parent-link'}));}
 for(const b of state.config.bones){
  const g=el('g');g.dataset.bone=b.name;g.classList.toggle('selected',b.name===state.selected);g.classList.toggle('grouped',state.multi.has(b.name));g.classList.toggle('custom',isCustom(b));
  const seg={x1:b.from[0],y1:b.from[1],x2:b.to[0],y2:b.to[1]};
  g.append(el('line',{...seg,class:'bone'}));const hit=el('line',{...seg,class:'hit'});hit.dataset.part='move';g.append(hit);
  const o=el('circle',{cx:b.from[0],cy:b.from[1],r:9,class:'origin'});o.dataset.part='from';const t=el('circle',{cx:b.to[0],cy:b.to[1],r:7,class:'tip'});t.dataset.part='to';g.append(o,t);
  if($('labels').checked){const text=el('text',{x:(b.from[0]+b.to[0])/2,y:(b.from[1]+b.to[1])/2-12,class:'label'});text.textContent=b.name;g.append(text);}
  svg.append(g);
 }
 const box=state.drag?.box;if(box){const [x0,y0]=box.start,[x1,y1]=box.end;svg.append(el('rect',{x:Math.min(x0,x1),y:Math.min(y0,y1),width:Math.abs(x1-x0),height:Math.abs(y1-y0),class:'marquee'}));}
 if(state.brush&&state.brushAt)svg.append(el('circle',{cx:state.brushAt[0],cy:state.brushAt[1],r:$('brushRadius').value,class:'brush-cursor'+(state.brush==='remove'?' remove':'')}));
}
function renderTree(){
 const list=$('tree');list.replaceChildren();const seen=new Set();
 const row=(b,depth,cls)=>{const r=document.createElement('button');r.type='button';r.className='row'+(b.name===state.selected?' active':'')+(state.multi.has(b.name)?' grouped':'')+cls;r.style.paddingLeft=(10+depth*14)+'px';r.textContent=b.name;r.onclick=e=>{if(e.shiftKey&&byName(b.name))toggleSelect(b.name);else selectOnly(b.name);render();};list.append(r);};
 const walk=(parent,depth)=>{for(const b of state.config.bones)if(b.parent===parent&&!seen.has(b.name)){seen.add(b.name);row(b,depth,isCustom(b)?' custom':'');walk(b.name,depth+1);}};
 walk('root',0);
 const orphans=state.config.bones.filter(b=>!seen.has(b.name));if(orphans.length){const h=document.createElement('small');h.textContent='FĂRĂ PĂRINTE VALID';list.append(h);orphans.forEach(b=>row(b,0,' custom'));}
 const generated=(state.rig?.bones||[]).filter(b=>b.name!=='root'&&!byName(b.name));
 if(generated.length){const h=document.createElement('small');h.textContent='GENERATE DE MERS';list.append(h);generated.forEach(b=>row(b,0,' generated'));}
}
function renderProps(){
 const b=byName(state.selected),form=$('props'),empty=$('propsEmpty');
 if(!b){form.hidden=true;empty.hidden=false;const g=rigBone(state.selected);empty.textContent=g?`${g.name}: os generat de scriptul de mers (părinte ${g.parent}); se definește în shaman-walk-layers.mjs, nu aici.`:'Alege un os din imagine sau din listă.';renderKeys();return;}
 form.hidden=false;empty.hidden=true;const custom=isCustom(b);
 $('groupNote').textContent=state.multi.size?`${state.multi.size+1} oase selectate (${group().join(', ')}): se mută și se rotesc împreună. Câmpurile de mai jos sunt pentru ${b.name}.`:'';
 if(document.activeElement!==$('pName'))$('pName').value=b.name;$('pName').readOnly=!custom;
 const parent=$('pParent'),blocked=descendants(b.name);parent.replaceChildren(new Option('root','root'));for(const other of state.config.bones)if(other.name!==b.name&&!blocked.has(other.name))parent.add(new Option(other.name,other.name));parent.value=b.parent;
 for(const [id,value]of [['pFromX',b.from[0]],['pFromY',b.from[1]],['pToX',b.to[0]],['pToY',b.to[1]]])if(document.activeElement!==$(id))$(id).value=Math.round(value);
 const dx=b.to[0]-b.from[0],dy=b.to[1]-b.from[1];$('pLength').textContent=Math.round(Math.hypot(dx,dy))+' px · '+Math.round(Math.atan2(-dy,dx)*180/Math.PI)+'°';
 $('customFields').hidden=!custom;$('lockedNote').hidden=custom;$('motionFields').hidden=false;
 const sway=b.sway||{};for(const [id,value]of [['pRadius',b.radius??40],['pAmp',sway.amplitude??0],['pCycles',sway.cycles??1],['pPhase',sway.phase??0]])if(document.activeElement!==$(id))$(id).value=value;
 renderKeys();
}
function renderKeys(){
 const b=byName(state.selected),box=$('keys'),ticks=$('ticks');box.replaceChildren();ticks.replaceChildren();if(!b)return;
 const anim=state.animation,label=state.player?.model?.animations.find(a=>a.name===anim)?.label||anim;$('keysAnim').textContent=label;
 $('keysNote').textContent=rigBone(b.name)?'':'Osul nu e încă în rig: apasă „Reconstruiește” ca să apară în previzualizare.';
 const keys=(b.keys??={})[anim]??=[];keys.sort((x,y)=>x.time-y.time);const {duration}=playhead();
 keys.forEach((k,i)=>{
  const row=document.createElement('div');row.className='key';
  const time=document.createElement('input');time.type='number';time.step='0.05';time.min='0';time.value=k.time;time.title='secunde';
  const angle=document.createElement('input');angle.type='number';angle.step='1';angle.value=k.angle;angle.title='grade';
  const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Șterge cadrul';
  time.oninput=()=>{if(Number.isFinite(Number(time.value))){k.time=Number(time.value);markDirty();refreshPreview();}};time.onchange=renderKeys;
  angle.oninput=()=>{if(Number.isFinite(Number(angle.value))){k.angle=Number(angle.value);markDirty();refreshPreview();}};
  del.onclick=()=>{snapshot();keys.splice(i,1);markDirty();renderKeys();refreshPreview();};
  row.append(time,angle,del);box.append(row);
  if(duration){const tick=document.createElement('button');tick.type='button';tick.dataset.time=k.time;tick.style.left=(k.time/duration*100)+'%';tick.title=k.time+' s · '+k.angle+'°';tick.onclick=()=>{setPaused(true);state.player.seek(k.time);};ticks.append(tick);}
 });
 if(!keys.length){const p=document.createElement('p');p.className='empty';p.textContent='Niciun cadru pentru această animație.';box.append(p);}
}
$('addKey').onclick=()=>{const b=byName(state.selected);if(!b)return;snapshot();const {time,duration,name,loop}=playhead();const keys=(b.keys??={})[state.animation]??=[];
 const t=Math.round(time*20)/20,angle=Math.round(customAngle(b,name,time,duration,loop)-customAngle({sway:b.sway},name,time,duration,loop));const existing=keys.find(k=>Math.abs(k.time-t)<.005);
 if(existing)existing.angle=angle;else keys.push({time:t,angle});markDirty();renderKeys();refreshPreview();};
// Brush strokes painted since the last build, replayed on the built weights with the build's own formula (applyPaint
// in build-shaman-reference.mjs) so the orange reacts while painting. Null when strokes were removed after the build.
function pendingPaint(){const now=state.config.paint||[],built=state.baked?.paint||[];if(built.length>now.length||JSON.stringify(now.slice(0,built.length))!==JSON.stringify(built))return null;return now.slice(built.length);}
const smoothstep=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
function replayPaint(ops,x,y,weights){
 for(const op of ops){const r=op.radius;let d=Infinity;for(const p of op.points)d=Math.min(d,(p[0]-x)**2+(p[1]-y)**2);d=Math.sqrt(d);if(d>=r)continue;const k=Math.max(0,Math.min(1,op.strength??1))*smoothstep((r-d)/(r*.5));if(k<=0)continue;
  if(op.mode==='add'){for(const n of weights.keys())weights.set(n,weights.get(n)*(1-k));weights.set(op.bone,(weights.get(op.bone)||0)+k);continue;}
  const own=weights.get(op.bone)||0;if(own<=0)continue;const b=byName(op.bone),heir=b&&b.parent!=='root'?b.parent:'body';weights.set(op.bone,own*(1-k));weights.set(heir,(weights.get(heir)||0)+own*k);}
}
// Fill each mesh triangle by how much its vertices follow the selected bone.
function renderHeat(){
 const canvas=$('heat'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 const rig=state.rig;if(!rig||!state.selected)return;const index=rig.bones.findIndex(b=>b.name===state.selected);if(index<0)return;
 const attachments=rig.skins[0].attachments,showMesh=$('mesh').checked,pending=pendingPaint()||[],ref=1280/state.W;
 // Only the layers the selected animation actually shows (slot attachment keys), so the orange matches the character.
 const animSlots=rig.animations[state.animation]?.slots||{},visible=new Set(rig.slots.map(s=>{const k=animSlots[s.name]?.attachment;return k?.length?k[0].name:s.attachment;}).filter(Boolean));
 let shown=0;
 $('brushCount').textContent=(state.config.paint||[]).filter(op=>op.bone===state.selected).length+' pensulări'+(pendingPaint()===null?' · reconstruiește pentru previzualizare exactă':'');
 for(const slot in attachments)for(const name in attachments[slot]){
  const mesh=attachments[slot][name];if(mesh.type!=='mesh'||!visible.has(name))continue;const walkLayer=name.startsWith('walk-');
  const page=walkLayer?state.pages.find(p=>p.name===name):{x0:0,y0:0,w:state.W,h:state.H};if(!page)continue;
  const n=mesh.uvs.length/2,pts=new Float32Array(n*2),weight=new Float32Array(n),brushed=slot==='art'&&pending.length;let vi=0;
  for(let v=0;v<n;v++){pts[v*2]=page.x0+mesh.uvs[v*2]*page.w;pts[v*2+1]=page.y0+mesh.uvs[v*2+1]*page.h;const count=mesh.vertices[vi++];
   if(!brushed){for(let j=0;j<count;j++,vi+=4)if(mesh.vertices[vi]===index)weight[v]+=mesh.vertices[vi+3];continue;}
   const all=new Map();for(let j=0;j<count;j++,vi+=4){const bn=rig.bones[mesh.vertices[vi]].name;all.set(bn,(all.get(bn)||0)+mesh.vertices[vi+3]);}
   replayPaint(pending,pts[v*2]*ref,pts[v*2+1]*ref,all);weight[v]=all.get(state.selected)||0;}
  ctx.lineWidth=1;ctx.strokeStyle='rgba(139,209,188,.35)';
  for(let t=0;t<mesh.triangles.length;t+=3){
   const [a,b,c]=[mesh.triangles[t],mesh.triangles[t+1],mesh.triangles[t+2]],k=(weight[a]+weight[b]+weight[c])/3;
   ctx.beginPath();ctx.moveTo(pts[a*2],pts[a*2+1]);ctx.lineTo(pts[b*2],pts[b*2+1]);ctx.lineTo(pts[c*2],pts[c*2+1]);ctx.closePath();
   if(k>.005){shown++;ctx.fillStyle=`rgba(255,160,40,${Math.min(.8,k*.8)})`;ctx.fill();}if(showMesh)ctx.stroke();
  }
 }
 state.heatEmpty=!shown;
}
function fitBoard(){const wrap=document.querySelector('.board-wrap'),availW=wrap.clientWidth-28,availH=wrap.clientHeight-28,ratio=state.W/state.H,w=Math.min(availW,availH*ratio);$('board').style.width=w+'px';$('board').style.height=(w/ratio)+'px';}

// ---- pieces ----
const DEFAULT_HEAD_POLYGON=[[355,0],[1060,0],[1060,510],[850,535],[835,587],[710,565],[570,490],[375,455],[350,300]];
function renderParts(){
 const list=$('partList');list.replaceChildren();
 for(const [name,part]of Object.entries(parts())){const row=document.createElement('div');row.className='row part-row'+(name===state.part?' active':'')+(part.enabled?'':' off');
  const check=document.createElement('input');check.type='checkbox';check.checked=part.enabled;check.title='Activă';check.onclick=e=>{e.stopPropagation();snapshot();part.enabled=check.checked;markDirty();render();};
  const label=document.createElement('span');label.textContent=`${name} · ${part.bone||'head'}${part.polygon.length<3?' · fără contur':''}`;row.append(check,label);row.onclick=()=>{state.part=name;state.drawing=null;render();showHidden();};list.append(row);}
 if(!Object.keys(parts()).length){const p=document.createElement('p');p.className='empty';p.textContent='Nicio piesă: tot personajul e o singură pictură.';list.append(p);}
 const part=currentPart();$('partFields').hidden=!part;$('drawPart').disabled=!part;$('drawPart').classList.toggle('active',!!state.drawing);
 if(!part)return;
 if(document.activeElement!==$('partName'))$('partName').value=state.part;
 const bone=$('partBone');bone.replaceChildren();for(const b of state.config.bones)bone.add(new Option(b.name+(b.custom?' (nou)':''),b.name));bone.value=part.bone||'head';
 if(document.activeElement!==$('partFeather'))$('partFeather').value=part.feather??10;if(document.activeElement!==$('partReach'))$('partReach').value=part.reach??120;
}
function renamePart(from,to){const old=parts(),next={};for(const [k,v]of Object.entries(old))next[k===from?to:k]=v;state.config.parts=next;state.part=to;}
$('addPart').onclick=()=>{snapshot();let i=1;while(parts()['piesa'+i])i++;const name=!parts().head&&!Object.keys(parts()).length?'head':'piesa'+i;const bone=byName(state.selected)?.name||'head';
 parts()[name]={enabled:true,bone,polygon:name==='head'?DEFAULT_HEAD_POLYGON.map(p=>[...p]):[],feather:10,reach:120};state.part=name;markDirty();render();if(name!=='head')startDrawing();};
function startDrawing(){if(!currentPart())return;state.drawing=[];$('board').classList.add('drawing');$('hint').textContent='Click pe imagine pentru fiecare colț al piesei „'+state.part+'”; dublu-click sau Enter la final, Escape renunță.';render();}
function finishDrawing(cancel=false){const part=currentPart(),pts=state.drawing;state.drawing=null;$('board').classList.remove('drawing');$('hint').textContent=defaultHint;
 if(part&&!cancel&&pts&&pts.length>=3){snapshot();part.polygon=pts;markDirty();}else if(part&&part.polygon.length<3&&!cancel){log('Conturul are nevoie de cel puțin 3 puncte.');}
 render();}
$('drawPart').onclick=()=>state.drawing?finishDrawing():startDrawing();
$('partName').onchange=()=>{const part=currentPart(),name=$('partName').value.trim();if(!part)return;if(name===state.part)return;
 if(!/^[a-z][a-z0-9]{0,29}$/.test(name)||parts()[name]){log('Nume de piesă invalid sau folosit: '+name);$('partName').value=state.part;return;}
 snapshot();renamePart(state.part,name);if(name==='head'&&part.polygon.length<3)part.polygon=DEFAULT_HEAD_POLYGON.map(p=>[...p]);markDirty();render();};
$('partBone').onchange=()=>{const part=currentPart();if(!part)return;snapshot();part.bone=$('partBone').value;markDirty();render();};
for(const [id,key]of [['partFeather','feather'],['partReach','reach']])$(id).oninput=()=>{const part=currentPart(),v=Number($(id).value);if(part&&Number.isFinite(v)){part[key]=v;markDirty();}};
$('partFields').addEventListener('focusin',e=>{if(e.target.matches('input'))snapshot();});
$('deletePart').onclick=()=>{if(!currentPart())return;snapshot();delete parts()[state.part];state.part=null;state.drawing=null;markDirty();render();};

// ---- editing on the picture ----
const svg=$('overlay');
const toSpec=e=>{const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());return [Math.round(p.x),Math.round(p.y)];};
// ---- weight brush ----
function setBrush(mode){state.brush=state.brush===mode?null:mode;$('brushAdd').classList.toggle('active',state.brush==='add');$('brushRemove').classList.toggle('active',state.brush==='remove');$('board').classList.toggle('painting',!!state.brush);
 $('hint').textContent=state.brush?`Pensulă ${state.brush==='add'?'Adaugă':'Șterge'} pe „${state.selected}”: pictează pe referință. Escape oprește pensula.`:defaultHint;renderOverlay();}
$('brushAdd').onclick=()=>setBrush('add');$('brushRemove').onclick=()=>setBrush('remove');
$('brushRadius').oninput=renderOverlay;
$('brushClear').onclick=()=>{const name=state.selected,ops=state.config.paint||[];if(!ops.some(op=>op.bone===name))return;snapshot();state.config.paint=ops.filter(op=>op.bone!==name);markDirty();renderHeat();};
let heatQueued=false;const queueHeat=()=>{if(heatQueued)return;heatQueued=true;requestAnimationFrame(()=>{heatQueued=false;renderHeat();});};
svg.addEventListener('pointerleave',()=>{if(state.brushAt){state.brushAt=null;renderOverlay();}});
svg.onpointerdown=e=>{
 const p=toSpec(e);
 if(state.brush&&byName(state.selected)){snapshot();const op={bone:state.selected,mode:state.brush,radius:Number($('brushRadius').value),strength:Number($('brushStrength').value),points:[p]};(state.config.paint??=[]).push(op);state.drag={stroke:op};svg.setPointerCapture(e.pointerId);markDirty();queueHeat();return;}
 if(state.drawing){if(e.detail>1)return;state.drawing.push(p);renderOverlay();return;}
 if(state.adding){snapshot();const parent=byName(state.selected)?state.selected:'root',name=uniqueName('os');state.config.bones.push({name,parent,from:p,to:[...p],custom:true,radius:40,sway:{amplitude:0,cycles:1,phase:0},keys:{}});state.selected=name;state.drag={name,part:'to',start:p,from:p,to:[...p]};svg.setPointerCapture(e.pointerId);setAdding(false);markDirty();render();return;}
 if(e.target.dataset.vertex!==undefined||e.target.dataset.insert!==undefined){const poly=currentPart().polygon;snapshot();let index=Number(e.target.dataset.vertex);if(e.target.dataset.insert!==undefined){index=Number(e.target.dataset.insert);poly.splice(index,0,p);}state.drag={vertex:index,start:p,at:[...poly[index]]};svg.setPointerCapture(e.pointerId);markDirty();renderOverlay();return;}
 const g=e.target.closest('g[data-bone]');
 if(!g){state.drag={box:{start:p,end:p,additive:e.shiftKey}};svg.setPointerCapture(e.pointerId);return;}
 const name=g.dataset.bone,part=e.target.dataset.part;
 if(e.shiftKey){toggleSelect(name);render();return;}
 if(name!==state.selected&&!state.multi.has(name))selectOnly(name);else if(name!==state.selected){state.multi.delete(name);state.multi.add(state.selected);state.selected=name;}
 if(part){snapshot();const b=byName(name),together=state.multi.size&&part!=='to'; // a group moves whole; a tip always moves alone
  state.drag={name,part,start:p,from:[...b.from],to:[...b.to],items:together?group().map(n=>{const x=byName(n);return {b:x,from:[...x.from],to:[...x.to]};}):null};svg.setPointerCapture(e.pointerId);}
 render();
};
svg.ondblclick=()=>{if(state.drawing)finishDrawing();};
svg.onpointermove=e=>{
 const p=toSpec(e);$('coords').textContent=p[0]+', '+p[1];if(state.brush){state.brushAt=p;renderOverlay();}const d=state.drag;if(!d)return;
 if(d.stroke){const last=d.stroke.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])>=Math.max(2,d.stroke.radius*.3)){d.stroke.points.push(p);queueHeat();}return;}
 if(d.box){d.box.end=p;renderOverlay();return;}
 const dx=p[0]-d.start[0],dy=p[1]-d.start[1];
 if(d.vertex!==undefined){currentPart().polygon[d.vertex]=[d.at[0]+dx,d.at[1]+dy];markDirty();renderOverlay();return;}
 if(d.items){for(const it of d.items){it.b.from=[it.from[0]+dx,it.from[1]+dy];it.b.to=[it.to[0]+dx,it.to[1]+dy];}markDirty();renderOverlay();renderProps();return;}
 const b=byName(d.name);if(d.part!=='to')b.from=[d.from[0]+dx,d.from[1]+dy];if(d.part!=='from')b.to=[d.to[0]+dx,d.to[1]+dy];
 markDirty();renderOverlay();renderProps();
};
svg.onpointerup=svg.onpointercancel=()=>{
 const box=state.drag?.box;state.drag=null;if(!box)return;
 // Marquee: bones whose midpoint lies inside; Shift adds to the selection; a plain click on empty space clears it.
 const [x0,y0]=box.start,[x1,y1]=box.end,lx=Math.min(x0,x1),hx=Math.max(x0,x1),ly=Math.min(y0,y1),hy=Math.max(y0,y1);
 const hit=state.config.bones.filter(b=>{const mx=(b.from[0]+b.to[0])/2,my=(b.from[1]+b.to[1])/2;return mx>=lx&&mx<=hx&&my>=ly&&my<=hy;}).map(b=>b.name);
 if(!box.additive){state.selected=null;state.multi.clear();}
 for(const n of hit)if(n!==state.selected&&!state.multi.has(n)){if(state.selected)state.multi.add(n);else state.selected=n;}
 render();
};
svg.oncontextmenu=e=>{if(e.target.dataset.vertex===undefined)return;e.preventDefault();const poly=currentPart().polygon;if(poly.length<=3)return;snapshot();poly.splice(Number(e.target.dataset.vertex),1);markDirty();renderOverlay();renderParts();};
const defaultHint='Stânga: unde stă osul (trage de cercuri; Shift+click sau dreptunghi = mai multe oase). Dreapta: cum se mișcă (trage pe personaj).';
function setAdding(value){state.adding=value;$('board').classList.toggle('adding',value);$('add').classList.toggle('active',value);$('hint').textContent=value?'Apasă pe imagine unde începe osul și trage până la vârf. Părinte: '+(byName(state.selected)?state.selected:'root'):defaultHint;}
$('add').onclick=()=>setAdding(!state.adding);
$('undo').onclick=undo;$('labels').onchange=renderOverlay;$('mesh').onchange=renderHeat;

// ---- property form ----
$('props').addEventListener('focusin',e=>{if(e.target.matches('input,select'))snapshot();});
function edit(fn,{reprops=false}={}){const b=byName(state.selected);if(!b)return;fn(b);markDirty();renderOverlay();renderTree();refreshPreview();if(reprops)renderProps();else{const dx=b.to[0]-b.from[0],dy=b.to[1]-b.from[1];$('pLength').textContent=Math.round(Math.hypot(dx,dy))+' px · '+Math.round(Math.atan2(-dy,dx)*180/Math.PI)+'°';}}
const num=id=>Number($(id).value);
for(const [id,apply]of [['pFromX',b=>b.from[0]=num('pFromX')],['pFromY',b=>b.from[1]=num('pFromY')],['pToX',b=>b.to[0]=num('pToX')],['pToY',b=>b.to[1]=num('pToY')],['pRadius',b=>b.radius=Math.max(1,num('pRadius')||40)],['pAmp',b=>(b.sway??={}).amplitude=num('pAmp')],['pCycles',b=>(b.sway??={}).cycles=num('pCycles')],['pPhase',b=>(b.sway??={}).phase=num('pPhase')]])$(id).oninput=()=>{if(Number.isFinite(num(id)))edit(apply);};
$('pParent').onchange=()=>edit(b=>b.parent=$('pParent').value,{reprops:true});
$('pName').onchange=()=>{const b=byName(state.selected),name=$('pName').value.trim();if(!b||!isCustom(b))return;
 if(!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(name)||name==='root'||(name!==b.name&&(byName(name)||rigBone(name)))){log('Nume invalid sau deja folosit: '+name);$('pName').value=b.name;return;}
 edit(x=>{for(const other of state.config.bones)if(other.parent===x.name)other.parent=name;for(const part of Object.values(parts()))if(part.bone===x.name)part.bone=name;x.name=name;state.selected=name;},{reprops:true});renderParts();};
$('delete').onclick=()=>{const b=byName(state.selected);if(!b||!isCustom(b))return;snapshot();for(const other of state.config.bones)if(other.parent===b.name)other.parent=b.parent;for(const part of Object.values(parts()))if(part.bone===b.name)part.bone=b.parent==='root'?'head':b.parent;state.config.bones.splice(state.config.bones.indexOf(b),1);state.selected=null;markDirty();render();refreshPreview();};
$('aiPrompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('aiAnimate').click();}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(state.drawing&&e.key==='Enter'){finishDrawing();return;}if(state.drawing&&e.key==='Escape'){finishDrawing(true);return;}
 if(e.key==='Delete'||e.key==='Backspace'){if(isCustom(byName(state.selected)))$('delete').onclick();}else if(e.key==='Escape'){setAdding(false);if(state.brush)setBrush(state.brush);if(state.multi.size){state.multi.clear();render();}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}else if(e.key===' '){e.preventDefault();setPaused(!state.paused);}});

// ---- save / build / validate ----
async function save(){
 const r=await fetch('/api/bones',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.config)}),text=await r.text();
 if(!r.ok){log('Salvare refuzată: '+text);setStatus('Eroare la salvare');return false;}
 state.dirty=false;$('save').disabled=true;setStatus('Salvat în source/verdant-shaman/bones.json');loadVersions();return true;
}
async function run(task,options){
 const r=await fetch('/api/run/'+task,{method:'POST',headers:{'Content-Type':'application/json'},body:options?JSON.stringify(options):undefined});if(!r.ok){log(await r.text());return false;}
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',last='';
 for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){log(line);last=line;}}
 if(buffer){log(buffer);last=buffer;}return /^\[exit 0\]/.test(last);
}
async function busy(label,fn){if(state.busy)return;state.busy=true;for(const id of ['save','build','validate'])$(id).disabled=true;setStatus(label);try{await fn();}catch(error){log(String(error));setStatus('Eroare');}finally{state.busy=false;$('build').disabled=$('validate').disabled=false;$('save').disabled=!state.dirty;}}
async function reloadBuilt(){state.model=(await fetch('/manifest.json').then(r=>r.json())).models.find(m=>m.id===MODEL);await loadRig();await loadPlayer();render();}
$('save').onclick=()=>busy('Se salvează…',save);
$('build').onclick=()=>busy('Se reconstruiește rigul (≈35 s)…',async()=>{
 if(state.dirty&&!await save())return;const ok=await run('build');
 if(!ok){setStatus('Reconstrucția a eșuat (vezi jurnalul)');return;}
 await reloadBuilt();setStatus('Rig reconstruit · '+state.rig.bones.length+' oase');
});
$('validate').onclick=()=>busy('Se validează…',async()=>{const ok=await run('validate');setStatus(ok?'Validare reușită':'Validarea a găsit probleme (vezi jurnalul)');});
window.addEventListener('beforeunload',e=>{if(state.dirty)e.preventDefault();});

// ---- AI (served by scripts/ai.mjs; the key never reaches the page) ----
let aiEnabled=false;
async function aiStatus(){const s=await fetch('/api/ai/status').then(r=>r.ok?r.json():null).catch(()=>null);aiEnabled=!!s?.enabled;
 $('aiStatus').textContent=!s?'AI indisponibil: repornește serverul (npm start).':s.enabled?`Activ · ${s.textModel} (text) · ${s.imageModel} (imagini)`:'Lipsește OPEN_AI_KEY în rig-lab/.env.';
 for(const id of ['aiAnimate','aiSegment','aiFill'])$(id).disabled=!aiEnabled;}
async function aiCall(task,body,button,label){
 if(!aiEnabled)return null;button.classList.add('working');const text=button.textContent;button.textContent='✨ Se lucrează…';setStatus(label);
 try{const r=await fetch('/api/ai/'+task,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),out=await r.text();if(!r.ok){log('AI: '+out);setStatus('AI: '+out.slice(0,80));return null;}return JSON.parse(out);}
 catch(error){log('AI: '+error.message);setStatus('AI indisponibil');return null;}finally{button.classList.remove('working');button.textContent=text;}
}
$('aiAnimate').onclick=async()=>{
 const prompt=$('aiPrompt').value.trim();if(!prompt){$('aiPrompt').focus();return;}const anim=state.animation,only=$('aiOnlySelected').checked?group():null;
 const result=await aiCall('animate',{prompt,animation:anim,config:state.config,only},$('aiAnimate'),'AI compune animația…');if(!result)return;
 snapshot();for(const [bone,keys]of Object.entries(result.keys)){const b=byName(bone);if(b)(b.keys??={})[anim]=keys;}
 const risky=Object.entries(result.peaks).filter(([bone,peak])=>peak>(/^tail/.test(bone)?10:/Leg|Foot/.test(bone)?12:15));
 log(`AI (${result.model}): ${result.note||'cadre propuse'} · oase: ${Object.keys(result.keys).join(', ')}`);
 if(risky.length)log('Atenție, unghiuri mari (se poate plia pictura): '+risky.map(([b,p])=>b+' '+p+'°').join(', '));
 const first=Object.keys(result.keys)[0];if(first&&!byName(state.selected)?.keys?.[anim]?.length)selectOnly(first);
 markDirty();render();setPaused(false);setStatus('AI a pus cadre pe '+Object.keys(result.keys).length+' oase · Anulează le scoate');
};
$('aiSegment').onclick=async()=>{
 const part=currentPart();if(!part)return;const what=$('aiWhat').value.trim()||state.part;
 const result=await aiCall('segment',{what},$('aiSegment'),'AI caută conturul…');if(!result)return;
 snapshot();part.polygon=result.polygon;markDirty();render();log(`AI (${result.model}): ${result.note||'contur propus'} · ${result.polygon.length} puncte`);setStatus('Contur propus de AI: corectează-l trăgând de puncte');
};
async function showHidden(){const name=state.part;if(!name){$('aiHidden').hidden=true;return;}const r=await fetch('/api/ai/hidden/'+name,{method:'GET'}).catch(()=>null);
 if(!r?.ok||name!==state.part){$('aiHidden').hidden=true;return;}$('aiHiddenImg').src=URL.createObjectURL(await r.blob());$('aiHidden').hidden=false;}
$('aiFill').onclick=async()=>{
 const name=state.part;if(!name)return;if(!state.baked?.parts?.[name]?.enabled){log(`Piesa „${name}” nu e în rig: activeaz-o, apasă „Reconstruiește”, apoi pictează ce e în spate.`);return;}
 const result=await aiCall('fill',{part:name},$('aiFill'),'AI pictează ce e în spatele piesei (≈30–60 s)…');if(!result)return;
 log(`AI (${result.model}) a scris ${result.file}. Apasă „Reconstruiește” ca să-l folosească.`);setStatus('Pictura din spate e gata · apasă „Reconstruiește”');showHidden();
};
$('aiHiddenRemove').onclick=async()=>{const name=state.part;if(!name)return;await fetch('/api/ai/hidden/'+name,{method:'DELETE'});log(`hidden-${name}.png mutat în istoric; la reconstrucție se folosește umplerea automată.`);showHidden();};
aiStatus();

// ---- versions ----
async function loadVersions(){
 const list=$('versionList');list.replaceChildren();const v=await fetch('/api/versions').then(r=>r.ok?r.json():{history:[]}).catch(()=>({history:[]}));
 for(const f of v.history){const m=f.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/),when=m?new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`):null;list.add(new Option(when&&!isNaN(when)?when.toLocaleString('ro-RO'):f,f));}
 if(!v.history.length)list.add(new Option('(nicio salvare încă)',''));$('restoreOriginal').disabled=!v.original;
}
async function restore(name){
 const r=await fetch('/api/versions/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!r.ok){log('Revenire refuzată: '+await r.text());return;}
 snapshot();state.config=await fetch('/api/bones').then(r=>r.json());state.dirty=false;$('save').disabled=true;state.selected=null;state.part=null;state.drawing=null;render();refreshPreview();await loadVersions();
 setStatus('Oasele au revenit la '+(name==='original'?'original':'versiunea aleasă')+' · apasă „Reconstruiește” ca să refaci rigul');
}
$('restoreVersion').onclick=()=>{const name=$('versionList').value;if(name)busy('Se revine…',()=>restore(name));};
$('restoreOriginal').onclick=()=>busy('Se revine la original…',()=>restore('original'));
loadVersions();

// ---- start ----
try{
 const catalog=await fetch('/manifest.json').then(r=>r.json());state.model=catalog.models.find(m=>m.id===MODEL);if(!state.model)throw new Error('Verdant Shaman lipsește din manifest; rulează npm run build.');
 state.config=await fetch('/api/bones').then(r=>{if(!r.ok)throw new Error('Serverul nu expune /api/bones; pornește-l cu npm start.');return r.json();});
 const ref=state.model.reference;state.W=ref.width;state.H=ref.height;$('refimg').src=ref.image;$('heat').width=state.W;$('heat').height=state.H;
 new ResizeObserver(fitBoard).observe(document.querySelector('.board-wrap'));fitBoard();
 await loadRig();render();await loadPlayer();setStatus(state.config.bones.length+' oase editabile · '+state.rig.bones.length+' în rig');
}catch(error){setStatus(error.message);log(String(error));}
