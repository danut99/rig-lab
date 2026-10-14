# Verdant Shaman

Preview: http://127.0.0.1:5190/?species=verdant-shaman

The original painting is preserved in reference.png. Setup reconstruction is validated against that source, including the optional separate head piece.

Animations: idle (4 seconds), walk (2.2 seconds), attack (2.1 seconds). Walking and attack share the corrected torso, tail backing, complete leg surfaces and staff layers. Breathing has its own full artwork mesh with intact legs and feet. An optional head piece remains above the other layers.

The near walking knee is at (440,1065), hip (510,960), in 1280 design coordinates. The knee's rear contour opens progressively with leg extension; the tail-facing edge stays anchored. This local shape correction is separate from width-preserving thigh/calf skinning. Toes remain rigid. The larger stride and foot clearance are retained. Attack uses stationary foot targets with the same corrected leg surfaces; the original staff swing and upper-body motion are retained.

The curved belly includes its shaded edge. Small backing patches cover the hips and the join behind the front tassel. Clean texture pages remove detached foot/staff overlap remnants. Original setup pages remain available for reconstruction.

Source images: hidden-torso.png is a generated concealed torso backing (prompt: hidden-torso-prompt.txt); toe-repair.png is an unused repair experiment (prompt: toe-repair-prompt.txt). All three visible right toes use the exact original artwork. The original visible artwork remains the principal texture. Old parts-atlas and alternative-assembled illustrations are unused experiments.

Build: node scripts/build-verdant-shaman.mjs
Full mesh validation: node scripts/validate-shaman-reference.mjs
Body and legs without the separate head: node scripts/validate-shaman-reference.mjs --exclude-head
Leg silhouette/width checks for walk and attack: node scripts/check-shaman-leg-volume.mjs
Browser checks and screenshots: node scripts/browser-verdant-shaman.mjs
Walk contact sheet, playback measurement and video: node scripts/preview-shaman-walk.mjs

Latest checks: body and leg triangles remain unfolded across all three cycles; 260 walking/attack poses retain leg width except for the intentional near-knee opening. Full mesh validation passes in the current configuration. Run node scripts/check-shaman-foot-art.mjs to check original right-toe texture preservation.

Spine 3.8 export: keep animated.json, rig.atlas and all PNG pages listed by the atlas together. The package includes reference.png, preview PNGs and walk-preview.webm for review.

Right-leg alignment: the far walking stride is centered 24 design pixels forward. Its rear endpoint is now about 15 pixels behind the original foot position instead of 39; total stride remains 78 pixels. Attack keeps its original stationary target.

Thigh-edge cleanup: the right thigh cutout follows the visible painted skin boundary under the cloth, removing cloth-border fragments and thin stray alpha bridges. Sparse upper-leg specks are removed without changing the original toe pixels.
