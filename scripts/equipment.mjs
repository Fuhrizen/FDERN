import {ACTIONS,UNIVERSAL,UNARMED,SKILLS,DISCIPLINES} from './config.mjs';
import {burstDiscipline,qualifies,repack,advancementCost} from './rules.mjs';
import {learned,readied,has,isActive,combatantFor,choose,chat,escapeHTML} from './utils.mjs';
import {sortedInventoryItems} from './inventory-view.mjs';
import {equipmentCost,equippable,equippedItems,loadoutValid} from './equipping.mjs';
export const ammoFor = (actor,item) => item?.system.magazineId?actor.items.get(item.system.magazineId):item;
export function actionReason(actor,id,item,{reaction=false}={}) {
  const a=ACTIONS[id];if(!a)return 'Unknown action.';const c=actor.system.combat,s=item?.system;
  if(c.dead||c.wounds>=3||c.recoveryPending)return 'Unable to act.';
  const cost=id==='reload'?1:id==='launch'?s?.fireCost??a.cost:a.cost;
  if(game.combat?.started&&combatantFor(actor)&&!reaction){if(!isActive(actor))return 'Await this character’s activation.';if(c.actionsRemaining<cost)return 'Not enough Actions.';}
  if(!UNIVERSAL.includes(id)&&!(!item&&UNARMED.includes(id))&&(!s?.actions?.includes(id)))return 'The item does not supply this action.';
  const itemAction=item&&(!UNIVERSAL.includes(id)||id==='aim')&&id!=='ready';
  if(s?.broken)return 'Item is broken.';if(itemAction&&!s.readied)return 'Equip this item first.';
  if(itemAction&&s.readied&&!loadoutValid(actor))return 'Resolve the equipped loadout before using equipment.';
  if(item?.type==='grenade'&&(s.quantity??0)<=0)return 'No grenade remains.';
  if(s?.traits.includes('static')&&!s.deployed&&['fire','burst','suppress','sustained','overwatch'].includes(id))return 'Deploy the static weapon first.';
  const skill=a.kind==='medical'?'medicine':id==='patch'?'engineering':s&&['melee','shield'].includes(item.type)||!item&&UNARMED.includes(id)?'melee':'marksmanship';
  if(a.rank&&(actor.system.skills[skill]??0)<a.rank)return `${SKILLS[skill]} ${a.rank} required.`;
  const disciplines=learned(actor);if(a.discipline&&!disciplines.includes(a.discipline))return `Learn ${DISCIPLINES[a.discipline]?.name??'the required Discipline'} first.`;
  if(id==='burst'&&!disciplines.includes(burstDiscipline(s.family)))return `Learn ${DISCIPLINES[burstDiscipline(s.family)]?.name??'the required Burst Discipline'} first.`;
  if(id==='lunge'&&!disciplines.some(d=>['bladework','polearm-training'].includes(d)))return 'Bladework or Polearm Training required.';
  if(['burst','suppress'].includes(id)&&!has(item,'automatic'))return 'Automatic weapon required.';
  if(id==='sustained'&&(!has(item,'support')||!s.deployed))return 'Deploy a Support weapon first.';
  if(id==='precision'&&(!has(item,'optic')||c.aimTarget===''||c.aimWeapon!==item.id))return 'Aim with a qualifying optic first.';
  if(id==='quick'&&(!['pistol','machine-pistol'].includes(s.family)||c.attacks>0))return 'Quick Presentation requires an equipped pistol and the first Attack.';
  if(id==='cycle'&&!has(item,'manual'))return 'Manual weapon required.';
  if(['fire','burst','precision','quick','close-blast','sustained'].includes(id)&&has(item,'manual')&&!s.cycled)return 'Cycle the weapon first.';
  if(a.load&&s?.magazineId){const source=actor.items.get(s.magazineId);if(!source||source.type!=='magazine'||source.system.cartridge!==s.cartridge||source.system.compatibility!==s.compatibility)return 'Installed source is incompatible.';if(actor.items.some(i=>i.id!==item.id&&i.system.magazineId===source.id))return 'This source is already installed in another weapon.';}
  if(a.load&&(ammoFor(actor,item)?.system.currentLoad??0)<a.load)return `Requires ${a.load} Load in the installed source.`;
  if(['overwatch','intercept'].includes(id)&&(!c.reactionAvailable||c.overwatch.active))return 'An unreserved Reaction is required.';
  if(id==='overwatch'&&((ammoFor(actor,item)?.system.currentLoad??0)<1||has(item,'manual')&&!s.cycled))return 'Loaded and cycled firearm required.';
  if(id==='move'&&c.pressure>=7)return 'Overwhelmed: Rally or Step into equivalent/better cover.';
  if(['move','step','disengage'].includes(id)&&readied(actor).some(i=>i.system.deployed))return 'Pickup the deployed weapon before moving.';
  return '';
}
export async function spend(actor,cost){if(game.combat?.started&&combatantFor(actor)){if(!isActive(actor)||actor.system.combat.actionsRemaining<cost)throw Error('Action allowance or activation changed.');await actor.update({'system.combat.actionsRemaining':actor.system.combat.actionsRemaining-cost,'system.combat.moveRemaining':0,'system.combat.moveMode':''});}}
export async function ready(actor,item,{pay=true}={}) {
  if(!item)throw Error('Select equipment to Ready or Stow.');const s=item.system;if(!equippable(item))throw Error('This item cannot be equipped.');if(s.broken)throw Error('Broken equipment cannot be readied.');if(item.type==='grenade'&&(s.quantity??0)<=0)throw Error('No grenade remains.');if(!s.slot&&['firearm','melee','shield','launcher'].includes(item.type))throw Error('Assign an accessible loadout slot first.');
  if(s.deployed)throw Error('Pickup the deployed weapon first.');
  const updates=[];
  if(!s.readied){
    let remaining=2-equipmentCost(item);const current=equippedItems(actor).filter(currentItem=>currentItem.id!==item.id);const toStow=[];
    for(const currentItem of current){if(remaining>=equipmentCost(currentItem)){remaining-=equipmentCost(currentItem);continue;}toStow.push(currentItem);}
    if(toStow.some(currentItem=>currentItem.system.deployed))throw Error('Pickup the deployed weapon first.');
    for(const currentItem of toStow)updates.push({_id:currentItem.id,'system.readied':false});
    updates.push({_id:item.id,'system.readied':true});
  }else updates.push({_id:item.id,'system.readied':false});
  if(pay)await spend(actor,1);
  await actor.updateEmbeddedDocuments('Item',updates);
  if(s.readied){if(actor.system.combat.overwatch.weapon===item.id)await actor.update({'system.combat.overwatch.active':false});return;}
  await actor.update({'system.combat.aimTarget':'','system.combat.aimWeapon':'','system.combat.overwatch.active':false});
}
export async function reload(actor,item){
  const s=item.system;const internal=s.family==='shotgun';const used=new Set(actor.items.filter(i=>i.id!==item.id&&i.system.magazineId).map(i=>i.system.magazineId));
  const sources=actor.items.filter(i=>i.type==='magazine'&&i.system.cartridge===s.cartridge&&i.system.compatibility===s.compatibility&&i.system.currentLoad>0&&i.id!==s.magazineId&&!used.has(i.id));
  if(!sources.length)throw Error('No compatible loaded spare source.');if(internal&&s.currentLoad>=s.maxLoad)throw Error('Tube is already full.');
  const sourceId=s.reloadProgress?s.reloadSource:await choose('Reload from',sources.map(i=>({value:i.id,label:`${i.name}: ${i.system.currentLoad}/${i.system.maxLoad}`})));
  if(!sourceId)return;const source=actor.items.get(sourceId);if(!sources.includes(source))throw Error('The reserved reload source is no longer available.');
  const required=internal?1:s.reloadCost;const remaining=required-s.reloadProgress;const available=game.combat?.started&&combatantFor(actor)?actor.system.combat.actionsRemaining:required;const paid=Math.min(available,remaining);if(!paid)throw Error('No Actions remain.');await spend(actor,paid);
  if(s.reloadProgress+paid<required){await item.update({'system.reloadProgress':s.reloadProgress+paid,'system.reloadSource':sourceId});return chat(actor,'Reload progress',`<p>${s.reloadProgress+paid}/${required} Actions paid; source reserved for completion.</p>`);}
  if(internal)await actor.updateEmbeddedDocuments('Item',[{_id:source.id,'system.currentLoad':source.system.currentLoad-1},{_id:item.id,'system.currentLoad':s.currentLoad+1,'system.reloadProgress':0,'system.reloadSource':''}]);
  else await item.update({'system.magazineId':sourceId,'system.reloadProgress':0,'system.reloadSource':''});
  await chat(actor,'Reload',`<p>${escapeHTML(item.name)} loaded from ${escapeHTML(source.name)}. Removed magazine retained with its remaining Load.</p>`);
}
export async function repackActor(actor){if(game.combat?.started&&combatantFor(actor))throw Error('Repacking is only available outside encounters.');const mags=actor.items.filter(i=>i.type==='magazine').map(i=>({id:i.id,...i.system.toObject()}));await actor.updateEmbeddedDocuments('Item',repack(mags).map(m=>({_id:m.id,'system.currentLoad':m.currentLoad})));return chat(actor,'Magazines repacked','<p>Total remaining Load conserved within each compatible source type.</p>');}
export async function inventory(actor,{command,item:itemId,slot,delta,target,before}={}){
  if(!['wear','slot','quantity','reorder'].includes(command))throw Error('Unknown inventory command.');
  const item=actor.items.get(itemId);if(!item)throw Error('Inventory item no longer exists.');
  if(command==='reorder'){
    if(game.combat?.started&&combatantFor(actor))throw Error('Finish the encounter before rearranging inventory.');
    const targetItem=actor.items.get(target);
    if(!targetItem)throw Error('Target inventory item no longer exists.');
    if(item.id===targetItem.id)throw Error('Choose a different item as the reorder target.');
    if(typeof before!=='boolean')throw Error('Choose whether to place the item before or after its target.');
    const siblings=sortedInventoryItems(actor);
    if(!siblings.includes(item)||!siblings.includes(targetItem)||item.actor!==actor||targetItem.actor!==actor)throw Error('Reordering requires two equipment items on the same Actor.');
    const sorted=foundry.utils.performIntegerSort(item,{target:targetItem,siblings,sortBefore:before});
    return actor.updateEmbeddedDocuments('Item',sorted.map(({target,update})=>({_id:target.id,...update})));
  }
  if(command==='wear'){
    if(game.combat?.started&&combatantFor(actor))throw Error('Finish the encounter before changing worn armour.');
    if(item.type!=='armour')throw Error('Only armour can be worn.');
    const worn=!item.system.worn;
    const updates=actor.items.filter(i=>i.type==='armour'&&i.id!==item.id&&worn&&i.system.worn).map(i=>({_id:i.id,'system.worn':false}));
    updates.push({_id:item.id,'system.worn':worn});
    return actor.updateEmbeddedDocuments('Item',updates);
  }
  if(command==='slot'){
    if(game.combat?.started&&combatantFor(actor))throw Error('Finish the encounter before changing loadout slots.');
    if(!['firearm','melee','shield','launcher','grenade','gear'].includes(item.type))throw Error('Only accessible equipment can use a loadout slot.');
    if(!['','primary','secondary','tertiary'].includes(slot))throw Error('Choose a valid loadout slot.');
    const updates=[];
    if(slot)for(const displaced of actor.items.filter(i=>i.id!==item.id&&i.system.slot===slot))updates.push({_id:displaced.id,'system.slot':'','system.readied':false});
    updates.push({_id:item.id,'system.slot':slot,...(!slot?{'system.readied':false}:{})});
    return actor.updateEmbeddedDocuments('Item',updates);
  }
  if(game.combat?.started&&combatantFor(actor))throw Error('Finish the encounter before changing carried quantities.');
  if(!['gear','grenade'].includes(item.type))throw Error('Quantity can only be changed for gear or grenades; magazines use Load.');
  if(delta!==1&&delta!==-1)throw Error('Quantity changes must be exactly +1 or -1.');
  const quantity=item.system.quantity+delta;if(quantity<0)throw Error('Quantity cannot be negative.');
  return item.update({'system.quantity':quantity,...(item.type==='grenade'&&quantity===0?{'system.readied':false}:{})});
}
export async function advance(actor,{kind,key}) {
  const d=actor.system;const current=kind==='skill'?d.skills[key]:d.attributes[key];let cost;
  if(kind==='skill'){if(!(key in d.skills)||current>=4)throw Error('Invalid Skill purchase.');cost=advancementCost('skill',current);}
  else if(kind==='attribute'){if(!(key in d.attributes)||current>=3||d.advancement.attributeIncreasesPurchased)throw Error('Only one Attribute increase may be bought in a lifetime.');cost=12;}
  else if(kind==='discipline'){const {DISCIPLINES}=await import('./config.mjs');if(learned(actor).includes(key)||!qualifies(key,d.skills,learned(actor)))throw Error('Discipline prerequisites not met.');cost=DISCIPLINES[key].advanced?7:4;}
  else throw Error('Unknown purchase.');
  if(d.tactical.availableVP<cost)throw Error('Not enough available VP.');
  const updates={'system.advancement.spentVP':d.advancement.spentVP+cost};if(kind==='skill')updates[`system.skills.${key}`]=current+1;
  if(kind==='attribute'){updates[`system.attributes.${key}`]=current+1;updates['system.advancement.attributeIncreasesPurchased']=1;}
  if(kind==='discipline'){const {disciplineItem}=await import('./catalogue.mjs');await actor.createEmbeddedDocuments('Item',[disciplineItem(key)]);}
  await actor.update(updates);await chat(actor,'Advancement',`<p>${escapeHTML(key)} purchased for ${cost} VP. Lifetime VP remains ${d.advancement.lifetimeVP}.</p>`);
}
