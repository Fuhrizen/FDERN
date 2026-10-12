import {sideOf,eligible} from './combat.mjs';
import {guard,tokenFor} from './utils.mjs';
export class EncounterManager extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS={id:'fdern-encounter',classes:['fdern','encounter-manager'],position:{width:760,height:580},window:{title:'FDERN Encounter',resizable:true,icon:'fas fa-dice'},actions:{dispatch:EncounterManager.dispatch}};
  static PARTS={body:{template:'systems/fdern/templates/encounter.hbs',scrollable:['.encounter-list']}};
  async _prepareContext(){const combat=game.combat;const side=combat?.getFlag('fdern','drawnSide');const active=combat?.getFlag('fdern','activeId');const bag=combat?.makeBag()??[];
    return {hasCombat:!!combat,started:combat?.started,round:combat?.round??0,isGM:game.user.isGM,side,active,complete:combat?.started&&!active&&!bag.length,bag:Array.from(new Set(bag)).map(side=>({side,count:bag.filter(x=>x===side).length})),rows:combat?.combatants.filter(c=>game.user.isGM||!c.hidden).map(c=>({id:c.id,name:c.name,img:c.img,side:sideOf(c),hidden:c.hidden,active:c.id===active,activated:c.getFlag('fdern','activated'),eligible:eligible(c),selectable:eligible(c)&&!c.getFlag('fdern','activated')&&!active&&side===sideOf(c)&&(game.user.isGM||c.actor.isOwner),owner:game.user.isGM||c.actor?.isOwner,combat:c.actor?.system.combat,tactical:c.actor?.system.tactical,reserved:c.actor?.system.combat.overwatch.active}))??[]};}
  static async dispatch(event,target){return guard(async()=>{const command=target.dataset.command,id=target.dataset.id;if(command==='sheet'){const c=game.combat.combatants.get(id);return c.actor?.sheet.render({force:true});}
    if(command==='create'){if(!game.user.isGM)throw Error('Only the GM creates encounters.');const combat=await foundry.documents.Combat.create({scene:canvas.scene?.id,active:true});const tokens=canvas.tokens.controlled;if(tokens.length)await combat.createEmbeddedDocuments('Combatant',tokens.map(t=>({tokenId:t.id,actorId:t.actor.id,sceneId:canvas.scene.id})));return this.render();}
    if(command==='shot'){const actor=game.combat.combatants.get(id).actor;const t=game.user.targets.first();if(!t)throw Error('Target the triggering enemy first.');return game.fdern.request({type:'reaction-shot',actor:actor.uuid,target:t.document.uuid});}
    let side;if(command==='side'){const {input}=await import('./utils.mjs');const r=await input('Combat side','<label>Side name<input name="side" value="Opposition"></label>');if(!r)return;side=r.side;}
    return game.fdern.request({type:'encounter',combat:game.combat.id,command,id,side,ambush:target.dataset.ambush==='true'});
  })();}
}
