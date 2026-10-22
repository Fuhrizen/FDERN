import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {ARTWORK_ICONS,itemArtwork,actionArtwork} from '../scripts/artwork.mjs';
import {ACTIONS,ICON} from '../scripts/config.mjs';
const asset=name=>`systems/fdern/assets/icons/${name}.svg`;

test('item artwork replaces placeholders while preserving native and custom image choices',()=>{
  const rifle={type:'firearm',system:{family:'rifle'}};
  for(const img of [undefined,null,'',ICON,'systems/fdern/assets/fdern.svg'])assert.equal(itemArtwork({...rifle,img}),asset('rifle'));
  for(const img of ['worlds/campaign/handmade.webp','icons/svg/sword.svg','https://example.test/pistol.png',asset('pistol')])assert.equal(itemArtwork({...rifle,img}),img);
  assert.equal(itemArtwork({type:'character',img:ICON}),ICON);
  assert.equal(itemArtwork({type:'npc'}),ICON);
  assert.equal(itemArtwork(null),ICON);
});

test('equipment artwork distinguishes firearm families, supplies and grenade payloads',()=>{
  for(const [family,icon] of Object.entries({pistol:'pistol','machine-pistol':'smg',smg:'smg',rifle:'rifle',precision:'precision',shotgun:'shotgun',support:'support'}))assert.equal(itemArtwork({type:'firearm',system:{family}}),asset(icon));
  for(const [type,icon] of Object.entries({launcher:'launcher',shield:'shield',armour:'armour',magazine:'ammo',discipline:'discipline'}))assert.equal(itemArtwork({type}),asset(icon));
  assert.equal(itemArtwork({type:'melee',name:'Boot dagger'}),asset('knife'));
  assert.equal(itemArtwork({type:'melee',system:{family:'knife'}}),asset('knife'));
  assert.equal(itemArtwork({type:'melee',system:{family:'spear'}}),asset('melee'));
  for(const [payload,icon] of Object.entries({fragmentation:'grenade',he:'grenade',smoke:'smoke',flash:'flash',concussion:'flash',incendiary:'fire'}))assert.equal(itemArtwork({type:'grenade',system:{payload}}),asset(icon));
  assert.equal(itemArtwork({type:'gear',system:{actions:['stabilise']}}),asset('medical'));
  assert.equal(itemArtwork({type:'gear',name:'First-aid pouch'}),asset('medical'));
  assert.equal(itemArtwork({type:'gear',system:{actions:['patch']}}),asset('tools'));
  assert.equal(itemArtwork({type:'gear',name:'Engineering tools'}),asset('tools'));
  assert.equal(itemArtwork({type:'gear',name:'Field radio'}),asset('action'));
});

test('action artwork gives supported rules actions appropriate cues and a safe fallback',()=>{
  for(const [id,icon] of Object.entries({fire:'target',strike:'target',grapple:'target',move:'move',step:'move',observe:'observe','field-dressing':'medical',throw:'grenade',reload:'ammo',patch:'tools',aim:'target',ready:'action'})){
    assert.equal(actionArtwork(id),asset(icon));
    assert.equal(itemArtwork({type:'action',system:{actionId:id}}),asset(icon));
  }
  assert.equal(actionArtwork('custom',{kind:'medical'}),asset('medical'));
  assert.equal(actionArtwork('unknown'),asset('action'));
  const known=new Set(ARTWORK_ICONS.map(asset));
  for(const [id,action] of Object.entries(ACTIONS))assert.ok(known.has(actionArtwork(id,action)),id);
});

test('every mapped SVG is self-contained, accessible and valid XML',async()=>{
  for(const name of ARTWORK_ICONS){
    const path=`assets/icons/${name}.svg`,svg=await readFile(path,'utf8');
    assert.match(svg,/viewBox=["']0 0 64 64["']/i,path);
    assert.match(svg,/<title(?:\s[^>]*)?>[^<]+<\/title>/i,path);
    assert.match(svg,/role=["']img["']/i,path);
    assert.match(svg,/aria-labelledby=["'][^"']+["']/i,path);
    assert.doesNotMatch(svg,/<(?:script|foreignObject|image|use|style)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i,path);
    const parsed=spawnSync('python3',['-c','import sys,xml.etree.ElementTree as E; root=E.fromstring(sys.stdin.read()); assert root.tag=="{http://www.w3.org/2000/svg}svg"'],{input:svg,encoding:'utf8'});
    assert.equal(parsed.status,0,`${path}: ${parsed.stderr}`);
  }
});
