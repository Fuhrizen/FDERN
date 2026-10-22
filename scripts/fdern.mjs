import {STATUS_EFFECTS} from './status-config.mjs';
import {itemArtwork} from './artwork.mjs';
import {postItem,shareEquipment} from './chat.mjs';
import {syncConditions} from './conditions.mjs';
import {CharacterData,EquipmentData,FdernActor,FdernItem} from './models.mjs';
import {FdernActorSheet,FdernItemSheet} from './sheets.mjs';
import {CharacterWizard} from './wizard.mjs';
import {EncounterManager} from './encounter.mjs';
import {FdernCombat} from './combat.mjs';
import {registerSocket,serial} from './socket.mjs';
import {execute} from './service.mjs';
import {registerMovement,interruptMovement} from './movement.mjs';
import {terrainEditor,distanceBetween} from './terrain.mjs';
import {pickPoint,resolveHazards,expireAreas} from './areas.mjs';
import {undoDamage} from './damage.mjs';
import {attack} from './attacks.mjs';
import {guard,readied,controllerInput,combatantFor,bindChatActions} from './utils.mjs';
import {UNIVERSAL,ICON} from './config.mjs';
Hooks.once('init',()=>{
  CONFIG.Actor.documentClass=FdernActor;CONFIG.Item.documentClass=FdernItem;CONFIG.Combat.documentClass=FdernCombat;
  CONFIG.Actor.dataModels={character:CharacterData,npc:CharacterData};CONFIG.Item.dataModels=Object.fromEntries(['firearm','melee','shield','armour','magazine','grenade','launcher','gear','discipline','action'].map(k=>[k,EquipmentData]));
  CONFIG.ActiveEffect.legacyTransferral=false;CONFIG.ActiveEffect.phases={initial:{priority:0,label:'Initial'},final:{priority:100,label:'Final'}};
  foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Actor,'fdern',FdernActorSheet,{types:['character','npc'],makeDefault:true,label:'FDERN Character'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item,'fdern',FdernItemSheet,{makeDefault:true,label:'FDERN Item'});
  CONFIG.statusEffects=STATUS_EFFECTS.map(status=>({...status}));
  game.settings.register('fdern','enforceMovement',{name:'Enforce paid movement',hint:'Movement in combat requires a paid Move, Disengage, or reaction allowance. GM correction macros can bypass this.',scope:'world',config:true,type:Boolean,default:true});
  game.settings.register('fdern','schemaVersion',{scope:'world',config:false,type:String,default:'0.1.0'});
  game.fdern={postItem,shareEquipment,CharacterWizard,EncounterManager,terrainEditor,distanceBetween,resolveHazards,expireAreas,interruptMovement,pickPoint,selectedActor(){const actor=canvas.tokens.controlled[0]?.actor??game.user.character;if(!actor)throw Error('Select an owned token or assign a character.');return actor;}};
});
Hooks.once('ready',()=>{
  game.fdern.request=registerSocket(execute);game.fdern.encounter=new EncounterManager();
  const pendingActors=new Set();
  game.fdern.act=async(actor,id,item=null,options={})=>{
    if(!actor)actor=game.fdern.selectedActor();if(typeof item==='string')item=actor.items.get(item);const target=options.target?.document??options.target??game.user.targets.first()?.document;
    if(!item&&!UNIVERSAL.includes(id)&&!['strike','grapple','shove','disarm','takedown'].includes(id))item=readied(actor).find(i=>i.system.actions.includes(id))??actor.items.find(i=>i.system.actions.includes(id));
    if(id==='aim'&&!item)item=readied(actor).find(i=>i.type==='firearm');
    const point=['throw','launch'].includes(id)?options.point??await pickPoint():undefined;if(['throw','launch'].includes(id)&&!point)return;
    if(pendingActors.has(actor.uuid))throw Error('This character already has an action awaiting resolution.');pendingActors.add(actor.uuid);try{return await game.fdern.request({type:'act',actor:actor.uuid,action:id,item:item?.id,target:target?.uuid,point});}finally{pendingActors.delete(actor.uuid);}
  };
  game.fdern.opportunity=async(actor,target)=>{if(!game.user.isGM)throw Error('The GM resolves opportunity strikes.');const c=actor.system.combat;if(!c.reactionAvailable||c.overwatch.active||c.wounds>=3)return;const choice=await controllerInput(actor,'Opportunity Strike','<p>Spend your Reaction on one immediate melee Strike?</p><select name="response"><option value="no">No</option><option value="yes">Strike</option></select>');if(choice?.response!=='yes')return;await actor.update({'system.combat.reactionAvailable':false});return attack(actor,'strike',readied(actor).find(i=>i.type==='melee'),target,{reaction:true});};
  registerMovement();
  if(game.users.activeGM?.id===game.user.id)for(const actor of game.actors)guard(()=>syncConditions(actor))();
});
function refresh(){game.fdern?.encounter?.rendered&&game.fdern.encounter.render();}
function refreshItemSheets(actor){for(const sheet of FdernItemSheet.instances())if(sheet.rendered&&sheet.item?.actor&&(!actor||sheet.item.actor.uuid===actor.uuid))sheet.render();}
function refreshActorSheets(){for(const sheet of FdernActorSheet.instances())if(sheet.rendered)sheet.render();refreshItemSheets();}
for(const hook of ['updateCombat','createCombatant','deleteCombatant','updateCombatant','deleteCombat'])Hooks.on(hook,refreshActorSheets);
Hooks.on('canvasReady',()=>{if(game.users.activeGM?.id===game.user.id)for(const token of canvas.tokens.placeables)if(token.actor)guard(()=>syncConditions(token.actor))();});
for(const hook of ['updateCombat','createCombatant','deleteCombatant','updateCombatant','updateItem','createItem','deleteItem'])Hooks.on(hook,refresh);
for(const hook of ['updateItem','createItem','deleteItem'])Hooks.on(hook,item=>{if(item.actor)refreshItemSheets(item.actor);});
Hooks.on('updateActor',async actor=>{refresh();refreshItemSheets(actor);if(game.users.activeGM?.id!==game.user.id)return;await syncConditions(actor);});
Hooks.on('renderCombatTracker',(app,html)=>{if(html.querySelector('[data-fdern-encounter]'))return;const button=document.createElement('button');button.type='button';button.dataset.fdernEncounter='';button.innerHTML='<i class="fas fa-dice"></i> FDERN Encounter';button.addEventListener('click',()=>game.fdern.encounter.render({force:true}));html.prepend(button);});
Hooks.on('getSceneControlButtons',controls=>{if(!game.user.isGM)return;const region=controls.regions;if(region)region.tools.fdernTerrain={name:'fdernTerrain',title:'FDERN: Cover & Difficult Terrain',icon:'fas fa-shield-halved',button:true,onChange:guard(()=>terrainEditor())};});
Hooks.on('renderChatMessageHTML',(message,html)=>{const command=message.getFlag('fdern','command');if(command){html.hidden=true;return;}bindChatActions(html);const button=html.querySelector('[data-fdern-undo]');if(button){button.hidden=!game.user.isGM;button.addEventListener('click',guard(()=>undoDamage(message)));}});
Hooks.on('hotbarDrop',(bar,data,slot)=>{if(data.type!=='Item')return;guard(async()=>{const item=await fromUuid(data.uuid);if(!item?.actor)return;const command=`const item = await fromUuid(${JSON.stringify(item.uuid)}); if (!item?.actor) return ui.notifications.warn("Item no longer exists."); await game.fdern.act(item.actor, ${JSON.stringify(item.system.actions[0]??'ready')}, item);`;let macro=game.macros.find(m=>m.command===command);if(!macro)macro=await foundry.documents.Macro.create({name:item.name,type:'script',img:itemArtwork(item),command});await game.user.assignHotbarMacro(macro,slot);})();return false;});
