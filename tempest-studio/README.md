# Tempest Studio

Leg shape preservation: each leg has separate upper, lower and foot sections. The front knee uses a synchronized soft hinge; the back lower leg remains rigid. Feet remain rigid. There are 22 bones and 11 drawing slots. Browser validation checks the rigid bindings and applied hip/knee mesh timelines.

Walking studies: **Robo Ravager Dragon · Adult** and **Stokes Twins Dragons · Adult**. Their sampled motion is preserved in `source/fulgurodrome/*-walk.json`; the `sample-robo.mjs` and `sample-stokes.mjs` scripts reproduce the samples. Fulgurodrome now uses its own 1.6-second biped gait rather than transferred foot channels: alternating support, raised recovery, connected leg IK and matching foot velocity at lift-off/touchdown/loop. Its silhouette and perspective stay unchanged. Validation checks 676 frames, thigh texture seams, heel weights and continuous foot velocity.

Proiect izolat pentru calibrarea adulților Tempestopteryx și Fulgurodrome. Nu scrie în joc și nu modifică salvările. Imaginile de referință și reperele sunt copiate în `source`, astfel încât reconstrucția nu depinde de mutările asseturilor jocului.

`npm install`, apoi `npm run build`, `npm test` și `npm start`. Inspector: http://127.0.0.1:5190.

Fulgurodrome: http://127.0.0.1:5190/?species=fulgurodrome. Selectorul din header permite schimbarea speciei. Rigul său are 22 de oase și șapte straturi extrase din aceeași referință: corp, gât/cap, coadă, două picioare și două brațe. Mersul folosește două lanțuri cu articulații conectate și ținte pentru sprijinul picioarelor; atacurile au încordare, mișcarea brațelor și salt. Exporturile sunt în `public/models/fulgurodrome`.

`FULGURO-VALIDATION.json` verifică cele 676 de cadre, lungimile articulațiilor, accesibilitatea țintelor picioarelor, asamblarea și deformarea plaselor. `FULGURO-BROWSER-VALIDATION.json` verifică rigul în motorul Spine, cele patru animații, schimbarea speciei și afișarea pe mobil.

Cele trei straturi sunt extrase din aceeași imagine. Gâtul și capul păstrează forma pictată. Mișcarea ambelor aripi pornește din aceeași deplasare verticală, cu umerii ancorați și articulațiile conectate. Inspectorul permite pauză, navigare prin cadre, schelet, plasă, comparație cu originalul și export PNG. Numai adultul este calibrat aici; celelalte vârste nu sunt simulate prin scalare.

Export Spine 3.8: `public/model/animated.json`, `rig.atlas` și cele trei PNG-uri ale dinozaurului. Furtuna are pregătire cu aripi strânse, o bătaie puternică, urcare, planaj înclinat și revenire. Coada este ponderată pe propriile oase și contrabalansează înclinarea. Toate animațiile folosesc exclusiv scheletul și membranele dinozaurului. Runtime-ul copiat din dinosaur-pack își păstrează licența inclusă. `bones.json` folosește exact același schelet și aceleași animații.

`scripts/validate.mjs` verifică fiecare cadru la 60 Hz: articulații conectate, fază comună, gât stabil, ponderi normalizate, asamblare inițială și absența triunghiurilor inversate. `VALIDATION.json` păstrează rezultatul. Inspecția vizuală completează verificările geometrice.

Tempestopteryx flight study: Rune Wyvern Dragon adult (`fly`, `attack`, `special1`), sampled by `scripts/sample-rune.mjs` into `source/rune-fly.json` and `source/rune-actions.json`. New motion curves are authored for Tempestopteryx rather than transferring dragon channels: asymmetric power stroke/recovery/glide, delayed outer-wing flex, counterbalancing tail, windup/dive/brake attack, and climb/bank/stoop special. No FX layers.


Frondonychus adult: http://127.0.0.1:5190/?species=frondonychus.
`npm run build:frondonychus` builds only this model. The studio offers idle,
walk and a restrained claw attack; the ultimate is deferred and excluded
from both the rig and selector. Walking reference: Robo Ravager adult.
Primal Rage was studied for attack preparation and weight transfer; direct
arm-channel transfer was unsuitable for the overlapping painted claws.
Samples and reference captures are kept in `source/frondonychus` and
`captures/frondonychus`.

