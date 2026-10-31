/* Administrator-owned account records. Passwords never enter the stored record. */
(() => {
  'use strict';
  const key='bridgeway:managed-accounts:v1';
  let records=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))records=saved;}catch{}
  const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const labels={student:'student',supervisor:'supervisor',company:'company',college:'college administrator'};
  const roles={student:'Student',supervisor:'Academic supervisor',company:'Company administrator',college:'College administrator'};
  const field=(name,label,type='text',required=true,options)=>({name,label,type,required,options});
  function schema(type,editing=false){
    const person=['student','supervisor'].includes(type);
    return [
      {title:person?'Identity & contact':'Organization details',fields:person?[
        field('name','Full name'),...(type==='student'?[field('studentId','Student ID')]:editing?[field('staffId','Staff ID','text',false)]:[]),field('email','Institutional email','email'),field('phone','Phone number','tel')
      ]:[field('name',type==='company'?'Company name':'College / university name'),field('registrationId','Organization reference ID'),field('location','City'),field('address','Address'),field('phone','Organization phone','tel'),field('website','Website','url',false)]},
      {title:person?'Academic details':'Administrator details',fields:person?[
        field('faculty','Faculty / college'),field('department','Department / major'),
        ...(type==='student'?[field('year','Year of study','select',true,['1','2','3','4','5','6','Graduate']),field('gpa','Cumulative GPA / 4.00','number'),field('supervisor','Academic supervisor','select',false,supervisors())]:[field('title','Academic title','select',true,['Dr.','Prof.','Mr.','Ms.']),...(editing?[field('office','Office / room', 'text',false),field('officeHours','Office hours','text',false)]:[])])
      ]:[field('admin','Administrator full name'),field('email','Administrator login email','email'),field('adminPhone','Administrator phone','tel'),field('jobTitle','Administrator job title')]},
      {title:'Account access',fields:editing?[field('status','Account status','select',true,['Active','Suspended'])]:[]}
    ];
  }
  function supervisors(){return [...new Set(['Dr. Ahmad S.',...records.filter(a=>a.type==='supervisor'&&a.college==='college-1'&&a.status!=='Suspended').map(a=>a.name)])];}
  function persist(){localStorage.setItem(key,JSON.stringify(records));}
  function accountDefaults(type,existing){return {status:existing?.status||'Active',...(type==='supervisor'?{staffId:existing?.staffId||`SUP-${crypto.randomUUID()}`}:{})};}
  function validate(values,id){
    const email=values.email.toLowerCase();
    const candidates=[...records,...window.BridgewayPartners.organizations];
    if(candidates.some(a=>a.id!==id&&a.email?.toLowerCase()===email))return 'This login email already belongs to another account.';
    if(values.type==='student'&&records.some(a=>a.id!==id&&a.type==='student'&&a.college===values.college&&a.studentId===values.studentId))return 'This student ID already belongs to another student.';
    if(values.type==='supervisor'&&records.some(a=>a.id!==id&&a.type==='supervisor'&&a.college===values.college&&a.staffId===values.staffId))return 'This staff ID already belongs to another supervisor.';
    return '';
  }
  function open(type,existing=null,onSave){
    const C=window.BridgewayCycle;if(!C)return;
    const seed={status:'Active',faculty:'Faculty of IT',college:'college-1',...(existing||{})};
    if(type==='student')seed.supervisor=window.BridgewayAcademicAssignments.get(seed.name,seed.college)||'';
    const form=E('form',null,'managed-account-form'),intro=E('p','Enter the details this person will use across Bridgeway.','managed-account-intro');form.append(intro);
    const body=E('div',null,'managed-account-fields'),inputs=new Map();
    schema(type,Boolean(existing)).forEach(group=>{
      const section=E('fieldset'),legend=E('legend',group.title),grid=E('div',null,'managed-account-grid');section.append(legend,grid);
      group.fields.forEach(f=>{
        const wrap=E('div',null,'cycle-field'),id='managed-'+f.name,label=E('label',f.label+(f.required?' *':''));label.htmlFor=id;
        if(type==='supervisor'&&f.name==='name')wrap.classList.add('managed-field-wide');
        const input=E(f.type==='select'?'select':'input');input.id=id;input.name=f.name;input.required=f.required;
        if(f.type==='select'){
          if(!f.required){const blank=E('option',f.name==='supervisor'?'Unassigned':'Select');blank.value='';input.append(blank);}
          (f.options||[]).forEach(value=>{const option=E('option',value);option.value=value;input.append(option);});
          if(seed[f.name]&&!f.options?.includes(seed[f.name])){const option=E('option',seed[f.name]);option.value=seed[f.name];input.append(option);}
        }else{input.type=f.type;input.maxLength=160;if(f.name==='gpa'){input.min='0';input.max='4';input.step='.01';}if(f.type==='tel'){input.autocomplete='tel';input.maxLength=30;input.pattern='[+()0-9 .-]{7,30}';input.title='Use 7–30 characters: digits, spaces, +, brackets or hyphens.';}}
        input.value=seed[f.name]||'';if(f.name==='staffId')input.readOnly=true;inputs.set(f.name,input);wrap.append(label,input);grid.append(wrap);
      });body.append(section);
    });
    const access=body.lastElementChild.querySelector('.managed-account-grid'),role=E('div',null,'managed-account-role');role.append(E('span','Account role'),E('strong',roles[type]));access.append(role);
    if(!existing){
      ['Temporary password','Confirm temporary password'].forEach((label,i)=>{
        const wrap=E('div',null,'cycle-field'),input=E('input'),lab=E('label',label+' *');input.type='password';input.id='managed-password-'+i;input.autocomplete='new-password';input.minLength=12;input.required=true;lab.htmlFor=input.id;
        const control=E('div',null,'managed-password-control'),toggle=E('button',null,'managed-password-toggle'),icon=E('i',null,'bi bi-eye');icon.setAttribute('aria-hidden','true');toggle.type='button';toggle.append(icon);toggle.setAttribute('aria-label',`Show ${label.toLowerCase()}`);toggle.setAttribute('aria-controls',input.id);toggle.setAttribute('aria-pressed','false');
        toggle.addEventListener('click',()=>{const visible=input.type==='password';input.type=visible?'text':'password';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',`${visible?'Hide':'Show'} ${label.toLowerCase()}`);icon.className=visible?'bi bi-eye-slash':'bi bi-eye';});
        input.dataset.credential='true';control.append(input,toggle);wrap.append(lab,control);access.append(wrap);inputs.set(i?'confirmPassword':'password',input);
      });
      const note=E('p','Use at least 12 characters. Passwords are not stored in this browser; working login credentials require the authentication server.','managed-account-access-note');body.lastElementChild.append(note);
    }
    const error=E('p',null,'managed-account-error');error.setAttribute('role','alert');form.append(body,error);
    const footer=E('footer',null,'managed-account-footer'),cancel=E('button','Cancel','cycle-button'),submit=E('button',existing?'Save changes':'Create account','cycle-button is-primary');cancel.type='button';submit.type='submit';footer.append(cancel,submit);form.append(footer);
    const modal=C.dialog(`${existing?'Edit':'Create'} ${labels[type]} account`,form);modal.classList.add('managed-account-dialog');cancel.addEventListener('click',()=>modal.querySelector('header button').click());
    inputs.get('confirmPassword')?.addEventListener('input',()=>inputs.get('confirmPassword').setCustomValidity(''));
    inputs.get('password')?.addEventListener('input',()=>inputs.get('confirmPassword').setCustomValidity(''));
    let busy=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const confirmation=inputs.get('confirmPassword');
      if(confirmation&&confirmation.value!==inputs.get('password').value){confirmation.setCustomValidity('Passwords must match.');confirmation.reportValidity();return;}
      const values={...accountDefaults(type,existing),id:existing?.id||`${type}-${crypto.randomUUID()}`,type,college:personCollege(type,seed)};
      inputs.forEach((input,name)=>{if(!['password','confirmPassword'].includes(name))values[name]=name==='staffId'?values.staffId:input.value.trim();});
      const message=validate(values,values.id);if(message){error.textContent=message;error.tabIndex=-1;error.focus();return;}
      busy=true;
      if(window.BridgewayUX?.confirmAction){const approved=await window.BridgewayUX.confirmAction({title:existing?'Save account changes?':'Create this account?',message:`${values.name} · ${values.email}. Role: ${roles[type]}.${existing?' Account status: '+values.status+'.':''}`,action:existing?'Save changes':'Create account'});if(!approved){busy=false;return;}}
      const previous=records.findIndex(a=>a.id===values.id),old=records[previous];if(previous>=0)records[previous]=values;else records.push(values);
      try{persist();}catch{if(previous>=0)records[previous]=old;else records.pop();busy=false;error.textContent='Browser storage is unavailable. Your entries are still here; try again.';return;}
      applyModel(values);
      if(type==='supervisor'&&existing&&existing.name!==values.name){
        window.BridgewayPartners.students.filter(s=>s.college===values.college&&s.supervisor===existing.name).forEach(s=>window.BridgewayAcademicAssignments.set(s.name,s.college,values.name));
        if(C.state.reportVisibility&&Object.prototype.hasOwnProperty.call(C.state.reportVisibility,existing.name)){C.state.reportVisibility[values.name]=C.state.reportVisibility[existing.name];C.commit('Academic supervisor details updated');}
      }
      if(type==='student')window.BridgewayAcademicAssignments.set(values.name,values.college,values.supervisor);
      if(onSave)onSave(values);else renderCollege(values,existing);
      form.dataset.committed='true';form.querySelectorAll('[data-credential]').forEach(n=>n.value='');modal.close();window.showPortalToast('Account details '+(existing?'updated.':'added.'));
    });
    modal.addEventListener('close',()=>form.querySelectorAll('[data-credential]').forEach(n=>n.value=''),{once:true});
    return modal;
  }
  function personCollege(type,seed){return ['student','supervisor'].includes(type)?seed.college:undefined;}
  function applyModel(a){
    const model=window.BridgewayPartners;
    if(a.type==='student'){let s=model.students.find(s=>s.id===a.id);if(!s){s={id:a.id,company:null,role:null,stage:'Not applied',weeks:0,hours:0,supervisor:null};model.students.push(s);}Object.assign(s,a);}
    else if(['company','college'].includes(a.type)){const existing=model.organizations.find(o=>o.id===a.id);if(existing)Object.assign(existing,a);else model.organizations.push({...a,students:0,listings:0,placements:0});}
  }
  function renderCollege(a,previous){
    const D=window.BridgewayCollegeDirectory;if(!D)return;
    const student=a.type==='student',table=document.querySelector(student?'#adminStudentsTableBody':'#tab-supervisors tbody');
    let row=[...table.rows].find(r=>r.dataset.accountId===a.id||(r.dataset.studentName||r.cells[0].querySelector('strong,[data-style="s16"]')?.textContent.trim()||r.cells[0].textContent.trim())===(previous?.name||a.name));
    if(!row){row=student?D.appendStudent(a.name,a.department,a.gpa):D.appendCells(table,[a.name,a.department,a.faculty,'0 students','']);}
    row.dataset.accountId=a.id;row.dataset.studentName=a.name;
    const identity=E('div');identity.append(E('strong',a.name),E('small',a.email));row.cells[0].replaceChildren(identity);
    row.cells[1].textContent=a.department;row.cells[2].textContent=student?a.gpa:a.faculty;if(student)row.cells[3].textContent=a.faculty;
    const controls=E('div',null,'managed-account-row-actions'),edit=E('button','Edit details','bw-tag-btn');edit.type='button';edit.addEventListener('click',()=>open(a.type,a));controls.append(edit);
    const remove=E('button','Delete','bw-tag-btn text-danger');remove.type='button';remove.addEventListener('click',()=>window.openDeleteModal(student?'Student':'Supervisor',student?a.studentId:a.staffId,a.name));controls.append(remove);row.cells[student?5:4].replaceChildren(controls);
    if(student)row.cells[4].replaceChildren(D.supervisorSelect(a.name));
    const users=document.querySelector('#tab-users tbody'),matchEmail=previous?.email||a.email;let user=[...users.rows].find(r=>r.dataset.accountId===a.id||matchEmail&&r.textContent.includes(matchEmail));
    if(!user){user=D.appendCells(users,[a.name,a.email,roles[a.type],a.faculty,a.status]);}else{user.cells[0].textContent=a.name;user.cells[1].textContent=a.email;user.cells[2].textContent=roles[a.type];user.cells[3].textContent=a.faculty;user.cells[4].textContent=a.status;}user.dataset.accountId=a.id;
    if(!student)document.querySelectorAll('#adminStudentsTableBody select').forEach(select=>{const old=[...select.options].find(o=>o.value===previous?.name);if(old){old.value=a.name;old.textContent=a.name;}else if(![...select.options].some(o=>o.value===a.name)){const option=E('option',a.name);option.value=a.name;select.append(option);}});
    D.refresh();
  }
  function importStudents(rows){
    const C=window.BridgewayCycle;if(C?.identity()!=='admin:college-1')throw new Error('Only the college administrator can import students.');
    if(!Array.isArray(rows)||!rows.length||rows.length>500||window.BridgewayStudentImport?.validate(rows).some(r=>r.errors.length))throw new Error('Resolve student import validation errors first.');
    const staged=rows.map(row=>({...row,id:`student-${crypto.randomUUID()}`,type:'student',college:'college-1',status:'Active'}));
    if(staged.some(a=>!a.name||!a.studentId||!a.email))throw new Error('Validate every student before importing.');
    for(const a of staged){const message=validate(a,a.id);if(message)throw new Error(message);}
    if(new Set(staged.map(a=>a.email.toLowerCase())).size!==staged.length||new Set(staged.map(a=>a.studentId)).size!==staged.length)throw new Error('Duplicate students in this import.');
    const previous=records.length;records.push(...staged);try{persist();}catch{records.splice(previous);throw new Error('Browser storage is unavailable. No students were imported.');}
    staged.forEach(a=>{applyModel(a);if(a.supervisor)window.BridgewayAcademicAssignments.set(a.name,a.college,a.supervisor);renderCollege(a);});
    return staged;
  }
  window.BridgewayAccountEditor={open,validate,schema,accountDefaults,importStudents,supervisors};
  document.addEventListener('DOMContentLoaded',()=>{
    if(!document.getElementById('adminStudentsTableBody'))return;
    const model=window.BridgewayPartners;
    document.getElementById('registerStudentModal')?.remove();document.getElementById('addSupervisorModal')?.remove();
    // Seed available fields only; missing details remain empty, never invented.
    for(const type of ['student','supervisor']){
      const table=document.querySelector(type==='student'?'#adminStudentsTableBody':'#tab-supervisors tbody');
      [...table.rows].forEach(row=>{
        const name=row.dataset.studentName||row.cells[0].firstElementChild?.textContent.trim()||row.cells[0].textContent.trim();
        const s=type==='student'?model.students.find(s=>s.name===name):null;
        const existing=records.find(a=>a.id===s?.id||a.type===type&&a.name===name);if(existing){renderCollege(existing,existing);return;}
        const seedEmail={omar:'omar@bau.edu.jo',lina:'lina@bau.edu.jo'};
        const a={id:s?.id||`supervisor-${crypto.randomUUID()}`,type,name,email:s?.email||row.cells[0].querySelector('[data-style="s17"]')?.textContent.trim()||seedEmail[s?.id]||'',department:s?.department||row.cells[1].textContent.trim(),faculty:type==='student'?row.cells[3].textContent.trim():row.cells[2].textContent.trim(),gpa:s?.gpa,studentId:s?.studentId,college:'college-1',status:'Active'};
        records.push(a);renderCollege(a,a);
      });
    }
    records.filter(a=>['student','supervisor'].includes(a.type)&&a.college==='college-1').forEach(a=>{
      let deleted=[];try{deleted=JSON.parse(localStorage.getItem('bridgeway:college-student-directory:college-1')||'[]');}catch{}
      if(!deleted.includes(a.id))renderCollege(a,a);
    });persist();
    document.addEventListener('click',event=>{const button=event.target.closest('[data-open-modal="registerStudentModal"],[data-open-modal="addSupervisorModal"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();open(button.dataset.openModal==='registerStudentModal'?'student':'supervisor');},true);
    if(new URLSearchParams(location.search).get('create')==='student')open('student');
  });
})();
