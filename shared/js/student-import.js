/* Local CSV/XLSX account import. No credentials are generated or retained here. */
(() => {
  'use strict';
  const columns=['name','studentId','email','phone','faculty','department','year','gpa','supervisor'];
  function normalizeHeader(value){
    const normalized=String(value).replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
    const aliases={fullname:'name',studentid:'studentId',institutionalemail:'email',phonenumber:'phone',facultycollege:'faculty',departmentmajor:'department',yearofstudy:'year',cumulativegpa:'gpa',academicsupervisor:'supervisor'};
    return aliases[normalized]||columns.find(column=>column.toLowerCase()===normalized)||String(value).trim();
  }
  function validate(rows){
    const seenIds=new Set(),seenEmails=new Set(),model=window.BridgewayPartners;
    return rows.map((row,index)=>{
      const value=Object.fromEntries(columns.map(key=>[key,String(row[key]??'').trim()])),errors=[];
      for(const key of columns.filter(k=>k!=='supervisor'))if(!value[key])errors.push(`${key} is required`);
      if(Object.values(value).some(v=>v.length>160))errors.push('Fields must be 160 characters or fewer');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))errors.push('Invalid email');
      if(!/^[+()0-9 .-]{7,30}$/.test(value.phone))errors.push('Invalid phone');
      if(!['1','2','3','4','5','6','Graduate'].includes(value.year))errors.push('Year must be 1–6 or Graduate');
      if(!value.gpa||!Number.isFinite(Number(value.gpa))||Number(value.gpa)<0||Number(value.gpa)>4)errors.push('GPA must be between 0 and 4');
      if(value.supervisor&&!window.BridgewayAccountEditor.supervisors().includes(value.supervisor))errors.push('Unknown academic supervisor');
      const email=value.email.toLowerCase();
      if(seenIds.has(value.studentId)||model.students.some(s=>s.college==='college-1'&&s.studentId===value.studentId))errors.push('Duplicate student ID');
      if(seenEmails.has(email)||model.students.some(s=>s.email?.toLowerCase()===email))errors.push('Duplicate email');
      const existing=window.BridgewayAccountEditor.validate({...value,type:'student',college:'college-1'},'');if(existing)errors.push(existing);
      seenIds.add(value.studentId);seenEmails.add(email);return {row:index+2,value,errors};
    });
  }
  function open(){
    const C=window.BridgewayCycle;if(C.identity()!=='admin:college-1')return;
    const {E,A,B}=C,body=E('div'),input=C.field('Student file · CSV or Excel (.xlsx), up to 2 MB','','file');input.input.accept='.csv,.xlsx';
    const intro=E('p','Review and validate every row before creating accounts. Imports default to Active. These are local account records; login credentials require the authentication server.','cycle-muted');
    const error=E('p','','journey-import-error');error.setAttribute('role','alert');const preview=E('div',null,'journey-import-preview'),status=E('p','No file selected.');status.setAttribute('role','status');let values=[],busy=false;
    const confirm=B('Import students',async()=>{
      if(busy)return;const checked=validate(values);if(!values.length||checked.some(r=>r.errors.length)){error.textContent='Resolve all validation errors before importing.';return;}
      busy=true;confirm.disabled=true;
      const approved=await window.BridgewayUX?.confirmAction({title:'Import these students?',message:`Create ${values.length} Active student account records for your college in this browser?`,action:'Import students'});
      if(!approved){busy=false;confirm.disabled=false;return;}
      try{const result=window.BridgewayAccountEditor.importStudents(values);C.commit(`${result.length} student account records imported`);d.close();C.say(`${result.length} students imported into this browser.`);}catch(e){error.textContent=e.message;busy=false;confirm.disabled=false;}
    },true);confirm.disabled=true;
    const template=B('Download CSV template',()=>{const url=URL.createObjectURL(new Blob([columns.join(',')+'\r\n'],{type:'text/csv;charset=utf-8'})),a=E('a');a.href=url;a.download='Bridgeway-student-import.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    body.append(intro,E('p',`Required columns: ${columns.filter(c=>c!=='supervisor').join(', ')}. Optional: supervisor. Template headers and readable labels such as Full name and Student ID are accepted. Up to 500 students.`),input.wrap,status,error,preview,A(E('div',null,'journey-import-actions'),template,confirm));const d=C.dialog('Import students',body);
    input.input.addEventListener('change',async()=>{
      values=[];confirm.disabled=true;preview.replaceChildren();error.textContent='';const file=input.input.files[0];if(!file)return;status.textContent='Reading and validating your student file…';
      try{
        if(!/\.(csv|xlsx)$/i.test(file.name)||!file.size||file.size>2*1024*1024)throw new Error('Choose a non-empty CSV or XLSX up to 2 MB.');
        const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:false,sheetRows:502}),sheet=book.Sheets[book.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:false});
        const headers=(rows.shift()||[]).map(normalizeHeader);
        if(new Set(headers).size!==headers.length||columns.filter(c=>c!=='supervisor').some(c=>!headers.includes(c)))throw new Error('Use the template column names without duplicate headers.');
        if(!rows.length||rows.length>500)throw new Error('Choose a file containing 1–500 student rows.');
        values=rows.map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]||''])));
        const checked=validate(values),invalid=checked.filter(r=>r.errors.length).length;
        status.textContent=`${checked.length} ${checked.length===1?'student':'students'} · ${checked.length-invalid} ready · ${invalid} with errors`;
        const table=E('table'),caption=E('caption','Student import validation'),thead=E('thead'),tr=E('tr');['Row','Student','Student ID','Email','Validation'].forEach(v=>{const th=E('th',v);th.scope='col';tr.append(th);});thead.append(tr);const tbody=E('tbody');
        checked.forEach(record=>{const row=E('tr');[record.row,record.value.name,record.value.studentId,record.value.email,record.errors.join('; ')||'Ready'].forEach(v=>row.append(E('td',String(v))));if(record.errors.length)row.className='journey-import-error';tbody.append(row);});table.append(caption,thead,tbody);preview.append(table);confirm.disabled=invalid>0;
      }catch(e){status.textContent='File could not be imported.';error.textContent=e.message;}
    });
  }
  window.BridgewayStudentImport={validate,open,normalizeHeader};
  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('tab-students');if(!root)return;
    const button=window.BridgewayCycle.B('Import students',open);button.id='importStudentsButton';root.prepend(button);
  });
})();
