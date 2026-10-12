# Validation

## Automated checks

Run `npm ci`, `npm test`, `npm run check`, `npm run build:packs`, and `npm run build`.

`npm run test:ui` renders the actual Handlebars templates and stylesheet with representative document data in Chromium. It checks desktop and narrow sheet/wizard/encounter layouts, navigation handlers, fields, and horizontal overflow. The harness is not a licensed Foundry runtime.

## Licensed Foundry v14 multiplayer checklist

This checklist has not been executed in the build environment. A licensed Foundry server is not present. Target: v14.368.

1. Install the release manifest in Setup. Create a clean FDERN world. Confirm four compendiums load and no startup errors occur.
2. Connect a GM and two Players. Create two Characters and unlinked NPC tokens. Complete creation with valid budgets; close/reopen the wizard midway to check saved progress. Check all sheet tabs and native drag/drop.
3. Confirm owner/observer restrictions. Have Player A try to request actions for Player B's Actor. Confirm rejection. Confirm commands and hidden NPC information are not exposed to unrelated Players.
4. Set sides, start combat, draw, choose and finish each activation. Check the native Combat active turn. Add/remove or Down an unactivated combatant and verify bag reconciliation. Check up to three two-Action opening ambush activations.
5. Move then shoot a service rifle: +2 DC. Repeat with an SMG: no Assault penalty. Fire three R1 shots: accumulated penalties 0, 1, 2. Burst consumes two Actions and two Load. Misses spend costs. Manual firearms require Cycle.
6. Test Light Cover + Take Cover (+2 DC), flank it, and confirm an unprotected shot loses both cover benefits. Two successful covered Suppress actions each add one Pressure. Normal misses add no Pressure. Sustained suppression uses one roll for two thresholds.
7. Test Pinned plus two Wounds: two Actions. Rally/healing does not refund an Action. Overwhelmed ordinary movement is blocked; a legal covered Step remains available.
8. Trigger owner Evade/Parry, Dive, Shield Absorb, Cover Ally, Overwatch, Intercept, Opportunity Strike and Riposte. Confirm interruption order, range/position rechecks, shield breakage, one reserved Reaction across a round, no answering Reaction to a reaction attack, and exact movement checkpoint placement.
9. Reload from a compatible partial 2/4 source. Check it installs at 2/4; the old source is retained. Check incompatible sources are excluded. Test a two-Action reload spanning activations and tube loading consuming a recorded supply. Repack 1+2+3 into 4+2+0 outside combat.
10. Test injury: effective Armour is max(0, Armour-Pen); d6+Harm-Armour results ≤4/5–7/8+ yield 0/1/2 Wounds. Absorption 2 intercepts Harm 4 then breaks. Injury Undo refuses if later state changes occurred.
11. Test lethal Down, end-round bleeding marks, repeated Down Stabilise DC, Field Dressing limits shared across medics, and a Field Dressing that leaves an active bleed-out clock. Check successful treatment requires GM approval to return to action. Test each temporary Stun result and next-activation expiry.
12. Grapple, Escape, Shove, Disarm and Lunge; ties favour defender. Confirm a usable hand is required and linked grapples limit separation. Recover or transfer a dropped item with GM oversight.
13. Draw Regions for cover and difficult ground. Confirm native movement costs and paid distance; use walls/doors to block movement. Try wounded/heavy/prone movement and multiple waypoints. Check opportunity/reserved interrupts with both Player-initiated and GM-initiated moves.
14. Place grenades at 30 ft: a failed fragmentation Throw has half Harm 2 at the same centre. Check all six payloads and both launchers, shield/armour distinctions, exposure re-evaluation after Dive, smoke/fire expiry, and once-per-activation incendiary checks.
15. Earn nine lifetime VP, spend seven: Level 2 and two available VP. Confirm rank caps, Advanced Discipline prerequisites, and the one lifetime Attribute purchase.
16. Create notebook notes with quoted tags, accents, HTML-looking text, and @UUID links. Check ranked search, tag colours, persistence, and safe enrichment.
17. Test import/export, hotbar macros, world reload, Scene Levels, detached sheets, and window sizes down to 460 px. Finish combat and ensure temporary state is cleaned up.

## Release verification

The workflow must complete before installation links are considered ready. The release contains `system.json`, `fdern.zip`, and `SHA256SUMS`. Verify the archived manifest version and declared pack paths, then compare the archive hash to SHA256SUMS. Compiled pack databases are release artifacts, generated from tracked JSON sources.
