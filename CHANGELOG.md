# Changelog

## 0.2.0

- Character record layout with native headings and fields; removed dashboard summary boxes.
- Five item-size footprints, responsive inventory grid, selected-item controls and native drag/keyboard ordering.
- Configurable inventory size, default Foundry token artwork and preserved custom portraits.
- Structured chat cards with item actions, repeat Skill rolls and GM injury undo.
- Send Equipment to Chat utility macro; live action validation remains authoritative.

## 0.1.3

- Character-first sheet, searchable Skills, grouped equipment controls, journal previews and guided VP spending.
- Readable item profiles with a separate editing mode; open item profiles refresh with combat and resource changes.

## 0.1.2

- Corrected a truncated screenshot in the packaged UI review evidence. Runtime behavior matches 0.1.1.

## 0.1.1

- Native Foundry tabs, form groups, fieldsets, disclosures and controls across the character sheet, wizard, item sheet, encounter panel and prompts.
- Compact resource summary, readied equipment first, named ammunition sources, action checkboxes and a useful final wizard review.
- Observer controls and purchase availability match permissions and budgets; portraits and tabs support the keyboard.
- Wizard saves retain ordering; combat changes refresh open sheets; managed conditions reconcile without stale or duplicate effects.
- Failed Ready and empty-launcher validation preserve Actions; Cover Ally checks encounter sides.
- Visual inspection of small production UI sections in both native themes, responsive checks and targeted regressions.

## 0.1.0

Initial FDERN implementation for Foundry VTT v14:

- Native document data models and live Character/NPC and item sheets using Foundry styling with responsive layout grids.
- Saved character creation wizard with exact budgets and prerequisite validation.
- Weighted side activation bag, opening ambushes, native active turns, round timers, and reserved Reactions.
- Firearm, melee, opposed-control, suppression, injury, armour, shield interception, medical care, and advancement automation.
- Independent compatible ammunition sources, partial reloads, reload progress, and conserved repacking.
- Native Region terrain authoring, directional cover confirmation, paid ruler movement, and grenade/smoke/incendiary areas.
- FUS memory notebook, compendiums, hotbar item macros, and ready-to-use combat macros.
- Deterministic packaging, release workflow, rule acceptance tests, document harness tests, and responsive UI checks.
- Complete 47-macro pack, ranged Stun suppression correction, saved wizard steps, per-Region metadata preservation, and clean combat restart state.

Live licensed-Foundry validation is documented separately from automated harness checks in docs/TESTING.md.
