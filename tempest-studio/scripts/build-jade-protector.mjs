import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {inside,rot,deg} from '../../scripts/lib/geom.mjs';
import {pose} from '../../scripts/lib/spine.mjs';
import {cleanFootFragments} from './shaman-edge-cleanup.mjs';
const root=path.resolve(new URL('../',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')),source=path.join(root,'source/jade-protector'),out=path.join(root,'public/models/jade-protector');
fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(source,'base-rig.json'))),rig=structuredClone(base),original=PNG.sync.read(fs.readFileSync(path.join(source,'base-reference.png'))),hero=PNG.sync.read(fs.readFileSync(path.join(source,'reference.png'))),back=PNG.sync.read(fs.readFileSync(path.join(source,'hidden-torso.png'))),W=original.width,H=original.height;
assert.equal(hero.width,W);assert.equal(hero.height,H);
const scale=W/1254,poly=points=>points.map(([x,y])=>[x*scale,y*H/1254]),weapon=poly([[1127,475],[1250,585],[1245,878],[1197,996],[1107,1110],[1079,1080],[1000,969],[965,886],[943,730],[945,562]]),hand=[],shieldMask=new Uint8Array(W*H);
const clothMask=new Uint8Array(W*H),clothArea=poly([[600,850],[890,850],[1005,900],[1005,1055],[890,1100],[780,1110],[620,1065],[590,960]]);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4,[r,g,b,a]=hero.data.subarray(k,k+4);const navy=b>g*1.1&&b>r*1.2,gold=r>g*1.22&&g>b*1.25;if(a&&inside(clothArea,x,y)&&(navy||gold))clothMask[i]=1;}
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!hero.data[i*4+3]||!inside(weapon,x,y))continue;
 const [r,g,b]=hero.data.subarray(i*4,i*4+3),skin=b>r*1.15&&g>r*1.1;
 if(inside(hand,x,y)&&!(y<635*H/1254&&!skin))continue;
 shieldMask[i]=1;
}
for(let i=0;i<W*H;i++)if(shieldMask[i])clothMask[i]=0;
const layerPages=JSON.parse(fs.readFileSync(path.join(source,'base-walk-layers.json'))).pages,atlas=fs.readFileSync(path.join(source,'base-rig.atlas'),'utf8'),pages=atlas.split(/\r?\n/).filter(line=>/^\S+\.png$/.test(line)),shield=new PNG({width:W,height:H});
for(let i=0;i<W*H;i++)if(shieldMask[i])hero.data.copy(shield.data,i*4,i*4,i*4+4);
cleanFootFragments(shield.data,W,H,0);
for(const page of pages){
 const name=page.slice(0,-4),mask=PNG.sync.read(fs.readFileSync(path.join(source,'base-textures',page))),spec=name==='walk-staff'?{x0:0,y0:0,w:W,h:H}:layerPages.find(p=>p.name===name)||{x0:0,y0:0,w:W,h:H},png=new PNG({width:name==='walk-staff'?W:mask.width,height:name==='walk-staff'?H:mask.height}),isWeapon=['staff','clean-staff','walk-staff'].includes(name);
 for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){
  const k=(y*png.width+x)*4,sx=x+spec.x0,sy=y+spec.y0,i=sy*W+sx,sk=i*4;
  if(isWeapon){shield.data.copy(png.data,k,sk,sk+4);continue;}
  if(['art','clean-art','walk-body','walk-farLeg','walk-nearLeg'].includes(name)&&clothMask[i])continue;
  // The shield has no lower shaft occluding the foot. Keep the warrior's whole
  // outer toe, including the few pixels previously hidden behind the staff.
  if(['art','clean-art','walk-farLeg'].includes(name)&&sy>=1105*H/1254&&sx>=690*W/1254&&sx<1020*W/1254){hero.data.copy(png.data,k,sk,sk+4);continue;}
  if(!mask.data[k+3]||shieldMask[i])continue;
  if(name==='walk-back'){
   const bx=Math.min(back.width-1,Math.round(sx*back.width/W)),by=Math.min(back.height-1,Math.round(sy*back.height/H)),bk=(by*back.width+bx)*4;back.data.copy(png.data,k,bk,bk+4);png.data[k+3]=Math.round(png.data[k+3]*mask.data[k+3]/255);
  }else{
   hero.data.copy(png.data,k,sk,sk+4);const sourceAlpha=original.data[sk+3]||255;png.data[k+3]=Math.round(png.data[k+3]*Math.min(1,mask.data[k+3]/sourceAlpha));
  }
 }
 fs.writeFileSync(path.join(out,page),PNG.sync.write(png));
}
// Only weapon geometry changes: the original staff mesh omitted empty cells
// around the wider shield guard. Bone names, transforms and all timelines stay exact.
const setup=pose(rig),staff=setup.staff,index=rig.bones.findIndex(b=>b.name==='staff'),angle=deg(Math.atan2(staff.c,staff.a)),world=[[0,0],[W,0],[W,H],[0,H]].map(([x,y])=>[x-W/2,H-y]),vertices=[];
for(const p of world){const q=rot([p[0]-staff.x,p[1]-staff.y],-angle);vertices.push(1,index,...q,1);}
for(const name of ['staff','clean-staff'])rig.skins[0].attachments.staff[name]={type:'mesh',path:name,uvs:[0,0,1,0,1,1,0,1],vertices:[...vertices],triangles:[0,1,2,0,2,3],hull:4,width:W,height:H};
const shieldCenter=rot([-staff.x,H/2-staff.y],-angle);
rig.skins[0].attachments['walk-staff']['walk-staff']={type:'region',path:'walk-staff',x:shieldCenter[0],y:shieldCenter[1],rotation:-angle,width:W,height:H};
const cloth=new PNG({width:W,height:H});let clothPixels=0;
for(let i=0;i<W*H;i++)if(clothMask[i]){hero.data.copy(cloth.data,i*4,i*4,i*4+4);clothPixels++;}
assert.ok(clothPixels>50,'Protector cloth patch was not found');fs.writeFileSync(path.join(out,'protector-cloth.png'),PNG.sync.write(cloth));
const body=setup.body,bodyAngle=deg(Math.atan2(body.c,body.a)),clothCenter=rot([-body.x,H/2-body.y],-bodyAngle);
rig.skins[0].attachments['protector-cloth']={'protector-cloth':{type:'region',path:'protector-cloth',x:clothCenter[0],y:clothCenter[1],rotation:-bodyAngle,width:W,height:H}};
rig.slots.splice(rig.slots.findIndex(slot=>slot.name==='art'),0,{name:'protector-cloth',bone:'body'});
// A shield is held in front of the torso, including during the bash.
const equipment=rig.slots.filter(slot=>['staff','walk-staff'].includes(slot.name));
rig.slots=rig.slots.filter(slot=>!['staff','walk-staff'].includes(slot.name)).concat(equipment);
for(const animation of Object.values(rig.animations))animation.slots['protector-cloth']={attachment:[{time:0,name:'protector-cloth'}]};
const protectorAtlas=atlas.replace(/walk-staff\.png[\s\S]*?(?=\n\n|$)/,`walk-staff.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nwalk-staff\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1`)+`\nprotector-cloth.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nprotector-cloth\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`;
assert.deepEqual(rig.bones,base.bones);
for(const [name,animation]of Object.entries(rig.animations)){const motion=structuredClone(animation);delete motion.slots['protector-cloth'];assert.deepEqual(motion,base.animations[name]);}
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'rig.atlas'),protectorAtlas);fs.copyFileSync(path.join(source,'reference.png'),path.join(out,'reference.png'));fs.copyFileSync(path.join(source,'bones.json'),path.join(out,'bones-built.json'));
fs.writeFileSync(path.join(out,'walk-layers.json'),JSON.stringify({pages:layerPages.map(p=>p.name==='walk-staff'?{name:p.name,x0:0,y0:0,w:W,h:H}:p)},null,2));
const manifestPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(manifestPath)),shaman=catalog.models.find(m=>m.id==='verdant-shaman');
const entry={...structuredClone(shaman),id:'jade-protector',name:'Jade Protector',skeleton:'models/jade-protector/animated.json',atlas:'models/jade-protector/rig.atlas',reference:{...shaman.reference,image:'models/jade-protector/reference.png'},description:'Protector cu armură grea și scut.',explanation:'Aceeași anatomie și aceleași mișcări ca șamanul, cu piele verde de jad, armură argintie, ținută bleumarin și scut.',animations:shaman.animations.map(a=>({...a,label:{idle:'Respirație',walk:'Mers',attack:'Lovitură cu scutul'}[a.name]||a.label}))};
delete entry.baseSpecies;delete entry.stage;delete entry.stageLabel;
catalog.models=catalog.models.filter(m=>m.id!=='jade-protector');catalog.models.push(entry);fs.writeFileSync(manifestPath,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({model:entry.id,bones:rig.bones.length,sameBones:true,sameAnimations:true,pages:pages.length}));
