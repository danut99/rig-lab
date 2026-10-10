// Normalized rigid-transform blending. Linear position blending shrinks
// a limb between differently rotated bones; dual-quaternion blending
// interpolates the rotation itself before transforming the artwork.
export function skinLeg(layer,setup,current){
 const motions=Object.fromEntries(Object.entries(setup).map(([name,rest])=>{
  const bone=current[name],angle=(bone.angle-rest.angle)*Math.PI/180;
  const c=Math.cos(angle),s=Math.sin(angle),w=Math.cos(angle/2),z=Math.sin(angle/2);
  const tx=bone.x-c*rest.x+s*rest.y,ty=bone.y-s*rest.x-c*rest.y;
  const sign=w<0?-1:1;
  return [name,[w*sign,z*sign,(tx*w+ty*z)*.5*sign,(ty*w-tx*z)*.5*sign]];
 }));
 const result=layer.points.map((point,i)=>{
  let w=0,z=0,dx=0,dy=0;
  for(const [name,weight] of layer.weights[i]){const q=motions[name];w+=q[0]*weight;z+=q[1]*weight;dx+=q[2]*weight;dy+=q[3]*weight;}
  const norm=Math.hypot(w,z);w/=norm;z/=norm;dx/=norm;dy/=norm;
  const c=w*w-z*z,s=2*w*z;
  return [c*point[0]-s*point[1]+2*(dx*w-dy*z),s*point[0]+c*point[1]+2*(dx*z+dy*w)];
 });
 if(layer.preserveStrips===false)return result;
 // Keep each transverse strip at its painted width. Different skin
 // weights across a strip otherwise pull its two sides together even
 // when the interpolated rotations themselves are normalized.
 const rows=new Map();layer.points.forEach((p,i)=>{if(!rows.has(p[1]))rows.set(p[1],[]);rows.get(p[1]).push(i);});
 const rootName=layer.weights.flat().find(([name])=>name.endsWith('LegUpper'))[0],root=setup[rootName];
 for(const row of rows.values()){
  row.sort((a,b)=>layer.points[a][0]-layer.points[b][0]);
  const strips=[];let strip=[];
  for(const i of row){if(strip.length&&layer.points[i][0]-layer.points[strip.at(-1)][0]>12.01){strips.push(strip);strip=[];}strip.push(i);}if(strip.length)strips.push(strip);
  for(const ids of strips){
   if(ids.length<2)continue;
   const fixed=ids.filter(i=>layer.weights[i].length===1&&layer.weights[i][0][0]==='body');
   let direction;
   if(fixed.length>1){const a=current.body.angle*Math.PI/180;direction=[Math.cos(a),Math.sin(a)];}
   else{const a=result[ids[0]],b=result[ids.at(-1)],length=Math.hypot(b[0]-a[0],b[1]-a[1]);direction=[(b[0]-a[0])/length,(b[1]-a[1])/length];}
   const anchor=fixed[0]??ids[Math.floor(ids.length/2)],center=[...result[anchor]],x=layer.points[anchor][0];
   const distanceFromRoot=Math.hypot(x-root.x,layer.points[anchor][1]-root.y);
   let correction=Math.max(0,Math.min(1,(distanceFromRoot-200)/160));correction=correction*correction*(3-2*correction);
   if(fixed.length)correction=0;
   for(const i of ids){const distance=layer.points[i][0]-x,target=[center[0]+direction[0]*distance,center[1]+direction[1]*distance];result[i]=result[i].map((v,k)=>v+(target[k]-v)*correction);}
  }
 }
 return result;
}
