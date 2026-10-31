'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context=vm.createContext({window:{},structuredClone,Date});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/training-hours.js'),'utf8'),context);
const H=context.window.BridgewayTrainingHours;
const week=()=>({hours:15,actualHours:0,status:'draft',notes:'',objectives:[],tasks:[]});
test('final evaluation stays closed until all eight reports and 120 hours are verified',()=>{
  const plan=Array.from({length:8},()=>({...week(),status:'verified',actualHours:15}));
  assert.equal(H.evaluationReady(plan),true);
  plan[7].status='submitted';assert.equal(H.evaluationReady(plan),false);
  plan[7].status='verified';plan[7].actualHours=0;assert.equal(H.evaluationReady(plan),false);
  assert.equal(H.evaluationReady(plan.slice(0,7)),false);assert.equal(H.evaluationReady([]),false);
});
test('weekly submission waits for every active task to be completed in its latest review',()=>{
  for(const submissions of [[],[{version:1}],[{version:1,review:{outcome:'Changes requested'}}],[{version:1,review:{outcome:'Completed'}},{version:2}]]){
    const w=week();w.tasks=[{id:'task',submissions}];const before=structuredClone(w);let saved=false;
    assert.throws(()=>H.transition(w,'submit','company','Feedback',()=>{saved=true;return true;}),/every active task/);
    assert.deepEqual(w,before);assert.equal(saved,false);
  }
  const w=week();w.tasks=[{id:'complete',submissions:[{review:{outcome:'Completed'}}]},{id:'removed',removedAt:'2026-10-31',submissions:[]}];
  H.transition(w,'submit','company','Feedback',()=>true);assert.equal(w.status,'submitted');assert.equal(H.verified([w]),0);
});
test('previously submitted reports with unfinished tasks cannot verify hours but can request revision',()=>{
  const w=week();w.status='submitted';w.tasks=[{id:'incomplete',submissions:[]}];
  assert.throws(()=>H.transition(w,'verify','supervisor','',()=>true),/unfinished tasks/);assert.equal(H.verified([w]),0);
  H.transition(w,'revise','supervisor','Complete the outstanding task reviews.',()=>true);assert.equal(w.status,'revision');
});
test('week focus opens the first unfinished week and advances safely after verification',()=>{
  const plan=Array.from({length:8},week);plan.slice(0,5).forEach(w=>w.status='verified');
  assert.equal(H.focusWeek(plan),5);assert.equal(H.focusWeek(plan,5),6);
  plan.forEach(w=>w.status='verified');assert.equal(H.focusWeek(plan),7);assert.equal(H.focusWeek(plan,7),7);
  assert.equal(H.focusWeek([]),0);assert.equal(plan[6].actualHours,0);
});
test('ending a week reports 15 hours; supervisor approval credits them exactly once',()=>{
  const w=week();H.transition(w,'submit','company','Work completed',()=>true);
  assert.equal(w.actualHours,15);assert.equal(H.verified([w]),0);
  assert.throws(()=>H.transition(w,'verify','company','',()=>true));
  H.transition(w,'verify','supervisor','Reviewed',()=>true);assert.equal(H.verified([w]),15);
  assert.throws(()=>H.transition(w,'verify','supervisor','',()=>true));
  assert.throws(()=>H.transition(w,'submit','company','Again',()=>true));
});
test('revision and resubmission never add unverified credit',()=>{
  const w=week();H.transition(w,'submit','company','Work',()=>true);
  assert.throws(()=>H.transition(w,'revise','supervisor','',()=>true));
  H.transition(w,'revise','supervisor','Add evidence',()=>true);assert.equal(H.verified([w]),0);
  H.transition(w,'submit','company','Evidence added',()=>true);
  H.transition(w,'verify','supervisor','',()=>true);assert.equal(H.verified([w]),15);
});
test('eight approved weeks total 120, and pending weeks never count',()=>{
  const plan=Array.from({length:8},week);
  for(const [i,w] of plan.entries()){
    H.transition(w,'submit','company','Work',()=>true);assert.equal(H.verified(plan),i*15);
    H.transition(w,'verify','supervisor','',()=>true);assert.equal(H.verified(plan),(i+1)*15);
  }
  assert.equal(H.verified(plan),H.TOTAL);
});
test('migration is idempotent and retains previous hours, tasks, archives and certificates',()=>{
  const task={title:'Keep my work'},archive={hours:40},certificate={hours:320};
  const state={plans:{one:[{hours:40,actualHours:40,status:'verified',tasks:[task]},{hours:40,actualHours:0,status:'draft'}]},archivedPlans:{old:[archive]},certificates:{one:certificate}};
  assert.equal(H.migrate(state),true);assert.equal(H.verified(state.plans.one),15);
  assert.equal(state.plans.one[0].legacyHours.reported,40);assert.equal(state.plans.one[0].tasks[0],task);
  assert.equal(state.archivedPlans.old[0],archive);assert.equal(state.certificates.one,certificate);
  assert.equal(H.migrate(state),false);
});
test('failed persistence restores the report without losing company feedback',()=>{
  const w=week(),before=structuredClone(w);
  assert.throws(()=>H.transition(w,'submit','company','My feedback',()=>false));assert.deepEqual(w,before);
  H.transition(w,'submit','company','My feedback',()=>true);const submitted=structuredClone(w);
  assert.throws(()=>H.transition(w,'verify','supervisor','Reviewed',()=>{throw Error('Storage full');}));
  assert.deepEqual(w,submitted);assert.equal(H.verified([w]),0);
});
