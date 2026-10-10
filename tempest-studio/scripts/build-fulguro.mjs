import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {world,deg,rotate,paths,durations,transforms,smooth,origin} from './fulguro-motion.mjs';
import {skinLeg} from './leg-skin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/models/fulgurodrome');fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(path.join(root,'../../DCAT-main/package.json'))('pngjs'));}
const image=PNG.sync.read(fs.readFileSync(path.join(root,'source/fulgurodrome/art.png'))),W=image.width,H=image.height;
const polygons={
 neck:[[1150,435],[1210,390],[1250,355],[1280,310],[1270,260],[1220,200],[1170,165],[1160,0],[1536,0],[1536,200],[1440,200],[1390,230],[1420,400],[1340,500],[1250,520]],
 farArm:[[1220,440],[1320,460],[1335,520],[1400,530],[1440,600],[1440,690],[1380,689],[1340,615],[1320,585],[1250,570],[1210,520]],
 nearArm:[[1180,460],[1270,470],[1290,510],[1260,540],[1270,565],[1300,580],[1360,655],[1360,755],[1280,748],[1220,670],[1210,640],[1150,620],[1140,540]],
 nearLeg:[[995,490],[1100,500],[1150,585],[1120,685],[1100,765],[1150,820],[1210,875],[1280,919],[1410,941],[1440,1024],[1200,1024],[1160,970],[1090,876],[1015,810],[1000,778],[1000,700],[975,640],[965,575]],
 farLeg:[[920,535],[990,570],[970,640],[850,685],[795,738],[775,795],[745,895],[760,947],[840,974],[860,1024],[620,1024],[640,884],[685,747],[730,669],[820,610]],
 tail:[[0,0],[600,0],[600,300],[860,400],[860,515],[600,540],[0,540]],
};
const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const names=['farLeg','farArm','tail','neck','nearLeg','nearArm','body'],masks=Object.fromEntries(names.map(name=>[name,new Uint8Array(W*H)]));
const priority=['neck','nearArm','farArm','nearLeg','farLeg','tail'];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!image.data[i*4+3])continue;
 let layer=priority.find(name=>inside(polygons[name],x+.5,y+.5))||'body';
 // Below the knees the two silhouettes are disjoint. Include the whole
 // foot contour, including fine toe edges outside the rough polygons.
 if(y>700&&!layer.endsWith('Arm'))layer=x>960?'nearLeg':'farLeg';
 masks[layer][i]=1;
}
const rigidPieces={};
for(const side of ['farLeg','nearLeg']){
 const parts=['Upper','Lower','Foot'].map(part=>side+part),points=paths[side];
 for(const part of parts){masks[part]=new Uint8Array(W*H);rigidPieces[part]=part;}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;if(!masks[side][i])continue;
  const knee=points[1][1],ankle=points[2][1];
  const primary=y<knee?0:y<ankle?1:2;
  masks[parts[primary]][i]=1;
  for(let joint=1;joint<=2;joint++)if(Math.hypot(x-points[joint][0],y-points[joint][1])<24){masks[parts[joint-1]][i]=1;masks[parts[joint]][i]=1;}
 }
 const index=names.indexOf(side);names.splice(index,1,...parts);
}
const bones=[{name:'root'},{name:'body',parent:'root',length:180}],setup={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}};
function bone(name,parent,a,b){const p=setup[parent],q=rotate([a[0]-p.x,a[1]-p.y],-p.angle),angle=deg([b[0]-a[0],b[1]-a[1]]);bones.push({name,parent,x:q[0],y:q[1],rotation:angle-p.angle,length:Math.hypot(b[0]-a[0],b[1]-a[1])});setup[name]={x:a[0],y:a[1],angle};}
const groups={};
for(const side of ['farLeg','nearLeg']){const p=paths[side].map(world);groups[side]=['Upper','Lower','Foot'].map((part,i)=>{const name=side+part;bone(name,i?side+['Upper','Lower','Foot'][i-1]:'body',p[i],p[i+1]);return name;});}
for(const side of ['farArm','nearArm']){const p=paths[side].map(world);groups[side]=['Upper','Lower','Hand'].map((part,i)=>{const name=side+part;bone(name,i?side+['Upper','Lower','Hand'][i-1]:'body',p[i],p[i+1]);return name;});}
const neck=paths.neck.map(world);groups.neck=neck.slice(0,-1).map((a,i)=>{const name='neck'+(i+1);bone(name,i?'neck'+i:'body',a,neck[i+1]);return name;});bone('head','neck3',neck.at(-1),world(paths.head[1]));groups.neck.push('head');
const tail=paths.tail.map(world);groups.tail=tail.slice(0,-1).map((a,i)=>{const name='tail'+(i+1);bone(name,i?'tail'+i:'body',a,tail[i+1]);return name;});
const slots=[],attachments={},layouts={},regions=[],STEP=12;
const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.min(1,Math.max(0,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);};
for(const layer of names){
 const png=new PNG({width:W,height:H});for(let i=0;i<W*H;i++)if(masks[layer][i])image.data.copy(png.data,i*4,i*4,i*4+4);fs.writeFileSync(path.join(out,layer+'.png'),PNG.sync.write(png));
 regions.push(`${layer}.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n${layer}\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`);
 const xs=Array.from({length:Math.ceil(W/STEP)+1},(_,i)=>Math.min(W,i*STEP)),ys=Array.from({length:Math.ceil(H/STEP)+1},(_,i)=>Math.min(H,i*STEP));
 const vertices=[],uvs=[],triangles=[],points=[],weights=[],lookup=new Map();
 const add=(ix,iy)=>{const key=ix+','+iy;if(lookup.has(key))return lookup.get(key);const x=xs[ix],y=ys[iy],p=world([x,y]),index=points.length;lookup.set(key,index);points.push(p);uvs.push(x/W,y/H);
  let influences=[['body',1]];
  if(rigidPieces[layer]){
   if(layer.endsWith('Upper')){
    const side=layer.startsWith('near')?'nearLeg':'farLeg',start=side==='nearLeg'?630:575,end=paths[side][1][1]-(side==='nearLeg'?48:24);
    const strength=smooth((y-start)/(end-start));influences=[['body',1-strength],[layer,strength]].filter(([,w])=>w>1e-6);
   }else influences=[[rigidPieces[layer],1]];
   if(layer.startsWith('nearLeg')&&!layer.endsWith('Foot')){
    const side=layer.startsWith('near')?'nearLeg':'farLeg',knee=paths[side][1],hinge=48;
    if(layer.endsWith('Lower')||y>=knee[1]-hinge){
     const lower=smooth((y-knee[1]+hinge)/(hinge*2));
     influences=[[side+'Upper',1-lower],[side+'Lower',lower]].filter(([,w])=>w>1e-6);
    }
   }
   // Match both cutouts in the shared knee cap. Keep the feathered
   // thigh outside this small patch attached to its original upper bone.
   if(layer.startsWith('farLeg')&&!layer.endsWith('Foot')){
    const knee=paths.farLeg[1],hinge=64;
    if(layer.endsWith('Lower')||y>=knee[1]-hinge){
     const lower=smooth((y-knee[1]+hinge)/(hinge*2))*(1-smooth((x-knee[0]-5)/100));
     const strength=layer.endsWith('Upper')?smooth((y-575)/(686-575)):1;
     influences=[['body',1-strength],['farLegUpper',strength*(1-lower)],['farLegLower',strength*lower]].filter(([,w])=>w>1e-6);
    }
   }
  }
  else if(layer!=='body'){
   const chain=groups[layer],joint=setup[chain[0]],distance=Math.hypot(p[0]-joint.x,p[1]-joint.y);
   const strength=smooth((distance-55)/130);
   const scores=chain.map(name=>{const b=setup[name],length=bones.find(b=>b.name===name).length,end=rotate([length,0],b.angle);return [name,1/Math.max(22,segmentDistance(p,[b.x,b.y],[b.x+end[0],b.y+end[1]]))**3];});
   const sum=scores.reduce((s,[,w])=>s+w,0);
   let moving=scores.map(([name,w])=>[name,w/sum]);
   if(layer==='neck'&&y<155)moving=[['head',1]];
   influences=[['body',1-strength],...moving.map(([name,w])=>[name,w*strength])].filter(([,w])=>w>1e-6);
  }
  const sum=influences.reduce((s,[,w])=>s+w,0);influences=influences.map(([name,w])=>[name,w/sum]);weights.push(influences);
  vertices.push(influences.length);for(const [name,w] of influences){const b=setup[name],q=rotate([p[0]-b.x,p[1]-b.y],-b.angle);vertices.push(bones.findIndex(b=>b.name===name),q[0],q[1],w);}return index;
 };
 for(let iy=0;iy<ys.length-1;iy++)for(let ix=0;ix<xs.length-1;ix++){
  let used=false;for(let y=ys[iy];y<ys[iy+1]&&!used;y++)for(let x=xs[ix];x<xs[ix+1];x++)if(masks[layer][y*W+x]&&image.data[(y*W+x)*4+3]>16){used=true;break;}
  if(!used)continue;const a=add(ix,iy),b=add(ix+1,iy),c=add(ix+1,iy+1),d=add(ix,iy+1);triangles.push(a,c,b,a,d,c);
 }
 const softHip=!!rigidPieces[layer]&&(layer.endsWith('Upper')||layer==='nearLegLower'||layer==='farLegLower');
 slots.push({name:layer,bone:'body',attachment:layer});attachments[layer]={[layer]:{type:'mesh',path:layer,vertices:softHip?points.flat():vertices,uvs,triangles,hull:0,width:W,height:H}};layouts[layer]={points,weights,triangles,rigidPiece:!!rigidPieces[layer]&&!softHip,rigidBlend:softHip,preserveStrips:false};
}
const animations={};
for(const [name,duration] of Object.entries(durations)){
 const softParts=['farLegUpper','farLegLower','nearLegUpper','nearLegLower'];
 const deform={default:Object.fromEntries(softParts.map(side=>[side,{[side]:[]}]))};
 const tracks=Object.fromEntries(bones.filter(b=>b.name!=='root').map(b=>[b.name,{translate:[],rotate:[]}]))
 for(let frame=0;frame<=Math.round(duration*60);frame++){
  const time=Math.min(duration,frame/60),state=transforms(bones,name,time),p=state.pose;
  for(const side of softParts){
   const mesh=layouts[side],points=skinLeg(mesh,setup,state.bones);
   deform.default[side][side].push({time,vertices:points.flatMap((point,i)=>point.map((v,k)=>Math.round((v-mesh.points[i][k])*1000)/1000))});
  }
  tracks.body.translate.push({time,x:p.x,y:p.y});tracks.body.rotate.push({time,angle:p.rotation});
  for(const b of bones){if(['root','body'].includes(b.name))continue;
   const current=state.bones[b.name],parent=state.bones[b.parent],local=rotate([current.x-parent.x,current.y-parent.y],-parent.angle);
   tracks[b.name].translate.push({time,x:local[0]-b.x,y:local[1]-b.y});
   tracks[b.name].rotate.push({time,angle:current.angle-parent.angle-b.rotation});
  }
 }
 animations[name]={bones:tracks,deform};
}
const bounds={x:-1110,y:-620,width:1870,height:1330};
const rig={skeleton:{spine:'3.8.99',name:'Fulgurodrome · Adult',...bounds},bones,slots,skins:[{name:'default',attachments}],animations};
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'bones.json'),JSON.stringify({...rig,slots:[],skins:[{name:'default',attachments:{}}],animations:Object.fromEntries(Object.entries(animations).map(([name,animation])=>[name,{bones:animation.bones}]))},null,2));
fs.writeFileSync(path.join(out,'rig.atlas'),regions.join('\n'));fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify({setup,bones,layouts,width:W,height:H,paths}));fs.copyFileSync(path.join(root,'source/fulgurodrome/art.png'),path.join(out,'reference.png'));
const catalogPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(catalogPath));
const entry={id:'fulgurodrome',name:'Fulgurodrome · Adult',skeleton:'models/fulgurodrome/animated.json',atlas:'models/fulgurodrome/rig.atlas',bounds,reference:{image:'models/fulgurodrome/reference.png',width:W,height:H,origin},description:'Biped agil. Sprijin pe picioare.',explanation:'Picioarele alternează la mers, coada echilibrează corpul, iar brațele urmăresc atacul. Mersul rulează pe loc. Mișcarea este construită pe articulații, fără efecte vizuale.',animations:Object.entries(durations).map(([name,duration],i)=>({name,label:['Repaus','Mers','Gheare','Salt ofensiv'][i],duration,loop:i<2}))};
catalog.models=catalog.models.filter(m=>m.id!==entry.id).concat(entry);fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2));console.log(`Fulgurodrome: ${bones.length} bones, ${slots.length} layers, 4 animations`);
