// Sea Dragon swim / attack / special effects inspected in the native Spine runtime.
import fs from 'node:fs';
const reference=JSON.parse(fs.readFileSync(new URL('../source/pelagisaur/sea.json',import.meta.url))),frames=reference.animations.find(a=>a.name==='fly').frames,curve=frames.slice(0,-1).map(f=>f.pelvis.y),minimum=Math.min(...curve),maximum=Math.max(...curve);
const cyclic=(values,phase)=>{const n=values.length,u=((phase%1)+1)%1*n,i=Math.floor(u),f=u-i,get=k=>values[(k%n+n)%n],a=get(i-1),b=get(i),c=get(i+1),d=get(i+2);return .5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);};
export const origin=[920,480];
export const world=p=>[p[0]-origin[0],origin[1]-p[1]];
export const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
export const rotate=(p,a)=>{const r=a*Math.PI/180;return [Math.cos(r)*p[0]-Math.sin(r)*p[1],Math.sin(r)*p[0]+Math.cos(r)*p[1]];};
export const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*x*(x*(x*6-15)+10);};
export const durations={idle:4,swim:2.4,attack:3};
export const legNames=[];
export const fins=['nearFront','farFront','nearHind','farHind'];
export const paths={nearFront:[[1020,559],[617,819]],farFront:[[1120,596],[1300,783]],nearHind:[[607,516],[219,711]],farHind:[[574,532],[201,584]],neck:[[1175,500],[1390,375],[1455,250],[1560,142]],head:[[1560,142],[1710,150]],tail:[[570,481],[370,441],[183,386],[51,328]]};
const profile=(keys,t)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)[1];};
export function pose(animation,t){const w=t/durations[animation]*Math.PI*2,p={x:0,y:0,rotation:0,neck:0,head:0,tail:0};
 if(animation==='idle'){p.y=2*Math.sin(w);p.rotation=.15*Math.sin(w);p.neck=.45*Math.sin(w+.3);p.head=-p.neck*.5;p.tail=.9*Math.sin(w-.5);}
 if(animation==='swim'){p.y=maximum>minimum?(cyclic(curve,t/durations.swim)-(minimum+maximum)/2)*6/(maximum-minimum):3*Math.sin(w);p.rotation=.4*Math.sin(w);p.neck=.9*Math.sin(w-.3);p.head=-p.neck*.5;p.tail=1.8*Math.sin(w-.65);}
 if(animation==='attack'){p.x=profile([[0,0],[.65,-12],[.95,-12],[1.35,45],[1.65,45],[2.5,0],[3,0]],t);p.y=profile([[0,0],[.8,4],[1.35,-10],[1.65,-10],[2.5,0],[3,0]],t);p.rotation=profile([[0,0],[.8,.5],[1.35,-1.2],[1.7,-1.2],[2.5,0],[3,0]],t);p.neck=profile([[0,0],[.8,1.5],[1.35,-3],[1.7,-3],[2.5,0],[3,0]],t);p.head=-p.neck*.35;p.tail=-p.rotation*1.5;}
 return p;}
export function transforms(bones,animation,t){const p=pose(animation,t),w=t/durations[animation]*Math.PI*2,result={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}};
 for(const b of bones){if(result[b.name])continue;const parent=result[b.parent],v=rotate([b.x||0,b.y||0],parent.angle);let delta=0;if(b.name.startsWith('neck'))delta=p.neck/3;if(b.name==='head')delta=p.head;if(b.name.startsWith('tail'))delta=p.tail/3;
  if(fins.includes(b.name)){const offset={nearFront:0,farFront:.25,nearHind:.65,farHind:.85}[b.name],direction=b.name==='farFront'?-1:1;delta=(animation==='swim'?7:2)*Math.sin(w+offset)*direction;if(animation==='attack')delta=profile([[0,0],[.7,-6],[1,-6],[1.4,11],[1.7,11],[2.5,0],[3,0]],t)*direction;}
  result[b.name]={x:parent.x+v[0],y:parent.y+v[1],angle:parent.angle+(b.rotation||0)+delta};
 }return {pose:p,bones:result};}
