import {controllerInput,readied,has,tokenFor,chat,escapeHTML} from './utils.mjs';
import {shieldBreaks} from './rules.mjs';
export async function defensiveReaction(target,kind,{reactionAttack=false}={}) {
  const actor=target.actor,c=actor.system.combat;if(reactionAttack||!c.reactionAvailable||c.overwatch.active||c.wounds>=3||c.dead||c.recoveryPending)return {bonus:0};
  const options=[['none','No Reaction'],...(kind==='ranged'?[['evade','Evade (+2 DC)'],['dive','Dive to Cover (move up to 10 ft)']]:(readied(actor).some(i=>['melee','shield'].includes(i.type))||readied(actor).reduce((n,i)=>n+i.system.hands,0)<2?[['parry','Parry (+2 DC)']]:[]))];
  const r=await controllerInput(actor,'Defensive Reaction',`<p>${escapeHTML(actor.name)} is targeted by a ${kind} Attack. A Reaction is declared before the attack roll. Shield Absorb can be chosen after a hit if you keep this Reaction.</p><label>Response<select name="response">${options.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>`);
  const response=r?.response??'none';if(response==='none')return {bonus:0};if(!options.some(([v])=>v===response))throw Error('Invalid Reaction.');
  await actor.update({'system.combat.reactionAvailable':false});
  if(response==='dive'){
    await actor.update({'system.combat.moveRemaining':10,'system.combat.moveMode':'dive'});await controllerInput(actor,'Dive to Cover',`<p>Move ${escapeHTML(actor.name)} up to 10 ft into reachable cover using the native ruler, then continue. The GM confirms the new attack path.</p>`);await actor.update({'system.combat.moveRemaining':0,'system.combat.moveMode':''});return {bonus:0,dive:true};
  }
  return {bonus:2,parry:response==='parry'};
}
export async function shieldAbsorb(target,harm,kind,{reactionAttack=false}={}) {
  if(reactionAttack)return 0;const candidates=[target.actor,...(game.combat?.combatants.map(c=>c.actor).filter(a=>a&&a.uuid!==target.actor.uuid&&a.system.combat.coverAlly===target.uuid)??[])];
  for(const actor of candidates){const c=actor.system.combat;if(!c.reactionAvailable||c.overwatch.active||c.wounds>=3||c.dead)continue;
    if(actor!==target.actor){const t=tokenFor(actor);if(!t||game.fdern.distanceBetween(t,target)>5)continue;}
    const shields=readied(actor).filter(i=>i.type==='shield'&&(kind!=='ranged'||has(i,'ballistic')));if(!shields.length)continue;
    const r=await controllerInput(actor,'Shield Absorb',`<p>Hit confirmed on ${escapeHTML(target.name)}, Harm ${harm}. Spend your Reaction to reduce Harm before armour?</p><select name="shield"><option value="">Keep Reaction</option>${shields.map(i=>`<option value="${i.id}">${escapeHTML(i.name)} (Absorption ${i.system.absorption})</option>`).join('')}</select>`);
    const shield=shields.find(i=>i.id===r?.shield);if(!shield)continue;await actor.update({'system.combat.reactionAvailable':false});const absorb=shield.system.absorption;
    if(shieldBreaks(harm,absorb))await shield.update({'system.broken':true,'system.readied':false});await chat(actor,'Shield Absorb',`<p>Harm reduced by ${absorb}.${shield.system.broken?' Shield breaks after this hit.':''}</p>`);return absorb;
  }return 0;
}
