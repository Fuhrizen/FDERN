import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,token} from './harness.mjs';
setup();
const {CharacterData,EquipmentData,FdernActor}=await import('../scripts/models.mjs');
const {FdernActorSheet,FdernItemSheet}=await import('../scripts/sheets.mjs');
const {CharacterWizard}=await import('../scripts/wizard.mjs');
const {CATALOGUE}=await import('../scripts/catalogue.mjs');
CONFIG.Item.dataModels=Object.fromEntries(['firearm','melee','shield','armour','magazine','grenade','launcher','gear','discipline','action'].map(k=>[k,EquipmentData]));
function actor(){const a=new FdernActor({name:'Operator',type:'character'});a.system=new CharacterData({advancement:{lifetimeVP:0}},{parent:a});a.system.prepareDerivedData();token(a);return a;}
test('observer sheet disables actions and purchases; Aim belongs to firearms only',async()=>{
  const a=actor();await a.createEmbeddedDocuments('Item',[CATALOGUE.find(i=>i.id==='medical-kit'),CATALOGUE.find(i=>i.id==='service-rifle')]);
  a.isOwner=false;const sheet=new FdernActorSheet({actor:a});sheet.isEditable=false;
  const ctx=await sheet._prepareContext({});assert.equal(ctx.editable,false);assert.ok(ctx.universal.every(a=>a.disabled));assert.ok(ctx.skills.every(a=>a.purchaseDisabled));assert.ok(ctx.availableDisciplines.every(a=>a.disabled));
  assert.ok(!ctx.weapons.find(w=>w.type==='gear').actionRows.some(a=>a.id==='aim'));assert.ok(ctx.weapons.find(w=>w.type==='firearm').actionRows.some(a=>a.id==='aim'));
});
test('item action checkboxes validate IDs and allow clearing every action',()=>{
  const sheet=new FdernItemSheet({});const data=sheet._processFormData(null,null,{object:{'actionChoices.fire':true,'actionChoices.reload':false,'actionChoices.fake':true}});assert.deepEqual(data.system.actions,['fire']);assert.equal(data.actionChoices,undefined);
  assert.deepEqual(sheet._processFormData(null,null,{object:{'actionChoices.fire':false}}).system.actions,[]);
});
test('wizard queues snapshots so a slow save cannot replace later point spending',async()=>{
  const a=actor();const wizard=new CharacterWizard({actor:a});const updates=[];a.update=async data=>{await Promise.resolve();updates.push(data);};
  wizard.draft.name='First';const first=wizard.save();wizard.draft.name='Latest';wizard.draft.attributes.agility=2;wizard.step=2;const second=wizard.save();await Promise.all([first,second]);
  assert.equal(updates.length,2);assert.equal(updates[0]['flags.fdern.wizardDraft'].name,'First');assert.equal(updates[1]['flags.fdern.wizardDraft'].name,'Latest');assert.equal(updates[1]['flags.fdern.wizardDraft'].attributes.agility,2);assert.equal(updates[1]['flags.fdern.wizardStep'],2);
});

test('an all-unchecked browser action editor clears the array through its presence marker',()=>{
  const sheet=new FdernItemSheet({});const data=sheet._processFormData(null,null,{object:{actionChoicesPresent:'1'}});assert.deepEqual(data.system.actions,[]);assert.equal(data.actionChoicesPresent,undefined);
});
