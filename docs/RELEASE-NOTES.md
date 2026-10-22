FDERN v0.2.5: correct stylesheet delivery after updates.

The reported screenshot contained the v0.1 green palette, original button styling and 128px portrait together with current sheet templates. This combination occurs when the old stylesheet is retained at the unchanged styles/fdern.css URL.

The manifest now points to a content-specific stylesheet filename. Its URL changes whenever the CSS changes, and the build verifies that its contents match the source. This prevents an old browser or proxy cache entry from supplying the previous palette and layout. No CSS palette override, gameplay change or control change is included.

Update to v0.2.5, then reload the Foundry world page. The stylesheet path changes, so a cache purge should not be necessary. The sheet will use the native Foundry theme selected in your installation; that theme’s colours and fonts can differ from the public demo used in earlier previews.

Browser regression checks load styles through the manifest, simulate the old canonical URL returning the v0.1 stylesheet, and verify header layout, portrait sizing and the inventory grid. These remain browser checks rather than live verification inside the user’s Foundry instance.
