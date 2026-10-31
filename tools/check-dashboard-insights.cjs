'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context=vm.createContext({window:{},document:{addEventListener(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/dashboard-insights.js'),'utf8'),context);
const summarize=context.window.BridgewayDashboardInsights.summarize;
const plan=()=>Array.from({length:8},(_,i)=>({status:i<3?'verified':i===3?'submitted':i===4?'revision':'draft',actualHours:i<5?15:0}));
const students=[{id:'one',name:'One',company:'company-1',college:'college-1',supervisor:'Dr. Ahmad S.'},{id:'two',name:'Two',company:'company-2',college:'college-2',supervisor:'Other supervisor'},{id:'new',name:'New',company:null,college:'college-1'}];
test('each receiving role sees only its company, college, or assigned training records',()=>{
  for(const [role,viewer]of [['company','company:company-1'],['admin','admin:college-1'],['supervisor','supervisor:ahmad']]){
    const C={identity:()=>viewer,state:{plans:{one:plan(),two:plan()}}},result=summarize(C,role,students);
    assert.equal(result.trainees,1);assert.equal(result.verifiedHours,45);assert.equal(result.plannedHours,120);assert.equal(result.learners[0].name,'One');
  }
});
test('report distribution and pipeline preserve verified, pending, revision and draft meaning',()=>{
  const result=summarize({identity:()=> 'platform',state:{plans:{one:plan(),two:plan()}}},'platform_admin',students);
  assert.equal(result.plannedReports,16);assert.equal(result.verifiedReports,6);assert.equal(result.statuses.submitted,2);assert.equal(result.statuses.revision,2);assert.equal(result.statuses.draft,6);
  assert.equal(Object.values(result.statuses).reduce((a,b)=>a+b),16);assert.equal(result.weeks[3].hours,0);assert.equal(result.weeks[3].pendingHours,30);
});
test('empty and partial training plans do not manufacture targets or percentages',()=>{
  const result=summarize({identity:()=> 'company:company-1',state:{plans:{one:[]}}},'company',students);
  assert.equal(result.trainees,0);assert.equal(result.plannedHours,0);assert.equal(result.verifiedReports,0);assert.equal(result.weeks.length,8);
});
test('hours are numeric, bounded and read-only to the analytics layer',()=>{
  const weeks=plan();weeks[0].actualHours='15';weeks[1].actualHours=40;weeks[2].actualHours=-2;
  const state={plans:{one:weeks}},before=JSON.stringify(state),result=summarize({identity:()=> 'company:company-1',state},'company',students);
  assert.equal(result.verifiedHours,30);assert.equal(JSON.stringify(state),before);
});
test('completion readiness requires training, tasks, and the current evaluation handoff',()=>{
  const weeks=Array.from({length:8},()=>({status:'verified',actualHours:15,tasks:[]}));
  const state={plans:{one:weeks},histories:[{id:'p1',student:'one',company:'company-1',status:'Active'}],evaluations:{},academicEvaluations:{}};
  const C={identity:()=> 'company:company-1',state},result=()=>summarize(C,'company',students).completion;
  assert.equal(result().evaluations,1);
  weeks[0].tasks.push({status:'Submitted'});assert.equal(result().training,1);
  weeks[0].tasks[0].status='Completed';state.evaluations.one={company:'company-1',date:'current'};
  state.academicEvaluations.one={placement:'p1',companyDate:'old',criteria:Array.from({length:3},()=>({result:'Meets requirements'}))};
  assert.equal(result().evaluations,1);state.academicEvaluations.one.companyDate='current';assert.equal(result().college,1);
  state.academicEvaluations.one.criteria[0].result='Needs follow-up';assert.equal(result().evaluations,1);
  state.histories[0].status='Completed';assert.equal(result().completed,1);assert.equal(result().college,0);
  state.histories[0].status='Left';assert.equal(result().ended,1);assert.equal(result().completed,0);
});
test('same-name students keep separate verified hours and each student has one stage',()=>{
  const people=[{...students[0],name:'Same'},{...students[0],id:'second',name:'Same'}];
  const weeks=Array.from({length:8},()=>({status:'verified',actualHours:15}));
  const state={plans:{one:plan(),second:weeks},histories:[{id:'p1',student:'one',company:'company-1',status:'Active'},{id:'p2',student:'second',company:'company-1',status:'Active'}]};
  const result=summarize({identity:()=> 'company:company-1',state},'company',people);
  assert.equal(result.completion.training,1);assert.equal(result.completion.evaluations,1);
  assert.equal(Object.values(result.completion).reduce((a,b)=>a+b),2);
});
