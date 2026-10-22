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
