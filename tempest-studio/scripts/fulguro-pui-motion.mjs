// Authored for the painted, forward-leaning feathered raptor. Reference timings and
// weight shifts: Robo Ravager walk; Primal Rage attack / special1.
export const origin=[960, 535];
export const world=p=>[p[0]-origin[0],origin[1]-p[1]];
export const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
export const rotate=(p,a)=>{const r=a*Math.PI/180;return [Math.cos(r)*p[0]-Math.sin(r)*p[1],Math.sin(r)*p[0]+Math.cos(r)*p[1]];};
export const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*x*(x*(x*6-15)+10);};
export const durations={idle:3.2,walk:1.8,attack:3};
export const paths={"nearLeg": [[990, 525], [1040, 783], [1190, 916], [1280, 965]], "farLeg": [[863, 601], [752, 715], [709, 862], [775, 925]], "nearArm": [[1200, 555], [1190, 605], [1260, 650], [1320, 758]], "farArm": [[1320, 560], [1390, 545], [1430, 618], [1460, 685]], "neck": [[1190, 495], [1280, 380], [1250, 255], [1270, 169]], "head": [[1270, 169], [1400, 193]], "tail": [[861, 474], [660, 441], [438, 379], [250, 302], [100, 250]]};
export const legNames=['nearLeg','farLeg'];
export const phases={nearLeg:0,farLeg:.5};
export const stance=.64;
const profile=(keys,t)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)[1];};
export function pose(animation,t){
 const w=t/durations[animation]*Math.PI*2;
 const p={x:0,y:0,rotation:0,neck:0,head:0,tail:0};
 if(animation==='idle'){p.y=-1*(1-Math.cos(w));p.neck=.5*Math.sin(w+.4);p.head=-p.neck*.6;p.tail=1.2*Math.sin(w-.4);}
 if(animation==='walk'){
  p.y=-4*(1-Math.cos(w*2))/2;p.rotation=.8*Math.sin(w);p.neck=-p.rotation*.8;p.head=-p.neck*.5;p.tail=2.4*Math.sin(w-.45);
 }
 if(animation==='attack'){
  // Raise the near claws, sweep down, then settle onto the support feet.
  p.x=profile([[0,0],[.55,-18],[.9,-18],[1.2,65],[1.45,65],[2.25,0],[3,0]],t);
  p.y=profile([[0,0],[.75,-12],[1.2,-5],[1.6,-10],[2.35,0],[3,0]],t);
  p.rotation=profile([[0,0],[.75,2.5],[1.25,-4],[1.6,-4],[2.35,0],[3,0]],t);
  p.neck=-p.rotation*.6;p.head=profile([[0,0],[.8,2],[1.35,-5],[2.2,0],[3,0]],t);p.tail=-p.rotation*.65;
 }
 if(animation==='attack'){p.x*=.65;p.rotation*=.55;}
 for(const k of Object.keys(p))p[k]*=0.7;
 return p;
}
export function targetFoot(side,animation,t,p){
 const rest=paths[side].map(world),ankle=[...rest[2]];let angle=0;
 if(animation==='walk'){
  const phase=((t/durations.walk+phases[side])%1+1)%1,stride=side==='nearLeg'?20:16;
  if(phase<stance)ankle[0]+=stride*(.5-phase/stance);
  else{const u=(phase-stance)/(1-stance),u2=u*u,u3=u2*u,tangent=-stride*(1-stance)/stance;
   ankle[0]+=(2*u3-3*u2+1)*(-stride/2)+(-2*u3+3*u2)*(stride/2)+(2*u3-3*u2+u)*tangent;
   const lift=Math.sin(Math.PI*u)**2;ankle[1]+=(side==='nearLeg'?18:12)*lift;angle=8*lift;
  }
 }
 if(animation==='attack'){
  // Carry the forward step while the toes retain their floor height.
  ankle[0]+=p.x*(side==='nearLeg'?.8:.65);
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
// The two painted hands overlap. A shared rigid motion keeps all six
// claws coherent; each elbow solves its own connected chain to that hand.
function solveArm(side,animation,t){
 const [hip,knee,wrist,tip]=paths[side].map(world),pivot=world(paths.nearArm[2]),w=t/durations[animation]*Math.PI*2;
 let angle=.45*Math.sin(w),x=0,y=.8*Math.sin(w);
 if(animation==='walk'){angle=1.4*Math.sin(w+.2);x=1.5*Math.sin(w);y=Math.sin(w*2);}
 if(animation==='attack'){
  angle=profile([[0,0],[.65,5],[.88,5],[1.22,-4],[1.5,-4],[2.3,0],[3,0]],t);
  x=profile([[0,0],[.65,-4],[.88,-4],[1.22,8],[1.5,8],[2.3,0],[3,0]],t);
  y=profile([[0,0],[.65,4],[.88,4],[1.22,-2],[1.5,-2],[2.3,0],[3,0]],t);
 }
 const q=rotate([wrist[0]-pivot[0],wrist[1]-pivot[1]],angle),end=[pivot[0]+q[0]+x,pivot[1]+q[1]+y],L1=Math.hypot(knee[0]-hip[0],knee[1]-hip[1]),L2=Math.hypot(wrist[0]-knee[0],wrist[1]-knee[1]),delta=[end[0]-hip[0],end[1]-hip[1]],d=Math.hypot(...delta);
 if(d>=L1+L2||d<=Math.abs(L1-L2))throw Error('Arm target unreachable');
 const theta=Math.atan2(delta[1],delta[0]),bend=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d)))),sign=Math.sign((wrist[0]-hip[0])*(knee[1]-hip[1])-(wrist[1]-hip[1])*(knee[0]-hip[0])),a=theta+sign*bend,joint=[hip[0]+Math.cos(a)*L1,hip[1]+Math.sin(a)*L1],finger=rotate([tip[0]-wrist[0],tip[1]-wrist[1]],angle);
 return [hip,joint,end,[end[0]+finger[0],end[1]+finger[1]]];
}
export function transforms(bones,animation,t){
 const p=pose(animation,t),result={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}};
 for(const side of ['nearLeg','farLeg']){const pts=solveLeg(side,animation,t,p).points;['Upper','Lower','Foot'].forEach((part,i)=>result[side+part]={x:pts[i][0],y:pts[i][1],angle:deg([pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]])});}
 for(const side of ['nearArm','farArm']){const pts=solveArm(side,animation,t);['Upper','Lower','Hand'].forEach((part,i)=>result[side+part]={x:pts[i][0],y:pts[i][1],angle:deg([pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]])});}
 for(const b of bones){if(result[b.name])continue;const parent=result[b.parent],v=rotate([b.x||0,b.y||0],parent.angle);let delta=0;
  if(b.name.startsWith('neck'))delta=p.neck/3;if(b.name==='head')delta=p.head;
  if(b.name.startsWith('tail'))delta=p.tail/(paths.tail.length-1);

  result[b.name]={x:parent.x+v[0],y:parent.y+v[1],angle:parent.angle+(b.rotation||0)+delta};
 }
 return {pose:p,bones:result};
}
