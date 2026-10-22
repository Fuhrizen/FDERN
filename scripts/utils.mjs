import {ACTIONS,ATTRIBUTES,SKILLS} from './config.mjs';

export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dataOf = doc => doc?.toObject?.()??structuredClone(doc);
export const ownerFor = actor => game.users.find(u=>u.active&&!u.isGM&&actor.testUserPermission(u,'OWNER'))??game.users.activeGM;
export const tokenFor = actor => actor?.token??canvas.tokens?.placeables?.find(t=>t.actor?.uuid===actor?.uuid)?.document;
export const combatantFor = actor => game.combat?.combatants.find(c=>c.actor?.uuid===actor?.uuid);
export const isActive = actor => game.combat?.combatant?.actor?.uuid===actor?.uuid;
export const learned = actor => actor.items.filter(i=>i.type==='discipline').map(i=>i.system.disciplineId);
export const has = (item,trait) => item?.system.traits.includes(trait);
export const readied = actor => actor.items.filter(i=>i.system.readied&&!i.system.broken);
const chatActionMarkup=(actor,actions=[])=>{
  if(!actor)return '';
  const contextual=[{type:'open-actor',label:'Open Character'},...actions];
  const usable=contextual.filter(action=>action&&['act','test','open-actor','open-item'].includes(action.type));
  if(!usable.length)return '';
  return `<footer class="fdern-chat-actions">${usable.map(action=>{
    const attrs=`data-fdern-chat-action="${escapeHTML(action.type)}" data-actor="${escapeHTML(actor.uuid)}"`;
    if(action.type==='act')return `<button type="button" ${attrs} data-command="${escapeHTML(action.command)}" data-item="${escapeHTML(action.item??'')}">${escapeHTML(action.label??action.command)}</button>`;
    if(action.type==='test')return `<button type="button" ${attrs} data-attribute="${escapeHTML(action.attribute)}" data-skill="${escapeHTML(action.skill)}" data-dc="${escapeHTML(action.dc??9)}" data-modifier="${escapeHTML(action.modifier??0)}">${escapeHTML(action.label??'Roll Test')}</button>`;
    if(action.type==='open-item')return `<button type="button" ${attrs} data-item="${escapeHTML(action.item??'')}">${escapeHTML(action.label??'Open Item')}</button>`;
    return `<button type="button" ${attrs}>${escapeHTML(action.label??'Open Character')}</button>`;
  }).join('')}</footer>`;
};
export async function chat(actor,title,body,rolls=[],extra={},actions=[]) {
  const content=`<article class="fdern chat-card"><header><strong>${escapeHTML(title)}</strong><span>${escapeHTML(actor?.name??'FDERN')}</span></header><div class="fdern-chat-content">${body}</div>${chatActionMarkup(actor,actions)}</article>`;
  const message={speaker:foundry.documents.ChatMessage.getSpeaker({actor}),content,rolls,...extra};
  foundry.documents.ChatMessage.applyMode(message,game.settings.get('core','messageMode'));
  return foundry.documents.ChatMessage.create(message);
}
export async function rollTest(actor,attribute,skill,dc=9,modifier=0,label='Test') {
  if(!Object.hasOwn(actor.system.attributes,attribute)||!Object.hasOwn(actor.system.skills,skill)||!Number.isFinite(dc)||!Number.isFinite(modifier))throw Error('Invalid Test inputs.');const {personalBonus,stunPenalty}=await import('./rules.mjs');const penalty=stunPenalty(actor.system.combat,'test',skill);const bonus=personalBonus(actor.system.attributes[attribute],actor.system.skills[skill]);
  const roll=await new foundry.dice.Roll(`2d6 + ${bonus} + ${modifier} - ${penalty}`).evaluate();
  if(penalty)await actor.update({'system.combat.stunUsed':true});
  const body=`<p><strong>${roll.total} vs DC ${dc}: ${roll.total>=dc?'Success':'Failure'}</strong></p><dl class="fdern-chat-breakdown"><div><dt>Approach</dt><dd>${escapeHTML(ATTRIBUTES[attribute])} + ${escapeHTML(SKILLS[skill])}</dd></div><div><dt>Personal</dt><dd>+${bonus}</dd></div><div><dt>Modifier</dt><dd>${modifier>=0?'+':''}${modifier}</dd></div><div><dt>Stun</dt><dd>-${penalty}</dd></div></dl>`;
  await chat(actor,label,body,[roll],{},[
    {type:'test',attribute,skill,dc,modifier,label:`Roll ${SKILLS[skill]}`}
  ]);return roll;
}

