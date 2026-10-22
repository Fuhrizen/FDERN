import test from 'node:test';import assert from 'node:assert/strict';
import {setup,token,combatant,dialogResponses,diceResults,messages} from './harness.mjs';
const {gm,player}=setup();
const {CharacterData,EquipmentData,FdernActor}=await import('../scripts/models.mjs');
const {FdernCombat}=await import('../scripts/combat.mjs');
const {execute}=await import('../scripts/service.mjs');
const {actionReason,reload,advance,ready}=await import('../scripts/equipment.mjs');
const {attack}=await import('../scripts/attacks.mjs');
const {areaAttack}=await import('../scripts/areas.mjs');
const {FdernItemSheet}=await import('../scripts/sheets.mjs');
const {CATALOGUE}=await import('../scripts/catalogue.mjs');
CONFIG.Item.dataModels=Object.fromEntries(['firearm','melee','shield','armour','magazine','grenade','launcher','gear','discipline','action'].map(k=>[k,EquipmentData]));
function actor(name='Operator',data={}){const a=new FdernActor({name,type:'character',owner:'player'});a.system=new CharacterData(data,{parent:a});a.system.prepareDerivedData();token(a);return a;}
function encounter(actors){const c=new FdernCombat();actors.forEach((a,i)=>{const cc=combatant(a,i%2?'B':'A');cc.initiative=1000-i;c.combatants.set(cc.id,cc)});game.combat=c;game.combats.set(c.id,c);game.fdern.resolveHazards=async()=>{};game.fdern.expireAreas=async()=>{};game.fdern.encounter={render(){}};return c;}
async function weapon(a,id='service-rifle'){const source=CATALOGUE.find(i=>i.id===id);const [w]=await a.createEmbeddedDocuments('Item',[{...source,system:{...source.system,readied:true,slot:'primary'}}]);const [m]=await a.createEmbeddedDocuments('Item',[{name:'Source A',type:'magazine',system:{cartridge:w.system.cartridge,compatibility:w.system.compatibility,currentLoad:4,maxLoad:4}}]);await w.update({'system.magazineId':m.id});return w;}
const geometry=(extra={})=>({distance:5,cover:0,...extra});
function clear(){dialogResponses.length=0;diceResults.length=0;messages.length=0;game.combat=null;canvas.tokens.placeables=[];canvas.scene.regions=[];}
test('native Combat: weighted side activation, fixed allowance, and reserved Reaction across rounds',async()=>{clear();const a=actor(),b=actor('Opponent',{combat:{pressure:5,wounds:2}});const c=encounter([a,b]);await c.startCombat();const aid=c.combatants.first().id;await c.setFlag('fdern','drawnSide','A');await c.activate(aid);assert.equal(c.combatant.actor,a);assert.equal(a.system.combat.actionsRemaining,3);await c.endActivation();assert.equal(c.makeBag().length,1);await c.setFlag('fdern','drawnSide','B');await c.activate(c.combatants.contents[1].id);assert.equal(b.system.combat.actionsRemaining,2);await b.update({'system.combat.pressure':0,'system.combat.wounds':0});assert.equal(b.system.combat.actionsRemaining,2);await c.endActivation();await a.update({'system.combat.overwatch':{active:true,weapon:'x',lane:'door',kind:'overwatch'},'system.combat.reactionAvailable':false});await c.nextRound();assert.equal(c.round,2);assert.equal(a.system.combat.reactionAvailable,false);await c.setFlag('fdern','drawnSide','A');await c.activate(aid);assert.equal(a.system.combat.overwatch.active,false);assert.equal(a.system.combat.reactionAvailable,true);});
test('Down before activation removes token and starts lethal clock once',async()=>{clear();const a=actor(),b=actor('B');const c=encounter([a,b]);await c.startCombat();await b.update({'system.combat.wounds':3});assert.equal(c.makeBag().length,1);assert.equal(b.system.combat.downCount,1);assert.equal(b.system.combat.bleeding,true);assert.equal(b.system.combat.reactionAvailable,false);await b.update({'system.combat.pressure':1});assert.equal(b.system.combat.downCount,1);});
test('partial compatible source preserved while a two-Action reload spans activations',async()=>{clear();const a=actor();const w=await weapon(a,'light-mg');const old=a.items.get(w.system.magazineId);await old.update({'system.currentLoad':1});const [spare]=await a.createEmbeddedDocuments('Item',[{name:'B',type:'magazine',system:{cartridge:w.system.cartridge,compatibility:w.system.compatibility,currentLoad:2,maxLoad:6}}]);const c=encounter([a]);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);await a.update({'system.combat.actionsRemaining':1});dialogResponses.push({choice:spare.id});await reload(a,w);assert.equal(w.system.reloadProgress,1);assert.equal(w.system.magazineId,old.id);await c.endActivation();await c.nextRound();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);await reload(a,w);assert.equal(w.system.magazineId,spare.id);assert.equal(old.system.currentLoad,1);assert.equal(spare.system.currentLoad,2);assert.equal(w.system.reloadProgress,0);assert.equal(a.system.combat.actionsRemaining,2);});
test('misses spend Actions and Load; three R1 shots accumulate 0, 1, 2',async()=>{clear();const a=actor(),b=actor('B');const w=await weapon(a);const c=encounter([a,b]);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);messages.length=0;for(let n=0;n<3;n++){dialogResponses.push(geometry(),{response:'none'});diceResults.push(2);await attack(a,'fire',w,b.token);assert.equal(a.system.combat.attackPenalty,n+1);}assert.equal(a.system.combat.actionsRemaining,0);assert.equal(a.items.get(w.system.magazineId).system.currentLoad,1);assert.equal(b.system.combat.pressure,0);assert.match(messages[0].content,/accumulated -0/);assert.match(messages[2].content,/accumulated -2/);});
test('Suppress has no defensive response, injury or recoil',async()=>{clear();const a=actor('Gunner',{skills:{marksmanship:2},combat:{attackPenalty:3}}),b=actor('B',{combat:{takeCover:true}});const w=await weapon(a);await a.createEmbeddedDocuments('Item',[{name:'Automatic Fire',type:'discipline',system:{disciplineId:'automatic-fire'}}]);assert.equal(actionReason(a,'suppress',w),'');dialogResponses.push(geometry({cover:1,protected:'on'}));diceResults.push(12);await attack(a,'suppress',w,b.token);assert.equal(b.system.combat.pressure,1);assert.equal(b.system.combat.wounds,0);assert.equal(a.system.combat.attackPenalty,3);assert.equal(a.items.get(w.system.magazineId).system.currentLoad,1);});
test('reaction attack ignores accumulated Recoil and disallows defensive response',async()=>{clear();const a=actor('A',{combat:{attackPenalty:4}}),b=actor('B');const w=await weapon(a);dialogResponses.push(geometry(),{});diceResults.push(12,1);await attack(a,'fire',w,b.token,{reaction:true,modifier:-1});assert.equal(b.system.combat.reactionAvailable,true);assert.equal(a.system.combat.attackPenalty,4);assert.equal(a.items.get(w.system.magazineId).system.currentLoad,3);assert.match(messages[0].content,/accumulated -0/);});
test('patient Dressing preserves bleeding and repeat Down count; Stabilise DC rises',async()=>{clear();const a=actor('Medic',{skills:{medicine:2}}),b=actor('Patient',{combat:{wounds:3,downCount:2,bleeding:true}});const [kit]=await a.createEmbeddedDocuments('Item',[{...CATALOGUE.find(i=>i.id==='medical-kit')}]);diceResults.push(12);await execute({type:'act',actor:a.uuid,action:'field-dressing',item:kit.id,target:b.token.uuid},player);assert.equal(b.system.combat.wounds,2);assert.equal(b.system.combat.bleeding,true);assert.equal(b.system.combat.recoveryPending,true);await execute({type:'recover',actor:b.uuid},gm);assert.equal(b.system.combat.downCount,2);diceResults.push(12);await execute({type:'act',actor:a.uuid,action:'stabilise',item:kit.id,target:b.token.uuid},player);assert.equal(b.system.combat.bleeding,false);assert.match(messages.at(-1).content,/DC 10/);await b.update({'system.combat.dressings':2});await assert.rejects(execute({type:'act',actor:a.uuid,action:'field-dressing',item:kit.id,target:b.token.uuid},player),/limit/);});
test('VP buying preserves lifetime and rejects second lifetime Attribute increase',async()=>{clear();const a=actor('Veteran',{advancement:{lifetimeVP:30,spentVP:7},skills:{marksmanship:2}});await advance(a,{kind:'skill',key:'marksmanship'});assert.equal(a.system.advancement.lifetimeVP,30);assert.equal(a.system.advancement.spentVP,12);assert.equal(a.system.skills.marksmanship,3);await advance(a,{kind:'attribute',key:'agility'});await assert.rejects(advance(a,{kind:'attribute',key:'might'}),/one Attribute/);await assert.rejects(advance(a,{kind:'discipline',key:'support-gunner'}),/prerequisites/);});
test('acting author must own Actor; VP awards require GM',async()=>{clear();const a=actor();await assert.rejects(execute({type:'act',actor:a.uuid,action:'rally'},{id:'outsider',isGM:false}),/do not own/);await assert.rejects(execute({type:'award',actor:a.uuid,vp:5},player),/Only the GM/);await execute({type:'award',actor:a.uuid,vp:3},gm);assert.equal(a.system.advancement.lifetimeVP,3);});
test('native expanded item form canonical arrays',()=>{const sheet=new FdernItemSheet({});const data=sheet._processFormData(null,null,{object:{'system.harm':3,traitText:'assault, automatic',actionText:'fire, invalid, reload'}});assert.deepEqual(data.system.traits,['assault','automatic']);assert.deepEqual(data.system.actions,['fire','reload']);assert.equal(data.traitText,undefined);assert.equal(data.system.harm,3);});
test('data models reject inconsistent Load/VP and define all damage track bounds',()=>{assert.throws(()=>new CharacterData({advancement:{lifetimeVP:2,spentVP:3}}),/Spent VP/);assert.throws(()=>new EquipmentData({currentLoad:5,maxLoad:4}),/capacity/);assert.throws(()=>new EquipmentData({effective:100,maximum:50}),/range/);const fields=CharacterData.defineSchema();assert.equal(fields.combat.fields.pressure.options.max,7);assert.equal(fields.combat.fields.bleedMarks.options.max,3);assert.equal(fields.combat.fields.bleeding.initial(),false);});

