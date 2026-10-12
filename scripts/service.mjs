import {ACTIONS,PAIRINGS} from './config.mjs';
import {allowance,moveDistance,personalBonus,stunPenalty,clamp} from './rules.mjs';
import {actionReason,spend,ready,reload,repackActor,advance} from './equipment.mjs';
import {attack} from './attacks.mjs';
import {areaAttack} from './areas.mjs';
import {tokenFor,isActive,combatantFor,learned,readied,controllerInput,input,choose,rollTest,chat,escapeHTML} from './utils.mjs';
import {distanceBetween,coverBetween} from './terrain.mjs';
const medicalIds=['field-dressing','advanced-dressing','stabilise'];
export async function execute(request,user){
  if(!request||typeof request!=='object')throw Error('Invalid command.');
  if(request.type==='encounter'){
    const combat=game.combats.get(request.combat);if(!combat)throw Error('Encounter no longer exists.');
    if(!user.isGM){if(request.command!=='activate')throw Error('The GM controls encounter progression.');const c=combat.combatants.get(request.id);if(!c?.actor?.testUserPermission(user,'OWNER'))throw Error('You do not own this combatant.');}
    if(request.command==='start')return (await combat.startCombat()).id;if(request.command==='draw')return combat.draw();if(request.command==='activate')return (await combat.activate(request.id,{ambush:!!request.ambush&&user.isGM})).id;if(request.command==='end')return (await combat.endActivation()).id;if(request.command==='round')return (await combat.nextRound()).id;
    if(request.command==='side'&&user.isGM){const c=combat.combatants.get(request.id);if(combat.started)throw Error('Set sides before starting combat.');await c.setFlag('fdern','side',String(request.side).trim().slice(0,60)||'Opposition');return;}
    throw Error('Unknown encounter command.');
  }
  const actor=await fromUuid(request.actor);if(!actor||actor.documentName!=='Actor'||!actor.testUserPermission(user,'OWNER'))throw Error('You do not own this Actor.');
  if(request.type==='repack')return repackActor(actor);
  if(request.type==='advance')return advance(actor,request.purchase??{});
  if(request.type==='award'){if(!user.isGM)throw Error('Only the GM awards VP.');const vp=clamp(request.vp,0,100);await actor.update({'system.advancement.lifetimeVP':actor.system.advancement.lifetimeVP+vp});return;}
  if(request.type==='recover'){if(!user.isGM)throw Error('The GM approves substantial recovery.');if(actor.system.combat.wounds>=3||actor.system.combat.dead)throw Error('Patient must first receive successful care and be below 3 Wounds.');await actor.update({'system.combat.recoveryPending':false});return;}
  if(request.type==='release'){const other=await fromUuid(actor.system.combat.grappling);if(other)await other.update({'system.combat.grappledBy':''});await actor.update({'system.combat.grappling':''});return;}
  if(request.type==='movement-interrupt'){const {resolveMovementInterrupt}=await import('./movement.mjs');return resolveMovementInterrupt(actor,request,execute);}
  if(request.type==='reaction-shot'){
    const target=await fromUuid(request.target);const state=actor.system.combat.overwatch;const item=actor.items.get(state.weapon);
    if(!state.active||!item||!item.system.readied||actor.system.combat.wounds>=3||actor.system.combat.dead)throw Error('No valid reserved shot.');
    const confirmed=await input('Confirm reserved trigger',`<p>${escapeHTML(state.lane)}. Confirm ${escapeHTML(target?.name)} ${state.kind==='intercept'?'entered Reach':'voluntarily entered or crossed the watched lane'}. This shot interrupts movement and cannot be reacted to.</p><label><input type="checkbox" name="trigger" checked> Trigger occurred</label>`);if(!confirmed?.trigger)return;
    const reason=actionReason(actor,state.kind==='intercept'?'strike':'fire',item,{reaction:true});if(reason)throw Error(reason);await actor.update({'system.combat.overwatch.active':false,'system.combat.reactionAvailable':false});return attack(actor,state.kind==='intercept'?'strike':'fire',item,target,{reaction:true,modifier:state.kind==='intercept'?0:-1});
  }
  if(request.type!=='act')throw Error('Unknown command.');const item=request.item?actor.items.get(request.item):null;const id=request.action;const a=ACTIONS[id];const reason=actionReason(actor,id,item);if(reason)throw Error(reason);
  const target=request.target?await fromUuid(request.target):null;
  if(['ranged','melee','suppress'].includes(a.kind))return attack(actor,id,item,target);
  if(a.kind==='area')return areaAttack(actor,id,item,request.point);
  if(medicalIds.includes(id))return medical(actor,id,target?.actor??actor,target);
  if(a.kind==='opposed')return opposed(actor,id,item,target);
  const c=actor.system.combat;
  if(id==='ready')return ready(actor,item);if(id==='reload')return reload(actor,item);
  if(['move','disengage','step'].includes(id)){
    if(c.grappledBy||c.grappling)throw Error('Release or escape the grapple before independent movement.');
    if(id==='step'){const confirmation=await controllerInput(actor,'Step while Overwhelmed','<p>Step up to 5 ft into equivalent or better cover against the Pressure source. The path must not cross more exposed terrain.</p><label><input type="checkbox" name="legal" checked> Legal covered Step</label>');if(!confirmation?.legal)return;}
    await spend(actor,1);const distance=id==='move'?actor.system.tactical.move:5;await actor.update({'system.combat.moveRemaining':distance,'system.combat.moveMode':id});return chat(actor,a.name,`<p>Move up to ${distance} ft using the native ruler. Unused distance expires when another action begins.</p>`);
  }
  if(id==='aim'){if(!item?.system.readied||!['firearm','launcher'].includes(item.type)||!target)throw Error('Aim requires a readied firearm and visible intended target.');const source=tokenFor(actor);if(source&&coverBetween(source,target).cover===3)throw Error('Target is not visible.');await spend(actor,1);return actor.update({'system.combat.aimTarget':target.uuid,'system.combat.aimWeapon':item.id});}
  if(id==='take-cover'){const protect=await controllerInput(actor,'Take Cover','<p>You must have at least Light Cover from the relevant attack direction.</p><label><input name="legal" type="checkbox" checked> Qualifying cover exists</label>');if(!protect?.legal)return;await spend(actor,1);return actor.update({'system.combat.takeCover':true});}
  if(id==='rally'){await spend(actor,1);return actor.update({'system.combat.pressure':Math.max(0,c.pressure-2)});}
  if(id==='prone'||id==='stand'){await spend(actor,1);return actor.update({'system.combat.prone':id==='prone','system.combat.moveRemaining':0});}
  if(id==='cycle'){await spend(actor,1);return item.update({'system.cycled':true});}
  if(id==='setup'||id==='pickup'){await spend(actor,1);return item.update({'system.deployed':id==='setup'});}
  if(id==='overwatch'||id==='intercept'){
    const r=await controllerInput(actor,id==='overwatch'?'Prepare Overwatch':'Prepare Intercept',`<label>Declare ${id==='overwatch'?'visible watched approach within maximum range':'Reach boundary'}<input name="lane" required></label>${id==='overwatch'?`<label>Watched native Region (recommended)<select name="regionId"><option value="">GM-confirmed text lane</option>${canvas.scene.regions.map(r=>`<option value="${r.id}">${escapeHTML(r.name)}</option>`).join('')}</select></label>`:''}`);if(!r?.lane?.trim())return;await spend(actor,1);await actor.update({'system.combat.overwatch':{active:true,weapon:item.id,lane:String(r.lane).slice(0,300),kind:id,regionId:r.regionId??''},'system.combat.reactionAvailable':false});return;
  }
  if(id==='cover-ally'){const own=tokenFor(actor);if(!target?.actor||!own||distanceBetween(own,target)>5)throw Error('Choose an ally within 5 ft.');await spend(actor,1);return actor.update({'system.combat.coverAlly':target.uuid});}
  if(id==='observe'){if(!target?.actor)throw Error('Target a combatant to Spot.');const own=tokenFor(actor);if(own&&coverBetween(own,target).cover===3)throw Error('Observation cannot see through solid Cover.');await spend(actor,1);const result=await rollTest(actor,'perception','reconnaissance',9,0,'Observe / Spot');if(result.total>=9)return actor.update({'system.combat.spot':{target:target.uuid,expiresRound:learned(actor).includes('tactical-observer')?(game.combat?.round??0)+1:0,expiresActivation:learned(actor).includes('tactical-observer')?'':actor.uuid}});return;}
  if(id==='patch'){await spend(actor,1);const result=await rollTest(actor,'intellect','engineering',11,0,'Emergency Patch');return chat(actor,'Emergency Patch',`<p>${result.total>=11?'One minor equipment function is restored for this encounter (GM confirms).':'No improvement.'} No ammunition, injury, or catastrophic destruction is repaired.</p>`);}
  if(id==='assist'){if(!target?.actor)throw Error('Select the ally being assisted.');await spend(actor,1);await actor.update({'system.combat.assistTarget':target.actor.uuid});return chat(actor,'Assist','<p>Material help for one nearby Test: +1, maximum +2 total assistance. Use the Test dialog when resolving that activity.</p>');}
  await spend(actor,a.cost);return chat(actor,a.name,'<p>Action spent. Resolve the stated interaction.</p>');
}
async function medical(actor,id,patient,target){
  const own=tokenFor(actor);if(target&&own&&distanceBetween(own,target)>5)throw Error('Patient must be reachable within 5 ft.');const c=patient.system.combat;if(c.dead)throw Error('Patient has died.');
  if(id==='stabilise'&&!c.bleeding)throw Error('Patient is not bleeding out.');if(id!=='stabilise'&&(c.dressings>=2||c.wounds===0))throw Error('Field Dressing limit reached, or no Wounds to dress.');
  await spend(actor,2);const dc=id==='stabilise'?8+Math.max(1,c.downCount):9;const roll=await rollTest(actor,'intellect','medicine',dc,0,ACTIONS[id].name);if(roll.total<dc)return;
  if(id==='stabilise')return patient.update({'system.combat.stabilised':true,'system.combat.bleeding':false});
  return patient.update({'system.combat.wounds':Math.max(0,c.wounds-1),'system.combat.pressure':Math.max(0,c.pressure-(id==='advanced-dressing'?2:1)),'system.combat.dressings':c.dressings+1,'system.combat.recoveryPending':c.recoveryPending||c.wounds>=3});
}
async function opposed(actor,id,item,target){
  const c=actor.system.combat;if(id==='escape'){const holder=await fromUuid(c.grappledBy);if(!holder)throw Error('No grapple to escape.');target=tokenFor(holder);}if(!target?.actor)throw Error('Choose an opposing token.');const defender=target.actor;
  if(id==='lunge'){await spend(actor,2);await actor.update({'system.combat.moveRemaining':15,'system.combat.moveMode':'lunge'});await controllerInput(actor,'Lunge approach','<p>Move up to 15 ft on a credible approach using the native ruler, then continue to the +2 Disarm Test.</p>');await actor.update({'system.combat.moveRemaining':0,'system.combat.moveMode':''});}
  const own=tokenFor(actor);if(!own||distanceBetween(own,target)>(id==='grapple'||id==='takedown'?5:item?.system.reach??5))throw Error('Target is outside Reach.');
  if(id==='grapple'&&readied(actor).reduce((n,i)=>n+i.system.hands,0)>=2)throw Error('Grapple requires a usable hand.');if(id==='takedown'&&defender.system.combat.grappledBy!==actor.uuid)throw Error('Takedown requires an established hold.');
  let heldItem=null;if(['disarm','lunge'].includes(id)){const items=readied(defender);if(!items.length)throw Error('Target has no held item.');const selected=await choose('Disarm which item?',items.map(i=>({value:i.id,label:i.name})));if(!selected)return;heldItem=defender.items.get(selected);}
  if(id!=='lunge')await spend(actor,ACTIONS[id].cost);
  const options=id==='escape'?['agility:mobility','might:athletics']:['might:athletics','agility:melee'];const defOptions=['disarm','lunge'].includes(id)?['agility:melee','might:athletics']:['might:athletics','agility:mobility'];
  const select=async(a,opts)=>controllerInput(a,'Opposed Test',`<label>Approach<select name="pair">${opts.map(v=>`<option value="${v}">${v.replace(':',' + ')}</option>`).join('')}</select></label>`);
  const ar=await select(actor,options),dr=await select(defender,defOptions);const ap=options.includes(ar?.pair)?ar.pair:options[0],dp=defOptions.includes(dr?.pair)?dr.pair:defOptions[0];const [aa,as]=ap.split(':'),[da,ds]=dp.split(':');
  const control=learned(actor).includes('close-quarters-control')&&!c.controlUsed&&['disarm','escape'].includes(id)?1:0;const stunA=stunPenalty(c,'melee',as),stunD=stunPenalty(defender.system.combat,'test',ds);
  const aRoll=await new foundry.dice.Roll(`2d6 + ${personalBonus(actor.system.attributes[aa],actor.system.skills[as])} + ${id==='lunge'?2:0} + ${control} - ${id==='escape'?0:c.attackPenalty} - ${stunA}`).evaluate();const dRoll=await new foundry.dice.Roll(`2d6 + ${personalBonus(defender.system.attributes[da],defender.system.skills[ds])} - ${stunD}`).evaluate();const win=aRoll.total>dRoll.total;
  if(control)await actor.update({'system.combat.controlUsed':true});if(stunA)await actor.update({'system.combat.stunUsed':true});if(stunD)await defender.update({'system.combat.stunUsed':true});if(id!=='escape')await actor.update({'system.combat.attackPenalty':c.attackPenalty+(item?.system.strain??1),'system.combat.attacks':c.attacks+1});
  await chat(actor,ACTIONS[id].name,`<p>${aRoll.total} against ${dRoll.total}: ${win?'Success':'Defender wins (including ties)'}. Accumulated Strain applies to the offensive attempt.</p>`,[aRoll,dRoll]);
  if(!win)return;if(id==='grapple'){await actor.update({'system.combat.grappling':defender.uuid});await defender.update({'system.combat.grappledBy':actor.uuid});}
  if(id==='escape'){await actor.update({'system.combat.grappledBy':''});await defender.update({'system.combat.grappling':''});}
  if(['takedown','shove'].includes(id)){if(id==='shove'){const choice=await controllerInput(actor,'Shove result','<select name="effect"><option value="prone">Make Prone</option><option value="push">Push 5 ft into legal space</option></select>');if(choice?.effect==='push'){await defender.update({'system.combat.moveRemaining':5,'system.combat.moveMode':'forced'});await controllerInput(defender,'Forced movement','<p>Move 5 ft into legal space. Solid walls still block movement.</p>');await defender.update({'system.combat.moveRemaining':0,'system.combat.moveMode':''});return;}}await defender.update({'system.combat.prone':true});}
  if(heldItem)await heldItem.update({'system.readied':false,'system.slot':''});
}
