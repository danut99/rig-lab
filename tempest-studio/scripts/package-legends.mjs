import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const helper = path.join(process.env.USERPROFILE, '.codex/skills/.system/imagegen/scripts/remove_chroma_key.py');
const {creatures} = JSON.parse(fs.readFileSync(path.join(root, 'public/legends/manifest.json'), 'utf8'));
for (const creature of creatures) {
  // The storm creature deliberately has violet highlights: preserve them rather than despilling purple throughout its wings.
  const matte = creature.id === 'fulminarch' ? ['--edge-feather','0.3'] : ['--soft-matte','--spill-cleanup','--edge-contract','1','--edge-feather','0.5'];
  execFileSync('python', [helper, '--input', path.join(root,'source/legends',`${creature.id}-source.png`), '--out', path.join(root,'public',creature.image), '--auto-key','corners','--tolerance','40',...matte], {stdio:'inherit'});
}
