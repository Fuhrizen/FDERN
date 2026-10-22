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

test('wizard Loadout and Review show selected item artwork and useful profiles; changed selections refresh previews',async()=>{
  const a=actor(),wizard=new CharacterWizard({actor:a});wizard.draft.secondary='ballistic-shield';
  let ctx=await wizard._prepareContext();
  const rifle=ctx.loadoutSlots.find(slot=>slot.id==='primary');
  assert.equal(rifle.preview.name,'Service rifle');assert.equal(rifle.preview.img,'systems/fdern/assets/icons/rifle.svg');assert.match(rifle.preview.profile,/Effective 150 ft · Max 330 ft · Harm 2 · Load 4/);
  assert.match(ctx.loadoutSlots.find(slot=>slot.id==='armour').preview.profile,/Ballistic 4 · Melee 1/);
  assert.match(ctx.loadoutSlots.find(slot=>slot.id==='secondary').preview.profile,/Absorption 3 · Ballistic protection/);
  let renders=0;const select={focused:false,focus(){this.focused=true;}};wizard.element={querySelector(selector){assert.equal(selector,'select[name="primary"]');return select;}};wizard.render=async()=>{renders++;};
  await CharacterWizard.onForm.call(wizard,{target:{}},null,{object:{primary:'battle-rifle'}});
  assert.equal(renders,1);assert.equal(select.focused,true);assert.equal(a.getFlag('fdern','wizardDraft').primary,'battle-rifle');
  await CharacterWizard.onForm.call(wizard,{target:{}},null,{object:{name:'Operator'}});assert.equal(renders,1);
  ctx=await wizard._prepareContext();assert.equal(ctx.loadoutSlots.find(slot=>slot.id==='primary').preview.name,'Battle rifle');
  wizard.step=5;ctx=await wizard._prepareContext();assert.equal(ctx.loadoutSlots.find(slot=>slot.id==='primary').preview.name,'Battle rifle');assert.equal(ctx.review,true);
});

test('an all-unchecked browser action editor clears the array through its presence marker',()=>{
  const sheet=new FdernItemSheet({});const data=sheet._processFormData(null,null,{object:{actionChoicesPresent:'1'}});assert.deepEqual(data.system.actions,[]);assert.equal(data.actionChoicesPresent,undefined);
});

test('sheet opens on Character and keeps inventory searches separate from skills and journal',async()=>{
  const a=actor();await a.createEmbeddedDocuments('Item',[CATALOGUE.find(i=>i.id==='medical-kit'),CATALOGUE.find(i=>i.id==='service-rifle')]);
  const sheet=new FdernActorSheet({actor:a});sheet._skillQuery='medicine';sheet._inventoryQuery='medical';
  const ctx=await sheet._prepareContext({});assert.equal(ctx.tab,'biography');assert.equal(ctx.skillRows.length,1);assert.equal(ctx.skillRows[0].id,'medicine');assert.equal(ctx.inventoryGroups.flatMap(g=>g.items).length,1);assert.equal(ctx.inventoryGroups[1].items[0].name,'Medical kit');assert.equal(ctx.canManageInventory,true);
});

test('item read mode retains its profile and actions, and observer cannot enter editing mode',async()=>{
  const a=actor();const [item]=await a.createEmbeddedDocuments('Item',[CATALOGUE.find(i=>i.id==='service-rifle')]);const sheet=new FdernItemSheet({item});
  let ctx=await sheet._prepareContext({});assert.equal(ctx.editing,false);assert.ok(ctx.readStats.some(f=>f.key==='harm'));assert.ok(ctx.itemActionRows.some(a=>a.id==='fire'));
  await FdernItemSheet.dispatch.call(sheet,null,{dataset:{command:'edit-mode'}});ctx=await sheet._prepareContext({});assert.equal(ctx.editing,true);
  sheet.isEditable=false;ctx=await sheet._prepareContext({});assert.equal(ctx.editing,false);await FdernItemSheet.dispatch.call(sheet,null,{dataset:{command:'edit-mode'}});assert.equal(sheet._editing,true);
});

