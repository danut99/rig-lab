# Azure Warrior

Preview: http://127.0.0.1:5190/?species=azure-warrior

This is a registered warrior outfit for the existing Verdant Shaman anatomy: blue spotted skin, crimson battle mantle, metal armor and a sword. The source character was edited with imagegen; reference.png and prompt.txt preserve the illustration and generation instructions. hidden-torso.png and hidden-torso-prompt.txt provide concealed warrior-colored backing behind the moving thighs.

The 27 bones and all three original animation motion timelines, including body and leg deformation timelines, are identical to the captured shaman rig in base-rig.json. Bone names remain compatible. The sword uses the existing staff bone attached to the gripping hand; only its attachment geometry and texture bounds are replaced. The full sword page prevents clipping the blade tip in walking and attack.

Body and leg pages reuse the captured texture masks and meshes from base-textures and base-walk-layers.json. These source snapshots make rebuilding independent of future shaman edits. The warrior is a separate model; its build does not overwrite the shaman's assets.

Build from tempest-studio: node scripts/build-azure-warrior.mjs
Browser validation and previews: node scripts/browser-azure-warrior.mjs

The builder asserts exact bone and animation equality against the captured base rig. Browser validation checks eight poses per animation, attachment counts, finite world vertices and sword parenting, and generates a walking contact sheet.

Animations: idle (4 seconds, breathing), walk (2.2 seconds), attack (2.1 seconds, sword swing using the original attack motion).

The illustration is a new outfit fitted to one painted perspective. The bone editor currently edits the shaman; the warrior uses the captured rig snapshot rather than that live editor.

Spine 3.8 package: keep animated.json, rig.atlas and all PNG pages named in the atlas together. reference.png and the three preview images are supplied for review.

Warrior cloth repair: warrior-cloth.png retains the small rear fabric flap beside the far thigh. It is drawn on a separate body-parented slot in walk and attack, rather than inheriting the shaman mask that removed this material. Its pixels are removed from the leg and torso pages to avoid double drawing. Only attachment visibility keys are added; all original motion/deformation timelines remain exact.
