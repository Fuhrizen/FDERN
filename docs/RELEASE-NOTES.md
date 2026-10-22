FDERN v0.2.0: shaped inventory, character layout and actionable chat.

Character sheets now read as a character record: portrait and name, Attributes, background, description, motivation, connections, training and journal entries. Dashboard summary boxes and generic promotional prompts have been removed. Foundry supplies the default token icon, colours, typography and themes.

The Equipment tab uses a responsive inventory grid with five item footprints: Pocket 1×1, Small 2×1, Medium 2×2, Long 3×1 and Bulky 3×2. Selecting an item opens its controls in a detail panel. Drag items to reorder, or use the ordering buttons. Foundry's native Item sort order is retained. Item size is configurable in Edit item; it changes the footprint without adding weight or capacity rules. Existing equipment gets a type-based automatic size.

Send to chat posts an item profile with usable equipment actions. Skill cards offer another roll of the same Skill; attack cards offer details and reload controls for the relevant weapon; injury cards retain GM-only undo. Action buttons validate ownership and the current game state through the existing system API. The macro compendium now includes Send Equipment to Chat.

Existing character data, equipment identities, journal entries and macros remain intact. Live multiplayer and canvas behavior still require a licensed Foundry runtime.