export async function dispatchChatAction(button){
  const {fdernChatAction:type,actor:uuid,item:itemId,command,attribute,skill,dc,modifier}=button.dataset;
  if(!['act','test','open-actor','open-item'].includes(type))throw Error('Unknown chat action.');
  const actor=await fromUuid(uuid);if(!actor||actor.documentName!=='Actor'||!actor.testUserPermission(game.user,'OWNER'))throw Error('You do not own this Actor.');
  if(type==='act'){
    if(!Object.hasOwn(ACTIONS,command))throw Error('This chat action is not available.');
    const item=actor.items.get(itemId);if(!item)throw Error('This item is no longer on the Actor.');
    if(!game.fdern?.act)throw Error('FDERN actions are not ready yet.');return game.fdern.act(actor,command,item);
  }
  if(type==='test'){
    if(!Object.hasOwn(actor.system.attributes,attribute)||!Object.hasOwn(actor.system.skills,skill)||!Number.isFinite(Number(dc))||!Number.isFinite(Number(modifier)))throw Error('This Test is no longer valid.');
    return rollTest(actor,attribute,skill,Number(dc),Number(modifier),`${SKILLS[skill]} Test`);
  }
  if(type==='open-actor')return actor.sheet?.render({force:true});
  if(type==='open-item'){
    const item=actor.items.get(itemId);if(!item)throw Error('This item is no longer on the Actor.');return item.sheet?.render({force:true});
  }
  throw Error('Unknown chat action.');
}
export function bindChatActions(html){
  for(const button of html.querySelectorAll('[data-fdern-chat-action]')){
    if(button.dataset.fdernBound)continue;button.dataset.fdernBound='true';
    button.addEventListener('click',guard(()=>dispatchChatAction(button)));
  }
}
// Use native form groups in every local or remote DialogV2 prompt.
export function dialogContent(content){
  if(!globalThis.document?.createElement)return content;
  const template=document.createElement('template');template.innerHTML=content;
  for(const label of template.content.querySelectorAll('label')){
    if(label.closest('.form-group'))continue;
    const controls=[...label.children].filter(el=>el.matches('input, select, textarea'));
    if(!controls.length)continue;
    const group=document.createElement('div');group.className='form-group';
    const fields=document.createElement('div');fields.className='form-fields';
    label.replaceWith(group);group.append(label,fields);
    for(const control of controls){control.id||=`fdern-${foundry.utils.randomID()}`;fields.append(control);}
    label.htmlFor=controls[0].id;
    if(controls.some(el=>el.tagName==='TEXTAREA'))group.classList.add('stacked');
  }
  return `<div class="standard-form">${template.innerHTML}</div>`;
}
export async function input(title,content,label='Continue') {return foundry.applications.api.DialogV2.prompt({classes:['fdern','standard-form'],window:{title},content:dialogContent(content),ok:{label,callback:(_event,button)=>Object.fromEntries(new FormData(button.form))},rejectClose:false});}
export async function choose(title,options,field='choice') {const r=await input(title,`<label>${escapeHTML(title)}<select name="${field}">${options.map(o=>`<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`).join('')}</select></label>`);return r?.[field];}
export async function controllerInput(actor,title,content) {
  const user=ownerFor(actor);if(!user)throw Error('A connected controller is required.');
  if(user.id===game.user.id)return input(title,content);
  return foundry.applications.api.DialogV2.query(user,'input',{classes:['fdern','standard-form'],window:{title},content:dialogContent(content),rejectClose:false});
}
export function guard(fn){return async(...args)=>{try{return await fn(...args);}catch(e){console.error('FDERN',e);ui.notifications.error(e.message);}};}

// Preserve native disclosure state across document-driven sheet renders.
export function wireDisclosures(application){
  application._disclosures??=new Set();
  for(const element of application.element.querySelectorAll('details[data-disclosure]')){
    const key=element.dataset.disclosure;element.open=application._disclosures.has(key);
    element.addEventListener('toggle',()=>{if(element.open)application._disclosures.add(key);else application._disclosures.delete(key);});
  }
}
