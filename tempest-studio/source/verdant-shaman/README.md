# Verdant Shaman — reference artwork rig

The active rig uses the user's exact assembled reference from `e86bacb3-efcf-4384-8a28-ac2f5c94dba7.png`. `reference.png` preserves that input. Every vertex retains its original position in setup; the two complementary texture masks reconstruct every visible source pixel without rescaling individual parts.

Preview: http://127.0.0.1:5190/?species=verdant-shaman

The dinosaur uses a continuous weighted mesh, and the staff uses a rigid mesh attached to the gripping hand. Twenty-one bones control the chest, head, three tail sections, upper/lower legs and feet, both arms, staff and accessories.

Animations: `idle` (4 seconds, breathing), `walk` (1.6 seconds, walking in place with alternating leg IK), and `attack` (2.1 seconds, a restrained staff swing and recovery). The single painted view limits how far joints can turn without revealing missing surfaces.

Rebuild: `node scripts/build-verdant-shaman.mjs` from tempest-studio. This imports `build-shaman-reference.mjs`; it does not rebuild the discarded parts atlas.

Validate: `node scripts/validate-shaman-reference.mjs`, then `node scripts/browser-verdant-shaman.mjs` with the studio server running. Validation checks exact reconstruction of source pixels and every animation frame at 60 Hz for finite vertices and unfolded mesh triangles. Browser validation also verifies loading and staff parenting.

Spine 3.8 export: keep `animated.json`, `rig.atlas`, `art.png` and `staff.png` together. `reference.png` and the three `*-preview.png` files are static images for review.

`alternative-assembled.png` is a separate new illustration generated using the built-in imagegen tool. Its prompt is in `alternative-prompt.txt`. It is not the active rig's texture. The older `parts-atlas.png` and `prompt.txt` remain as unused source artifacts.
