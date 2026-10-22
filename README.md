# FDERN

A modern tactical roleplaying game system for Foundry Virtual Tabletop v14.

## Install

In Foundry Setup, choose **Game Systems → Install System** and paste:

```
https://github.com/Fuhrizen/FDERN/releases/latest/download/system.json
```

Create a world using FDERN. A licensed Foundry v14 installation is required; no additional modules are required. For manual installation, extract `fdern.zip` into `Data/systems/` so the manifest is at `Data/systems/fdern/system.json`.

## Play

- Create a Character or NPC and open its Character Wizard. Allocate 5 Attribute points, 10 Skill points, and two eligible basic Disciplines, then choose a GM-approved loadout. Progress is saved between sessions.
- Use the Equipment compendium for weapons, protection, devices, and compatible ammo sources. Assign Primary, Secondary, and Tertiary slots. Equip items before using their actions. Equip one main item or up to two off-hand items. Knives and grenades default to off-hand; change this under Edit item → Equip as. Armour is worn separately.
- Select tokens and open **FDERN Encounter** from the Combat sidebar, or use the macro. Set side names before starting. Draw a side, choose an eligible character, play its activation, and end it. Core Combat controls operate the same encounter.
- Target a token, then choose an action on the sheet or hotbar. Cards show Action/Load costs, the roll, and the modifier breakdown. A connected GM resolves automation and controller dialogs offer eligible Reactions before the decisive roll.
- Buy a Move or Disengage action, then move using Foundry's ruler. Paid distance, wounds, heavy equipment, difficult terrain, and grapples constrain movement. The GM can review reserved and opportunity triggers before movement proceeds.
- Track Wounds, Pressure, temporary Stun, and bleed-out on the live sheet. Medical kit actions preserve each patient's encounter dressing limit. The GM approves a treated Down character's return to action.

## Map preparation

Use Foundry's native Regions drawing tools. Select a Region and click **FDERN: Cover & Difficult Terrain**, or run the corresponding macro. Mark Light, Hard, or Complete Cover and difficult ground. Use native Walls for solid barriers and doors.

Cover is directional: an attack path must intersect the marked obstacle. The geometry dialog lets the GM confirm actual protection and visibility, including unusual terrain or Scene Levels. A cover marker does not protect a token merely because it stands nearby. Native v14 movement-cost behaviors show difficult ground in the ruler. Wounds and heavy equipment modify the allowed distance separately.

Grenades choose a point on the map and resolve full or half effect there without scatter. Native templates show radii; smoke and incendiary Regions expire by combat round. Dive to Cover resolves before final blast exposure. Manually remove effects placed outside combat when their narrative duration ends.

## Character sheets

The sheet opens on **Character**, with attributes, background, description, motivation, connections, training and journal entries. **Edit character** updates the profile; unfinished characters can resume the saved wizard.

- **Skills:** search by Skill or Attribute, filter trained Skills, and roll the displayed bonus. The roll dialog allows a different Attribute and situational modifiers.
- **Equipment:** browse the compendium and drag items onto the sheet. The inventory grid uses five item footprints: Pocket (1×1), Small (2×1), Medium (2×2), Long (3×1), and Bulky (3×2). Select a tile to inspect and use its equipment. Equipped items have direct action buttons with costs and availability; equip controls preview what will be put away. Filter to equipped and worn items, navigate tiles with Left/Right or Home/End, and clear searches with Escape. Drag tiles or use the ordering buttons to reorganize them. Edit item → Inventory size changes the footprint. Size is a visual arrangement, not a carrying limit. Accessible loadout slots, armour, supply counters, and ammunition remain native Item data. Reorganization is locked during an encounter.
- **Journal:** add entries, read previews, expand notes, and click a tag to filter related entries. This ports FUS's plain-text notebook helpers: quoted tags, tag colours, ranked search and Foundry `@UUID` links. Search `tag:"field notes"` to filter by a tag.
- **Advance:** see available VP, improvement costs, prerequisites and reasons a purchase is unavailable. Purchases ask for confirmation before spending.
- **Combat:** equipped equipment appears first; general actions expand when needed. Resources and action availability update with native document changes.

Items open with a readable profile and usable actions. Owners can choose **Edit item** to change the underlying profile. Drag equipment to the hotbar for an item macro. Character and NPC mechanics are identical. Layout CSS controls spacing and grids; Foundry supplies colours, typography, buttons, fields, focus and disabled states. Both light and dark themes are supported.

VP spending enforces costs, prerequisites, Skill/Attribute caps, and the single lifetime Attribute purchase. Lifetime VP determines level; spending does not reduce it. Levels do not grant extra actions or health.

## Compendiums and macros

The system includes equipment grouped by weapon/cartridge/family, basic and advanced Disciplines, action references, and hotbar-ready macros. Firearms use independently tracked compatible magazines, tubes, belts, or launcher sources. Reload preserves partial sources. Heavy reload progress persists across activations. Repacking outside combat conserves total Load.

Use **Send to chat** on an inventory item, or the **Send Equipment to Chat** macro, to post its profile and relevant actions. Chat buttons open documents, equip/unequip equipment, reload, or use item actions through the same ownership and rules checks as the sheet. Skill cards provide a repeat roll; injury cards keep the GM undo control. Cards show the roll, modifiers, costs and outcome using the current Foundry theme.

The macro compendium includes all 41 rules actions and seven utility macros, with visible error messages for missing tokens, items, or permissions. **GM: Correct Token Position** provides an explicit movement correction.

## API

```js
const actor = game.fdern.selectedActor();
await game.fdern.act(actor, "fire"); // Uses a readied compatible item and current target.
await game.fdern.act(actor, "reload", actor.items.get(weaponId));
game.fdern.encounter.render({force: true});
await game.fdern.terrainEditor();
await game.fdern.shareEquipment(actor);
await game.fdern.request({type: "repack", actor: actor.uuid});
```

Stable action IDs live in `scripts/config.mjs`. Item profiles supply action IDs; Disciplines unlock matching item actions. Foundry Actor, Item, Combat, Combatant, ChatMessage, ActiveEffect, Region, RegionBehavior, and MeasuredTemplate documents remain the source of truth.

## Development

Requires Node.js 24 and Python 3.

```sh
npm ci
npm test
npm run check
npm run build:packs
npm run build
npm run test:ui
```

A release workflow runs validation, compiles native compendiums, packages the system, and publishes the versioned archive and manifest. See [testing](docs/TESTING.md), [architecture and rule coverage](docs/ARCHITECTURE.md), and [research](docs/RESEARCH.md).

## Support

Report reproducible bugs through the repository's Issues page. Include Foundry version, system version, console errors, reproduction steps, and a minimal example. FDERN implements the Playtest 1.1 rules; campaign structure, medical plausibility, unusual geometry, static firing arcs, and major equipment destruction remain GM decisions.

Equipment uses bundled category artwork in compendiums, inventory, item sheets and chat. Explicit custom images are retained. Character and NPC tokens keep Foundry’s default token icon. See [assets/README.md](assets/README.md) for artwork coverage and licensing.
