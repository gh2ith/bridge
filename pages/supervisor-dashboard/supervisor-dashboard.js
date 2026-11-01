// The roster is built from current academic assignments, not the original HTML rows.
document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('supervisedStudentsTable');
  const body = table?.tBodies[0];
  if (!body) return;
  const template = body.rows[0].cloneNode(true);
  const search = document.getElementById('rosterSearchInput');
  const total = document.querySelector('#tab-roster .bw-badge-purple');
  const pager = document.createElement('nav');
  pager.className = 'roster-pagination';
  pager.setAttribute('aria-label', 'Assigned student pages');
  const results = document.createElement('span');
  results.setAttribute('role', 'status');
  const previous = document.createElement('button');
  previous.type = 'button'; previous.textContent = 'Previous'; previous.className = 'bw-tag-btn';
  const position = document.createElement('span');
  const next = document.createElement('button');
  next.type = 'button'; next.textContent = 'Next'; next.className = 'bw-tag-btn';
  pager.append(results, previous, position, next);
  table.parentElement.after(pager);
  table.dataset.portalTable = 'true';
  let page = 1;

  function render() {
    const C = window.BridgewayCycle;
    if (!C) return;
    const model = window.BridgewayPartners;
    const assigned = model.students.filter(student => student.supervisor === 'Dr. Ahmad S.');
    const query = search.value.trim().toLowerCase();
    const matches = assigned.filter(student => (student.name+' '+student.studentId+' '+C.org(student.company)).toLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(matches.length / 10));
    page = Math.min(page, pages);
    body.replaceChildren();
    for (const student of matches.slice((page - 1) * 10, page * 10)) {
      const row = template.cloneNode(true);
      row.dataset.studentId = student.id;
      const name = row.querySelector('[data-style="s10"]');
      name.textContent = student.name;
      row.querySelector('.bw-user-avatar').textContent = student.name.split(/\s+/).slice(0,2).map(part => part[0]).join('');
      row.querySelector('[data-style="s11"]').textContent = 'ID #'+student.studentId;
      row.cells[1].querySelector('[data-style="s12"]').textContent = student.department || 'Not recorded';
      row.cells[1].querySelector('[data-style="s14"]').textContent = student.gpa || 'Not recorded';
      row.cells[2].querySelector('[data-style="s15"]').textContent = student.company ? C.org(student.company) : 'No placement';
      row.cells[2].querySelector('[data-style="s13"]').textContent = student.mentor ? 'Mentor: '+student.mentor : '';
      const plan = C.state.plans[student.id] || [];
      const verified = plan.filter(week => week.status === 'verified').length;
      const hours = C.hours(student.id);
      const complete = verified === 8 && hours >= 120;
      const pending = plan.filter(week => week.status === 'submitted').length;
      const revision = plan.some(week => week.status === 'revision');
      const cell = row.cells[3], track = cell.querySelector('.bw-progress-track');
      cell.classList.add('roster-training-progress');
      cell.dataset.progressState = complete ? 'verified' : 'in-progress';
      cell.querySelector('.roster-progress-label').textContent = verified+' of 8 weeks verified';
      cell.querySelector('.roster-hours').textContent = hours+' / 120 hours verified';
      cell.querySelector('.bw-progress-fill').style.width = verified / 8 * 100 + '%';
      track.setAttribute('role','progressbar');track.setAttribute('aria-label',student.name+': verified weeks');
      track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','8');track.setAttribute('aria-valuenow',String(verified));
      const badge = row.cells[4].querySelector('.bw-badge');
      badge.textContent = pending ? pending+' to review' : revision ? 'Revision requested' : complete ? 'All weeks verified' : plan.length ? 'Training in progress' : 'No training plan';
      badge.className = 'bw-badge '+(pending || revision ? 'bw-badge-warning' : complete ? 'bw-badge-success' : 'bw-badge-blue');
      const action = row.cells[5].querySelector('button');
      action.removeAttribute('data-onclick');
      action.disabled = !plan.length;
      action.setAttribute('aria-label','Weekly reports for '+student.name);
      action.addEventListener('click', () => { window.switchTab('tab-reports'); window.reviewStudentReport(student.name); });
      body.append(row);
    }
    if (!matches.length) {
      const row = body.insertRow(), cell = row.insertCell();
      cell.colSpan = 6;
      cell.textContent = query ? 'No students match your search.' : 'No students assigned yet.';
    }
    total.textContent = assigned.length+' assigned students';
    results.textContent = matches.length ? ((page-1)*10+1)+' to '+Math.min(page*10,matches.length)+' of '+matches.length+' students' : '0 students';
    position.textContent = 'Page '+page+'/'+pages;
    previous.disabled = page === 1; next.disabled = page === pages;
  }
  previous.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  search.addEventListener('input', () => { page=1; render(); });
  queueMicrotask(render);
  document.addEventListener('bridgeway:cycle-change', render);
});

