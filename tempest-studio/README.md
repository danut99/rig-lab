# Tempest Studio · Verdant Shaman

Studio izolat pentru rigul Verdant Shaman. Nu scrie în joc și nu modifică salvările.

```bash
cd rig-lab/tempest-studio
npm ci              # pngjs și playwright-core
npm run build       # reface public/models/verdant-shaman din source/verdant-shaman
npm test            # validarea plasei: pixelii sursă și fiecare cadru la 60 Hz
npm start           # http://127.0.0.1:5190/?species=verdant-shaman
npm run test:browser  # cu serverul pornit: încărcare, animații, toiagul legat de mână
```

Scripturile folosesc `../scripts/lib` (geometrie și utilitare Spine), deci rulează din repo-ul `rig-lab` complet.

- `source/verdant-shaman`: referința originală, reperele și atacul acceptat. Detalii în `source/verdant-shaman/README.md`.
- `scripts/build-shaman-reference.mjs`: construiește rigul (21 de oase, plasă continuă și toiag rigid) și intrarea din `public/manifest.json`.
- `scripts/shaman-dragon-walk.mjs`, `shaman-walk-layers.mjs`, `leg-skin.mjs`: mersul și straturile picioarelor.
- `scripts/study-shaman-dragon-walk.mjs` (`npm run study:walk`): studiul de mers după Robo Ravager din `public/reference/robo-ravager`.
- Export Spine 3.8: `public/models/verdant-shaman` (`animated.json`, `rig.atlas`, `art.png`, `staff.png`) și arhiva `public/models/verdant-shaman-spine.zip`.
