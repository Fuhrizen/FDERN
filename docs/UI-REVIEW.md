# Native UI review

Reviewed 22 October 2026 for v0.1.3.

FDERN uses Foundry's standard forms, tabs, fieldsets, disclosures, buttons, notifications, typography and both themes. System CSS arranges content and sizes grids; it does not supply a colour theme. Architectural references and source attribution are in [RESEARCH.md](RESEARCH.md).

## Findings and changes

| Finding | Result |
| --- | --- |
| Fixed sidebar and large button grids dominated the sheet | Compact header and resources; native tab navigation and action rows |
| General actions obscured weapon controls | Collapsible general actions; readied equipment first |
| Checkbox icons were absent in the initial preview | Visual harness loads the same core icon font as Foundry |
| Resource and long item labels wrapped awkwardly | Compact resource labels; stacked weapon fields |
| Observer buttons invited unauthorized edits | Owner-aware actions, portrait, item and purchase controls |
| Portrait image lacked native keyboard activation | Native button; keyboard tab navigation checked |
| Action choices and ammo source fields exposed raw IDs | Named ammo selector and action checkboxes |
| Live renders collapsed disclosures or saved wizard drafts out of order | Disclosure state retained; wizard saves queued as snapshots |
| Combat changes could leave open sheets stale | Combat lifecycle refreshes rendered actor sheets |
| Concurrent condition updates could duplicate statuses | Per-actor reconciliation queue and duplicate cleanup |
| Invalid Ready or empty-launcher checks spent Actions | Validation precedes resource spending |
| Cover Ally accepted opponents | Combat side validation with disposition fallback |

## Whole-sheet usability review

| Area | Player workflow |
| --- | --- |
| Character | Default landing page; readable background, description, motivation and connections; strongest Skill rolls and recent notes; resumable creation |
| Skills | Search by Skill or Attribute; trained-only filter; paired Attribute and total roll bonus; correction fields behind a GM disclosure |
| Equipment | Search and compendium browsing; three accessible slots; grouped weapons, supplies, armour and ammunition; safe slot swaps, armour toggles and supply counters |
| Journal | Previews, direct opening from Character, clickable tag filters and a clear Add entry action |
| Advance | Available VP and level progress; exact costs, named prerequisites and passive/family benefits; reasons unavailable; purchase confirmation |
| Item details | Readable profile and actions first; explicit editing mode; open action profiles refresh after combat, actor or ammunition changes |

The profile grid was reduced to two balanced columns after inspection, and the summary and strongest Skills share a row. Combat resources live on Combat; active wounds remain visible in the identity header. Equipment was inspected both during preparation and during encounters. Encounter locks apply to participating characters only.

![Character overview using Foundry's dark theme](ui/character-overview-dark.png)

![Equipment preparation using native controls](ui/equipment-preparation-dark.png)

## Visual inspection

Production templates were rendered in Chromium with the official public demo's core stylesheet and icon font. Every Character, Skills, Equipment, Journal and Advance tab was inspected at both the top and bottom, alongside combat resources, equipment actions, wizard points, item reading/editing, encounter and geometry-dialog sections in both themes. Desktop and narrow sheets were also inspected. Inspection led to the wrapping, icon, action-order and prompt-spacing corrections above.

![Light theme resource summary](ui/resources-light.png)

![Dark theme resource summary](ui/resources-dark.png)

![Native wizard point spending](ui/skill-points-light.png)

The v0.1.3 review passed 54 rule/document/lifecycle tests and 65 responsive UI and interaction checks. The responsive harness covers 1100, 760, 600 and 460 px, keyboard navigation, observer restrictions, memory expansion, point spending and disclosure persistence. Rule/document tests, native compendium compilation and archive validation also run before publishing.

## Runtime boundary

This review uses a template/DOM harness, not a licensed Foundry server. Live multiplayer ownership, canvas geometry, native dragging, detached windows and module interoperability still require the checklist in [TESTING.md](TESTING.md).