// Compact, read-only student details without replacing or expanding the dashboard.
document.addEventListener('DOMContentLoaded',()=>{
  const table=document.getElementById('supervisedStudentsTable');if(!table)return;
  const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  table.addEventListener('click',event=>{
    const opener=event.target.closest('.bw-record-open');if(!opener)return;
    const C=window.BridgewayCycle,row=opener.closest('tr');
    const s=window.BridgewayPartners.students.find(s=>s.supervisor==='Dr. Ahmad S.'&&s.id===row.dataset.studentId);
    if(!C||!s)return;
    event.preventDefault();event.stopImmediatePropagation();
    const history=C.state.histories.filter(h=>h.student===s.id),current=history[0],plan=C.state.plans[s.id]||[];
    const body=make('div',null,'supervisor-student-details'),header=make('header');
    const identity=make('div');identity.append(make('h3',s.name),make('p',`Student ID ${s.studentId}`));header.append(identity,C.status(current?.status||s.stage));body.append(header);
    const facts=make('dl');
    const department=row.cells[1]?.querySelector('[data-style="s12"]')?.textContent.trim();
    const mentor=row.cells[2]?.querySelector('[data-style="s13"]')?.textContent.replace(/^Mentor:\s*/,'').trim();
    [
      ['University',C.org(s.college)],['Department',s.department||department],
      ['Cumulative GPA',`${s.gpa} / 4.00`],['Academic supervisor',s.supervisor],
      ['Host company',C.org(s.company)],['Company mentor',mentor],
      ['Internship role',current?.role||s.role],
      ['Training dates',current?`${current.start||'Not recorded'} — ${current.end||'Ongoing'}`:null]
    ].forEach(([label,value])=>{const pair=make('div');pair.append(make('dt',label),make('dd',value||'Not provided'));facts.append(pair);});body.append(facts);
    const summary=make('section',null,'supervisor-details-progress');
    summary.append(make('strong',`${C.hours(s.id)} / 120 h verified`),make('span',`${plan.filter(w=>w.status==='verified').length} of 8 weeks verified`));
    const bar=make('progress');bar.max=120;bar.value=C.hours(s.id);bar.setAttribute('aria-label',`${C.hours(s.id)} of 120 hours verified`);summary.append(bar);
    const pending=plan.filter(w=>w.status==='submitted').length;
    summary.append(make('p',`${pending?pending+' '+(pending===1?'report awaiting':'reports awaiting')+' review':'No reports awaiting review'} · Company evaluation ${C.state.evaluations[s.id]?'submitted':'not submitted'}`));body.append(summary);
    const actions=make('div',null,'cycle-actions'),reports=make('button','Weekly reports','cycle-button is-primary');reports.type='button';actions.append(reports);body.append(actions);
    const modal=C.dialog('Student details',body);modal.classList.add('supervisor-student-dialog');
    reports.addEventListener('click',()=>{modal.close();window.switchTab('tab-reports');window.reviewStudentReport(s.name);});
  },true);
});

