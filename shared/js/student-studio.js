/* Student studio: tactile discovery, a live dossier, and shared preview workflows. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    const C=window.BridgewayCycle;if(!C)return;
    const {E,A,B,field,select,status}=C;
    const s=window.BridgewayStudent.current();
    const main=document.querySelector('.bw-main-content'),oldNav=document.querySelector('.bw-masar-nav');
    const tabs=window.BridgewayStudentChrome(main,location.hash.slice(1)||'tab-opportunities',id=>{history.pushState(null,'',`#${id}`);window.switchTab(id);if(id==='tab-opportunities')render();window.scrollTo({top:0,left:0,behavior:'instant'});});
    document.body.classList.add('student-gallery');
    const root=document.getElementById('tab-opportunities');root.replaceChildren();

    const welcome=A(E('header',null,'studio-welcome'),A(E('div'),E('p',`${s.name.split(' ')[0]}’s opportunity collection`,'studio-kicker'),E('h1','Find work worth learning.'),E('p','A closer look at the teams, the work, and your next eight weeks.')));
    const placed=['Placed','Completed','Left'].includes(s.stage);
    const context=B(placed?'Continue my training':'Complete my profile',()=>{if(placed)window.switchTab('tab-progress');else window.BridgewayOpenStudentProfile();});
    welcome.append(context);root.append(welcome);
    const scene=E('section');root.append(scene);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function roleFit(l,compact=false){
      const cv=window.BridgewayCV.read(),panel=E(compact?'div':'section',null,compact?'studio-fit-compact':'studio-role-fit');
      const link=E('a',cv?'Manage CV':'Select a CV');link.href='#tab-profile-cv';link.addEventListener('click',event=>{event.preventDefault();window.BridgewayOpenStudentProfile(true);});
      if(compact){panel.append(link);return panel;}
      panel.className='studio-ai-match';panel.setAttribute('aria-label','Bridgeway AI role matching, planned feature');
      const mark=E('span',null,'studio-ai-mark'),spark=E('i',null,'bi bi-stars');spark.setAttribute('aria-hidden','true');mark.append(spark);
      panel.append(A(E('header',null,'studio-ai-heading'),mark,A(E('div'),E('span','Bridgeway AI','studio-ai-brand'),E('h3','Find your fit.')),E('span','Planned','studio-ai-availability')));
      panel.append(E('p','AI will compare your CV with this role’s requirements to help you find a closer match.','studio-ai-description'));
      const context=E('div',null,'studio-ai-context');context.append(E('span',cv?cv.name:'Start with your experience.','studio-ai-file'),E('small',cv?'CV selected in this browser':'Add a CV to your profile'));
      link.textContent=cv?'Manage CV':'Add your CV';link.className='studio-ai-action';const arrow=E('i',null,'bi bi-arrow-up-right');arrow.setAttribute('aria-hidden','true');link.append(arrow);
      panel.append(A(E('div',null,'studio-ai-footer'),context,link),E('small','AI matching is not connected yet. CV selection keeps only the filename and size.','studio-ai-note'));
      return panel;
    }
    function application(l){return C.state.applications.find(a=>a.student===s.id&&a.listing===l.id&&a.status!=='Withdrawn');}
    function applyAction(l){const record=application(l),blocked=['Placed','Awaiting placement','Accepted'].includes(s.stage);const button=B(record?`Application ${record.status.toLowerCase()}`:blocked?(s.stage==='Placed'?'Already placed':'Placement in setup'):'Apply for this role',()=>apply(l),true);button.disabled=!!record||blocked;return button;}
    function apply(l){if(['Placed','Awaiting placement','Accepted'].includes(s.stage)){C.say('You already have an accepted internship. Track your placement setup in My training.');return;}if(C.state.applications.some(a=>a.student===s.id&&a.listing===l.id&&a.status!=='Withdrawn')){C.say('You already have an application for this opportunity.');return;}
      const content=E('form',null,'cycle-form');content.append(E('p',`${l.title} at ${C.org(l.company)}`),E('p','The host company makes the hiring decision. This action creates a pending application.','cycle-muted'));
      const answers=(l.questions||[]).map(question=>{const answer=field(question,'','textarea');answer.input.required=true;answer.input.maxLength=3000;content.append(answer.wrap);return {question,input:answer.input};});content.append(E('p','You may apply to several internships. If a company accepts you, your other pending applications close automatically.','cycle-muted'));
      content.append(window.BridgewayJourney.skillsPanel(s.id,l));
      const cv=field('CV · PDF or DOCX, up to 5 MB','','file');cv.input.accept='.pdf,.docx';const cvState=E('p',window.BridgewayCV.read()?.name||'No CV selected.','cycle-muted');cvState.setAttribute('role','status');content.append(cv.wrap,cvState);cv.input.addEventListener('change',()=>{const f=cv.input.files[0];cvState.textContent=f?`${f.name} · ${Math.ceil(f.size/1024)} KB · Metadata only`:'No CV selected.';});const confirm=E('button','Confirm application','cycle-button is-primary');confirm.type='submit';content.append(confirm);const d=C.dialog('Apply to the host company',content);content.addEventListener('submit',ev=>{ev.preventDefault();if(answers.some(a=>!a.input.value.trim())){const empty=answers.find(a=>!a.input.value.trim());empty.input.setCustomValidity('Answer this question before applying.');empty.input.reportValidity();empty.input.addEventListener('input',()=>empty.input.setCustomValidity(''),{once:true});return;}const f=cv.input.files[0];if(f&&(!/\.(pdf|docx)$/i.test(f.name)||!f.size||f.size>5*1024*1024)){cvState.textContent='Choose a non-empty PDF or DOCX up to 5 MB.';return;}if(!f&&!window.BridgewayCV.read()){cvState.textContent='Select a CV before applying.';cv.input.focus();return;}if(f)window.BridgewayCV.set(f);C.state.applications.push({id:crypto.randomUUID(),student:s.id,listing:l.id,company:l.company,profile:{...window.BridgewayLocal.profile('student:'+s.id)},skills:[...window.BridgewayJourney.skills(s.id)],answers:answers.map(({question,input})=>({question,answer:input.value.trim()})),status:'Pending',at:new Date().toISOString()});C.commit(`${s.name} applied to ${l.title}`);d.close();document.querySelectorAll('.cycle-dialog[open]').forEach(open=>open.close());renderApplications();render();flyApplication().then(()=>{window.switchTab('tab-applications');C.say('Pending application added to this workspace.');});});}

    const discovery=window.BridgewayOpportunityDeck(scene,{C,roleFit,applyAction,placed});
    const applicationCount=tabs.querySelector('.deck-application-count');
    function updateApplicationCount(){applicationCount.textContent=String(document.getElementById('studentApplicationsTable')?.rows.length||0);try{localStorage.setItem(`bridgeway:student-application-count:${s.id}`,applicationCount.textContent);}catch{}}
    function flyApplication(){updateApplicationCount();return Promise.resolve();}
    function render(){discovery.render(C.published());}
    window.BridgewayTrainingJournal.mount(document.getElementById('tab-progress'),C,s);
    document.querySelectorAll('.bw-tab-panel').forEach(panel=>new MutationObserver(()=>tabs.querySelectorAll('[data-studio-tab]').forEach(b=>b.setAttribute('aria-current',document.getElementById(b.dataset.studioTab)?.classList.contains('is-active')?'page':'false'))).observe(panel,{attributes:true,attributeFilter:['class']}));
    render();
    // Rebuild every student's records from shared state, never the legacy example rows.
    document.getElementById('studentApplicationsTable').replaceChildren();
    const applications=document.getElementById('tab-applications');[...applications.children].forEach(n=>n.hidden=true);const applicationStudio=E('section',null,'studio-applications');applicationStudio.append(E('h1','Your applications'),E('p','Your application attempts and the dates you applied.','cycle-muted'));const records=E('div',null,'studio-application-list');applicationStudio.append(records);applications.append(applicationStudio);
    function applicationCards(){
      updateApplicationCount();records.replaceChildren();
      const rows=[...document.getElementById('studentApplicationsTable').rows];
      rows.forEach(row=>{
        const cells=row.cells;if(cells.length<6)return;
        const state=cells[4].textContent.trim(),item=E('article',null,'studio-application');
        const mark=E('span','',`studio-application-mark ${/accepted|placed|completed/i.test(state)?'is-good':''}`);
        const info=A(E('div'),E('h2',cells[1].textContent.trim()),E('p',cells[0].firstElementChild?.textContent.trim()||cells[0].textContent.trim()),E('small',row.dataset.recordContext));
        const action=E('div',null,'studio-application-actions');action.append(status(state));
        const original=cells[5].querySelector('button');
        if(original){const withdraw=B('Withdraw application',()=>original.click());withdraw.dataset.confirmation='custom';action.append(withdraw);}
        item.append(mark,info,action);
        const application=C.state.applications.find(a=>a.id===row.dataset.cycleApplication);
        if(application?.closedReason)item.append(E('p',application.closedReason,'cycle-muted'));if(application?.answers?.length)item.append(B('View application answers',()=>{const body=E('div');application.answers.forEach(a=>body.append(E('h3',a.question),E('p',a.answer)));C.dialog('Your application answers',body);}));
        if(application?.interview){const interview=C.interviews?.card(application);if(interview)item.append(interview);}
        records.append(item);
      });
      if(!rows.length)records.append(A(E('div',null,'studio-empty'),E('h2','Your first opportunity is waiting.'),E('p','Explore internships and apply to a role that fits your interests.'),B('Explore internships',()=>window.switchTab('tab-opportunities'),true)));
    }
    function renderApplications(){
      const table=document.getElementById('studentApplicationsTable');
      table.replaceChildren();
      const applications=C.state.applications.filter(record=>record.student===s.id).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
      applications.forEach(record=>{
        const listing=C.state.listings.find(item=>item.id===record.listing);
        const row=E('tr');row.dataset.cycleApplication=record.id;
        const applied=record.at&&Number.isFinite(Date.parse(record.at))?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date(record.at)):null;
        row.dataset.recordContext=applied?'Applied '+applied:'Application date not recorded';
        row.append(A(E('td'),E('div',C.org(record.company))),E('td',listing?.title||record.title||'Internship listing unavailable'),E('td',listing?.location||''),E('td',listing?.deadline||'Not specified'),A(E('td'),status(record.status==='Placed'?'Accepted':record.status)));
        const actions=E('td');
        if(record.status==='Pending'){const withdraw=B('Withdraw application',()=>{
          const content=E('div');content.append(E('p',`${listing?.title||record.title||'Internship'} at ${C.org(record.company)}`),E('p','Withdraw this pending application? You can apply again while the role is open.'));
          const confirmation=C.dialog('Withdraw application?',content);
          const confirm=B('Withdraw application',()=>{record.status='Withdrawn';C.commit('Application withdrawn');confirmation.close();render();});confirm.dataset.confirmation='custom';
          content.append(A(E('div',null,'cycle-actions'),B('Keep application',()=>confirmation.close()),confirm));
        });withdraw.dataset.confirmation='custom';actions.append(withdraw);}
        row.append(actions);table.append(row);
      });
      applicationCards();
    }
    renderApplications();document.addEventListener('bridgeway:cycle-change',renderApplications);new MutationObserver(applicationCards).observe(document.getElementById('studentApplicationsTable'),{childList:true,subtree:true});
    tabs.querySelectorAll('[data-studio-tab]').forEach(b=>b.setAttribute('aria-current',document.getElementById(b.dataset.studioTab)?.classList.contains('is-active')?'page':'false'));
    if(!location.hash&&C.state.plans[s.id]&&placed)window.switchTab('tab-progress');
    // The former sidebar remains in the DOM for existing navigation and profile handlers.
    oldNav.setAttribute('aria-hidden','true');
  });
})();
