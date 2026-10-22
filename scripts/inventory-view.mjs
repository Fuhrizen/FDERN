export const INVENTORY_SIZES=Object.freeze([
  Object.freeze({tier:1,id:'pocket',label:'Pocket',width:1,height:1}),
  Object.freeze({tier:2,id:'small',label:'Small',width:2,height:1}),
  Object.freeze({tier:3,id:'medium',label:'Medium',width:2,height:2}),
  Object.freeze({tier:4,id:'long',label:'Long',width:3,height:1}),
  Object.freeze({tier:5,id:'bulky',label:'Bulky',width:3,height:2})
]);

const DEFAULT_SIZE=INVENTORY_SIZES[0];
const EQUIPMENT_TYPES=new Set(['firearm','melee','shield','armour','magazine','grenade','launcher','gear']);
const SIZE_BY_ID=new Map(INVENTORY_SIZES.map(size=>[size.id,size]));

function automaticTier(item){
  const system=item?.system??{},type=item?.type,family=String(system.family??'').toLowerCase();
  if(type==='armour'||type==='launcher')return 5;
  if(type==='shield')return 3;
  if(type==='firearm'){
    if(['support','light-mg','gpmg','mounted-mg'].includes(family)||system.traits?.includes('support'))return 5;
    if(['pistol','machine-pistol'].includes(family))return 2;
    return 4;
  }
  if(type==='melee')return Number(system.hands)>=2||Number(system.reach)>=10||['war-hammer','long-sword','spear','staff'].includes(family)?4:2;
  if(type==='grenade')return 2;
  return 1;
}

/** Resolve an item's explicit inventorySize (1–5) or its type-based default. */
export function resolveInventorySize(item){
  const explicit=Number(item?.system?.inventorySize??0);
  const tier=Number.isInteger(explicit)&&explicit>=1&&explicit<=5?explicit:automaticTier(item);
  return INVENTORY_SIZES[tier-1]??DEFAULT_SIZE;
}

export const resolveTier=resolveInventorySize;

function itemArray(actor){
  if(!actor?.items)return [];
  return Array.from(actor.items);
}

function nativeSort(item,index){
  const value=Number(item?.sort??item?._source?.sort??index);
  return Number.isFinite(value)?value:index;
}

/** Return equipment in Foundry sort order, retaining collection order for ties. */
export function sortedInventoryItems(actor){
  return itemArray(actor).map((item,index)=>({item,index,sort:nativeSort(item,index)}))
    .filter(entry=>EQUIPMENT_TYPES.has(entry.item.type))
    .sort((a,b)=>a.sort-b.sort||a.index-b.index).map(entry=>entry.item);
}

/** Build CSS-grid presentation rows; CSS auto-placement handles responsive packing without overlap. */
export function buildInventoryGrid(actor,{columns=6}={}){
  columns=Math.max(1,Math.floor(Number(columns)||6));
  const items=sortedInventoryItems(actor).map(item=>{
    const size=resolveInventorySize(item);
    return {item,id:item.id??item._id??'',name:item.name??'',type:item.type,tier:size.tier,size:size.id,label:size.label,width:Math.min(size.width,columns),height:size.height};
  });
  return {columns,items};
}