// Compact header example, scoped to this portal.
document.addEventListener('DOMContentLoaded',()=>{
  const breadcrumb=document.querySelector('.company-breadcrumb');
  const identity=document.createElement('div');identity.className='supervisor-workspace-identity';
  const college=document.createElement('strong');college.textContent='Al-Balqa Applied University';
  const department=document.createElement('span');department.textContent='Software Engineering · Supervisor workspace';
  identity.append(college,department);breadcrumb.replaceWith(identity);
});
/* Fixed examples for this supervisor; no backend, persistence, or editing. */
document.addEventListener('DOMContentLoaded',()=>{
 const records=[
  {id:'sarah',name:'Sarah Ahmad',studentId:window.BridgewayPartners.students.find(s=>s.id==='sarah').studentId,company:'Nexus Cloud Systems',role:'Full-Stack .NET Developer Intern',mentor:'Eng. Omar F.',date:'October 8, 2026',scores:[5,5,4,5,4,4,5,5],comments:'Sarah completed the training requirements and consistently delivered reliable work. She showed strong ownership and learned new tools quickly. Continue developing estimation skills and communicating blockers earlier.'},
  {id:'ghaith',name:'Ghaith Amourah',studentId:'20220148',company:'Tech Corp Inc.',role:'Software Engineering Intern',scores:null}
 ];
 const criteria=['Performance Level','Sense of Responsibility','Accuracy in Execution','Attendance & Punctuality','Teamwork & Collaboration','Adaptability & Flexibility','Speed of Learning','Curriculum Completion'];
 const ratings=['','Weak','Acceptable','Good','Very Good','Excellent'];
 const $=id=>document.getElementById(id);
 const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
 let selected='';
 function renderList(){
  const query=$('supervisorEvaluationSearch').value.trim().toLowerCase();
  const matches=records.filter(record=>`${record.name} ${record.studentId} ${record.company}`.toLowerCase().includes(query));
  const list=$('supervisorEvaluationStudents');list.replaceChildren();
  matches.forEach(record=>{const button=make('button',null,'evaluation-student-button');button.type='button';button.setAttribute('aria-pressed',String(record.id===selected));button.setAttribute('aria-controls','supervisorEvaluationSubmitted supervisorEvaluationPending');button.append(make('strong',record.name),make('span',`${record.studentId} / ${record.company}`),make('small',record.scores?'Submitted':'Not submitted'));button.addEventListener('click',()=>{selected=record.id;list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderDetail();});list.append(button);});
  $('supervisorEvaluationCount').textContent=`${matches.length} of ${records.length} assigned students`;
  $('supervisorEvaluationEmpty').hidden=matches.length>0;
  renderDetail();
 }
 function renderDetail(){
  const record=records.find(item=>item.id===selected);
  document.querySelector('.evaluation-detail').hidden=!record;
  $('supervisorEvaluationPrompt').hidden=Boolean(record);
  if(!record)return;
  $('supervisorEvaluationName').textContent=record.name;
  $('supervisorEvaluationIdentity').textContent=`ID ${record.studentId} · ${record.role}`;
  $('supervisorEvaluationStatus').textContent=record.scores?'Submitted':'Not submitted';
  $('supervisorEvaluationStatus').className=`bw-badge ${record.scores?'bw-badge-success':'bw-badge-amber'}`;
  $('supervisorEvaluationPending').hidden=Boolean(record.scores);
  $('supervisorEvaluationSubmitted').hidden=!record.scores;
  $('supervisorEvaluationScores').replaceChildren();
  for(const id of ['Company','Mentor','Date','Score','Comments'])$(`supervisorEvaluation${id}`).textContent='';
  if(!record.scores)return;
  window.BridgewayRadar.mount($('supervisorEvaluationRadar')).update(record.scores,{submitted:true});
  $('supervisorEvaluationCompany').textContent=record.company;$('supervisorEvaluationMentor').textContent=record.mentor;$('supervisorEvaluationDate').textContent=record.date;
  const score=record.scores.reduce((sum,n)=>sum+n,0);$('supervisorEvaluationScore').textContent=`${score} / 40 (${score/40*100}%)`;
  record.scores.forEach((score,index)=>{const row=make('tr');const label=make('th',criteria[index]);label.scope='row';row.append(label,make('td',`${score} / 5`),make('td',ratings[score]));$('supervisorEvaluationScores').append(row);});
  $('supervisorEvaluationComments').textContent=record.comments;
 }
 $('supervisorEvaluationSearch').addEventListener('input',renderList);
 $('clearSupervisorEvaluation').addEventListener('click',()=>{selected='';renderList();$('supervisorEvaluationSearch').focus();});
 renderList();renderDetail();
});

