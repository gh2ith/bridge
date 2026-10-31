/* Interviews belong to applications, never to a student's training plan.
   Uses the existing local workspace; no invitation is transmitted. */
(() => {
  'use strict';
  const C=window.BridgewayCycle;if(!C)return;
  const {E,A,B,field,select}=C;
  const eligible=a=>!!a&&a.status==='Pending';
  const active=m=>m&&!['Cancelled','Declined','Completed'].includes(m.status);
  const format=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Amman'}).format(new Date(value+'+03:00'));
  function respond(a,status,note=''){
    if(C.identity()!==`student:${a?.student}`||!eligible(a)||!active(a.interview))return 'This interview is not available for a response.';
    if(Date.parse(a.interview.date+'+03:00')+a.interview.duration*60000<Date.now())return 'This interview time has passed. Contact the company for a new time.';
    if(!['Confirmed','Reschedule requested'].includes(status))return 'Choose a valid interview response.';
    if(status==='Reschedule requested'&&!note.trim())return 'Suggest another time for the company.';
    a.interview.status=status;a.interview.response=note.trim();C.commit('Student responded to an interview request');return '';
  }
  function schedule(a,details){
    if(!eligible(a)||C.identity()!==`company:${a.company}`)return 'Only the host company can request an interview for a pending application.';
    if(!details.date||!Number.isFinite(Date.parse(details.date+'+03:00'))||Date.parse(details.date+'+03:00')<=Date.now())return 'Choose a future date and time in Amman time.';
    if(![15,30,45,60].includes(Number(details.duration)))return 'Choose an interview duration.';
    if(!['Online','Phone','On site'].includes(details.mode))return 'Choose an interview format.';
    if(details.mode!=='Online'&&!details.location.trim())return 'Add the meeting address or phone instructions.';
    a.interview={id:a.interview?.id||crypto.randomUUID(),status:'Requested',date:details.date,duration:Number(details.duration),mode:details.mode,location:details.location.trim(),notes:details.notes.trim(),url:details.mode==='Online'?(window.BridgewayMeetings.validUrl(a.interview?.url)||`https://meet.jit.si/Bridgeway-${crypto.randomUUID()}`):'',requestedAt:new Date().toISOString()};
    C.commit('Company requested an application interview');return '';
  }
  function request(a,refresh=()=>{}){
    if(!eligible(a)){C.say('Interviews can be requested for pending applications only.');return;}
    const form=E('form',null,'cycle-form interview-form'),date=field('Date and time · Amman *',a.interview?.date||'','datetime-local'),duration=select('Duration',[[15,'15 minutes'],[30,'30 minutes'],[45,'45 minutes'],[60,'1 hour']],String(a.interview?.duration||30)),mode=select('Format',['Online','Phone','On site'],a.interview?.mode||'Online'),location=field('Address or phone instructions',a.interview?.location||''),notes=field('What should the student prepare?',a.interview?.notes||'','textarea'),error=E('p','','cycle-form-error');error.setAttribute('role','alert');date.input.required=true;notes.input.maxLength=1000;location.input.maxLength=300;
    const sync=()=>{location.wrap.hidden=mode.input.value==='Online';location.input.required=!location.wrap.hidden;};mode.input.addEventListener('change',sync);sync();
    form.append(E('p',`${C.student(a.student).name} · ${C.state.listings.find(l=>l.id===a.listing)?.title||'Internship'}`,'cycle-muted'),E('p','An interview is a conversation, not an acceptance. The application remains pending.','cycle-callout'),date.wrap,A(E('div',null,'interview-form-pair'),duration.wrap,mode.wrap),location.wrap,notes.wrap,error);
    const submit=E('button',a.interview?'Update interview request':'Request interview','cycle-button is-primary');submit.type='submit';form.append(submit);const d=C.dialog('Arrange a quick interview',form);
    form.addEventListener('submit',event=>{event.preventDefault();error.textContent=schedule(a,{date:date.input.value,duration:duration.input.value,mode:mode.input.value,location:location.input.value,notes:notes.input.value});if(error.textContent){date.input.focus();return;}d.close();refresh();renderDesk();C.say('Interview request added to this workspace.');});
  }
  function card(a,company=false){
    const m=a.interview;if(!m)return null;
    const root=E('section',null,'application-interview');root.setAttribute('aria-label',`Interview for ${C.state.listings.find(l=>l.id===a.listing)?.title||'internship'}`);
    const identity=company?A(E('div'),E('h3',C.student(a.student).name),E('p',C.state.listings.find(l=>l.id===a.listing)?.title||'Internship','company-interview-role')):A(E('div'),E('small',C.org(a.company)),E('h3','A conversation about your next role'));
    root.append(A(E('header'),identity,C.status(m.status)),E('p',`${format(m.date)} · Amman time · ${m.duration} minutes`,'interview-date'),E('p',m.mode==='Online'?'Online interview · Jitsi':`${m.mode} · ${m.location}`,'cycle-muted'));
    if(m.notes)root.append(E('p',m.notes,'interview-preparation'));
    if(m.response)root.append(E('p',m.response,'cycle-callout'));
    const actions=E('div',null,'cycle-actions');root.append(actions);
    const pending=eligible(a),expired=Date.parse(m.date+'+03:00')+m.duration*60000<Date.now();
    if(!company&&pending&&active(m)&&!expired){
      if(m.status==='Requested')actions.append(B('Confirm time',()=>{const error=respond(a,'Confirmed');if(error){C.say(error);return;}root.replaceWith(card(a));},true));
      actions.append(B('Request another time',()=>{const form=E('form',null,'cycle-form'),note=field('Suggest another time *','','textarea');note.input.required=true;note.input.maxLength=500;const submit=E('button','Send time request','cycle-button is-primary');submit.type='submit';form.append(note.wrap,submit);const d=C.dialog('Request another interview time',form);form.addEventListener('submit',event=>{event.preventDefault();const error=respond(a,'Reschedule requested',note.input.value);if(error){C.say(error);return;}d.close();root.replaceWith(card(a));});}));
    }
    if(company&&pending&&active(m))actions.append(B('Change time',()=>request(a,()=>root.replaceWith(card(a,true)))),B('Cancel interview',()=>{const d=C.dialog('Cancel this interview?',A(E('div'),E('p','The application stays pending. You can arrange another interview later.'),B('Keep interview',()=>d.close()),B('Cancel interview',()=>{m.status='Cancelled';C.commit('Company cancelled an interview');d.close();root.replaceWith(card(a,true));renderDesk();})) );}));
    if(pending&&active(m)&&!expired&&m.status==='Confirmed'&&m.url){const link=E('a','Join interview','cycle-button is-primary');link.href=m.url;link.target='_blank';link.rel='noopener noreferrer';link.dataset.jitsiMeeting='';actions.append(link);}
    if(expired&&active(m))root.append(E('p','This interview time has passed. Contact the company if another time is needed.','cycle-muted'));
    if(!pending)root.append(E('p','The application decision has been recorded. This interview is retained in its history.','cycle-muted'));
    return root;
  }
  function renderDesk(){
    if(document.body.dataset.portalRole!=='company')return;
    const panel=document.getElementById('tab-meetings');if(!panel)return;
    panel.replaceChildren();const head=C.section('Interview schedule','Arrange a short conversation before deciding on an application.');head.classList.add('company-interview-schedule');panel.append(head);
    const apps=C.state.applications.filter(a=>a.company==='company-1'&&a.interview).sort((a,b)=>a.interview.date.localeCompare(b.interview.date));
    const count=document.getElementById('companyMeetingCount');if(count)count.textContent=String(apps.filter(a=>eligible(a)&&active(a.interview)).length);
    if(!apps.length)head.append(A(E('div',null,'cycle-interview-empty'),E('h3','No interviews scheduled'),E('p','Choose a pending applicant to arrange your first interview.','cycle-muted'),B('View applicants',()=>window.switchTab('tab-candidates'),true)));
    apps.forEach(a=>head.append(card(a,true)));
  }
  C.interviews={eligible,schedule,respond,request,card};
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body.dataset.portalRole!=='company')return;
    renderDesk();document.addEventListener('bridgeway:cycle-change',renderDesk);
    // Retire the old student-wide meeting modal entry points.
    document.querySelectorAll('[data-open-modal="hrMeetingsModal"]').forEach(old=>{const id=old.closest('[data-student-id]')?.dataset.studentId,next=old.cloneNode(true);next.removeAttribute('data-open-modal');next.textContent='Interview';next.addEventListener('click',()=>{const a=C.state.applications.find(a=>a.student===id&&a.company==='company-1'&&eligible(a));a?request(a):C.say('Open a pending application to arrange an interview.');});old.replaceWith(next);});
  });
})();
