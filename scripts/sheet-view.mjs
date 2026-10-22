import {ATTRIBUTES,SKILLS,PAIRINGS,DISCIPLINES} from './config.mjs';
import {advancementCost,personalBonus,qualifies} from './rules.mjs';

const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().trim();
const availableVP=actor=>Number(actor.system.tactical?.availableVP??(actor.system.advancement.lifetimeVP-actor.system.advancement.spentVP));
const learnedDisciplines=actor=>actor.items.filter(item=>item.type==='discipline').map(item=>item.system.disciplineId);
const reasonForCost=(cost,vp)=>vp<cost?`Need ${cost-vp} more VP.`:'';
const reasonForPermission=(editable,reason)=>reason||(!editable?'Owner permission is required to make purchases.':'');

/** Build searchable skill rows with the rules' paired Attribute and capped personal bonus. */
export function buildSkillRows(actor,{editable=false,query='',trainedOnly=false}={}){
  const q=normalize(query);
  return Object.entries(SKILLS).map(([id,label])=>{
    const attributeId=PAIRINGS[id],attribute=ATTRIBUTES[attributeId],rank=Number(actor.system.skills[id]??0),attributeRank=Number(actor.system.attributes[attributeId]??0),total=personalBonus(attributeRank,rank);
    const row={id,label,attributeId,attribute,attributeRank,rank,total,editable:!!editable,trained:rank>0,rollLabel:`${attribute} + ${label} (+${total})`};
    row.matches=!q||normalize(`${label} ${attribute} ${id} ${attributeId} ${rank} ${row.rollLabel}`).includes(q);
    return row;
  }).filter(row=>(!trainedOnly||row.trained)&&row.matches);
}

/** Build purchase guidance without changing the advancement rules or spending state. */
export function buildAdvancementRows(actor,{editable=false}={}){
  const system=actor.system,vp=availableVP(actor),learned=learnedDisciplines(actor),skills=[],attributes=[],disciplines=[];
  for(const [id,label] of Object.entries(SKILLS)){
    const current=Number(system.skills[id]??0),max=current>=4,cost=max?null:advancementCost('skill',current),eligible=!max;
    const reason=reasonForPermission(editable,max?'Maximum rank reached.':reasonForCost(cost,vp));
    skills.push({kind:'skill',id,label,current,next:max?current:current+1,cost,eligible,purchaseDisabled:!editable||!eligible||vp<cost,reason});
  }
  for(const [id,label] of Object.entries(ATTRIBUTES)){
    const current=Number(system.attributes[id]??0),max=current>=3,lifetimeUsed=Number(system.advancement.attributeIncreasesPurchased??0)>0,cost=advancementCost('attribute'),eligible=!max&&!lifetimeUsed;
    const reason=reasonForPermission(editable,max?'Maximum rank reached.':lifetimeUsed?'Your lifetime Attribute increase has already been used.':reasonForCost(cost,vp));
    attributes.push({kind:'attribute',id,label,current,next:max?current:current+1,cost,eligible,purchaseDisabled:!editable||!eligible||vp<cost,reason});
  }
  for(const [id,definition] of Object.entries(DISCIPLINES)){
    const learnedAlready=learned.includes(id),eligible=!learnedAlready&&qualifies(id,system.skills,learned),cost=definition.advanced?7:4;
    const reason=reasonForPermission(editable,learnedAlready?'Already learned.':!eligible?'Prerequisites not met.':reasonForCost(cost,vp));
    disciplines.push({kind:'discipline',id,label:definition.name,current:learnedAlready,next:!learnedAlready,cost,eligible,purchaseDisabled:!editable||!eligible||vp<cost,reason,advanced:!!definition.advanced,skill:definition.skill,rank:definition.rank});
  }
  return {skills,attributes,disciplines,availableVP:vp};
}

/** Match an Item by common player-facing fields using accent-insensitive literal text search. */
export function itemMatches(item,query){
  const q=normalize(query);if(!q)return true;
  const system=item?.system??{};
  const values=[item?.name,item?.type,system.family,system.description,system.cartridge,system.compatibility,system.payload,system.traits,system.actions];
  return normalize(values.flat(Infinity).filter(value=>value!==undefined&&value!==null).join(' ')).includes(q);
}