// Weekly reports use the same selection-first workspace as company evaluations.
document.addEventListener('DOMContentLoaded', () => {
  const model = window.BridgewayPartners;
  const students = model.students.filter(student => student.supervisor === 'Dr. Ahmad S.' && ['Placed','Completed','Left'].includes(student.stage));
  const search = document.getElementById('supervisorReportSearch');
  const list = document.getElementById('supervisorReportStudents');
  const detail = document.getElementById('supervisorReportDetail');
  const prompt = document.getElementById('supervisorReportPrompt');
  const tracker=document.querySelector('.report-week-tracker');
  const reviewStates=new Map();
  detail.insertBefore(tracker,detail.querySelector('.report-student-summary'));
  function renderTimeline(student) {
    const timeline=document.getElementById('curriculumTimelineGrid');
    timeline.setAttribute('role','list');timeline.setAttribute('aria-label','Weekly training status');
    timeline.replaceChildren();
    for(let week=1;week<=8;week++) {
      const verified=week<student.weeks || student.weeks===8 || (week===student.weeks && reviewStates.get(student.id)==='verified');
      const review=week===student.weeks && !verified;
      const revision=review && reviewStates.get(student.id)==='revision';
      const item=document.createElement('div');item.className=`report-week ${verified?'is-verified':review?'is-review':'is-upcoming'}`;
      item.setAttribute('role','listitem');
      item.setAttribute('aria-label',`Week ${week}: ${verified?'Verified, 15 hours':revision?'Revision requested, 15 hours':review?'In review, 15 hours':'Upcoming'}`);
      const title=document.createElement('strong');title.textContent=week;title.setAttribute('aria-hidden','true');
      const state=document.createElement('span');state.textContent=verified?'Verified':revision?'Revision':review?'In review':'Upcoming';state.setAttribute('aria-hidden','true');
      const hours=document.createElement('small');hours.textContent=verified||review?'15 h':'—';hours.setAttribute('aria-hidden','true');
      item.append(title,state,hours);timeline.append(item);
    }
  }
  let selected = '';
  function render() {
    const query = search.value.trim().toLowerCase();
    const matches = students.filter(student => {
      const company = model.organizations.find(company => company.id === student.company).name;
      return `${student.name} ${student.studentId} ${company}`.toLowerCase().includes(query);
    });
    list.replaceChildren();
    matches.forEach(student => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'evaluation-student-button';
      button.setAttribute('aria-pressed', String(student.id === selected));
      button.setAttribute('aria-controls', detail.id);
      const company = model.organizations.find(company => company.id === student.company).name;
      const status=reviewStates.get(student.id);
      [['strong',student.name],['span',`${student.studentId} / ${company}`],['small',student.weeks === 8 ? 'All weeks verified' : `Week ${student.weeks} · ${status==='verified'?'Verified':status==='revision'?'Revision requested':'Pending review'}`]].forEach(([tag,text]) => {
        const node = document.createElement(tag);node.textContent = text;button.append(node);
      });
      button.addEventListener('click', () => window.reviewStudentReport(student.name));
      list.append(button);
    });
    document.getElementById('supervisorReportCount').textContent = `${matches.length} of ${students.length} assigned students`;
    document.getElementById('supervisorReportEmpty').hidden = matches.length > 0;
    detail.hidden = !selected;
    prompt.hidden = Boolean(selected);
  }
  const review = window.reviewStudentReport;
  window.reviewStudentReport = (...args) => {
    const student = students.find(student => student.name === args[0]);
    if (!student) return;
    selected = student.id;
    review(...args);
    renderTimeline(student);
    render();
  };
  search.addEventListener('input', render);
  document.addEventListener('bridgeway:report-reviewed',event=>{
    const student=students.find(student=>student.name===event.detail.name);
    if(!student)return;
    reviewStates.set(student.id,event.detail.status);renderTimeline(student);render();
    const row=[...document.querySelectorAll('#supervisedStudentsTable tbody tr')].find(row=>row.cells[0].textContent.includes(student.name));
    const badge=row?.cells[4]?.querySelector('.bw-badge');
    if(badge){badge.textContent=event.detail.status==='verified'?'Verified':'Revision';badge.className=`bw-badge ${event.detail.status==='verified'?'bw-badge-success':'bw-badge-amber'}`;}
  });
  document.getElementById('clearSupervisorReport').addEventListener('click', () => {selected='';render();search.focus();});
  render();
});

// Explicit handlers keep HTML presentation-only and preserve native event semantics.
(function () {
  document.querySelectorAll('[data-onclick="switchTab-tab-roster-1"]').forEach(element => {
    element.onclick = function(event) { window.switchTab('tab-roster'); };
  });
  document.querySelectorAll('[data-onclick="switchTab-tab-reports-2"]').forEach(element => {
    element.onclick = function(event) { window.switchTab('tab-reports'); };
  });
  document.querySelectorAll('[data-onclick="reviewStudentReport-GA-3"]').forEach(element => {
    element.onclick = function(event) { reviewStudentReport('Ghaith Amourah', 'Tech Corp Inc. • Company Mentor: Eng. Khalid T.', '90h / 120h', 'Week 6', 'GA') };
  });
  document.querySelectorAll('[data-onclick="switchTab-tab-endorsement-4"]').forEach(element => {
    element.onclick = function(event) { window.switchTab('tab-endorsement') };
  });
  document.querySelectorAll('[data-onclick="reviewStudentReport-SA-5"]').forEach(element => {
    element.onclick = function(event) { reviewStudentReport('Sarah Ahmad', 'Nexus Cloud Systems • Company Mentor: Eng. Omar F.', '120h / 120h', 'Week 8', 'SA') };
  });
})();
