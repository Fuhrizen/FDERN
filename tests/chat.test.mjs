import test from 'node:test';import assert from 'node:assert/strict';
import {setup,messages,dialogResponses} from './harness.mjs';
const {player}=setup();game.user=player;
const {CharacterData,EquipmentData,FdernActor}=await import('../scripts/models.mjs');
const {chat,bindChatActions,dispatchChatAction,rollTest}=await import('../scripts/utils.mjs');
const {postItem,shareEquipment}=await import('../scripts/chat.mjs');
CONFIG.Item.dataModels={firearm:EquipmentData,gear:EquipmentData,armour:EquipmentData,launcher:EquipmentData,magazine:EquipmentData,grenade:EquipmentData};
function actor(){const a=new FdernActor({name:'<Operator>',type:'character',owner:'player'});a.system=new CharacterData({attributes:{agility:2},skills:{marksmanship:1}} ,{parent:a});a.system.prepareDerivedData();return a;}

test('chat cards retain native article layout and escape context controls',async()=>{
  const a=actor();const [rifle]=await a.createEmbeddedDocuments('Item',[{name:'<Rifle>',type:'firearm',system:{slot:'primary',readied:false,broken:false,actions:['reload']}}]);
  await chat(a,'<Attack>','<p>Roll details</p>',[],{},[{type:'act',command:'ready',item:rifle.id,label:'Ready <Rifle>'}]);
  const content=messages.at(-1).content;assert.match(content,/<article class="fdern chat-card themed theme-light">/);assert.match(content,/<div class="fdern-chat-content">/);assert.match(content,/&lt;Attack&gt;/);assert.match(content,/data-fdern-chat-action="open-actor"/);assert.match(content,/data-command="ready"/);assert.match(content,/Ready &lt;Rifle&gt;/);assert.doesNotMatch(content,/data-command="reload"/);
  await chat(a,'Attack result','<p>Result</p>',[],{},[{type:'open-item',item:rifle.id,label:'Details'},{type:'act',command:'reload',item:rifle.id,label:'Reload'}]);assert.match(messages.at(-1).content,/data-command="reload"/);
});

test('chat action binding is idempotent and routes owner actions through FDERN API',async()=>{
  const a=actor();const [rifle]=await a.createEmbeddedDocuments('Item',[{name:'Rifle',type:'firearm',system:{slot:'primary',actions:['reload']}}]);let callback,count=0;
  const button={dataset:{fdernChatAction:'act',actor:a.uuid,item:rifle.id,command:'ready'},addEventListener(_type,fn){count++;callback=fn;}};
  bindChatActions({querySelectorAll:()=>[button]});bindChatActions({querySelectorAll:()=>[button]});assert.equal(count,1);
  const next={dataset:{fdernChatAction:'open-actor',actor:a.uuid},addEventListener(){count++;}};bindChatActions({querySelectorAll:()=>[button,next]});assert.equal(count,2);
  let received;game.fdern.act=async(...args)=>{received=args;};await callback();assert.deepEqual(received,[a,'ready',rifle]);
});

test('chat action dispatcher enforces Actor ownership and rejects forged commands',async()=>{
  const a=actor();const [rifle]=await a.createEmbeddedDocuments('Item',[{name:'Rifle',type:'firearm',system:{slot:'primary'}}]);
  await assert.rejects(dispatchChatAction({dataset:{fdernChatAction:'act',actor:a.uuid,item:rifle.id,command:'damage'}}),/not available/);
  await assert.rejects(dispatchChatAction({dataset:{fdernChatAction:'act',actor:a.uuid,item:rifle.id,command:'__proto__'}}),/not available/);
  await assert.rejects(dispatchChatAction({dataset:{fdernChatAction:'unknown',actor:'invalid'}}),/Unknown chat action/);
  game.user={id:'outsider',isGM:false};await assert.rejects(dispatchChatAction({dataset:{fdernChatAction:'act',actor:a.uuid,item:rifle.id,command:'ready'}}),/do not own/);game.user=player;
});

test('Roll Test chat follow-up is context-bound to a valid owned skill',async()=>{
  const a=actor();const result=await rollTest(a,'agility','marksmanship',9,0,'Marksmanship');assert.equal(result.total,9);const card=messages.at(-1).content;assert.match(card,/data-fdern-chat-action="test"/);assert.match(card,/data-skill="marksmanship"/);
  assert.match(messages.at(-1).content,/Agility \+ Marksmanship/);assert.match(messages.at(-1).content,/Roll Marksmanship/);
  const testButton={dataset:{fdernChatAction:'test',actor:a.uuid,attribute:'agility',skill:'marksmanship',dc:'9',modifier:'0'}};assert.equal((await dispatchChatAction(testButton)).total,9);assert.match(messages.at(-1).content,/Roll Marksmanship/);
  await assert.rejects(dispatchChatAction({dataset:{fdernChatAction:'test',actor:a.uuid,attribute:'bogus',skill:'marksmanship',dc:'9',modifier:'0'}}),/no longer valid/);
});

