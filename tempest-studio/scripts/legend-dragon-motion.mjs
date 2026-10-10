import fs from 'node:fs';
const refs=Object.fromEntries(['flamingrock','sea','primal-rage','war-thorn','tricky-trunk'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../source/legends/motion-references/'+id+'.json',import.meta.url)))]));
export const motionSources={
 calderox:{dragon:'flamingrock',hip:'pelvis',body:'waist',neck:'neck',jaw:'jaw',tail:'tail',foot:'ankle_r2',attack:'attack',ultimate:'special1',impact:{attack:.57,ultimate:.55},title:'Flaming Rock: retragere, asalt și ridicare pentru erupție'},
 abyssarion:{dragon:'sea',hip:'pelvis',body:'waist1',neck:'neck2',jaw:'jaw',tail:'tail_1',foot:null,attack:'attack',ultimate:'special1',impact:{attack:.4,ultimate:.43},title:'Sea: înot ondulat, mușcătură cu avans și chemarea abisului'},
 geolithar:{dragon:'primal-rage',hip:'hip',body:'body1',neck:'body4',jaw:'lower_jaw',tail:'tail',foot:'foot_r',attack:'attack',ultimate:'special1',impact:{attack:.64,ultimate:.59},title:'Primal Rage: încordare, pumni alternați și lovitură tectonică'},
 viridraxis:{dragon:'war-thorn',hip:'hip',body:'body',neck:'body_2',jaw:'lower_jaw',tail:'tail',foot:'ankle_back_r',attack:'attack',ultimate:'special1',impact:{attack:.54,ultimate:.54},title:'War Thorn: pândă, recul elastic și seceri alternante'},
 glaciomorth:{dragon:'tricky-trunk',hip:'pelvis',body:'waist',neck:'waist',jaw:'jaw',tail:'tail',foot:'ankle_r2',attack:'attack',ultimate:'special1',impact:{attack:.55,ultimate:.51},title:'Tricky Trunk: balans greu, atac cu colții și călcare de gheață'},
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},cache=new Map();
function curve(ref,clip,bone,channel,phase,loop,relative){
 const key=[ref,clip,bone,channel,loop,relative].join('/');let values=cache.get(key);
 if(!values){
  const a=refs[ref].animations.find(a=>a.name===clip),frames=a.frames;
  const get=f=>{const b=f[bone]||(bone.startsWith('tail')?f.tail||f.tail_1:null),r=relative?f[relative]:null;return (b?.[channel]||0)-(r?.[channel]||0);};
  values=frames.map(get);const start=values[0],end=values.at(-1);
  values=values.map((v,i)=>v-start-(loop?(end-start)*i/(values.length-1):0));
  if(channel==='angle'||channel==='rotation')values=values.map(v=>((v+180)%360+360)%360-180);
  const amp=Math.max(.001,...values.map(Math.abs));values=values.map(v=>v/amp);cache.set(key,values);
 }
 const q=clamp(phase,0,1)*(values.length-1),i=Math.floor(q),f=q-i;
 let value=values[i]+((values[Math.min(i+1,values.length-1)]??values[i])-values[i])*f;
 if(!loop)value*=ease(phase/.045)*ease((1-phase)/.16);
 return value;
}
export function dragonDuration(id,name){const spec=motionSources[id];if(!spec)return null;const clip=name==='idle'?'breathe':name==='walk'?'walk':spec[name];return refs[spec.dragon].animations.find(a=>a.name===clip).duration*(name==='idle'?1.9:name==='walk'?(id==='abyssarion'?1.4:1.6):1.12);}
export function dragonMotion(id,name,phase){
 const s=motionSources[id];if(!s)return null;
 const loop=name==='idle'||name==='walk',clip=name==='idle'?'breathe':name==='walk'?'walk':s[name],combat=!loop;
 const c=(bone,channel='rotation',offset=0,relative)=>curve(s.dragon,clip,bone,channel,loop?((phase+offset)%1+1)%1:phase,loop,relative);
 const x=c(s.hip,'x'),y=c(s.hip,'y'),torso=c(s.body),head=c('head'),neck=c(s.neck),jaw=c(s.jaw);
 const amplitudes={calderox:[68,21,3.2],abyssarion:[105,42,5],geolithar:[55,30,4],viridraxis:[78,19,3.5],glaciomorth:[84,20,3.8]}[id];
 const m={rx:x*(combat?amplitudes[0]:name==='walk'?10:2),ry:y*(combat?amplitudes[1]:id==='abyssarion'?18:name==='walk'?3:1.5),ra:torso*(combat?amplitudes[2]:id==='abyssarion'?1.7:.45),bx:0,by:0,br:0,ch:torso*(combat?1.4:.45),nr:neck*(combat?2.4:.8),hr:head*(combat?3:1),jr:jaw*(id==='abyssarion'?1.8:id==='glaciomorth'?.8:3.5)};
 if(id==='geolithar'&&combat){m.ry=y*44;m.ra=torso*4.5;m.ch*=.65;}
 if(id==='viridraxis'&&combat){m.rx+=36*Math.sin(Math.PI*phase)**2;m.ry-=8*Math.sin(Math.PI*phase)**2;}
 if(id==='calderox'&&name==='ultimate'){m.ra=torso*4;m.ry+=24*Math.sin(Math.PI*phase)**2;}
 m.chain=(chain,k)=>{
  if(chain.kind==='tail')return c(s.tail+ (k?k:''),'rotation',k*.045)*(id==='abyssarion'?.8:combat?2.5:1.3)/(1+k*.25);
  if(chain.kind==='fin')return c(chain.name.includes('Far')?'fin_l_1_1':'fin_r_1_1','rotation',k*.06)*2.5/(k+1);
  if(chain.kind==='scythe'){
   const offset=chain.name.includes('Far')?.12:0,p=loop?((phase-offset)%1+1)%1:clamp((phase-offset)/(1-offset),0,1);
   const side=chain.name.includes('Far')?'l':'r',swing=curve(s.dragon,clip,(k===1?'forearm_':'arm_')+side,'rotation',p,loop);
   return swing*(combat?(k===0?8:k===1?-6:3):.8);
  }return 0;
 };
 m.foot=chain=>{
  if(name==='walk'){
   const offset=chain.phase||0;
   return {x:c(s.foot,'x',offset,s.hip)*(id==='geolithar'?23:30),y:Math.max(0,c(s.foot,'y',offset,s.hip))*(id==='geolithar'?10:12),tilt:c(s.foot,'angle',offset)*4};
  }
  if(combat&&id==='geolithar'&&chain.name.includes('Arm')){
   const side=chain.name.startsWith('near')?'r':'l',lift=Math.max(0,c('palm_'+side,'y',0,s.hip));
   return {x:c('palm_'+side,'x',0,s.hip)*22,y:lift*(name==='ultimate'?38:30),tilt:0};
  }
  if(combat&&id==='glaciomorth'&&chain.name.includes('Front'))return {x:0,y:Math.max(0,c('ankle_r','y',0,s.hip))*16,tilt:0};
  if(combat&&id==='calderox'&&chain.name.includes('Front'))return {x:0,y:Math.max(0,c('ankle_r','y',0,s.hip))*14,tilt:0};
  return {x:0,y:0,tilt:0};
 };
 return m;
}
