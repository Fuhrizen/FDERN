import {DISCIPLINES, STUN, ATTRIBUTES, SKILLS} from './config.mjs';
export const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n)||0));
export const personalBonus = (attribute,skill) => Math.min(6,Number(attribute||0)+Number(skill||0));
export const level = vp => [0,8,20,36,55].filter(n=>Number(vp)>=n).length;
export const pressureState = p => p>=7?'Overwhelmed':p>=5?'Pinned':p>=2?'Threatened':'Clear';
export function allowance(c) {return c.dead||c.wounds>=3||c.recoveryPending?0:Math.min(3,c.wounds>=2?2:3,c.pressure>=5?2:3,c.stunEffect===6?2:3);}
export function moveDistance(c,{heavy=false,difficult=false}={}) {
  if(c.dead||c.wounds>=3||c.recoveryPending)return 0;
  if(c.prone)return 5;
  return Math.max(5,15-(c.wounds>=2?5:0)-(c.stunEffect===4?5:0)-(heavy?5:0)-(difficult?5:0));
}
export function injury(die,harm,penetration,armour,absorption=0) {const effectiveArmour=Math.max(0,armour-penetration);const result=die+Math.max(0,harm-absorption)-effectiveArmour;return {result,effectiveArmour,wounds:result>=8?2:result>=5?1:0};}
export const shieldBreaks = (harm,absorption) => harm>=2*absorption;
export function incomingPressure(amount,{covered=false,takeCover=false,direct=false}={}) {return Math.max(direct?1:0,amount-(covered&&takeCover?1:0));}
export function attackDC(c,weapon,{cover=0,distance=0,visibility=false,takeCover=false,reaction=0,engaged=false,suppress=false,closeBlast=false}={}) {
  if(cover===3)throw Error('Complete Cover blocks direct targeting.');
  if(distance>weapon.maximum)throw Error('Target is beyond maximum range.');
  if(suppress&&distance>weapon.effective)throw Error('Suppression requires effective range.');
  const traits=weapon.traits??[];const rows=[{label:'Base',value:9}];
  const add=(label,value)=>{if(value)rows.push({label,value});};
  add('Cover',cover);add('Take Cover',cover>0&&takeCover?1:0);add('Moved before firing',c.moved&&!traits.includes('assault')?2:0);
  add('Long range',distance>weapon.effective?1:0);add('Visibility',visibility?1:0);
  if(!suppress){add('Pressure',c.pressure>=7?2:c.pressure>=2?1:0);add('Engaged long firearm',engaged&&weapon.hands===2?2:0);add('Reaction',reaction);}
  add('Close Blast',closeBlast?1:0);add('Flash',c.flash?1:0);
  return {dc:rows.reduce((n,r)=>n+r.value,0),rows};
}
export function stunPenalty(c,kind,skill) {
  const relevant=c.stunEffect===2 || (c.stunEffect===3&&(kind==='melee'||skill==='mobility')) || (c.stunEffect===5&&kind==='ranged');
  return relevant&&!c.stunUsed?1:0;
}
export function repack(sources) {
  const groups=new Map();for(const m of sources){const key=`${m.cartridge}\0${m.compatibility}\0${m.maxLoad}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
  const output=[];for(const ms of groups.values()){let total=ms.reduce((n,m)=>n+m.currentLoad,0);for(const m of ms){const load=Math.min(m.maxLoad,total);output.push({...m,currentLoad:load});total-=load;}}
  return output;
}
export function qualifies(id,skills,learned) {
  const d=DISCIPLINES[id];if(!d)return false;return (skills[d.skill]??0)>=d.rank&&(!d.any||d.any.some(x=>learned.includes(x)))&&(!d.all||d.all.every(x=>learned.includes(x)))&&(!d.basic||learned.some(x=>DISCIPLINES[x]&&!DISCIPLINES[x].advanced));
}
export function validateCreation(draft) {
  const errors=[];const attrs=Object.values(ATTRIBUTES).map((_,i)=>draft.attributes[Object.keys(ATTRIBUTES)[i]]??0);const skills=Object.keys(SKILLS).map(k=>draft.skills[k]??0);
  if(attrs.some(x=>!Number.isInteger(x)||x<0||x>2)||attrs.reduce((a,b)=>a+b,0)!==5)errors.push('Spend exactly 5 Attribute points (maximum 2 each).');
  if(skills.some(x=>!Number.isInteger(x)||x<0||x>3)||skills.reduce((a,b)=>a+b,0)!==10)errors.push('Spend exactly 10 Skill points (maximum 3 each).');
  if(draft.disciplines.length!==2||new Set(draft.disciplines).size!==2||draft.disciplines.some(id=>!qualifies(id,draft.skills,[])||DISCIPLINES[id].advanced))errors.push('Choose two eligible basic Disciplines.');
  if(!draft.name?.trim())errors.push('Give the character a name.');return errors;
}
export function advancementCost(kind,current=0) {if(kind==='skill')return [2,3,5,8][current]??Infinity;if(kind==='attribute')return 12;return kind==='advanced'?7:4;}
export function endRound(c) {
  const next={...c,pressure:c.tookPressureThisRound?c.pressure:Math.max(0,c.pressure-2),tookPressureThisRound:false};
  if((c.bleeding??c.wounds>=3)&&!c.stabilised&&!c.dead){next.bleedMarks=Math.min(3,c.bleedMarks+1);next.dead=next.bleedMarks>=3;}
  return next;
}
export const stunLabel = value => STUN[value]??STUN[0];
export function bagFor(combatants) {return combatants.filter(c=>!c.activated&&!c.defeated&&c.eligible).map(c=>c.side);}
export function drawSide(bag,random=Math.random) {if(!bag.length)return {bag:[],side:null};const i=Math.min(bag.length-1,Math.floor(random()*bag.length));return {side:bag[i],bag:bag.filter((_,n)=>n!==i)};}
export function burstDiscipline(family){return ['smg','machine-pistol'].includes(family)?'smg-handling':family==='support'?'automatic-fire':'riflecraft';}
