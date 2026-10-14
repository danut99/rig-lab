import fs from 'node:fs';
import {PNG} from 'pngjs';
for(const name of ['art','staff','walk-staff']){
 const png=PNG.sync.read(fs.readFileSync(`public/models/verdant-shaman/${name}.png`)),seen=new Uint8Array(png.width*png.height),parts=[];
 for(let i=0;i<seen.length;i++){
  if(seen[i]||!png.data[i*4+3])continue;const todo=[i];seen[i]=1;let x0=png.width,y0=png.height,x1=0,y1=0;
  for(let j=0;j<todo.length;j++){const k=todo[j],x=k%png.width,y=Math.floor(k/png.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*png.width+nx;if(nx<0||nx>=png.width||ny<0||ny>=png.height||seen[n]||!png.data[n*4+3])continue;seen[n]=1;todo.push(n);}}
  if(y1>png.height-220)parts.push({pixels:todo.length,x0,y0,x1,y1});
 }
 console.log(name,JSON.stringify(parts.sort((a,b)=>b.pixels-a.pixels).slice(0,20)));
}
