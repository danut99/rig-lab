// Fresh gait for this broad, flat-footed, short-legged character.
// The dragon samples remain a study; their motion is not copied into this walk.
export function dragonBody(phase){
 const w=phase*2*Math.PI,s=Math.sin(w);
 return {x:3*s,y:-7+4*(1-Math.cos(2*w)),br:.65*s,ch:-.2*s,head:-.35*s+.2*Math.sin(2*w),farArm:2.2*Math.sin(w+.15),nearArm:.65*s,tail:1.3*Math.sin(w-.3)};
}
export function dragonFoot(side,phase){
 const q=(phase+(side==='far'?.5:0))%1,stance=.64,stride=78,forward=side==='far'?24:0;
 if(q<stance)return {x:forward+stride*(.5-q/stance),lift:0,tilt:0,support:true};
 const u=(q-stance)/(1-stance),u2=u*u,u3=u2*u,tangent=-stride*(1-stance)/stance;
 // The recovery meets the support velocity at lift-off and touchdown.
 const x=(2*u3-3*u2+1)*(-stride/2)+(-2*u3+3*u2)*(stride/2)+(2*u3-3*u2+u)*tangent,lift=Math.sin(Math.PI*u)**2;
 return {x:forward+x,lift:32*lift,tilt:-3*lift,support:false};
}
export const walkReference={source:'Authored for Verdant Shaman',animation:'walk',duration:2.2,sampleRate:60,method:'Wide stance, 64% support, smooth push-off and recovery, flat planted feet, a 78-pixel stride and 32-pixel clearance.'};
