import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),baseline=JSON.parse(fs.readFileSync(new URL('PYRO-ADULT-BASELINE.json',root)));
for(const [path,expected] of Object.entries(baseline)){const actual=crypto.createHash('sha256').update(fs.readFileSync(new URL(path,root))).digest('hex');if(actual!==expected)throw Error('Adult file changed: '+path);}
console.log({adultFilesVerified:Object.keys(baseline).length,byteIdentical:true});
