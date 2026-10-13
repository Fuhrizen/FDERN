FDERN's first playable system release for Foundry VTT v14, implementing Core Rulebook Playtest 1.1.

Includes live Character/NPC and equipment sheets with native Foundry styling; a saved point-spend character wizard; weighted random side activations integrated with native Combat; action, Load, Recoil, Pressure, Wounds, injury, armour, shield, medical, grenade and advancement automation; controller reaction dialogs; native Region terrain tools; paid ruler movement; FUS memory notebooks; 57 equipment/ammo profiles, 16 Disciplines, 41 action references, and 47 macros.

Install using the `system.json` release asset, or extract `fdern.zip` into `Data/systems/`. SHA256SUMS verifies the assets.

Validation: automated rule and document-harness tests, syntax/manifest/template checks, responsive Chromium UI checks, compendium compilation, and archive verification. A licensed Foundry runtime was not available in the build environment. Live multiplayer/canvas testing is still required; see docs/TESTING.md.

GM confirmations remain for physical cover and visibility, grenade exposure, trigger checkpoints, mounted firing arcs, medical plausibility, unusual equipment functions, and dropped-item recovery. Overwatch uses a native Region or declared watched lane; movement pauses at Region/Reach checkpoints before confirmed triggers resolve. These are playtest adjudication controls, not claims of fully inferred physical geometry.