test('restarting native Combat resets opening ambush history',async()=>{clear();const a=actor();const c=encounter([a]);await c.startCombat();await c.activate(c.combatants.first().id,{ambush:true});await c.endCombat();await c.setFlag('fdern','ambushCount',3);await c.setFlag('fdern','normalStarted',true);await c.startCombat();assert.equal(c.getFlag('fdern','ambushCount'),0);assert.equal(c.getFlag('fdern','normalStarted'),false);await c.activate(c.combatants.first().id,{ambush:true});assert.equal(a.system.combat.actionsRemaining,2);});

test('failed Ready validation does not spend an Action when a deployed weapon blocks the swap',async()=>{clear();const a=actor();const deployed=await weapon(a,'service-rifle');await deployed.update({'system.deployed':true});const other=await weapon(a,'service-pistol');await other.update({'system.readied':false});const c=encounter([a]);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);await assert.rejects(ready(a,other),/Pickup the deployed weapon/);assert.equal(a.system.combat.actionsRemaining,3);});

test('Cover Ally rejects an opposing combat side even when token dispositions match',async()=>{clear();const user=actor('Shield User',{skills:{melee:2}}),enemy=actor('Enemy');const [shield]=await user.createEmbeddedDocuments('Item',[{name:'Shield',type:'shield',system:{actions:['cover-ally'],readied:true,slot:'secondary',hands:1,traits:['ballistic']}}]);await user.createEmbeddedDocuments('Item',[{name:'Shieldwork',type:'discipline',system:{disciplineId:'shieldwork'}}]);const c=encounter([user,enemy]);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);assert.equal(enemy.token.disposition,user.token.disposition);await assert.rejects(execute({type:'act',actor:user.uuid,action:'cover-ally',item:shield.id,target:enemy.token.uuid},player),/only protect an ally/);assert.equal(user.system.combat.actionsRemaining,3);});

