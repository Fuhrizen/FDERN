export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dataOf = doc => doc?.toObject?.()??structuredClone(doc);
export const ownerFor = actor => game.users.find(u=>u.active&&!u.isGM&&actor.testUserPermission(u,'OWNER'))??game.users.activeGM;
export const tokenFor = actor => actor?.token??canvas.tokens?.placeables?.find(t=>t.actor?.uuid===actor?.uuid)?.document;
export const combatantFor = actor => game.combat?.combatants.find(c=>c.actor?.uuid===actor?.uuid);
export const isActive = actor => game.combat?.combatant?.actor?.uuid===actor?.uuid;
export const learned = actor => actor.items.filter(i=>i.type==='discipline').map(i=>i.system.disciplineId);
export const has = (item,trait) => item?.system.traits.includes(trait);
export const readied = actor => actor.items.filter(i=>i.system.readied&&!i.system.broken);
export async function chat(actor,title,body,rolls=[],extra={}) {
  const content=`<article class="fdern chat-card"><header><strong>${escapeHTML(title)}</strong><span>${escapeHTML(actor?.name??'FDERN')}</span></header>${body}</article>`;
  const message={speaker:foundry.documents.ChatMessage.getSpeaker({actor}),content,rolls,...extra};
  foundry.documents.ChatMessage.applyMode(message,game.settings.get('core','messageMode'));
  return foundry.documents.ChatMessage.create(message);
}
export async function rollTest(actor,attribute,skill,dc=9,modifier=0,label='Test') {
  if(!(attribute in actor.system.attributes)||!(skill in actor.system.skills)||!Number.isFinite(dc)||!Number.isFinite(modifier))throw Error('Invalid Test inputs.');const {personalBonus,stunPenalty}=await import('./rules.mjs');const penalty=stunPenalty(actor.system.combat,'test',skill);const bonus=personalBonus(actor.system.attributes[attribute],actor.system.skills[skill]);
  const roll=await new foundry.dice.Roll(`2d6 + ${bonus} + ${modifier} - ${penalty}`).evaluate();
  if(penalty)await actor.update({'system.combat.stunUsed':true});
  await chat(actor,label,`<p>${escapeHTML(attribute)} + ${escapeHTML(skill)}: personal +${bonus}, modifier ${modifier}, Stun -${penalty}.</p><p><b>${roll.total}</b> vs DC ${dc}: ${roll.total>=dc?'Success':'Failure'}</p>`,[roll]);return roll;
}
export async function input(title,content,label='Continue') {return foundry.applications.api.DialogV2.prompt({window:{title},content,ok:{label,callback:(_event,button)=>Object.fromEntries(new FormData(button.form))},rejectClose:false});}
export async function choose(title,options,field='choice') {const r=await input(title,`<label>${escapeHTML(title)}<select name="${field}">${options.map(o=>`<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`).join('')}</select></label>`);return r?.[field];}
export async function controllerInput(actor,title,content) {
  const user=ownerFor(actor);if(!user)throw Error('A connected controller is required.');
  if(user.id===game.user.id)return input(title,content);
  return foundry.applications.api.DialogV2.query(user,'input',{window:{title},content,rejectClose:false});
}
export function guard(fn){return async(...args)=>{try{return await fn(...args);}catch(e){console.error('FDERN',e);ui.notifications.error(e.message);}};}
