import {ACTIONS,ICON} from './config.mjs';

export const ARTWORK_ICONS=Object.freeze([
  'pistol','smg','rifle','precision','shotgun','support','launcher','knife','melee','shield',
  'armour','ammo','grenade','smoke','flash','fire','medical','tools','move','target','observe','discipline','action'
]);
const asset=category=>`systems/fdern/assets/icons/${category}.svg`;
const PLACEHOLDERS=new Set(['',ICON,'systems/fdern/assets/fdern.svg']);
const FIREARM_ICONS=Object.freeze({pistol:'pistol','machine-pistol':'smg',smg:'smg',rifle:'rifle',precision:'precision',shotgun:'shotgun',support:'support'});
const ACTION_ICONS=Object.freeze({reload:'ammo',cycle:'ammo',patch:'tools',aim:'target',overwatch:'target',intercept:'target','cover-ally':'shield','take-cover':'shield',prone:'move',stand:'move'});
const KIND_ICONS=Object.freeze({ranged:'target',melee:'target',suppress:'target',opposed:'target',opposing:'target',movement:'move',test:'observe',medical:'medical',area:'grenade'});

/** Choose an icon for an action document or macro without changing its rules. */
export function actionArtwork(id,action={}){
  return asset(ACTION_ICONS[id]??KIND_ICONS[action?.kind??ACTIONS[id]?.kind]??'action');
}

/** Replace system placeholders only; native or user-supplied artwork remains authoritative. */
export function itemArtwork(item){
  const image=typeof item?.img==='string'?item.img:'';
  if(image.trim()&&!PLACEHOLDERS.has(image))return image;
  const s=item?.system??{};
  switch(item?.type){
    case 'firearm':return asset(FIREARM_ICONS[s.family]??'rifle');
    case 'launcher':return asset('launcher');
    case 'melee':return asset(/\b(knife|dagger)\b/i.test(`${s.family??''} ${item.name??''}`)?'knife':'melee');
    case 'shield':return asset('shield');
    case 'armour':return asset('armour');
    case 'magazine':return asset('ammo');
    case 'grenade':return asset(({smoke:'smoke',flash:'flash',concussion:'flash',incendiary:'fire'})[s.payload]??'grenade');
    case 'gear':{
      const actions=Array.isArray(s.actions)?s.actions:[];
      if(actions.some(id=>['field-dressing','advanced-dressing','stabilise'].includes(id))||/\b(medical|medic|first[ -]aid)\b/i.test(item.name??''))return asset('medical');
      if(actions.includes('patch')||/\b(engineering|repair|tools)\b/i.test(item.name??''))return asset('tools');
      return asset('action');
    }
    case 'discipline':return asset('discipline');
    case 'action':return actionArtwork(s.actionId);
    default:return ICON;
  }
}
