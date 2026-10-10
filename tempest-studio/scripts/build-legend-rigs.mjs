import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import anatomy from '../source/legends/anatomy.mjs';
import {readPNG,writePNG,bleed} from '../../scripts/lib/png.mjs';
import {inside,segDist,rot,smooth,clamp,deg} from '../../scripts/lib/geom.mjs';
import {pose,meshes} from '../../scripts/lib/spine.mjs';
import {dragonMotion,dragonDuration,motionSources} from './legend-dragon-motion.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalogFile=path.join(root,'public/manifest.json');
const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'));
const fxList=JSON.parse(fs.readFileSync(path.join(root,'public/legend-fx/manifest.json'),'utf8'));
const legendsFile=path.join(root,'public/legends/manifest.json');
const legends=JSON.parse(fs.readFileSync(legendsFile,'utf8'));
const wrap=d=>((d+180)%360+360)%360-180;
const pulse=(t,a,b)=>t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))**2;
const wanted=process.argv.slice(2);
for(const spec of anatomy){
 if(wanted.length&&!wanted.includes(spec.id))continue;
 const art=readPNG(path.join(root,'public/legends',`${spec.id}.png`));
 const s=1200/art.width,W=([x,y])=>[(x-art.width/2)*s,(art.height-y)*s];
 const bones=[{name:'root'}],indexes={root:0};let worlds={root:{x:0,y:0,a:1,b:0,c:0,d:1}};
 function bone(name,parent,a,b){
  const A=W(a),B=W(b),p=worlds[parent],pa=deg(Math.atan2(p.c,p.a));
  const local=rot([A[0]-p.x,A[1]-p.y],-pa),angle=deg(Math.atan2(B[1]-A[1],B[0]-A[0]));
  indexes[name]=bones.length;bones.push({name,parent,x:local[0],y:local[1],rotation:wrap(angle-pa),length:Math.hypot(B[0]-A[0],B[1]-A[1])});
  worlds[name]={x:A[0],y:A[1],a:Math.cos(angle*Math.PI/180),b:-Math.sin(angle*Math.PI/180),c:Math.sin(angle*Math.PI/180),d:Math.cos(angle*Math.PI/180)};
 }
 bone('body','root',spec.body,[spec.body[0]+100,spec.body[1]]);
 bone('chest','body',spec.chest,[spec.chest[0]+100,spec.chest[1]]);
 const neckNames=[];for(let i=0;i<spec.neck.length-1;i++){const name=`neck${i+1}`;bone(name,i?neckNames.at(-1):'chest',spec.neck[i],spec.neck[i+1]);neckNames.push(name);}
 bone('head',neckNames.at(-1)||'chest',...spec.head);bone('jaw','head',...spec.jaw);
 for(const chain of spec.chains){chain.names=[];for(let i=0;i<chain.points.length-1;i++){const name=chain.name+(i+1);bone(name,i?chain.names.at(-1):chain.parent,chain.points[i],chain.points[i+1]);chain.names.push(name);}}
 bone('fxAnchor',spec.effect.parent,spec.effect.at,[spec.effect.at[0]+100,spec.effect.at[1]]);
 // FX regions are axis aligned in world space, even when their attachment follows a moving head.
 const fxBone=bones.at(-1),fxParent=worlds[fxBone.parent];fxBone.rotation=-deg(Math.atan2(fxParent.c,fxParent.a));worlds=pose({bones,animations:{}});
 const nearest=new Int32Array(art.width*art.height).fill(-1),queue=new Int32Array(nearest.length);let head=0,end=0;
 for(let i=0;i<nearest.length;i++)if(art.data[i*4+3]>32){nearest[i]=i;queue[end++]=i;}
 while(head<end){const i=queue[head++],x=i%art.width;for(const j of [x?i-1:-1,x<art.width-1?i+1:-1,i-art.width,i+art.width])if(j>=0&&j<nearest.length&&nearest[j]<0){nearest[j]=nearest[i];queue[end++]=j;}}
 function chainWeights(q,names){const point=W(q),scores=names.map(name=>{const b=worlds[name],v=rot([bones[indexes[name]].length,0],deg(Math.atan2(b.c,b.a)));return [name,1/Math.max(16*s,segDist(point,[b.x,b.y],[b.x+v[0],b.y+v[1]]))**3];});const sum=scores.reduce((a,[,v])=>a+v,0);return scores.map(([n,v])=>[n,v/sum]);}
 function torso(q){
  if(inside(spec.headPoly,...q))return [['head',1]];
  const neckDistance=Math.min(...spec.neck.slice(1).map((p,i)=>segDist(q,spec.neck[i],p)));
  if(q[1]<spec.chest[1]&&neckDistance<130)return chainWeights(q,[...neckNames,'head']);
  const chest=smooth(clamp((q[0]-spec.body[0])/(spec.chest[0]-spec.body[0]||100),0,1));return [['body',1-chest],['chest',chest]];
 }
 function weightsAt(q){
  if(inside(spec.jawPoly,...q))return [['jaw',1]];
  for(const chain of [...spec.chains].reverse())if(inside(chain.poly,...q)){
   const strength=smooth(clamp(Math.hypot(q[0]-chain.points[0][0],q[1]-chain.points[0][1])/110,0,1));
   return [...torso(q).map(([n,v])=>[n,v*(1-strength)]),...chainWeights(q,chain.names).map(([n,v])=>[n,v*strength])];
  }
  return torso(q);
 }
 function field(q){const result=new Map();for(const dy of [-40,-20,0,20,40])for(const dx of [-40,-20,0,20,40]){const x=clamp(Math.round(q[0]+dx),0,art.width-1),y=clamp(Math.round(q[1]+dy),0,art.height-1),i=nearest[y*art.width+x],k=Math.exp(-(dx*dx+dy*dy)/1800);for(const[n,v]of weightsAt([i%art.width,Math.floor(i/art.width)]))result.set(n,(result.get(n)||0)+v*k);}const kept=[...result].filter(([,v])=>v>1e-5),sum=kept.reduce((a,[,v])=>a+v,0);return kept.map(([n,v])=>[n,v/sum]);}
 const uvs=[],vertices=[],triangles=[],vertexMap=new Map(),grid=24,nx=Math.ceil(art.width/grid),ny=Math.ceil(art.height/grid);
 function vertex(i,j){const key=j*(nx+1)+i;if(vertexMap.has(key))return vertexMap.get(key);const q=[Math.min(i*grid,art.width),Math.min(j*grid,art.height)],point=W(q),weights=field(q),index=uvs.length/2;vertexMap.set(key,index);uvs.push(q[0]/art.width,q[1]/art.height);vertices.push(weights.length);for(const[n,v]of weights){const b=worlds[n],local=rot([point[0]-b.x,point[1]-b.y],-deg(Math.atan2(b.c,b.a)));vertices.push(indexes[n],local[0],local[1],v);}return index;}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let any=false;for(let y=j*grid;y<Math.min(art.height,(j+1)*grid)&&!any;y++)for(let x=i*grid;x<Math.min(art.width,(i+1)*grid)&&!any;x++)if(art.data[(y*art.width+x)*4+3]>0)any=true;if(!any)continue;const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);triangles.push(a,b,c,a,c,d);}
 const attachment={type:'mesh',uvs,vertices,triangles,hull:0,width:art.width,height:art.height};
 const fx=fxList.find(f=>f.element===spec.effect.element),attachments={art:{art:attachment},fx:{}};
 const effectShift=spec.id==='calderox'?spec.effect.size*.43:spec.id==='fulminarch'?spec.effect.size*.35:0;
 for(let i=0;i<fx.frames;i++)attachments.fx[`fx${i}`]={type:'region',path:`fx${i}`,x:effectShift,width:spec.effect.size,height:spec.effect.size};
 const skeleton={skeleton:{spine:'3.8.99',name:spec.id},bones,slots:[{name:'art',bone:'root',attachment:'art'},{name:'fx',bone:'fxAnchor',color:'ffffff00'}],skins:[{name:'default',attachments}],animations:{}};
 const setup=Object.fromEntries(bones.map(b=>[b.name,b]));
 const durations={idle:4,walk:spec.mode==='heavy'?2.8:spec.mode==='titan'?2.4:spec.mode==='hunter'?1.8:2.6,attack:2.6,ultimate:4.2};
 for(const name of Object.keys(durations))durations[name]=dragonDuration(spec.id,name)||durations[name];
 for(const[name,duration]of Object.entries(durations)){
  const timelines={},frames=Math.round(duration*30),put=(bone,channel,key)=>((timelines[bone]??={})[channel]??=[]).push(key);
  for(let i=0;i<=frames;i++){
   const t=duration*i/frames,phase=t/duration,w=phase*Math.PI*2,wind=pulse(t,.1,.8),strike=pulse(t,.8,1.65),charge=pulse(t,.2,1.2),special=pulse(t,1.1,3.4);
   const hover=spec.mode==='fly'||spec.mode==='swim';let bx=0,by=0,br=0,ch=0,nr=0,hr=0,jr=0;
   if(name==='idle'){by=(hover?10:1.2)*Math.sin(w);br=(hover?.5:.12)*Math.sin(w);ch=.25*Math.sin(w);nr=.4*Math.sin(w);hr=-.25*Math.sin(w);}
   if(name==='walk'){by=hover?15*Math.sin(w):-1.4*(1-Math.cos(2*w));br=(hover?.7:.18)*Math.sin(hover?w:2*w);ch=-.2*Math.sin(2*w);nr=.4*Math.sin(w);hr=-br-nr;}
   if(name==='attack'){bx=-7*wind+16*strike;by=-2*wind+(hover?5*strike:0);br=.4*wind-.7*strike;ch=-.5*strike;nr=-1.3*strike;hr=-1.8*strike;jr=-4*strike;}
   if(name==='ultimate'){by=-3*charge+6*special;bx=-4*charge+6*special;br=-.6*special;ch=.6*special;nr=1.2*special;hr=1.5*special;jr=-5*special;}
   if(spec.mode==='swim')jr*=.45;
   if(spec.id==='glaciomorth')jr*=.25;
   const motion=dragonMotion(spec.id,name,phase);
   if(motion){
    ({bx,by,br,ch,nr,hr,jr}=motion);
    const pivot=W(spec.body),r=motion.ra*Math.PI/180;
    put('root','rotate',{time:t,angle:motion.ra});
    put('root','translate',{time:t,x:motion.rx+pivot[0]*(1-Math.cos(r))+pivot[1]*Math.sin(r),y:motion.ry+pivot[1]*(1-Math.cos(r))-pivot[0]*Math.sin(r)});
   }
   put('body','translate',{time:t,x:bx,y:by});put('body','rotate',{time:t,angle:br});put('chest','rotate',{time:t,angle:ch});
   for(const bone of neckNames)put(bone,'rotate',{time:t,angle:nr/neckNames.length});put('head','rotate',{time:t,angle:hr});put('jaw','rotate',{time:t,angle:jr});
   const frameSkeleton={bones,animations:{frame:{bones:timelines}}},currentWorld=pose(frameSkeleton,'frame',t);
   if(spec.id==='calderox'&&name==='ultimate'){
    // The special erupts from the actual caldera, while the ordinary attack fires forward.
    const crater=W([1170,400]),restBody=worlds.body,movingBody=currentWorld.body,dx=crater[0]-restBody.x,dy=crater[1]-restBody.y;
    const target=[movingBody.x+movingBody.a*dx+movingBody.b*dy,movingBody.y+movingBody.c*dx+movingBody.d*dy],p=currentWorld[fxBone.parent],pa=deg(Math.atan2(p.c,p.a)),local=rot([target[0]-p.x,target[1]-p.y],-pa);
    put('fxAnchor','translate',{time:t,x:local[0]-fxBone.x,y:local[1]-fxBone.y});
    put('fxAnchor','rotate',{time:t,angle:wrap(90-pa-fxBone.rotation)});
   }
   for(const chain of spec.chains){
    if(chain.kind==='leg'){
     const [upper,lower,foot]=chain.names,hip=currentWorld[upper],restFoot=worlds[foot],parent=currentWorld[setup[upper].parent],pa=deg(Math.atan2(parent.c,parent.a));
     let x=restFoot.x,y=restFoot.y,tilt=0;
     if(motion){const rootPose=currentWorld.root;const target=motion.foot(chain);x=rootPose.x+rootPose.a*(restFoot.x+target.x)+rootPose.b*(restFoot.y+target.y);y=rootPose.y+rootPose.c*(restFoot.x+target.x)+rootPose.d*(restFoot.y+target.y);tilt=target.tilt;}
     if(name==='walk'&&!motion){
      const q=(phase+chain.phase)%1,stance=.7,stride=(spec.mode==='hunter'?28:spec.mode==='titan'?18:15);
      if(q<stance)x+=stride/2-stride*q/stance;else{const u=(q-stance)/(1-stance);x+=-stride/2+stride*smooth(u);y+=(spec.mode==='hunter'?9:5)*Math.sin(Math.PI*u);tilt=-3*Math.sin(Math.PI*u);}
     }
     if(!motion&&name==='attack'&&spec.mode==='titan'&&chain.name==='nearArm'){y+=12*wind;x+=10*strike;}
     if(!motion&&name==='ultimate'&&spec.mode==='titan'&&chain.name==='nearArm'){y+=15*charge;x+=8*special;}
     const l1=setup[upper].length,l2=setup[lower].length,dx=x-hip.x,dy=y-hip.y,d=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.001,l1+l2-.001);
     const restHip=worlds[upper],restKnee=worlds[lower],bend=Math.sign(wrap(deg(Math.atan2(restKnee.y-restHip.y,restKnee.x-restHip.x))-deg(Math.atan2(restFoot.y-restHip.y,restFoot.x-restHip.x))))||1;
     const a=deg(Math.atan2(dy,dx))+bend*deg(Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1))),k=rot([l1,0],a),b=deg(Math.atan2(dy-k[1],dx-k[0]));
     put(upper,'rotate',{time:t,angle:wrap(a-pa-setup[upper].rotation)});put(lower,'rotate',{time:t,angle:wrap(b-a-setup[lower].rotation)});put(foot,'rotate',{time:t,angle:wrap(deg(Math.atan2(restFoot.c,restFoot.a))+(motion?motion.ra:0)+tilt-b-setup[foot].rotation)});
    }else{
     for(let k=0;k<chain.names.length;k++){
      let value=0;const tail=chain.kind==='tail',wing=chain.kind==='wing',fin=chain.kind==='fin',scythe=chain.kind==='scythe';
      if(tail)value=(hover?1.1:.35)*Math.sin(w-k*.5)*(k+1)/chain.names.length;
      if(wing)value=(name==='walk'?1.4:.8)*Math.sin(w+(chain.name.includes('Far')?.16:0))*(k?1:.65);
      if(fin)value=(name==='walk'?2:1)*Math.sin(w-k*.45);
      if(scythe)value=.5*Math.sin(w)+(name==='attack'?-3*strike+2*wind:name==='ultimate'?-2*special:0);
      if(name==='attack'&&tail)value+=.3*wind-.6*strike;
      if(name==='ultimate'&&(wing||fin))value+=1.2*special;
      if(motion)value=motion.chain(chain,k);
      put(chain.names[k],'rotate',{time:t,angle:value});
     }
    }
   }
  }
  const tint=fx.element==='plant'?'9dff75':fx.element==='earth'?'ffce89':fx.element==='storm'?'c9aaff':'ffffff';
  const slots={fx:{attachment:[{time:0,name:null}],color:[{time:0,color:tint+'00'}]}};
  if(name==='attack'||name==='ultimate'){
   const start=motionSources[spec.id]?duration*motionSources[spec.id].impact[name]:(name==='attack'?.88:1.35);
   const cycles=name==='attack'?(fx.element==='water'||fx.element==='plant'?3:1):({fire:3,water:6,earth:2,ice:2,plant:6,storm:2}[fx.element]);
   const count=fx.frames*cycles,span=Math.min(duration-start-.12,Math.max(.6,count/24));
   for(let i=0;i<count;i++)slots.fx.attachment.push({time:start+i*span/count,name:`fx${i%fx.frames}`});
   slots.fx.attachment.push({time:start+span,name:null});
   slots.fx.color.push({time:start-.04,color:tint+'00'},{time:start+.04,color:tint+'ff'},{time:start+span-.14,color:tint+'ff'},{time:start+span,color:tint+'00'});
  }
  skeleton.animations[name]={bones:timelines,slots};
 }
 const rest=meshes({skeleton:{...skeleton,slots:skeleton.slots.filter(slot=>slot.name==='art')},regions:{}},pose(skeleton)).art.pts.flat();
 const xs=[],ys=[];for(let i=0;i<rest.length;i+=2){xs.push(rest[i]);ys.push(rest[i+1]);}
 const bounds={x:Math.min(...xs)-45,y:Math.min(...ys)-45,width:Math.max(...xs)-Math.min(...xs)+90,height:Math.max(...ys)-Math.min(...ys)+90};
 if(motionSources[spec.id]){bounds.x-=95;bounds.y-=65;bounds.width+=190;bounds.height+=130;}
 const effectAt=W(spec.effect.at);effectAt[0]+=effectShift;const radius=spec.effect.size/2+50;
 const scene={x:Math.min(bounds.x,effectAt[0]-radius),y:Math.min(bounds.y,effectAt[1]-radius),width:0,height:0};scene.width=Math.max(bounds.x+bounds.width,effectAt[0]+radius)-scene.x;scene.height=Math.max(bounds.y+bounds.height,effectAt[1]+radius)-scene.y;
 const animationBounds={idle:bounds,walk:bounds,attack:scene,ultimate:scene};
 if(spec.id==='calderox'){
  const crater=W([1170,400]),top=crater[1]+spec.effect.size+80;
  animationBounds.ultimate={x:bounds.x,y:bounds.y,width:bounds.width,height:Math.max(bounds.y+bounds.height,top)-bounds.y};
 }
 const animationList=Object.entries(durations).map(([name,duration])=>({name,duration,label:{idle:'Repaus',walk:hoverLabel(spec.mode),attack:spec.attack,ultimate:spec.special}[name],loop:name==='idle'||name==='walk'}));
 const dir=path.join(root,'public/models',spec.id);fs.mkdirSync(dir,{recursive:true});
 fs.copyFileSync(path.join(root,'public/legends',`${spec.id}.png`),path.join(dir,'art.png'));bleed(art);writePNG(path.join(dir,'rig.png'),art);
 fs.copyFileSync(path.join(root,'public/legend-fx',`${fx.element}.png`),path.join(dir,'fx.png'));
 let atlas=`rig.png\nsize: ${art.width},${art.height}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nart\n  rotate: false\n  xy: 0,0\n  size: ${art.width},${art.height}\n  orig: ${art.width},${art.height}\n  offset: 0,0\n  index: -1\n\nfx.png\nsize: ${fx.columns*fx.tile},${Math.ceil(fx.frames/fx.columns)*fx.tile}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n`;
 for(let i=0;i<fx.frames;i++)atlas+=`fx${i}\n  rotate: false\n  xy: ${(i%fx.columns)*256},${Math.floor(i/fx.columns)*256}\n  size: 256,256\n  orig: 256,256\n  offset: 0,0\n  index: -1\n`;
 fs.writeFileSync(path.join(dir,'rig.atlas'),atlas);fs.writeFileSync(path.join(dir,'skeleton.json'),JSON.stringify(skeleton));
 const creature=legends.creatures.find(c=>c.id===spec.id);
 const entry={id:spec.id,name:creature.name,baseSpecies:spec.id,stage:'adult',stageLabel:'Legendar',legendary:true,skeleton:`models/${spec.id}/skeleton.json`,atlas:`models/${spec.id}/rig.atlas`,bounds,animationBounds,reference:{image:`models/${spec.id}/art.png`,width:1200,height:art.height*s,origin:[600,art.height*s]},animations:animationList,description:creature.title,explanation:`${creature.anatomy} Animații proprii pe articulații; efect ${fx.label.toLowerCase()} din biblioteca dragonilor, sincronizat cu atacul și specialul.`,effectSource:{archive:fx.archive,regions:fx.regions}};
 const old=catalog.models.findIndex(model=>model.id===spec.id);if(old<0)catalog.models.push(entry);else catalog.models[old]=entry;
 if(motionSources[spec.id]){entry.motionSource={...motionSources[spec.id],sample:'source/legends/motion-references/'+motionSources[spec.id].dragon+'.json',samplingRate:30};entry.explanation=motionSources[spec.id].title+'. Curbe de mișcare din scheletul original, adaptate la această anatomie; efectele urmăresc momentul atacului.';}
 Object.assign(creature,{status:'animated',rig:spec.id,studio:`/?species=${spec.id}`,bones:bones.length,animations:animationList});
 fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify(entry,null,2));
 console.log(`${spec.id}: ${bones.length} bones, ${uvs.length/2} vertices, four authored actions, ${fx.frames} original dragon FX frames`);
}
legends.kind='legendary-boss-art-and-rigs';
fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');fs.writeFileSync(legendsFile,JSON.stringify(legends,null,2)+'\n');
function hoverLabel(mode){return mode==='fly'?'Zbor':mode==='swim'?'Înot':mode==='hunter'?'Pândă și mers':'Mers greu';}
