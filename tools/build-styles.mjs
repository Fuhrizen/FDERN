import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// A new URL for every CSS change prevents older browser/proxy caches from
// combining a previous layout and palette with current Handlebars templates.
const source=await readFile('styles/fdern.css');
const digest=createHash('sha256').update(source).digest('hex').slice(0,12);
const name=`fdern-${digest}.css`,path=`styles/${name}`;
await writeFile(path,source);
const manifest=JSON.parse(await readFile('system.json','utf8'));
manifest.styles=[path,...(manifest.styles??[]).filter(entry=>!/^styles\/fdern(?:-[a-f0-9]{12})?\.css$/.test(entry))];
await writeFile('system.json',JSON.stringify(manifest,null,2)+'\n');
for(const existing of await readdir('styles'))if(/^fdern-[a-f0-9]{12}\.css$/.test(existing)&&existing!==name)await unlink(`styles/${existing}`);
console.log(`Layout stylesheet: ${path}`);
