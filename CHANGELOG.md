# Changelog

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
