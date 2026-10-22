# Native UI review

## v0.2.1 — 22 October 2026

Inventory cells are square, with theme-derived grid lines, empty cells and individually outlined footprints. An initial render exposed unresolved legacy border variables; deriving lines from the native text colour corrected both themes. Equipped equipment is listed separately from the three accessible storage slots. The item inspector offers Equip / Unequip for weapons, grenades and tools, and shows Main item or Off-hand. The editor provides a category override.

72 automated tests cover loadout capacity, swaps, ownership, action prerequisites and depleted grenades. 70 browser checks at 1100, 760, 600 and 460 px verify square cells and visible grid backgrounds alongside responsive layout and native sheet interactions. Production templates are rendered with native Foundry CSS; a licensed server remains necessary for multiplayer and canvas verification.

![Inventory cells in the native dark theme](ui/inventory-cells-dark.png)

![Inventory cells in the native light theme](ui/inventory-cells-light.png)

## v0.2.0 — 22 October 2026

The implementation replaces the dashboard summary with a character record: portrait and name, Attributes, character history, training and journal entries. The Equipment tab uses five item footprints and a selected-item detail panel. Foundry supplies the colours, themes, typography and controls. The default artwork is Foundry's token icon; custom artwork remains unchanged.

| Area | Implemented behavior |
| --- | --- |
| Character | Native headings and flowing character text; no summary dashboard or promotional prompts |
| Inventory | Pocket 1×1, Small 2×1, Medium 2×2, Long 3×1, Bulky 3×2; configurable per Item |
| Selection | Item details, equipment actions, quantities, armour and chat sharing in one panel |
| Ordering | Native Item sort order through Foundry's integer-sort helper; drag and keyboard controls |
| Chat | Structured roll and injury results; item-bound actions; repeat Skill rolls; GM injury undo |
| Macros | Send Equipment to Chat utility, alongside the existing action macros |

67 automated rule, document, ownership, chat and utility tests pass. Manifest, templates and module syntax validate; native compendium compilation and archive integrity checks pass.

### Visual inspection

Production templates were rendered using the official demo's public core stylesheet and icon font, with the runner's preinstalled Chrome. The responsive and interaction harness passed 69 checks at 1100, 760, 600 and 460 px. Character, Skills, Equipment, Journal and Advance were inspected at the top and bottom in both themes, alongside combat, wizard, item and chat sections.

Inspection confirmed all five footprints, selected-item controls, and the new character record. It caught a dark-theme inheritance issue in parchment chat messages; applying Foundry's native light theme to the card corrected text and button contrast. Zero-value modifiers were removed from roll cards. The three accessible loadout slots remain on one row at narrow widths.

![Character record](ui/character-record-dark.png)

![Inventory grid and item controls](ui/inventory-grid-dark.png)

![Equipment chat card](ui/chat-equipment.png)

A licensed Foundry server is still needed for live multiplayer, canvas interactions, native dragging and module interoperability. The checklist is in [TESTING.md](TESTING.md).

## Previous review: v0.1.3

The previous interface passed 54 rule/document/lifecycle tests and 65 browser interaction and responsive checks at 1100, 760, 600 and 460 px. Production templates were inspected with the official demo's public core stylesheet and icon font in light and dark themes. Existing images in `docs/ui/` document that earlier interface, not the new v0.2.0 layout.
