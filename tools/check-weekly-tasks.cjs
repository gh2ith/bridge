/* Run with: node --test tools/check-weekly-tasks.cjs */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../shared/js/weekly-tasks.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const report = week => Object.fromEntries(Object.entries(week).filter(([key]) => key !== 'tasks'));

function fixture(savedState) {
  const weeks = () => Array.from({ length: 8 }, (_, index) => ({
    title: `Week ${index + 1} plan`, hours: 40, revision: 2,
    status: 'draft',
    actualHours: 0,
    objectives: [{ id: `objective-${index}`, text: 'A learning outcome', done: index < 6, evidence: 'Company evidence' }],
    notes: 'Company feedback', review: 'Supervisor review', locked: true,
    updated: '2026-10-20T09:00:00.000Z'
  }));
  const state = savedState || {
    plans: { ghaith: weeks(), alice: weeks(), sarah: weeks() },
    histories: [
      { id: 'current-ghaith', student: 'ghaith', company: 'company-1', status: 'Active' },
      { id: 'current-alice', student: 'alice', company: 'company-1', status: 'Active' },
      { id: 'current-sarah', student: 'sarah', company: 'company-2', status: 'Active' }
    ],
    reportVisibility: { 'Dr. Ahmad S.': true }, audit: []
  };
  const students = [
    { id: 'ghaith', name: 'Ghaith Amourah', company: 'company-1' },
    { id: 'alice', name: 'Alice Johnson', company: 'company-1' },
    { id: 'sarah', name: 'Sarah', company: 'company-2' }
  ];
  let viewer = 'company:company-1';
  let persisted;
  const commits = [];
  const C = {
    state,
    student: id => students.find(student => student.id === id),
    identity: () => viewer,
    org: id => id,
    reportRestricted: () => true,
    commit: action => { commits.push(action); persisted = JSON.stringify(state); }
  };
  const context = vm.createContext({ window: { BridgewayCycle: C }, crypto: { randomUUID }, Date, structuredClone, URL });
  vm.runInContext(source, context, { filename: 'weekly-tasks.js' });
  return {
    state, students, C, commits, api: context.window.BridgewayWeeklyTasks,
    as: identity => { viewer = identity; },
    saved: () => JSON.parse(persisted)
  };
}

function rejectsWithoutChange(harness, action) {
  const before = JSON.stringify(harness.state);
  const commits = harness.commits.length;
  assert.throws(action);
  assert.equal(JSON.stringify(harness.state), before, 'Rejected action must not mutate workspace state');
  assert.equal(harness.commits.length, commits, 'Rejected action must not commit');
}

const taskValues = { title: 'Build the profile screen', instructions: 'Use the agreed wireframe and document keyboard behavior.', dueDate: '2026-11-02' };

test('task editor saves attachment drafts with the task without sharing draft references',()=>{
  const h=fixture(),files=[{id:'pdf-1',name:'Guide.pdf',owner:'company:company-1',data:'JVBERi0='}];
  const task=h.api.submit('ghaith',0,taskValues,files);
  files[0].name='Unsaved draft name';
  assert.equal(task.attachments[0].name,'Guide.pdf');
  assert.equal(h.saved().plans.ghaith[0].tasks[0].attachments[0].name,'Guide.pdf');
  h.api.update('ghaith',0,task.id,taskValues,[]);
  assert.equal(task.attachments.length,0);
});

test('failed storage writes restore task content and attachments',()=>{
  const h=fixture(),task=h.api.submit('ghaith',0,taskValues,[{id:'pdf-1',name:'Guide.pdf'}]),before=JSON.stringify(h.state);
  h.C.commit=()=>false;
  assert.throws(()=>h.api.update('ghaith',0,task.id,{...taskValues,title:'Unsaved change'},[]),/could not be saved/);
  assert.equal(JSON.stringify(h.state),before);
  assert.throws(()=>h.api.submit('ghaith',0,taskValues,[{id:'pdf-2'}]),/could not be saved/);
  assert.equal(JSON.stringify(h.state),before);
});

test('submission and revision workflow retains versions and never verifies hours', () => {
  const h=fixture(),task=h.api.submit('ghaith',0,taskValues),before=plain(h.state.plans.ghaith.map(report));
  h.as('student:ghaith');h.api.deliver('ghaith',0,task.id,{description:'First implementation',link:'https://example.com/work'});
  assert.equal(h.api.taskStatus(task),'Submitted');
  rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{description:'Duplicate'}));
  h.as('company:company-1');rejectsWithoutChange(h,()=>h.api.review('ghaith',0,task.id,'Changes requested',''));
  h.api.review('ghaith',0,task.id,'Changes requested','Add keyboard support');
  const original=plain(task.submissions[0]);h.as('student:ghaith');h.api.deliver('ghaith',0,task.id,{description:'Keyboard support added'});
  assert.equal(h.api.taskStatus(task),'Resubmitted');assert.deepEqual(plain(task.submissions[0]),original);
  h.as('company:company-1');h.api.review('ghaith',0,task.id,'Completed','Reviewed');assert.equal(h.api.taskStatus(task),'Completed');
  assert.deepEqual(plain(h.state.plans.ghaith.map(report)),before);
  h.as('student:ghaith');rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{description:'Cannot reopen'}));
});

