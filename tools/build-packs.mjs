import {mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compilePack} from '@foundryvtt/foundryvtt-cli';
import {CATALOGUE,disciplineItem,actionItem} from '../scripts/catalogue.mjs';
import {DISCIPLINES,ACTIONS,ICON,UNIVERSAL} from '../scripts/config.mjs';
const stableId=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
const folders=new Map();
function folder(pack,name,parent=null){const key=`${pack}:${parent??''}:${name}`;if(!folders.has(key))folders.set(key,{_id:stableId(key),name,type:pack==='macros'?'Macro':'Item',folder:parent,sorting:'a',color:'#3a5147',_key:`!folders!${stableId(key)}`});return folders.get(key)._id;}
const macro=(id,name,command)=>({_id:stableId(`macro:${id}`),name,type:'script',img:ICON,command,ownership:{default:0},_key:`!macros!${stableId(`macro:${id}`)}`});
const run=body=>`try { ${body} } catch(error) { ui.notifications.error(error.message); }`;
const macros=Object.entries(ACTIONS).map(([id,a])=>{
  const item=id==='ready'?'actor.items.find(i=>i.system.slot)??null':UNIVERSAL.includes(id)?'null':`actor.items.filter(i=>i.system.actions?.includes(${JSON.stringify(id)})).sort((a,b)=>Number(b.system.readied)-Number(a.system.readied))[0]??null`;
  return macro(id,a.name,run(`const actor=game.fdern.selectedActor(); const item=${item}; await game.fdern.act(actor, ${JSON.stringify(id)}, item);`));
});
macros.push(macro('encounter','Encounter Manager',run('await game.fdern.encounter.render({force:true});')),macro('terrain','Define Cover / Difficult Terrain',run('await game.fdern.terrainEditor();')),macro('wizard','Character Wizard',run('new game.fdern.CharacterWizard({actor:game.fdern.selectedActor()}).render({force:true});')),macro('repack','Repack Magazines',run('const actor=game.fdern.selectedActor(); await game.fdern.request({type:"repack", actor:actor.uuid});')),macro('release','Release Grapple',run('const actor=game.fdern.selectedActor(); await game.fdern.request({type:"release",actor:actor.uuid});')),macro('correct-move','GM: Correct Token Position',run('if (!game.user.isGM) throw Error("GM only."); const token=canvas.tokens.controlled[0]?.document; if(!token)throw Error("Select a token first."); const point=await game.fdern.pickPoint(); if(point)await token.move(point,{fdernOverride:true});')));
const equipment=CATALOGUE.map(item=>{const d=structuredClone(item);delete d.id;d._id=stableId(`equipment:${item.id}`);d._key=`!items!${d._id}`;
  if(item.type==='firearm'){const category=folder('equipment','Weapons');const calibre=folder('equipment',item.system.cartridge,category);d.folder=folder('equipment',item.system.family,calibre);}
  else d.folder=folder('equipment',item.type[0].toUpperCase()+item.type.slice(1));return d;});
const sources=new Map();for(const item of CATALOGUE.filter(i=>['firearm','launcher'].includes(i.type))){const s=item.system,key=`${s.cartridge}:${s.compatibility}:${s.maxLoad}`;if(sources.has(key))continue;const id=stableId(`magazine:${key}`);sources.set(key,{_id:id,_key:`!items!${id}`,name:`${s.compatibility} · ${s.maxLoad} Load`,type:'magazine',img:ICON,folder:folder('equipment','Ammo Sources'),system:{cartridge:s.cartridge,compatibility:s.compatibility,currentLoad:s.maxLoad,maxLoad:s.maxLoad,hands:0}});}
equipment.push(...sources.values());
const disciplines=Object.keys(DISCIPLINES).map(id=>{const d=disciplineItem(id);d._id=stableId(`discipline:${id}`);d._key=`!items!${d._id}`;d.folder=folder('disciplines',d.system.advanced?'Advanced':'Basic');return d;});
const actions=Object.entries(ACTIONS).map(([id,a])=>{const d=actionItem(id,a);d._id=stableId(`action:${id}`);d._key=`!items!${d._id}`;d.folder=folder('actions',a.kind??'Universal & Equipment');return d;});
for(const [name,docs] of Object.entries({equipment,disciplines,actions,macros})){
  const source=`pack-sources/${name}`;await rm(source,{recursive:true,force:true});await mkdir(source,{recursive:true});
  for(const d of [...docs,...Array.from(folders.entries()).filter(([key])=>key.startsWith(`${name}:`)).map(([,d])=>d)])await writeFile(`${source}/${d._id}.json`,JSON.stringify(d,null,2)+'\n');
  await rm(`packs/${name}`,{recursive:true,force:true});await compilePack(source,`packs/${name}`);console.log(`${name}: ${docs.length} documents`);
}
