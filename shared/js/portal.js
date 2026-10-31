/* partnership-data */
// CV metadata is a local preview marker, never an uploaded or analyzed document.
window.BridgewayCV = {
  get key() { const id=window.BridgewayStudent?.current().id||'ghaith';return 'bridgeway:student-cv-preview:v1'+(id==='ghaith'?'':':'+id); },
  read() {
    try {
      const file = JSON.parse(localStorage.getItem(this.key));
      return file && typeof file.name === 'string' && Number.isFinite(file.size) && file.size > 0 && file.size <= 5 * 1024 * 1024 && /\.(pdf|docx)$/i.test(file.name) ? file : null;
    } catch { return null; }
  },
  set(file) {
    try {
      if (file) localStorage.setItem(this.key, JSON.stringify({name:file.name, size:file.size}));
      else localStorage.removeItem(this.key);
      return true;
    } catch { return false; }
  }
};
// Room validation shared by application-linked interviews.
window.BridgewayMeetings = {
  records: [],
  validUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'meet.jit.si' && !url.port && !url.username && !url.password && /^\/[A-Za-z0-9_-]{3,200}\/?$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
    } catch { return null; }
  }
};
/* Shared sample relationships. Each page gets fresh data; this is not authorization. */
// Load the external service only after the user explicitly opens a meeting.
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('#companyMeetingJoin,#studentMeetingJoin')) return;
  let dialog, api, load, opener, generation = 0;
  function loadJitsi() {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (!load) load = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(failed,15000);
      function failed() { clearTimeout(timer); script.remove(); load=null; reject(new Error('Jitsi unavailable')); }
      script.src='https://meet.jit.si/external_api.js';
      script.onload=()=>{clearTimeout(timer); window.JitsiMeetExternalAPI?resolve():failed();};
      script.onerror=failed;
      document.head.append(script);
    });
    return load;
  }
  document.addEventListener('click', async event => {
    const link=event.target.closest('#companyMeetingJoin,#studentMeetingJoin,[data-jitsi-meeting]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url=window.BridgewayMeetings.validUrl(link.href);
    if (!url) return;
    event.preventDefault();
    opener=link;
    if (!dialog) {
      dialog=document.createElement('dialog');
      dialog.className='bw-jitsi-dialog';
      dialog.setAttribute('aria-labelledby','jitsiMeetingHeading');
      dialog.innerHTML='<header><h2 id="jitsiMeetingHeading">Jitsi meeting</h2><button type="button" class="bw-tag-btn">Close meeting</button></header><p class="bw-jitsi-status" role="status"></p><div class="bw-jitsi-frame"></div><footer>Jitsi is an external service. Camera and microphone access is controlled by your browser. The host must sign in to start the room. <a target="_blank" rel="noopener noreferrer">Open directly in Jitsi</a></footer>';
      document.body.append(dialog);
      dialog.querySelector('button').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{generation++;api?.dispose();api=null;dialog.querySelector('.bw-jitsi-frame').replaceChildren();opener?.focus();});
    }
    api?.dispose(); api=null;
    const run=++generation;
    const status=dialog.querySelector('.bw-jitsi-status');
    status.textContent='Loading Jitsi…';
    dialog.querySelector('a').href=url;
    if (!dialog.open) dialog.showModal();
    try {
      await loadJitsi();
      if (!dialog.open || run!==generation) return;
      api=new window.JitsiMeetExternalAPI('meet.jit.si',{
        roomName:new URL(url).pathname.replace(/^\/|\/$/g,''),
        width:'100%',height:'100%',parentNode:dialog.querySelector('.bw-jitsi-frame'),
        configOverwrite:{prejoinPageEnabled:true,startWithAudioMuted:true,startWithVideoMuted:true},
        onload:()=>{if(run===generation)status.textContent='Check your name and devices in Jitsi before joining.';}
      });
      api.addListener('readyToClose',()=>dialog.close());
    } catch {
      if (dialog.open && run===generation) status.textContent='Jitsi could not load. Close and try again, or use the direct link below.';
    }
  });
});
window.BridgewayPartners = {
  organizations: [
    {id:'company-1',type:'company',name:'Tech Corp Inc.',admin:'Tech Corp HR',email:'hr@techcorp.com',location:'Amman',phone:'',status:'Active',listings:2},
    {id:'company-2',type:'company',name:'Nexus Cloud Systems',admin:'Nexus HR',email:'talent@nexuscloud.jo',location:'Amman',phone:'',status:'Active',listings:1},
    {id:'company-3',type:'company',name:'Aspire Cloud Services',admin:'Aspire HR',email:'careers@aspirecloud.io',location:'Amman',phone:'',status:'Active',listings:1},
    {id:'college-1',type:'college',name:'Al-Balqa Applied University',admin:'College Admin',email:'admin@bau.edu.jo',location:'Salt',phone:'',status:'Active',students:4,placements:2},
    {id:'college-2',type:'college',name:'Jordan University',admin:'College Admin',email:'admin@uni.edu',location:'Amman',phone:'',status:'Active',students:1,placements:1}
  ],
  links: [
    {id:'partnership-1',college:'college-1',company:'company-1',status:'Active'},
    {id:'partnership-2',college:'college-1',company:'company-2',status:'Active'},
    {id:'partnership-3',college:'college-2',company:'company-1',status:'Active'},
    {id:'partnership-4',college:'college-1',company:'company-3',status:'Active'}
  ],
  students: [
    {studentId:'20220042',gpa:'3.50',weeks:4,hours:60,supervisor:'Dr. John Smith',id:'alice',name:'Alice Johnson',college:'college-2',company:'company-1',stage:'Placed',role:'Frontend React Developer Intern'},
    {studentId:'20220148',gpa:'3.75',weeks:6,hours:90,supervisor:'Dr. Ahmad S.',id:'ghaith',name:'Ghaith Amourah',college:'college-1',company:'company-1',stage:'Placed',role:'Software Engineering Intern'},
    {studentId:'20220088',gpa:'3.42',weeks:0,hours:0,supervisor:null,id:'omar',name:'Omar Majed',college:'college-1',company:'company-1',stage:'Applied',role:'Software Engineering Intern'},
    {studentId:'20220019',gpa:'3.88',weeks:8,hours:120,supervisor:'Dr. Ahmad S.',id:'sarah',name:'Sarah Ahmad',college:'college-1',company:'company-2',stage:'Placed',role:'Full-Stack .NET Developer Intern'},
    {studentId:'20260101',gpa:'3.60',weeks:0,hours:0,supervisor:null,id:'lina',name:'Lina Haddad',college:'college-1',company:null,stage:'Not applied',role:null}
  ],
  effective(link) {
    return link.status === 'Active' && this.organizations.filter(o=>o.id===link.college||o.id===link.company).every(o=>o.status==='Active');
  }
};

const localModelRestored=window.BridgewayLocal?.restoreModel(window.BridgewayPartners);

// Restore administrator-managed details without passwords or automatic placements.
try {
  const accounts=JSON.parse(localStorage.getItem('bridgeway:managed-accounts:v1')||'[]');
  if(Array.isArray(accounts))accounts.forEach(a=>{
    if(a.type==='student'){
      let s=window.BridgewayPartners.students.find(s=>s.id===a.id);
      if(!s){s={id:a.id,company:null,role:null,stage:'Not applied',weeks:0,hours:0,supervisor:null};window.BridgewayPartners.students.push(s);}
      for(const key of ['name','studentId','email','phone','department','faculty','year','gpa','status','college'])if(a[key]!=null)s[key]=a[key];
    }else if(['company','college'].includes(a.type)){
      let org=window.BridgewayPartners.organizations.find(o=>o.id===a.id);
      if(!org){org={id:a.id,students:0,listings:0,placements:0};window.BridgewayPartners.organizations.push(org);}
      if(!localModelRestored)Object.assign(org,a);else for(const [key,value]of Object.entries(a))if(org[key]==null)org[key]=value;
    }
  });
}catch{}

// Academic assignment is independent of application and placement status.
(() => {
  const key='bridgeway:academic-supervisor-assignments:v1',model=window.BridgewayPartners;
  let assignments={};try{const value=JSON.parse(localStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))assignments=value;}catch{}
  const recordKey=(college,name)=>`${college}:${name}`;
  function get(name,college){const s=model.students.find(s=>s.name===name&&s.college===college),id=recordKey(college,name);return Object.prototype.hasOwnProperty.call(assignments,id)?assignments[id]:s?.supervisor||null;}
  function set(name,college,supervisor){
    const s=model.students.find(s=>s.name===name);if(s&&s.college!==college)return false;
    assignments[recordKey(college,name)]=supervisor||null;
    try{localStorage.setItem(key,JSON.stringify(assignments));}catch{}
    if(s)s.supervisor=supervisor||null;
    const C=window.BridgewayCycle;
    if(C){if(s)C.state.applications.filter(a=>a.student===s.id&&['Accepted','Placed'].includes(a.status)).forEach(a=>{a.supervisor=supervisor||null;});C.commit(`Academic supervisor ${supervisor?'assigned to':'unassigned from'} ${name}`);}
    else window.showPortalToast?.(`Academic supervisor ${supervisor?'assigned':'unassigned'}.`);
    return true;
  }
  model.students.forEach(s=>{s.supervisor=get(s.name,s.college);});
  window.BridgewayAcademicAssignments={get,set};
})();

