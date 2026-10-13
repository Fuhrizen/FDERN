import {allowance,endRound,bagFor,drawSide} from './rules.mjs';
import {chat,escapeHTML} from './utils.mjs';
export const sideOf = c => c.getFlag('fdern','side')??(c.token?.disposition===1?'Allies':'Opposition');
export const eligible = c => Boolean(c.actor&&!c.defeated&&allowance(c.actor.system.combat)>0);
export class FdernCombat extends foundry.documents.Combat {
  async startCombat(){if(!game.user.isGM)throw Error('Only the GM can start encounters.');if(this.started)return this;
    const seen=new Set();for(const c of this.combatants){if(!c.actor)continue;if(seen.has(c.actor.uuid))throw Error('Each combatant needs a distinct actor or unlinked token; duplicate linked actors share resources.');seen.add(c.actor.uuid);await c.actor.update({'system.combat.dressings':0,'system.combat.attackPenalty':0});}
    await this.updateEmbeddedDocuments('Combatant',this.combatants.map((c,i)=>({_id:c.id,initiative:1000-i,'flags.fdern.activated':false})));
    await this.update({round:1,turn:null,'flags.fdern.activeId':'','flags.fdern.drawnSide':'','flags.fdern.ambushCount':0,'flags.fdern.normalStarted':false});await this.beginRound();return this;
  }
  async beginRound(){
    for(const c of this.combatants){if(!c.actor)continue;const state=c.actor.system.combat;
      await c.actor.update({'system.combat.reactionAvailable':!state.dead&&state.wounds<3&&!state.recoveryPending&&!state.overwatch.active,'system.combat.actionsRemaining':0});
    }
    await this.updateEmbeddedDocuments('Combatant',this.combatants.map(c=>({_id:c.id,'flags.fdern.activated':false})));
    await this.setFlag('fdern','bag',this.makeBag());await chat(null,`Round ${this.round}`,`<p>${this.makeBag().length} activation tokens. Reactions refreshed; reserved reactions remain reserved.</p>`);
  }
  makeBag(){return bagFor(this.combatants.map(c=>({side:sideOf(c),eligible:eligible(c),defeated:c.defeated,activated:c.getFlag('fdern','activated')})));}
  async draw(){if(!game.user.isGM)throw Error('Only the GM can draw a side.');if(!this.started)throw Error('Start the encounter first.');if(this.getFlag('fdern','activeId'))throw Error('End the current activation first.');
    const bag=this.makeBag();let pending=this.getFlag('fdern','drawnSide');if(pending&&bag.includes(pending))return pending;
    const result=drawSide(bag);await this.update({'flags.fdern.drawnSide':result.side??'','flags.fdern.bag':result.bag});
    if(result.side)await chat(null,'Side drawn',`<p><b>${escapeHTML(result.side)}</b> chooses an eligible unactivated combatant.</p>`);return result.side;
  }
  async activate(id,{ambush=false}={}){
    if(!game.user.isGM)throw Error('Only the GM can activate a combatant.');const c=this.combatants.get(id);
    if(!c||!eligible(c)||c.getFlag('fdern','activated'))throw Error('Combatant is not eligible.');if(this.getFlag('fdern','activeId'))throw Error('End the current activation first.');
    if(ambush){if(this.round!==1||(this.getFlag('fdern','ambushCount')??0)>=3||this.getFlag('fdern','normalStarted'))throw Error('Ambush is limited to three opening activations in round one.');await this.setFlag('fdern','ambushCount',(this.getFlag('fdern','ambushCount')??0)+1);}
    else {if(sideOf(c)!==this.getFlag('fdern','drawnSide'))throw Error('Choose a combatant from the drawn side.');await this.setFlag('fdern','normalStarted',true);}
    const state=c.actor.system.combat;
    for(const ally of this.combatants){if(ally.actor?.system.combat.spot.expiresActivation===c.actor.uuid)await ally.actor.update({'system.combat.spot.target':''});}
    await c.actor.update({'system.combat.actionsRemaining':Math.min(ambush?2:3,allowance(state)),'system.combat.attackPenalty':0,'system.combat.attacks':0,'system.combat.activationSerial':state.activationSerial+1,'system.combat.moved':false,'system.combat.moveRemaining':0,'system.combat.moveMode':'','system.combat.aimTarget':'','system.combat.aimWeapon':'','system.combat.takeCover':false,'system.combat.overwatch.active':false,'system.combat.reactionAvailable':state.overwatch.active?true:state.reactionAvailable,'system.combat.coverAlly':'','system.combat.controlUsed':false,'system.combat.flash':false});
    await this.update({turn:this.turns.findIndex(t=>t.id===id),'flags.fdern.activeId':id,'flags.fdern.drawnSide':''});
    await chat(c.actor,ambush?'Ambush activation':'Activation',`<p>${c.actor.system.combat.actionsRemaining} Actions, Move ${c.actor.system.tactical.move} ft.</p>`);return c;
  }
  async endActivation(){if(!game.user.isGM)throw Error('Only the GM can end an activation.');const c=this.combatants.get(this.getFlag('fdern','activeId'));if(!c)return this;
    await game.fdern.resolveHazards(c.actor);const s=c.actor.system.combat;
    const updates={'system.combat.actionsRemaining':0,'system.combat.moveRemaining':0,'system.combat.aimTarget':'','system.combat.aimWeapon':''};
    if(s.stunEffect&&s.stunActivation!==`${this.id}:${this.round}:${c.id}`)Object.assign(updates,{'system.combat.stunEffect':0,'system.combat.stunUsed':false});
    await c.actor.update(updates);await c.setFlag('fdern','activated',true);
    await this.update({turn:null,'flags.fdern.activeId':''});return this;
  }
  async nextTurn(){if(this.getFlag('fdern','activeId'))await this.endActivation();if(!this.makeBag().length)return this.nextRound();await this.draw();game.fdern.encounter.render({force:true});return this;}
  async nextRound(){if(!game.user.isGM)throw Error('Only the GM can advance rounds.');if(this.getFlag('fdern','activeId')||this.makeBag().length)throw Error('Finish all eligible activations before advancing the round.');
    for(const c of this.combatants){if(!c.actor)continue;const next=endRound(c.actor.system.combat);const u={'system.combat.pressure':next.pressure,'system.combat.tookPressureThisRound':false,'system.combat.bleedMarks':next.bleedMarks,'system.combat.dead':next.dead};
      if(c.actor.system.combat.stunExpiresRound<=this.round&&c.actor.system.combat.stunEffect)Object.assign(u,{'system.combat.stunEffect':0,'system.combat.stunUsed':false});
      const spot=c.actor.system.combat.spot;if(spot.expiresRound&&spot.expiresRound<=this.round)u['system.combat.spot.target']='';await c.actor.update(u);
    }
    await game.fdern.expireAreas(this.round);await this.update({round:this.round+1,turn:null,'flags.fdern.drawnSide':''});await this.beginRound();return this;
  }
  async previousTurn(){throw Error('Use the GM resource controls to correct an activation; bag activations cannot be rewound.');}
  async previousRound(){throw Error('Use the GM resource controls to correct the round.');}
  async rollInitiative(){await this.draw();game.fdern.encounter.render({force:true});return this;}
  async rollAll(){return this.rollInitiative();}
  async rollNPC(){return this.rollInitiative();}
  async endCombat(){if(this.getFlag('fdern','activeId'))await this.endActivation();for(const c of this.combatants){if(!c.actor)continue;await c.actor.update({'system.combat.actionsRemaining':0,'system.combat.overwatch.active':false,'system.combat.aimTarget':'','system.combat.moveRemaining':0});}return super.endCombat();}
}
