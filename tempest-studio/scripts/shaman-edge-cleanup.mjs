// Remove detached overlap remnants near the feet, not connected painted outlines.
export function trimStaffFootOutline(rgba,width,height){
 const edge=[[930,1000],[950,995],[980,989],[1000,985],[1030,975],[1080,976],[1120,985],[1160,992],[1200,995],[1254,995]];
 for(let y=Math.ceil(930*height/1254);y<height;y++){
  const sourceY=y*1254/height;let segment=0;while(segment<edge.length-2&&sourceY>edge[segment+1][0])segment++;
  const [y0,x0]=edge[segment],[y1,x1]=edge[segment+1],boundary=(x0+(x1-x0)*(sourceY-y0)/(y1-y0)-2)*width/1254;
  for(let x=0;x<boundary;x++)rgba[(y*width+x)*4+3]=0;
 }
 const alpha=Uint8Array.from({length:width*height},(_,i)=>rgba[i*4+3]);
 for(let y=Math.ceil(930*height/1254);y<height;y++)for(let x=0;x<1008*width/1254;x++){
  const i=y*width+x;if(!alpha[i])continue;let solid=0;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height&&alpha[ny*width+nx]>=80)solid++;}
  if(solid<12)rgba[i*4+3]=0;
 }
}
export function cleanFootFragments(rgba,width,height,startY=1020){
 const seen=new Uint8Array(width*height);let removed=0;
 for(let i=0;i<seen.length;i++){
  if(seen[i]||!rgba[i*4+3])continue;const pixels=[i];seen[i]=1;let minY=height;
  for(let j=0;j<pixels.length;j++){
   const k=pixels[j],x=k%width,y=Math.floor(k/width);minY=Math.min(minY,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy,n=ny*width+nx;
    if(nx<0||nx>=width||ny<0||ny>=height||seen[n]||!rgba[n*4+3])continue;
    seen[n]=1;pixels.push(n);
   }
  }
  if(minY>=startY*height/1254&&pixels.length<=128){for(const k of pixels)rgba[k*4+3]=0;removed+=pixels.length;}
 }
 return removed;
}
// Fully transparent pixels are stored as transparent black. The player draws with straight alpha and linear filtering,
// so a moved or rotated layer mixes that black into its edges: a dark dotted line wherever a cut runs through skin
// (the far thigh under the belly). Give transparent pixels near an edge the colour of the nearest painted pixel,
// keeping them transparent, so filtering blends in the same colour instead of black.
export function bleedEdges(rgba,width,height,radius=4){
 const dist=new Uint8Array(width*height).fill(255),queue=new Int32Array(width*height);let start=0,end=0;
 for(let i=0;i<width*height;i++)if(rgba[i*4+3]){dist[i]=0;queue[end++]=i;}
 while(start<end){const i=queue[start++],x=i%width,y=(i-x)/width,d=dist[i];if(d>=radius)continue;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const j=ny*width+nx;if(dist[j]<=d+1)continue;dist[j]=d+1;rgba[j*4]=rgba[i*4];rgba[j*4+1]=rgba[i*4+1];rgba[j*4+2]=rgba[i*4+2];rgba[j*4+3]=0;queue[end++]=j;}}
 return dist;
}
export function cleanThighSpecks(rgba,width,height){
 const alpha=Uint8Array.from({length:width*height},(_,i)=>rgba[i*4+3]);
 // Thin stray outlines can remain attached by nearly transparent pixels.
 // A real thigh edge has opaque skin immediately behind it; a speck does not.
 for(let y=Math.ceil(900*height/1254);y<1105*height/1254;y++)for(let x=0;x<width;x++){
  const i=y*width+x;if(!alpha[i])continue;let solid=0;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height&&alpha[ny*width+nx]>=80)solid++;}
  if(solid<12)rgba[i*4+3]=0;
 }
}
