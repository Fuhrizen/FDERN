import {centre,edgeDistance,polygonFor,segmentCrosses,pointInPolygon} from './geometry.mjs';
import {input,escapeHTML,tokenFor} from './utils.mjs';
export const distanceBetween = (a,b) => edgeDistance(a,b,canvas.grid.size,canvas.scene.grid.distance);
export function inRegion(region,p,elevation=0){const e=region.elevation;if(e&&(e.bottom!==null&&elevation<e.bottom||e.top!==null&&elevation>e.top))return false;return region.shapes.some(s=>!s.hole&&pointInPolygon(p,polygonFor(s)))&&!region.shapes.some(s=>s.hole&&pointInPolygon(p,polygonFor(s)));}
export function coverBetween(source,target){
  if(!source||!target)return {cover:0,visibility:false,rows:[]};const a=centre(source,canvas.grid.size),b=centre(target,canvas.grid.size);let cover=0,visibility=false;const rows=[];
  // Cover belongs to the attack path, never to a token's proximity to an obstacle.
  for(const r of canvas.scene.regions){if(source.level!==target.level)continue;const data=r.getFlag('fdern','terrain');if(!data)continue;const crosses=r.shapes.some(s=>!s.hole&&segmentCrosses(a,b,polygonFor(s)));if(!crosses)continue;
    if(r.elevation?.bottom!==null&&r.elevation?.bottom>(source.elevation+target.elevation)/2)continue;if(r.elevation?.top!==null&&r.elevation?.top<(source.elevation+target.elevation)/2)continue;
    if(data.cover){cover=Math.max(cover,data.cover);rows.push(r.name);}if(data.kind==='smoke')visibility=true;
  }
  if(canvas.walls&&CONFIG.Canvas.polygonBackends.sight.testCollision(a,b,{type:'sight',mode:'any'})){cover=3;rows.push('Sight-blocking wall');}
  return {cover,visibility,rows};
}
export function engaged(actor){const token=tokenFor(actor);if(!token)return false;return canvas.tokens.placeables.some(t=>t.actor&&t.actor.uuid!==actor.uuid&&t.document.disposition!==token.disposition&&t.document.disposition!==0&&t.actor.system.combat.wounds<3&&distanceBetween(token,t.document)<=Math.max(5,...t.actor.items.filter(i=>i.system.readied&&i.type==='melee').map(i=>i.system.reach)));}
export async function terrainEditor(){
  if(!game.user.isGM)throw Error('Only the GM can define terrain.');if(!canvas.ready||!canvas.scene||!canvas.regions)throw Error('Open a Scene before defining terrain.');const regions=canvas.regions.controlled.map(r=>r.document);if(!regions.length){canvas.regions.activate();ui.notifications.info('Draw or select a native Region, then open FDERN Terrain.');return;}
  const current=regions[0].getFlag('fdern','terrain')??{};
  const result=await input('FDERN Terrain',`<p>Apply to ${regions.length} selected Region(s). Cover applies only to intersecting attack paths. Use native Walls for solid movement barriers.</p><label>Cover<select name="cover">${[0,1,2,3].map((v,i)=>`<option value="${v}" ${v===current.cover?'selected':''}>${['None','Light (+1 DC)','Hard (+2 DC)','Complete (blocks targeting)'][i]}</option>`).join('')}</select></label><label><input type="checkbox" name="difficult" ${current.difficult?'checked':''}> Difficult terrain (Move -5 ft)</label>`);
  if(!result)return;for(const region of regions){const difficult=!!result.difficult;await region.setFlag('fdern','terrain',{...(region.getFlag('fdern','terrain')??{}),cover:Number(result.cover),difficult});const existing=region.behaviors.find(b=>b.getFlag('fdern','terrainCost'));
    if(existing)await existing.delete();if(difficult){const actions=CONFIG.Token.movement.actions;const difficulties=Object.fromEntries(Object.keys(actions).filter(k=>!actions[k].deriveTerrainDifficulty).map(k=>[k,1.5]));await region.createEmbeddedDocuments('RegionBehavior',[{name:'FDERN Difficult Terrain',type:'modifyMovementCost',system:{difficulties},flags:{fdern:{terrainCost:true}}}]);}
  }
}
export async function confirmGeometry(actor,target,weapon,{suppression=false}={}) {
  const token=tokenFor(actor);const measured=token&&target?distanceBetween(token,target):null;const suggestion=token&&target?coverBetween(token,target):{cover:0,visibility:false,rows:[]};
  const result=await input('Confirm attack geometry',`<p>${escapeHTML(suggestion.rows.join(', ')||'No mapped cover detected')}. Confirm the actual attack path.</p><label>Distance (ft)<input name="distance" type="number" min="0" step="5" value="${measured??5}"></label><label>Cover<select name="cover">${[0,1,2,3].map((v,i)=>`<option value="${v}" ${v===suggestion.cover?'selected':''}>${['None','Light','Hard','Complete'][i]}</option>`).join('')}</select></label><label><input name="visibility" type="checkbox" ${suggestion.visibility?'checked':''}> Smoke / poor visibility (one cause)</label><label><input name="engaged" type="checkbox" ${engaged(actor)?'checked':''}> Engaged</label><label><input name="protected" type="checkbox" ${target?.actor?.system.combat.takeCover?'checked':''}> Take Cover protects from this direction</label>`);
  return result?{distance:Number(result.distance),cover:Number(result.cover),visibility:!!result.visibility,engaged:!!result.engaged,takeCover:!!result.protected,suppress:suppression}:null;
}
