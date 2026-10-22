import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshSystemStylesheets} from '../scripts/stylesheet.mjs';

class FakeLink {
  constructor(rel='stylesheet',href='') { this.rel=rel; this.href=href; this.listeners=new Map(); this.sheet=null; this.disabled=false; this.removed=false; }
  getAttribute(name) { return this[name]??null; }
  addEventListener(type,fn) { this.listeners.set(type,fn); }
  removeEventListener(type,fn) { if(this.listeners.get(type)===fn)this.listeners.delete(type); }
  remove() { this.removed=true; }
  fire(type) { this.listeners.get(type)?.(); }
}
function fakeDocument(links=[],loadEvent='load') {
  const document={baseURI:'https://foundry.test/systems/fdern/',links,
    querySelectorAll(selector) {
      assert.equal(selector,'link[rel~="stylesheet"][href]');
      return this.links.filter(link=>!link.removed&&link.rel.split(/\s+/).includes('stylesheet')&&link.href);
    },
    createElement(tag) { assert.equal(tag,'link'); return new FakeLink(); },
    head:{append(link){document.links.push(link);queueMicrotask(()=>{if(loadEvent==='load')link.sheet={};link.fire(loadEvent);});}}
  };
  return document;
}
const manifestURL='https://foundry.test/systems/fdern/system.json';
const current='styles/fdern-123456abcdef.css';
function manifestFetcher(styles){
  const calls=[];
  const fetcher=async(...args)=>{calls.push(args);return {ok:true,status:200,json:async()=>({styles})};};
  return {fetcher,calls};
}

test('loads the manifest stylesheet before removing the stale cached FDERN link',async()=>{
  const old=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern.css?cache=old');
  const theme=new FakeLink('stylesheet','https://foundry.test/modules/dark-theme/theme.css');
  const document=fakeDocument([old,theme]),{fetcher,calls}=manifestFetcher([current]);
  const result=await refreshSystemStylesheets({document,manifestURL,fetcher});
  assert.deepEqual(calls,[[manifestURL,{cache:'no-store'}]]);
  assert.equal(old.removed,true);assert.equal(theme.removed,false);
  assert.deepEqual(result,{added:1,removed:1,retained:['/systems/fdern/styles/fdern-123456abcdef.css']});
  const loaded=document.links.find(link=>link.href.includes('fdern-123456abcdef.css'));
  assert.ok(loaded?.sheet,'replacement stylesheet must finish loading before the stale link is removed');
});

test('keeps one current link, removes duplicate and obsolete FDERN links, and preserves unrelated links',async()=>{
  const currentA=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern-123456abcdef.css?rev=1');currentA.sheet={};
  const currentB=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern-123456abcdef.css#duplicate');currentB.sheet={};currentB.disabled=true;
  const obsolete=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern-abcdef123456.css');
  const otherSystem=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/other.css');
  const theme=new FakeLink('alternate stylesheet','https://foundry.test/modules/theme/theme.css');
  const document=fakeDocument([currentA,currentB,obsolete,otherSystem,theme]);
  const {fetcher}=manifestFetcher([current]);
  const result=await refreshSystemStylesheets({document,manifestURL,fetcher});
  assert.equal(currentA.removed,false);assert.equal(currentB.removed,true);assert.equal(obsolete.removed,true);
  assert.equal(otherSystem.removed,false);assert.equal(theme.removed,false);
  assert.deepEqual(result,{added:0,removed:2,retained:['/systems/fdern/styles/fdern-123456abcdef.css']});
});

test('reenables an existing current link and prefers the active duplicate',async()=>{
  const disabled=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern-123456abcdef.css');disabled.sheet={};disabled.disabled=true;
  const old=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern.css');
  const document=fakeDocument([disabled,old]),{fetcher}=manifestFetcher([current]);
  const result=await refreshSystemStylesheets({document,manifestURL,fetcher});
  assert.equal(disabled.disabled,false);assert.equal(disabled.removed,false);assert.equal(old.removed,true);
  assert.deepEqual(result,{added:0,removed:1,retained:['/systems/fdern/styles/fdern-123456abcdef.css']});
});

test('a failed replacement load removes its new link and preserves the old stylesheet',async()=>{
  const old=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern.css');old.sheet={};
  const document=fakeDocument([old],'error'),{fetcher}=manifestFetcher([current]);
  await assert.rejects(refreshSystemStylesheets({document,manifestURL,fetcher}),/Unable to load FDERN stylesheet/);
  assert.equal(old.removed,false);
  const replacement=document.links.find(link=>link!==old);
  assert.equal(replacement.removed,true);
});

test('stylesheet bootstrap registers runtime repair on Foundry init',async()=>{
  const systemRoot=new URL('../',import.meta.url);
  const old=new FakeLink('stylesheet',new URL('styles/fdern.css',systemRoot).href);old.sheet={};
  const document=fakeDocument([old]);document.baseURI=systemRoot.href;
  const previous={document:globalThis.document,fetch:globalThis.fetch,Hooks:globalThis.Hooks};
  let hookName,init;
  globalThis.document=document;
  globalThis.Hooks={once(name,callback){hookName=name;init=callback;}};
  globalThis.fetch=async(url,options)=>({ok:true,status:200,json:async()=>({styles:[current]}),request:{url,options}});
  try {
    await import(`../scripts/stylesheet-bootstrap.mjs?test=${Date.now()}`);
    assert.equal(hookName,'init');assert.equal(typeof init,'function');
    await init();
    assert.equal(old.removed,true);
    assert.ok(document.links.some(link=>link.href.includes('fdern-123456abcdef.css')&&!link.removed));
  } finally {
    for(const key of ['document','fetch','Hooks'])if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
  }
});

test('an empty or failed manifest never removes the installed stylesheet',async()=>{
  const installed=new FakeLink('stylesheet','https://foundry.test/systems/fdern/styles/fdern.css');installed.sheet={};
  const document=fakeDocument([installed]);
  const empty=await refreshSystemStylesheets({document,manifestURL,fetcher:manifestFetcher([]).fetcher});
  assert.deepEqual(empty,{added:0,removed:0,retained:[]});assert.equal(installed.removed,false);
  await assert.rejects(refreshSystemStylesheets({document,manifestURL,fetcher:async()=>({ok:false,status:503})}),/Unable to load FDERN stylesheet manifest/);
  assert.equal(installed.removed,false);
});
