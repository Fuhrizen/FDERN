import {refreshSystemStylesheets} from './stylesheet.mjs';

// This small module has its own URL so browsers that cached the older system
// entry point still run the stylesheet repair after installing a new manifest.
Hooks.once('init', async () => {
  const manifestURL = new URL('../system.json', import.meta.url).href;
  try { return await refreshSystemStylesheets({manifestURL}); }
  catch (error) {
    console.error('FDERN could not refresh its layout stylesheet. Reload the world after checking the system files.', error);
    return {error};
  }
});
