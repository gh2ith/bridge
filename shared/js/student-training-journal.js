/* Student-facing journal. Reads the shared training model without changing reports. */
(() => {
  'use strict';
  const label={verified:'Verified',submitted:'In review',revision:'Changes requested',draft:'Planned'};
  function view(week,restricted=!!week.locked){
    const locked=!!restricted,planned=week.status==='draft';
    return {title:week.title,hours:week.hours,revision:week.revision,status:locked?'Report hidden':label[week.status]||'Planned',state:locked?'hidden':week.status,locked,planned,
      objectives:week.objectives.map(o=>({text:o.text,done:locked||planned?null:!!o.done})),
      actualHours:locked||planned?null:week.actualHours,notes:locked||planned?'':week.notes||'',review:locked||planned?'':week.review||''};
  }
  function mount(root,C,student){
    const {E,A,B}=C,reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let weeks=C.state.plans[student.id],selected=window.BridgewayTrainingHours.focusWeek(weeks),animation,selectedStatus;
    const requested=Number(new URLSearchParams(location.search).get('trainingWeek'));
    if(Number.isInteger(requested)&&requested>=1&&requested<=(weeks?.length||0))selected=requested-1;
    const icon=name=>{const n=E('i',null,'bi bi-'+name);n.setAttribute('aria-hidden','true');return n;};
    const muted=text=>E('p',text,'journal-muted');
    function record(){
      const history=C.state.histories.find(h=>h.student===student.id),body=E('div');
      if(window.BridgewayKinetic)body.append(window.BridgewayKinetic.credential({student:student.name,company:C.org(student.company),hours:C.hours(student.id),complete:weeks.length===8&&weeks.every(w=>w.status==='verified')&&C.hours(student.id)>=120,start:history?.start||'',end:history?.end||''}));
      if(C.state.evaluations[student.id])body.append(B('View company evaluation',()=>C.dialog('Company evaluation',C.evaluation(student.id))));
      body.append(window.BridgewayJourney.certificateCard(student.id));C.dialog('Your training record',body);
    }
    const shell=E('div',null,'learning-journal');root.replaceChildren(shell);
    function render(){
      weeks=C.state.plans[student.id];shell.replaceChildren();
      if(!weeks?.length){shell.append(A(E('section',null,'journal-empty'),icon('journal-bookmark'),E('h1','Your next chapter starts here.'),muted('Your company’s eight-week plan appears after acceptance and college supervisor assignment. Interview requests stay in Applications.'),B('View applications',()=>window.switchTab('tab-applications'),true),B('Explore roles',()=>window.switchTab('tab-opportunities'))));return;}
      selected=Math.min(selected,weeks.length-1);
      const header=A(E('header',null,'journal-header'),A(E('div'),E('h1','My training'),muted('Your plan, your work, and the feedback that moves you forward.')),B('Training record',record));shell.append(header);
      const placement=E('section',null,'journal-placement');placement.setAttribute('aria-label','Placement and verified progress');
      const company=A(E('div',null,'journal-employer'),A(E('span',null,'journal-company-mark'),icon('building')),A(E('div'),E('h2',student.role||'Internship placement'),muted(C.org(student.company)),E('small',student.supervisor?'Academic supervisor · '+student.supervisor:'College supervisor assignment pending')));
      const hours=C.hours(student.id),verified=weeks.filter(w=>w.status==='verified').length,progress=E('progress');progress.max=120;progress.value=hours;progress.setAttribute('aria-label',hours+' of 120 hours verified');
      const completion=A(E('div',null,'journal-progress'),A(E('div'),E('strong',String(hours)),E('span',' / 120 h'),E('small','Supervisor-verified')),progress,E('p',`${verified} of ${weeks.length} weeks verified`));placement.append(company,completion);shell.append(placement);if(window.BridgewayJourney.certificate(student.id))shell.append(window.BridgewayJourney.certificateCard(student.id));
      const journey=A(E('section',null,'journal-journey'),A(E('header'),E('h2','Your eight-week journey'),E('span','Choose a week to explore'))),nav=E('nav',null,'journal-stations');nav.setAttribute('aria-label','Training weeks');journey.append(nav);shell.append(journey);
      const body=E('div',null,'journal-workspace');shell.append(body);
      const announcement=E('span',null,'journal-announcement');announcement.setAttribute('role','status');announcement.setAttribute('aria-atomic','true');shell.append(announcement);
      const buttons=weeks.map((w,i)=>{
        const restricted=C.reportRestricted(student.id),display=view(w,restricted),button=B('',()=>choose(i,true));button.className='journal-station';button.dataset.state=display.state;button.setAttribute('aria-pressed',String(i===selected));button.setAttribute('aria-controls','journal-week-content');button.setAttribute('aria-label',`Week ${i+1}: ${w.title}. ${display.status}${restricted?'. Reports restricted by supervisor':''}`);
        button.append(A(E('span',null,'journal-station-top'),E('span','Week '+String(i+1).padStart(2,'0')),icon(restricted?'lock':w.status==='verified'?'check2':w.status==='submitted'?'clock':'circle')),E('strong',w.title),E('small',display.status));nav.append(button);return button;
      });
      nav.addEventListener('keydown',event=>{
        const current=buttons.indexOf(document.activeElement);
        if(current<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
        buttons[index].focus();choose(index,true);
      });
      function choose(index,user=false){
        selected=index;
        selectedStatus=weeks[index].status;
        buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
        if(user){const url=new URL(location.href);url.searchParams.set('trainingWeek',String(index+1));history.replaceState(null,'',url);}
        animation?.cancel();body.replaceChildren();
        const w=view(weeks[index],C.reportRestricted(student.id)),article=E('article',null,'journal-week');article.id='journal-week-content';article.dataset.state=w.state;article.setAttribute('aria-label',`Week ${index+1}: ${w.title}`);
        const heading=A(E('header',null,'journal-week-heading'),A(E('div'),E('p','Week '+String(index+1).padStart(2,'0'),'journal-week-number'),E('h2',w.title)),E('span',w.status,'journal-state'));article.append(heading);
        const meta=A(E('div',null,'journal-week-meta'),A(E('span'),icon('clock'),E('span',w.hours+' planned hours')),A(E('span'),icon('list-check'),E('span',w.objectives.length+' objectives')),E('span','Plan revision '+w.revision));article.append(meta);
        const assignedTasks=window.BridgewayWeeklyTasks?.render(student.id,index,'student');
        if(assignedTasks)article.append(assignedTasks);
        const count=w.objectives.filter(o=>o.done).length;
        const taskHeader=A(E('div',null,'journal-task-heading'),E('h3','Training objectives'),E('span',w.locked?'Plan visible':w.planned?'Company-set plan':`${count} of ${w.objectives.length} complete`));article.append(taskHeader);
        if(w.locked)article.append(A(E('div',null,'journal-lock'),icon('lock'),muted('Your supervisor has hidden this report. The plan stays visible; results and review notes are private.')));
        const tasks=E('ol',null,'journal-objectives');
        w.objectives.forEach(o=>{
          const item=E('li',null,'journal-objective'),mark=A(E('span',null,'journal-objective-mark'+(o.done?' is-done':'')),icon(w.locked?'lock':o.done?'check2':'circle'));
          const text=A(E('div',null,'journal-objective-text'),E('h4',o.text));
          const result=E('span',w.locked?'Result hidden':w.planned?'Planned':o.done?'Completed':'Not yet completed','journal-objective-status'+(o.done?' is-complete':''));
          item.append(mark,text,result);tasks.append(item);
        });article.append(tasks);
        const footer=A(E('footer',null,'journal-week-footer'),icon('info-circle'),muted('Your company updates the objectives. Your supervisor reviews the report and verifies hours.'));article.append(footer);
        const aside=E('aside',null,'journal-review');aside.dataset.state=w.state;aside.setAttribute('aria-label','Company weekly feedback');aside.append(A(E('header',null,'journal-review-header'),icon('chat-left-text'),E('h2','Company feedback')));
        if(w.locked)aside.append(A(E('div',null,'journal-review-empty'),icon('shield-lock'),E('h3','Report hidden by your supervisor'),muted('The company’s written feedback and review details are hidden. Your weekly plan and verified training totals remain available.')));
        else if(w.planned)aside.append(A(E('div',null,'journal-review-empty'),icon('journal-text'),E('h3','No report submitted yet'),muted('The company’s feedback about your progress will appear here after it submits this week’s report, unless your supervisor hides it.')));
        else{
          const author=A(E('div',null,'journal-feedback-author'),A(E('span',null,'journal-feedback-mark'),icon('building')),A(E('div'),E('h3',C.org(student.company)),E('p',`Week ${index+1} · Company’s weekly report`,'journal-feedback-source')));
          const feedback=A(E('section',null,'journal-company-feedback'),author,E('p',w.notes||'The company has not added written feedback to this report.','journal-feedback-content'));
          const reviewStatus=weeks[index].status==='verified'?'Reviewed · Hours verified':weeks[index].status==='revision'?'Revision requested':'Awaiting supervisor review';
          const review=A(E('footer',null,'journal-report-verification'),A(E('span'),icon(weeks[index].status==='verified'?'patch-check':weeks[index].status==='revision'?'arrow-counterclockwise':'clock'),E('span',reviewStatus)),A(E('p',null,'journal-reported-hours'),E('strong',String(w.actualHours)),E('span','hours reported')));
          aside.append(feedback,review);
          if(w.review)aside.append(A(E('section',null,'journal-supervisor-note'),E('h3','Supervisor note'),muted(w.review)));
          aside.append(E('p','Your supervisor controls report visibility for all assigned students and all weeks.','journal-visibility-note'));
        }
        body.append(article,aside);
        if(user)announcement.textContent=`Week ${index+1}: ${w.title}. ${w.status}.`;
        if(user&&!reduced.matches)animation=body.animate([{opacity:.55},{opacity:1}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      choose(selected);
    }
    render();document.addEventListener('bridgeway:cycle-change',()=>{
      const drafts=[...shell.querySelectorAll('[data-task-id] form')].filter(form=>window.BridgewayUX?.dirty(form)).map(form=>({id:form.closest('[data-task-id]').dataset.taskId,values:[...form.querySelectorAll('textarea,input:not([type=file])')].map(input=>input.value)}));
      if(!drafts.length&&selectedStatus!=='verified'&&C.state.plans[student.id]?.[selected]?.status==='verified'){
        selected=window.BridgewayTrainingHours.focusWeek(C.state.plans[student.id]);
        const url=new URL(location.href);if(url.searchParams.has('trainingWeek')){url.searchParams.set('trainingWeek',String(selected+1));history.replaceState(null,'',url);}
      }
      render();
      drafts.forEach(draft=>{const row=[...shell.querySelectorAll('[data-task-id]')].find(node=>node.dataset.taskId===draft.id),form=row?.querySelector('form');if(!form)return;window.BridgewayUX?.remember(form);form.dataset.portalRemembered='true';[...form.querySelectorAll('textarea,input:not([type=file])')].forEach((input,index)=>{if(draft.values[index]!=null){input.value=draft.values[index];input.dispatchEvent(new Event('input',{bubbles:true}));}});});
    });
  }
  window.BridgewayTrainingJournal={mount,view};
})();