The upper body, arms and claws share a continuous original-artwork mesh,
without cutout seams or a cloned torso patch. Both hands receive the same
rigid motion; separate elbow IK chains keep each arm connected. Leg
sections retain soft knees and rigid feet; the hip roots share the upper-body skin field to prevent a seam below the arms. `validate-frond.mjs` checks
reference pixel coverage, seamless walking, reachable feet, no mesh folds
and invariant claw triangles; `browser-frond.mjs` checks actual Spine
poses, controls, mobile layout and deferred ultimate state.


Tundraceratops adult: http://127.0.0.1:5190/?species=tundraceratops.
`npm run build:tundraceratops` rebuilds its 19-bone, 13-layer rig.
War Thorn adult supplies the quadruped movement reference; idle, walking
and a restrained horn thrust are available, with no ultimate.
All texture layers share one skin-weight field, including ankle overlaps
and the leg roots under the belly. This keeps coincident surface vertices
together during motion. Source artwork colors are retained.
`validate-tundra.mjs` checks 519 poses, reachable feet, mesh folds, original
pixels and rigid horns. `browser-tundra.mjs` additionally checks shared
texture vertices in the actual Spine runtime across 18 poses.


Terratitan adult: http://127.0.0.1:5190/?species=terratitan.
`npm run build:terratitan` builds the 22-bone, 13-layer rig from the original
`rig-lab/generated-dinosaurs/terratitan/adult/art.png`.
War Thorn's quadruped gait is used as a timing/weight-transfer reference,
with a slower authored gait for the sauropod proportions. Three neck bones
and four tail bones follow the curved artwork. Idle, walk and a forefoot
stomp are available; no ultimate or visual effects. All layer boundaries
share skin weights, including ankle joints and belly attachments.
`validate-terra.mjs` checks source coverage, foot reach, joint continuity,
mesh folds and seamless loops; `browser-terra.mjs` verifies actual runtime
surface continuity, controls and species switching.


Silvosteg adult: http://127.0.0.1:5190/?species=silvosteg.
`npm run build:silvosteg` builds the 20-bone, 13-layer rig from
`rig-lab/generated-dinosaurs/silvosteg/adult/art.png`. War Thorn supplies
the quadruped walking reference. Idle, grounded walking and an authored
tail attack (wind-up, strike, recovery) are available. Dorsal plates follow
the torso; three tail bones articulate the spiked tail without visual
effects. No ultimate. All texture layers share the same skin-weight field.
`validate-silvo.mjs` checks source pixels, contacts, loops and mesh folds;
`browser-silvo.mjs` checks shared runtime vertices and all three animations.


Cineraptor adult: http://127.0.0.1:5190/?species=cineraptor.
`npm run build:cineraptor` builds its 21-bone, 7-layer rig directly from
`rig-lab/generated-dinosaurs/cineraptor/adult/art.png`. Robo Ravager's
bipedal walking and Primal Rage's attack preparation provide references;
contact trajectories and arm motions are authored for this artwork.
Idle, walk and a restrained forward attack are available; no ultimate.
Both overlapping hands share a rigid movement, with independent elbow
chains. All layers use one skin field to weld knees, ankles and hip roots.
`validate-cine.mjs` checks original pixels, rigid claw triangles, reachable
feet, loops and folds; `browser-cine.mjs` checks shared runtime vertices
in 18 poses and species switching.


Cryolophus adult: http://127.0.0.1:5190/?species=cryolophus.
`npm run build:cryolophus` builds its 22-bone, 7-layer rig directly from
`rig-lab/generated-dinosaurs/cryolophus/adult/art.png`. Alternative dragon
references were extracted and sampled by `sample-cryo-references.mjs`.
Walking uses Red Crested's sampled hip and tail curves, resampled smoothly
with periodic cubic interpolation, plus authored foot contacts. Reptileader
provides the early attack preparation and forward surge reference; the
adapted bite includes a separate jaw bone. Idle, walk and bite are available
without visual effects or an ultimate. Shared skin fields weld leg texture
joints, and a tighter smoothing radius avoids influence from the other leg.
`validate-cryo.mjs` checks reach, mesh areas, rigid head/jaw/claw triangles,
source pixels, loops and the jaw attack channel; `browser-cryo.mjs` checks
actual runtime surface continuity and 18 animation poses.


