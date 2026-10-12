import {isActive,combatantFor,readied,input,escapeHTML} from './utils.mjs';
import {centre,polygonFor,segmentCrosses,segmentIntersection,pointInPolygon} from './geometry.mjs';
import {moveDistance} from './rules.mjs';
import {distanceBetween,inRegion} from './terrain.mjs';
import {serial} from './socket.mjs';
const moves=new Map(),bookkeeping=new Map();
function pathDifficulty(movement){const points=movement.pending.waypoints;for(const region of canvas.scene.regions){if(!region.getFlag('fdern','terrain')?.difficult)continue;for(let i=1;i<points.length;i++)if(region.shapes.some(s=>!s.hole&&segmentCrosses(points[i-1],points[i],polygonFor(s))))return true;}return false;}
function costFor(token,movement){const c=token.actor.system.combat;const ordinary=moveDistance(c,{heavy:readied(token.actor).some(i=>i.system.traits.includes('heavy')||i.system.movePenalty>0)});const difficult=c.moveMode==='move'&&pathDifficulty(movement);const adjusted=difficult?Math.max(5,ordinary-5):ordinary;return movement.pending.distance*(difficult?ordinary/adjusted:1);}
function pathPositions(token,waypoints){let previous={x:token.x,y:token.y,elevation:token.elevation,level:token.level};const positions=[previous];for(const waypoint of waypoints){const next={...previous,...waypoint};if(next.x!==previous.x||next.y!==previous.y||next.elevation!==previous.elevation)positions.push(next);previous=next;}return positions;}
export function triggersFor(token,waypoints){
  const path=pathPositions(token,waypoints);const actor=token.actor;const triggers=[];
  for(const c of game.combat.combatants){if(!c.actor||!c.token||c.actor.uuid===actor.uuid||c.token.disposition===token.disposition)continue;const s=c.actor.system.combat,o=s.overwatch;if(s.wounds>=3||s.dead||s.recoveryPending)continue;
    const reach=Math.max(5,...readied(c.actor).filter(i=>i.type==='melee').map(i=>i.system.reach));const region=o.regionId?canvas.scene.regions.find(r=>r.id===o.regionId):null;let trigger;
    for(let i=1;i<path.length&&!trigger;i++){
      const a={...token.toObject(),...path[i-1]},b={...token.toObject(),...path[i]};const ac=centre(a,canvas.grid.size),bc=centre(b,canvas.grid.size);
      if(o.active&&o.kind==='overwatch'&&region){const ts=[];for(const shape of region.shapes.filter(s=>!s.hole)){const poly=polygonFor(shape);for(let j=0;j<poly.length;j++){const t=segmentIntersection(ac,bc,poly[j],poly[(j+1)%poly.length]);if(t!==null)ts.push(t);}}
        if(ts.length&&!inRegion(region,ac,a.elevation)){const t=Math.min(...ts);trigger={combatant:c,segment:i,t,checkpoint:{...path[i-1],x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},kind:'reserved'};}
      }else if(o.active&&o.kind==='overwatch'&&!region){trigger={combatant:c,segment:i,t:0,checkpoint:path[i-1],kind:'manual'};}
      else if(o.active&&o.kind==='intercept'||!o.active&&s.reactionAvailable){
        // A fine sample locates the Reach boundary while the native path remains authoritative.
        const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(canvas.grid.size/10)));let last=a,lastInside=distanceBetween(a,c.token)<=reach;
        for(let n=1;n<=count;n++){const t=n/count,p={...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},inside=distanceBetween(p,c.token)<=reach;
          if(o.active&&o.kind==='intercept'&&!lastInside&&inside){trigger={combatant:c,segment:i,t,checkpoint:p,kind:'reserved'};break;}
          if(!o.active&&s.reactionAvailable&&lastInside&&!inside){trigger={combatant:c,segment:i,t:(n-1)/count,checkpoint:last,kind:'opportunity'};break;}
          last=p;lastInside=inside;
        }
      }
    }
    if(trigger)triggers.push(trigger);
  }return triggers.sort((a,b)=>a.segment-b.segment||a.t-b.t);
}
export function registerMovement(){
  Hooks.on('preMoveToken',(token,movement,operation)=>{
    const actor=token.actor;if(!actor||!game.combat?.started||!combatantFor(actor)||!game.settings.get('fdern','enforceMovement'))return;
    if(game.user.isGM&&operation.fdernOverride)return;
    const c=actor.system.combat;if(c.dead||c.wounds>=3||c.recoveryPending){ui.notifications.warn('This character cannot move.');return false;}
    if(!isActive(actor)&&!['dive','forced'].includes(c.moveMode)){ui.notifications.warn('Wait for this character’s activation.');return false;}
    if(c.moveMode==='move'&&c.pressure>=7){ui.notifications.warn('Overwhelmed: Rally or Step into Cover.');return false;}
    if(readied(actor).some(i=>i.system.deployed)&&c.moveMode!=='forced'){ui.notifications.warn('Pickup the deployed weapon first.');return false;}
    const spent=costFor(token,movement);if(spent>c.moveRemaining+0.001){ui.notifications.warn(`Buy a Move first. ${c.moveRemaining} ft remain; this path costs ${Math.round(spent)} ft.`);return false;}
    if(c.grappledBy||c.grappling){const other=canvas.tokens.placeables.find(t=>t.actor?.uuid===(c.grappledBy||c.grappling));const end={...token.toObject(),...movement.destination};if(other&&distanceBetween(end,other.document)>5){ui.notifications.warn('The grapple prevents separation beyond 5 ft.');return false;}}
    if(!(game.user.isGM&&operation.fdernReviewed)&&!['forced','disengage','dive','lunge'].includes(c.moveMode)&&triggersFor(token,movement.pending.waypoints).length){game.fdern.interruptMovement(token,movement).catch(e=>ui.notifications.error(e.message));return false;}
    moves.set(movement.id,spent);
  });
  Hooks.on('moveToken',(token,movement,operation,user)=>{
    if(game.users.activeGM?.id!==game.user.id||!token.actor||!game.combat?.started||!combatantFor(token.actor)||operation.fdernOverride)return;
    const spent=moves.get(movement.id)??costFor(token,movement);moves.delete(movement.id);const c=token.actor.system.combat;
    // Bookkeeping is immediate while an attack is awaiting a Dive/Lunge controller query.
    const task=token.actor.update({'system.combat.moveRemaining':Math.max(0,c.moveRemaining-spent),'system.combat.moved':c.moveMode==='forced'?c.moved:true,'system.combat.aimTarget':'','system.combat.aimWeapon':'','system.combat.takeCover':false});bookkeeping.set(token.uuid,task);
    task.then(()=>{if(!operation.fdernReviewed)return serial(()=>game.fdern.resolveHazards(token.actor));}).catch(e=>ui.notifications.error(e.message));
  });
}
export async function interruptMovement(token,movement){return game.fdern.request({type:'movement-interrupt',actor:token.actor.uuid,token:token.uuid,origin:movement.origin,destination:movement.destination,waypoints:movement.pending.waypoints});}
export async function resolveMovementInterrupt(actor,request,execute){
  const token=await fromUuid(request.token);if(token?.actor?.uuid!==actor.uuid)throw Error('Invalid movement token.');if(token.x!==request.origin.x||token.y!==request.origin.y)throw Error('Token position changed; plan movement again.');
  const positions=pathPositions(token,request.waypoints);const triggers=triggersFor(token,request.waypoints);let lastSegment=1;
  for(const trigger of triggers){const c=trigger.combatant,s=c.actor.system.combat,o=s.overwatch;if(!o.active&&!s.reactionAvailable)continue;
    const choice=await input('Movement interrupt',`<p>${escapeHTML(c.name)}: ${o.active?`${escapeHTML(o.kind)} — ${escapeHTML(o.lane)}`:'Opportunity Strike as the enemy leaves Reach'}. ${trigger.kind==='manual'?'Confirm the declared lane and use a native checkpoint if exact geometry differs.':'The token will pause at the Region/Reach crossing before resolution.'}</p><select name="trigger"><option value="no">No trigger</option><option value="yes">Resolve Reaction at checkpoint</option></select>`);
    if(choice?.trigger!=='yes')continue;
    const prefix=[...positions.slice(lastSegment,trigger.segment),trigger.checkpoint];if(prefix.length){const completed=await token.move(prefix,{fdernReviewed:true});await bookkeeping.get(token.uuid);if(!completed)return false;}
    await game.fdern.resolveHazards(actor);if(actor.system.combat.wounds>=3||actor.system.combat.dead)return false;
    if(o.active)await execute({type:'reaction-shot',actor:c.actor.uuid,target:token.uuid},game.user);else await game.fdern.opportunity(c.actor,token);
    if(actor.system.combat.wounds>=3||actor.system.combat.dead)return false;lastSegment=trigger.segment;
  }
  const completed=await token.move(positions.slice(lastSegment),{fdernReviewed:true});await bookkeeping.get(token.uuid);await game.fdern.resolveHazards(actor);return completed;
}