test('Empty launcher validation happens before paying its Actions',async()=>{clear();const a=actor();const c=encounter([a]);await c.startCombat();await c.setFlag('fdern','drawnSide','A');await c.activate(c.combatants.first().id);const launcher={id:'launcher',name:'Launcher',system:{payload:'rocket',maximum:200,effective:75,fireCost:2,currentLoad:0,quantity:0,traits:[],radius:10,duration:2},async update(){throw Error('Should not update an empty launcher.');}};dialogResponses.push({legal:true});await assert.rejects(areaAttack(a,'launch',launcher,{x:100,y:50,elevation:0,level:null}),/Launcher is empty/);assert.equal(a.system.combat.actionsRemaining,3);});

test('inventory wear toggles one armour choice and loadout slots displace and stow safely',async()=>{
  clear();const a=actor('Quartermaster');
  const [vest,coat]=await a.createEmbeddedDocuments('Item',[
    {name:'Vest',type:'armour',system:{worn:true}},
    {name:'Coat',type:'armour',system:{worn:false}}
  ]);
  const [old,newItem,packed]=await a.createEmbeddedDocuments('Item',[
    {name:'Old Rifle',type:'firearm',system:{slot:'primary',readied:true,hands:2}},
    {name:'New Rifle',type:'firearm',system:{slot:'',readied:false,hands:2}},
    {name:'Packed Sidearm',type:'firearm',system:{slot:'secondary',readied:true,hands:1}}
  ]);
  await execute({type:'inventory',actor:a.uuid,command:'wear',item:coat.id},player);
  assert.equal(vest.system.worn,false);assert.equal(coat.system.worn,true);
  await execute({type:'inventory',actor:a.uuid,command:'wear',item:coat.id},player);
  assert.equal(coat.system.worn,false);
  await execute({type:'inventory',actor:a.uuid,command:'slot',item:newItem.id,slot:'primary'},player);
  assert.equal(old.system.slot,'');assert.equal(old.system.readied,false);
  assert.equal(newItem.system.slot,'primary');assert.equal(newItem.system.readied,false);
  await execute({type:'inventory',actor:a.uuid,command:'slot',item:packed.id,slot:''},player);
  assert.equal(packed.system.slot,'');assert.equal(packed.system.readied,false);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'slot',item:vest.id,slot:'primary'},player),/Only accessible equipment/);
});

