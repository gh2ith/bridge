'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../shared/js/local-workspace.js'),'utf8');
function storage(initial={}){const map=new Map(Object.entries(initial));return {get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function fixture(local=storage(),session=storage()){
 const handlers={};const window={addEventListener:(name,fn)=>handlers[name]=fn};const context=vm.createContext({window,localStorage:local,sessionStorage:session,document:{addEventListener(){}},setTimeout:()=>1,clearTimeout(){}});vm.runInContext(source,context);return {api:window.BridgewayLocal,local,session,window,handlers};
}
test('migrates existing session records once and preserves newer local records',()=>{
 const local=storage({'bridgeway:workspace-cycle:v1':'{"version":2}'}),session=storage({'bridgeway:workspace-cycle:v1':'{"version":1}','bridgeway:profiles:v1':'{"student:one":{"name":"One"}}','unrelated':'private'});
 fixture(local,session);assert.equal(JSON.parse(local.getItem('bridgeway:workspace-cycle:v1')).version,2);assert.equal(JSON.parse(local.getItem('bridgeway:profiles:v1'))['student:one'].name,'One');assert.equal(local.getItem('unrelated'),null);
 local.removeItem('bridgeway:profiles:v1');fixture(local,session);assert.equal(local.getItem('bridgeway:profiles:v1'),null,'A removed local key must not be resurrected');
});
test('migration and profile persistence exclude passwords and credential fields',()=>{
 const h=fixture(storage(),storage({'bridgeway:managed-accounts:v1':'[{"name":"One","password":"secret","nested":{"credential":"hidden"}}]','bridgeway:password':'secret'}));
 assert.equal(h.local.getItem('bridgeway:managed-accounts:v1').includes('secret'),false);assert.equal(h.local.getItem('bridgeway:password'),null);
 h.api.saveProfile('student:one',{name:'One',password:'secret'});assert.equal(h.api.profile('student:one').name,'One');assert.equal(h.local.getItem('bridgeway:profiles:v1').includes('secret'),false);
});
test('organization, partnership and student records restore across pages',()=>{
 const local=storage(),h=fixture(local);h.window.BridgewayPartners={organizations:[{id:'company-1',status:'Suspended'}],links:[{id:'link',status:'Inactive'}],students:[{id:'one',name:'One'}]};h.api.persistModel();
 const next=fixture(local),model={};assert.equal(next.api.restoreModel(model),true);assert.equal(model.organizations[0].status,'Suspended');assert.equal(model.links[0].status,'Inactive');assert.equal(model.students[0].name,'One');
});
test('storage quota failures do not report a profile as saved',()=>{
 const h=fixture();h.local.setItem=()=>{throw new Error('Quota exceeded');};assert.throws(()=>h.api.saveProfile('student:one',{name:'One'}));
});
test('a tab with newer remote records cannot overwrite them from stale memory',()=>{
 const h=fixture();h.window.BridgewayPartners={organizations:[],links:[],students:[{id:'old'}]};h.api.persistModel();
 const remote=JSON.stringify({organizations:[],links:[],students:[{id:'new'}]});h.local.setItem('bridgeway:partner-model:v1',remote);
 h.handlers.storage({storageArea:h.local,key:'bridgeway:partner-model:v1',oldValue:'old',newValue:remote});
 assert.equal(h.api.fresh(),false);h.api.persistModel();assert.equal(h.local.getItem('bridgeway:partner-model:v1'),remote);assert.throws(()=>h.api.saveProfile('student:old',{name:'Old'}));
});
