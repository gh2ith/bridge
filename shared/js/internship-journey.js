/* Shared local workflows. These role checks are UI boundaries, not authentication. */
(() => {
  'use strict';
  const C=window.BridgewayCycle;if(!C)return;
  const {E,A,B,field,select,section}=C;
  C.state.academicEvaluations ||= {};C.state.certificates ||= {};C.state.studentSkills ||= {};
  const placement=id=>C.state.histories.find(h=>h.student===id);
  const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const currentCompanyEvaluation=id=>{const e=C.state.evaluations[id];return e&&e.company===placement(id)?.company?e:null;};
  const academic=id=>{const a=C.state.academicEvaluations[id],e=currentCompanyEvaluation(id);return a&&a.placement===placement(id)?.id&&a.companyDate===e?.date?a:null;};
  const certificate=id=>{const c=C.state.certificates[id];return c&&c.placement===placement(id)?.id?c:null;};
  const taskEntries=id=>(C.state.plans[id]||[]).flatMap((w,index)=>(w.tasks||[]).filter(t=>!t.removedAt).map(task=>({task,index})));
  function evaluationSteps(id){
    const a=academic(id),issued=!!certificate(id),done=[!!currentCompanyEvaluation(id),!!a&&a.criteria.every(c=>c.result==='Meets requirements'),issued,issued],current=done.findIndex(value=>!value);
    return ['Company evaluation','Academic assessment','College approval','Certificate'].map((label,index)=>({label,done:done[index],current:index===current}));
  }
  function evaluationProgress(id){
    const list=E('ol',null,'portal-evaluation-progress');list.setAttribute('aria-label','Completion stages');
    evaluationSteps(id).forEach(step=>{const item=E('li',null,step.done?'is-done':'');if(step.current)item.setAttribute('aria-current','step');item.append(E('strong',step.label),E('span',step.done?'Complete':step.current?'Current stage':'Waiting'));list.append(item);});return list;
  }
  const studentContext=id=>A(E('div',null,'portal-student-context'),E('strong',C.student(id).name),E('span',`Student ID ${C.student(id).studentId}`),E('span',C.org(placement(id)?.company||C.student(id).company)));
  // Populate the existing rubric before its DOMContentLoaded roster is built.
  const companyPicker=document.getElementById('evaluationStudentSelect');
  if(companyPicker&&C.identity()==='company:company-1'){
    const previous=companyPicker.value;companyPicker.replaceChildren();
    window.BridgewayPartners.students.filter(s=>s.company==='company-1'&&placement(s.id)?.status==='Active').forEach(s=>{
      const option=E('option',`${s.name} · ${s.studentId}`);option.value=s.id;option.dataset.name=s.name;option.dataset.role=s.role||'Intern';option.dataset.gpa=s.gpa||'';option.dataset.status=`${(C.state.plans[s.id]||[]).filter(w=>w.status==='verified').length} of 8 weeks verified`;companyPicker.append(option);
    });
    if([...companyPicker.options].some(o=>o.value===previous))companyPicker.value=previous;
  }
  function checklist(id){
    const weeks=C.state.plans[id]||[],h=placement(id),a=academic(id);
    return [
      ['Placement record',!!h&&['Active','Completed'].includes(h.status)],
      ['Eight weekly reports verified',weeks.length===8&&weeks.every(w=>w.status==='verified')],
      ['120 training hours verified',C.hours(id)>=120],
      ['All assigned tasks completed',taskEntries(id).every(({task})=>window.BridgewayWeeklyTasks?.taskStatus(task)==='Completed')],
      ['Company evaluation received',!!currentCompanyEvaluation(id)],
      ['Academic evaluation forwarded',!!a&&a.criteria.every(item=>item.result==='Meets requirements')]
    ];
  }
  function save(action){if(C.commit(action)===false)throw new Error('Browser storage is unavailable. Please retry.');}
  function sendAcademic(id,criteria,notes){
    const s=C.student(id),h=placement(id),company=currentCompanyEvaluation(id);
    if(C.identity()!=='supervisor:ahmad'||s?.supervisor!=='Dr. Ahmad S.'||!company||!h||h.status!=='Active'||certificate(id))throw new Error('This evaluation is not available for academic assessment.');
    if(criteria.length!==3||criteria.some(item=>!['Meets requirements','Needs follow-up'].includes(item.result))||!notes.trim()||notes.length>3000)throw new Error('Complete all academic criteria and add your assessment (up to 3,000 characters).');
    const old=C.state.academicEvaluations[id];C.state.academicEvaluations[id]={criteria:structuredClone(criteria),notes:notes.trim(),placement:h.id,companyDate:company.date,supervisor:s.supervisor,at:new Date().toISOString(),status:'Sent to college admin'};
    try{save('Academic evaluation forwarded to college admin');}catch(e){if(old)C.state.academicEvaluations[id]=old;else delete C.state.academicEvaluations[id];throw e;}
  }
  function approve(id,confirmed){
    const s=C.student(id),h=placement(id);
    if(C.identity()!==`admin:${s?.college}`||!confirmed||certificate(id)||!checklist(id).every(([,ok])=>ok)||h?.status!=='Active')throw new Error('Complete every review requirement before issuing the certificate.');
    const before={...h},oldStage=s.stage;
    const record={id:`BW-${crypto.randomUUID().slice(0,8).toUpperCase()}`,placement:h.id,student:id,name:s.name,studentId:s.studentId,company:C.org(h.company),college:C.org(s.college),role:h.role,start:h.start,end:localDate(),hours:C.hours(id),approvedBy:'College administrator',issued:new Date().toISOString()};
    C.state.certificates[id]=record;h.status='Completed';h.end=record.end;h.verifiedHours=record.hours;h.reason='College completion review approved';s.stage='Completed';
    try{save('Completion approved; certificate available to student');}catch(e){delete C.state.certificates[id];Object.assign(h,before);s.stage=oldStage;throw e;}return record;
  }
  function skills(id){return C.state.studentSkills[id]||[];}
  function setSkills(id,values){
    if(C.identity()!==`student:${id}`)throw new Error('Only your own skills can be updated.');
    const list=[...new Map(values.map(v=>v.trim()).filter(Boolean).map(v=>[v.toLowerCase(),v])).values()];
    if(list.length>20||list.some(v=>v.length>40))throw new Error('Use up to 20 skills, each up to 40 characters.');
    const old=skills(id);C.state.studentSkills[id]=list;try{save('Profile skills updated');}catch(e){C.state.studentSkills[id]=old;throw e;}
  }
  function skillsPanel(id,listing,values=skills(id)){
    const own=C.identity().startsWith('student:');
    const panel=section(own?'Skills included in your application':'Applicant skills',own?'Your selected skills are shared with the company as part of this application.':'Skills shared by the student when this application was submitted.');panel.classList.add('journey-skills');
    const tags=E('div',null,'journey-skill-tags'),required=(listing?.skills||'').split(',').map(s=>s.trim().toLowerCase());
    values.forEach(skill=>{const tag=E('span',skill);if(required.includes(skill.toLowerCase())){tag.classList.add('is-relevant');tag.title='Also listed in this opportunity’s required skills';}tags.append(tag);});
    panel.append(tags);if(!values.length)panel.append(E('p','No skills added yet. Add skills in My profile.','cycle-muted'));else panel.append(E('small','Highlighted skills also appear in the role’s requirements. This is not an AI assessment.','cycle-muted'));return panel;
  }
  function mountSkills(root,id){
    if(root.querySelector('#profileSkills'))return;
    const panel=E('section',null,'profile-bio journey-skills'),title=E('h2','Your skills'),hint=E('p','Add up to 20 skills. They appear as skill tags when you apply to a role.','cycle-muted'),input=field('Add a skill (press Enter)');input.input.id='profileSkills';input.input.maxLength=40;
    const tags=E('div',null,'journey-skill-tags'),error=E('p','','weekly-task-error');error.setAttribute('role','alert');let draft=[...skills(id)];
    function render(){tags.replaceChildren();draft.forEach((skill,index)=>{const chip=E('span',skill),remove=B('×',()=>{draft.splice(index,1);render();});remove.setAttribute('aria-label',`Remove ${skill}`);chip.append(remove);tags.append(chip);});}
    function add(){error.classList.remove('portal-form-success');error.setAttribute('role','alert');const v=input.input.value.trim();if(!v)return true;if(draft.some(s=>s.toLowerCase()===v.toLowerCase())){input.input.value='';return true;}if(draft.length>=20){error.textContent='You can add up to 20 skills.';return false;}draft.push(v);input.input.value='';error.textContent='';render();return true;}
    const button=B('Add skill',add),saveButton=B('Save skills',()=>{try{if(!add())return;setSkills(id,draft);input.input.removeAttribute('data-local-dirty');error.classList.add('portal-form-success');error.setAttribute('role','status');error.textContent='Skills saved in this browser.';}catch(e){error.classList.remove('portal-form-success');error.setAttribute('role','alert');error.textContent=e.message;}},true);
    input.input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();add();}});panel.append(title,hint,tags,A(E('div',null,'journey-skill-entry'),input.wrap,button),error,saveButton);root.querySelector('.profile-edit-main').append(panel);render();
  }

  function academicPanel(id){
    const s=C.student(id),panel=section('Academic assessment','Read the company evaluation, add your academic assessment, then forward it to the college administrator.'),e=currentCompanyEvaluation(id);
    panel.append(studentContext(id),evaluationProgress(id));
    if(!e){panel.append(E('p','Waiting for the host company’s final evaluation.','cycle-muted'));return panel;}
    const companyReference=E('details',null,'portal-company-evaluation');companyReference.append(A(E('summary'),E('span','Read company evaluation'),E('span',`${e.scores.reduce((sum,score)=>sum+score,0)} / 40`)),C.evaluation(id));panel.append(companyReference);const existing=academic(id);
    if(existing)panel.append(C.status(existing.status),E('p',existing.notes));
    if(C.identity()!=='supervisor:ahmad'||s.supervisor!=='Dr. Ahmad S.'||certificate(id)||placement(id)?.status!=='Active')return panel;
    const form=E('form',null,'cycle-form'),criteria=['Learning outcomes and reflection','Academic engagement and professionalism','Training evidence and readiness for completion'].map((name,i)=>({name,control:select(name,[['','Select an outcome'],'Meets requirements','Needs follow-up'],existing?.criteria[i]?.result||'')}));
    criteria.forEach(({control})=>{control.input.required=true;form.append(control.wrap);});
    const notes=field('Academic assessment',existing?.notes||'','textarea');notes.input.required=true;notes.input.maxLength=3000;
    const error=E('p','','weekly-task-error');error.setAttribute('role','alert');const submit=E('button',existing?'Update and forward assessment':'Forward to college admin','cycle-button is-primary');submit.type='submit';form.append(notes.wrap,error,submit);
    form.addEventListener('submit',ev=>{ev.preventDefault();try{sendAcademic(id,criteria.map(({name,control})=>({name,result:control.input.value})),notes.input.value);panel.replaceWith(academicPanel(id));}catch(e){error.textContent=e.message;}});panel.append(form);return panel;
  }
  function completionPanel(id){
    const panel=section('Completion review','Verify the training record and both evaluations before issuing the Bridgeway certificate.'),h=placement(id),s=C.student(id),record=certificate(id);
    panel.append(studentContext(id),evaluationProgress(id));
    const checks=checklist(id),ready=checks.filter(([,ok])=>ok).length,summary=E('div',null,'portal-completion-summary'),progress=E('progress');progress.max=checks.length;progress.value=ready;progress.setAttribute('aria-label',`${ready} of ${checks.length} completion requirements ready`);summary.append(E('strong',`${ready} of ${checks.length} requirements ready`),progress,E('p',ready===checks.length?'The record is ready for your final confirmation.':`Waiting for: ${checks.find(([,ok])=>!ok)[0].toLowerCase()}.`));panel.append(summary);
    const list=E('ul',null,'journey-checklist');checklist(id).forEach(([label,ok])=>list.append(A(E('li'),E('i',null,`bi bi-${ok?'check-circle-fill':'circle'}`),E('span',label),E('strong',ok?'Ready':'Waiting'))));panel.append(list);
    if(currentCompanyEvaluation(id))panel.append(B('Read company evaluation',()=>C.dialog('Company evaluation',C.evaluation(id))));
    const a=academic(id);if(a){const details=E('details');details.append(E('summary','Academic assessment'),E('p',a.notes));a.criteria.forEach(c=>details.append(E('p',`${c.name}: ${c.result}`)));panel.append(details);}
    if(record){panel.append(certificateCard(id));return panel;}
    if(C.identity()!==`admin:${s.college}`||h?.status!=='Active')return panel;
    const confirmation=E('input');confirmation.type='checkbox';const error=E('p','','weekly-task-error');error.setAttribute('role','alert');
    const issue=B('Approve completion & issue certificate',async()=>{if(!confirmation.checked){error.textContent='Confirm the college completion requirements first.';return;}const ok=await window.BridgewayUX?.confirmAction({title:'Approve internship completion?',message:`Issue ${s.name}’s certificate and close this placement? Both evaluations and all training requirements must be complete.`,action:'Approve and issue'});if(!ok)return;try{approve(id,true);panel.replaceWith(completionPanel(id));}catch(e){error.textContent=e.message;}},true);
    issue.disabled=!checklist(id).every(([,ok])=>ok);const help=E('p',issue.disabled?'Approval unlocks when every completion requirement is ready.':'Confirm your review, then approve completion and issue the certificate.','portal-approval-help');help.id='completion-help-'+id;issue.setAttribute('aria-describedby',help.id);panel.append(A(E('label',null,'cycle-check'),confirmation,E('span','I reviewed the college’s completion requirements and both evaluations.')),help,error,issue);return panel;
  }

  function certificateCanvas(record){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Bridgeway completion certificate for ${record.name}, ${record.hours} verified hours. ${record.id}`);
    const x=canvas.getContext('2d'),gradient=x.createLinearGradient(0,0,1600,1000);gradient.addColorStop(0,'#edf3fc');gradient.addColorStop(.45,'#ffffff');gradient.addColorStop(1,'#c5d5e9');x.fillStyle=gradient;x.fillRect(0,0,1600,1000);x.strokeStyle='#9ab0cb';x.lineWidth=3;x.strokeRect(32,32,1536,936);x.strokeRect(48,48,1504,904);
    x.strokeStyle='#b9cce2';x.lineWidth=2;for(let i=0;i<7;i++){x.beginPath();x.arc(1550,60,120+i*35,0,Math.PI*2);x.stroke();}
    x.textAlign='center';x.fillStyle='#17365d';
    function line(text,y,size=28,weight='400',max=1340){x.font=`${weight} ${size}px Arial`;while(x.measureText(text).width>max&&size>16){size--;x.font=`${weight} ${size}px Arial`;}x.fillText(text,800,y,max);}
    line('BRIDGEWAY',135,36,'700');line('INTERNSHIP COMPLETION',240,24,'600');line('Eight weeks. Earned.',330,60,'700');line('This certifies that',405,25);line(record.name,480,54,'700');line(`Student ID ${record.studentId||'—'}`,525,22);line(`completed ${record.hours} verified training hours with`,595,26);line(record.company,640,32,'700');line(record.role||'Internship training',683,25);line(`${record.start} — ${record.end}`,728,23);
    x.strokeStyle='#8fa7c6';x.beginPath();x.moveTo(250,780);x.lineTo(1350,780);x.stroke();line(record.college,835,27,'600');line('Completion approved by the college administrator',875,21);line(`${record.id} · Issued ${record.issued.slice(0,10)}`,922,18);return canvas;
  }
  function pdfBytes(canvas){
    const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]),c=>c.charCodeAt(0)),encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
    const push=v=>{const bytes=typeof v==='string'?encoder.encode(v):v;parts.push(bytes);length+=bytes.length;};
    push('%PDF-1.4\n');
    function obj(id,body){offsets[id]=length;push(`${id} 0 obj\n${body}\nendobj\n`);}
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 500] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=length;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push('\nendstream\nendobj\n');const stream='q 800 0 0 500 0 0 cm /Im0 Do Q';obj(5,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const start=length;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<6;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
  }
  function certificateCard(id){
    const record=certificate(id),panel=section('Your completion certificate',record?'Approved by your college. Available to download and print.':'Available after company evaluation, academic assessment, and college completion approval.');
    if(!record)panel.append(evaluationProgress(id));
    if(!record)return panel;
    panel.classList.add('journey-certificate');const canvas=certificateCanvas(record);panel.append(canvas);
    panel.append(B('Download certificate PDF',()=>{const url=URL.createObjectURL(pdfBytes(canvas)),a=E('a');a.href=url;a.download=`Bridgeway-${record.id}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);},true));return panel;
  }

  function supervisorAssessments(root){
    root.replaceChildren();
    const directory=section('Assigned students','Company evaluations and academic assessments'),search=field('Find a student','','search'),count=E('p','','portal-muted'),list=E('div',null,'evaluation-student-list'),detail=E('div',null,'supervisor-assessment-detail');
    directory.classList.add('supervisor-assessment-picker','evaluation-directory','bw-student-picker');search.input.placeholder='Name, student ID, or company';count.setAttribute('role','status');directory.append(search.wrap,count,list);
    root.append(A(E('div',null,'supervisor-assessment-workspace'),directory,detail));let selected='';
    const statusFor=id=>certificate(id)?'Training completed':academic(id)?'Academic assessment forwarded':currentCompanyEvaluation(id)?'Ready for academic assessment':'Awaiting company evaluation';
    function renderList(){
      const students=visibleStudents(),query=search.input.value.trim().toLowerCase(),matches=students.filter(s=>`${s.name} ${s.studentId} ${C.org(s.company)}`.toLowerCase().includes(query));list.replaceChildren();count.textContent=`${matches.length} of ${students.length} assigned students`;
      for(const s of matches){const button=B('',()=>choose(s.id));button.className='evaluation-student-button';button.setAttribute('aria-pressed',String(selected===s.id));button.setAttribute('aria-controls','supervisorAssessmentDetail');button.append(E('strong',s.name),E('span',`${s.studentId} / ${C.org(s.company)}`),E('small',statusFor(s.id)));list.append(button);}
      if(!matches.length)list.append(E('p','No matching students. Try another name, ID, or company.','portal-muted'));
    }
    function renderDetail(){
      detail.replaceChildren();detail.id='supervisorAssessmentDetail';
      if(!selected){const icon=E('i',null,'bi bi-clipboard-check');icon.setAttribute('aria-hidden','true');detail.append(A(E('section',null,'supervisor-selection-prompt'),icon,E('h2','Select a student'),E('p','Choose an assigned student to read the company evaluation and prepare their academic assessment.')));return;}
      const change=B('Change student',()=>choose(''));change.className='supervisor-change-student';detail.append(change,academicPanel(selected));const form=detail.querySelector('form');if(form)window.BridgewayUX?.remember(form);
    }
    async function choose(id){
      if(id===selected)return;const form=detail.querySelector('form');
      if(form&&window.BridgewayUX?.dirty(form)){if(!await window.BridgewayUX.confirmDiscard('Changing students will discard your unfinished academic assessment. The company evaluation stays unchanged.'))return;window.BridgewayUX.remember(form);}
      selected=id;renderList();renderDetail();if(!id)search.input.focus();
    }
    search.input.addEventListener('input',renderList);document.addEventListener('bridgeway:cycle-change',renderList);renderList();renderDetail();
  }
  function visibleStudents(){const viewer=C.identity();return window.BridgewayPartners.students.filter(s=>viewer===`company:${s.company}`||viewer===`admin:${s.college}`||viewer==='supervisor:ahmad'&&s.supervisor==='Dr. Ahmad S.');}
  function collegeListings(){
    const tbody=document.querySelector('#tab-posts tbody');if(!tbody)return;
    const college=C.identity().slice('admin:'.length);
    function render(){tbody.replaceChildren();const listings=C.state.listings.filter(l=>['Published','Paused'].includes(l.status));
      listings.forEach((l,index)=>{
        const paused=!!C.state.collegeListingRestrictions?.[college]?.[l.id],row=E('tr');
        [String(index+1),l.title,C.org(l.company),`${l.capacity} seats`,`${C.state.applications.filter(a=>a.listing===l.id).length} applications`,C.date(l.deadline)].forEach(text=>row.append(E('td',text)));
        row.append(A(E('td'),C.status(paused?'Paused for your college':'Available')));
        const toggle=B(paused?'Resume':'Pause',async()=>{if(C.identity()!=='admin:'+college)return;if(!paused&&!await window.BridgewayUX?.confirmAction({title:'Pause listing for your college?',message:`Hide ${l.title} from your college’s students? Existing applications and training are retained.`,action:'Pause for my college'}))return;
          C.state.collegeListingRestrictions ||= {};C.state.collegeListingRestrictions[college] ||= {};C.state.collegeListingRestrictions[college][l.id]=!paused;C.commit(paused?'Listing resumed for your college':'Listing paused for your college');render();});
        toggle.setAttribute('aria-label',`${paused?'Resume':'Pause'} ${l.title} for your college`);
        const details=B('View details',()=>{const body=section(l.title,`${C.org(l.company)} · ${l.location}`);body.append(E('p',l.description),E('p',l.skills));(l.questions||[]).forEach(q=>body.append(E('p',q)));C.dialog('Internship details',body);});
        row.append(A(E('td'),details,toggle));tbody.append(row);
      });if(!listings.length)tbody.append(A(E('tr'),A(E('td'),E('p','No approved listings available.'))));
    }render();
  }
  function monitor(root){
    const panel=section('Progress monitor','Focus on overdue work, missing submissions, report reviews, and completion readiness.'),query=field('Find a student','','search'),filter=select('Show',['All students','Overdue tasks','Missing submissions','Awaiting company review','Reports awaiting verification','Behind planned hours'],'All students'),rows=E('div',null,'journey-monitor-list');panel.append(A(E('div',null,'cycle-toolbar'),query.wrap,filter.wrap),rows);root.append(panel);
    function render(){rows.replaceChildren();visibleStudents().filter(s=>`${s.name} ${s.studentId}`.toLowerCase().includes(query.input.value.trim().toLowerCase())).forEach(s=>{
      const tasks=taskEntries(s.id),weeks=C.state.plans[s.id]||[],T=window.BridgewayWeeklyTasks,late=tasks.filter(({task})=>T?.overdue(task)).length,missing=tasks.filter(({task})=>T?.taskStatus(task)==='Assigned').length,review=tasks.filter(({task})=>['Submitted','Resubmitted'].includes(T?.taskStatus(task))).length,reports=weeks.filter(w=>w.status==='submitted').length,hours=C.hours(s.id),h=placement(s.id),elapsed=h?.status==='Active'?Math.max(0,Math.floor((Date.parse(localDate())-Date.parse(h.start))/604800000)):0,expected=weeks.slice(0,elapsed).reduce((n,w)=>n+Number(w.hours||0),0);
      const filterFlags={'Overdue tasks':late>0,'Missing submissions':missing>0,'Awaiting company review':review>0,'Reports awaiting verification':reports>0,'Behind planned hours':hours<expected};if(filter.input.value!=='All students'&&!filterFlags[filter.input.value])return;
      const row=section(s.name,`${s.studentId} · ${C.org(s.company)}`);row.classList.add('journey-monitor-row');
      const metrics=E('div',null,'journey-monitor-metrics');metrics.append(A(E('div'),E('strong',`${hours} / 120 h`),E('small',expected?`${expected} planned hours by now · Verified hours shown`:'Supervisor-verified hours')),A(E('div'),E('strong',tasks.length?`${tasks.filter(({task})=>T?.taskStatus(task)==='Completed').length} / ${tasks.length}`:'No tasks'),E('small',tasks.length?'Assigned tasks completed':'No company tasks assigned')));row.append(metrics);
      const flags=E('div',null,'journey-monitor-flags');[[late,'overdue'],[missing,'not yet submitted'],[review,'awaiting company review'],[reports,reports===1?'report awaiting verification':'reports awaiting verification']].filter(([count])=>count).forEach(([count,label])=>flags.append(E('span',`${count} ${label}`)));if(!flags.children.length)flags.append(E('span','No task submissions or reports awaiting review'));row.append(flags);
      row.append(B('View training and tasks',()=>{const content=E('div');C.training(content,s.id,document.body.dataset.portalRole);C.dialog(`${s.name} · Training`,content);}));rows.append(row);
    });if(!rows.children.length)rows.append(E('p','No students match these filters.','cycle-muted'));}
    query.input.addEventListener('input',render);filter.input.addEventListener('change',render);document.addEventListener('bridgeway:cycle-change',render);render();
  }
  function tab(id,label){const nav=document.querySelector('.bw-masar-nav'),main=document.querySelector('.bw-main-content'),panel=E('section',null,'bw-tab-panel');panel.id=id;const button=B('',()=>{document.querySelectorAll('.bw-tab-panel').forEach(p=>p.classList.toggle('is-active',p.id===id));document.querySelectorAll('.bw-masar-nav [data-tab]').forEach(b=>{b.classList.toggle('is-active',b.dataset.tab===id);if(b.dataset.tab===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});history.replaceState(null,'','#'+id);});button.className='bw-masar-item bw-tab-btn';button.dataset.tab=id;button.append(E('i',null,'bi bi-clipboard-check'),E('span',label));button.setAttribute('aria-label',label);button.querySelector('i').setAttribute('aria-hidden','true');nav?.append(button);main.append(panel);new MutationObserver(()=>{if(panel.classList.contains('is-active')){document.body.classList.add('portal-task-view');const heading=main.querySelector('h1');if(heading)heading.textContent=label;}}).observe(panel,{attributes:true,attributeFilter:['class']});return panel;}
  window.BridgewayJourney={placement,academic,certificate,checklist,sendAcademic,approve,skills,setSkills,skillsPanel,mountSkills,academicPanel,completionPanel,certificateCard,certificateCanvas,pdfBytes,taskEntries,evaluationSteps,evaluationProgress};
  document.addEventListener('DOMContentLoaded',()=>{
    const role=document.body.dataset.portalRole;
    if(role==='company'){
      const picker=document.getElementById('evaluationStudentSelect'),area=document.querySelector('.evaluation-form-area');if(picker&&area){const progress=E('div');area.prepend(progress);const render=()=>{progress.replaceChildren();if(picker.value)progress.append(evaluationProgress(picker.value));};picker.addEventListener('change',render);document.addEventListener('click',event=>{if(event.target.closest('#companyEvaluationStudents button'))queueMicrotask(render);});document.addEventListener('bridgeway:cycle-change',render);render();}
    }
    if(['company','supervisor','admin'].includes(role))monitor(tab('tab-progress-monitor','Progress monitor'));
    if(role==='supervisor'){
      const root=document.getElementById('tab-endorsement');if(root)supervisorAssessments(root);
    }
    if(role==='admin'){
      collegeListings();
      const root=tab('tab-completion','Completion review'),picker=select('Student',visibleStudents().map(s=>[s.id,s.name]),visibleStudents()[0]?.id||''),detail=E('div');root.append(picker.wrap,detail);const render=()=>{detail.replaceChildren();if(picker.input.value)detail.append(completionPanel(picker.input.value));};picker.input.addEventListener('change',render);render();
    }
    if(location.hash&&document.getElementById(location.hash.slice(1)))window.switchTab(location.hash.slice(1));
  });
})();
