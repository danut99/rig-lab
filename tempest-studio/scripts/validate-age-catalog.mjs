import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.json')));
const original=JSON.parse(fs.readFileSync(path.join(root,'../generated-dinosaurs/manifest.json')));
const speciesList=[...original.species];
if(catalog.models.some(model=>(model.baseSpecies||model.id)==='ignisaur')&&!speciesList.some(species=>species.id==='ignisaur'))speciesList.push({id:'ignisaur'});
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const ids=new Set();let checked=0;
for(const species of speciesList){
 for(const age of ['pui','juvenil','adult']){
  const matches=catalog.models.filter(m=>(m.baseSpecies||m.id)===species.id&&(m.stage||'adult')===age);
  assert(matches.length===1,`${species.id} ${age}: missing or duplicate age entry`);
  const model=matches[0];assert(!ids.has(model.id),'Duplicate model '+model.id);ids.add(model.id);
  const files=[model.skeleton,model.atlas];
  if(model.reference)files.push(model.reference.image);
  else{assert(age==='adult'&&model.id==='tempestopteryx','Missing age reference '+model.id);files.push('model/reference.png');}
  for(const file of files)assert(fs.existsSync(path.join(root,'public',file)),'Missing model asset '+file);
  const rig=JSON.parse(fs.readFileSync(path.join(root,'public',model.skeleton)));
  assert(rig.bones.length>0&&rig.slots.length>0,'Empty rig '+model.id);
  for(const animation of model.animations)assert(rig.animations[animation.name],'Missing animation '+model.id+' '+animation.name);
  assert(model.animations.length>=3,'Incomplete movement set '+model.id);
  const dir=path.join(root,'../generated-dinosaurs',species.id,age);
  assert(fs.existsSync(path.join(dir,'art.png')),'Missing assembled artwork '+model.id);
  if(age!=='adult')assert(model.stageLabel===({pui:'Copil',juvenil:'Juvenil'})[age],'Wrong age label '+model.id);
  checked++;
 }
}
assert(checked===speciesList.length*3&&catalog.models.filter(model=>!model.legendary).length===checked,'Expected exactly 3 ages for every ordinary species');
const report={species:speciesList.length,agesPerSpecies:3,models:checked,missingAges:[],missingAssets:[],complete:true};
fs.writeFileSync(path.join(root,'AGE-CATALOG-VALIDATION.json'),JSON.stringify(report,null,2));console.log(report);
