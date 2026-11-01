/* Portal-wide UX. Home and Login deliberately do not load this module. */
(() => {
  'use strict';
  const recommendations=(C,role)=>{
    if(!C)return null;
    const state=C.state,viewer=C.identity(),students=window.BridgewayPartners.students;
    const scoped=students.filter(s=>role==='student'?viewer==='student:'+s.id:role==='company'?viewer==='company:'+s.company:role==='admin'?viewer==='admin:'+s.college:role==='supervisor'?s.supervisor==='Dr. Ahmad S.':true);
    const entries=scoped.flatMap(s=>(state.plans[s.id]||[]).flatMap((week,index)=>(week.tasks||[]).filter(t=>!t.removedAt).map(task=>({student:s,week,index,task}))));
    const tasks=window.BridgewayWeeklyTasks;
    const action=(title,copy,button,tab,extra={})=>({title,copy,button,tab,...extra});
    if(role==='student'){
      const revision=entries.find(e=>tasks?.taskStatus(e.task)==='Changes requested'),assigned=entries.find(e=>tasks?.taskStatus(e.task)==='Assigned'),next=revision||assigned;
      if(next&&C.state.histories.find(h=>h.student===next.student.id)?.status==='Active')return action(revision?'Your company requested changes':'Your next task',next.task.title,revision?'Review feedback':'Open task','tab-progress',{week:next.index,task:next.task.id});
      const interview=state.applications.find(a=>viewer==='student:'+a.student&&a.status==='Pending'&&a.interview?.status==='Requested');
      if(interview)return action('Respond to your interview request','Confirm the proposed time or suggest another time.','View interview','tab-applications');
    }
    if(role==='company'){
      const count=state.applications.filter(a=>viewer==='company:'+a.company&&a.status==='Pending').length;
      if(count)return action(`${count} application${count===1?'':'s'} awaiting your decision`,'Review the student’s answers and skills before accepting, rejecting, or arranging an interview.','Review applications','tab-candidates');
      const revisions=scoped.reduce((n,s)=>n+(state.plans[s.id]||[]).filter(w=>w.status==='revision').length,0);
      if(revisions)return action(`${revisions} report${revisions===1?'':'s'} need revision`,'Read the academic supervisor’s notes, update the report, and resubmit.','Open weekly training','tab-weekly-reports');
      const waiting=entries.filter(e=>['Submitted','Resubmitted'].includes(tasks?.taskStatus(e.task))).length;
      if(waiting)return action(`${waiting} task submission${waiting===1?'':'s'} awaiting review`,'Give feedback or request changes to keep training moving.','Review student progress','tab-progress-monitor');
    }
    if(role==='supervisor'){
      const count=scoped.reduce((n,s)=>n+(state.plans[s.id]||[]).filter(w=>w.status==='submitted').length,0);
      if(count)return action(`${count} weekly report${count===1?'':'s'} awaiting review`,'Review company feedback, then verify the hours or request a revision.','Review reports','tab-reports');
      const evaluations=scoped.filter(s=>state.evaluations[s.id]&&!window.BridgewayJourney?.academic(s.id)&&state.histories.find(h=>h.student===s.id)?.status==='Active').length;
      if(evaluations)return action(`${evaluations} final evaluation${evaluations===1?'':'s'} ready for assessment`,'Add your separate academic assessment and forward it to the college administrator.','Open evaluations','tab-endorsement');
    }
    if(role==='admin'){
      const count=state.applications.filter(a=>a.status==='Accepted'&&scoped.some(s=>s.id===a.student)).length;
      if(count)return action(`${count} accepted student${count===1?'':'s'} awaiting placement setup`,'Confirm the academic supervisor and activate training after company acceptance.','Set up placements','tab-approved');
      const ready=scoped.filter(s=>window.BridgewayJourney?.academic(s.id)&&!window.BridgewayJourney?.certificate(s.id)&&state.histories.find(h=>h.student===s.id)?.status==='Active').length;
      if(ready)return action(`${ready} completion review${ready===1?'':'s'} ready to check`,'Review both evaluations and the training checklist before issuing a certificate.','Review completion','tab-completion');
    }
    if(role==='platform_admin'){
      const count=state.listings.filter(l=>l.status==='Pending review').length;
      if(count)return action(`${count} internship listing${count===1?'':'s'} awaiting review`,'Check the role details before making the listing available to students.','Review listings','platform-publications');
    }
    const tickets=state.tickets.filter(t=>C.ticketCanManage(t)&&t.status==='In progress'||t.owner===viewer&&t.status==='Awaiting requester').length;
    if(tickets)return action(`${tickets} support conversation${tickets===1?'':'s'} need a reply`,'Read the requester’s message and reply in the conversation.','Open support',role==='platform_admin'?'platform-issues':'tab-tickets');
    return null;
  };
  window.BridgewayPortalUsability={recommendations};
  document.body.classList.add('portal-usability');
  document.addEventListener('DOMContentLoaded',()=>{
    const main=document.querySelector('main');if(!main)return;
    const C=window.BridgewayCycle,role=document.body.dataset.portalRole;
    const E=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    const headingFor=node=>node.closest('section,.bw-tab-panel')?.querySelector('h2,h1')?.textContent.trim()||main.querySelector('h1')?.textContent.trim()||'Records';
    function enhance(scope){
      const find=selector=>[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
      find('form.cycle-form,form.weekly-task-form,.supervisor-review-footer').forEach(form=>{if(form.dataset.portalRemembered)return;form.dataset.portalRemembered='true';window.BridgewayUX?.remember(form);});
      find('.managed-account-row-actions,.studio-application-actions').forEach(actions=>{
        const secondary=[...actions.querySelectorAll(':scope > button')].filter(b=>/^(?:Delete|Withdraw application)$/i.test(b.textContent.trim()));
        if(!secondary.length)return;
        const name=actions.closest('tr,article')?.querySelector('strong,h2')?.textContent.trim()||'this record',menu=E('details',null,'portal-more-menu'),summary=E('summary','More');summary.setAttribute('aria-label',`More actions for ${name}`);
        const content=E('div',null,'portal-more-content');content.append(...secondary);menu.append(summary,content);actions.append(menu);
      });
      find('textarea[maxlength]').forEach(input=>{
        if(input.dataset.portalCount||input.id==='postingQuestions'||input.closest('.support-reply-form')?.querySelector('.support-reply-count'))return;input.dataset.portalCount='true';
        const count=E('small',null,'portal-character-count');count.id='field-count-'+crypto.randomUUID();
        const label=input.labels?.[0],labelText=label?.querySelector(':scope > span');
        if(label?.contains(input)&&labelText&&!input.hasAttribute('aria-labelledby')){labelText.id||='field-label-'+crypto.randomUUID();input.setAttribute('aria-labelledby',labelText.id);}
        input.insertAdjacentElement('afterend',count);input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),count.id].filter(Boolean).join(' '));
        const update=()=>{count.textContent=`${input.value.length.toLocaleString()} / ${input.maxLength.toLocaleString()} characters`;};input.addEventListener('input',update);update();
      });
      find('table.bw-data-table').forEach(table=>{
        if(table.dataset.portalTable)return;table.dataset.portalTable='true';
        if(!table.querySelector('caption')){const caption=E('caption',headingFor(table),'portal-sr-only');table.prepend(caption);}
        if(table.closest('.bw-tab-panel')?.querySelector('.portal-directory-search,[data-result-count]'))return;
        const state=E('div',null,'portal-table-status');state.setAttribute('role','status');state.setAttribute('aria-live','polite');table.insertAdjacentElement('afterend',state);
        const directory=role==='admin'&&table.closest('#tab-students,#tab-supervisors,#tab-users');let directorySearch=null;
        if(directory&&!directory.querySelector('input[type=search]')){
          const label=E('label',null,'portal-directory-toolbar'),input=E('input'),name=directory.id==='tab-students'?'students':directory.id==='tab-supervisors'?'supervisors':'college users';
          input.type='search';input.placeholder=directory.id==='tab-students'?'Name, email, or student ID':'Name, email, or role';input.className='bw-input';label.append(E('span','Search '+name),input);table.parentElement.insertAdjacentElement('beforebegin',label);directorySearch=input;
          input.addEventListener('input',()=>{previous='';render();});
        }
        let previous='';
        const render=()=>{
          const rows=[...table.querySelectorAll('tbody > tr')].filter(row=>row.cells.length>1&&!row.classList.contains('listing-expanded-row'));
          if(directorySearch){const query=directorySearch.value.trim().toLowerCase();rows.forEach(row=>{const copy=row.cloneNode(true);copy.querySelectorAll('select,button,details').forEach(n=>n.remove());const record=window.BridgewayPartners.students.find(s=>s.id===row.dataset.accountId||s.name===row.dataset.studentName),text=`${copy.textContent} ${record?.studentId||''} ${record?.email||''}`.toLowerCase(),hide=!!query&&!text.includes(query);if(row.hidden!==hide)row.hidden=hide;});}
          const visible=rows.filter(row=>!row.hidden&&getComputedStyle(row).display!=='none').length,key=visible+'/'+rows.length;
          if(previous===key)return;previous=key;state.replaceChildren();
          if(rows.length){state.append(E('span',`${visible} of ${rows.length} records`));if(!visible){state.append(E('strong','No matching records'),E('p','Try a different search or clear your filters.'));const reset=E('button','Clear filters','cycle-button');reset.type='button';reset.addEventListener('click',()=>{
            const panel=table.closest('.bw-tab-panel')||table.closest('section');if(!panel)return;
            panel.querySelectorAll('input[type="search"],input[id*="Search"],input[id*="search"]').forEach(input=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));});
            panel.querySelectorAll('.cycle-toolbar select,.bw-data-toolbar select').forEach(select=>{const all=[...select.options].find(o=>/^All(?:\s|$)/i.test(o.textContent));if(all){select.value=all.value;select.dispatchEvent(new Event('change',{bubbles:true}));}});
          });state.append(reset);}}else if(directory){state.append(E('strong','No records yet'),E('p','Add an account to start building this directory.'));}
        };
        const tbody=table.querySelector('tbody');if(tbody)new MutationObserver(render).observe(tbody,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden']});render();
      });
      find('details.portal-more-menu').forEach(menu=>{if(menu.dataset.portalKeys)return;menu.dataset.portalKeys='true';menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();menu.open=false;menu.querySelector('summary').focus();}});});
    }
    let queued=false;const observer=new MutationObserver(records=>{if(queued)return;const nodes=records.flatMap(r=>[...r.addedNodes]).filter(n=>n.nodeType===1);if(!nodes.length)return;queued=true;queueMicrotask(()=>{queued=false;nodes.filter(n=>n.isConnected).forEach(enhance);});});
    enhance(document);observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>{document.querySelectorAll('.portal-more-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
    const approvedSwitches=new WeakSet();
    document.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(approvedSwitches.has(button)){approvedSwitches.delete(button);return;}
      const week=button.closest('.cycle-weeks,.journal-stations'),student=button.closest('#weeklyStudentList,#supervisorReportStudents'),editPlan=/^(Edit weekly plan|Cancel editing)$/.test(button.textContent.trim());
      if(!week&&!student&&!editPlan)return;
      const scope=student?document.getElementById(student.id==='weeklyStudentList'?'companyWeeklyDetail':'supervisorReportDetail'):button.closest('.cycle-training,.learning-journal');
      const dirty=[...scope?.querySelectorAll('form,.supervisor-review-footer')||[]].filter(form=>window.BridgewayUX?.dirty(form));if(!dirty.length)return;
      event.preventDefault();event.stopImmediatePropagation();
      window.BridgewayUX.confirmDiscard('Changing this view will discard the work you have not submitted. Your saved training records stay unchanged.').then(ok=>{if(!ok||!button.isConnected)return;dirty.forEach(window.BridgewayUX.remember);approvedSwitches.add(button);button.click();});
    },true);
    document.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.closest('.journal-stations'))return;
      const scope=event.target.closest('.learning-journal'),dirty=[...scope.querySelectorAll('form')].filter(form=>window.BridgewayUX?.dirty(form));if(!dirty.length)return;
      event.preventDefault();event.stopImmediatePropagation();const target=event.target,key=event.key;
      window.BridgewayUX.confirmDiscard('Changing weeks will discard the task work you have not submitted.').then(ok=>{if(!ok||!target.isConnected)return;dirty.forEach(window.BridgewayUX.remember);target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));});
    },true);
    // Error summaries name the fields, preserve values, and offer a focus path back.
    const pending=new Set();
    const labelFor=input=>input.labels?.[0]?.querySelector('span')?.textContent.trim()||input.labels?.[0]?.textContent.trim().split('\n')[0]||input.getAttribute('aria-label')||input.name||'This field';
    function validation(form,focus){
      const invalid=[...form.querySelectorAll('input,textarea,select')].filter(input=>!input.disabled&&input.getClientRects().length&&!input.validity.valid);
      let summary=form.querySelector('.portal-form-summary');if(!invalid.length){summary?.remove();return;}
      if(!summary){summary=E('section',null,'portal-form-summary');summary.tabIndex=-1;summary.setAttribute('role','alert');form.prepend(summary);}
      summary.replaceChildren(E('strong',`Check ${invalid.length===1?'this field':`these ${invalid.length} fields`}`));const list=E('ul');
      invalid.forEach(input=>{if(!input.id)input.id='portal-field-'+crypto.randomUUID();const link=E('a',labelFor(input).replace(/\s*\*\s*$/,''));link.href='#'+input.id;link.addEventListener('click',event=>{event.preventDefault();input.focus();input.scrollIntoView({block:'center',behavior:'instant'});});const item=E('li');item.append(link,E('span',' — '+input.validationMessage));list.append(item);});summary.append(list);if(focus)summary.focus();
    }
    document.addEventListener('invalid',event=>{const form=event.target.form;if(!form||pending.has(form))return;pending.add(form);requestAnimationFrame(()=>{pending.delete(form);if(form.isConnected)validation(form,true);});},true);
    document.addEventListener('input',event=>{const form=event.target.form;if(form?.querySelector('.portal-form-summary'))validation(form,false);});
    // Keep dynamically added workspace views in the same navigation/history model.
    window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(document.getElementById(id)?.classList.contains('bw-tab-panel'))window.switchTab(id);});
  });
})();
