import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
const dir='public/models/verdant-shaman/',reference=PNG.sync.read(fs.readFileSync(dir+'reference.png')),art=PNG.sync.read(fs.readFileSync(dir+'art.png')),foot=PNG.sync.read(fs.readFileSync(dir+'walk-farLeg.png')),page=JSON.parse(fs.readFileSync(dir+'walk-layers.json')).pages.find(p=>p.name==='walk-farLeg');
let checked=0;
for(let y=1125;y<1190;y++)for(let x=940;x<990;x++){
 const k=(y*reference.width+x)*4,[r,g,b]=reference.data.subarray(k,k+3);
 if(art.data[k+3]<128||r<140||g<r*.65||b<r*.35)continue;
 const fk=((y-page.y0)*foot.width+x-page.x0)*4;
 assert.deepEqual([...foot.data.subarray(fk,fk+4)],[...reference.data.subarray(k,k+4)],`Original outer toe changed at ${x},${y}`);checked++;
}
assert.ok(checked>600,'Too few original toe pixels checked');
console.log(JSON.stringify({originalToePixelsPreserved:checked}));
