// Flaming Rock walking and attack preparation reference, adapted for a club-tailed ankylosaur.
import fs from 'node:fs';
const reference=JSON.parse(fs.readFileSync(new URL('../source/ferrankyl-pui/flamingrock.json',import.meta.url))),frames=reference.animations.find(a=>a.name==='walk').frames,hips=frames.slice(0,-1).map(f=>f.pelvis.y),hipMin=Math.min(...hips),hipMax=Math.max(...hips);
function cyclic(values,phase){const n=values.length,u=((phase%1)+1)%1*n,i=Math.floor(u),f=u-i,get=k=>values[(k%n+n)%n],a=get(i-1),b=get(i),c=get(i+1),d=get(i+2);return .5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);}
export const origin=[950,430];
export const world=p=>[p[0]-origin[0],origin[1]-p[1]];
export const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
export const rotate=(p,a)=>{const r=a*Math.PI/180;return [Math.cos(r)*p[0]-Math.sin(r)*p[1],Math.sin(r)*p[0]+Math.cos(r)*p[1]];};
export const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*x*(x*(x*6-15)+10);};
export const durations={idle:4.2,walk:2.8,attack:2.8};
export const paths={"nearHind": [[610, 651], [568, 785], [477, 835], [549, 866]], "farHind": [[750, 735], [710, 799], [746, 835], [804, 849]], "nearFront": [[1015, 646], [980, 778], [1090, 851], [1135, 890]], "farFront": [[1195, 700], [1225, 793], [1280, 831], [1330, 856]], "neck": [[1140, 640], [1250, 600], [1350, 560]], "head": [[1350, 560], [1470, 580]], "tail": [[520, 650], [330, 610], [215, 510], [155, 415]]};
export const legNames=['nearHind','farHind','nearFront','farFront'];
export const phases={nearHind:0,farFront:.25,farHind:.5,nearFront:.75};
export const stance=.8;
const profile=(keys,t)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)[1];};
export function pose(animation,t){
 const w=t/durations[animation]*Math.PI*2,p={x:0,y:0,rotation:0,head:0,neck:0,tail:0};
 if(animation==='idle'){p.y=-.8*(1-Math.cos(w));p.rotation=.08*Math.sin(w);p.head=.45*Math.sin(w+.4);p.neck=.12*Math.sin(w+.4);p.tail=.7*Math.sin(w-.5);}
 if(animation==='walk'){
  p.y=-2.8*(hipMax-cyclic(hips,t/durations.walk))/(hipMax-hipMin);
  p.rotation=.12*Math.sin(w);p.head=-.35*Math.sin(w+.25);p.neck=-p.rotation*.4;p.tail=.9*Math.sin(w-.5);
 }
 if(animation==='attack'){
  p.y=profile([[0,0],[.65,-5],[1,-5],[1.5,-7],[1.8,-2],[2.5,0],[2.8,0]],t);
  p.rotation=profile([[0,0],[.75,-.25],[1,-.25],[1.5,.3],[1.8,.3],[2.5,0],[2.8,0]],t);
  p.head=profile([[0,0],[.8,-1],[1.5,1],[2.5,0],[2.8,0]],t);p.neck=-p.head*.3;
  p.tail=profile([[0,0],[.7,-9],[1.05,-9],[1.5,20],[1.68,20],[2.45,0],[2.8,0]],t);
 }

 return p;
}
export function targetFoot(side,animation,t,p){
 const ankle=[...world(paths[side][2])];let angle=0;
 if(animation==='walk'){
  const phase=((t/durations.walk+phases[side])%1+1)%1,stride=side.startsWith('near')?24:18;
  if(phase<stance)ankle[0]+=stride*(.5-phase/stance);
  else{const u=(phase-stance)/(1-stance),u2=u*u,u3=u2*u,tangent=-stride*(1-stance)/stance;
   ankle[0]+=(2*u3-3*u2+1)*(-stride/2)+(-2*u3+3*u2)*(stride/2)+(2*u3-3*u2+u)*tangent;
   const lift=Math.sin(Math.PI*u)**2;ankle[1]+=(side.startsWith('near')?20:15)*lift;angle=3*lift;
  }
 }

 return {ankle,angle};
}
export function solveLeg(side,animation,t,p){
 const [hip,knee,ankle,toe]=paths[side].map(world),target=targetFoot(side,animation,t,p),local=rotate([target.ankle[0]-p.x,target.ankle[1]-p.y],-p.rotation);
 const L1=Math.hypot(knee[0]-hip[0],knee[1]-hip[1]),L2=Math.hypot(ankle[0]-knee[0],ankle[1]-knee[1]),delta=[local[0]-hip[0],local[1]-hip[1]],raw=Math.hypot(...delta),d=Math.min(L1+L2-.01,Math.max(Math.abs(L1-L2)+.01,raw));
 const end=[hip[0]+delta[0]*d/raw,hip[1]+delta[1]*d/raw],theta=Math.atan2(delta[1],delta[0]),bend=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d)))),sign=Math.sign((ankle[0]-hip[0])*(knee[1]-hip[1])-(ankle[1]-hip[1])*(knee[0]-hip[0]));
 const a=theta+sign*bend,k=[hip[0]+Math.cos(a)*L1,hip[1]+Math.sin(a)*L1],foot=rotate([toe[0]-ankle[0],toe[1]-ankle[1]],target.angle-p.rotation);
 return {points:[hip,k,end,[end[0]+foot[0],end[1]+foot[1]]],reachError:Math.max(0,raw-d)};
}
export function transforms(bones,animation,t){
 const p=pose(animation,t),result={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}};
 for(const side of legNames){const pts=solveLeg(side,animation,t,p).points;['Upper','Lower','Foot'].forEach((part,i)=>result[side+part]={x:pts[i][0],y:pts[i][1],angle:deg([pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]])});}
 for(const b of bones){if(result[b.name])continue;const parent=result[b.parent],v=rotate([b.x||0,b.y||0],parent.angle);let delta=0;
  if(b.name.startsWith('neck'))delta=p.neck/2;if(b.name==='head')delta=p.head;
  if(b.name.startsWith('tail'))delta=p.tail/3;
  result[b.name]={x:parent.x+v[0],y:parent.y+v[1],angle:parent.angle+(b.rotation||0)+delta};
 }
 return {pose:p,bones:result};
}