test('equipment controls send ownership-checked inventory intents rather than editing documents directly',async()=>{
  const a=actor();const sheet=new FdernActorSheet({actor:a});let request;game.fdern.request=async data=>{request=data;};
  await FdernActorSheet.dispatch.call(sheet,null,{dataset:{command:'quantity',id:'supply',delta:'-1'}});assert.deepEqual(request,{type:'inventory',actor:a.uuid,command:'quantity',item:'supply',delta:-1});
  request=null;sheet.isEditable=false;await FdernActorSheet.dispatch.call(sheet,null,{dataset:{command:'wear',id:'armour'}});assert.equal(request,null);
});

test('inventory inspector exposes guarded item actions and previews the equipment it will replace',async()=>{
  const a=actor();const [rifle,kit]=await a.createEmbeddedDocuments('Item',[CATALOGUE.find(i=>i.id==='service-rifle'),CATALOGUE.find(i=>i.id==='medical-kit')]);
  await rifle.update({'system.readied':true,'system.slot':'primary'});const sheet=new FdernActorSheet({actor:a});sheet._selectedItem=kit.id;
  let ctx=await sheet._prepareContext({});assert.equal(ctx.selectedInventory.readyRow.swapNames,rifle.name);assert.ok(ctx.selectedInventory.itemActions.some(row=>row.id==='field-dressing'&&row.disabled&&/Equip/.test(row.reason)));
  await rifle.update({'system.readied':false});await kit.update({'system.readied':true});ctx=await sheet._prepareContext({});assert.ok(ctx.selectedInventory.itemActions.some(row=>row.id==='field-dressing'));assert.equal(ctx.selectedInventory.readyRow.swapNames,'');
  sheet.isEditable=false;ctx=await sheet._prepareContext({});assert.ok(ctx.selectedInventory.itemActions.every(row=>row.disabled));
});

test('equipped filter includes worn armour, hides packed items, and search clearing preserves other queries',async()=>{
  const a=actor();const [rifle,kit,vest]=await a.createEmbeddedDocuments('Item',[CATALOGUE.find(i=>i.id==='service-rifle'),CATALOGUE.find(i=>i.id==='medical-kit'),CATALOGUE.find(i=>i.id==='plate-carrier')]);await rifle.update({'system.readied':true});await vest.update({'system.worn':true});
  const sheet=new FdernActorSheet({actor:a});sheet._equippedOnly=true;sheet._skillQuery='medicine';sheet._search='journal';sheet._inventoryQuery='rifle';sheet.render=()=>{};
  let ctx=await sheet._prepareContext({});assert.deepEqual(ctx.inventoryGrid.map(row=>row.id),[rifle.id]);
  await FdernActorSheet.dispatch.call(sheet,null,{dataset:{command:'clear-search',search:'inventory'}});ctx=await sheet._prepareContext({});assert.deepEqual(ctx.inventoryGrid.map(row=>row.id),[rifle.id,vest.id]);assert.equal(sheet._skillQuery,'medicine');assert.equal(sheet._search,'journal');assert.equal(sheet._equippedOnly,true);
  await FdernActorSheet.dispatch.call(sheet,null,{dataset:{command:'equipped-filter'}});ctx=await sheet._prepareContext({});assert.ok(ctx.inventoryGrid.some(row=>row.id===kit.id));
});

test('item artwork reaches inventory and item sheets while custom pictures and actor defaults remain intact',async()=>{
  const a=actor();a.img='icons/svg/mystery-man.svg';const [rifle,kit]=await a.createEmbeddedDocuments('Item',[{...CATALOGUE.find(i=>i.id==='service-rifle'),img:'systems/fdern/assets/fdern.svg'},{...CATALOGUE.find(i=>i.id==='medical-kit'),img:'worlds/campaign/custom-kit.webp'}]);
  const sheet=new FdernActorSheet({actor:a});let ctx=await sheet._prepareContext({});assert.equal(ctx.actor.img,'icons/svg/mystery-man.svg');assert.equal(ctx.inventoryGrid.find(row=>row.id===rifle.id).img,'systems/fdern/assets/icons/rifle.svg');assert.equal(ctx.inventoryGrid.find(row=>row.id===kit.id).img,'worlds/campaign/custom-kit.webp');assert.equal(rifle.img,'systems/fdern/assets/fdern.svg');
  ctx=await new FdernItemSheet({item:rifle})._prepareContext({});assert.equal(ctx.item.img,'systems/fdern/assets/icons/rifle.svg');ctx=await new FdernItemSheet({item:kit})._prepareContext({});assert.equal(ctx.item.img,'worlds/campaign/custom-kit.webp');
});
