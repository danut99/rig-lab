"""Build isolated younger rigs from age-specific painted landmarks.

Never writes an adult builder, motion module, source or model directory.
"""
from pathlib import Path
from PIL import Image
import json,re,sys,shutil
root=Path(__file__).resolve().parent.parent
configs=json.loads((root/'source/remaining-young-configs.json').read_text())
for ident in sys.argv[1:] or configs:
 c=configs[ident]; species,age=ident.rsplit('-',1)
 assert age in ('pui','juvenil')
 prefix=c['prefix']; template=c.get('template','cine-juvenil')
 name=c['name']; label='Copil' if age=='pui' else 'Juvenil'
 source=root/'source'/ident;source.mkdir(exist_ok=True)
 shutil.copyfile(root.parent/'generated-dinosaurs'/species/age/'art.png',source/'art.png')
 W,H=Image.open(source/'art.png').size
 builder=(root/'scripts'/('build-'+template+'.mjs')).read_text(encoding='utf8')
 motion=(root/'scripts'/(template+'-motion.mjs')).read_text(encoding='utf8')
 oldspecies={'cine-juvenil':'cineraptor-juvenil','tundra':'tundraceratops','silvo':'silvosteg','terra':'terratitan','cryo':'cryolophus'}[template]
 oldname={'cine-juvenil':'Cineraptor','tundra':'Tundraceratops','silvo':'Silvosteg','terra':'Terratitan','cryo':'Cryolophus'}[template]
 builder=builder.replace(template+'-motion.mjs',prefix+'-'+age+'-motion.mjs').replace(oldspecies,ident).replace(oldname,name)
 builder=re.sub(r'const polygons=\{.*?\};', 'const polygons='+json.dumps(c['polygons'])+';',builder,count=1,flags=re.S)
 motion=re.sub(r'export const origin=.*?;', 'export const origin='+json.dumps(c['origin'])+';',motion,count=1)
 motion=re.sub(r'export const paths=\{.*?\};','export const paths='+json.dumps(c['paths'])+';',motion,count=1,flags=re.S)
 if template=='cryo':
  shutil.copyfile(root/'source/cryolophus/redcrested.json',source/'redcrested.json')
  motion=motion.replace('../source/cryolophus/','../source/'+ident+'/')
  motion=re.sub(r'pivot=world\(\[[^\]]+\]\)', 'pivot=world(paths.nearArm[2])',motion)
 motion=re.sub(r"p.tail\*\[.3,.35,.35\]\[Number\(b.name.slice\(4\)\)-1\]",'p.tail/(paths.tail.length-1)',motion)
 motion=re.sub(r"delta=p.tail\*(?:\.5|\[[^;]+);",'delta=p.tail/(paths.tail.length-1);',motion)
 # Each age retains its species timing, with shorter steps for shorter limbs.
 stride=c.get('stride',[20,16] if age=='pui' else [28,22]);lift=c.get('lift',[18,12] if age=='pui' else [22,16])
 motion=re.sub(r"stride=side===\s*'nearLeg'\?\d+:\d+",f"stride=side==='nearLeg'?{stride[0]}:{stride[1]}",motion)
 motion=re.sub(r"stride=side.startsWith\('near'\)\?\d+:\d+",f"stride=side.startsWith('near')?{stride[0]}:{stride[1]}",motion)
 motion=re.sub(r"\(side==='nearLeg'\?\d+:\d+\)\*lift",f"(side==='nearLeg'?{lift[0]}:{lift[1]})*lift",motion)
 motion=re.sub(r"\(side.startsWith\('near'\)\?\d+:\d+\)\*lift",f"(side.startsWith('near')?{lift[0]}:{lift[1]})*lift",motion)
 if template=='terra':
  stomp=c.get('stompLift',24 if age=='pui' else 32)
  motion=motion.replace('[.7,42],[1.05,42]',f'[.7,{stomp}],[1.05,{stomp}]')
 factor=c.get('motionScale',.7 if age=='pui' else .9)
 motion=motion.replace(' return p;',f' for(const k of Object.keys(p))p[k]*={factor};\n return p;',1)
 # All source layers share this one weight field; socket overlaps stay welded.
 builder=builder.replace('[-48,-24,0,24,48]','[-32,-16,0,16,32]').replace('2*32*32','2*24*24')
 builder=builder.replace('(y-hip+10)/125','(y-hip+10)/180')
 head=c['rigidHead']
 field=""" if(inside(polygons.head,x,y)){
  if(RIGID)return [['head',1]];
  const strength=smooth((Math.hypot(x-paths.neck[0][0],y-paths.neck[0][1])-25)/150),chain=groups.neck;
  const scores=chain.map(n=>{const b=setup[n],l=bones.find(b=>b.name===n).length,end=rotate([l,0],b.angle);return [n,1/Math.max(25,distance(p,[b.x,b.y],[b.x+end[0],b.y+end[1]]))**3];}),sum=scores.reduce((a,[,w])=>a+w,0);
  return [['body',1-strength],...scores.map(([n,w])=>[n,w/sum*strength])];
 }
""".replace('RIGID',head)
 if template=='cryo':
  field=field.replace('  if('+head+')',"  if(inside(polygons.jaw,x,y)){const jawWeight=smooth((Math.hypot(x-paths.jaw[0][0],y-paths.jaw[0][1])-15)/90);return [['head',1-jawWeight],['jaw',jawWeight]];}\n  if("+head+')')
 builder=re.sub(r' if\(inside\(polygons.head,x,y\)\)\{.*?\n \}\n(?= if\(!inside\(polygons.tail)',field,builder,count=1,flags=re.S)
 # World bounds derive from this drawing, rather than the adult canvas.
 builder=re.sub(r'const bounds=\{.*?\},rig=',f'const bounds={{x:-origin[0]-180,y:origin[1]-H-180,width:W+360,height:H+360}},rig=',builder,count=1)
 builder=re.sub(r"name:'"+re.escape(name)+r"[^']*'",f"name:'{name} - {label}'",builder)
 # Replace inherited base species/age fields as a unit.
 builder=re.sub(r"id:'"+re.escape(ident)+r"',(?:baseSpecies:'[^']+',stage:'[^']+',stageLabel:'[^']+',)?",f"id:'{ident}',baseSpecies:'{species}',stage:'{age}',stageLabel:'{label}',",builder)
 (root/'scripts'/('build-'+prefix+'-'+age+'.mjs')).write_text(builder,encoding='utf8')
 (root/'scripts'/(prefix+'-'+age+'-motion.mjs')).write_text(motion,encoding='utf8')
 validator=(root/'scripts/validate-cine-juvenil.mjs').read_text().replace('cine-juvenil-motion',prefix+'-'+age+'-motion').replace('cineraptor-juvenil',ident).replace('CINE-JUVENIL',prefix.upper()+'-'+age.upper())
 layers=7 if template in ('cine-juvenil','cryo') else 13
 validator=validator.replace('layers.length===7',f'layers.length==={layers}').replace('rig.slots.length===7',f'rig.slots.length==={layers}')
 (root/'scripts'/('validate-'+prefix+'-'+age+'.mjs')).write_text(validator,encoding='utf8')
 browser=(root/'scripts/browser-cine-juvenil.mjs').read_text().replace('cineraptor-juvenil',ident).replace('cineraptor',species).replace('stage=juvenil','stage='+age).replace("'#age','juvenil'",f"'#age','{age}'").replace('CINE-JUVENIL',prefix.upper()+'-'+age.upper()).replace('model.slots!==7',f'model.slots!=={layers}')
 sides=['nearLeg','farLeg'] if layers==7 else ['nearHind','farHind','nearFront','farFront']
 browser=browser.replace("['nearLeg','farLeg']",json.dumps(sides))
 (root/'scripts'/('browser-'+prefix+'-'+age+'.mjs')).write_text(browser,encoding='utf8')
 print(ident,W,H,'prepared independently')