test('inventory quantities allow one gear/grenade at a time and reject ammo edits',async()=>{
  clear();const a=actor('Quartermaster');
  const [kit,grenade,magazine]=await a.createEmbeddedDocuments('Item',[
    {name:'Medical Kit',type:'gear',system:{quantity:0}},
    {name:'Frag Grenade',type:'grenade',system:{quantity:1}},
    {name:'Magazine',type:'magazine',system:{quantity:1,currentLoad:3,maxLoad:4}}
  ]);
  await execute({type:'inventory',actor:a.uuid,command:'quantity',item:kit.id,delta:1},player);
  assert.equal(kit.system.quantity,1);
  await execute({type:'inventory',actor:a.uuid,command:'quantity',item:grenade.id,delta:-1},player);
  assert.equal(grenade.system.quantity,0);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'quantity',item:grenade.id,delta:-1},player),/cannot be negative/);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'quantity',item:kit.id,delta:2},player),/exactly/);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'quantity',item:magazine.id,delta:-1},player),/magazines use Load/);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'quantity',item:kit.id,delta:1},{id:'outsider',isGM:false}),/do not own/);
  assert.equal(magazine.system.currentLoad,3);assert.equal(kit.system.quantity,1);
});

test('inventory responses are socket-safe plain acknowledgments',async()=>{
  clear();const a=actor('Quartermaster');const [kit]=await a.createEmbeddedDocuments('Item',[{name:'Kit',type:'gear',system:{quantity:1}}]);
  const result=await execute({type:'inventory',actor:a.uuid,command:'quantity',item:kit.id,delta:1},player);
  assert.deepEqual(result,{item:kit.id,command:'quantity'});assert.doesNotThrow(()=>JSON.stringify(result));assert.equal(kit.system.quantity,2);
});

test('inventory locks affect combatants only and block changes to deployed encounter gear',async()=>{
  clear();const a=actor('Quartermaster');const [vest,rifle,kit]=await a.createEmbeddedDocuments('Item',[
    {name:'Vest',type:'armour',system:{}},
    {name:'Rifle',type:'firearm',system:{slot:'',readied:false}},
    {name:'Kit',type:'gear',system:{quantity:1}}
  ]);const opponent=actor('Opponent');const c=encounter([a,opponent]);await c.startCombat();
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'wear',item:vest.id},player),/Finish the encounter/);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'slot',item:rifle.id,slot:'primary'},player),/Finish the encounter/);
  await assert.rejects(execute({type:'inventory',actor:a.uuid,command:'quantity',item:kit.id,delta:1},player),/Finish the encounter/);
  assert.equal(vest.system.worn,false);assert.equal(rifle.system.slot,'');assert.equal(kit.system.quantity,1);
  const offscreen=actor('Offscreen Quartermaster');const [offscreenKit]=await offscreen.createEmbeddedDocuments('Item',[{name:'Kit',type:'gear',system:{quantity:1}}]);
  const result=await execute({type:'inventory',actor:offscreen.uuid,command:'quantity',item:offscreenKit.id,delta:1},player);
  assert.deepEqual(result,{item:offscreenKit.id,command:'quantity'});assert.equal(offscreenKit.system.quantity,2);
  game.combat=null;
});
