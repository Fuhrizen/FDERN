import {ACTIONS} from './config.mjs';
import {attackDC,personalBonus,stunPenalty} from './rules.mjs';
import {ammoFor,spend,actionReason} from './equipment.mjs';
import {defensiveReaction,shieldAbsorb} from './reactions.mjs';
import {pressure,damage} from './damage.mjs';
import {confirmGeometry,distanceBetween} from './terrain.mjs';
import {chat,escapeHTML,tokenFor,has,learned,readied,controllerInput} from './utils.mjs';
export async function attack(actor,id,item,target,{reaction=false,modifier=0}={}) {
  if(target?.documentName!=='Token'||!target.actor)throw Error('Target one token with an Actor.');const a=ACTIONS[id];const ranged=a.kind==='ranged'||a.kind==='suppress';const suppression=a.kind==='suppress';const c=actor.system.combat;const s=item?.system??{accuracy:0,harm:1,penetration:0,strain:1,reach:5,traits:['non-lethal'],hands:0};
  const geometry=await confirmGeometry(actor,target,item,{suppression});if(!geometry)return;
  if(!Number.isFinite(geometry.distance)||geometry.distance<0)throw Error('Invalid distance.');if(geometry.cover===3)throw Error('Complete Cover blocks this attack.');
  if(!ranged&&geometry.distance>s.reach)throw Error('Target is outside Reach.');if(id==='close-blast'&&geometry.distance>20)throw Error('Close Blast requires a target within 20 ft.');
  if(ranged&&geometry.distance>s.maximum)throw Error('Target is beyond maximum range.');if(suppression&&geometry.distance>s.effective)throw Error('Suppression requires effective range.');
  if(id==='precision'&&(c.aimTarget!==target.uuid||c.aimWeapon!==item.id))throw Error('Precision Shot needs Aim against this target with this weapon.');
  if(!reaction)await spend(actor,a.cost);if(a.load){const ammo=ammoFor(actor,item);if(!ammo||ammo.system.currentLoad<a.load)throw Error('Insufficient installed Load.');await ammo.update({'system.currentLoad':ammo.system.currentLoad-a.load});}
  let response={bonus:0};if(!suppression)response=await defensiveReaction(target,ranged?'ranged':'melee',{reactionAttack:reaction});
  if(response.dive){const updated=await confirmGeometry(actor,target,item,{suppression});if(!updated||updated.cover===3){await chat(actor,a.name,'<p>Dive to Cover blocks the attack; paid costs remain spent.</p>');return;}Object.assign(geometry,updated);}
  const dcData=ranged?attackDC(c,s,{...geometry,reaction:response.bonus,closeBlast:id==='close-blast'}):{dc:9+response.bonus,rows:[{label:'Base',value:9},...(response.bonus?[{label:'Parry',value:response.bonus}]:[])]};
  const aim=ranged&&c.aimTarget===target.uuid&&c.aimWeapon===item?.id?(id==='precision'?2:1):0;
  const spotter=game.combat?.combatants.map(x=>x.actor).find(x=>x&&x.uuid!==actor.uuid&&x.system.combat.spot.target===target.uuid);
  const skill=ranged?'marksmanship':'melee',attribute=ranged?'agility':'might';const bonus=personalBonus(actor.system.attributes[attribute],actor.system.skills[skill]);const accumulated=reaction||suppression&&id!=='sustained'?0:c.attackPenalty;
  const stunned=stunPenalty(c,ranged?'ranged':'melee',skill);const grapplePenalty=item&&(c.grappledBy||c.grappling)?2:0;
  const rollModifier=modifier+(id==='quick'?-1:0)+aim+(spotter&&!suppression?1:0)+s.accuracy-accumulated-stunned-grapplePenalty;
  const roll=await new foundry.dice.Roll(`2d6 + ${bonus} + ${rollModifier}`).evaluate();const hit=roll.total>=dcData.dc;
  const update={};if(stunned)update['system.combat.stunUsed']=true;if(!suppression){update['system.combat.aimTarget']='';update['system.combat.aimWeapon']='';if(spotter)await spotter.update({'system.combat.spot.target':''});}
  if(!reaction&&(!suppression||id==='sustained')){update['system.combat.attackPenalty']=c.attackPenalty+(ranged?s.recoil:s.strain);update['system.combat.attacks']=c.attacks+1;}
  if(item&&ranged&&has(item,'manual')&&(!suppression||id==='sustained'))await item.update({'system.cycled':false});if(Object.keys(update).length)await actor.update(update);
  const followups=item?[{type:'open-item',item:item.id,label:`Details: ${item.name}`},...(item.system.actions?.includes('reload')?[{type:'act',command:'reload',item:item.id,label:`Reload ${item.name}`}]:[])]:[];
  const modifiers=[['Personal',`+${bonus}`],['Weapon',`${s.accuracy>=0?'+':''}${s.accuracy}`],['Aim',`+${aim}`],['Spot',`+${spotter&&!suppression?1:0}`],['Accumulated',`-${accumulated}`],['Stun',`-${stunned}`],['Grapple',`-${grapplePenalty}`],['Other',`${modifier+(id==='quick'?-1:0)}`]];
  const body=`<p><b>${roll.total}</b> vs DC <b>${dcData.dc}</b>: <strong>${hit?'Success':'Miss'}</strong></p><dl class="fdern-chat-breakdown">${modifiers.filter(([label,value])=>label==='Personal'||Number(value)!==0).map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}<div><dt>Cost</dt><dd>${a.cost} ${a.cost===1?'Action':'Actions'} · ${a.load??0} Load</dd></div>${dcData.rows.map(r=>`<div><dt>${escapeHTML(r.label)}</dt><dd>${r.value}</dd></div>`).join('')}</dl>`;
  await chat(actor,`${a.name} · ${target.name}`,body,[roll],{},followups);
  if(hit){const damaging=!suppression||id==='sustained'&&roll.total>=attackDC(c,s,{...geometry,suppress:false}).dc+2;
    if(ranged)await pressure(target.actor,suppression?2:1,{covered:geometry.cover>0,takeCover:geometry.takeCover,direct:damaging,source:tokenFor(actor)?.uuid});
    if(damaging){const harm=s.harm+(['burst','close-blast','heavy-strike'].includes(id)?1:0);const absorb=await shieldAbsorb(target,harm,ranged?'ranged':'melee',{reactionAttack:reaction});await damage(target.actor,{harm,penetration:s.penetration,kind:ranged?'ranged':'melee',absorption:absorb,nonLethal:s.traits.includes('non-lethal'),forceStun:id==='stagger'});}
  }else if(response.parry&&roll.total>=dcData.dc-2&&learned(target.actor).includes('bladework')&&target.actor.system.skills.melee>=2){
    const weapon=readied(target.actor).find(i=>i.type==='melee');const opt=await controllerInput(target.actor,'Riposte',`<p>The Parry caused a miss. Counterattack as part of that Reaction at -2 Accuracy?</p><select name="riposte"><option value="no">No</option><option value="yes">Riposte</option></select>`);
    if(opt?.riposte==='yes'&&roll.total>=dcData.dc-2)await attack(target.actor,'strike',weapon,tokenFor(actor),{reaction:true,modifier:-2});
  }
  return {hit,total:roll.total,dc:dcData.dc};
}
