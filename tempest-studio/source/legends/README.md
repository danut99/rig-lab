# Legendary world bosses — artwork, skeletons and animations

Six original adult boss designs, each with an independently measured Spine 3.8 skeleton, one continuous weighted painted mesh, and four authored actions. The ordinary species and their three ages remain available in the same studio. Bosses are ready to inspect and export from the studio; combat encounter logic is separate.

| World | Legendary boss | Bones | Locomotion | Special |
| --- | --- | --- | --- | --- |
| Fire | Calderox | 29 | Heavy six-legged gait | Caldera eruption |
| Water | Abyssarion | 23 | Swimming, fin beats and tail wave | Abyssal water vortex |
| Earth | Geolithar | 22 | Knuckle-supported heavy gait | Tectonic fracture |
| Jungle | Viridraxis | 37 | Four-legged stalking, twin tails and scythes | Forest fury |
| Ice | Glaciomorth | 23 | Heavy quadrupedal gait | Eternal zero |
| Storm | Fulminarch | 34 | Four-winged flight | Storm judgment |

Generation: imagegen skill CLI/API mode, `gpt-image-2`, high quality, 2048 × 1536. Full exact English prompts are saved in `prompts/`; the unmodified batch request is `jobs.jsonl`. Images are generated independently from scratch without references to existing dinosaur artwork. Source PNGs are saved here; transparent deliverables are in `../../public/legends/`.

Preview: `/legends.html` on the studio server. Each detail view links to `/?species=<boss-id>` for skeleton, mesh, idle/locomotion/attack/special, playback speed, pause and frame scrubbing. FX attachments live inside the same Spine rig, so they pause, seek and loop with the dinosaur. Setup pose and idle/locomotion hide combat FX. Each model atlas includes the painted art page and a separate FX page.

Landmarks and silhouette ownership polygons: `anatomy.mjs`. The builder uses connected bone chains, two-bone IK for weight-bearing limbs, smooth continuous skin weights, and separately authored motion for heavy, swimming, stalking and flying anatomies. FX anchor bones track the mouth, impact point or caldera. Per-animation viewports include the visible effect.

### Revised dragon motion references

Five bosses now use sampled world and local transforms from the original dragon Spine binary animations, rather than a common small sinusoidal attack. Fulminarch is preserved. `scripts/inspect-legend-dragon-motion.mjs` plays the actual reference dragons, captures attack/special/walk poses, and exports all five actions at 30 Hz into `motion-references/`. `scripts/legend-dragon-motion.mjs` retargets these curves to each boss: body anticipation, advance, recoil, head/jaw articulation, feet and appendages. Limb proportions and deformation limits remain specific to the boss artwork; this is motion retargeting, not replacement with the dragon's skeleton or art.

| Boss | Motion reference | Adaptation |
| --- | --- | --- |
| Calderox | Flaming Rock | Braced advance, heavy recoil, rise before the caldera eruption |
| Abyssarion | Sea | Swimming body wave, coordinated fins, forward bite and vortex casting |
| Geolithar | Primal Rage | Separate hand trajectories, torso loading and forceful ground strike |
| Viridraxis | War Thorn | Stalking gait, elastic anticipation and offset scythe strikes |
| Glaciomorth | Tricky Trunk | Heavy balance, tusk-first charge and raised forefoot before ice impact |

`breathe`, `walk`, `attack` and `special1` are sampled from each original source. Cyclic motion is closed smoothly; combat recovers to setup, and FX start at the selected strike phase. Source provenance is included in each model's `meta.json`. Reference review images are in `captures/dragon-motion/`. To re-export source motion, run `node scripts/inspect-legend-dragon-motion.mjs` with the studio server running, then rebuild the five revised models.

### Existing dragon effects selected after inspection

The standalone fatality archives include a struck dragon, so the final rigs instead use these original atlas animation sequences. DDS pages are decoded and the selected regions are extracted with their original rotation and trim offsets. Earth FX are tinted to mineral dust while preserving luminance/alpha; green and violet tints are set on their respective Spine FX slots. Exact archives and region names are saved in `../../public/legend-fx/manifest.json` and each rig's `meta.json`.

| Boss | Source dragon | Selected sequence |
| --- | --- | --- |
| Calderox | Incendiary | `FX/blow-fire/blow-*` |
| Abyssarion | Colossus Eternal | `fx/whirlwind/water_whirlwind*` |
| Geolithar | Colossus Eternal | `fx/impact_ground/impact_ground_*` |
| Glaciomorth | Avalanche Eternal | `fx/explosion*` |
| Viridraxis | Ivy Eternal | `fx/eff_xplo*` |
| Fulminarch | Bicephalous Eternal | `fx/pink_blast*` |

```sh
node scripts/prepare-legends.mjs
# Generate source images with the imagegen CLI and jobs.jsonl.
node scripts/package-legends.mjs
python scripts/select-legend-fx.py
node scripts/build-legend-rigs.mjs
node scripts/validate-legend-rigs.mjs
node scripts/browser-legend-rigs.mjs
node scripts/browser-legends.mjs
```

Animated exports: `../../public/models/<boss-id>/{skeleton.json,rig.atlas,rig.png,fx.png,art.png,meta.json}`. Browser captures: `../../captures/legend-rigs/` and `../../captures/legends/`. Dense mesh validation samples every action at 60 Hz, checks finite coordinates, normalized weights, visible triangle winding, looping locomotion, and attack-only FX. Runtime review checks 120 poses, FX visibility and mobile layout across all six bosses. Size values in the concept catalog are design targets rather than gameplay stats.
