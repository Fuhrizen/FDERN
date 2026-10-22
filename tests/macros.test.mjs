import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {ACTIONS} from '../scripts/config.mjs';

test('macro compendium exposes every rules action with guarded execution', async()=>{
  const docs=await Promise.all((await readdir('pack-sources/macros')).filter(file=>file.endsWith('.json')).map(async file=>JSON.parse(await readFile(`pack-sources/macros/${file}`,'utf8'))));
  const byName=new Map(docs.map(doc=>[doc.name,doc]));
  for(const [id,action] of Object.entries(ACTIONS)){
    const doc=byName.get(action.name);
    assert.ok(doc,`missing hotbar macro for ${id}`);
    assert.match(doc.command,new RegExp(`game\\.fdern\\.act\\(actor, ${JSON.stringify(id).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
    assert.match(doc.command,/catch\(error\)/,`${id} should show action failures to the user`);
  }
  assert.equal(docs.length,Object.keys(ACTIONS).length+7,'action macros plus seven utility macros');
});
