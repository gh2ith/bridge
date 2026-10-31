'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
function fixture(){
  let viewer='company:company-1',fail=false;
  const students=[{id:'one',name:'Student One',studentId:'100',college:'college-1',company:'company-1',supervisor:'Dr. Ahmad S.',stage:'Placed'}];
  const state={histories:[{id:'p1',student:'one',company:'company-1',status:'Active',start:'2026-09-01',role:'Developer'}],plans:{one:Array.from({length:8},()=>({status:'verified',actualHours:15,tasks:[]}))},evaluations:{one:{company:'company-1',date:'2026-10-30',scores:[4,4,4,4,4,4,4,4]}}};
  const C={state,identity:()=>viewer,student:id=>students.find(s=>s.id===id),hours:id=>state.plans[id].filter(w=>w.status==='verified').reduce((n,w)=>n+w.actualHours,0),org:id=>id,commit:()=>!fail};
  const context=vm.createContext({window:{BridgewayCycle:C,BridgewayPartners:{students},BridgewayWeeklyTasks:{taskStatus:t=>t.status}},document:{addEventListener(){},getElementById(){return null;}},crypto:{randomUUID},structuredClone,Date,Intl,Map,URL});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/internship-journey.js'),'utf8'),context);
  return {C,state,students,api:context.window.BridgewayJourney,as:v=>viewer=v,fail:()=>fail=true};
}
const criteria=()=>['Learning','Engagement','Readiness'].map(name=>({name,result:'Meets requirements'}));
test('company → assigned supervisor → college admin gates completion and certificate',()=>{
  const h=fixture();assert.throws(()=>h.api.approve('one',true));assert.throws(()=>h.api.sendAcademic('one',criteria(),'Assessment'));
  h.as('supervisor:ahmad');h.api.sendAcademic('one',criteria(),'All academic requirements met');
  assert.equal(h.api.academic('one').status,'Sent to college admin');assert.equal(h.state.evaluations.one.scores[0],4);
  assert.throws(()=>h.api.approve('one',true));h.as('admin:college-2');assert.throws(()=>h.api.approve('one',true));h.as('admin:college-1');assert.throws(()=>h.api.approve('one',false));
  const record=h.api.approve('one',true);assert.equal(record.hours,120);assert.equal(h.api.certificate('one').id,record.id);assert.equal(h.state.histories[0].status,'Completed');assert.throws(()=>h.api.approve('one',true));
});
test('completion remains blocked by hours, reports, unresolved tasks, or academic follow-up',()=>{
  for(const block of ['hours','reports','tasks','academic']){
    const h=fixture();h.as('supervisor:ahmad');const c=criteria();if(block==='academic')c[0].result='Needs follow-up';h.api.sendAcademic('one',c,'Review notes');
    if(block==='hours')h.state.plans.one[0].actualHours=10;if(block==='reports')h.state.plans.one[0].status='submitted';if(block==='tasks')h.state.plans.one[0].tasks.push({status:'Submitted'});
    h.as('admin:college-1');assert.throws(()=>h.api.approve('one',true));assert.equal(h.api.certificate('one'),null);
  }
});
test('new company evaluation or new placement invalidates the previous academic handoff',()=>{
  const h=fixture();h.as('supervisor:ahmad');h.api.sendAcademic('one',criteria(),'Reviewed');h.state.evaluations.one.date='2026-10-31';assert.equal(h.api.academic('one'),null);
  h.api.sendAcademic('one',criteria(),'Re-reviewed');h.state.histories[0].id='p2';assert.equal(h.api.academic('one'),null);
});
test('failed persistence rolls back academic assessment, approval and skills',()=>{
  const h=fixture();h.as('supervisor:ahmad');h.api.sendAcademic('one',criteria(),'Reviewed');h.fail();h.as('admin:college-1');assert.throws(()=>h.api.approve('one',true));assert.equal(h.api.certificate('one'),null);assert.equal(h.state.histories[0].status,'Active');
  h.as('supervisor:ahmad');assert.throws(()=>h.api.sendAcademic('one',criteria(),'Changed'));assert.equal(h.api.academic('one').notes,'Reviewed');
  h.as('student:one');assert.throws(()=>h.api.setSkills('one',['React']));assert.equal(h.api.skills('one').length,0);
});
test('skills stay student-owned, deduplicated, and bounded',()=>{
  const h=fixture();assert.throws(()=>h.api.setSkills('one',['React']));h.as('student:one');h.api.setSkills('one',[' React ','react','SQL']);assert.equal(h.api.skills('one').length,2);assert.throws(()=>h.api.setSkills('one',['x'.repeat(41)]));
});
test('evaluation progress follows the real handoff and never marks missing work complete',()=>{
  const h=fixture();let steps=h.api.evaluationSteps('one');assert.equal(steps[0].done,true);assert.equal(steps[1].current,true);
  h.as('supervisor:ahmad');h.api.sendAcademic('one',criteria(),'Reviewed');steps=h.api.evaluationSteps('one');assert.equal(steps[2].current,true);assert.equal(steps[3].done,false);
  h.as('admin:college-1');h.api.approve('one',true);assert.equal(h.api.evaluationSteps('one').every(s=>s.done),true);
});
