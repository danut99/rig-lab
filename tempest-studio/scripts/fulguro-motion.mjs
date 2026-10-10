export const origin=[1000,500];
export const world=p=>[p[0]-origin[0],origin[1]-p[1]];
export const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
export const rad=d=>d*Math.PI/180;
export const rotate=(p,a)=>[Math.cos(rad(a))*p[0]-Math.sin(rad(a))*p[1],Math.sin(rad(a))*p[0]+Math.cos(rad(a))*p[1]];
export const durations={idle:3.2,walk:1.6,attack:2.6,ultimate:3.8};
export const paths={
 // The feathered hip belongs to the torso. The visible leg articulates
 // below that mass instead of rotating the whole painted feather fan.
 nearLeg:[[1035,625],[1055,755],[1220,938],[1390,974]],
 farLeg:[[930,575],[765,710],[705,925],[825,980]],
 nearArm:[[1240,470],[1190,555],[1280,610],[1330,710]],
 farArm:[[1260,470],[1280,535],[1360,552],[1410,646]],
 neck:[[1230,465],[1330,335],[1300,220],[1240,135]],
 head:[[1240,135],[1405,115]],
 tail:[[850,440],[650,430],[440,375],[300,320],[120,230]],
};
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
export function pose(animation,t){
 const duration=durations[animation],w=t/duration*Math.PI*2;
 let x=0,y=0,rotation=0,neck=0,head=0,arm=0,gather=0,launch=0;
 let tail=1.2*Math.sin(w);
 if(animation==='idle'){y=2*Math.sin(w);rotation=.25*Math.sin(w);neck=.6*Math.sin(w+.6);head=-neck*.6;arm=1.2*Math.sin(w);}
 if(animation==='walk'){
  y=-3*(1-Math.cos(w*2));rotation=.6*Math.sin(w);
  neck=-rotation*.6;head=-neck*.6;
  arm=4*Math.sin(w+.4);tail=2*Math.sin(w-.5);
 }
 if(animation==='attack'){
  gather=pulse(t,.05,.45,.55,.8);launch=pulse(t,.55,.8,1.05,1.65);
  x=-15*gather+65*launch;y=-8*gather+12*launch;rotation=3*gather-5*launch;neck=4*gather-6*launch;head=-2*gather+3*launch;arm=-8*gather+24*launch;tail=-rotation*.55;
 }
 if(animation==='ultimate'){
  gather=pulse(t,.05,.65,.72,1.05);launch=pulse(t,.8,1.15,1.6,2.35);const land=pulse(t,2,2.3,2.55,3.1);
  x=-20*gather+105*launch;y=-22*gather+65*launch-10*land;rotation=4*gather-8*launch+3*land;
  neck=2*gather-4*launch;head=2*launch;arm=-10*gather+28*launch;tail=-rotation*.65;
 }
 return {x,y,rotation,neck,head,arm,tail,gather,launch};
}
export function targetFoot(side,animation,t,p){
 const rest=paths[side].map(world),ankle=[...rest[2]];
 let angle=0;
 if(animation==='walk'){
  const phase=((t/durations.walk+(side==='farLeg'?.5:0))%1+1)%1,stance=.58,stride=side==='nearLeg'?100:140;
  ankle[0]=side==='nearLeg'?180:-175;
  if(phase<stance)ankle[0]+=stride*(.5-phase/stance);
  else{
   const u=(phase-stance)/(1-stance),u2=u*u,u3=u2*u;
   // Hermite return matches the support velocity at both ends: no
   // sudden stop at lift-off, touchdown or the animation loop.
   const tangent=-stride*(1-stance)/stance;
   ankle[0]+=(2*u3-3*u2+1)*(-stride/2)+(-2*u3+3*u2)*(stride/2)+(2*u3-3*u2+u)*tangent;
   const lift=Math.sin(Math.PI*u)**2;
   ankle[1]+=(side==='nearLeg'?55:80)*lift;angle=12*lift;
  }
 }
 if(animation==='attack'||animation==='ultimate'){
  // During the leap feet travel with the torso; during preparation and
  // recovery they keep their support height. No impossible stretched leg.
  ankle[0]+=Math.max(0,p.x);ankle[1]+=Math.max(0,p.y);
  if(side==='nearLeg'){ankle[0]+=22*p.launch;ankle[1]+=35*p.launch;angle=-9*p.launch;}
  else{ankle[0]-=12*p.launch;ankle[1]+=16*p.launch;angle=5*p.launch;}
 }
 return {ankle,angle};
}
export function solveLeg(side,animation,t,p){
 const rest=paths[side].map(world),[hip,knee,ankle,toe]=rest;
 const target=targetFoot(side,animation,t,p);
 const local=rotate([target.ankle[0]-p.x,target.ankle[1]-p.y],-p.rotation);
 const L1=Math.hypot(knee[0]-hip[0],knee[1]-hip[1]),L2=Math.hypot(ankle[0]-knee[0],ankle[1]-knee[1]);
 const delta=[local[0]-hip[0],local[1]-hip[1]],rawDistance=Math.hypot(...delta),d=Math.min(L1+L2-.01,Math.max(Math.abs(L1-L2)+.01,rawDistance));
 const end=[hip[0]+delta[0]*d/rawDistance,hip[1]+delta[1]*d/rawDistance];
 const theta=Math.atan2(delta[1],delta[0]),bend=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));
 const sign=Math.sign((ankle[0]-hip[0])*(knee[1]-hip[1])-(ankle[1]-hip[1])*(knee[0]-hip[0]));
 const a=theta+sign*bend,k=[hip[0]+Math.cos(a)*L1,hip[1]+Math.sin(a)*L1];
 const foot=rotate([toe[0]-ankle[0],toe[1]-ankle[1]],target.angle-p.rotation);
 return {points:[hip,k,end,[end[0]+foot[0],end[1]+foot[1]]],target:target.ankle,reachError:Math.max(0,rawDistance-d)};
}
export function transforms(bones,animation,t){
 const p=pose(animation,t),result={root:{x:0,y:0,angle:0},body:{x:0,y:0,angle:0}};
 for(const side of ['nearLeg','farLeg']){
  const pts=solveLeg(side,animation,t,p).points;
  ['Upper','Lower','Foot'].forEach((part,i)=>result[side+part]={x:pts[i][0],y:pts[i][1],angle:deg([pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]])});
 }
 for(const bone of bones){
  if(result[bone.name])continue;
  const parent=result[bone.parent],v=rotate([bone.x||0,bone.y||0],parent.angle);
  let delta=0;
  if(bone.name.startsWith('neck'))delta=p.neck/3;
  if(bone.name==='head')delta=p.head;
  if(bone.name.startsWith('tail'))delta=p.tail*[.2,.25,.25,.3][Number(bone.name.slice(4))-1];
  if(bone.name.includes('Arm')){
   const side=bone.name.startsWith('near')?1:.65;
   delta=p.arm*side*(bone.name.endsWith('Upper')?1:bone.name.endsWith('Lower')?-.45:.3);
  }
  result[bone.name]={x:parent.x+v[0],y:parent.y+v[1],angle:parent.angle+(bone.rotation||0)+delta};
 }
 return {pose:p,bones:result};
}
