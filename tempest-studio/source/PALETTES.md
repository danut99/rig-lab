# Habitat palettes

Nine habitats are available on three roles: fire plus ice, water, earth, lightning, shadow, air, crystal and nature. The eight additional palettes are configured in `element-palettes.json`.

Each `source/<habitat>-<role>/` contains the generated color artwork, its prompt, the registered reference, the source rig snapshot and the original texture masks. Runtime assets are in `public/models/<habitat>-<role>/`.

Palette generation changes color artwork. Integration copies the existing rig and atlas without changing bones, mesh geometry, slot order, motion timelines or page alpha masks. Generated images are registered to the original canvas; hidden torso colors are sampled from the generated palette. The original variants remain selectable.

Rebuild and validate the eight additional palettes from PowerShell:

```powershell
$env:PALETTE_CONFIG = 'source/element-palettes.json'
node scripts/build-fire-palettes.mjs
node scripts/build-palette-gallery.mjs
node scripts/browser-fire-palettes.mjs
node scripts/check-palette-gallery.mjs
./scripts/package-element-palettes.ps1
```

The animated browser validation covers 24 poses per model and checks the complete rig against its saved snapshot. Reports are saved in `ELEMENT-PALETTES-VALIDATION.json`. Gallery screenshots are in `captures/palettes/`.
