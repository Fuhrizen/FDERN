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

test('native status artwork covers exactly the derived conditions and distinguishes Down from Prone',async()=>{
  const {STATUS_EFFECTS}=await import('../scripts/status-config.mjs');const {desiredConditions}=await import('../scripts/conditions.mjs');
  const a={system:{combat:{wounds:0,pressure:0,overwatch:{active:false}}}};
  assert.deepEqual(STATUS_EFFECTS.map(s=>s.id).sort(),Object.keys(desiredConditions(a)).sort());assert.equal(new Set(STATUS_EFFECTS.map(s=>s.img)).size,STATUS_EFFECTS.length);assert.notEqual(STATUS_EFFECTS.find(s=>s.id==='down').img,STATUS_EFFECTS.find(s=>s.id==='prone').img);
});

test('condition reconciliation refreshes stock artwork without editing custom or manual effects',async()=>{
  const {STATUS_EFFECTS}=await import('../scripts/status-config.mjs');globalThis.CONFIG={statusEffects:STATUS_EFFECTS};
  const updates=[];const effects=[];const make=(condition,img)=>({img,getFlag:()=>condition,async update(data){updates.push({condition,...data});Object.assign(this,data);},async delete(){effects.splice(effects.indexOf(this),1);}});
  const down=make('down','icons/svg/falling.svg'),prone=make('prone','worlds/campaign/custom-prone.webp'),manual=make(undefined,'icons/svg/falling.svg');effects.push(down,prone,manual);
  const actor={uuid:'Actor.artwork',system:{combat:{wounds:3,prone:true,pressure:0,overwatch:{active:false}}},effects,async createEmbeddedDocuments(){throw Error('Existing effects should be reused.');}};
  await syncConditions(actor);assert.deepEqual(updates,[{condition:'down',img:'systems/fdern/assets/icons/down.svg'}]);assert.equal(prone.img,'worlds/campaign/custom-prone.webp');assert.ok(effects.includes(manual));assert.equal(effects.length,3);
  await syncConditions(actor);assert.equal(updates.length,1,'already-current artwork is not written again');
});
