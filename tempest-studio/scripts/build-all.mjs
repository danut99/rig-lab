import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for(const script of ['build.mjs','build-fulguro.mjs','build-frond.mjs','build-tundra.mjs','build-terra.mjs','build-silvo.mjs','build-cine.mjs','build-cryo.mjs','build-ferra.mjs','build-fluvio.mjs','build-pelagi.mjs','build-pyro.mjs','build-pyro-pui.mjs','build-pyro-juvenil.mjs','build-cine-pui.mjs','build-cine-juvenil.mjs','build-ferra-pui.mjs','build-ferra-juvenil.mjs','build-fluvio-pui.mjs','build-fluvio-juvenil.mjs','build-pelagi-pui.mjs','build-pelagi-juvenil.mjs','build-tempest-pui.mjs','build-tempest-juvenil.mjs','build-fulguro-pui.mjs','build-fulguro-juvenil.mjs','build-frond-pui.mjs','build-frond-juvenil.mjs','build-tundra-pui.mjs','build-tundra-juvenil.mjs','build-silvo-pui.mjs','build-silvo-juvenil.mjs','build-cryo-pui.mjs','build-terra-juvenil.mjs','build-cryo-juvenil.mjs','build-terra-pui.mjs']){
 const result=spawnSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