// URL context selects a sample persona, not a real account or authorization.
window.BridgewayStudent = {
  current() {
    const requested = new URLSearchParams(location.search).get('student');
    const id = window.BridgewayPartners.students.some(s=>s.id===requested) ? requested : 'ghaith';
    return window.BridgewayPartners.students.find(student => student.id === id);
  },
  url(href) {
    const url = new URL(href, location.href);
    url.searchParams.set('student', this.current().id);
    return url.href;
  }
};
document.addEventListener('DOMContentLoaded', () => {
  if (!/\/student-(dashboard|profile)\//.test(location.pathname)) return;
  const student = window.BridgewayStudent.current();
  const initials = student.name.split(' ').map(word => word[0]).join('');
  document.getElementById('portalAccountName').textContent = student.name;
  document.getElementById('portalInitials').textContent = initials;
  // Run after the other shared initializers have created notification links.
  queueMicrotask(() => document.querySelectorAll('a[href]').forEach(link => {
    if (/\/student-(dashboard|profile)\//.test(new URL(link.href).pathname)) link.href = window.BridgewayStudent.url(link.href);
  }));
});

// Native dialog keeps focus contained and Escape/Cancel leaves the status unchanged.
window.confirmPartnershipPause = (message,heading='Pause partnership?',action='Pause partnership') => new Promise(resolve => {
  const dialog=document.createElement('dialog');dialog.className='partner-confirm';dialog.setAttribute('aria-labelledby','partnerConfirmTitle');dialog.setAttribute('aria-describedby','partnerConfirmMessage');
  const title=document.createElement('h2');title.id='partnerConfirmTitle';title.textContent=heading;
  const description=document.createElement('p');description.id='partnerConfirmMessage';description.textContent=message;
  const actions=document.createElement('div');actions.className='partner-controls';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='bw-tag-btn';cancel.textContent='Cancel';cancel.autofocus=true;cancel.addEventListener('click',()=>dialog.close());
  const pause=document.createElement('button');pause.type='button';pause.className='bw-tag-btn text-danger';pause.textContent=action;pause.addEventListener('click',()=>dialog.close('pause'));
  actions.append(cancel,pause);dialog.append(title,description,actions);dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='pause';dialog.remove();resolve(confirmed);},{once:true});window.BridgewayUX?.decorateConfirmation(dialog,heading);document.body.append(dialog);dialog.showModal();
});
/* portal-cycle */
document.addEventListener('DOMContentLoaded', () => {
  const model=window.BridgewayPartners;
  const role=document.body.dataset.portalRole || 'company';
  if(role==='admin') {
    const partner=document.querySelector('.bw-masar-nav [data-tab="tab-companies"], .bw-masar-nav a[href$="#tab-companies"]');
    if(partner){partner.classList.add('college-partner-nav');partner.parentElement.append(partner);}
  }
  const company='company-1', college='college-1';
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const steps=()=>{
    const list=el('ol',null,'partner-steps');
    [['Connect','Platform Admin links active college and company accounts.'],['Apply & place','Students apply to approved listings. The company accepts or rejects applications; the college sets up placement after acceptance. Academic supervisors can be assigned beforehand.'],['Train & review','The host company records weekly reports. The assigned supervisor reviews them.'],['Evaluate & complete','The host submits the college\u2019s end-of-term evaluation. The college reviews completion.']].forEach(([title,text])=>{const li=el('li');li.append(el('strong',title),el('span',text));list.append(li);});return list;
  };
  // A relationship never grants access to a college's full student directory.
  if(role==='company') {
    document.querySelectorAll('#candidateTableBody tr,#companyCandidatesTableBody tr').forEach(row=>{
      const student=model.students.find(s=>row.textContent.includes(s.name));
      if(!student||student.company!==company) {row.remove();return;}
      row.dataset.companyId=company;row.dataset.studentId=student.id;
      row.querySelectorAll('a[href*="#tab-weekly-reports"],a[href*="#tab-final-evaluation"]').forEach(a=>{const url=new URL(a.href);url.searchParams.set('student',student.id);a.href=url.href;});
      const actionCell=row.cells[row.cells.length-1];
      const actions=actionCell.firstElementChild?.tagName==='DIV'?actionCell.firstElementChild:actionCell;
      const meeting=actions.querySelector('[data-open-modal="hrMeetingsModal"]');
      if(meeting){meeting.title='Jitsi meeting';meeting.setAttribute('aria-label',`Jitsi meeting with ${student.name}`);}
      function renderActions(){
        const active=student.stage==='Placed',applied=student.stage==='Applied',rejected=student.stage==='Rejected';
        row.dataset.status=active?'accepted':applied?'review':rejected?'rejected':'awaiting';
        const badge=row.cells[row.cells.length-2].querySelector('.bw-badge');
        badge.textContent=active?'Active intern':applied?'Applied':rejected?'Rejected by company':'Accepted · awaiting placement';
        badge.className=`bw-badge ${active?'bw-badge-success':applied?'bw-badge-blue':rejected?'bw-badge-danger':'bw-badge-amber'}`;
        actions.replaceChildren();
        if(active){
          const report=el('a','Log report','bw-tag-btn');
          report.href=`../company-dashboard/company-dashboard.html?student=${student.id}#tab-weekly-reports`;
          if(row.closest('#companyCandidatesTableBody'))report.addEventListener('click',event=>{event.preventDefault();const card=document.querySelector(`[data-weekly-id="${student.id==='alice'?'1':'2'}"]`);window.selectWeeklyIntern(card.dataset.weeklyId,card,student.name);window.switchTab('tab-weekly-reports');});
          actions.append(report);
        }else if(applied){
          const accept=el('button','Accept applicant','bw-tag-btn');accept.type='button';
          accept.addEventListener('click',()=>{student.stage='Awaiting placement';renderActions();window.showPortalToast('Applicant marked accepted. College placement administration is next.');document.querySelector('[data-filter].is-active')?.click();});actions.append(accept);
          const reject=el('button','Reject applicant','bw-tag-btn text-danger');reject.type='button';
          reject.addEventListener('click',()=>{student.stage='Rejected';renderActions();window.showPortalToast('Applicant marked rejected by the company.');document.querySelector('[data-filter].is-active')?.click();});actions.append(reject);
        }else actions.append(el('span',rejected?'Application closed':'Placement administration pending','portal-muted'));
        if(meeting)actions.append(meeting);
        window.syncCompanyStudents?.();
      }
      renderActions();
    });
    document.querySelectorAll('[data-weekly-id="3"],#evaluationStudentSelect option[value="omar"]').forEach(n=>n.remove());
    const reports=document.querySelector('#tab-weekly-reports .bw-badge');if(reports?.textContent.includes('Active'))reports.textContent='2 Active';
    const values=document.querySelectorAll('.bw-kpi-grid .bw-kpi-value');if(values.length===4){values[1].textContent='3';values[2].textContent='2';}
    document.querySelectorAll('[data-filter="all"]').forEach(b=>b.textContent='All applicants (3)');document.querySelectorAll('[data-filter="accepted"]').forEach(b=>b.textContent='Placed interns (2)');
    document.querySelectorAll('.listing-applicants').forEach((b,i)=>{b.firstChild.textContent=i===0?'2':'1';});
    document.querySelectorAll('.listing-seats').forEach(b=>b.firstChild.textContent='1 ');document.querySelectorAll('.listing-table meter').forEach(m=>{m.value=1;m.setAttribute('aria-label',`1 of ${m.max} seats filled`);});
    const source=document.querySelector('#candidateTableBody,#companyCandidatesTableBody');
  }
  if(role==='admin' && document.getElementById('adminStudentsTableBody')) {
    document.querySelectorAll('#adminStudentsTableBody tr,#tab-supervisors tbody tr').forEach(row=>{if(row.textContent.includes('@uni.edu'))row.remove();});
    document.querySelectorAll('#tab-approved tbody tr').forEach(row=>{if(row.textContent.includes('Alice Johnson'))row.remove();if(row.textContent.includes('Ghaith Amourah'))row.cells[2].textContent='Tech Corp Inc.';});
    document.querySelectorAll('#adminStudentsTableBody option').forEach(option=>{if(option.textContent.includes('John Smith'))option.remove();});
    const studentsBody=document.getElementById('adminStudentsTableBody');
    const usersBody=document.querySelector('#tab-users tbody');
    function appendCells(body,values){const row=el('tr');values.forEach(value=>{const cell=el('td');if(value instanceof Node)cell.append(value);else cell.textContent=value;row.append(cell);});body.append(row);return row;}
    const supervisorSelect=name=>{
      const select=el('select',null,'bw-select');select.setAttribute('aria-label',`Assigned supervisor for ${name}`);
      const assigned=window.BridgewayAcademicAssignments.get(name,college);
      const names=[...new Set(['Dr. Ahmad S.',...document.querySelectorAll('#tab-supervisors tbody tr')].map(item=>typeof item==='string'?item:(item.cells[0]?.querySelector('strong,[data-style="s16"]')?.textContent||item.cells[0]?.firstElementChild?.textContent||item.cells[0]?.textContent)?.trim()).filter(Boolean))];
      const empty=el('option','Unassigned');empty.value='';select.append(empty);
      names.forEach(name=>{const option=el('option',name);option.value=name;select.append(option);});
      if(assigned&&!names.includes(assigned)){const option=el('option',assigned);option.value=assigned;select.append(option);}select.value=assigned||'';
      select.addEventListener('change',()=>{window.BridgewayAcademicAssignments.set(name,college,select.value);counts();});return select;
    };
    [...studentsBody.rows].forEach(row=>{const s=model.students.find(s=>row.cells[0].textContent.includes(s.name)&&s.college===college);if(s){row.dataset.studentName=s.name;row.cells[4].replaceChildren(supervisorSelect(s.name));}});
    function appendManagedStudent(name,department,gpa){
      const actions=el('div',null,'cycle-actions');
      const remove=el('button',null,'bw-tag-btn text-danger');remove.type='button';
      const icon=el('i',null,'bi bi-trash');icon.setAttribute('aria-hidden','true');remove.append(icon,document.createTextNode(' Delete'));
      remove.setAttribute('aria-label',`Delete student ${name}`);
      remove.addEventListener('click',()=>{const s=model.students.find(s=>s.name===name);window.openDeleteModal('Student',s?.studentId||'New',name);});actions.append(remove);
      const row=appendCells(studentsBody,[name,department,gpa,'Faculty of IT',supervisorSelect(name),actions]);row.dataset.studentName=name;return row;
    }
    appendManagedStudent('Omar Majed','Cybersecurity','3.42');
    appendManagedStudent('Lina Haddad','Software Engineering','3.60');
    // Removing a college directory entry is independent of hiring and retained training history.
    const removedKey=`bridgeway:college-student-directory:${college}`;
    let removed=[];try{const stored=JSON.parse(localStorage.getItem(removedKey)||'[]');if(Array.isArray(stored))removed=stored;}catch{}
    const studentKey=row=>model.students.find(s=>row.cells[0].textContent.includes(s.name))?.id||row.dataset.directoryKey||(row.dataset.directoryKey=crypto.randomUUID());
    const saveRemoved=()=>{try{localStorage.setItem(removedKey,JSON.stringify(removed));}catch{}};
    [...studentsBody.rows].forEach(row=>{if(removed.includes(studentKey(row)))row.remove();});
    window.removeCollegeStudentRecord=row=>{
      if(!row||row.parentElement!==studentsBody)return;
      const key=studentKey(row),next=row.nextSibling;removed.push(key);saveRemoved();row.remove();counts();
      const undo=()=>{removed=removed.filter(id=>id!==key);saveRemoved();studentsBody.insertBefore(row,next?.parentElement===studentsBody?next:null);counts();};
      if(window.BridgewayKinetic?.undoToast)window.BridgewayKinetic.undoToast('Student removed from the college directory.',undo);
      else{const notice=el('div',null,'bw-undo-toast'),restore=el('button','Undo','bw-tag-btn');restore.type='button';notice.setAttribute('role','status');notice.append(el('span','Student removed from the college directory.'),restore);restore.addEventListener('click',()=>{undo();notice.remove();});document.body.append(notice);}
    };
    appendCells(usersBody,['#8','omar@bau.edu.jo','Student','Faculty of IT','College managed']);
    appendCells(usersBody,['#9','lina@bau.edu.jo','Student','Faculty of IT','College managed']);
    appendCells(document.querySelector('#tab-approved tbody'),['#103','Sarah Ahmad','Nexus Cloud Systems','Full-Stack .NET Developer Intern','Dr. Ahmad S.','Approved','Active placement']);
    document.querySelectorAll('#tab-approved tbody tr').forEach(row=>{
      const student=model.students.find(s=>row.cells[1].textContent.includes(s.name));if(!student||student.college!==college)return;
      row.dataset.studentId=student.id;row.cells[1].replaceChildren(el('strong',student.name));row.cells[5].replaceChildren(el('span','Active','bw-badge bw-badge-success'));
      const terminate=el('button','Terminate','bw-tag-btn text-danger');terminate.type='button';terminate.setAttribute('aria-label',`Terminate placement for ${student.name}`);terminate.addEventListener('click',()=>window.openTerminateModal(row.cells[0].textContent.replace('#',''),student.name,student.role));row.cells[6].replaceChildren(terminate);
    });
    function counts(){
      document.querySelectorAll('#tab-supervisors tbody tr').forEach(row=>{const name=(row.cells[0]?.querySelector('strong,[data-style="s16"]')?.textContent||row.cells[0]?.firstElementChild?.textContent||row.cells[0]?.textContent)?.trim();if(!name||!row.cells[3])return;const count=[...studentsBody.rows].filter(studentRow=>studentRow.cells[4]?.querySelector('select')?.value===name).length;row.cells[3].textContent=`${count} student${count===1?'':'s'}`;});
      const ids=['tab-users','tab-students','tab-companies','tab-supervisors','tab-posts','tab-approved'];
      const values=[usersBody.rows.length,studentsBody.rows.length,model.links.filter(l=>l.college===college).length,document.querySelectorAll('#tab-supervisors tbody tr').length,document.querySelectorAll('#tab-posts tbody tr').length,document.querySelectorAll('#tab-approved tbody tr:not([data-terminated])').length];
      ids.forEach((id,i)=>{const badge=document.querySelector(`[data-tab="${id}"] .bw-tab-badge`);if(badge)badge.textContent=values[i];const nav=document.querySelector(`[data-tab="${id}"]`);if(nav)nav.title=nav.textContent.trim();const kpi=document.querySelectorAll('.bw-kpi-value')[i];if(kpi)kpi.textContent=values[i];});
      const badge=document.querySelector('#tab-users .bw-badge');if(badge)badge.textContent=`${values[0]} College accounts`;
    }
    document.getElementById('registerStudentForm')?.addEventListener('submit',event=>{
      if(!event.target.checkValidity())return;
      const name=document.getElementById('studentFullName').value.trim(),email=document.getElementById('studentEmail').value.trim(),dept=document.getElementById('studentDept').value,gpa=document.getElementById('studentGpa').value;
      if(!name)return;appendManagedStudent(name,dept,gpa);appendCells(usersBody,[name,email,'Student','Faculty of IT','College managed']);queueMicrotask(counts);
    });
    document.getElementById('addSupervisorForm')?.addEventListener('submit',event=>{
      if(!event.target.checkValidity())return;
      const name=document.getElementById('supFullName').value.trim(),email=document.getElementById('supEmail').value.trim(),dept=document.getElementById('supDept').value;
      if(!name)return;appendCells(document.querySelector('#tab-supervisors tbody'),[name,dept,'Faculty of IT','0 students','College managed']);appendCells(usersBody,[name,email,'Supervisor','Faculty of IT','College managed']);studentsBody.querySelectorAll('select').forEach(select=>select.append(el('option',name)));queueMicrotask(counts);
    });
    counts();
    window.refreshCollegeCounts=counts;
    window.BridgewayCollegeDirectory={appendStudent:appendManagedStudent,supervisorSelect,appendCells,refresh:counts};
  }
  const dashboard=location.pathname.endsWith('-dashboard.html');
  if((role==='company'||role==='admin')&&dashboard) {
    let panel=document.getElementById(role==='admin'?'tab-companies':'tab-partners');
    if(!panel){panel=el('section',null,'bw-tab-panel');panel.id='tab-partners';document.querySelector('main').append(panel);const button=el('button',null,'bw-masar-item bw-tab-btn');button.type='button';button.innerHTML='<i class="bi bi-link-45deg" aria-hidden="true"></i><span>Partner colleges</span>';button.dataset.tab=panel.id;document.querySelector('.bw-masar-nav').append(button);}
    panel.replaceChildren();const card=el('section',null,'partner-panel');card.append(el('h2',role==='company'?'Connected colleges':'Partner companies'),el('p',role==='company'?'College contacts and current placements with your company.':'Pause or resume your college’s partnerships. Pausing stops new applications and placements; existing training continues. Changes are saved in this browser.'));panel.append(card);
    if(role==='company'){card.classList.add('company-college-directory');card.setAttribute('aria-label','Connected colleges');}
    model.links.filter(link=>role==='company'?link.company===company:link.college===college).forEach(link=>{
      const org=model.organizations.find(o=>o.id===(role==='company'?link.college:link.company));const row=el('div',null,'partner-row');const info=el('div');info.append(el('strong',org.name),el('small',org.email));const related=model.students.filter(s=>s.company===link.company&&s.college===link.college&&s.stage==='Placed');info.append(el('small',`${related.length} confirmed intern${related.length===1?'':'s'}  /  Fall 2026`));
      const controls=el('div',null,'partner-controls');const status=el('span',model.effective(link)?'Active':link.status==='Active'?'Account suspended':'Paused','bw-badge bw-badge-blue');controls.append(status);
      if(role==='company'){
        row.classList.add('company-college-row');
        const identity=el('div',null,'company-college-identity'),mark=el('span',null,'company-college-mark'),icon=el('i',null,'bi bi-mortarboard');icon.setAttribute('aria-hidden','true');mark.append(icon);
        const copy=el('div'),name=el('h3',org.name),email=el('a',org.email,'company-college-email');email.href=`mailto:${org.email}`;copy.append(name,email);identity.append(mark,copy);
        const placement=el('div',null,'company-college-placements'),total=el('strong'),label=el('span','Active placements');placement.append(total,label);
        const refresh=()=>{const cycle=window.BridgewayCycle;total.textContent=String(cycle?cycle.state.histories.filter(h=>h.company===link.company&&h.status==='Active'&&cycle.student(h.student)?.college===link.college).length:related.length);const effective=model.effective(link);status.textContent=effective?'Active':link.status==='Active'?'Account suspended':'Paused';status.className=`bw-badge company-college-status ${effective?'is-active':'is-paused'}`;};refresh();document.addEventListener('bridgeway:cycle-change',refresh);
        info.replaceChildren(identity);info.classList.add('company-college-info');row.append(info,placement,controls);card.append(row);return;
      }
      if(role==='admin') {
        const toggle=el('button',null,'bw-tag-btn');toggle.type='button';
        const refresh=()=>{status.textContent=model.effective(link)?'Active':link.status==='Active'?'Account suspended':'Paused';status.className=`bw-badge ${model.effective(link)?'bw-badge-blue':'bw-badge-danger'}`;toggle.textContent=link.status==='Active'?'Pause':'Resume';toggle.setAttribute('aria-label',`${toggle.textContent} partnership with ${org.name}`);};
        toggle.addEventListener('click',async()=>{
          if(link.college!==college)return;
          if(link.status==='Active'&&!await window.confirmPartnershipPause(`Are you sure you want to pause the partnership with ${org.name}? New applications and placements will stop; existing training continues. `))return;
          if(link.status!=='Active'&&!model.organizations.filter(o=>[link.college,link.company].includes(o.id)).every(o=>o.status==='Active')) {window.showPortalToast('Both organization accounts must be active before resuming this partnership.');return;}
          link.status=link.status==='Active'?'Inactive':'Active';refresh();window.showPortalToast(link.status==='Active'?'Partnership resumed in this workspace.':'Partnership paused in this workspace. Existing training is unchanged.');
        });refresh();controls.append(toggle);
      }
      row.append(info,controls);card.append(row);
    });
    if(role==='company') {
      const footer=el('footer',null,'company-college-directory-footer'),note=el('p','Connections are managed by Platform Admin and the linked college administrator. Student directories remain private.');footer.append(note);card.append(footer);
      const guide=el('details',null,'partner-panel company-partnership-guide'),summary=el('summary','How partnerships work'),content=el('div',null,'company-partnership-guide-body');content.append(steps(),el('p','Pausing stops new applications and placements. Existing training and its reporting and evaluation history remain intact. Only Platform Admin and the linked college administrator can pause or resume a partnership.'));guide.append(summary,content);const next=el('button','Review applications','cycle-button');next.type='button';next.addEventListener('click',()=>window.switchTab('tab-candidates'));footer.append(next);panel.append(guide);
      if(!card.querySelector('.partner-row'))card.insertBefore(el('p','No colleges are connected to your company yet. Platform Admin manages college connections.','company-college-empty'),footer);
    }
  }
  if(role==='student') {
    const activeCompanies=model.organizations.filter(o=>o.type==='company'&&o.status==='Active').map(o=>o.name);
    document.querySelectorAll('.bw-opp-card').forEach(card=>{if(!activeCompanies.some(name=>card.textContent.includes(name)))card.remove();});
    const total=document.querySelector('.bw-kpi-value');if(total)total.textContent=document.querySelectorAll('.bw-opp-card').length;
    const area=document.querySelector('#tab-opportunities');if(area && !area.querySelector('.applications-lead'))area.prepend(el('p','Explore platform-approved opportunities across all active colleges. The host company reviews applications.','partner-scope'));
  }
  if(location.pathname.endsWith('company-post-role.html')) {
    document.querySelector('.bw-page-header')?.after(el('p','Publication cycle: submit for Platform Admin review, then reach students across all active colleges. Company hiring decisions happen after students apply.','partner-scope'));
  }
  if(role==='company'&&!dashboard) {const nav=document.querySelector('.bw-masar-nav');if(nav){const a=el('a',null,'bw-masar-item');a.href='../company-dashboard/company-dashboard.html#tab-partners';a.innerHTML='<i class="bi bi-link-45deg" aria-hidden="true"></i><span>Partner colleges</span>';nav.append(a);}}
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(document.getElementById(id)?.classList.contains('bw-tab-panel'))window.switchTab(id);});
  // Notifications are role-scoped sample events and read state lasts only on this page.
  const actualRole=location.pathname.endsWith('account-settings.html')?new URLSearchParams(location.search).get('role')||'student':role;
  const notices={
    company:[['Ghaith\u2019s weekly report is due','../company-dashboard/company-dashboard.html?student=ghaith#tab-weekly-reports'],['Review applicants to your listings','../company-dashboard/company-dashboard.html#tab-candidates']],
    admin:[['Review your college\u2019s student internships','../admin-dashboard/admin-dashboard.html#tab-approved'],['View active partner companies','../admin-dashboard/admin-dashboard.html#tab-companies']],
    student:[['View your internship applications','../student-dashboard/student-dashboard.html#tab-applications'],['Review your training progress','../student-dashboard/student-dashboard.html#tab-progress']],
    supervisor:[['Weekly reports need your review','../supervisor-dashboard/supervisor-dashboard.html#tab-reports']],
    platform_admin:[['Two escalated issues need attention','../platform-admin/platform-admin.html#platform-issues'],['Review college–company partnerships','../platform-admin/platform-admin.html#platform-partnerships']]
  };
  if (actualRole === 'student' && window.BridgewayStudent.current().id === 'lina') notices.student = [];
  const account=document.querySelector('.company-account-wrap');if(!account)return;
  const actions=el('div',null,'portal-header-actions');account.before(actions);actions.append(account);
  const wrap=el('div',null,'portal-notifications'),toggle=el('button',null,'notification-toggle'),count=el('span',String((notices[actualRole]||[]).length),'notification-count');toggle.type='button';toggle.setAttribute('aria-label','Notifications');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','portalNotifications');toggle.innerHTML='<i class="bi bi-bell" aria-hidden="true"></i>';toggle.append(count);
  const panel=el('section',null,'notification-panel');panel.id='portalNotifications';panel.hidden=true;panel.setAttribute('aria-label','Notifications');panel.append(el('h2','Notifications'));
  (notices[actualRole]||[]).forEach(([text,href])=>{const a=el('a',text);a.href=href;panel.append(a);});
  if (!(notices[actualRole]||[]).length) { count.hidden=true; panel.append(el('p','No notifications yet.')); }
  const read=el('button','Mark all as read','bw-tag-btn');read.type='button';read.addEventListener('click',()=>{count.hidden=true;read.textContent='All caught up';read.disabled=true;});panel.append(read);wrap.append(toggle,panel);actions.prepend(wrap);
  function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));document.querySelectorAll('.company-account-dropdown').forEach(menu=>menu.hidden=true);document.querySelectorAll('.company-account').forEach(b=>b.setAttribute('aria-expanded','false'));});
  document.addEventListener('click',event=>{if(!wrap.contains(event.target))close();});document.addEventListener('focusin',event=>{if(!wrap.contains(event.target))close();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){close();toggle.focus();}});
});

