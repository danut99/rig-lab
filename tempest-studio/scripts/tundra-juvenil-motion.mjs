// War Thorn adult: breathe / four-foot walk / attack preparation study.
// Authored contacts and a horn shove for this specific ceratopsian drawing.
export const origin=[800, 570];
export const world=p=>[p[0]-origin[0],origin[1]-p[1]];
export const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
export const rotate=(p,a)=>{const r=a*Math.PI/180;return [Math.cos(r)*p[0]-Math.sin(r)*p[1],Math.sin(r)*p[0]+Math.cos(r)*p[1]];};
export const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*x*(x*(x*6-15)+10);};
export const durations={idle:3.4,walk:2.4,attack:2.8};
export const paths={"nearHind": [[551, 633], [417, 799], [393, 909], [467, 941]], "farHind": [[707, 730], [679, 813], [718, 885], [779, 903]], "nearFront": [[935, 665], [1000, 831], [963, 944], [1040, 974]], "farFront": [[1174, 728], [1240, 817], [1210, 910], [1279, 940]], "neck": [[890, 557], [1030, 550], [1160, 540]], "head": [[1160, 540], [1365, 546]], "tail": [[439, 577], [275, 628], [95, 580]]};
export const legNames=['nearHind','farHind','nearFront','farFront'];
export const phases={nearHind:0,farFront:.25,farHind:.5,nearFront:.75};
export const stance=.78;
const profile=(keys,t)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)[1];};
export function pose(animation,t){
 const w=t/durations[animation]*Math.PI*2,p={x:0,y:0,rotation:0,head:0,neck:0,tail:0};
 if(animation==='idle'){p.y=1.5*Math.sin(w);p.rotation=.18*Math.sin(w);p.head=.45*Math.sin(w+.4);p.neck=.12*Math.sin(w+.4);p.tail=.7*Math.sin(w-.5);}
 if(animation==='walk'){p.y=-2*(1-Math.cos(w*2));p.rotation=.22*Math.sin(w);p.head=-.5*Math.sin(w+.25);p.neck=-p.rotation*.4;p.tail=1.2*Math.sin(w-.5);}
 if(animation==='attack'){
  p.x=profile([[0,0],[.55,-12],[.8,-12],[1.08,42],[1.28,42],[2.15,0],[2.8,0]],t);
  p.y=profile([[0,0],[.6,-9],[.82,-9],[1.12,-4],[1.4,-5],[2.15,0],[2.8,0]],t);
  p.rotation=profile([[0,0],[.65,.8],[.85,.8],[1.1,-.7],[1.4,-.7],[2.15,0],[2.8,0]],t);
  p.head=profile([[0,0],[.65,-4.5],[.85,-4.5],[1.08,-6.5],[1.32,-6.5],[1.85,1],[2.4,0],[2.8,0]],t);
  p.neck=profile([[0,0],[.65,-.7],[1.1,-1],[1.4,-1],[2.3,0],[2.8,0]],t);p.tail=-p.rotation*.8;
 }
 for(const k of Object.keys(p))p[k]*=0.9;
 return p;
}
export function targetFoot(side,animation,t,p){
 const ankle=[...world(paths[side][2])];let angle=0;
 if(animation==='walk'){
  const phase=((t/durations.walk+phases[side])%1+1)%1,stride=side.startsWith('near')?22:16;
  if(phase<stance)ankle[0]+=stride*(.5-phase/stance);
  else{const u=(phase-stance)/(1-stance),u2=u*u,u3=u2*u,tangent=-stride*(1-stance)/stance;
   ankle[0]+=(2*u3-3*u2+1)*(-stride/2)+(-2*u3+3*u2)*(stride/2)+(2*u3-3*u2+u)*tangent;
   const lift=Math.sin(Math.PI*u)**2;ankle[1]+=(side.startsWith('near')?18:14)*lift;angle=4*lift;
  }
 }
 if(animation==='attack')ankle[0]+=p.x;
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
  if(b.name.startsWith('tail'))delta=p.tail/(paths.tail.length-1);
  result[b.name]={x:parent.x+v[0],y:parent.y+v[1],angle:parent.angle+(b.rotation||0)+delta};
 }
 return {pose:p,bones:result};
}
