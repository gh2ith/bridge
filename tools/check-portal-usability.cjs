'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
  let viewer='company:company-1';
  const students=[{id:'one',college:'college-1',company:'company-1',supervisor:'Dr. Ahmad S.'},{id:'two',college:'college-2',company:'company-2',supervisor:'Other supervisor'}];
  const state={applications:[],plans:{one:[],two:[]},histories:[],listings:[],tickets:[],evaluations:{}};
  const window={BridgewayPartners:{students},BridgewayWeeklyTasks:{taskStatus:t=>t.status},BridgewayJourney:{academic:()=>null,certificate:()=>null}};
  const context=vm.createContext({window,document:{body:{classList:{add(){}}},addEventListener(){}},Map,Set});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/portal-usability.js'),'utf8'),context);
  const C={state,identity:()=>viewer,ticketCanManage:t=>t.recipient===viewer};
  return {state,C,as:value=>viewer=value,recommend:role=>window.BridgewayPortalUsability.recommendations(C,role)};
}
test('company next action uses own pending applications and never foreign counts',()=>{
  const h=fixture();h.state.applications.push({student:'two',company:'company-2',status:'Pending'});assert.equal(h.recommend('company'),null);
  h.state.applications.push({student:'one',company:'company-1',status:'Pending'});const next=h.recommend('company');assert.equal(next.tab,'tab-candidates');assert.match(next.title,/^1 application /);
});
test('supervisor and college recommendations respect their assigned scope',()=>{
  const h=fixture();h.state.plans.two=[{status:'submitted'}];h.as('supervisor:ahmad');assert.equal(h.recommend('supervisor'),null);
  h.state.plans.one=[{status:'submitted'}];assert.equal(h.recommend('supervisor').tab,'tab-reports');
  h.as('admin:college-1');h.state.applications.push({student:'two',status:'Accepted'});assert.equal(h.recommend('admin'),null);h.state.applications.push({student:'one',status:'Accepted'});assert.equal(h.recommend('admin').tab,'tab-approved');
});
test('student next action prioritizes revisions and identifies the exact task and week',()=>{
  const h=fixture();h.as('student:one');h.state.histories.push({student:'one',status:'Active'});h.state.plans.one=[{tasks:[{id:'assigned',status:'Assigned'}]},{tasks:[{id:'revision',status:'Changes requested',title:'Add keyboard support'}]}];
  const next=h.recommend('student');assert.equal(next.task,'revision');assert.equal(next.week,1);assert.equal(next.tab,'tab-progress');
  h.state.histories[0].status='Completed';assert.equal(h.recommend('student'),null);
});
test('platform prioritizes listing moderation; support counts include only actionable received tickets',()=>{
  const h=fixture();h.as('platform');h.state.tickets.push({recipient:'company:company-1',status:'In progress'},{recipient:'platform',status:'Awaiting requester'});assert.equal(h.recommend('platform_admin'),null);
  h.state.tickets.push({recipient:'platform',status:'In progress'});assert.equal(h.recommend('platform_admin').tab,'platform-issues');h.state.listings.push({status:'Pending review'});assert.equal(h.recommend('platform_admin').tab,'platform-publications');
});
test('requester support follow-up is shown only to the conversation owner',()=>{
  const h=fixture();h.as('student:one');h.state.tickets.push({owner:'student:two',recipient:'supervisor:ahmad',status:'Awaiting requester'});assert.equal(h.recommend('student'),null);
  h.state.tickets.push({owner:'student:one',recipient:'supervisor:ahmad',status:'Awaiting requester'});assert.equal(h.recommend('student').tab,'tab-tickets');
});
test('student import accepts readable headers without weakening field validation',()=>{
  const context=vm.createContext({window:{},document:{addEventListener(){}}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/js/student-import.js'),'utf8'),context);
  const normalize=context.window.BridgewayStudentImport.normalizeHeader;
  assert.equal(normalize(' Full name '),'name');assert.equal(normalize('STUDENT ID'),'studentId');assert.equal(normalize('Academic supervisor'),'supervisor');assert.equal(normalize('Cumulative GPA'),'gpa');assert.equal(normalize('email'),'email');
});
