# Independent child and juvenile rigs

All 12 dinosaur species now have child, juvenile and adult stages in Rig Lab:
Tempestopteryx, Fulgurodrome, Frondonychus, Tundraceratops, Terratitan,
Silvosteg, Cineraptor, Cryolophus, Ferrankyl, Fluviovenator, Pelagisaur,
and Pyroceratops. There are 36 catalog models and no missing ages.

Open http://127.0.0.1:5190/ and use the species and age selectors.
Direct links accept `?species=terratitan&stage=pui` or `stage=juvenil`.
Each younger age has separate anatomy, source artwork, motion, build script,
textures and skeleton. Adult source, motion and model files remain unchanged.

## Completed younger stages

| Species | Bones | Layers | Movement |
| --- | --- | --- | --- |
| Tempestopteryx | 22 | 3 | Hover, flight, dive, aerial assault |
| Fulgurodrome | 22 | 7 | Idle, walk, claw attack |
| Frondonychus | 21 | 7 | Idle, walk, claw attack |
| Tundraceratops | 19 | 13 | Idle, walk, horn shove |
| Terratitan | 22 | 13 | Idle, walk, forefoot stomp |
| Silvosteg | 20 | 13 | Idle, walk, tail strike |
| Cineraptor | 21 | 7 | Idle, walk, claw attack |
| Cryolophus | 22 | 7 | Idle, walk, bite |
| Ferrankyl | 20 | 13 | Idle, walk, tail strike |
| Fluviovenator | 23 | 7 | Idle, walk, bite |
| Pelagisaur | 13 | 1 | Idle, swim, forward attack |
| Pyroceratops | 19 | 13 | Idle, walk, horn shove |

The last six species use age-specific landmarks stored in
`source/remaining-young-configs.json`. Generated younger art was produced with
the built-in image_gen tool. The existing Terratitan juvenile art was retained.
Exact prompts are saved in each species' `generation-prompts-v2.json`.
All original adult files and old parts sheets are preserved.

Source art: `../generated-dinosaurs/<species>/<pui|juvenil>/art.png`.
Runtime rig: `public/models/<species>-<pui|juvenil>/`.
For the last six species, `parts-v2.png` contains the exact rig layers,
`assembly-v2.json` records original pixel placements and bones, and
`skeleton-v2.json` contains the matching animated bone hierarchy.
These pieces reconstruct the art exactly; do not align them by guessing
bone endpoints. Knees, ankles and belly joins share a continuous skin field.
No decorative particle effects were added. Younger ultimates remain deferred
except for the previously completed Tempestopteryx flight attack set.

## Checks and rebuilds

- `npm run test:remaining:young`: the last 12 younger rigs, the 36-model catalog,
  source pixel preservation, geometry, loops, foot reach and adult hashes.
- `npm run test:remaining:browser`: native-runtime playback, reference overlays,
  mobile layout and age/species switching for the last 12 variants.
- `npm run test:young`: younger stage validators across the studio.
- `npm run export:remaining:young`: regenerate exact packed pieces and schemas.
- `python scripts/prepare-remaining-young.py <species>-<age>`: regenerate isolated
  younger build/motion/check scripts from their reviewed landmark configs.
- `npm run build:<species>:<age>`: rebuild only that age.

`validate-young-adults-preserved.mjs` checks 197 original adult files by SHA-256.
`validate-age-catalog.mjs` rejects missing or duplicate ages, absent assets and
incomplete animation sets. Individual VALIDATION and BROWSER-VALIDATION JSON
reports and captures are saved in this project.
