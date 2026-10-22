import {readFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import Handlebars from 'handlebars';
import {ARTWORK_ICONS} from '../scripts/artwork.mjs';
const m=JSON.parse(await readFile('system.json','utf8')),p=JSON.parse(await readFile('package.json','utf8'));
if(m.version!==p.version)throw Error('Versions differ');
for(const path of [...m.esmodules,...m.styles,...m.languages.map(l=>l.path),'README.md','LICENSE'])await stat(path);
for(const file of await readdir('scripts'))if(file.endsWith('.mjs'))execFileSync(process.execPath,['--check',`scripts/${file}`]);
for(const file of await readdir('templates'))Handlebars.precompile(await readFile(`templates/${file}`,'utf8'));
for(const file of await readdir('lang'))JSON.parse(await readFile(`lang/${file}`,'utf8'));
for(const name of ARTWORK_ICONS)await stat(`assets/icons/${name}.svg`);
for(const pack of m.packs){for(const file of await readdir(`pack-sources/${pack.name}`)){if(!file.endsWith('.json'))continue;const doc=JSON.parse(await readFile(`pack-sources/${pack.name}/${file}`,'utf8'));if(doc.img?.startsWith('systems/fdern/'))await stat(doc.img.slice('systems/fdern/'.length));}}
console.log('Manifest, module syntax, templates, and language data validated.');