test('submission guards reject other students, unsafe links, and inactive placements',()=>{
  const h=fixture(),task=h.api.submit('ghaith',0,taskValues);h.as('student:alice');
  rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{description:'Wrong student'}));
  h.as('student:ghaith');rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{link:'javascript:alert(1)'}));
  rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{}));
  h.state.histories[0].status='Left';rejectsWithoutChange(h,()=>h.api.deliver('ghaith',0,task.id,{description:'Ended placement'}));
});

test('legacy weeks have an empty task list without modifying state', () => {
  const h = fixture();
  const before = JSON.stringify(h.state);
  assert.equal(h.api.list('ghaith', 0).length, 0);
  assert.equal(h.api.list('missing', 0).length, 0);
  for (const week of [-1, 8, 1.5, NaN, '0']) {
    assert.equal(h.api.list('ghaith', week).length, 0);
    assert.equal(h.api.canManage('ghaith', week), false);
  }
  assert.equal(JSON.stringify(h.state), before);
  assert.equal(h.commits.length, 0);
});

test('company task submission stays isolated to its student and week and survives session reload', () => {
  const h = fixture();
  const task = h.api.submit('ghaith', 5, { ...taskValues, title: `  ${taskValues.title}  `, instructions: ` ${taskValues.instructions} ` });
  assert.equal(task.title, taskValues.title);
  assert.equal(task.instructions, taskValues.instructions);
  assert.equal(task.company, 'company-1');
  assert.ok(task.id);
  assert.ok(Number.isFinite(Date.parse(task.createdAt)));
  assert.ok(Number.isFinite(Date.parse(task.updatedAt)));
  assert.equal(h.api.list('ghaith', 5).length, 1);
  assert.equal(h.api.list('ghaith', 4).length, 0);
  assert.equal(h.api.list('alice', 5).length, 0);
  assert.equal(h.commits.length, 1);

  const restored = fixture(h.saved());
  restored.as('student:ghaith');
  assert.deepEqual(plain(restored.api.list('ghaith', 5)), plain(h.api.list('ghaith', 5)));
});

test('assignment writes do not change submitted or verified report data or visibility', () => {
  const h = fixture();
  h.state.plans.ghaith[2].status='verified';h.state.plans.ghaith[2].actualHours=15;
  h.state.plans.ghaith[3].status='submitted';h.state.plans.ghaith[3].actualHours=15;
  const before = plain(h.state.plans.ghaith.map(report));
  const visibility = plain(h.state.reportVisibility);
  const first = h.api.submit('ghaith', 0, taskValues);
  h.api.update('ghaith', 0, first.id, { ...taskValues, title: 'Updated task' });
  h.api.remove('ghaith', 0, first.id);
  h.api.submit('ghaith', 5, taskValues);
  h.api.submit('ghaith', 7, taskValues);
  assert.deepEqual(plain(h.state.plans.ghaith.map(report)), before);
  assert.deepEqual(plain(h.state.reportVisibility), visibility);
});

test('submitted and verified weeks lock task creation, editing, removal, reviews and student submissions',()=>{
  for(const status of ['submitted','verified']){
    const h=fixture(),task=h.api.submit('ghaith',5,taskValues);
    task.submissions=[{version:1,description:'Submitted work',files:[]}];
    h.state.plans.ghaith[5].status=status;
    assert.equal(h.api.canManage('ghaith',5),false);
    rejectsWithoutChange(h,()=>h.api.submit('ghaith',5,taskValues));
    rejectsWithoutChange(h,()=>h.api.update('ghaith',5,task.id,{...taskValues,title:'Late edit'}));
    rejectsWithoutChange(h,()=>h.api.remove('ghaith',5,task.id));
    rejectsWithoutChange(h,()=>h.api.review('ghaith',5,task.id,'Completed',''));
    h.as('student:ghaith');rejectsWithoutChange(h,()=>h.api.deliver('ghaith',5,task.id,{description:'Late submission'}));
  }
});

test('supervisor-requested revision reopens task changes for the host company',()=>{
  const h=fixture(),task=h.api.submit('ghaith',5,taskValues);h.state.plans.ghaith[5].status='revision';
  assert.equal(h.api.canManage('ghaith',5),true);
  h.api.update('ghaith',5,task.id,{...taskValues,title:'Revised instructions'});
  h.api.submit('ghaith',5,{title:'Required follow-up'});
  assert.equal(h.api.list('ghaith',5).length,2);
});

