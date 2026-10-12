import {mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compilePack} from '@foundryvtt/foundryvtt-cli';
import {CATALOGUE,disciplineItem,actionItem} from '../scripts/catalogue.mjs';
import {DISCIPLINES,ACTIONS,ICON} from '../scripts/config.mjs';
const stableId=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
const folders=new Map();
function folder(pack,name,parent=null){const key=`${pack}:${parent??''}:${name}`;if(!folders.has(key))folders.set(key,{_id:stableId(key),name,type:pack==='macros'?'Macro':'Item',folder:parent,sorting:'a',color:'#3a5147',_key:`!folders!${stableId(key)}`});return folders.get(key)._id;}
const macro=(id,name,command)=>({_id:stableId(`macro:${id}`),name,type:'script',img:ICON,command,ownership:{default:0},_key:`!macros!${stableId(`macro:${id}`)}`});
const macros=Object.entries({move:'Move',fire:'Fire',aim:'Aim',reload:'Reload',rally:'Rally','take-cover':'Take Cover',strike:'Strike',suppress:'Suppress',burst:'Burst Fire',precision:'Precision Shot',overwatch:'Prepare Overwatch',throw:'Throw Grenade',launch:'Launch Payload','field-dressing':'Field Dressing',stabilise:'Stabilise'}).map(([id,name])=>macro(id,name,`try { await game.fdern.act(game.fdern.selectedActor(), ${JSON.stringify(id)}); } catch(error) { ui.notifications.error(error.message); }`));
macros.push(macro('encounter','Encounter Manager','game.fdern.encounter.render({force:true});'),macro('terrain','Define Cover / Difficult Terrain','await game.fdern.terrainEditor();'),macro('wizard','Character Wizard','new game.fdern.CharacterWizard({actor:game.fdern.selectedActor()}).render({force:true});'),macro('repack','Repack Magazines','await game.fdern.request({type:"repack", actor:game.fdern.selectedActor().uuid});'),macro('release','Release Grapple','const actor=game.fdern.selectedActor(); await game.fdern.request({type:"release",actor:actor.uuid});'),macro('correct-move','GM: Correct Token Position','if (!game.user.isGM) return; const token=canvas.tokens.controlled[0]?.document; if(!token)return; const point=await game.fdern.pickPoint(); if(point)await token.move(point,{fdernOverride:true});'));
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
