import {createDinosaurPlayer} from './runtime/dinosaur-runtime.js';
const $=id=>document.getElementById(id),catalog=await fetch('/manifest.json').then(r=>r.json()),params=new URLSearchParams(location.search),requested=params.get('species'),requestedModel=catalog.models.find(m=>m.id===requested)||catalog.models[0],baseId=requestedModel.baseSpecies||requestedModel.id,variants=catalog.models.filter(m=>(m.baseSpecies||m.id)===baseId),model=variants.find(m=>(m.stage||'adult')===params.get('stage'))||requestedModel;
const speciesSelect=document.createElement('select');speciesSelect.id='species';speciesSelect.setAttribute('aria-label','Specie');
const species=new Map();catalog.models.forEach(m=>{const base=m.baseSpecies||m.id;if(!species.has(base)||m.id===base)species.set(base,m);});
species.forEach((m,id)=>speciesSelect.add(new Option(variants.length>1&&id===baseId?(variants.find(v=>v.stage)?.name.split(' - ')[0]||m.name):m.name,id)));speciesSelect.value=baseId;
speciesSelect.onchange=()=>{const url=new URL(location.href);url.searchParams.set('species',speciesSelect.value);url.searchParams.delete('stage');location.assign(url);};document.querySelector('header').append(speciesSelect);
if(variants.length>1){const stageSelect=document.createElement('select');stageSelect.id='age';stageSelect.setAttribute('aria-label','Varsta');for(const [value,label] of [['pui','Copil'],['juvenil','Juvenil'],['adult','Adult']])if(variants.some(m=>(m.stage||'adult')===value))stageSelect.add(new Option(label,value));stageSelect.value=model.stage||'adult';stageSelect.onchange=()=>{const url=new URL(location.href);url.searchParams.set('species',baseId);url.searchParams.set('stage',stageSelect.value);location.assign(url);};document.querySelector('header').append(stageSelect);}
document.querySelector('.tabs > span').textContent='Model animat - '+(model.stageLabel||'Adult');
document.title=model.name+' · Rig Studio';document.querySelector('header small').textContent='RIG LAB / '+model.id.toUpperCase();document.querySelector('h1').textContent=model.name;
const reference=model.reference||{image:'',width:0,height:0,origin:[0,0]};
$('reference').querySelector('img').src=reference.image;$('reference').querySelector('img').alt=model.name+' · original';
document.querySelector('.explanation strong').textContent=model.description||'Gât stabil. Bătaie comună.';
if(model.explanation)document.querySelector('.explanation p').textContent=model.explanation;
document.querySelector('label:has(#mesh)').lastChild.textContent=' Arată plasa';
const downloads=[...document.querySelectorAll('aside a')];downloads[0].href=model.skeleton;downloads[1].href=model.atlas;
let player,paused=false,isSetup=false,current='idle';
const controls=[...document.querySelectorAll('aside button,aside input,aside select')];controls.forEach(c=>c.disabled=true);
function setPaused(value){paused=value;player?.setPaused(value);$('pause').textContent=value?'▶ Continuă':'Ⅱ Pauză';}
function setAnimation(name){if(!player?.loaded)return;isSetup=false;current=name;player.setAnimation(name);player.setLoop($('loop').checked);setPaused(false);document.querySelectorAll('[data-animation]').forEach(b=>b.classList.toggle('active',b.dataset.animation===name));$('phase').textContent=model.animations.find(a=>a.name===name).label;}
model.animations.forEach(a=>{const b=document.createElement('button');b.textContent=a.label;b.dataset.animation=a.name;b.onclick=()=>setAnimation(a.name);if(a.name===current)b.classList.add('active');$('animations').append(b);b.disabled=true;controls.push(b);});
$('pause').onclick=()=>isSetup?setAnimation(current):setPaused(!paused);
$('restart').onclick=()=>setAnimation(current);
$('speed').onchange=()=>player.setSpeed(Number($('speed').value));
$('loop').onchange=()=>player.setLoop($('loop').checked);
$('view').onchange=()=>player.setBones($('view').value!=='art',$('view').value==='skeleton');
$('mesh').onchange=()=>{player.raw.config.debug.meshHull=$('mesh').checked;player.raw.config.debug.meshTriangles=$('mesh').checked;player.raw.drawFrame(false);};
$('scrub').oninput=()=>{if(isSetup){player.setAnimation(current);isSetup=false;}player.seek(Number($('scrub').value));setPaused(true);};
$('setup').onclick=()=>{setPaused(true);isSetup=true;const raw=player.raw;raw.animationState.clearTracks();raw.skeleton.setToSetupPose();raw.skeleton.updateWorldTransform();raw.drawFrame(false);$('phase').textContent='Poziția de asamblare';$('time').textContent='0.00 s';$('scrub').value=0;};
$('compare').onclick=()=>{const show=$('reference').hidden;$('reference').hidden=!show;document.body.classList.toggle('comparing',show);$('compare').setAttribute('aria-pressed',String(show));$('compare').textContent=show?'Ascunde originalul':'Compară originalul';};
new ResizeObserver(()=>{
 const panel=$('reference');if(panel.hidden)return;
 const bounds=model.bounds,padX=bounds.width*.02,padY=bounds.height*.02;
 const w=bounds.width+padX*2,h=bounds.height+padY*2,scale=Math.min(panel.clientWidth/w,panel.clientHeight/h),img=panel.querySelector('img');
 Object.assign(img.style,{position:'absolute',width:(reference.width*scale)+'px',height:(reference.height*scale)+'px',maxWidth:'none',left:((panel.clientWidth-w*scale)/2+(-reference.origin[0]-bounds.x+padX)*scale)+'px',top:((panel.clientHeight-h*scale)/2+(bounds.y+bounds.height+padY-reference.origin[1])*scale)+'px'});
}).observe($('reference'));
$('fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.querySelector('.viewport').requestFullscreen();
$('png').onclick=async()=>{const blob=await player.snapshot();const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=model.id+'-'+(isSetup?'setup':current)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
player=await createDinosaurPlayer($('player'),{baseUrl:'',model:model.id,animation:'idle',loop:true,bones:true,onReady:ready=>{player=ready;window.studioPlayer=ready;controls.forEach(c=>c.disabled=false);$('status').textContent=`${ready.raw.skeleton.bones.length} oase | ${ready.raw.skeleton.slots.length} straturi | ${model.stageLabel||'Adult'}`;},onError:error=>{$('status').textContent=error.message;}});
let frames=0,last=performance.now();function tick(now){frames++;if(now-last>1000){$('fps').textContent=Math.round(frames*1000/(now-last))+' cadre/s';frames=0;last=now;}const track=player?.raw?.animationState?.getCurrent(0);if(track&&!isSetup){const duration=track.animation.duration,time=track.loop?track.trackTime%duration:Math.min(track.trackTime,duration);$('time').textContent=time.toFixed(2)+' / '+duration.toFixed(2)+' s';$('scrub').max=duration;$('scrub').value=time;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
