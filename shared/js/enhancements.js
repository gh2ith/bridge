/* portal-refinement */
/* Small, page-local accessibility and navigation improvements. */
document.addEventListener('DOMContentLoaded',()=>{
 const main=document.querySelector('main');if(!main)return;
 if(!main.id)main.id='portalMain';main.tabIndex=-1;
 const skip=document.createElement('a');skip.className='portal-skip';skip.href=`#${main.id}`;skip.textContent='Skip to content';document.body.prepend(skip);
 const sidebar=document.querySelector('.bw-masar-sidebar'),toggle=document.getElementById('bwSidebarToggle');
 if(sidebar&&toggle&&(document.body.dataset.portalRole!=='student'||document.body.id==='page-account-settings'))window.BridgewayPortalNavigation(sidebar,toggle,main);
 const role=document.body.dataset.portalRole;
 // Dashboard headers share the approved compact supervisor layout.
 const profilePage=/\/(student-profile|company-profile|account-settings)\//.test(location.pathname);
 if(profilePage || (role!=='supervisor' && document.querySelector('.bw-tab-panel'))) {
  const heading=main.querySelector('.bw-page-header,.company-page-heading');
  if(heading) {
   document.body.classList.add('portal-compact');heading.classList.add('portal-compact-heading');
   const identities={student:['Al-Balqa Applied University','Student workspace'],supervisor:['Al-Balqa Applied University','Software Engineering · Supervisor workspace'],company:['Tech Corp Inc.','Company workspace'],admin:['Al-Balqa Applied University','College administration'],platform_admin:['Bridgeway','Platform administration']};
   const identity=document.createElement('div');identity.className='portal-workspace-identity';
   const [organization,workspace]=identities[role]||['Bridgeway','Workspace'];
   for(const [tag,text] of [['strong',organization],['span',workspace]]){const node=document.createElement(tag);node.textContent=text;identity.append(node);}
   main.querySelector('.company-breadcrumb')?.before(identity);
   let tools=heading.querySelector('#companyOverviewTools,#platformOverviewTools');
   if(!tools) {
    tools=document.createElement('div');tools.id='portalHeadingTools';
    if(role==='admin'){const actions=heading.querySelector('[data-style="s2"]');if(actions)tools.append(actions);}
    heading.append(tools);
   }
   tools.classList.add('portal-heading-tools');
   if(profilePage) {
    const title=heading.querySelector('h1');
    const back=heading.querySelector('a[href]') || (role==='company'?main.querySelector('a[href="../company-dashboard/company-dashboard.html"][data-style="s2"]'):null);
    if(back){const oldWrapper=back.parentElement;tools.append(back);if(oldWrapper!==heading && !oldWrapper.textContent.trim())oldWrapper.remove();}
    heading.replaceChildren(title,tools);
   }
  }
 }
 const copy={
  'tab-opportunities':['Available internships','Explore opportunities from your college partners and find a role that fits your studies.'],
  'tab-applications':['My applications','Track the progress of your internship applications.'],
  'tab-progress':['Training progress','Review your weekly activity, completed hours, and evaluations.'],
  'tab-courses':['Courses','Build your career skills.'],
  'tab-roster':['My students','Review your assigned students and their internship progress.'],
  'tab-reports':['Weekly reports','Review submitted work, verify training hours, and share feedback.'],
  'tab-endorsement':['Evaluations','Review the company evaluation, add your academic assessment, and forward it to the college administrator.'],
  'tab-progress-monitor':['Progress monitor','Track tasks, submissions, verified hours, and report reviews.'],
  'tab-completion':['Completion review','Review both evaluations and training requirements before issuing a certificate.'],
  'tab-overview':['College overview','Manage students, supervisors, and placements for your college.'],
  'tab-users':['College users','Accounts belonging to your college. Partner company accounts are managed by Platform Admin.'],
  'tab-students':['Students','Manage academic records and assign a supervisor to each student.'],
  'tab-companies':['Partner companies','View the companies connected to your college.'],
  'tab-supervisors':['Supervisors','Manage faculty supervisors and student assignments.'],
  'tab-posts':['Internship listings','Browse partner-company listings and control availability for your college only.'],
  'tab-approved':['Student internships','Review accepted internships and the supervisors responsible for them.']
 };
 function updateContext(){
  const panel=document.querySelector('.bw-tab-panel.is-active');if(!panel)return;
  document.querySelectorAll('.bw-masar-nav [data-tab]').forEach(button=>{if(button.dataset.tab===panel.id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  if(role!=='company'&&role!=='platform_admin'&&copy[panel.id]){const h=main.querySelector('h1'),p=main.querySelector('.bw-subtitle');if(h)h.textContent=copy[panel.id][0];if(p)p.textContent=copy[panel.id][1];}
 }
 document.querySelectorAll('.bw-tab-panel').forEach(panel=>new MutationObserver(updateContext).observe(panel,{attributes:true,attributeFilter:['class']}));updateContext();
 document.querySelectorAll('button,a').forEach(control=>{
  control.querySelectorAll('i.bi').forEach(icon=>icon.setAttribute('aria-hidden','true'));
  if(!control.textContent.trim()&&!control.getAttribute('aria-label')&&control.title)control.setAttribute('aria-label',control.title);
 });
 // Shared presentation hooks keep role-specific selection and filtering intact.
 document.querySelectorAll('.company-student-directory,.evaluation-student-picker,.evaluation-directory').forEach(picker=>picker.classList.add('bw-student-picker'));
 // The same header position for every student detail, independent of its content.
 for(const [buttonId,label] of [['clearCompanyWeekly','Weekly training'],['clearCompanyEvaluation','End-of-term evaluation'],['clearSupervisorReport','Weekly reports'],['clearSupervisorEvaluation','Company evaluation']]){
   const button=document.getElementById(buttonId);if(!button)continue;
   const root=button.closest('#companyWeeklyDetail,#companyEvaluationDetail,#supervisorReportDetail,.evaluation-detail');if(!root)continue;
   const toolbar=document.createElement('header');toolbar.className='bw-detail-toolbar';
   const title=document.createElement('h2');title.textContent=label;
   button.textContent='Change student';toolbar.append(title,button);root.prepend(toolbar);
   if(buttonId==='clearCompanyEvaluation')root.querySelector('.assessment-header')?.remove();
 }
 document.querySelectorAll('.company-workspace table.bw-table,.company-workspace table.listing-table').forEach(table=>{
   if(table.classList.contains('evaluation-score-table'))return;
   table.classList.add('bw-mobile-records');table.setAttribute('role','table');
   table.parentElement.classList.add('bw-records-container');
   table.querySelectorAll('thead,tbody').forEach(group=>group.setAttribute('role','rowgroup'));
   const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
   function labelRows(){
     table.querySelectorAll('tbody tr').forEach(row=>{
       row.setAttribute('role','row');
       [...row.cells].forEach((cell,index)=>{
         cell.setAttribute('role',cell.tagName==='TH'?'rowheader':'cell');
         cell.dataset.mobileLabel=cell.colSpan>1?'':labels[index]||'';
       });
     });
   }
   labelRows();
   const body=table.querySelector('tbody');
   if(body)new MutationObserver(labelRows).observe(body,{childList:true,subtree:true});
 });
 document.querySelectorAll('table th').forEach(th=>{if(!th.hasAttribute('scope'))th.scope='col';});
 document.querySelectorAll('.bw-table-container,.bw-table-responsive,.listing-table-scroll').forEach(area=>{
   if(!area.querySelector('table'))return;area.tabIndex=0;area.setAttribute('role','region');area.setAttribute('aria-label','Scrollable data table');
 });
 // Existing modal markup keeps its close/submit handlers; add focus containment and return.
 let returnFocus=null;
 document.addEventListener('click',event=>{if(!event.target.closest('.bw-modal-backdrop'))returnFocus=event.target.closest('button,a') || document.activeElement;},true);
 const inertBefore=new Map();
 function isolateModal(){
  const open=[...document.querySelectorAll('.bw-modal-backdrop.is-open')].find(n=>getComputedStyle(n).display!=='none');
  if(!open){inertBefore.forEach((value,node)=>{node.inert=value;});inertBefore.clear();return;}
  [...document.body.children].forEach(node=>{if(node===open||node.contains(open)||node.tagName==='SCRIPT')return;if(!inertBefore.has(node))inertBefore.set(node,node.inert);node.inert=true;});
 }
 document.querySelectorAll('.bw-modal-backdrop').forEach(backdrop=>{
  const dialog=backdrop.querySelector('.bw-modal-dialog');if(!dialog)return;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
  const title=dialog.querySelector('.bw-modal-title');if(title){if(!title.id)title.id=`${backdrop.id}Title`;dialog.setAttribute('aria-labelledby',title.id);}
  let wasOpen=false;
  dialog.querySelectorAll('.bw-modal-close').forEach(b=>b.setAttribute('aria-label','Close dialog'));
  new MutationObserver(()=>{const open=getComputedStyle(backdrop).display!=='none'&&backdrop.classList.contains('is-open');isolateModal();if(open&&!wasOpen)(dialog.querySelector('input:not([type="hidden"]),select,textarea,button')||dialog).focus();if(!open&&wasOpen&&returnFocus?.isConnected)returnFocus.focus();wasOpen=open;}).observe(backdrop,{attributes:true,attributeFilter:['class','style']});
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){window.closeModal?.(backdrop.id);return;}
   if(event.key!=='Tab')return;
   const focusable=[...dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
   const first=focusable[0],last=focusable.at(-1);if(!first){event.preventDefault();return;}
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
 });
 const toastObserver=new MutationObserver(()=>{const toast=document.getElementById('bwPortalToast');if(toast&&!toast.hasAttribute('role')){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');}});toastObserver.observe(document.body,{childList:true});
});

/* portal-consistency */
/* Fixed frontend records and local view helpers. No persistence or network calls. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = selector => document.querySelector(selector);
  const model = window.BridgewayPartners;
  const role = document.body.dataset.portalRole || 'company';
  const make = (tag, text, cls) => { const node = document.createElement(tag); node.textContent = text; if (cls) node.className = cls; return node; };
  const set = (selector, text) => { const node = $(selector); if (node) node.textContent = text; };

  // Initial counts and counts after existing local list actions share the visible records.
  const applicationBody = $('#studentApplicationsTable');
  if (applicationBody) {
    const count = () => set('#my-applications .bw-badge', `${applicationBody.rows.length} applications`);
    count();
    new MutationObserver(count).observe(applicationBody, {childList:true});
  }
  if ($('#tab-opportunities')) {
    const opportunityNav=$('[data-tab="tab-opportunities"]');
    set('[data-tab="tab-opportunities"] .bw-tab-badge', $('#tab-opportunities').querySelectorAll('.bw-opp-card').length);
    if(opportunityNav) opportunityNav.title=opportunityNav.textContent.trim().replace(/\s+/g,' ');
    // Empty search feedback for the existing opportunity search.
    const empty = make('p','No internships match these filters. Clear the search or choose another category.','portal-muted');empty.id='opportunitiesEmpty';
    empty.hidden = true; $('#tab-opportunities').append(empty);
    const sync = () => { empty.hidden = [...$('#tab-opportunities').querySelectorAll('.bw-opp-card')].some(card => card.style.display !== 'none'); };
    $('#oppSearchInput')?.addEventListener('input',sync);
    document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',sync));
  }

  if (role === 'supervisor') {
    const assigned = model.students.filter(s=>s.supervisor==='Dr. Ahmad S.');
    set('[data-tab="tab-roster"] .bw-tab-badge',assigned.length);
    set('#kpiPendingReports','1'); set('#tabBadgeMissingReports','1');
  }

  // Search existing college directories without changing their business actions.
  if (role === 'admin') {
    for (const id of ['tab-users','tab-students','tab-supervisors','tab-approved','tab-posts']) {
      const panel=$(`#${id}`), table=panel?.querySelector('table'); if(!table)continue;
      const title=({ 'tab-users':'college users','tab-students':'students','tab-supervisors':'supervisors','tab-approved':'student internships','tab-posts':'internship posts'})[id];
      const toolbar=make('div','','portal-directory-search'); const label=make('label',`Search ${title}`);
      const input=make('input','', 'bw-input'); input.type='search'; input.id=`${id}-search`; label.htmlFor=input.id; input.placeholder=id==='tab-students'?'Name, email, or student ID':'Search by name or details';
      const count=make('span','','portal-muted'); count.setAttribute('role','status'); toolbar.append(label,input,count);
      const wrapper=table.parentElement; wrapper.before(toolbar);
      const empty=make('p',`No matching ${title}. Clear the search to return to the directory.`,'portal-muted');empty.id=`${id}-empty`;empty.hidden=true;wrapper.after(empty);
      const filter=()=>{let n=0; [...table.tBodies[0].rows].forEach(row=>{const copy=row.cloneNode(true);copy.querySelectorAll('button,select,details').forEach(node=>node.remove());const record=model.students.find(s=>s.id===row.dataset.accountId||s.name===row.dataset.studentName),text=`${copy.textContent} ${record?.studentId||''} ${record?.email||''}`;row.hidden=!text.toLowerCase().includes(input.value.trim().toLowerCase());if(!row.hidden)n++;});count.textContent=`${n} of ${table.tBodies[0].rows.length} records`;empty.hidden=n>0;};
      input.addEventListener('input',filter); new MutationObserver(filter).observe(table.tBodies[0],{childList:true}); filter();
    }
    document.querySelectorAll('#adminStudentsTableBody tr').forEach(row=>{
      const name=row.cells[0].firstElementChild?.textContent.trim() || row.cells[0].textContent.trim();
      row.querySelector('select')?.setAttribute('aria-label',`Assigned supervisor for ${name}`);
      row.querySelector('button[data-onclick*="openUnassignModal"]')?.setAttribute('aria-label',`Unassign supervisor from ${name}`);
      row.querySelectorAll('option').forEach(o=>{if(o.textContent.includes('Rania'))o.remove();});
    });
  }

  // Scope listing entry points and combine search with the existing status filter.
  const applicants=$('#companyCandidatesTableBody');
  if(applicants) {
    let status='all', listing='';
    const context=make('div','','portal-listing-context'); const title=make('span','All listings'); const clear=make('button','Show all listings','bw-tag-btn'); clear.type='button'; clear.hidden=true; context.append(title,clear); applicants.closest('.company-applications-panel, #tab-candidates').prepend(context);
    const empty=make('p','No applications match these filters. Clear the filters to see the company’s applicants.','portal-muted');empty.id='companyApplicantsEmpty';applicants.closest('table').parentElement.after(empty);
    function filter(){let n=0;const q=$('#candidateSearchInput').value.trim().toLowerCase();[...applicants.rows].forEach(row=>{const s=model.students.find(s=>s.id===row.dataset.studentId);const state=s?.stage==='Placed'?'accepted':s?.stage==='Applied'?'review':s?.stage==='Rejected'?'rejected':'awaiting';row.dataset.status=state;row.style.display=(!listing||s?.role===listing)&&(status==='all'||status===state)&&row.textContent.toLowerCase().includes(q)?'':'none';if(row.style.display!=='none')n++;});empty.hidden=n>0;}
    window.searchCandidates=filter;
    window.filterCandidates=(next,button)=>{status=next;button?.parentElement.querySelectorAll('.bw-tag-btn').forEach(b=>b.classList.toggle('is-active',b===button));filter();};
    clear.addEventListener('click',()=>{listing='';title.textContent='All listings';clear.hidden=true;filter();});
    document.querySelectorAll('.listing-applicants').forEach(button=>{button.onclick = null;button.addEventListener('click',()=>{listing=button.getAttribute('aria-label').replace('Review applicants for ','');status='all';document.querySelectorAll('#tab-candidates .bw-tag-btn[data-onclick*=filterCandidates]').forEach(b=>b.classList.toggle('is-active',b.getAttribute('data-onclick').includes('filterCandidates-all-')));$('#candidateSearchInput').value='';title.textContent=listing;clear.hidden=false;window.switchTab('tab-candidates');filter();});});
    const reportButton=applicants.querySelector('[data-student-id="ghaith"] button[data-onclick*="tab-weekly-reports"]');
    if(reportButton){reportButton.onclick = null;reportButton.addEventListener('click',()=>{const card=$('[data-weekly-id="2"]');window.selectWeeklyIntern('2',card,'Ghaith Amourah');window.switchTab('tab-weekly-reports');});}
    new MutationObserver(filter).observe(applicants,{subtree:true,childList:true}); filter();
  }
  const candidates=$('#candidateTableBody');
  if(candidates){
    const update=()=>{document.querySelectorAll('[data-filter]').forEach(b=>{const value=b.dataset.filter;const rows=[...candidates.rows];const n=rows.filter(r=>value==='all'||r.dataset.status===value).length;b.textContent=`${value==='all'?'All applicants':value==='accepted'?'Active interns':value==='awaiting'?'Awaiting placement':'Applied'} (${n})`;});};
    new MutationObserver(update).observe(candidates,{subtree:true,childList:true,attributes:true,attributeFilter:['data-status']}); update();
  }

  document.querySelectorAll('.listing-detail a[href="../company-post-role/company-post-role.html"]').forEach(a=>{a.href=`../company-post-role/company-post-role.html?listing=${a.closest('.listing-detail').id==='listing-frontend'?'frontend':'software'}`;});
  // Navigation is presentation state; URLs work without browser storage.
  document.querySelectorAll('.bw-masar-nav [data-tab]').forEach(button=>button.addEventListener('click',()=>{
    if(location.hash!==`#${button.dataset.tab}`)history.pushState(null,'',`#${button.dataset.tab}`);
  }));

  if(location.pathname.endsWith('account-settings.html')) {
    $('.bw-masar-sidebar').setAttribute('aria-label',`${$('#portalRoleLabel').textContent} navigation`);
    const variants={
      company:[['Weekly report reviews','Updates on reports reviewed by assigned supervisors.'],['Application updates','Updates for applicants to your company listings.'],['College partnership updates','Updates to your connected colleges.']],
      supervisor:[['Weekly reports','Reports submitted by your assigned students’ companies.'],['Company evaluations','Evaluations for your assigned students.'],['Ticket updates','New tickets, replies, and status changes.']],
      admin:[['Placement updates','Updates to placements belonging to your college.'],['Supervisor assignments','Changes to your college supervision roster.'],['Partner updates','Updates to your college’s company connections.']],
      platform_admin:[['Account updates','Updates to company and college accounts.'],['Partnership updates','Changes to college–company connections.'],['Escalated issues','Issues requiring platform attention.']]
    };
    const labels=[...document.querySelectorAll('label')].filter(l=>l.querySelector('input[type="checkbox"]'));
    (variants[role]||[]).forEach(([title,description],i)=>{const parts=labels[i]?.querySelectorAll('div > div');if(parts?.length>=2){parts[0].textContent=title;parts[1].textContent=description;}});
    const card=labels[0]?.closest('.bw-card-panel'); if(card)card.querySelector('.bw-card-panel-header > div > div').textContent='Preferences are saved in this browser. External notifications are not connected.';
  }
});

// Presentation fixes from the design walkthrough; no saved state.
document.addEventListener('DOMContentLoaded',()=>{
 const panels=[...document.querySelectorAll('.bw-tab-panel')];
 function taskContext(){const active=panels.find(p=>p.classList.contains('is-active'));const overviewViews=document.body.dataset.portalRole==='admin'?['tab-overview']:['tab-overview','tab-posts','tab-opportunities','tab-roster'];document.body.classList.toggle('portal-task-view',!!active&&!overviewViews.includes(active.id));}
 panels.forEach(p=>new MutationObserver(taskContext).observe(p,{attributes:true,attributeFilter:['class']}));taskContext();
 const select=document.getElementById('evaluationStudentSelect');
 if(select && !document.getElementById('companyEvaluationStudents')){
  const roster=document.createElement('div');roster.className='evaluation-roster';roster.setAttribute('role','group');roster.setAttribute('aria-label','Students to evaluate');select.after(roster);select.hidden=true;document.querySelector('label[for="evaluationStudentSelect"]').hidden=true;
  const options=[...select.options].filter(o=>window.BridgewayPartners.students.some(s=>s.id===o.value&&s.company==='company-1'&&s.stage==='Placed'));
  const search=document.getElementById('evaluationStudentSearch');
  function render(){roster.replaceChildren();const q=search.value.trim().toLowerCase();options.filter(o=>o.textContent.toLowerCase().includes(q)).forEach(o=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(select.value===o.value));const name=document.createElement('strong');name.textContent=o.dataset.name;const id=document.createElement('small');id.textContent='Student ID '+o.textContent.split('·')[1].trim();b.append(name,id);b.addEventListener('click',()=>{select.value=o.value;select.dispatchEvent(new Event('change'));render();roster.querySelector('[aria-pressed="true"]')?.focus();});roster.append(b);});document.getElementById('evaluationStudentEmpty').hidden=roster.children.length>0;document.querySelector('.evaluation-form-area').hidden=!select.value||roster.children.length===0;}
  search.addEventListener('input',render);select.addEventListener('change',render);const previous=window.selectInternForRubric;window.selectInternForRubric=(...args)=>{previous(...args);render();};render();
 }
 document.querySelectorAll('.bw-table-container,.bw-table-responsive,.listing-table-scroll').forEach(area=>{
  const table=area.querySelector('table');if(!table)return;
  const hint=document.createElement('p');hint.className='portal-table-hint';hint.textContent='Scroll horizontally to see all columns and actions.';area.before(hint);
  const update=()=>{const scrolling=area.clientWidth>0&&area.scrollWidth>area.clientWidth+1;hint.hidden=!scrolling;area.setAttribute('aria-label',scrolling?'Scrollable data table':'Data table');if(scrolling)area.tabIndex=0;else area.removeAttribute('tabindex');};
  const observer=new ResizeObserver(update);observer.observe(area);observer.observe(table);update();
 });
});

// Security belongs inside the profile, alongside account details.
document.addEventListener('DOMContentLoaded',()=>{
 if(document.documentElement.dataset.page!=='company-profile')return;
 const section=document.createElement('section');section.className='bw-card-panel profile-account-security';section.setAttribute('aria-labelledby','companySecurityHeading');
 window.BridgewayAccountSecurity(section);document.querySelector('.bw-main-content').append(section);
});
