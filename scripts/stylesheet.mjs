const FDERN_STYLESHEET = /^fdern(?:-[a-f0-9]{12})?\.css$/i;
const LOAD_TIMEOUT = 15000;

function systemStylesheetURL(document, manifestURL, style) {
  const manifest = new URL(manifestURL, document.baseURI);
  const directory = new URL('styles/', manifest);
  const url = new URL(style, manifest);
  if (url.origin !== directory.origin || !url.pathname.startsWith(directory.pathname) || !FDERN_STYLESHEET.test(url.pathname.slice(directory.pathname.length))) return null;
  return {url, directory};
}

function matchingLinks(document, directory) {
  return [...document.querySelectorAll('link[rel~="stylesheet"][href]')].flatMap(link => {
    try {
      const url = new URL(link.getAttribute('href') || link.href, document.baseURI);
      if (url.origin !== directory.origin || !url.pathname.startsWith(directory.pathname) || !FDERN_STYLESHEET.test(url.pathname.slice(directory.pathname.length))) return [];
      return [{link, path: url.pathname}];
    } catch { return []; }
  });
}

function waitForStylesheet(link, href, timeout = LOAD_TIMEOUT) {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      link.removeEventListener('load', loaded);
      link.removeEventListener('error', failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(`Unable to load FDERN stylesheet: ${href}`)); };
    link.addEventListener('load', loaded, {once: true});
    link.addEventListener('error', failed, {once: true});
    timer = setTimeout(() => { cleanup(); reject(new Error(`Timed out loading FDERN stylesheet: ${href}`)); }, timeout);
  });
}

/** Fetch the installed manifest and reconcile FDERN-owned stylesheet links. */
export async function refreshSystemStylesheets({document = globalThis.document, manifestURL, fetcher = globalThis.fetch} = {}) {
  if (!document || typeof fetcher !== 'function') return {added: 0, removed: 0, retained: []};
  const response = await fetcher(manifestURL, {cache: 'no-store'});
  if (!response.ok) throw new Error(`Unable to load FDERN stylesheet manifest (${response.status}).`);
  const manifest = await response.json();
  const declarations = (manifest.styles ?? []).map(style => systemStylesheetURL(document, manifestURL, style)).filter(Boolean);
  if (!declarations.length) return {added: 0, removed: 0, retained: []};

  const directory = declarations[0].directory;
  const links = matchingLinks(document, directory);
  const kept = new Map();
  let added = 0;

  // Establish every current stylesheet before removing any older one, so a bad
  // manifest path or failed request never leaves the world without its layout.
  for (const {url} of declarations) {
    if (kept.has(url.pathname)) continue;
    const candidates = links.filter(entry => entry.path === url.pathname);
    const current = candidates.find(entry => !entry.link.disabled) ?? candidates[0];
    if (current) {
      current.link.disabled = false;
      await waitForStylesheet(current.link, url.href);
      kept.set(url.pathname, current.link);
      continue;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    const loaded = waitForStylesheet(link, url.href);
    (document.head ?? document.documentElement).append(link);
    try { await loaded; }
    catch (error) { link.remove(); throw error; }
    kept.set(url.pathname, link);
    added++;
  }

  let removed = 0;
  for (const {link, path} of links) {
    if (kept.get(path) === link) continue;
    link.remove();
    removed++;
  }
  return {added, removed, retained: [...kept.keys()]};
}
