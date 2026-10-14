import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';import {createAi} from './ai.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pub=path.join(root,'public'),bonesFile=path.join(root,'source/verdant-shaman/bones.json'),port=Number(process.env.PORT||5190);
const ai=createAi(root);let aiBusy=false;
async function readJson(req,limit=2e6){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(Error('Prea mare.'),{code:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw Object.assign(Error('JSON invalid.'),{code:400});}}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.atlas':'text/plain'};
// Studio tasks the editor may launch; one at a time, output streamed as plain text lines.
const tasks={build:'scripts/build-verdant-shaman.mjs',validate:'scripts/validate-shaman-reference.mjs'};let running=null;
const send=(res,code,body,type='text/plain; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
const historyDir=path.join(root,'source/verdant-shaman/history'),originalFile=path.join(root,'source/verdant-shaman/bones.original.json');
async function keepVersion(){
 let current;try{current=await fs.readFile(bonesFile);}catch{return;}
 await fs.mkdir(historyDir,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);await fs.writeFile(path.join(historyDir,stamp+'.json'),current);
 const files=(await fs.readdir(historyDir)).filter(f=>f.endsWith('.json')).sort();for(const f of files.slice(0,Math.max(0,files.length-60)))await fs.rm(path.join(historyDir,f),{force:true});
}
function checkBones(config){
 if(!config||!Array.isArray(config.bones)||config.bones.length>200)return 'Lipsește lista de oase.';
 const names=new Set(),point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 for(const b of config.bones){
  if(typeof b.name!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(b.name)||b.name==='root')return 'Nume de os invalid: '+JSON.stringify(b.name);
  if(names.has(b.name))return 'Nume duplicat: '+b.name;names.add(b.name);
  if(typeof b.parent!=='string'||!point(b.from)||!point(b.to))return 'Os incomplet: '+b.name;
  if(b.radius!==undefined&&!(Number.isFinite(b.radius)&&b.radius>0&&b.radius<=600))return 'Rază invalidă la '+b.name;
  if(b.sway!==undefined&&(typeof b.sway!=='object'||!Object.values(b.sway).every(Number.isFinite)))return 'Balans invalid la '+b.name;
  if(b.keys!==undefined&&(typeof b.keys!=='object'||!Object.values(b.keys).every(list=>Array.isArray(list)&&list.length<=200&&list.every(k=>k&&Number.isFinite(k.time)&&Number.isFinite(k.angle)))))return 'Cadre invalide la '+b.name;
 }
 if(config.parts!==undefined){if(typeof config.parts!=='object'||Array.isArray(config.parts))return 'Piese invalide.';for(const [name,part]of Object.entries(config.parts)){if(!/^[a-z][a-z0-9]{0,29}$/.test(name)||typeof part!=='object'||typeof part.enabled!=='boolean'||!Array.isArray(part.polygon)||part.polygon.length>200||!part.polygon.every(point)||(part.bone!==undefined&&typeof part.bone!=='string')||(part.feather!==undefined&&!Number.isFinite(part.feather))||(part.reach!==undefined&&!Number.isFinite(part.reach)))return 'Piesă invalidă: '+name;if(part.bone&&part.bone!=='root'&&!config.bones.some(b=>b.name===part.bone))return `Piesa ${name}: osul ${part.bone} nu există`;}}
 if(config.paint!==undefined){if(!Array.isArray(config.paint)||config.paint.length>2000)return 'Pensulări invalide.';for(const op of config.paint)if(!op||!config.bones.some(b=>b.name===op.bone)||!['add','remove'].includes(op.mode)||!Number.isFinite(op.radius)||op.radius<=0||op.radius>400||!Number.isFinite(op.strength)||!Array.isArray(op.points)||!op.points.length||op.points.length>3000||!op.points.every(point))return 'Pensulare invalidă'+(op?.bone?' pe '+op.bone:'')+'.';}
 for(const b of config.bones){const seen=new Set();let cur=b;while(cur.parent!=='root'){if(seen.has(cur.name))return 'Ciclu de părinți la '+b.name;seen.add(cur.name);cur=config.bones.find(x=>x.name===cur.parent);if(!cur)return 'Părinte inexistent la '+b.name;}}
 return null;
}
async function api(req,res,pathname){
 if(pathname==='/api/bones'&&req.method==='GET')return send(res,200,await fs.readFile(bonesFile),'application/json');
 if(pathname==='/api/bones'&&req.method==='PUT'){
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1e6)return send(res,413,'Prea mare.');chunks.push(chunk);}
  let config;try{config=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(res,400,'JSON invalid.');}
  const error=checkBones(config);if(error)return send(res,400,error);
  await keepVersion();await fs.writeFile(bonesFile,JSON.stringify(config,null,2)+'\n');return send(res,200,'ok');
 }
 // Every save keeps the previous bones.json in source/verdant-shaman/history; bones.original.json is the untouched rig.
 if(pathname==='/api/versions'&&req.method==='GET'){
  const files=(await fs.readdir(historyDir).catch(()=>[])).filter(f=>/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.json$/.test(f)).sort().reverse();
  return send(res,200,JSON.stringify({original:await fs.access(originalFile).then(()=>true,()=>false),history:files}),'application/json');
 }
 if(pathname==='/api/versions/restore'&&req.method==='POST'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);let name;try{name=JSON.parse(Buffer.concat(chunks).toString()).name;}catch{return send(res,400,'JSON invalid.');}
  const file=name==='original'?originalFile:/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.json$/.test(name)?path.join(historyDir,name):null;if(!file)return send(res,400,'Versiune necunoscută.');
  let config;try{config=JSON.parse(await fs.readFile(file));}catch{return send(res,404,'Versiunea nu se poate citi.');}
  const error=checkBones(config);if(error)return send(res,400,'Versiunea e invalidă: '+error);
  await keepVersion();await fs.writeFile(bonesFile,JSON.stringify(config,null,2)+'\n');return send(res,200,'ok');
 }
 // AI (OpenAI, key from rig-lab/.env on this server only). One request at a time; results go back to the editor,
 // which applies them as normal, undoable edits. Only "fill" writes a file (source/verdant-shaman/hidden-<part>.png).
 if(pathname==='/api/ai/status'&&req.method==='GET')return send(res,200,JSON.stringify(await ai.status()),'application/json');
 const hidden=pathname.match(/^\/api\/ai\/hidden\/([a-z][a-z0-9]{0,29})$/)?.[1];
 if(hidden&&req.method==='GET'){const png=await ai.hidden(hidden);return png?send(res,200,png,'image/png'):send(res,404,'Nu există.');}
 if(hidden&&req.method==='DELETE')return send(res,(await ai.removeHidden(hidden))?200:404,'ok');
 const aiTask=pathname.match(/^\/api\/ai\/(animate|segment|fill)$/)?.[1];
 if(aiTask&&req.method==='POST'){
  if(aiBusy)return send(res,409,'AI-ul lucrează deja la o cerere.');
  let input;try{input=await readJson(req);}catch(error){return send(res,error.code||400,error.message);}
  aiBusy=true;
  try{
   if(aiTask==='animate'){const error=checkBones(input.config);if(error)return send(res,400,error);const manifest=JSON.parse(await fs.readFile(path.join(pub,'manifest.json'))),entry=manifest.models.find(m=>m.id==='verdant-shaman');input.durations=Object.fromEntries(entry.animations.map(a=>[a.name,a.duration]));}
   return send(res,200,JSON.stringify(await ai[aiTask](input)),'application/json');
  }catch(error){return send(res,502,error.message);}finally{aiBusy=false;}
 }
 const task=pathname.match(/^\/api\/run\/(\w+)$/)?.[1];
 if(task&&req.method==='POST'){
  if(!tasks[task])return send(res,404,'Sarcină necunoscută.');if(running)return send(res,409,'Rulează deja: '+running);
  running=task;res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.write(`> node ${tasks[task]}\n`);
  const child=spawn(process.execPath,[tasks[task]],{cwd:root});const forward=chunk=>{try{res.write(chunk);}catch{}};child.stdout.on('data',forward);child.stderr.on('data',forward);
  child.on('close',code=>{running=null;try{res.end(`[exit ${code}]\n`);}catch{}});return;
 }
 send(res,404,'Not found');
}
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.startsWith('/api/'))return await api(req,res,pathname);const file=path.resolve(pub,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(pub+path.sep)){res.writeHead(403);res.end();return;}const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch(error){if(res.headersSent){try{res.end();}catch{}return;}send(res,error.code==='ENOENT'?404:500,error.code==='ENOENT'?'Not found':String(error.message));}}).listen(port,'127.0.0.1',()=>console.log(`Tempest Studio: http://127.0.0.1:${port}  ·  editor: http://127.0.0.1:${port}/editor.html`));
