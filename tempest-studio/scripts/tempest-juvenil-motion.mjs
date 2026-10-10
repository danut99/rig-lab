export const durations = {idle:3.2, walk:1.8, attack:3.2, ultimate:4.6};
export const wingPaths = {"farWing": [[945, 610], [746, 430], [635, 164], [26, 27]], "nearWing": [[1007, 650], [1138, 615], [1322, 520], [1511, 977]]};
export const pivot = [900,650];
export const world = p => [p[0]-pivot[0], pivot[1]-p[1]];
export const degrees = p => Math.atan2(p[1],p[0])*180/Math.PI;
const smooth = x => {x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
const pulse = (t,a,b,c,d) => smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
function profile(keys,t){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*ease((t-a)/(b-a));}
 return keys.at(-1)[1];
}
const flap=phase=>profile([[0,0],[.2,45],[.38,-68],[.74,0],[1,0]],((phase%1)+1)%1);
const attackWing=[[0,0],[.4,32],[.7,45],[1.05,-52],[1.5,-20],[1.85,48],[2.35,0],[3.2,0]];
const specialWing=[[0,0],[.35,25],[.7,48],[1.05,-58],[1.4,20],[1.75,0],[2.3,0],[2.7,-50],[3.1,48],[3.55,-30],[3.95,18],[4.6,0]];
function originalPose(animation,time) {
  const duration=durations[animation], phase=time/duration, wave=Math.sin(phase*Math.PI*2);
  let lift=0, x=0, y=0, rotation=0,fold=0;
  if(animation==='idle'){lift=18*Math.sin(phase*Math.PI*4);y=5*wave;rotation=.5*wave;}
  if(animation==='walk'){
    lift=flap(phase);fold=.035*Math.max(0,lift)/45;
    y=9*(Math.sin(phase*Math.PI*2-.45)-Math.sin(-.45));rotation=1.6*wave;
    x=4*(1-Math.cos(phase*Math.PI*2));
  }
  if(animation==='attack'){
    const windup=pulse(time,.05,.5,.65,.95),dive=pulse(time,.65,1.05,1.4,2.05),brake=pulse(time,1.45,1.85,2.1,2.8);
    lift=profile(attackWing,time);fold=.025*windup+.035*dive;
    x=-30*windup+165*dive+65*brake;y=35*windup-65*dive+25*brake;
    rotation=7*windup-20*dive+9*brake;
  }
  if(animation==='ultimate'){
    // Tuck, power stroke, climb, banking glide, then recover. Distinct
    // poses instead of repeating the ordinary flight sine wave.
    const gather=pulse(time,.05,.4,.55,.9),climb=pulse(time,.65,1.15,1.5,2.25);
    const bank=pulse(time,1.4,1.9,2.25,2.8),stoop=pulse(time,2.2,2.65,2.9,3.55),brake=pulse(time,3.0,3.45,3.65,4.35);
    fold=.05*gather+.05*stoop;
    lift=profile(specialWing,time);
    x=-25*gather+70*bank+175*stoop+55*brake;
    y=-18*gather+110*climb+30*bank-60*stoop+30*brake;
    rotation=4*gather+13*climb-17*bank-23*stoop+10*brake;
  }
  const wings={};
  for(const [side,path] of Object.entries(wingPaths)){
    // Equal displacement at corresponding joints, independent of the
    // very different angles of the two painted wings. Both tips go up
    // together; no side-specific phase or inverted forearm oscillation.
    wings[side]=path.map((p,i)=>{
      const q=world(p),shoulder=world(path[0]),delay=Math.max(0,i-1)*.04;
      let jointLift=lift;
      if(animation==='walk')jointLift=flap(phase-delay/duration);
      if(animation==='attack')jointLift=profile(attackWing,time-delay);
      if(animation==='ultimate')jointLift=profile(specialWing,time-delay);
      return [q[0]-(q[0]-shoulder[0])*fold*[0,.3,.7,1][i],q[1]+jointLift*[0,.24,.58,1][i]];
    });
  }
  const tail=[.08,.1,.12,.14].map(k=>-rotation*k*.6+(animation==='walk'?wave*k*5:0));
  return {x,y,rotation,lift,wings,tail};
}
export function wingTransforms(points,rest){
  return points.slice(0,-1).map((a,i)=>{
    const b=points[i+1],v=[b[0]-a[0],b[1]-a[1]],r=[rest[i+1][0]-rest[i][0],rest[i+1][1]-rest[i][1]];
    return {x:a[0],y:a[1],angle:degrees(v),length:Math.hypot(...v),scaleX:Math.hypot(...v)/Math.hypot(...r)};
  });
}

export function pose(animation,time){const p=originalPose(animation,time); const factor=0.95;p.x*=factor;p.y*=factor;p.rotation*=factor;for(const side of Object.keys(wingPaths)){const rest=wingPaths[side].map(world);p.wings[side]=p.wings[side].map((q,i)=>[rest[i][0]+(q[0]-rest[i][0])*factor,rest[i][1]+(q[1]-rest[i][1])*factor]);}return p;}
