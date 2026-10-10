import {chromium} from 'playwright-core';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('public/manifest.json',root),'utf8'));
const wanted=process.argv.slice(2);
const out=new URL('captures/legend-rigs/',root);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],results=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const model of catalog.models.filter(model=>model.legendary&&(!wanted.length||wanted.includes(model.id)))){
  await page.goto(`http://127.0.0.1:5190/?species=${model.id}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.studioPlayer?.loaded,{}, {timeout:30000});
  await page.locator('#view').selectOption('art');
  const result={id:model.id,poses:[],bones:await page.evaluate(()=>window.studioPlayer.raw.skeleton.bones.length)};
  for(const animation of model.animations){
   await page.locator(`[data-animation="${animation.name}"]`).click();
   for(const t of [0,animation.duration*.25,animation.duration*.5,animation.duration*.75,animation.duration-.0001]){
    const state=await page.evaluate(time=>{const p=window.studioPlayer;p.seek(time);const art=p.raw.skeleton.findSlot('art'),mesh=art.getAttachment(),vertices=new Float32Array(mesh.worldVerticesLength);mesh.computeWorldVertices(art,0,vertices.length,vertices,0,2);const fx=p.raw.skeleton.findSlot('fx');return {finite:[...vertices].every(Number.isFinite),fxVisible:!!fx.getAttachment()&&fx.color.a>.01,fxAlpha:fx.color.a};},t);
    if(!state.finite)throw Error(model.id+' invalid runtime mesh');
    result.poses.push({animation:animation.name,t,...state});
   }
   const effectTime=['attack','ultimate'].includes(animation.name)?animation.duration*.65:animation.duration*.25;
   await page.evaluate(t=>window.studioPlayer.seek(t),effectTime);
   await page.screenshot({path:fileURLToPath(new URL(`${model.id}-${animation.name}.png`,out))});
   if(['attack','ultimate'].includes(animation.name)){
    const json=JSON.parse(fs.readFileSync(new URL('public/'+model.skeleton,root),'utf8')),keys=json.animations[animation.name].slots.fx.attachment.filter(key=>key.name),start=keys[0].time,end=keys.at(-1).time;
    await page.evaluate(t=>window.studioPlayer.seek(t),(start+end)/2);
    await page.screenshot({path:fileURLToPath(new URL(`${model.id}-${animation.name}.png`,out))});
    const fx=await page.evaluate(()=>{const slot=window.studioPlayer.raw.skeleton.findSlot('fx');return {attachment:!!slot.getAttachment(),alpha:slot.color.a};});
    if(!fx.attachment||fx.alpha<.1)throw Error(model.id+' invisible '+animation.name+' FX');
   }
  }
  await page.locator('#setup').click();await page.locator('#view').selectOption('bones');await page.screenshot({path:fileURLToPath(new URL(`${model.id}-bones.png`,out))});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow: '+model.id);
  await page.setViewportSize({width:1600,height:1000});results.push(result);console.log(model.id+' runtime poses and FX passed');
 }
 if(errors.length)throw Error(errors.join('\n'));
 const reportFile=new URL('LEGENDS-ANIMATION-BROWSER-VALIDATION.json',root),previous=wanted.length&&fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile)).results:[];
 fs.writeFileSync(reportFile,JSON.stringify({results:[...previous.filter(r=>!results.some(n=>n.id===r.id)),...results],errors},null,2));
 console.log(JSON.stringify({models:results.length,poses:results.reduce((sum,result)=>sum+result.poses.length,0),errors}));
}finally{await browser.close();}
