import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,token,dialogResponses,diceResults,messages} from './harness.mjs';
setup();
const {CharacterData,FdernActor}=await import('../scripts/models.mjs');
const {attack}=await import('../scripts/attacks.mjs');
const rollFormulas=[];
const Roll=foundry.dice.Roll;
foundry.dice.Roll=class extends Roll{constructor(formula){super(formula);rollFormulas.push(formula);}};

function actor(name,x,data={}){
  const a=new FdernActor({name});
  a.system=new CharacterData(data,{parent:a});
  a.system.prepareDerivedData();
  token(a,x);
  return a;
}

test('Fire resolves through geometry and Reaction prompts without corrupting the 2d6 modifier',async()=>{
  dialogResponses.length=0;
  rollFormulas.length=0;
  const shooter=actor('Shooter',0,{attributes:{agility:2},skills:{marksmanship:2}});
  const defender=actor('Defender',200);
  const target=defender.token;
  const rifle={id:'rifle',name:'Rifle',system:{accuracy:1,harm:2,penetration:0,strain:1,recoil:1,reach:5,maximum:100,effective:50,hands:2,traits:[],currentLoad:1},async update(data){Object.assign(this.system,Object.fromEntries(Object.entries(data).map(([k,v])=>[k.replace('system.',''),v])));}};
  dialogResponses.push({distance:10,cover:0,visibility:false,engaged:false,protected:false},{response:'none'});
  diceResults.push(2);
  const result=await attack(shooter,'fire',rifle,target);
  assert.deepEqual({hit:result.hit,total:result.total,dc:result.dc},{hit:false,total:2,dc:9});
  assert.equal(rollFormulas[0],'2d6 + 4 + 1');
  assert.equal(shooter.system.combat.attackPenalty,1);
  assert.equal(shooter.system.combat.attacks,1);
  assert.equal(defender.system.combat.wounds,0);
});

test('A non-lethal hit applies temporary Stun and leaves Wounds unchanged',async()=>{
  dialogResponses.length=0;
  const attacker=actor('Attacker',0,{attributes:{might:2},skills:{melee:2}});
  const victim=actor('Victim',100);
  const knife={id:'knife',name:'Knife',system:{accuracy:0,harm:4,penetration:0,strain:1,recoil:1,reach:5,maximum:100,effective:50,hands:1,traits:['non-lethal']}};
  dialogResponses.push({distance:5,cover:0,visibility:false,engaged:false,protected:false},{response:'none'});
  diceResults.push(10,6,6); // Attack, injury, then Stun roll.
  const result=await attack(attacker,'strike',knife,victim.token);
  assert.equal(result.hit,true);
  assert.equal(victim.system.combat.wounds,0);
  assert.equal(victim.system.combat.stunEffect,6);
  assert(messages.some(m=>m.content?.includes('Temporary Stun')));
});

test('Dazed penalizes a Suppress attack as a ranged attack and marks Stun used',async()=>{
  dialogResponses.length=0;
  rollFormulas.length=0;
  const gunner=actor('Gunner',0,{combat:{stunEffect:5},attributes:{agility:1},skills:{marksmanship:1}});
  const target=actor('Target',200);
  const gun={id:'support',name:'Support Gun',system:{accuracy:0,harm:2,penetration:0,strain:1,recoil:1,reach:5,maximum:100,effective:50,hands:2,traits:['automatic'],currentLoad:3},async update(data){Object.assign(this.system,Object.fromEntries(Object.entries(data).map(([k,v])=>[k.replace('system.',''),v])));}};
  dialogResponses.push({distance:10,cover:0,visibility:false,engaged:false,protected:false},{response:'none'});
  diceResults.push(8);
  await attack(gunner,'suppress',gun,target.token);
  assert.match(rollFormulas[0],/\+ -1$/);
  assert.equal(gunner.system.combat.stunUsed,true);
  assert.equal(target.system.combat.wounds,0);
});
