import test from 'node:test';
import assert from 'node:assert/strict';
import {ATTRIBUTES,SKILLS,DISCIPLINES} from '../scripts/config.mjs';
import {buildSkillRows,buildAdvancementRows,itemMatches} from '../scripts/sheet-view.mjs';

function actor({attributes={},skills={},lifetimeVP=0,spentVP=0,attributeIncreasesPurchased=0,disciplines=[]}={}){
  return {system:{attributes:{...Object.fromEntries(Object.keys(ATTRIBUTES).map(id=>[id,0])),...attributes},skills:{...Object.fromEntries(Object.keys(SKILLS).map(id=>[id,0])),...skills},advancement:{lifetimeVP,spentVP,attributeIncreasesPurchased},tactical:{availableVP:lifetimeVP-spentVP}},items:disciplines.map(disciplineId=>({type:'discipline',system:{disciplineId}}))};
}

test('skill rows show pairing, capped bonus, readable roll name, and searchable training state',()=>{
  const a=actor({attributes:{agility:3},skills:{marksmanship:4,vehicles:1}});
  const rows=buildSkillRows(a,{editable:true});
  const shot=rows.find(row=>row.id==='marksmanship');
  assert.deepEqual({attribute:shot.attribute,attributeRank:shot.attributeRank,rank:shot.rank,total:shot.total,editable:shot.editable,rollLabel:shot.rollLabel},
    {attribute:'Agility',attributeRank:3,rank:4,total:6,editable:true,rollLabel:'Agility + Marksmanship (+6)'});
  assert.deepEqual(buildSkillRows(a,{trainedOnly:true}).map(row=>row.id),['marksmanship','vehicles']);
  assert.deepEqual(buildSkillRows(a,{query:'AGILITY'}).map(row=>row.id),['marksmanship','mobility','vehicles']);
});

test('advancement rows explain rank caps, VP shortfalls, lifetime cap and discipline prerequisites',()=>{
  const learned=Object.keys(DISCIPLINES).filter(id=>!DISCIPLINES[id].advanced).slice(0,1);
  const a=actor({attributes:{might:3},skills:{marksmanship:4,melee:2},lifetimeVP:5,spentVP:4,attributeIncreasesPurchased:1,disciplines:learned});
  const rows=buildAdvancementRows(a,{editable:true});
  const capped=rows.skills.find(row=>row.id==='marksmanship');
  assert.equal(capped.cost,null);assert.equal(capped.purchaseDisabled,true);assert.equal(capped.reason,'Maximum rank reached.');
  const costly=rows.skills.find(row=>row.id==='melee');
  assert.equal(costly.cost,5);assert.equal(costly.purchaseDisabled,true);assert.equal(costly.reason,'Need 4 more VP.');
  const lifetime=rows.attributes.find(row=>row.id==='agility');
  assert.equal(lifetime.eligible,false);assert.equal(lifetime.reason,'Your lifetime Attribute increase has already been used.');
  const prereq=rows.disciplines.find(row=>row.id==='support-gunner');
  assert.equal(prereq.eligible,false);assert.equal(prereq.reason,'Prerequisites not met.');
  const learnedRow=rows.disciplines.find(row=>row.id===learned[0]);
  assert.equal(learnedRow.purchaseDisabled,true);assert.equal(learnedRow.reason,'Already learned.');
  const unavailable=buildAdvancementRows(actor({lifetimeVP:20}),{editable:false}).skills.find(row=>row.id==='athletics');
  assert.equal(unavailable.purchaseDisabled,true);assert.equal(unavailable.eligible,true);assert.equal(unavailable.reason,'Owner permission is required to make purchases.');
});

test('advancement rows distinguish affordable eligible purchases and basic prerequisites',()=>{
  const a=actor({attributes:{resolve:1},skills:{marksmanship:2,melee:3},lifetimeVP:20,spentVP:0,disciplines:['grappling']});
  const rows=buildAdvancementRows(a,{editable:true});
  assert.deepEqual([rows.skills.find(row=>row.id==='marksmanship').cost,rows.skills.find(row=>row.id==='marksmanship').next], [5,3]);
  const attribute=rows.attributes.find(row=>row.id==='resolve');
  assert.equal(attribute.purchaseDisabled,false);assert.equal(attribute.next,2);assert.equal(attribute.reason,'');
  const advanced=rows.disciplines.find(row=>row.id==='close-quarters-control');
  assert.equal(advanced.eligible,true);assert.equal(advanced.cost,7);assert.equal(advanced.purchaseDisabled,false);
});

test('item search is literal, accent-insensitive, and covers descriptive fields',()=>{
  const rifle={name:'Fusíl d’assaut',type:'firearm',system:{family:'precision',description:'Optic for long-range reconnaissance',traits:['semi-automatic'],actions:['precision']}};
  assert.equal(itemMatches(rifle,'fusil'),true);
  assert.equal(itemMatches(rifle,'RECONNAISSANCE'),true);
  assert.equal(itemMatches(rifle,'semi-auto'),true);
  assert.equal(itemMatches(rifle,'['),false);
  assert.equal(itemMatches(rifle,'  '),true);
});
