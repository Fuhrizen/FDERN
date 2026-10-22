import test from 'node:test';
import assert from 'node:assert/strict';
import {INVENTORY_SIZES,resolveTier,resolveInventorySize,sortedInventoryItems,buildInventoryGrid} from '../scripts/inventory-view.mjs';

const item=(id,type,system={},sort=0)=>({id,name:id,type,system,sort});

test('five inventory tiers expose fixed CSS grid dimensions',()=>{
  assert.deepEqual(INVENTORY_SIZES.map(({tier,id,width,height})=>({tier,id,width,height})),[
    {tier:1,id:'pocket',width:1,height:1},{tier:2,id:'small',width:2,height:1},{tier:3,id:'medium',width:2,height:2},{tier:4,id:'long',width:3,height:1},{tier:5,id:'bulky',width:3,height:2}
  ]);
});

test('automatic sizes use item type and equipment family while explicit tiers override',()=>{
  assert.equal(resolveTier(item('Pistol','firearm',{family:'pistol'})).id,'small');
  assert.equal(resolveTier(item('Rifle','firearm',{family:'rifle'})).id,'long');
  assert.equal(resolveTier(item('Support','firearm',{family:'support'})).id,'bulky');
  assert.equal(resolveTier(item('Shield','shield')).id,'medium');
  assert.equal(resolveTier(item('Knife','melee',{hands:1,reach:5})).id,'small');
  assert.equal(resolveTier(item('Spear','melee',{hands:2,reach:10})).id,'long');
  assert.equal(resolveTier(item('Magazine','magazine')).id,'pocket');
  assert.equal(resolveTier(item('Manual size','gear',{inventorySize:3})).id,'medium');
  assert.equal(resolveTier(item('Automatic fallback','gear',{inventorySize:0})).id,'pocket');
  assert.equal(resolveInventorySize(item('Explicit alias','gear',{inventorySize:2})).id,'small');
  assert.equal(resolveTier(item('Invalid fallback','gear',{inventorySize:9})).id,'pocket');
});

test('grid rows respect native sort order, skip non-equipment, and stay deterministic',()=>{
  const items=[
    item('Action','action',{},0),item('Rifle','firearm',{family:'rifle'},2),item('Small','gear',{inventorySize:2},1),
    item('Discipline','discipline',{},3),item('Heavy','launcher',{},4),item('Knife','melee',{family:'knife'},5)
  ];
  const first=buildInventoryGrid({items},{columns:4}),again=buildInventoryGrid({items},{columns:4});
  assert.deepEqual(first.items.map(({id,size,width,height})=>({id,size,width,height})),again.items.map(({id,size,width,height})=>({id,size,width,height})));
  assert.deepEqual(sortedInventoryItems({items}).map(row=>row.id),['Small','Rifle','Heavy','Knife']);
  assert.deepEqual(first.items.map(row=>row.id),['Small','Rifle','Heavy','Knife']);
  assert.equal(first.columns,4);
  assert.ok(first.items.every(row=>row.width<=first.columns));
  assert.equal(first.items.find(row=>row.id==='Rifle').width,3);
});

test('responsive grid sizes retain tier heights and cap spans to available columns',()=>{
  const grid=buildInventoryGrid({items:[item('Rifle','firearm',{family:'rifle'}),item('Pack','launcher')]},{columns:3});
  assert.equal(grid.columns,3);
  assert.deepEqual(grid.items.map(({id,width,height})=>({id,width,height})),[
    {id:'Rifle',width:3,height:1},{id:'Pack',width:3,height:2}
  ]);
  const narrow=buildInventoryGrid({items:[item('Rifle','firearm',{family:'rifle'})]},{columns:2});
  assert.equal(narrow.items[0].width,2);
  assert.equal(narrow.items[0].height,1);
});
