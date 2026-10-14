import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {inside,rot,deg} from '../../scripts/lib/geom.mjs';
import {pose} from '../../scripts/lib/spine.mjs';
import {cleanFootFragments} from './shaman-edge-cleanup.mjs';
const root=path.resolve(new URL('../',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')),source=path.join(root,'source/azure-warrior'),out=path.join(root,'public/models/azure-warrior');
fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(source,'base-rig.json'))),rig=structuredClone(base),original=PNG.sync.read(fs.readFileSync(path.join(source,'base-reference.png'))),hero=PNG.sync.read(fs.readFileSync(path.join(source,'reference.png'))),back=PNG.sync.read(fs.readFileSync(path.join(source,'hidden-torso.png'))),W=original.width,H=original.height;
assert.equal(hero.width,W);assert.equal(hero.height,H);
const scale=W/1254,poly=points=>points.map(([x,y])=>[x*scale,y*H/1254]),weapon=poly([[1160,45],[1240,145],[1220,545],[1254,645],[1140,655],[1140,775],[1100,870],[1010,825],[1030,730],[1040,640],[975,605],[1050,550],[1060,345],[1090,150]]),hand=poly([[1015,610],[1085,610],[1160,625],[1160,735],[1120,770],[1025,755],[985,710],[990,650]]),swordMask=new Uint8Array(W*H);
const clothMask=new Uint8Array(W*H),clothArea=poly([[680,980],[820,980],[820,1040],[770,1065],[690,1065]]);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4,[r,g,b,a]=hero.data.subarray(k,k+4);if(a&&inside(clothArea,x,y)&&r>g*1.35&&r>b*1.15)clothMask[i]=1;}
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x;if(!hero.data[i*4+3]||!inside(weapon,x,y))continue;
 const [r,g,b]=hero.data.subarray(i*4,i*4+3),skin=b>r*1.15&&g>r*1.1;
 if(inside(hand,x,y)&&!(y<635*H/1254&&!skin))continue;
 swordMask[i]=1;
}
const layerPages=JSON.parse(fs.readFileSync(path.join(source,'base-walk-layers.json'))).pages,atlas=fs.readFileSync(path.join(source,'base-rig.atlas'),'utf8'),pages=atlas.split(/\r?\n/).filter(line=>/^\S+\.png$/.test(line)),sword=new PNG({width:W,height:H});
for(let i=0;i<W*H;i++)if(swordMask[i])hero.data.copy(sword.data,i*4,i*4,i*4+4);
cleanFootFragments(sword.data,W,H,0);
for(const page of pages){
 const name=page.slice(0,-4),mask=PNG.sync.read(fs.readFileSync(path.join(source,'base-textures',page))),spec=name==='walk-staff'?{x0:0,y0:0,w:W,h:H}:layerPages.find(p=>p.name===name)||{x0:0,y0:0,w:W,h:H},png=new PNG({width:name==='walk-staff'?W:mask.width,height:name==='walk-staff'?H:mask.height}),isWeapon=['staff','clean-staff','walk-staff'].includes(name);
 for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){
  const k=(y*png.width+x)*4,sx=x+spec.x0,sy=y+spec.y0,i=sy*W+sx,sk=i*4;
  if(isWeapon){sword.data.copy(png.data,k,sk,sk+4);continue;}
  if(['walk-body','walk-farLeg','walk-nearLeg'].includes(name)&&clothMask[i])continue;
  // The sword has no lower shaft occluding the foot. Keep the warrior's whole
  // outer toe, including the few pixels previously hidden behind the staff.
  if(['art','clean-art','walk-farLeg'].includes(name)&&sy>=1105*H/1254&&sx>=690*W/1254&&sx<1020*W/1254){hero.data.copy(png.data,k,sk,sk+4);continue;}
  if(!mask.data[k+3]||swordMask[i])continue;
  if(name==='walk-back'){
   const bx=Math.min(back.width-1,Math.round(sx*back.width/W)),by=Math.min(back.height-1,Math.round(sy*back.height/H)),bk=(by*back.width+bx)*4;back.data.copy(png.data,k,bk,bk+4);png.data[k+3]=Math.round(png.data[k+3]*mask.data[k+3]/255);
  }else{
   hero.data.copy(png.data,k,sk,sk+4);const sourceAlpha=original.data[sk+3]||255;png.data[k+3]=Math.round(png.data[k+3]*Math.min(1,mask.data[k+3]/sourceAlpha));
  }
 }
 fs.writeFileSync(path.join(out,page),PNG.sync.write(png));
}
// Only weapon geometry changes: the original staff mesh omitted empty cells
// around the wider sword guard. Bone names, transforms and all timelines stay exact.
const setup=pose(rig),staff=setup.staff,index=rig.bones.findIndex(b=>b.name==='staff'),angle=deg(Math.atan2(staff.c,staff.a)),world=[[0,0],[W,0],[W,H],[0,H]].map(([x,y])=>[x-W/2,H-y]),vertices=[];
for(const p of world){const q=rot([p[0]-staff.x,p[1]-staff.y],-angle);vertices.push(1,index,...q,1);}
for(const name of ['staff','clean-staff'])rig.skins[0].attachments.staff[name]={type:'mesh',path:name,uvs:[0,0,1,0,1,1,0,1],vertices:[...vertices],triangles:[0,1,2,0,2,3],hull:4,width:W,height:H};
const swordCenter=rot([-staff.x,H/2-staff.y],-angle);
rig.skins[0].attachments['walk-staff']['walk-staff']={type:'region',path:'walk-staff',x:swordCenter[0],y:swordCenter[1],rotation:-angle,width:W,height:H};
const cloth=new PNG({width:W,height:H});let clothPixels=0;
for(let i=0;i<W*H;i++)if(clothMask[i]){hero.data.copy(cloth.data,i*4,i*4,i*4+4);clothPixels++;}
assert.ok(clothPixels>50,'Warrior cloth patch was not found');fs.writeFileSync(path.join(out,'warrior-cloth.png'),PNG.sync.write(cloth));
const body=setup.body,bodyAngle=deg(Math.atan2(body.c,body.a)),clothCenter=rot([-body.x,H/2-body.y],-bodyAngle);
rig.skins[0].attachments['warrior-cloth']={'warrior-cloth':{type:'region',path:'warrior-cloth',x:clothCenter[0],y:clothCenter[1],rotation:-bodyAngle,width:W,height:H}};
rig.slots.splice(rig.slots.findIndex(slot=>slot.name==='art'),0,{name:'warrior-cloth',bone:'body'});
for(const [name,animation]of Object.entries(rig.animations))animation.slots['warrior-cloth']={attachment:[{time:0,name:name==='idle'?null:'warrior-cloth'}]};
const warriorAtlas=atlas.replace(/walk-staff\.png[\s\S]*?(?=\n\n|$)/,`walk-staff.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nwalk-staff\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1`)+`\nwarrior-cloth.png\nsize: ${W},${H}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\nwarrior-cloth\n  rotate: false\n  xy: 0,0\n  size: ${W},${H}\n  orig: ${W},${H}\n  offset: 0,0\n  index: -1\n`;
assert.deepEqual(rig.bones,base.bones);
for(const [name,animation]of Object.entries(rig.animations)){const motion=structuredClone(animation);delete motion.slots['warrior-cloth'];assert.deepEqual(motion,base.animations[name]);}
fs.writeFileSync(path.join(out,'animated.json'),JSON.stringify(rig));fs.writeFileSync(path.join(out,'rig.atlas'),warriorAtlas);fs.copyFileSync(path.join(source,'reference.png'),path.join(out,'reference.png'));fs.copyFileSync(path.join(source,'bones.json'),path.join(out,'bones-built.json'));
fs.writeFileSync(path.join(out,'walk-layers.json'),JSON.stringify({pages:layerPages.map(p=>p.name==='walk-staff'?{name:p.name,x0:0,y0:0,w:W,h:H}:p)},null,2));
const manifestPath=path.join(root,'public/manifest.json'),catalog=JSON.parse(fs.readFileSync(manifestPath)),shaman=catalog.models.find(m=>m.id==='verdant-shaman');
const entry={...structuredClone(shaman),id:'azure-warrior',name:'Azure Warrior',skeleton:'models/azure-warrior/animated.json',atlas:'models/azure-warrior/rig.atlas',reference:{...shaman.reference,image:'models/azure-warrior/reference.png'},description:'Războinic cu armură și sabie.',explanation:'Aceeași anatomie și aceleași mișcări ca șamanul, cu piele albastră, armură metalică, mantie roșie și sabie.',animations:shaman.animations.map(a=>({...a,label:{idle:'Respirație',walk:'Mers',attack:'Atac cu sabia'}[a.name]||a.label}))};
delete entry.baseSpecies;delete entry.stage;delete entry.stageLabel;
catalog.models=catalog.models.filter(m=>m.id!=='azure-warrior');catalog.models.push(entry);fs.writeFileSync(manifestPath,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({model:entry.id,bones:rig.bones.length,sameBones:true,sameAnimations:true,pages:pages.length}));
