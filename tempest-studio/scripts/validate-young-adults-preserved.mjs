import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
let checked=0;
for(const baseline of ['YOUNG-ADULT-BASELINE.json','PELAGI-ADULT-BASELINE.json','TEMPEST-ADULT-BASELINE.json','PYRO-ADULT-BASELINE.json','REMAINING-ADULT-BASELINE.json']){
 const files=JSON.parse(fs.readFileSync(new URL(baseline,root)));
 for(const [file,expected] of Object.entries(files)){
  const hash=createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex');
  if(hash!==expected)throw Error(`Adult asset changed: ${file}`);
  checked++;
 }
}
console.log({adultFilesChecked:checked,byteIdentical:true});
