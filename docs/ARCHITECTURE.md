# Architecture and rule coverage

## Native document ownership

| State | Foundry document |
| --- | --- |
| Attributes, Skills, resources, VP, biography, memory | Actor TypeDataModel |
| Weapons, armour, shields, magazines, Disciplines, action references | Item TypeDataModel |
| Round, active turn, activation bag and drawn side | Combat plus FDERN flags |
| Side and whether activated | Combatant flags |
| Condition icons and token state | Native Actor ActiveEffects with FDERN marker flags |
| Attack cards, rolls, authenticated player commands, injury undo | ChatMessage |
| Physical cover, difficult ground, smoke, incendiary areas | Region and RegionBehavior |
| Blast radius display | MeasuredTemplate |
| Hotbar operations | Macro |

No extra database, external memory/search service, damage socket RPC, grouped NPC actors, shield HP system, mission clock, attachment tree, or vehicle damage subsystem is introduced.

The active GM serializes action commands. Player requests are native ChatMessages; their authenticated author is checked against the acting Actor. The request contains intentions and references, never rolled damage. Native document ownership remains in force. Owner-level document editing is subject to Foundry's normal trusted-player model.

## Automated rules

- 2d6 Tests; selectable Attribute/Skill approach; personal contribution capped at +6; inspectable modifiers.
- Non-stacking 3/2/0 Action allowance fixed at activation start, one Reaction per round, weighted side bag, first-round ambush limit, Down eligibility and forfeiture.
- Readied item actions and Discipline prerequisites; two hands; three accessible slots; Load costs; Manual cycling; deployment and Heavy restrictions.
- Move/Disengage/covered Step, Aim, Rally, Take Cover, prone/stand, assistance, Observe/Spot, and ordinary interaction spending.
- Fire, Burst, Precision, Quick Presentation, Close Blast, Suppress, Sustained Suppression, accumulated Recoil/Strain, range/Assault/Pressure/engagement modifiers.
- Evade, Parry, Dive, Overwatch, opportunity attacks, Intercept, Riposte, Shield Absorb and Cover Ally. Reaction attacks cannot be answered by Reactions.
- Armed/non-lethal melee; opposed Grapple, Escape, Shove, Disarm, Lunge and Takedown; grapple linking and movement restriction.
- Ballistic/Melee armour, shield Harm reduction and single-hit breakage, Wounds, bleed-out and repeat Down episodes; patient-specific dressings and Stabilise; temporary controller-triggered Stun.
- Named source compatibility, preserved partial magazines, tube reload consumption, heavy/launcher paid progress, Load conservation when repacking.
- Full/half fragmentation, HE, flash, concussion, smoke, incendiary and launcher effects; no scatter; blast cover confirmation, Dive before exposure, native area timers, per-activation hazard checks.
- Lifetime and spent VP; levels 0/8/20/36/55; Skill purchase costs; basic/advanced Disciplines; one lifetime Attribute increase; rank and prerequisite caps.
- Ported FUS notebook, actor/item sheets, saved creation progress, compendiums, and macros.

## Explicit GM decisions

The rulebook requires judgement for credible trajectories, directional physical cover, visibility, shield interposition, usable equipment, ambush awareness, medical plausibility, substantial recovery, and major equipment damage. These remain visible confirmations or native document edits. Forced movement and Dive/Lunge placement use the native ruler with a controller acknowledgement. A dropped item remains on its owner's sheet for GM transfer/recovery; no extra loot-token actor is created.

Overwatch can reference a native Region defining the watched lane. Region crossings and Reach boundaries produce native movement checkpoints before a Reaction resolves. A text-only lane remains available for GM adjudication. Mounted firing arcs are declared text. The movement review requires GM confirmation of actual triggers; unusual geometry can be corrected with a native checkpoint or the correction macro. Effects placed outside a combat have narrative timing and require manual cleanup.

## Runtime validation boundary

The repository's tests exercise mechanics, schemas, document mutations, turn state, command ownership, templates, and responsive layout in a controlled harness. They do not emulate all of Foundry's canvas or licensed server implementation. The live multiplayer checklist in TESTING.md remains required before calling this build production-verified.