Ferrankyl adult: http://127.0.0.1:5190/?species=ferrankyl.
`npm run build:ferrankyl` builds the 20-bone, 13-layer rig from
`rig-lab/generated-dinosaurs/ferrankyl/adult/art.png`. Flaming Rock and
Clawtortle were sampled with `sample-ferra-references.mjs`; Flaming Rock
was chosen for its low quadruped gait and attack preparation. Walking
uses its sampled pelvis curve with periodic cubic interpolation and
authored short foot contacts. The attack is adapted to a club-tail strike
with anticipation, impact and recovery. The club follows the final tail
bone rigidly. Idle, walking and tail attack are available; no effects or
ultimate. Shared vertex weights keep ankles and belly attachments welded.
`validate-ferra.mjs` checks source pixels, foot reach, loops, rigid club
triangles and mesh folds; `browser-ferra.mjs` checks runtime seams and
18 poses plus mobile controls and species switching.


Fluviovenator adult: http://127.0.0.1:5190/?species=fluviovenator.
`npm run build:fluviovenator` builds its 23-bone, 7-layer rig from
`rig-lab/generated-dinosaurs/fluviovenator/adult/art.png`. Cavemodo was
sampled with `sample-fluvio-references.mjs`; its pelvis and tail cadence
are resampled with periodic cubic interpolation. Contacts, neck movement
and a low forward bite are authored for the spinosaur proportions.
The jaw and four tail segments articulate separately; the sail follows
the torso. Idle, walking and bite are available, without effects or an
ultimate. Arm ownership takes priority at the overlapping claw/foot masks,
and all texture joints share the same skin field.
`validate-fluvio.mjs` checks pixels, mesh folds, reach, rigid head/jaw/claw
triangles and loops; `browser-fluvio.mjs` checks 18 native runtime poses.


Pelagisaur adult: http://127.0.0.1:5190/?species=pelagisaur.
`npm run build:pelagisaur` builds the 13-bone continuous-artwork rig from
`rig-lab/generated-dinosaurs/pelagisaur/adult/art.png`. The Sea Dragon
was inspected in native Spine for breathe, walk, fly, attack and special1
with `sample-pelagi-references.mjs`. Its fly pelvis cadence is smoothly
resampled; fins, long neck and tail are animated for this specific anatomy.
The reference includes water beam/splash, glow, particles and circle FX
bones. These were inspected in reference captures; the Pelagisaur rig
uses skeletal motion only, preserving the user's prior preference.
Plutire, Inot and a forward attack are available, without an ultimate.
A single original mesh avoids cutout seams at the fin roots; distal fin
triangles keep their shape. `validate-pelagi.mjs` checks 567 frames, pixel
preservation, folds, rigid triangles and seamless swim loops;
`browser-pelagi.mjs` checks 18 native poses, mobile and species switching.


Pyroceratops adult: http://127.0.0.1:5190/?species=pyroceratops.
`npm run build:pyroceratops` builds its 19-bone, 13-layer rig from
`rig-lab/generated-dinosaurs/pyroceratops/adult/art.png`. War Thorn
provides the quadruped walking and horn-attack reference, adapted to this
artwork's proportions and head attachment. Idle, grounded walking and
a short horn thrust are available. Horns and the frill keep their shape;
all texture layers share one skin field at ankles and belly roots.
No ultimate or added effects. `validate-pyro.mjs` checks mesh folds,
reach, original pixels, loops and rigid head triangles;
`browser-pyro.mjs` checks runtime shared vertices in 18 poses.


Pyroceratops life stages
-----------------------
The header now groups life stages under one species and offers
Copil / Juvenil / Adult. Direct links:
- http://127.0.0.1:5190/?species=pyroceratops&stage=pui
- http://127.0.0.1:5190/?species=pyroceratops&stage=juvenil
- http://127.0.0.1:5190/?species=pyroceratops&stage=adult

The young rigs use their own original artwork, joint coordinates, masks,
mesh weights and animation files, in models/pyroceratops-pui and
models/pyroceratops-juvenil. Adult rig assets and its build/motion scripts
are untouched. The child has shorter steps at a quicker cadence and a
lighter attack; the juvenile has intermediate cadence and attack strength.
Its rear knee is positioned with sufficient rest bend to avoid mesh
compression during lift-off.

Use `npm run build:pyroceratops:pui` or
`npm run build:pyroceratops:juvenil` to rebuild one stage independently.
The matching validate/browser scripts check each stage;
`validate-pyro-adult-preserved.mjs` compares all 20 adult assets and scripts
against their SHA-256 baseline in PYRO-ADULT-BASELINE.json.
