const EQUIPPABLE_TYPES=new Set(['firearm','melee','shield','launcher','grenade','gear']);
const OFFHAND_DEFAULT=/\b(dagger|knife)\b/i;

export function equipmentMode(item){
  const mode=item?.system?.equipmentMode;
  if(mode==='main'||mode==='offhand')return mode;
  if(item?.type==='grenade'||item?.type==='melee'&&OFFHAND_DEFAULT.test(`${item.id??''} ${item.name??''} ${item.system?.family??''}`))return 'offhand';
  return 'main';
}
export const equipmentCost=item=>equipmentMode(item)==='offhand'?1:2;
export const equippable=item=>EQUIPPABLE_TYPES.has(item?.type);
export function equippedItems(actor){return actor?.items?.filter(item=>equippable(item)&&item.system.readied&&!item.system.broken&&!(item.type==='grenade'&&(item.system.quantity??0)<=0))??[];}
export function loadoutValid(actor){
  const equipped=equippedItems(actor),main=equipped.filter(item=>equipmentMode(item)==='main').length,offhand=equipped.length-main;
  return main<=1&&offhand<=2&&!(main&&offhand);
}
export function equipPreview(actor,item){
  if(!item)return {stowed:[],blocked:'Select equipment to Ready or Stow.'};
  const s=item.system;
  if(!equippable(item))return {stowed:[],blocked:'This item cannot be equipped.'};
  if(s.broken)return {stowed:[],blocked:'Broken equipment cannot be readied.'};
  if(item.type==='grenade'&&(s.quantity??0)<=0)return {stowed:[],blocked:'No grenade remains.'};
  if(!s.slot&&['firearm','melee','shield','launcher'].includes(item.type))return {stowed:[],blocked:'Assign an accessible loadout slot first.'};
  if(s.deployed)return {stowed:[],blocked:'Pickup the deployed weapon first.'};
  if(s.readied)return {stowed:[],blocked:''};
  let remaining=2-equipmentCost(item);
  const stowed=[];
  for(const current of equippedItems(actor).filter(current=>current.id!==item.id)){
    if(remaining>=equipmentCost(current))remaining-=equipmentCost(current);
    else stowed.push(current);
  }
  if(stowed.some(current=>current.system.deployed))return {stowed:[],blocked:'Pickup the deployed weapon first.'};
  return {stowed,blocked:''};
}
