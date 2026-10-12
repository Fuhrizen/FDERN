import {ATTRIBUTES,SKILLS,ICON} from './config.mjs';
import {allowance,moveDistance,pressureState,level} from './rules.mjs';
const f=foundry.data.fields;
const num=(initial=0,min=0,max=undefined)=>new f.NumberField({required:true,nullable:false,integer:true,initial,min,max});
const str=(initial='')=>new f.StringField({required:true,nullable:false,initial});
const bool=(initial=false)=>new f.BooleanField({initial});
const schema=o=>new f.SchemaField(o);
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema(){return {
    attributes:schema(Object.fromEntries(Object.keys(ATTRIBUTES).map(k=>[k,num(0,0,3)]))),skills:schema(Object.fromEntries(Object.keys(SKILLS).map(k=>[k,num(0,0,4)]))),
    biography:schema({background:str(),description:str(),motivation:str(),connection:str()}),
    combat:schema({wounds:num(0,0,3),pressure:num(0,0,7),stunEffect:num(0,0,6),stunUsed:bool(),stunActivation:str(),stunExpiresRound:num(),downCount:num(),bleedMarks:num(0,0,3),stabilised:bool(),bleeding:bool(),dead:bool(),recoveryPending:bool(),actionsRemaining:num(0,0,3),reactionAvailable:bool(true),attackPenalty:num(),attacks:num(),activationSerial:num(),moved:bool(),moveRemaining:new f.NumberField({initial:0,min:0}),moveMode:str(),underFireSource:str(),tookPressureThisRound:bool(),takeCover:bool(),prone:bool(),grappledBy:str(),grappling:str(),aimTarget:str(),aimWeapon:str(),overwatch:schema({active:bool(),weapon:str(),lane:str(),kind:str('overwatch'),regionId:str()}),spot:schema({target:str(),expiresRound:num(),expiresActivation:str()}),coverAlly:str(),flash:bool(),dressings:num(0,0,2),assistTarget:str(),controlUsed:bool()}),
    advancement:schema({lifetimeVP:num(),spentVP:num(),attributeIncreasesPurchased:num(0,0,1)}),
    memories:new f.ArrayField(schema({id:str(),title:str(),content:str(),tags:str()})),
    tagColours:new f.ArrayField(schema({tag:str(),colour:str()})),wizardComplete:bool()
  };}
  prepareDerivedData(){const c=this.combat;const items=this.parent?.items??[];const heavy=items.some(i=>i.system.readied&&(i.system.traits.includes('heavy')||i.system.movePenalty>0));this.tactical={allowance:allowance(c),move:moveDistance(c,{heavy}),pressureState:pressureState(c.pressure),level:level(this.advancement.lifetimeVP),availableVP:this.advancement.lifetimeVP-this.advancement.spentVP,ballistic:Math.max(0,...items.filter(i=>i.type==='armour'&&i.system.worn).map(i=>i.system.ballistic)),melee:Math.max(0,...items.filter(i=>i.type==='armour'&&i.system.worn).map(i=>i.system.meleeArmour))};}
  static validateJoint(data){if(data.advancement.spentVP>data.advancement.lifetimeVP)throw Error('Spent VP cannot exceed lifetime VP.');}
}
export class EquipmentData extends foundry.abstract.TypeDataModel {
  static defineSchema(){return {
    description:str(),family:str(),cartridge:str(),compatibility:str(),accuracy:num(0,-5,5),recoil:num(1,1,3),strain:num(1,1,3),harm:num(1,0,12),penetration:num(0,0,12),effective:num(40,0),maximum:num(90,0),reach:num(5,0),hands:num(1,0,2),
    traits:new f.ArrayField(str()),actions:new f.ArrayField(str()),readied:bool(),worn:bool(),slot:new f.StringField({initial:'',choices:['','primary','secondary','tertiary']}),deployed:bool(),cycled:bool(true),broken:bool(),movePenalty:num(0,0,10),
    magazineId:str(),currentLoad:num(0,0),maxLoad:num(4,1),reloadCost:num(1,1,3),reloadProgress:num(),reloadSource:str(),quantity:num(1,0),ballistic:num(),meleeArmour:num(),absorption:num(1,1,5),radius:num(10,0),duration:num(2,0),payload:str('fragmentation'),fireCost:num(1,1,3),disciplineId:str(),actionId:str(),advanced:bool(),source:str('FDERN Playtest 1.1')
  };}
  static validateJoint(data){if(data.currentLoad>data.maxLoad)throw Error('Load exceeds source capacity.');if(data.effective>data.maximum)throw Error('Effective range exceeds maximum range.');}
}
export class FdernActor extends foundry.documents.Actor {
  async _preCreate(data,options,user){await super._preCreate(data,options,user);this.updateSource({'prototypeToken.actorLink':this.type==='character','prototypeToken.bar1.attribute':'combat.wounds','prototypeToken.bar2.attribute':'combat.pressure',img:data.img??ICON});}
  async _preUpdate(changes,options,user){await super._preUpdate(changes,options,user);const next=foundry.utils.expandObject(changes).system?.combat;
    if(next?.wounds>=3&&this.system.combat.wounds<3){changes['system.combat.downCount']=this.system.combat.downCount+1;changes['system.combat.bleedMarks']=0;changes['system.combat.stabilised']=false;changes['system.combat.bleeding']=true;changes['system.combat.actionsRemaining']=0;changes['system.combat.reactionAvailable']=false;changes['system.combat.overwatch.active']=false;}
  }
  getRollData(){return {...super.getRollData(),attributes:this.system.attributes,skills:this.system.skills};}
  async modifyTokenAttribute(attribute,value,isDelta=false,isBar=true){if(['combat.wounds','combat.pressure'].includes(attribute)){const key=attribute.split('.')[1];const next=Math.min(key==='wounds'?3:7,Math.max(0,isDelta?this.system.combat[key]+value:value));return this.update({[`system.${attribute}`]:next});}return super.modifyTokenAttribute(attribute,value,isDelta,isBar);}
}
export class FdernItem extends foundry.documents.Item {
  async _preCreate(data,options,user){await super._preCreate(data,options,user);if(data.system?.actions===undefined){const defaults={firearm:['fire','reload','overwatch'],melee:['strike','grapple','shove','disarm','takedown'],shield:['strike','cover-ally'],grenade:['throw'],launcher:['launch','reload']};if(defaults[data.type??this.type])this.updateSource({'system.actions':defaults[data.type??this.type]});}if(!data.img)this.updateSource({img:ICON});}
  async use(action='fire',target){return game.fdern.act(this.actor,action,this,{target});}}
