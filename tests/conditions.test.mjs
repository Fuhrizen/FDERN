import test from 'node:test';
import assert from 'node:assert/strict';
import {syncConditions} from '../scripts/conditions.mjs';
test('overlapping condition updates converge without duplicate effects and retain manual effects',async()=>{
  globalThis.CONFIG={statusEffects:['pinned','overwhelmed'].map(id=>({id,name:id,img:'icons/svg/net.svg'}))};
  const effects=[];
  const actor={uuid:'Actor.conditions',system:{combat:{pressure:5,wounds:0,overwatch:{active:false}}},effects,async createEmbeddedDocuments(_type,rows){await Promise.resolve();for(const row of rows)effects.push(effect(row.flags.fdern.condition));}};
  function effect(id){return {getFlag:()=>id,async delete(){effects.splice(effects.indexOf(this),1);}};}
  const manual=effect(undefined);effects.push(manual);
  await Promise.all([syncConditions(actor),syncConditions(actor),syncConditions(actor)]);
  assert.equal(effects.filter(e=>e.getFlag()==='pinned').length,1);
  effects.push(effect('pinned'));await syncConditions(actor);assert.equal(effects.filter(e=>e.getFlag()==='pinned').length,1);
  const old=syncConditions(actor);actor.system.combat.pressure=7;await Promise.all([old,syncConditions(actor)]);
  assert.equal(effects.filter(e=>e.getFlag()==='pinned').length,0);assert.equal(effects.filter(e=>e.getFlag()==='overwhelmed').length,1);assert.ok(effects.includes(manual));
});