/* portal */
/**
 * ============================================================================
 * BRIDGEWAY PORTAL CONTROLLER (portal.js)
 * Clean vanilla JS controller powering:
 * - Student Portal (../student-dashboard/student-dashboard.html & ../student-profile/student-profile.html)
 * - Academic Supervisor Portal (../supervisor-dashboard/supervisor-dashboard.html)
 * - Partner Company Portal (../company-dashboard/company-dashboard.html)
 * - Admin Governance Portal (../admin-dashboard/admin-dashboard.html)
 * ============================================================================
 */

(function () {
  'use strict';
  // PAGE THEME (NOT PERSISTED)
  function initTheme() {
    const themeToggleBtn = document.getElementById('bwThemeToggle');
    const themeIcon = document.getElementById('bwThemeIcon');

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (themeToggleBtn) {
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        themeToggleBtn.setAttribute('aria-label', label);themeToggleBtn.title = label;
      }
      if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
      }
      const themeText = document.getElementById('bwThemeText');
      if (themeText) {
        themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
      }
    }

    let savedTheme = 'light';
    try { savedTheme = localStorage.getItem('bridgeway:portal-theme') === 'dark' ? 'dark' : 'light'; } catch {}
    applyTheme(savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        if(window.BridgewayMotion?.theme)window.BridgewayMotion.theme(()=>applyTheme(nextTheme));else applyTheme(nextTheme);
        try { localStorage.setItem('bridgeway:portal-theme', nextTheme); } catch {}
      });
    }
  }
  // TOAST NOTIFICATIONS
  window.showPortalToast = function (message, icon = 'bi-check-circle-fill text-success') {
    let toast = document.getElementById('bwPortalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bwPortalToast';
      toast.className = 'bw-toast';
      toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');
      document.body.appendChild(toast);
    }
    toast.replaceChildren();
    const toastIcon=document.createElement("i"); toastIcon.className=`bi ${icon}`;
    const toastText=document.createElement("span"); toastText.textContent=message; toast.append(toastIcon,toastText);
    toast.style.display = 'flex';

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  };
  // TAB SWITCHER
  window.switchTab = function (tabId) {
    const btn = document.querySelector(`.bw-tab-btn[data-tab="${tabId}"]`);
    if (btn) {
      btn.click();
      return;
    }
    const panel = document.getElementById(tabId);
    if (panel) {
      const container = panel.closest('.bw-workspace-content') || panel.closest('.bw-main-content') || document;
      container.querySelectorAll('.bw-tab-panel').forEach(p => p.classList.remove('is-active'));
      panel.classList.add('is-active');
    }
  };

  function initTabs() {
    const tabButtons = document.querySelectorAll('.bw-tab-btn[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');
        const container = btn.closest('.bw-workspace-content') || btn.closest('.bw-main-content') || document;

        // Deactivate all sibling buttons
        const navContainer = btn.parentElement;
        if (navContainer) {
          navContainer.querySelectorAll('.bw-tab-btn').forEach(b => b.classList.remove('is-active'));
        }
        btn.classList.add('is-active');

        // Toggle tab panels
        container.querySelectorAll('.bw-tab-panel').forEach(panel => {
          if (panel.id === targetTabId) {
            panel.classList.add('is-active');
          } else {
            panel.classList.remove('is-active');
          }
        });

        // Synchronize KPI cards active state
        document.querySelectorAll('.bw-kpi-card[data-kpi-tab]').forEach(kpiCard => {
          kpiCard.classList.toggle('is-active-kpi', kpiCard.getAttribute('data-kpi-tab') === targetTabId);
        });
      });
    });

    // Initialize initial active KPI card
    const initialActiveTab = document.querySelector('.bw-tab-btn.is-active[data-tab]');
    if (initialActiveTab) {
      const initId = initialActiveTab.getAttribute('data-tab');
      document.querySelectorAll('.bw-kpi-card[data-kpi-tab]').forEach(kpiCard => {
        kpiCard.classList.toggle('is-active-kpi', kpiCard.getAttribute('data-kpi-tab') === initId);
      });
    }

    // Check if initial hash matches a tab
    if (window.location.hash) {
      const hashId = window.location.hash.substring(1);
      const matchingBtn = document.querySelector(`.bw-tab-btn[data-tab="${hashId}"]`);
      if (matchingBtn) matchingBtn.click();
    }
  }
  // MODAL CONTROLLER
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('is-open');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('is-open');
  };

  function initModals() {
    document.querySelectorAll('.bw-modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('is-open');
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-open-modal');
        openModal(modalId);
      });
    });
  }
  // UI-only prototype: backend integration will provide data and persistence.
  // STUDENT PORTAL SPECIFICS
  function initStudentDashboard() {
    if (!document.getElementById('tab-opportunities')) return;
    const student = window.BridgewayStudent.current();
    const viewOnly = ['Placed', 'Awaiting placement', 'Accepted'].includes(student?.stage);
    const notice = document.getElementById('acceptedInternshipNotice');
    if (notice) notice.hidden = !viewOnly;
    if (viewOnly) document.querySelectorAll('.bw-apply-btn').forEach(button => {
      button.disabled = true;
      button.textContent = 'View-only';
      button.title = 'You already have an accepted internship';
    });
    // 3. Opportunity Search & Category Filter
    const searchInput = document.getElementById('oppSearchInput');
    const filterTags = document.querySelectorAll('.bw-tag-btn[data-category]');
    const oppCards = document.querySelectorAll('.bw-opp-card');
    const countDisplay = document.getElementById('oppCountDisplay');

    let activeCategory = 'all';
    let searchQuery = '';

    function filterOpportunities() {
      let visibleCount = 0;
      const allCards = document.querySelectorAll('.bw-opp-card');
      allCards.forEach(card => {
        const title = (card.getAttribute('data-title') || '').toLowerCase();
        const category = (card.getAttribute('data-category') || '').toLowerCase();
        const company = (card.getAttribute('data-company') || '').toLowerCase();

        const matchesCategory = activeCategory === 'all' || category.includes(activeCategory);
        const matchesSearch = !searchQuery || title.includes(searchQuery) || company.includes(searchQuery);

        if (matchesCategory && matchesSearch) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (countDisplay) {
        countDisplay.textContent = `${visibleCount} Found`;
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        filterOpportunities();
      });
    }

    filterTags.forEach(tag => {
      tag.addEventListener('click', () => {
        filterTags.forEach(t => t.classList.remove('is-active'));
        tag.classList.add('is-active');
        activeCategory = tag.getAttribute('data-category').toLowerCase();
        filterOpportunities();
      });
    });

    filterOpportunities();
    // 4. Apply Confirmation Modal Workflow
    let pendingApplyBtn = null;
    document.querySelectorAll('.bw-apply-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        if (viewOnly || this.classList.contains('is-applied')) return;

        pendingApplyBtn = this;
        const role = this.getAttribute('data-role') || 'Internship Opportunity';
        const company = this.getAttribute('data-company') || 'Partner Company';
        const deadline = this.getAttribute('data-deadline') || this.closest('.bw-opp-card')?.querySelector('.bi-calendar-event')?.parentElement.textContent.trim().replace(/^Ends\s+/,'') || 'Not specified';
        this.setAttribute('data-deadline',deadline);

        const titleEl = document.getElementById('applyModalTitle');
        const roleEl = document.getElementById('applyModalPosition');
        const compEl = document.getElementById('applyModalCompany');
        const deadEl = document.getElementById('applyModalDeadline');

        if (titleEl) titleEl.textContent = role;
        if (roleEl) roleEl.textContent = role;
        if (compEl) compEl.textContent = company;
        if (deadEl) deadEl.textContent = deadline;

        openModal('applyModal');
      });
    });

    const confirmApplyBtn = document.getElementById('confirmApplyBtn');
    if (confirmApplyBtn) {
      confirmApplyBtn.addEventListener('click', () => {
        if (viewOnly || !pendingApplyBtn) {
          closeModal('applyModal');
          return;
        }

        const role = pendingApplyBtn.getAttribute('data-role') || 'Internship';
        const company = pendingApplyBtn.getAttribute('data-company') || 'Partner Org';
        const deadline = pendingApplyBtn.getAttribute('data-deadline') || 'Nov 30, 2026';

        const cv = document.getElementById('applicationCvFile');
        const cvNote = document.getElementById('applicationCvStatus');
        const file = cv?.files[0];
        if (file && (!/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024)) {
          cvNote.textContent = 'Choose a non-empty PDF or DOCX up to 5 MB.';
          cv.setAttribute('aria-invalid', 'true');
          cv.focus();
          return;
        }
        if (!file && !window.BridgewayCV.read()) {
          cvNote.textContent = 'Select a CV before confirming this application.';
          cv.setAttribute('aria-invalid', 'true');
          cv.focus();
          return;
        }

        pendingApplyBtn.classList.add('is-applied');
        pendingApplyBtn.innerHTML = '<i class="bi bi-check2"></i> Applied';
        pendingApplyBtn.style.background = '#059669';
        pendingApplyBtn.style.borderColor = '#059669';
        pendingApplyBtn.disabled = true;

        // Update applications counter
        const appKpi = document.getElementById('kpiApplicationsSent');
        if (appKpi) {
          const current = parseInt(appKpi.textContent, 10) || 0;
          appKpi.textContent = current + 1;
        }

        // Add to My Applications table if present
        const tableBody = document.getElementById('studentApplicationsTable');
        if (tableBody) {
          const tr = document.createElement('tr');
          tr.dataset.applicationStatus = 'pending';
          tr.innerHTML = `
            <td><div style="font-weight: 700; color: var(--bw-text);">${company}</div></td>
            <td><div style="font-weight: 600;">${role}</div></td>
            <td><span style="color: var(--bw-text-muted);"><i class="bi bi-geo-alt me-1"></i>Amman</span></td>
            <td><span style="color: var(--bw-danger); font-weight: 500;">${deadline}</span></td>
            <td><span class="bw-badge bw-badge-amber"><i class="bi bi-hourglass-split me-1"></i>Pending</span></td>
            <td><button type="button" class="bw-tag-btn text-danger" data-withdraw-application>Withdraw</button></td>
          `;
          tableBody.prepend(tr);
        }

        closeModal('applyModal');
        showPortalToast(`Pending application added for ${company}.`);
        pendingApplyBtn = null;
      });
    }
  }
  // SUPERVISOR PORTAL SPECIFICS
  const studentReportData = {
    'Ghaith Amourah': {
      placement: 'Tech Corp Inc. • Company Mentor: Eng. Khalid T.',
      hours: '90h / 120h',
      week: 'Week 6',
      badgeClass: 'bw-badge-amber',
      statusText: 'Week 6 Review',
      heading: 'Week 6: RESTful API & Evaluation Endpoints',
      meta: 'Submitted Oct 08, 2026 • Host Mentor Eng. Khalid T. Approved',
      pendingText: '40.0h Pending Review',
      pendingClass: 'bw-badge-amber',
      deliverables: 'Developed RESTful API endpoints for internship candidate evaluation using ASP.NET Core Web API. Implemented custom authorization filters, FluentValidation validators, and Entity Framework Core migrations for PostgreSQL. Wrote comprehensive xUnit integration tests.',
      tech: ['C# 12', 'ASP.NET Core Web API', 'Entity Framework Core', 'xUnit & Moq', 'PostgreSQL'],
      feedback: 'Deliverables verified. Architecture demonstrates clean adherence to repository pattern and separation of concerns.',
      canApprove: true,
      avatar: 'GA',
      btnId: 'btnStudentGA',
      timelineSummary: '6 of 8 Weeks Submitted (75%)'
    },
    'Alice Johnson': {
      placement: 'Tech Corp Inc. • Company Mentor: Eng. Sarah L.',
      hours: '60h / 120h',
      week: 'Week 4',
      badgeClass: 'bw-badge-blue',
      statusText: 'Week 4 On Track',
      heading: 'Week 4: Real-Time Telemetry & Front-End State Sync',
      meta: 'Submitted Sep 30, 2026 • Verified by Dr. Ahmad S.',
      pendingText: '40.0h Verified',
      pendingClass: 'bw-badge-success',
      deliverables: 'Implemented responsive front-end dashboard interfaces and real-time state synchronization using Vanilla JavaScript and WebSockets. Integrated telemetry metrics for active candidate tracking.',
      tech: ['JavaScript (ES2024)', 'WebSockets', 'CSS Grid', 'Chart.js', 'REST API'],
      feedback: 'Excellent UI polish and thorough integration with the event telemetry stream.',
      canApprove: false,
      avatar: 'AJ',
      btnId: 'btnStudentAJ',
      timelineSummary: '4 of 8 Weeks Submitted (50%)'
    },
    'Sarah Ahmad': {
      placement: 'Nexus Cloud Systems • Company Mentor: Eng. Omar F.',
      hours: '120h / 120h',
      week: 'Week 8',
      badgeClass: 'bw-badge-success',
      statusText: 'Week 8 Completed',
      heading: 'Week 8: Capstone SSO Gateway & Final Presentation',
      meta: 'Submitted Oct 08, 2026 • All 8 weeks verified',
      pendingText: '40.0h Verified',
      pendingClass: 'bw-badge-success',
      deliverables: 'Completed final capstone project: Microservices-based authentication & single sign-on (SSO) gateway with Redis token caching and Docker container orchestration. Delivered final internship presentation.',
      tech: ['Microservices', 'Docker', 'Redis', 'OAuth2 & JWT', 'CI/CD'],
      feedback: 'Outstanding technical performance across the entire 8-week cycle. All submitted training hours have been verified.',
      canApprove: false,
      avatar: 'SA',
      btnId: 'btnStudentSA',
      timelineSummary: '8 of 8 Weeks Completed (100%)'
    },
    'Omar Majed': {
      placement: 'Nexus Cloud Systems • Company Mentor: Eng. Zaid M.',
      hours: '75h / 120h',
      week: 'Week 5',
      badgeClass: 'bw-badge-amber',
      statusText: 'Week 5 Review',
      heading: 'Week 5: CI/CD Pipeline Automation & Security Auditing',
      meta: 'Submitted Oct 12, 2026 • Host Mentor Eng. Zaid M. Approved',
      pendingText: '40.0h Pending Review',
      pendingClass: 'bw-badge-amber',
      deliverables: 'Configured automated CI/CD deployment pipelines on AWS using GitHub Actions and Terraform infrastructure-as-code scripts. Conducted static code analysis and container vulnerability scanning using SonarQube.',
      tech: ['AWS', 'Terraform', 'GitHub Actions', 'Docker', 'SonarQube'],
      feedback: 'Good pipeline design. Ensure IAM least-privilege policies are strictly enforced before final verification.',
      canApprove: true,
      avatar: 'OM',
      btnId: 'btnStudentOM',
      timelineSummary: '5 of 8 Weeks Submitted (62%)'
    }
  };

  window.reviewStudentReport = function (name, placement, hours, week, avatarText = 'GA') {
    const studentTitle = document.getElementById('activeStudentName');
    const studentPlacement = document.getElementById('activeStudentPlacement');
    const studentHours = document.getElementById('activeStudentHours');
    const studentAvatar = document.getElementById('activeStudentAvatar');
    const studentWeekBadge = document.getElementById('activeStudentWeekBadge');

    const assigned = window.BridgewayPartners.students.find(student => student.name === name && student.stage === 'Placed' && student.supervisor === 'Dr. Ahmad S.');
    if (!assigned) return;
    const reportData = studentReportData[name];

    if (studentTitle) studentTitle.textContent = name;
    if (studentPlacement) studentPlacement.textContent = reportData ? reportData.placement : placement;
    if (studentHours) studentHours.textContent = reportData ? reportData.hours : hours;
    if (studentAvatar) studentAvatar.textContent = reportData ? reportData.avatar : avatarText;

    if (studentWeekBadge) {
      if (reportData) {
        studentWeekBadge.textContent = reportData.statusText;
        studentWeekBadge.className = `bw-badge ${reportData.badgeClass}`;
      } else {
        studentWeekBadge.textContent = `${week} Review`;
      }
    }

    // Update details panel if data found
    if (reportData) {
      const headingEl = document.getElementById('reportWeekHeading');
      const metaEl = document.getElementById('reportSubmitMeta');
      const pendingPill = document.getElementById('reportPendingPill');
      const deliverablesEl = document.getElementById('reportDeliverablesText');
      const techContainer = document.getElementById('reportTechContainer');
      const feedbackEl = document.getElementById('supervisorFeedback');
      const timelineSummary = document.getElementById('timelineCurriculumSummary');
      const approveBtn = document.getElementById('approveWeekBtn');
      const revisionBtn = document.getElementById('requestRevisionBtn');
      if (revisionBtn) revisionBtn.disabled = !reportData.canApprove;

      if (headingEl) headingEl.textContent = reportData.heading;
      if (metaEl) metaEl.textContent = reportData.meta;
      if (pendingPill) {
        pendingPill.textContent = reportData.pendingText;
        pendingPill.className = `bw-badge ${reportData.pendingClass}`;
      }
      if (deliverablesEl) deliverablesEl.textContent = reportData.deliverables;
      if (feedbackEl) feedbackEl.value = reportData.feedback;
      if (timelineSummary) timelineSummary.textContent = reportData.timelineSummary;

      if (techContainer) {
        techContainer.innerHTML = reportData.tech.map(t => `<span class="bw-badge bw-badge-blue">${t}</span>`).join(' ');
      }

      if (approveBtn) {
        if (reportData.canApprove) {
          approveBtn.disabled = false;
          approveBtn.style.display = 'inline-flex';
          approveBtn.style.background = '';
          approveBtn.style.color = '';
          approveBtn.classList.add('bw-btn-primary');
          approveBtn.innerHTML = '<i class="bi bi-check2-all" aria-hidden="true"></i> Verify training hours';
        } else {
          approveBtn.disabled = true;
          approveBtn.style.background = '#059669';
          approveBtn.style.color = '#ffffff';
          approveBtn.classList.remove('bw-btn-primary');
          approveBtn.innerHTML = '<i class="bi bi-check2-all" aria-hidden="true"></i> Already verified';
        }
      }

      // Highlight active button in intern selector strip
      ['btnStudentGA', 'btnStudentAJ', 'btnStudentSA', 'btnStudentOM'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('is-active', id === reportData.btnId);
      });
    }

    if (window.switchTab) {
      window.switchTab('tab-reports');
    }
  };

  function initSupervisorDashboard() {
    // Approve & Verify Week Action
    const approveBtn = document.getElementById('approveWeekBtn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        const name = document.getElementById('activeStudentName').textContent;
        const report = studentReportData[name];
        if (!report?.canApprove) return;
        report.canApprove = false;
        report.pendingText = '40.0h Verified';
        report.pendingClass = 'bw-badge-success';
        report.feedback = document.getElementById('supervisorFeedback').value;
        document.getElementById('requestRevisionBtn').disabled = true;
        approveBtn.disabled = true;
        approveBtn.innerHTML = '<i class="bi bi-check2-all" aria-hidden="true"></i> Training hours verified';
        approveBtn.classList.remove('bw-btn-primary');
        approveBtn.style.background = '#059669';
        approveBtn.style.color = '#ffffff';

        const pendingBadge = document.getElementById('kpiPendingReports');
        if (pendingBadge) {
          const count = parseInt(pendingBadge.textContent, 10) || 0;
          if (count > 0) pendingBadge.textContent = count - 1;
        }

        const tabBadge = document.getElementById('tabBadgeMissingReports');
        if (tabBadge) {
          const count = parseInt(tabBadge.textContent, 10) || 0;
          if (count > 0) tabBadge.textContent = count - 1;
        }

        const pendingPill = document.getElementById('reportPendingPill');
        if (pendingPill) {
          pendingPill.textContent = '40.0h Verified';
          pendingPill.className = 'bw-badge bw-badge-success';
        }

        showPortalToast('Report marked verified in this workspace.');
        document.dispatchEvent(new CustomEvent('bridgeway:report-reviewed',{detail:{name,status:'verified'}}));
      });
    }

    // Request Revision Modal Confirmation
    const confirmRevisionModalBtn = document.getElementById('confirmRevisionModalBtn');
    if (confirmRevisionModalBtn) {
      confirmRevisionModalBtn.addEventListener('click', () => {
        const name = document.getElementById('activeStudentName').textContent;
        const report = studentReportData[name];
        const notes = document.getElementById('revisionNotesInput');
        if (!report?.canApprove) return;
        if (!notes.value.trim()) { notes.focus(); return; }
        report.pendingText = '40.0h Revision requested';
        report.pendingClass = 'bw-badge-amber';
        report.feedback = document.getElementById('supervisorFeedback').value;
        const pill = document.getElementById('reportPendingPill');
        pill.textContent = report.pendingText; pill.className = 'bw-badge bw-badge-amber';
        closeModal('requestRevisionModal');
        document.dispatchEvent(new CustomEvent('bridgeway:report-reviewed',{detail:{name,status:'revision'}}));
        showPortalToast('Revision on this page. No notes were sent.', 'bi-info-circle-fill text-warning');
      });
    }

    // Live Student Search Filter in Supervised Students Roster
    const rosterSearch = document.getElementById('rosterSearchInput');
    if (rosterSearch) {
      rosterSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#supervisedStudentsTable tbody tr');
        rows.forEach(tr => {
          const text = tr.textContent.toLowerCase();
          tr.style.display = text.includes(term) ? '' : 'none';
        });
      });
    }
  }
  // COMPANY PORTAL SPECIFICS
  function initCompanyDashboard() {
    // 8-Criteria Rubric Rating Scale Buttons & Live HUD
    const rubricRows = document.querySelectorAll('.bw-rubric-rating-row');
    const rubricCounter = document.getElementById('rubricRatedCount');
    const rubricSubmitBtn = document.getElementById('submitRubricBtn');
    const rubricPercent = document.getElementById('rubricRatedPercent');
    const rubricCounterText = document.getElementById('rubricRatedCounterText');
    const scoreVal = document.getElementById('rubricScoreTotal');
    const gradePill = document.getElementById('rubricGradePill');
    const footerScore = document.getElementById('rubricFooterScore');
    const footerGrade = document.getElementById('rubricFooterGrade');

    window.updateRubricHUD = function () {
      let rated = 0;
      let totalScore = 0;

      rubricRows.forEach(row => {
        const activeBtn = row.querySelector('.bw-scale-btn.is-active');
        if (activeBtn) {
          rated++;
          const val = parseInt(activeBtn.getAttribute('data-val') || activeBtn.textContent.trim().charAt(0), 10) || 0;
          totalScore += val;
        }
      });

      const pct = Math.round((rated / 8) * 100);
      const scorePct = Math.round((totalScore / 40) * 100);

      if (rubricCounter) rubricCounter.textContent = `${rated} of 8 rated`;
      if (rubricPercent) rubricPercent.style.width = `${pct}%`;
      if (rubricCounterText) rubricCounterText.textContent = `${rated} of 8 criteria rated`;
      if (scoreVal) scoreVal.textContent = totalScore;
      if (footerScore) footerScore.textContent = `${totalScore} / 40`;

      // Determine Grade Tier
      let gradeText = 'Incomplete';
      if (rated === 8) {
        if (totalScore >= 36) {
          gradeText = `Distinction (${scorePct}%) — A+`;
        } else if (totalScore >= 32) {
          gradeText = `Excellent (${scorePct}%) — A`;
        } else if (totalScore >= 28) {
          gradeText = `Very Good (${scorePct}%) — B+`;
        } else if (totalScore >= 24) {
          gradeText = `Good (${scorePct}%) — B`;
        } else {
          gradeText = `Passing (${scorePct}%) — C`;
        }
      } else if (rated > 0) {
        gradeText = `In Progress (${totalScore} pts)`;
      }

      if (gradePill) gradePill.textContent = gradeText;
      if (footerGrade) footerGrade.textContent = gradeText;

      if (rubricSubmitBtn) {
        if (rated === 8) {
          rubricSubmitBtn.disabled = false;
          rubricSubmitBtn.classList.remove('bw-btn-outline');
          rubricSubmitBtn.classList.add('bw-btn-primary');
          rubricSubmitBtn.textContent = 'Submit final evaluation';
        } else {
          rubricSubmitBtn.disabled = true;
          rubricSubmitBtn.classList.add('bw-btn-outline');
          rubricSubmitBtn.classList.remove('bw-btn-primary');
          rubricSubmitBtn.textContent = `Complete all 8 criteria (${rated}/8)`;
        }
      }
    };

    rubricRows.forEach(row => {
      const scaleBtns = row.querySelectorAll('.bw-scale-btn');
      scaleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          scaleBtns.forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          window.updateRubricHUD();
        });
      });
    });

    if (rubricSubmitBtn) {
      rubricSubmitBtn.addEventListener('click', () => {
        showPortalToast('Evaluation details checked.');
      });
    }

    // Auto-fill Demo
    window.autoFillRubricDemo = function () {
      rubricRows.forEach(row => {
        const scaleBtns = row.querySelectorAll('.bw-scale-btn');
        scaleBtns.forEach(b => b.classList.remove('is-active'));
        const targetBtn = scaleBtns[scaleBtns.length - 1] || scaleBtns[scaleBtns.length - 2];
        if (targetBtn) targetBtn.classList.add('is-active');
      });
      window.updateRubricHUD();
      showPortalToast('Exemplary evaluation ratings (4–5) populated as suggested values.');
    };

    // Reset Ratings
    window.resetRubricRatings = function () {
      rubricRows.forEach(row => {
        row.querySelectorAll('.bw-scale-btn').forEach(b => b.classList.remove('is-active'));
      });
      window.updateRubricHUD();
      showPortalToast('Rubric ratings reset to 0.', 'bi-arrow-counterclockwise text-secondary');
    };

    // Intern Switcher
    window.selectInternForRubric = function (id, name, role, gpa, status) {
      document.querySelectorAll('.bw-intern-chip').forEach(c => {
        c.classList.toggle('is-active', c.getAttribute('data-intern-id') === id);
      });
      const badge = document.getElementById('activeInternBadge');
      if (badge) badge.textContent = `${name} — ${status}`;
      showPortalToast(`Switched evaluation record to: ${name} (${role})`);
    };

    // Weekly Intern Switcher (Tab 3 Master-Detail Roster)
    window.selectWeeklyIntern = function (internVal, cardEl, internName) {
      document.querySelectorAll('.bw-intern-status-card').forEach(c => c.classList.remove('is-active'));
      if (cardEl) cardEl.classList.add('is-active');
      const sel = document.getElementById('activeInternSelect');
      if (sel) {
        sel.value = internVal;
      }
      showPortalToast(`Loaded 8-week logbook workspace for: ${internName}`);
    };

    // Insert Feedback Prompt
    window.insertFeedbackText = function (text) {
      const ta = document.getElementById('evaluationComments');
      if (ta) {
        if (ta.value.trim().length > 0) {
          ta.value += '\n\n' + text;
        } else {
          ta.value = text;
        }
        ta.focus();
        showPortalToast('Recommendation comment inserted into mentor report.');
      }
    };

    // Candidate Search & Filter
    window.searchCandidates = function (query) {
      const q = query.toLowerCase().trim();
      const rows = document.querySelectorAll('#companyCandidatesTableBody tr');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    };

    window.filterCandidates = function (status, btn) {
      if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.bw-tag-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      }
      const rows = document.querySelectorAll('#companyCandidatesTableBody tr');
      rows.forEach(r => {
        if (status === 'all') {
          r.style.display = '';
        } else if (status === 'accepted') {
          const isAccepted = r.textContent.includes('Accepted');
          r.style.display = isAccepted ? '' : 'none';
        } else if (status === 'review') {
          const isReview = r.textContent.includes('Under Review') || r.textContent.includes('Pending');
          r.style.display = isReview ? '' : 'none';
        }
      });
    };

    // Create New Post Form
    const newPostForm = document.getElementById('postJobForm');
    if (newPostForm) {
      newPostForm.addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal('postJobModal');
        showPortalToast('Form validated. Publishing will be available when the backend is connected.');
      });
    }

    // Confirm Delete Post Action
    const confirmDeletePostBtn = document.getElementById('confirmDeletePostBtn');
    if (confirmDeletePostBtn) {
      confirmDeletePostBtn.addEventListener('click', () => {
        closeModal('deletePostModal');
        document.querySelectorAll('.bw-opp-card').forEach(card => {
          const t = card.querySelector('.bw-opp-title');
          if (t && t.textContent.trim() === pendingDeletePostTitle) {
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
          }
        });
        const activeKpi = document.getElementById('kpiActivePosts');
        if (activeKpi) {
          const val = parseInt(activeKpi.textContent, 10) || 0;
          if (val > 0) activeKpi.textContent = val - 1;
        }
        showPortalToast(`Post "${pendingDeletePostTitle}" removed from this workspace.`, 'bi-trash text-danger');
      });
    }
  }

  // Global Company Post Handlers
  let pendingDeletePostTitle = '';

  window.toggleCompanyPost = function (btn) {
    const card = btn.closest('.bw-opp-card');
    const badge = card ? card.querySelector('.post-status-badge') : null;
    if (!badge) return;

    if (badge.classList.contains('bw-badge-success')) {
      badge.classList.remove('bw-badge-success');
      badge.classList.add('bw-badge-amber');
      badge.innerHTML = '<i class="bi bi-pause-circle"></i> Post Closed';
      btn.innerHTML = '<i class="bi bi-play-circle me-1"></i> Reopen Post';
      showPortalToast('Opportunity post closed to new student applications.', 'bi-pause-circle text-warning');
    } else {
      badge.classList.remove('bw-badge-amber');
      badge.classList.add('bw-badge-success');
      badge.innerHTML = '<i class="bi bi-check-circle"></i> Accepting Applications';
      btn.innerHTML = '<i class="bi bi-pause-circle me-1"></i> Close Post';
      showPortalToast('Opportunity post reopened for student applications!');
    }
  };

  window.openDeletePostModal = function (title) {
    pendingDeletePostTitle = title;
    const titleEl = document.getElementById('deletePostModalTitle');
    if (titleEl) titleEl.textContent = title;
    openModal('deletePostModal');
  };
  // ADMIN GOVERNANCE SPECIFICS
  let pendingDelete = null;
  let pendingTerminate = null;
  let pendingUnassign = null;

  window.openDeleteModal = function (type, id, name) {
    const row=type==='Student'?[...document.querySelectorAll('#adminStudentsTableBody tr')].find(row=>row.cells[0].textContent.includes(name)):null;
    pendingDelete = { type, id, name, row };
    const label = document.getElementById('deleteEntityLabel');
    if (label) label.textContent = `${type} "${name}" (ID #${id})`;
    window.openModal('deleteModal');
  };

  window.openTerminateModal = function (appId, studentName, positionName) {
    pendingTerminate = { appId, studentName, positionName };
    const sEl = document.getElementById('terminateStudentName');
    const pEl = document.getElementById('terminatePositionName');
    if (sEl) sEl.textContent = studentName;
    if (pEl) pEl.textContent = positionName;
    window.openModal('terminateModal');
  };

  window.openUnassignModal = function (studentId, studentName, supervisorName) {
    pendingUnassign = { studentId, studentName, supervisorName };
    const sEl = document.getElementById('unassignStudentName');
    const supEl = document.getElementById('unassignSupervisorName');
    if (sEl) sEl.textContent = studentName;
    if (supEl) supEl.textContent = supervisorName;
    window.openModal('unassignModal');
  };

  function initAdminDashboard() {
    // Delete Confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        window.closeModal('deleteModal');
        if (pendingDelete) {
          if(pendingDelete.type==='Student'&&pendingDelete.row&&window.removeCollegeStudentRecord)window.removeCollegeStudentRecord(pendingDelete.row);
          else showPortalToast(`Deletion checked for ${pendingDelete.name}. No records were deleted.`);
          pendingDelete = null;
        }
      });
    }

    // Terminate Confirmation
    const confirmTerminateBtn = document.getElementById('confirmTerminateBtn');
    if (confirmTerminateBtn) {
      confirmTerminateBtn.addEventListener('click', () => {
        window.closeModal('terminateModal');
        if (pendingTerminate) {
          const row=[...document.querySelectorAll('#tab-approved tbody tr')].find(row=>row.cells[0].textContent.replace('#','')===String(pendingTerminate.appId));
          if(row){row.dataset.terminated='true';const status=document.createElement('span');status.className='bw-badge bw-badge-danger';status.textContent='Terminated';row.cells[5].replaceChildren(status);const ended=document.createElement('span');ended.className='portal-muted';ended.textContent='Placement ended';row.cells[6].replaceChildren(ended);const student=window.BridgewayPartners.students.find(s=>s.id===row.dataset.studentId);if(student)student.stage='Terminated';window.refreshCollegeCounts?.();}
          showPortalToast(`Internship placement #${pendingTerminate.appId} for ${pendingTerminate.studentName} marked terminated in this workspace.`, 'bi-x-octagon-fill text-danger');
          pendingTerminate = null;
        }
      });
    }

    // Unassign Confirmation
    const confirmUnassignBtn = document.getElementById('confirmUnassignBtn');
    if (confirmUnassignBtn) {
      confirmUnassignBtn.addEventListener('click', () => {
        window.closeModal('unassignModal');
        if (pendingUnassign) {
          showPortalToast(`Supervisor ${pendingUnassign.supervisorName} unassigned from ${pendingUnassign.studentName}.`, 'bi-person-dash text-warning');
          pendingUnassign = null;
        }
      });
    }

    // Register Student Form
    const registerStudentForm = document.getElementById('registerStudentForm');
    if (registerStudentForm) {
      registerStudentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('studentFullName')?.value || 'Student';
        const dept = document.getElementById('studentDept')?.value || 'Computer Science';
        const gpa = document.getElementById('studentGpa')?.value || '3.75';
        const college = document.getElementById('studentFacultySelect')?.value || 'Faculty of IT';
        const email = document.getElementById('studentEmail')?.value || 'student@bau.edu.jo';

        closeModal('registerStudentModal');
        showPortalToast(`Student ${name} (${dept}) added to this workspace. No credentials were sent.`);
        registerStudentForm.reset();

        const totalStudentsKpi = document.getElementById('kpiTotalStudents');
        if (totalStudentsKpi) {
          const current = parseInt(totalStudentsKpi.textContent, 10) || 0;
          totalStudentsKpi.textContent = current + 1;
        }
      });
    }

    // Add Supervisor Form
    const addSupervisorForm = document.getElementById('addSupervisorForm');
    if (addSupervisorForm) {
      addSupervisorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('supFullName')?.value || 'Supervisor';
        closeModal('addSupervisorModal');
        showPortalToast(`Supervisor ${name} added to this workspace.`);
        addSupervisorForm.reset();
      });
    }
  }
  // APPLICATION TRACKER SPECIFICS
  let pendingWithdrawRole = '';
  let pendingWithdrawCompany = '';

  window.openWithdrawModal = function (role, company) {
    pendingWithdrawRole = role;
    pendingWithdrawCompany = company;
    const rEl = document.getElementById('withdrawModalRole');
    const cEl = document.getElementById('withdrawModalCompany');
    if (rEl) rEl.textContent = role;
    if (cEl) cEl.textContent = company;
    openModal('withdrawModal');
  };

  function initApplicationTracker() {
    const withdrawBtn = document.getElementById('confirmWithdrawBtn');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', () => {
        closeModal('withdrawModal');
        const table = document.getElementById('studentApplicationsTable');
        let withdrawn = 0;
        if (table) {
          const rows = table.querySelectorAll('tr');
          rows.forEach(tr => {
            if (tr.cells[1]?.textContent.trim() === pendingWithdrawRole && (tr.cells[0]?.firstElementChild?.textContent.trim() || tr.cells[0]?.textContent.trim()) === pendingWithdrawCompany) {
              if (tr.dataset.applicationStatus !== 'pending') return;
              tr.dataset.applicationStatus = 'withdrawn';
              withdrawn++;
              const badge = tr.querySelector('.bw-badge');
              badge.className = 'bw-badge';
              badge.textContent = 'Withdrawn';
              tr.lastElementChild.textContent = 'Application closed';
            }
          });
        }
        const appKpi = document.getElementById('kpiApplicationsSent');
        if (appKpi && withdrawn) {
          const current = parseInt(appKpi.textContent, 10) || 0;
          appKpi.textContent = Math.max(0,current - withdrawn);
        }
        showPortalToast(`Application for "${pendingWithdrawRole}" withdrawn in this workspace.`, 'bi-exclamation-triangle-fill text-warning');
      });
    }

    const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
    if (downloadReceiptBtn) {
      downloadReceiptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }
  }
  // SIDEBAR WAYFINDING CONTROLLER
  function initSidebar() {
    const sidebarLinks = document.querySelectorAll('.bw-sidebar-link');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href') || '';
        const dataTab = link.getAttribute('data-tab-target');

        if (dataTab && window.switchTab) {
          window.switchTab(dataTab);
        }

        if (href.startsWith('#')) {
          const targetId = href.replace('#', '');
          const targetEl = document.getElementById(targetId);

          if (targetEl) {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('is-active'));
            link.classList.add('is-active');

            if (targetEl.classList.contains('bw-tab-panel') && window.switchTab) {
              window.switchTab(targetId);
            }

            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // If target is inside a tab or card, highlight it briefly
            targetEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
            targetEl.style.boxShadow = '0 0 0 3px var(--bw-primary-glow)';
            setTimeout(() => {
              targetEl.style.boxShadow = '';
            }, 1500);
          }
        }
      });
    });

    // Hover, pinning, and mobile navigation are owned by enhancements.js.
  }
  // INITIALIZATION ON DOM READY
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initModals();
    initSidebar();

    initStudentDashboard();
    initSupervisorDashboard();
    initCompanyDashboard();
    initAdminDashboard();
    initApplicationTracker();
  });

})();
