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

## Editorul de oase

`npm start`, apoi http://127.0.0.1:5190/editor.html (sau linkul „Editor de oase” din studio).

- Stânga: referința cu oasele desenate peste ea. Osul ales colorează în portocaliu pixelii care îl urmează (ponderile din `animated.json`); „Plasă” arată triunghiurile.
- Mai multe oase: Shift+click (pe imagine sau în listă) adaugă/scoate un os din selecție; tras pe o zonă goală desenează un dreptunghi care prinde oasele al căror mijloc e înăuntru (Shift = adaugă la selecție); Escape păstrează doar osul principal. Tras de linia sau originea unuia, se mută toate; vârful se mută doar pe osul lui. Pe animație, tras pe personaj le rotește pe toate cu același unghi și pune cadre la toate în același moment.
- Trage de cercul mare (origine) sau de cel mic (vârf) ca să muți un os; trage de linie ca să-l muți întreg. „Os nou”: apasă pe imagine și trage până la vârf; părintele este osul ales în acel moment.
- Oasele din listă fără marcaj sunt folosite de cod după nume (`build-shaman-reference.mjs`): li se pot schimba punctele și părintele, nu numele. Oasele noi (portocalii) au rază de influență și un balans opțional (grade, cicluri pe animație, fază). Oasele „generate de mers” vin din `shaman-walk-layers.mjs` și nu se editează aici.
- Mișcare (orice os din listă, în afară de cele generate de mers): animația rulează mare, lângă referință. Pe oasele inițiale cadrele se adaugă peste mișcarea scrisă în cod (respirație, mers, atac); previzualizarea scade ce a fost deja copt în rig (`bones-built.json`), deci arată exact ce va ieși la reconstrucție. Pune pauză, alege momentul cu bara de jos și trage pe personaj: osul ales se rotește după mouse și un cadru-cheie se scrie singur la acel moment; liniuțele de pe bară sunt cadrele (click = salt la ele). Sub „Reglaj fin” e lista cadrelor ca perechi timp (s) → unghi (°), cu „＋ Cadru la timpul curent”. Între cadre trecerea e lină; repausul și mersul se repetă (ultimul cadru revine în primul), atacul ține valorile de la capete. Previzualizarea arată cadrele imediat, fără reconstrucție; mișcarea e calculată de `public/custom-motion.js`, folosit și de build.
- Pensula (osul ales → „Pensulă”, `paint` în `bones.json`): „Adaugă” face pielea pictată să urmeze osul, „Șterge” dă partea osului părintelui (`body` pentru un os de sus). Portocaliul se schimbă pe loc; rigul, după „Reconstruiește”. Lucrează pe pictura corpului, nu pe piese. Un os poate avea mai mulți „vecini” care trag de aceeași zonă (de exemplu `tail1` și `tail2` la baza cozii): șterge-i pe toți, dinspre vârf spre bază. O tranziție prea scurtă între zona ștearsă și restul se poate plia la mișcări mari; „Validează” arată unde.
- Construcție de probă: `SHAMAN_BONES=<fișier> SHAMAN_OUT=<folder> node scripts/build-verdant-shaman.mjs` construiește din alt fișier de oase în alt folder, fără să atingă rigul studioului; `SHAMAN_OUT=<folder> node scripts/validate-shaman-reference.mjs` îl validează.
- Piese (`parts` în `bones.json`): oricâte bucăți tăiate din pictură, fiecare cu nume, contur și osul cu care se mișcă; se taie în ordinea listei, deci o piesă poate fi tăiată din alta (ochiul din cap). Fiecare devine un strat rigid (`<nume>.png`) deasupra corpului; golul rămas se umple din `source/verdant-shaman/hidden-<nume>.png` dacă există, altfel prin întinderea pixelilor din jur („Umplere în spate” = cât de departe). Marginea moale apare doar unde pictura continuă în spatele piesei; pe conturul exterior tăietura e netă, ca să nu rămână o umbră când piesa se mișcă. În repaus imaginea e identică cu referința. Bifa de lângă nume o activează; debifat → rigul se reface fără ea.
- AI (OpenAI, `scripts/ai.mjs`): cheia se citește pe server din `rig-lab/.env` (`OPEN_AI_KEY` sau `OPENAI_API_KEY`) și nu ajunge în pagină. Modele implicite `gpt-5.5` (text și imagini de intrare) și `gpt-image-2` (pictură); se schimbă cu `OPENAI_TEXT_MODEL` / `OPENAI_IMAGE_MODEL` în același `.env`. Fiecare buton trimite date la OpenAI și costă câțiva cenți.
  - „✨ Animează” (sus în bara laterală): descrii mișcarea, AI-ul propune cadre pentru animația aleasă jos (opțional doar pe oasele selectate), cu limitele de unghi la care pictura nu se pliază; cadrele apar imediat, Anulează le scoate. Primește doar lista oaselor, nu imaginea.
  - „✨ Decupează cu AI” (la o piesă): trimite referința și numele părții („ochiul”), primește un contur care înlocuiește conturul piesei; îl corectezi apoi.
  - „✨ Pictează ce e în spate” (la o piesă activă și reconstruită): trimite referința cu piesa scoasă și golul ei; rezultatul devine `source/verdant-shaman/hidden-<nume>.png` (cel vechi se mută în `history/`). La reconstrucție, pictura AI înlocuiește umplerea automată doar unde e vopsea reală; „Folosește umplerea automată” o scoate.
- Versiuni: `source/verdant-shaman/reference.png` nu e modificat niciodată; rigul e refăcut din el la fiecare reconstrucție. Fiecare salvare păstrează copia anterioară a `bones.json` în `source/verdant-shaman/history/` (ultimele 60); „Revino” încarcă una dintre ele, „Originalul” încarcă `bones.original.json` (oasele inițiale, fără piese și fără mișcare adăugată). După revenire, „Reconstruiește”.
- „Salvează” scrie `source/verdant-shaman/bones.json`; „Reconstruiește” salvează, rulează `npm run build` (≈35 s) și reîncarcă previzualizarea; „Validează” rulează `npm test`. Jurnalul arată ieșirea scripturilor.
- Dacă oasele diferă de `accepted-attack.json`, verificarea atacului acceptat este sărită și apare un avertisment în jurnal.

- `source/verdant-shaman`: referința originală, reperele și atacul acceptat. Detalii în `source/verdant-shaman/README.md`.
- `scripts/build-shaman-reference.mjs`: construiește rigul (21 de oase, plasă continuă și toiag rigid) și intrarea din `public/manifest.json`.
- `scripts/shaman-dragon-walk.mjs`, `shaman-walk-layers.mjs`, `leg-skin.mjs`: mersul și straturile picioarelor.
- `scripts/study-shaman-dragon-walk.mjs` (`npm run study:walk`): studiul de mers după Robo Ravager din `public/reference/robo-ravager`.
- Export Spine 3.8: `public/models/verdant-shaman` (`animated.json`, `rig.atlas`, `art.png`, `staff.png`) și arhiva `public/models/verdant-shaman-spine.zip`.
