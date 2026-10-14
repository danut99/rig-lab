import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
const config=process.env.PALETTE_CONFIG?JSON.parse(fs.readFileSync(process.env.PALETTE_CONFIG)):null;
const roles=config?config.map(c=>[c.id,c.base,c.name]):[['fire-shaman','verdant-shaman','Șaman de foc'],['fire-warrior','azure-warrior','Războinic de foc'],['fire-protector','jade-protector','Protector de foc']];
const read=p=>PNG.sync.read(fs.readFileSync(p));
const catalog=JSON.parse(fs.readFileSync('public/manifest.json'));
for(const [id,base,name] of roles){
 const source=`source/${id}`,out=`public/models/${id}`,baseDir=`public/models/${base}`;
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(`${source}/base-textures`,{recursive:true});
 const original=read(`${baseDir}/reference.png`),generated=read(`${source}/generated-palette.png`),W=original.width,H=original.height;
 const hero=new PNG({width:W,height:H});
 // Register the generated palette to the existing canvas. Original alpha masks
 // remain authoritative, so changing habitat cannot open seams or alter joints.
 const sample=(x,y)=>{let gx=Math.min(generated.width-1,Math.floor((x+.5)*generated.width/W)),gy=Math.min(generated.height-1,Math.floor((y+.5)*generated.height/H)),k=(gy*generated.width+gx)*4;if(generated.data[k+3]>200)return k;for(let radius=1;radius<35;radius++)for(const [dx,dy]of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){const xx=gx+dx,yy=gy+dy;if(xx<0||yy<0||xx>=generated.width||yy>=generated.height)continue;const j=(yy*generated.width+xx)*4;if(generated.data[j+3]>200)return j;}return k;};
 const bins=new Map(),key=(r,g,b)=>((r>>4)<<8)|((g>>4)<<4)|(b>>4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;if(!original.data[k+3])continue;const g=sample(x,y);for(let c=0;c<3;c++)hero.data[k+c]=generated.data[g+c];hero.data[k+3]=original.data[k+3];if(original.data[k+3]<240)continue;const bin=key(...original.data.subarray(k,k+3)),v=bins.get(bin)||[0,0,0,0];for(let c=0;c<3;c++)v[c]+=hero.data[k+c];v[3]++;bins.set(bin,v);}
 const palette=[...bins].map(([key,v])=>({key,r:((key>>8)&15)*16+8,g:((key>>4)&15)*16+8,b:(key&15)*16+8,color:v.slice(0,3).map(c=>c/v[3])}));
 const recolor=(r,g,b)=>{const exact=bins.get(key(r,g,b));if(exact)return exact.slice(0,3).map(c=>c/exact[3]);let best,dist=Infinity;for(const p of palette){const d=(r-p.r)**2+(g-p.g)**2+(b-p.b)**2;if(d<dist){dist=d;best=p;}}return best.color;};
 fs.writeFileSync(`${out}/reference.png`,PNG.sync.write(hero));fs.copyFileSync(`${out}/reference.png`,`${source}/reference.png`);
 const atlas=fs.readFileSync(`${baseDir}/rig.atlas`,'utf8'),pages=atlas.split(/\r?\n/).filter(line=>/^\S+\.png$/.test(line)),layers=JSON.parse(fs.readFileSync(`${baseDir}/walk-layers.json`)).pages;
 for(const page of pages){fs.copyFileSync(`${baseDir}/${page}`,`${source}/base-textures/${page}`);const mask=read(`${baseDir}/${page}`),name=page.slice(0,-4),spec=layers.find(p=>p.name===name)||{x0:0,y0:0};const png=new PNG({width:mask.width,height:mask.height});for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){const k=(y*mask.width+x)*4,a=mask.data[k+3];if(!a)continue;const sx=x+spec.x0,sy=y+spec.y0,sk=(sy*W+sx)*4;let color;if(name==='walk-back'||!hero.data[sk+3])color=recolor(...mask.data.subarray(k,k+3));else color=hero.data.subarray(sk,sk+3);for(let c=0;c<3;c++)png.data[k+c]=Math.round(color[c]);png.data[k+3]=a;}fs.writeFileSync(`${out}/${page}`,PNG.sync.write(png));for(let k=3;k<png.data.length;k+=4)assert.equal(png.data[k],mask.data[k]);}
 for(const file of ['animated.json','rig.atlas','walk-layers.json','bones-built.json'])if(fs.existsSync(`${baseDir}/${file}`)){fs.copyFileSync(`${baseDir}/${file}`,`${out}/${file}`);fs.copyFileSync(`${baseDir}/${file}`,`${source}/base-${file}`);}
 const settings=config?.find(c=>c.id===id),entry=structuredClone(catalog.models.find(m=>m.id===base));Object.assign(entry,{id,name,baseSpecies:base,palette:settings?.palette||'fire',paletteLabel:settings?.paletteLabel||'Foc / Lavă',skeleton:`models/${id}/animated.json`,atlas:`models/${id}/rig.atlas`,description:settings?.description||`${name} — paletă pentru habitatul de lavă.`,explanation:settings?'Culori inspirate din oul acestui habitat. Scheletul, contururile pieselor și toate cele trei animații sunt păstrate.':'Piele roșie, pete de obsidian și accente de lavă. Scheletul, contururile pieselor și toate cele trei animații sunt păstrate.'});entry.reference.image=`models/${id}/reference.png`;catalog.models=catalog.models.filter(m=>m.id!==id);catalog.models.push(entry);
 const readme=`${name}\n\nSpine 3.8 JSON + atlas + PNG textures. Animations: idle (4s), walk (2.2s), attack (2.1s).\nExact skeleton, geometry, animation timelines and texture alpha masks from ${base}.\nGenerated palette artwork: source/${id}/generated-palette.png. Registered textures use the original masks.\nHidden torso pixels use a color palette sampled from the generated artwork.\n`;
 fs.writeFileSync(`${out}/README.md`,readme);fs.writeFileSync(`${source}/README.md`,readme);
 console.log(JSON.stringify({id,pages:pages.length,exactSkeleton:true,exactAnimations:true,exactAlphaMasks:true}));
}
fs.writeFileSync('public/manifest.json',JSON.stringify(catalog,null,2)+'\n');
