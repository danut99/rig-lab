import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifestFile = path.join(root, 'public/manifest.json');
const catalog = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
for (const stage of ['adult', 'pui', 'juvenil']) {
  const rigId = `ignisaur-${stage}`;
  const source = path.resolve(root, '../public/rigs', rigId);
  const destination = path.join(root, 'public/models', rigId);
  fs.mkdirSync(destination, { recursive: true });
  for (const file of ['skeleton.json', 'rig.atlas', 'rig.png', 'art.png']) fs.copyFileSync(path.join(source, file), path.join(destination, file));
  const meta = JSON.parse(fs.readFileSync(path.join(source, 'meta.json'), 'utf8'));
  const id = stage === 'adult' ? 'ignisaur' : rigId;
  const stageLabel = { adult: 'Adult', pui: 'Copil', juvenil: 'Juvenil' }[stage];
  const entry = { id, baseSpecies: 'ignisaur', stage, stageLabel, name: `Ignisaur - ${stageLabel}`, skeleton: `models/${rigId}/skeleton.json`, atlas: `models/${rigId}/rig.atlas`, bounds: meta.bounds,
    reference: { image: `models/${rigId}/art.png`, width: meta.artRect.width, height: meta.artRect.height, origin: [-meta.artRect.x, meta.artRect.y + meta.artRect.height] },
    animations: meta.animations, description: 'Dinozaur de foc cu armură de bazalt și solzi de jar.', explanation: 'Artă originală pentru fiecare vârstă. Schelet articulat cu 23 de oase; repaus, mers, mușcătură și răget de jar. Habitat: foc.' };
  const index = catalog.models.findIndex(model => model.id === id);
  if (index < 0) catalog.models.push(entry); else catalog.models[index] = entry;
}
fs.writeFileSync(manifestFile, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Studio: ${new Set(catalog.models.map(model => model.baseSpecies || model.id)).size} species, ${catalog.models.length} stages`);
