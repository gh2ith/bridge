'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){}},location:{hash:'',pathname:'/pages/supervisor-dashboard/supervisor-dashboard.html'}});
vm.runInContext(fs.readFileSync('shared/js/portal-ux.js','utf8'),context);
const {actionTone,statusTone,actionPolicy}=context.window.BridgewayUX;

test('report access action and confirmation have the same positive intent',()=>{
  const spec=actionPolicy('Make reports visible');
  assert.equal(actionTone(spec.action),'success');
  assert.equal(actionTone(spec.title),'success');
  assert.equal(actionTone('Restrict view'),'warning');
});
test('positive, caution and destructive actions have distinct meanings',()=>{
  for(const label of ['Accept applicant','Approve & publish','Verify 15 hours','Resume partnership','Activate placement','Resolve ticket'])assert.equal(actionTone(label),'success',label);
  for(const label of ['Pause publication','Restrict view','Request revision','Cancel interview'])assert.equal(actionTone(label),'warning',label);
  for(const label of ['Delete internship','Reject applicant','Withdraw application','Remove attachment','Discard changes'])assert.equal(actionTone(label),'danger',label);
});
test('ordinary editing, navigation and pending submission do not imply success',()=>{
  for(const label of ['Save changes','Submit report','Submit for review','View completed students','All students','Cancel','Close','Download PDF','Next'])assert.equal(actionTone(label),'info',label);
});
test('statuses preserve verified, pending, rejected and neutral distinctions',()=>{
  for(const label of ['Verified','All weeks verified','Completed','Company accepted','Active intern','Published'])assert.equal(statusTone(label),'success',label);
  for(const label of ['Application pending','Awaiting requester','In review','Revision requested','Paused','Report hidden','3 to review'])assert.equal(statusTone(label),'warning',label);
  for(const label of ['Company rejected','Rejected','Overdue','Failed'])assert.equal(statusTone(label),'danger',label);
  for(const label of ['Draft report','No training plan','Closed','22 assigned students'])assert.equal(statusTone(label),'neutral',label);
  assert.equal(statusTone('In progress'),'info');
});
test('solid semantic actions and themed status text meet AA contrast',()=>{
  const luminance=hex=>hex.match(/\w\w/g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const css=fs.readFileSync('shared/css/portal-ux.css','utf8');
  const declarations=[...css.matchAll(/--ui-(success|warning|danger)-(action|ink|bg):#([\da-f]{6})/gi)];
  const tokens=new Map();
  for(const [,tone,kind,value] of declarations){const key=tone+'-'+kind;tokens.set(key,[...(tokens.get(key)||[]),value]);}
  for(const tone of ['success','warning','danger']){
    assert.ok(contrast(tokens.get(tone+'-action')[0],'ffffff')>=4.5,tone+' action');
    const inks=tokens.get(tone+'-ink'),backgrounds=tokens.get(tone+'-bg');
    assert.equal(inks.length,2);assert.equal(backgrounds.length,2);
    for(let theme=0;theme<2;theme++)assert.ok(contrast(inks[theme],backgrounds[theme])>=4.5,tone+' theme '+theme);
  }
});