test('Open Character and Item follow-ups open the native document sheets',async()=>{
  const a=actor();const [rifle]=await a.createEmbeddedDocuments('Item',[{name:'Rifle',type:'firearm',system:{}}]);let opened; a.sheet={render:options=>{opened=options;}};rifle.sheet={render:options=>{opened=options;}};
  await dispatchChatAction({dataset:{fdernChatAction:'open-actor',actor:a.uuid}});assert.deepEqual(opened,{force:true});
  await dispatchChatAction({dataset:{fdernChatAction:'open-item',actor:a.uuid,item:rifle.id}});assert.deepEqual(opened,{force:true});
});

test('postItem shares a safe concise profile with item-bound actions and validates ownership',async()=>{
  const a=actor();const [source]=await a.createEmbeddedDocuments('Item',[{name:'Source',type:'magazine',system:{currentLoad:2,maxLoad:4}}]);const [rifle]=await a.createEmbeddedDocuments('Item',[{name:'<Service Rifle>',img:'icons/rifle.webp',type:'firearm',system:{description:'<script>unsafe</script> Base. Actions: fire, reload. Training prerequisites are checked when used.',slot:'primary',readied:false,accuracy:1,harm:3,penetration:1,effective:100,maximum:300,currentLoad:0,maxLoad:4,magazineId:source.id,reloadCost:2,actions:['fire','reload']}}]);
  await postItem(a,rifle);const content=messages.at(-1).content;assert.match(content,/class="item-card-profile"/);assert.match(content,/class="fdern-chat-breakdown"/);assert.match(content,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert.doesNotMatch(content,/<script>|Actions: fire/);assert.match(content,/data-command="ready"/);assert.match(content,/Equip · Main hand/);assert.match(content,/data-command="reload"/);assert.match(content,/Reload · 2 A/);assert.match(content,/Fire · 1 A · 1 Load/);assert.match(content,/Load<\/dt><dd>2 \/ 4/);
  const [launcher]=await a.createEmbeddedDocuments('Item',[{name:'Launcher',type:'launcher',system:{img:'systems/fdern/assets/fdern.svg',fireCost:2,reloadCost:2,maximum:200,effective:75,actions:['launch','reload'],magazineId:source.id}}]);await postItem(a,launcher);assert.match(messages.at(-1).content,/Launch · 2 A · 1 Load/);assert.match(messages.at(-1).content,/Reload · 2 A/);assert.match(messages.at(-1).content,/systems\/fdern\/assets\/icons\/launcher.svg/);
  const [armour,gear]=await a.createEmbeddedDocuments('Item',[{name:'Armour',type:'armour',system:{ballistic:1,meleeArmour:1}},{name:'Gear',type:'gear',system:{quantity:2}}]);await postItem(a,armour);assert.doesNotMatch(messages.at(-1).content,/\bLoad<\/dt>/);await postItem(a,gear);assert.match(messages.at(-1).content,/Quantity<\/dt><dd>2/);assert.doesNotMatch(messages.at(-1).content,/\bLoad<\/dt>/);
  assert.match(messages.at(-1).content,/Equip/);assert.match(messages.at(-1).content,/data-command="ready"/);
  const [grenade,unassigned]=await a.createEmbeddedDocuments('Item',[{name:'Grenade',type:'grenade',system:{quantity:1}},{name:'Unassigned firearm',type:'firearm',system:{slot:'',readied:false}}]);await postItem(a,grenade);assert.match(messages.at(-1).content,/Equip/);await postItem(a,unassigned);assert.doesNotMatch(messages.at(-1).content,/data-command="ready"/);
  game.user={id:'observer',isGM:false};await assert.rejects(postItem(a,rifle),/do not own/);game.user=player;
});

test('share equipment utility posts only the selected owned item and supports cancellation',async()=>{
  const a=actor();const [first,second]=await a.createEmbeddedDocuments('Item',[{name:'First',type:'gear',system:{}},{name:'Second',type:'gear',system:{}}]);
  dialogResponses.push({choice:second.id});await shareEquipment(a);assert.match(messages.at(-1).content,/<header><strong>Second<\/strong>/);assert.doesNotMatch(messages.at(-1).content,/<header><strong>First<\/strong>/);
  const count=messages.length;dialogResponses.push(null);await shareEquipment(a);assert.equal(messages.length,count);
});
