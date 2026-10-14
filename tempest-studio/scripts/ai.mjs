// OpenAI helpers for the bone editor (served by serve.mjs). The key is read from rig-lab/.env (OPEN_AI_KEY or
// OPENAI_API_KEY) on the server only; nothing here is sent to the browser except results.
import fs from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import {customAngle} from '../public/custom-motion.js';

export function createAi(root,dirs={}){
 const envFile=path.join(root,'..','.env'),source=dirs.source||path.join(root,'source/verdant-shaman'),models=dirs.models||path.join(root,'public/models/verdant-shaman');
 async function env(){
  const text=await fs.readFile(envFile,'utf8').catch(()=>''),vars={};
  for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(m)vars[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}
  return {key:process.env.OPENAI_API_KEY||vars.OPEN_AI_KEY||vars.OPENAI_API_KEY||'',text:vars.OPENAI_TEXT_MODEL||'gpt-5.5',image:vars.OPENAI_IMAGE_MODEL||'gpt-image-2'};
 }
 async function call(url,init,key){
  const r=await fetch('https://api.openai.com/v1/'+url,{...init,headers:{Authorization:'Bearer '+key,...init.headers}});const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(`OpenAI ${r.status}: ${body.error?.message||'răspuns invalid'}`);return body;
 }
 async function chatJson(cfg,system,content){
  const body=await call('chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:cfg.text,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content}]})},cfg.key);
  const text=body.choices?.[0]?.message?.content;try{return JSON.parse(text);}catch{throw Error('Modelul nu a răspuns cu JSON valid.');}
 }
 const referenceDataUrl=async()=>'data:image/png;base64,'+(await fs.readFile(path.join(source,'reference.png'))).toString('base64');

 async function status(){const cfg=await env();return {enabled:!!cfg.key,textModel:cfg.text,imageModel:cfg.image};}

 // Keyframes from a description. Returns {keys:{bone:[{time,angle}]}, note} for the requested animation; angles add to
 // the motion already in the rig, like the editor's own keys.
 async function animate({prompt,animation,durations,config,only}){
  const cfg=await env();if(!cfg.key)throw Error('Lipsește OPEN_AI_KEY în rig-lab/.env.');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)throw Error('Descrie mișcarea (max 2000 de caractere).');
  const duration=Number(durations?.[animation]);if(!Number.isFinite(duration)||duration<=0)throw Error('Animație necunoscută: '+animation);
  const names=new Set(config.bones.map(b=>b.name)),allowed=Array.isArray(only)&&only.length?only.filter(n=>names.has(n)):[...names];
  const loop=animation!=='attack';
  const rig=config.bones.map(b=>{const existing=(b.keys?.[animation]||[]).map(k=>`${k.time}s:${k.angle}°`).join(' ');return `${b.name} (parent ${b.parent}${b.custom?', added by the user':''}): from ${b.from.join(',')} to ${b.to.join(',')}${existing?'; current keys '+existing:''}`;}).join('\n');
  const system=`You animate a 2D Spine rig of a painted character (a green triceratops shaman holding a staff, facing right).
Bones are drawn on a 1280x1280 reference: x grows to the right, y grows DOWN. "from" is the joint, "to" the tip.
Each key is {"time": seconds, "angle": degrees} and is ADDED to the motion already in the rig (breathing, walking, the staff attack); 0 means "as now".
A positive angle turns the bone counter-clockwise on screen (a tail pointing left swings DOWN with positive angles, UP with negative ones; the head facing right tilts up with positive angles).
Children inherit their parent's rotation, so rotating tail1 also carries tail2 and tail3.
The character is a single painting, so large rotations tear or fold the skin. Stay within: head ±15°, tail bones ±10° each, legs and feet ±12°, arms ±15°, chest/body ±5°, small accessories ±20°.
The "${animation}" animation lasts ${duration} s and ${loop?'loops: make the last key flow back into the first (or leave the start and end at the same angle)':'plays once: start and end at 0'}.
Use a few keys per bone (2–6), times within 0..${duration}. Only animate bones from this list: ${allowed.join(', ')}.
Answer ONLY with JSON: {"keys": {"<bone>": [{"time": number, "angle": number}, ...]}, "note": "<one short sentence in Romanian about what you did>"}.`;
  const answer=await chatJson(cfg,system,`Bones:\n${rig}\n\nRequest for "${animation}": ${prompt.trim()}`);
  const keys={};
  for(const [bone,list]of Object.entries(answer.keys||{})){
   if(!allowed.includes(bone)||!Array.isArray(list))continue;
   const clean=list.filter(k=>Number.isFinite(k?.time)&&Number.isFinite(k?.angle)).map(k=>({time:Math.round(Math.min(duration,Math.max(0,k.time))*100)/100,angle:Math.round(Math.max(-45,Math.min(45,k.angle))*10)/10})).slice(0,12);
   if(clean.length)keys[bone]=clean.sort((a,b)=>a.time-b.time);
  }
  if(!Object.keys(keys).length)throw Error('Modelul nu a propus niciun cadru pentru oasele permise.');
  // Peak added angle per bone, so the editor can warn before a rebuild.
  const peaks=Object.fromEntries(Object.entries(keys).map(([bone,list])=>{let m=0;for(let i=0;i<=60;i++)m=Math.max(m,Math.abs(customAngle({keys:{[animation]:list}},animation,duration*i/60,duration,loop)));return [bone,Math.round(m*10)/10];}));
  return {keys,peaks,note:typeof answer.note==='string'?answer.note.slice(0,300):'',model:cfg.text};
 }

 // Outline of a named region (an eye, a horn, a flap) as a polygon in 1280-space; the user corrects it in the editor.
 async function segment({what}){
  const cfg=await env();if(!cfg.key)throw Error('Lipsește OPEN_AI_KEY în rig-lab/.env.');
  if(typeof what!=='string'||!what.trim()||what.length>200)throw Error('Spune ce să decupeze.');
  const system=`You locate parts of a painted character on its reference image for cutting them out as separate layers.
Coordinates: the image is treated as 1280x1280, x from the left edge, y from the TOP edge.
Return a tight closed outline (12–40 points, clockwise) around the requested part only, following its painted silhouette, including its dark outline stroke but no background.
Answer ONLY with JSON: {"polygon": [[x,y], ...], "found": true|false, "note": "<one short sentence in Romanian>"}.`;
  const answer=await chatJson(cfg,system,[{type:'text',text:'Part to outline: '+what.trim()},{type:'image_url',image_url:{url:await referenceDataUrl(),detail:'high'}}]);
  const polygon=(answer.polygon||[]).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(([x,y])=>[Math.round(Math.max(0,Math.min(1280,x))),Math.round(Math.max(0,Math.min(1280,y)))]).slice(0,100);
  if(answer.found===false||polygon.length<3)throw Error(answer.note||'Modelul nu a găsit partea cerută.');
  return {polygon,note:typeof answer.note==='string'?answer.note.slice(0,300):'',model:cfg.text};
 }

 // Paint what is hidden behind a piece: the reference plus a mask of the piece's hole (from the last build) go to the
 // image-edit endpoint; the result becomes source/verdant-shaman/hidden-<part>.png (the previous one is kept in history).
 async function fill({part,description}){
  const cfg=await env();if(!cfg.key)throw Error('Lipsește OPEN_AI_KEY în rig-lab/.env.');
  if(typeof part!=='string'||!/^[a-z][a-z0-9]{0,29}$/.test(part))throw Error('Piesă invalidă.');
  const holeFile=path.join(models,part+'-hole.png');let hole;try{hole=PNG.sync.read(await fs.readFile(holeFile));}catch{throw Error(`Nu există golul piesei „${part}”: activează piesa și apasă „Reconstruiește” întâi.`);}
  const reference=PNG.sync.read(await fs.readFile(path.join(source,'reference.png')));if(reference.width!==hole.width||reference.height!==hole.height)throw Error('Golul nu corespunde referinței; reconstruiește.');
  // The API repaints the transparent pixels of the mask. Grow the hole a little so the new paint overlaps the cut edge.
  const W=hole.width,H=hole.height,grow=new Uint8Array(W*H),r=6;let holePixels=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(hole.data[(y*W+x)*4+3]){holePixels++;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&dx*dx+dy*dy<=r*r)grow[yy*W+xx]=1;}}
  if(!holePixels)throw Error(`Piesa „${part}” nu lasă niciun gol de umplut.`);
  const mask=new PNG({width:W,height:H});for(let i=0;i<W*H;i++){mask.data[i*4+3]=grow[i]?0:255;}
  // Show the painting with the piece already lifted off; otherwise the model sees e.g. the head and repaints a face.
  const cut=await fs.readFile(path.join(models,part+'-cut.png')).then(b=>PNG.sync.read(b),()=>null),image=new PNG({width:W,height:H});reference.data.copy(image.data);
  if(cut)for(let i=0;i<W*H;i++)if(cut.data[i*4+3]&&!grow[i])image.data.fill(0,i*4,i*4+4);
  for(let i=0;i<W*H;i++)if(grow[i])image.data.fill(0,i*4,i*4+4);
  const form=new FormData();form.append('model',cfg.image);form.append('image',new Blob([PNG.sync.write(image)],{type:'image/png'}),'reference.png');form.append('mask',new Blob([PNG.sync.write(mask)],{type:'image/png'}),'mask.png');
  form.append('prompt',`This painted game character has had its "${part}" cut off; that region is now empty. Paint ONLY the masked area as the surface that lies underneath the removed ${part}: extend the neighbouring body, skin, scales, clothing and shading into it seamlessly, in exactly the same painting style, colours and line weight. It must look like the part of the body that was hidden, never like the ${part} itself: no eyes, mouth, face, horns or new objects, no text. ${typeof description==='string'?description.slice(0,500):''}`);
  form.append('size','1024x1024');form.append('n','1');
  const body=await call('images/edits',{method:'POST',body:form},cfg.key),b64=body.data?.[0]?.b64_json;if(!b64)throw Error('Modelul nu a returnat o imagine.');
  const target=path.join(source,`hidden-${part}.png`),history=path.join(source,'history');
  await fs.mkdir(history,{recursive:true});await fs.copyFile(target,path.join(history,`hidden-${part}-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.png`)).catch(()=>{});
  await fs.writeFile(target,Buffer.from(b64,'base64'));
  return {file:`source/verdant-shaman/hidden-${part}.png`,model:cfg.image};
 }
 async function hidden(part){if(!/^[a-z][a-z0-9]{0,29}$/.test(part))return null;return fs.readFile(path.join(source,`hidden-${part}.png`)).catch(()=>null);}
 async function removeHidden(part){if(!/^[a-z][a-z0-9]{0,29}$/.test(part))return false;const file=path.join(source,`hidden-${part}.png`),history=path.join(source,'history');
  try{await fs.mkdir(history,{recursive:true});await fs.rename(file,path.join(history,`hidden-${part}-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.png`));return true;}catch{return false;}}
 return {status,animate,segment,fill,hidden,removeHidden};
}
