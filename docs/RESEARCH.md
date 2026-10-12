# Implementation research

Reviewed 12 October 2026. The attached FDERN Core Rulebook Playtest 1.1, particularly Appendix C, is the mechanical specification. FUS rules are not inherited.

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

## Resolved ambiguities

- Printed action IDs are normalized to stable lowercase identifiers. The catalogue includes every printed weapon/device archetype and both basic and advanced Disciplines.
- Cover geometry suggests a result, then the GM confirms the actual attack path. It does not silently infer physical protection from a nearby token or override an explicit GM ruling.
- Controllers acknowledge injury/Stun dice through a native query; the GM authority evaluates the roll and creates its visible chat record. This prevents accepting client-supplied damage totals.
- Character creation issues three compatible sources per firearm/launcher as a convenient starting loadout. The book leaves loadout provisioning to the GM; the wizard labels it GM-approved.
- Normal Suppress is a Test, so it does not inherit or add accumulated Recoil. Sustained Suppression counts as an Attack. No area suppression lane or scatter rule is added.
- Difficult ground reduces the entire paid Move's allowance by 5 ft. The native ruler shows its terrain cost; the paid-distance check handles the actual modified Move allowance.
