import {LEGACY_CONDITION_ARTWORK} from './artwork.mjs';
// Reconcile only system-managed native ActiveEffects. Queue by document UUID so
// overlapping actor updates cannot create duplicates or leave an old condition.
const queues=new Map();
export function desiredConditions(actor){
  const c=actor.system.combat;
  return {dead:c.dead,down:c.wounds>=3,impaired:c.wounds===2,threatened:c.pressure>=2&&c.pressure<5,pinned:c.pressure>=5&&c.pressure<7,overwhelmed:c.pressure>=7,prone:c.prone,'take-cover':c.takeCover,grappled:!!(c.grappledBy||c.grappling),stunned:c.stunEffect>0,overwatch:c.overwatch.active};
}
export function syncConditions(actor){
  if(!actor.system?.combat)return Promise.resolve();
  const previous=queues.get(actor.uuid)??Promise.resolve();
  const task=previous.catch(()=>{}).then(async()=>{
    for(const id of Object.keys(desiredConditions(actor))){
      const active=desiredConditions(actor)[id];
      const effects=actor.effects.filter(e=>e.getFlag('fdern','condition')===id);
      for(const effect of effects.slice(active?1:0))await effect.delete();
      if(active&&effects[0]?.img===LEGACY_CONDITION_ARTWORK[id]){const status=CONFIG.statusEffects.find(s=>s.id===id);if(status?.img&&status.img!==effects[0].img)await effects[0].update({img:status.img});}
      if(active&&!effects.length){const status=CONFIG.statusEffects.find(s=>s.id===id);if(status)await actor.createEmbeddedDocuments('ActiveEffect',[{name:status.name,img:status.img,statuses:[id],changes:[],flags:{fdern:{condition:id}}}]);}
    }
  });
  queues.set(actor.uuid,task);
  const clear=()=>{if(queues.get(actor.uuid)===task)queues.delete(actor.uuid);};task.then(clear,clear);
  return task;
}