test('only the current host company can write tasks for an active placement', () => {
  for (const viewer of ['student:ghaith', 'supervisor:ahmad', 'admin:college-1', 'platform', 'company:company-2']) {
    const h = fixture();
    h.as(viewer);
    assert.equal(h.api.canManage('ghaith', 5), false, viewer);
    rejectsWithoutChange(h, () => h.api.submit('ghaith', 5, taskValues));
  }
  const h = fixture();
  assert.equal(h.api.canManage('ghaith', 5), true);
  assert.equal(h.api.canManage('sarah', 5), false);
  rejectsWithoutChange(h, () => h.api.submit('sarah', 5, taskValues));
  rejectsWithoutChange(h, () => h.api.submit('missing', 5, taskValues));
  for (const week of [-1, 8, 1.5, NaN, '5']) rejectsWithoutChange(h, () => h.api.submit('ghaith', week, taskValues));
});

test('a newer ended placement cannot be overridden by an older active history entry', () => {
  for (const status of ['Completed', 'Left']) {
    const h = fixture();
    h.state.histories.unshift({ id: 'ended-ghaith', student: 'ghaith', company: 'company-1', status });
    assert.equal(h.api.canManage('ghaith', 5), false);
    rejectsWithoutChange(h, () => h.api.submit('ghaith', 5, taskValues));
  }
  const h = fixture();
  h.state.histories[0].company = 'company-2';
  rejectsWithoutChange(h, () => h.api.submit('ghaith', 5, taskValues));
  h.state.histories = h.state.histories.filter(history => history.student !== 'ghaith');
  rejectsWithoutChange(h, () => h.api.submit('ghaith', 5, taskValues));
});

test('validation rejects blank or oversized content and invalid calendar dates without partial writes', () => {
  const h = fixture();
  for (const values of [
    { title: '' }, { title: '   ' }, { title: 'x'.repeat(121) },
    { ...taskValues, instructions: 'x'.repeat(2001) },
    ...['2026-02-30', '2026-13-01', '2026-2-01', 'not-a-date', '2026-11-02T12:00:00Z'].map(dueDate => ({ ...taskValues, dueDate }))
  ]) rejectsWithoutChange(h, () => h.api.submit('ghaith', 5, values));

  const noDate = h.api.submit('ghaith', 5, { title: 'No deadline required' });
  assert.equal(noDate.instructions, '');
  assert.equal(noDate.dueDate, '');
  const earlier = h.api.submit('ghaith', 0, { ...taskValues, dueDate: '2024-02-29' });
  assert.equal(earlier.dueDate, '2024-02-29');
});

test('updates keep task identity and do not allow moving or editing another week’s task', () => {
  const h = fixture();
  const original = plain(h.api.submit('ghaith', 5, taskValues));
  const updated = h.api.update('ghaith', 5, original.id, { title: '  Add keyboard tests  ', instructions: 'Check focus order.', dueDate: '' });
  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.company, original.company);
  assert.equal(updated.title, 'Add keyboard tests');
  assert.equal(updated.dueDate, '');
  assert.equal(h.api.list('ghaith', 5).length, 1);
  rejectsWithoutChange(h, () => h.api.update('ghaith', 4, original.id, taskValues));
  rejectsWithoutChange(h, () => h.api.update('alice', 5, original.id, taskValues));
  rejectsWithoutChange(h, () => h.api.update('ghaith', 5, original.id, { title: ' ' }));
  h.as('student:ghaith');
  rejectsWithoutChange(h, () => h.api.update('ghaith', 5, original.id, taskValues));
  rejectsWithoutChange(h, () => h.api.remove('ghaith', 5, original.id));
});

test('removal retains history while hiding the task from the student list', () => {
  const h = fixture();
  const task = h.api.submit('ghaith', 5, taskValues);
  h.api.remove('ghaith', 5, task.id);
  assert.equal(h.api.list('ghaith', 5).length, 0);
  assert.equal(h.state.plans.ghaith[5].tasks.length, 1);
  assert.ok(Number.isFinite(Date.parse(h.state.plans.ghaith[5].tasks[0].removedAt)));
  rejectsWithoutChange(h, () => h.api.update('ghaith', 5, task.id, taskValues));
  rejectsWithoutChange(h, () => h.api.remove('ghaith', 5, task.id));
  const restored = fixture(h.saved());
  restored.as('student:ghaith');
  assert.equal(restored.api.list('ghaith', 5).length, 0);
});

test('planned task instructions remain available when supervisor report access is restricted', () => {
  const h = fixture();
  const submitted = h.api.submit('ghaith', 5, taskValues);
  h.as('student:ghaith');
  h.C.reportRestricted = () => { throw new Error('Task assignments must not depend on report visibility'); };
  const tasks = h.api.list('ghaith', 5);
  assert.equal(tasks[0].id, submitted.id);
  assert.equal(tasks[0].instructions, taskValues.instructions);
  assert.equal(Object.hasOwn(tasks[0], 'notes'), false);
  assert.equal(Object.hasOwn(tasks[0], 'review'), false);
  assert.equal(Object.hasOwn(tasks[0], 'evidence'), false);
});
