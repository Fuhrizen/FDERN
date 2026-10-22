# Implementation research

Reviewed 12 October 2026. FDERN Core Rulebook Playtest 1.1 is the existing implementation’s mechanical specification. The attachment in this session is the FUS rulebook; the user explicitly confirmed this work is for FDERN. FUS mechanics are not inherited.

| Source | Applied decision |
| --- | --- |
| [Foundry v14 ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html) and [DocumentSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html) | Native document sheets, form updates, item drag/drop, and ApplicationV2 rendering. |
| [Foundry v14 Combat](https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html) | Extend the native encounter and active turn; avoid a parallel initiative store. |
| [Foundry v14 DialogV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html) | Native controller queries for reactions, injury, and temporary Stun. |
| [Foundry v14 TokenDocument](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html), [preMoveToken](https://foundryvtt.com/api/v14/functions/hookEvents.preMoveToken.html), [moveToken](https://foundryvtt.com/api/v14/functions/hookEvents.moveToken.html) | Use the native ruler, final waypoints, constraints, and movement document workflow. |
| [Foundry v14 movement cost Region behavior](https://foundryvtt.com/api/v14/classes/foundry.data.regionBehaviors.ModifyMovementCostRegionBehaviorType.html) | Native difficult-terrain ruler costs; lightweight FDERN flags on existing Regions for direction-sensitive cover. |
| [D&D 5e Combat implementation](https://github.com/foundryvtt/dnd5e/blob/6.1.x/module/documents/combat.mjs) | Reference for extending core Combat and preserving native document lifecycle. No code copied. |
| [DCC v14 notes](https://github.com/foundryvtt-dcc/dcc/blob/main/docs/dev/V14.md) and init-hook module | Reference for TypeDataModel registration, ApplicationV2, explicit ActiveEffect phases, current messageMode and img fields. No rules or code copied. |
| [FUS memory helpers](https://github.com/Fuhrizen/FUS/blob/main/scripts/memory.mjs), commit 4b0b91b6b7b2c967627b2bc902c646fab07ccd2d | Ported notebook parsing, ranked search, stable tag colours, safe plain-text enrichment, and document links at the user's request. |
| [PF2e Toolbelt](https://github.com/reonZ/pf2e-toolbelt) | Reference for actionable chat, controlled-target workflows and modular quality-of-life tools. FDERN uses its own native documents and rules, with no dependency or copied code. |
| [PF2e Workbench](https://github.com/xdy/xdy-pf2e-workbench) | Reference for ready-to-use macro packs and integrated combat conveniences. All FDERN actions now have guarded macros calling the system API. |

## Resolved ambiguities

- Printed action IDs are normalized to stable lowercase identifiers. The catalogue includes every printed weapon/device archetype and both basic and advanced Disciplines.
- Cover geometry suggests a result, then the GM confirms the actual attack path. It does not silently infer physical protection from a nearby token or override an explicit GM ruling.
- Controllers acknowledge injury/Stun dice through a native query; the GM authority evaluates the roll and creates its visible chat record. This prevents accepting client-supplied damage totals.
- Character creation issues three compatible sources per firearm/launcher as a convenient starting loadout. The book leaves loadout provisioning to the GM; the wizard labels it GM-approved.
- Normal Suppress is a Test, so it does not inherit or add accumulated Recoil. Sustained Suppression counts as an Attack. No area suppression lane or scatter rule is added.
- Difficult ground reduces the entire paid Move's allowance by 5 ft. The native ruler shows its terrain cost; the paid-distance check handles the actual modified Move allowance.

## Native UI review — 22 October 2026

- Reused Foundry's `ActorSheetV2` / `ItemSheetV2`, `ApplicationV2.TABS`, `standard-form`, `form-group`, native `fieldset`, `details`, notifications and buttons. FDERN CSS controls layout and grid dimensions; it supplies no theme, typography, control colours or focus styling.
- Adapted the permission-aware inventory row pattern from [PF2e inventory](https://github.com/foundryvtt/pf2e/blob/v14-dev/static/templates/actors/partials/inventory.hbs), file SHA `81e9e04cfc808f3171312c8c1303fecb15780939`: inspection stays available while mutation controls depend on edit permission. Reimplemented using native buttons for keyboard access.
- Used [D&D 5e character header](https://github.com/foundryvtt/dnd5e/blob/6.1.x/templates/actors/character-header.hbs), file SHA `ac372a6302d0c7d6df696116344d560f20bbbab7`, as a reference for separating identity from compact resource information and explicit accessible control names.
- Reused the tab group/data attributes shown in [PF2e inventory tab](https://github.com/foundryvtt/pf2e/blob/v14-dev/static/templates/actors/character/tabs/inventory.hbs) with Foundry v14's native tab controller. No system-specific CSS, rules text, assets or substantial source code was copied from these projects.
- The visual harness uses the official demo's public core stylesheet and icon font, never packaged with FDERN. It renders the real production templates and shared dialog formatter in light and dark themes at 1100, 760, 600 and 460 px. This is a template/DOM harness, not a licensed Foundry runtime.
