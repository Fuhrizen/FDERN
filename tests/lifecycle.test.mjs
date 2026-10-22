import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,hooksFor} from './harness.mjs';
setup();
const {FdernActorSheet,FdernItemSheet}=await import('../scripts/sheets.mjs');
await import('../scripts/fdern.mjs');

test('open embedded item action profiles refresh with combat, actor and ammunition changes',async()=>{
  const a={uuid:'Actor.a'},b={uuid:'Actor.b'},renders={actor:0,a:0,b:0,world:0,closed:0};
  const view=(key,actor,rendered=true)=>({item:{actor},rendered,render(){renders[key]++;}});
  FdernActorSheet.instances=()=>[{rendered:true,render(){renders.actor++;}}];
  FdernItemSheet.instances=()=>[view('a',a),view('b',b),view('world',null),view('closed',a,false)];
  try{
    for(const hook of hooksFor('updateCombat'))await hook({});
    assert.deepEqual(renders,{actor:1,a:1,b:1,world:0,closed:0});
    for(const hook of hooksFor('updateItem'))await hook({type:'magazine',actor:a});
    assert.deepEqual(renders,{actor:1,a:2,b:1,world:0,closed:0});
    game.user=game.users.get('player');
    for(const hook of hooksFor('updateActor'))await hook(b);
    assert.deepEqual(renders,{actor:1,a:2,b:2,world:0,closed:0});
  }finally{delete FdernActorSheet.instances;delete FdernItemSheet.instances;}
});
