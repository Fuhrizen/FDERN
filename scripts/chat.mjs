import {itemArtwork} from './artwork.mjs';
import {sortedInventoryItems} from './inventory-view.mjs';
import {ACTIONS} from './config.mjs';
import {chat,escapeHTML,choose} from './utils.mjs';
import {ammoFor} from './equipment.mjs';
import {equippable,equipmentMode} from './equipping.mjs';

const accessibleTypes=new Set(['firearm','melee','shield','launcher','grenade','gear']);
const number=(value)=>Number.isFinite(value)?value:null;
function breakdown(actor,item){
  const s=item.system,rows=[];
  if(number(s.accuracy)!==null&&['firearm','launcher'].includes(item.type))rows.push(['Accuracy',`${s.accuracy>=0?'+':''}${s.accuracy}`]);
  if(number(s.harm)!==null&&['firearm','launcher','melee','shield'].includes(item.type))rows.push(['Harm',s.harm]);
  if(number(s.penetration)!==null&&['firearm','launcher','melee'].includes(item.type))rows.push(['Penetration',s.penetration]);
  if(number(s.effective)!==null&&number(s.maximum)!==null&&['firearm','launcher'].includes(item.type))rows.push(['Range',`${s.effective} / ${s.maximum} ft`]);
  if(number(s.reach)!==null&&['melee','shield'].includes(item.type))rows.push(['Reach',`${s.reach} ft`]);
  if(['grenade','launcher'].includes(item.type)){if(s.payload)rows.push(['Payload',s.payload]);if(s.radius)rows.push(['Radius',`${s.radius} ft`]);if(s.duration)rows.push(['Duration',`${s.duration} rounds`]);}
  if(item.type==='armour'){rows.push(['Ballistic',s.ballistic??0],['Melee',s.meleeArmour??0],['Worn',s.worn?'Yes':'No']);}
  if(item.type==='shield'&&number(s.absorption)!==null)rows.push(['Absorption',s.absorption]);
  if(['firearm','launcher','magazine'].includes(item.type)){
    const source=ammoFor(actor,item);if(number(source?.system.currentLoad)!==null&&number(source?.system.maxLoad)!==null)rows.push(['Load',`${source.system.currentLoad} / ${source.system.maxLoad}`]);
  }
  if(number(s.quantity)!==null&&['gear','grenade'].includes(item.type))rows.push(['Quantity',s.quantity]);
  if(number(s.hands)!==null&&s.hands>0)rows.push(['Hands',s.hands]);
  return rows;
}

/** Share a concise, owner-authorized item profile and useful item-bound actions. */
export async function postItem(actor,item){
  if(!actor||actor.documentName!=='Actor'||!actor.testUserPermission(game.user,'OWNER'))throw Error('You do not own this Actor.');
  if(!item||item.actor?.uuid!==actor.uuid||actor.items.get(item.id)!==item)throw Error('This item is no longer on the Actor.');
  const s=item.system,rows=breakdown(actor,item);
  const values=rows.map(([label,value])=>`<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
  const image=`<img src="${escapeHTML(itemArtwork(item))}" alt="">`;
  const playerDescription=String(s.description??'').replace(/Actions: [^.]+\. Training prerequisites are checked when used\./,'');
  const description=playerDescription?`<p>${escapeHTML(playerDescription)}</p>`:'';
  const typeLabel=({firearm:'Firearm',melee:'Melee weapon',shield:'Shield',armour:'Armour',magazine:'Ammunition',grenade:'Grenade',launcher:'Launcher',gear:'Equipment'})[item.type]??'Item';
  const body=`<section class="item-card-profile">${image}<div><p class="hint">${typeLabel}</p>${description}<dl class="fdern-chat-breakdown">${values}</dl></div></section>`;
  const actions=[{type:'open-item',item:item.id,label:'Details'}];
  const canEquip=accessibleTypes.has(item.type)&&equippable(item)&&(['grenade','gear'].includes(item.type)||s.slot||s.readied);
  if(canEquip){
    const mode=equipmentMode(item),modeLabel=mode==='main'?'Main hand':mode==='offhand'?'Offhand':null;
    actions.push({type:'act',command:'ready',item:item.id,label:`${s.readied?'Unequip':'Equip'}${modeLabel?` · ${modeLabel}`:''}`});
  }
  if(['firearm','launcher'].includes(item.type)&&s.actions?.includes('reload'))actions.push({type:'act',command:'reload',item:item.id,label:`Reload · ${number(s.reloadCost)??ACTIONS.reload.cost} A`});
  const supplied=(s.actions??[]).filter(id=>Object.hasOwn(ACTIONS,id)&&id!=='reload').slice(0,3).map(id=>{
    const action=ACTIONS[id],actionCost=id==='launch'?number(s.fireCost)??action.cost:action.cost,cost=actionCost?`${actionCost} A`:'';const load=action.load?`${action.load} Load`:'';
    return {type:'act',command:id,item:item.id,label:`${action.name}${cost||load?` · ${[cost,load].filter(Boolean).join(' · ')}`:''}`};
  });
  actions.push(...supplied);
  return chat(actor,item.name,body,[],{},actions);
}

export async function shareEquipment(actor){
  if(!actor?.testUserPermission(game.user,'OWNER'))throw Error('You do not own this Actor.');
  const items=sortedInventoryItems(actor);if(!items.length)throw Error('This character has no equipment.');
  const id=await choose('Send equipment to chat',items.map(item=>({value:item.id,label:item.name})));
  if(id)return postItem(actor,actor.items.get(id));
}
