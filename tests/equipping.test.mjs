import test from 'node:test';import assert from 'node:assert/strict';
import {setup,token,combatant} from './harness.mjs';
const {player}=setup();
const {CharacterData,EquipmentData,FdernActor}=await import('../scripts/models.mjs');
const {FdernCombat}=await import('../scripts/combat.mjs');
const {execute}=await import('../scripts/service.mjs');
const {actionReason,ready}=await import('../scripts/equipment.mjs');
const {equipmentMode,equipmentCost,equippable,equippedItems,loadoutValid,equipPreview}=await import('../scripts/equipping.mjs');
CONFIG.Item.dataModels=Object.fromEntries(['firearm','melee','shield','armour','magazine','grenade','launcher','gear','discipline','action'].map(type=>[type,EquipmentData]));
function actor(){const a=new FdernActor({name:'Operator',type:'character',owner:'player'});a.system=new CharacterData({}, {parent:a});a.system.prepareDerivedData();token(a);return a;}
async function encounter(a){const c=new FdernCombat(),cc=combatant(a,'A');c.combatants.set(cc.id,cc);game.combat=c;game.combats.set(c.id,c);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(cc.id);return c;}
async function create(a,type,name,system={}){const [item]=await a.createEmbeddedDocuments('Item',[{name,type,system}]);return item;}

test('equipment mode defaults knives and grenades offhand; overrides, costs and eligibility are explicit',async()=>{
  const a=actor(),knife=await create(a,'melee','Knife',{family:'knife'}),grenade=await create(a,'grenade','Frag',{quantity:1}),rifle=await create(a,'firearm','Rifle'),tool=await create(a,'gear','Tool',{equipmentMode:'offhand'}),armour=await create(a,'armour','Vest'),magazine=await create(a,'magazine','Magazine');
  assert.equal(equipmentMode(knife),'offhand');assert.equal(equipmentMode(grenade),'offhand');assert.equal(equipmentMode(rifle),'main');assert.equal(equipmentMode(tool),'offhand');assert.equal(equipmentCost(knife),1);assert.equal(equipmentCost(rifle),2);assert.equal(equippable(tool),true);assert.equal(equippable(armour),false);assert.equal(equippable(magazine),false);assert.equal(loadoutValid(a),true);assert.deepEqual(equippedItems(a),[]);
});

test('Ready automatically stows incompatible items and enforces the two-point main/offhand loadout',async()=>{
  const a=actor();const main=await create(a,'firearm','Rifle',{slot:'primary',readied:true});const knife=await create(a,'melee','Knife',{family:'knife',slot:'secondary',readied:true});const frag=await create(a,'grenade','Frag',{quantity:1,slot:'tertiary'});const secondFrag=await create(a,'grenade','Second Frag',{quantity:1});
  assert.equal(loadoutValid(a),false);
  await ready(a,frag,{pay:false});assert.equal(main.system.readied,false);assert.equal(knife.system.readied,true);assert.equal(frag.system.readied,true);assert.equal(loadoutValid(a),true);
  await ready(a,secondFrag,{pay:false});assert.equal(knife.system.readied,true);assert.equal(frag.system.readied,false);assert.equal(secondFrag.system.readied,true);assert.equal(loadoutValid(a),true);
  await ready(a,main,{pay:false});assert.equal(main.system.readied,true);assert.equal(knife.system.readied,false);assert.equal(secondFrag.system.readied,false);assert.equal(loadoutValid(a),true);
});

test('equipPreview returns the exact documents that Ready will stow',async()=>{
  const a=actor(),main=await create(a,'firearm','Rifle',{slot:'primary',readied:true}),knife=await create(a,'melee','Knife',{family:'knife',slot:'secondary',readied:true}),frag=await create(a,'grenade','Frag',{quantity:1});
  const preview=equipPreview(a,frag);
  assert.deepEqual(preview,{stowed:[main],blocked:''});
  await ready(a,frag,{pay:false});
  assert.equal(main.system.readied,false);assert.equal(knife.system.readied,true);assert.equal(frag.system.readied,true);
  assert.deepEqual(equipPreview(a,knife),{stowed:[],blocked:''});
  await ready(a,knife,{pay:false});assert.equal(knife.system.readied,false);assert.equal(frag.system.readied,true);
});

test('equipPreview explains blocked Ready states without changing the loadout',async()=>{
  const a=actor(),vest=await create(a,'armour','Vest'),broken=await create(a,'gear','Broken Tool',{broken:true}),empty=await create(a,'grenade','Empty Frag',{quantity:0}),inaccessible=await create(a,'firearm','Packed Rifle'),main=await create(a,'firearm','Deployed Rifle',{slot:'primary',readied:true,deployed:true}),knife=await create(a,'melee','Knife',{family:'knife',slot:'secondary'});
  assert.match(equipPreview(a,vest).blocked,/cannot be equipped/);
  assert.match(equipPreview(a,broken).blocked,/broken/i);
  assert.match(equipPreview(a,empty).blocked,/No grenade remains/);
  assert.match(equipPreview(a,inaccessible).blocked,/accessible loadout slot/);
  assert.match(equipPreview(a,knife).blocked,/Pickup the deployed weapon/);
  assert.equal(main.system.readied,true);assert.equal(knife.system.readied,false);
  assert.match(equipPreview(a,main).blocked,/Pickup the deployed weapon/);
});

test('deployed equipment blocks a Ready swap before Action spending or state changes',async()=>{
  const a=actor(),main=await create(a,'firearm','Deployed Rifle',{slot:'primary',readied:true,deployed:true}),knife=await create(a,'melee','Knife',{family:'knife',slot:'secondary'});const c=await encounter(a);
  await assert.rejects(execute({type:'act',actor:a.uuid,action:'ready',item:knife.id},player),/Pickup the deployed weapon/);assert.equal(a.system.combat.actionsRemaining,3);assert.equal(main.system.readied,true);assert.equal(knife.system.readied,false);
});

test('item actions require an equipped item, including Aim, Quick, Reload, medical care and Throw',async()=>{
  const a=actor();const cases=[
    [await create(a,'firearm','Pistol',{family:'pistol',slot:'primary',actions:['quick','fire','reload']}),'quick'],
    [await create(a,'firearm','Rifle',{slot:'secondary',actions:['reload']}),'reload'],
    [await create(a,'firearm','Aim Pistol',{slot:'tertiary',actions:['fire']}),'aim'],
    [await create(a,'gear','Medical Kit',{actions:['field-dressing']}),'field-dressing'],
    [await create(a,'grenade','Frag',{quantity:1,actions:['throw']}),'throw']
  ];
  for(const [item,id] of cases)assert.match(actionReason(a,id,item),/Equip this item first/);
  const empty=await create(a,'grenade','Empty Frag',{quantity:0,actions:['throw']});assert.match(actionReason(a,'throw',empty),/No grenade remains/);
});

test('using the final grenade consumes quantity and stows the empty item',async()=>{
  const a=actor(),grenade=await create(a,'grenade','Frag',{payload:'fragmentation',radius:10,quantity:1,readied:true,equipmentMode:'offhand',actions:['throw']});
  canvas.scene.createEmbeddedDocuments=async(_type,docs)=>docs.map((doc,index)=>({id:`created-${index}`,...doc}));
  await execute({type:'act',actor:a.uuid,action:'throw',item:grenade.id,point:{x:50,y:50,elevation:0,level:null}},player);
  assert.equal(grenade.system.quantity,0);assert.equal(grenade.system.readied,false);assert.equal(actionReason(a,'throw',grenade),'No grenade remains.');assert.deepEqual(equippedItems(a),[]);
});
