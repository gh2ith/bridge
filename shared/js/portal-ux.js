/* Usability only: in-memory edit protection, inline validation, and reading helpers. */
(() => {
  // A tab hash selects a workspace, not a document anchor below its navigation.
  const resetTabEntry=()=>{
    const panel=document.getElementById(location.hash.slice(1));
    if(panel?.classList.contains('bw-tab-panel'))window.scrollTo({top:0,left:0,behavior:'instant'});
  };
  window.addEventListener('pageshow',()=>requestAnimationFrame(resetTabEntry));
  window.addEventListener('load',()=>requestAnimationFrame(resetTabEntry),{once:true});
  const states = new Map();
  let confirmation = null;
  // Semantic intent is shared by the initiating control and its confirmation.
  // Routine save, submit, navigation and selection actions retain the brand color.
  function actionTone(label='') {
    const text=label.replace(/[?!.]+$/, '').trim();
    if (/^(?:delete|remove|reject|withdraw|terminate|unassign|deactivate|discard)\b/i.test(text)) return 'danger';
    if (/^(?:pause|restrict|request (?:a |another )?(?:revision|changes)|cancel (?:this |the )?interview)\b/i.test(text)) return 'warning';
    if (/^(?:approve|verify|accept|resume|activate|resolve|restore|complete|issue certificate|confirm completion|confirm resolution|mark (?:as )?completed|mark .+ completed|make (?:all )?reports visible|show (?:all )?student reports)\b/i.test(text)) return 'success';
    return 'info';
  }
  function statusTone(label='') {
    const text=label.trim();
    if (/^(?:rejected|company rejected|declined|failed|error|overdue|blocked)(?:\b|$)/i.test(text)) return 'danger';
    if (/^(?:pending|application pending|awaiting|in review|submitted|resubmitted|revision|paused|restricted|report hidden|result hidden|\d+ to review)/i.test(text)) return 'warning';
    if (/^(?:verified|all weeks verified|completed|resolved|accepted|company accepted|placed|active|published|approved|visible to students)/i.test(text)) return 'success';
    if (/^(?:in progress|training in progress|in training)\b/i.test(text)) return 'info';
    return 'neutral';
  }
  function syncSemanticColors() {
    if (/\/pages\/(home|login)\//.test(location.pathname)) return;
    document.querySelectorAll('button:not(.bw-masar-item):not([role="tab"]):not([data-tab])').forEach(button=>{
      // Cancel/close, navigation, filters and selection never inherit a result color.
      const tone=actionTone(button.textContent.replace(/[\uE000-\uF8FF\u2713\u2714\u26a1]/g,'').trim()||button.getAttribute('aria-label')||button.title);
      if(tone==='info') { if(button.hasAttribute('data-action-tone'))button.removeAttribute('data-action-tone'); }
      else if(button.dataset.actionTone!==tone)button.dataset.actionTone=tone;
    });
    document.querySelectorAll('.bw-badge,.cycle-status,.platform-status').forEach(badge=>{
      const tone=statusTone(badge.textContent);
      if(badge.dataset.statusTone!==tone)badge.dataset.statusTone=tone;
    });
  }
  // Shared presentation only: keep each confirmation's original controls and handlers.
  function decorateConfirmation(dialog,title='') {
    if(dialog.classList.contains('bw-decision-dialog'))return;
    const text=title||dialog.querySelector('h2,.bw-modal-title')?.textContent||'';
    const tone=actionTone(text),danger=tone==='danger',warning=tone==='warning',success=tone==='success';
    dialog.classList.add('bw-decision-dialog');
    dialog.dataset.decisionTone=tone;
    const mark=document.createElement('div');mark.className='bw-decision-mark';mark.setAttribute('aria-hidden','true');
    const icon=document.createElement('i');icon.className='bi bi-'+(danger?(/discard|unfinished/i.test(text)?'exclamation-triangle':'trash3'):warning?'exclamation-triangle':success?'check2-circle':'arrow-up-right-circle');mark.append(icon);dialog.prepend(mark);
    const heading=dialog.querySelector('h2,.bw-modal-title');
    if(heading&&!dialog.hasAttribute('aria-labelledby')){heading.id=heading.id||'decision-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',heading.id);}
    const description=dialog.querySelector('p');
    if(description&&!dialog.hasAttribute('aria-describedby')){description.id=description.id||'decision-copy-'+crypto.randomUUID();dialog.setAttribute('aria-describedby',description.id);}
    // Some older prompts put their actions directly after the paragraph.
    for(const body of dialog.querySelectorAll(':scope > div:not(.bw-decision-mark)')){
      const buttons=[...body.children].filter(node=>node.tagName==='BUTTON');
      if(buttons.length>1&&!body.classList.contains('cycle-actions')&&!body.classList.contains('bw-ux-confirm-actions')&&!body.classList.contains('partner-controls')&&!body.classList.contains('bw-delete-actions')&&!body.classList.contains('bw-modal-footer')){
        const actions=document.createElement('div');actions.className='cycle-actions';actions.append(...buttons);body.append(actions);
      }
    }
  }
  function decorateDialog(dialog) {
    if(dialog.classList.contains('bw-dialog-surface')||dialog.classList.contains('bw-decision-dialog'))return;
    const heading=dialog.querySelector('h2,.bw-modal-title');if(!heading)return;
    const text=heading.textContent.trim();
    const decision=/^(?:discard|resolve|withdraw|cancel|delete|pause|resume|reject|accept|approve|verify|terminate|unassign|deactivate|restrict|confirm)\b/i.test(text);
    if(decision&&!dialog.querySelector('input:not([type="hidden"]),textarea,select')){decorateConfirmation(dialog,text);return;}
    dialog.classList.add('bw-dialog-surface');
    const header=dialog.querySelector('header,.bw-modal-header,.platform-dialog-heading');
    if(!header)return;
    header.classList.add('bw-dialog-heading');
    // Existing icon nodes are retained; they keep any attached handlers and labels.
    const existing=header.querySelector('i.bi');
    if(existing){existing.classList.add('bw-dialog-heading-icon');existing.setAttribute('aria-hidden','true');return;}
    const glyph=/account|profile|supervisor/i.test(text)?'person-badge':/export/i.test(text)?'download':/report|record/i.test(text)?'journal-text':/evaluation|assessment/i.test(text)?'clipboard-check':/plan/i.test(text)?'list-check':/ticket|issue|feedback/i.test(text)?'chat-left-text':/partner/i.test(text)?'link-45deg':/internship|application|interview/i.test(text)?'briefcase':'info-circle';
    const icon=document.createElement('i');icon.className='bi bi-'+glyph+' bw-dialog-heading-icon';icon.setAttribute('aria-hidden','true');header.prepend(icon);
  }
  function capture(root) {
    const values = new Map();
    root.querySelectorAll('input,textarea,select').forEach(field => {
      if (field.disabled || field.readOnly || ['hidden','search','submit','button','reset'].includes(field.type)) return;
      const value = field.type === 'password' || field.dataset?.credential==='true' ? field.value.length : field.type === 'file'
        ? JSON.stringify([...field.files].map(file => ({name:file.name,size:file.size})))
        : ['checkbox','radio'].includes(field.type) ? field.checked : field.value;
      values.set(field,value);
    });
    return {values,ratings:[...root.querySelectorAll('.bw-rubric-rating-row')].map(row => row.querySelector('.is-active')?.dataset.val || '').join(',')};
  }
  function dirty(root,ignore) {
    if(root?.dataset?.cycleManaged==='true'||root?.dataset?.committed==='true')return false;
    const state = states.get(root);if (!state) return false;
    const now = capture(root),before = state.baseline;
    return now.ratings !== before.ratings || [...new Set([...before.values.keys(),...now.values.keys()])]
      .some(field => field !== ignore && before.values.get(field) !== now.values.get(field));
  }
  function refresh(root) {
    const state=states.get(root);if(!state)return;
    const changed=dirty(root);root.toggleAttribute('data-ux-dirty',changed);
    if(state.note)state.note.hidden=!changed;
  }
  function remember(root) {
    if(!root)return;
    if(!states.has(root))states.set(root,{baseline:capture(root)});
    else states.get(root).baseline=capture(root);
    refresh(root);
  }
  function confirmDiscard(message='This action will replace your unfinished changes. Nothing has been saved or sent.') {
    if(confirmation)return confirmation;
    confirmation=new Promise(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='bw-ux-confirm';
      dialog.setAttribute('aria-labelledby','uxDiscardTitle');dialog.setAttribute('aria-describedby','uxDiscardMessage');
      const title=document.createElement('h2');title.id='uxDiscardTitle';title.textContent='Discard unfinished changes?';
      const description=document.createElement('p');description.id='uxDiscardMessage';description.textContent=message;
      const actions=document.createElement('div');actions.className='bw-ux-confirm-actions';
      const stay=document.createElement('button');stay.type='button';stay.className='bw-tag-btn';stay.textContent='Keep editing';stay.autofocus=true;
      const discard=document.createElement('button');discard.type='button';discard.className='bw-tag-btn';discard.textContent='Discard changes';
      stay.addEventListener('click',()=>dialog.close());discard.addEventListener('click',()=>dialog.close('discard'));
      actions.append(stay,discard);dialog.append(title,description,actions);decorateConfirmation(dialog,title.textContent);document.body.append(dialog);
      const opener=document.activeElement;
      dialog.addEventListener('close',()=>{const approved=dialog.returnValue==='discard';dialog.remove();confirmation=null;opener?.focus?.({preventScroll:true});resolve(approved);},{once:true});
      dialog.showModal();
    });
    return confirmation;
  }
  window.BridgewayUX={dirty,remember,capture,confirmDiscard,decorateConfirmation,decorateDialog,actionTone,statusTone};

  // Consequential actions share one accessible confirmation. Existing review,
  // delete/undo and partnership-pause dialogs remain their own confirmation.
  function actionPolicy(label){
    const rules=[
      [/^Restrict view$/, 'Restrict all student reports?', 'Company feedback, objective results and review notes will be hidden from every student assigned to you, for all weeks. Plans and verified hours remain visible.', 'Restrict view'],
      [/^Make reports visible$/, 'Show all student reports?', 'All assigned students will be able to read their company feedback, objective results and review notes for every submitted week.', 'Make reports visible'],
      [/^Accept applicant$/, 'Accept this applicant?', 'This records the company’s acceptance and automatically closes the student’s other pending applications. The college then administers placement and training activation.', 'Accept applicant'],
      [/^Reject applicant$/, 'Reject this applicant?', 'This records a rejection for this internship application. Other applications and existing training records are unchanged.', 'Reject applicant'],
      [/^Withdraw(?: application)?$/, 'Withdraw this application?', 'The company will no longer consider this application. This does not affect other applications or existing training.', 'Withdraw application'],
      [/^Approve & publish$/, 'Approve and publish this internship?', 'The listing becomes discoverable by students at all active colleges, subject to each college’s local availability restrictions.', 'Approve & publish'],
      [/^Reject$/, 'Reject this listing?', 'The listing will not be published. The review reason remains with the listing.', 'Reject listing'],
      [/^Pause publication$/, 'Pause this publication?', 'The listing will stop accepting new applications. Existing applications, placements and training history remain intact.', 'Pause publication'],
      [/^Resume publication$/, 'Resume this publication?', 'Eligible students will be able to discover and apply to this listing again.', 'Resume publication'],
      [/^Resume(?: partnership| listing| for my college)?$/, 'Resume access?', 'New applications may resume only when the existing account and partnership requirements allow it. Existing training and history remain intact.', 'Resume access'],
      [/^Activate placement$/, 'Activate this placement?', 'Assign the selected academic supervisor and begin placement administration for the company-accepted applicant. This is not a second hiring decision.', 'Activate placement'],
      [/^Verify \d+ hours$/, 'Verify this weekly report?', 'Confirm the company’s report and objective assessments. The reported hours will count toward the student’s verified training total.', label],
      [/^Approve report(?: · \d+ h)?$/, 'Approve the company’s report?', 'Approve the company’s submitted weekly review and verify its reported hours. This does not create or change a student rating.', label],
      [/^Request revision$/, 'Request a report revision?', 'The company will need to revise this report using your review notes before it can be verified.', 'Request revision'],
      [/^(?:Submit|Resubmit) report$/, 'Submit this weekly report?', 'The report will be ready for supervisor review. Its plan and results become read-only until a revision is requested.', label],
      [/^(?:Submit evaluation|Submit final evaluation|Submit assessment)$/, 'Submit the final evaluation?', 'Confirm the ratings and written feedback for this student’s end-of-term company evaluation.', label],
      [/^(?:Save & submit for review|Submit for review|Publish Post Now|Publish post)$/, 'Submit this listing for review?', 'Platform Admin must approve the listing before students can discover it. Submitting does not publish it immediately.', 'Submit for review'],
      [/^Confirm time$/, 'Confirm this interview time?', 'The company will see your confirmation in this workspace. Your application remains pending; this is not an acceptance.', 'Confirm time']
    ];
    const match=rules.find(([pattern])=>pattern.test(label));return match?{title:match[1],message:match[2],action:match[3]}:null;
  }
  let actionConfirmation=null;
  function confirmAction(spec){
    if(actionConfirmation)return Promise.resolve(false);
    return new Promise(resolve=>{
      const d=document.createElement('dialog');d.className='bw-ux-confirm bw-ux-action-confirm';d.dataset.uxActionConfirmation='true';
      const id='action-'+crypto.randomUUID(),title=document.createElement('h2'),copy=document.createElement('p'),actions=document.createElement('div'),cancel=document.createElement('button'),proceed=document.createElement('button');
      title.id=id;title.textContent=spec.title;copy.id=id+'-description';copy.textContent=spec.message;d.setAttribute('aria-labelledby',title.id);d.setAttribute('aria-describedby',copy.id);
      cancel.type=proceed.type='button';cancel.className='bw-tag-btn';cancel.textContent='Cancel';cancel.autofocus=true;proceed.className='bw-tag-btn';proceed.textContent=spec.action;actions.className='bw-ux-confirm-actions';actions.append(cancel,proceed);d.append(title,copy,actions);
      const opener=document.activeElement;cancel.addEventListener('click',()=>d.close('cancel'));proceed.addEventListener('click',()=>d.close('confirmed'));
      d.addEventListener('close',()=>{actionConfirmation=null;const approved=d.returnValue==='confirmed';d.remove();if(opener?.isConnected)opener.focus({preventScroll:true});resolve(approved);},{once:true});
      decorateConfirmation(d,spec.action);actionConfirmation=d;document.body.append(d);d.showModal();
    });
  }
  window.BridgewayUX.confirmAction=confirmAction;window.BridgewayUX.actionPolicy=actionPolicy;
  const approvedClicks=new WeakSet(),approvedForms=new WeakSet(),pendingActions=new WeakSet();
  function policyFor(button){
    if(!button||button.disabled||button.dataset.confirmation==='custom'||button.closest('[data-ux-action-confirmation],.bw-delete-dialog'))return null;
    if(button.dataset.holdReject==='true'&&window.BridgewayKinetic?.confirmReject)return null; // The hold dialog is this action's confirmation.
    let label=button.textContent.replace(/[✓✔⚡]/g,'').trim().replace(/\s+/g,' ');
    if(button.id==='submitRubricBtn')label='Submit final evaluation';
    if(button.form?.id==='standalonePostForm'&&button.type==='submit')label='Submit for review';
    const listing=button.closest('[data-listing-id]'),reason=listing?.querySelector('textarea');
    if(reason&&['Reject','Pause publication'].includes(label)&&!reason.value.trim())return null; // Existing inline validation explains the missing reason.
    if(label==='Activate placement'&&!button.closest('.cycle-admission')?.querySelector('select')?.value)return null;
    if(label==='Request revision'&&!button.closest('.supervisor-review-footer')?.querySelector('textarea')?.value.trim())return null;
    if(label==='Reject'&&!button.closest('[data-listing-id]'))label='Reject applicant';
    const spec=actionPolicy(label),record=button.closest('.cycle-admission,[data-listing-id],.studio-application')?.querySelector('strong,h2')?.textContent.trim();
    if(spec&&record)spec.message=record+'. '+spec.message;
    return spec;
  }
  document.addEventListener('click',event=>{
    if(/\/pages\/(home|login)\//.test(location.pathname))return;
    const button=event.target.closest('button');if(!button)return;
    if(approvedClicks.has(button)){approvedClicks.delete(button);return;}
    if(button.form&&button.type==='submit')return; // Native validation happens first.
    const spec=policyFor(button);if(!spec)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(pendingActions.has(button))return;pendingActions.add(button);
    confirmAction(spec).then(approved=>{pendingActions.delete(button);if(!approved||!button.isConnected||button.disabled)return;approvedClicks.add(button);button.click();});
  },true);
  document.addEventListener('submit',event=>{
    const form=event.target;if(approvedForms.has(form)){approvedForms.delete(form);return;}
    const submitter=event.submitter||form.querySelector('button[type=submit]');const spec=policyFor(submitter);if(!spec)return;
    if(!form.reportValidity())return;
    event.preventDefault();event.stopImmediatePropagation();if(pendingActions.has(form))return;pendingActions.add(form);
    confirmAction(spec).then(approved=>{pendingActions.delete(form);if(!approved||!form.isConnected||!form.reportValidity())return;approvedForms.add(form);form.requestSubmit(submitter);});
  },true);

  document.addEventListener('DOMContentLoaded',()=>{
    // Presentation adapters preserve the original nodes, labels, and handlers.
    function stylePortalContent(scope=document){
      const find=selector=>[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
      find('dialog,.bw-modal-dialog').forEach(decorateDialog);
      find('table.bw-table,table.listing-table').forEach(table=>{
        if(table.classList.contains('evaluation-score-table'))return;
        table.classList.add('bw-data-table');
        table.classList.toggle('bw-dense-table',table.querySelectorAll('thead th').length>6);
        table.parentElement.classList.add('bw-adaptive-table');
      });
      find('.platform-toolbar,.applicants-toolbar,.listing-toolbar,.portal-directory-search').forEach(toolbar=>toolbar.classList.add('bw-data-toolbar'));
      const detailParts={
        '.student-spotlight,.company-meeting-expanded':'bw-detail-surface',
        '.spotlight-topline,.bw-detail-toolbar':'bw-detail-heading',
        '.spotlight-identity':'bw-detail-identity',
        '.spotlight-facts':'bw-detail-facts',
        '.spotlight-body':'bw-detail-body',
        '.spotlight-footer':'bw-detail-actions'
      };
      for(const [selector,className] of Object.entries(detailParts))find(selector).forEach(node=>node.classList.add(className));
    }
    stylePortalContent();
    document.querySelectorAll('#tab-opportunities .bw-opp-card').forEach(card=>{
      card.classList.add('bw-opportunity-summary');
      const company=card.querySelector('.bw-opp-company-name');
      if(company){
        const [name,...place]=company.textContent.split('•').map(text=>text.trim());
        const label=document.createElement('span');label.className='bw-opportunity-company';label.textContent=name;
        const location=document.createElement('span');location.className='bw-opportunity-location';location.textContent=place.join(' · ');
        company.replaceChildren(label,location);
      }
      const capacity=card.querySelector('.bw-capacity-text > span');if(capacity)capacity.textContent='Availability';
    });
    function track(root) {
      if(states.has(root))return;
      remember(root);
      const note=document.createElement('p');note.className='bw-ux-draft';note.hidden=true;note.setAttribute('role','status');
      note.textContent='Unsaved changes';
      (root.matches('.bw-modal-backdrop')?root.querySelector('.bw-modal-body')||root:root).append(note);states.get(root).note=note;
    }
    document.querySelectorAll('form,#companyEvaluationDetail,#supervisorReportDetail').forEach(track);
    document.querySelectorAll('.bw-modal-backdrop').forEach(modal=>{
      if(!modal.querySelector('form')&&modal.querySelector('input,textarea,select'))track(modal);
    });
    const modalRoots=modal=>modal?[...states.keys()].filter(root=>root===modal||modal.contains(root)):[];
    const refreshAll=()=>states.forEach((state,root)=>{if(root.isConnected)refresh(root);});
    document.addEventListener('input',refreshAll);document.addEventListener('change',()=>queueMicrotask(refreshAll));
    document.addEventListener('click',()=>queueMicrotask(refreshAll));
    document.addEventListener('reset',event=>queueMicrotask(()=>{
      event.target.querySelectorAll('[aria-invalid]').forEach(field=>field.removeAttribute('aria-invalid'));
      event.target.querySelectorAll('.bw-ux-field-error').forEach(note=>note.hidden=true);
      syncPasswords();remember(event.target);
    }),true);
    document.addEventListener('bridgeway:report-reviewed',()=>queueMicrotask(()=>remember(document.getElementById('supervisorReportDetail'))));
    window.addEventListener('beforeunload',event=>{
      if([...states.keys()].some(root=>root.isConnected&&dirty(root))){event.preventDefault();event.returnValue='';}
    });

    // Guard programmatic student selection as well as direct roster clicks.
    for(const [name,selector,current] of [
      ['selectWeeklyIntern','#companyWeeklyForm',()=>document.getElementById('activeInternSelect')?.value],
      ['selectInternForRubric','#companyEvaluationDetail',()=>document.getElementById('evaluationStudentSelect')?.value],
      ['reviewStudentReport','#supervisorReportDetail',()=>document.getElementById('supervisorReportDetail')?.hidden?'':document.getElementById('activeStudentName')?.textContent.trim()]
    ]) {
      const original=window[name],root=document.querySelector(selector);if(!original||!root)continue;
      let active=current();
      window[name]=(...args)=>{
        const wasHidden=root.hidden||root.closest('#companyWeeklyDetail')?.hidden;
        if(wasHidden)active='';
        const different=String(args[0])!==String(active);
        if(!different&&!wasHidden)return;
        const apply=()=>{const result=original(...args);active=current();if(different||wasHidden)remember(root);return result;};
        if(different&&dirty(root))return confirmDiscard('Switching students will replace your unfinished work. Nothing has been saved or sent.').then(approved=>{
          if(approved)return apply();
          if(name==='selectInternForRubric')document.getElementById('evaluationStudentSelect').value=active;
        });
        return apply();
      };
    }

    let replaying=false;
    function replay(control,roots){
      if(!['resetRubricBtn','autoFillRubricBtn'].includes(control.id))roots.forEach(remember);
      replaying=true;try{control.click();}finally{replaying=false;}
    }
    document.addEventListener('click',event=>{
      if(replaying||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const control=event.target.closest('a,button');if(!control)return;
      let roots=[];
      const resetTargets={clearCompanyWeekly:'#companyWeeklyForm',clearCompanyEvaluation:'#companyEvaluationDetail',clearSupervisorReport:'#supervisorReportDetail',resetRubricBtn:'#companyEvaluationDetail',autoFillRubricBtn:'#companyEvaluationDetail'};
      if(resetTargets[control.id])roots=[document.querySelector(resetTargets[control.id])];
      const modal=control.closest('.bw-modal-backdrop,dialog');
      if(control.matches('[data-close-modal],[data-close-dialog],.bw-modal-close,.platform-close'))roots=modalRoots(modal);
      const destination=control.dataset.studioTab||control.dataset.tab||control.dataset.platformTab;
      const active=document.querySelector('.bw-tab-panel.is-active');
      if(document.body.classList.contains('platform-rework')&&destination&&active&&active.id!==destination){
        roots=[...states.keys()].filter(root=>root.isConnected&&active.contains(root));
      }
      if(control.matches('a[href]')&&!control.target&&!control.hasAttribute('download')){
        const target=new URL(control.href,location.href);
        if(target.pathname!==location.pathname||target.search!==location.search||target.origin!==location.origin)roots=[...states.keys()].filter(root=>root.isConnected);
      }
      roots=roots.filter(root=>root&&dirty(root));if(!roots.length)return;
      event.preventDefault();event.stopImmediatePropagation();
      confirmDiscard().then(approved=>{if(approved)replay(control,roots);});
    },true);
    const week=document.getElementById('programWeekSelect');
    if(week)week.addEventListener('change',event=>{
      const form=week.form;if(!dirty(form,week))return;
      const next=week.value,previous=states.get(form).baseline.values.get(week);
      week.value=previous;event.stopImmediatePropagation();
      confirmDiscard('Changing the training week will clear the report you are editing. Nothing has been saved.').then(approved=>{
        if(!approved)return;
        form.reset();week.value=next;week.dispatchEvent(new Event('change',{bubbles:true}));remember(form);
      });
    },true);

    // Native dialog Escape and backdrop dismissals must not silently discard forms.
    document.querySelectorAll('dialog:not(.bw-ux-confirm),.bw-modal-backdrop').forEach(modal=>{
      let wasOpen=false;
      const isOpen=()=>modal.matches('dialog')?modal.open:modal.classList.contains('is-open');
      new MutationObserver(()=>{
        const open=isOpen();if(open&&!wasOpen)modalRoots(modal).forEach(remember);wasOpen=open;
      }).observe(modal,{attributes:true,attributeFilter:['open','class']});
      const dismiss=event=>{
        const roots=modalRoots(modal).filter(root=>dirty(root));if(!roots.length)return;
        event.preventDefault();event.stopImmediatePropagation();
        confirmDiscard().then(approved=>{if(!approved)return;roots.forEach(remember);if(modal.matches('dialog'))modal.close();else modal.classList.remove('is-open');});
      };
      modal.addEventListener('cancel',dismiss);
      modal.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss(event);},true);
      modal.addEventListener('click',event=>{if(event.target===modal)dismiss(event);},true);
    });

    // Inline errors supplement native constraints; valid entries are never cleared.
    let errorId=0;
    function errorFor(field){
      // Wrapped labels also contain controls, hints, and the previous error.
      // Read only their label copy so validation cannot incorporate itself.
      const labelCopy=field.labels?.[0]?.cloneNode(true);
      labelCopy?.querySelectorAll('input,select,textarea,button,[data-ux-error-for],.bw-ux-required,.ie-hint,.cycle-muted,small,[role="alert"]').forEach(node=>node.remove());
      const label=labelCopy?.textContent.replace(/\*/g,'').replace(/\s+/g,' ').trim()||'this field';
      if(field.validity.valueMissing)return `Complete ${label.toLowerCase()}.`;
      if(field.validity.typeMismatch)return field.type==='email'?'Enter a valid email address.':'Enter a valid value.';
      if(field.validity.rangeUnderflow)return `Enter at least ${field.min}.`;
      if(field.validity.rangeOverflow)return `Enter no more than ${field.max}.`;
      return field.validationMessage;
    }
    function showError(field){
      if(!field.form||field.type==='file')return;
      let note=field.parentElement.querySelector(`[data-ux-error-for="${field.id}"]`);
      if(field.validity.valid){
        field.removeAttribute('aria-invalid');if(note)note.hidden=true;return;
      }
      if(!note){
        field.id||=`ux-field-${++errorId}`;note=document.createElement('p');note.id=`ux-error-${++errorId}`;
        note.className='bw-ux-field-error';note.dataset.uxErrorFor=field.id;
        field.after(note);field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),note.id].filter(Boolean).join(' '));
      }
      field.setAttribute('aria-invalid','true');note.hidden=false;note.textContent=errorFor(field);
    }
    document.addEventListener('invalid',event=>{
      if(!event.target.form||event.target.type==='file')return;
      event.preventDefault();showError(event.target);
      queueMicrotask(()=>event.target.form?.querySelector('[aria-invalid="true"]')?.focus());
    },true);
    document.addEventListener('input',event=>{if(event.target.getAttribute('aria-invalid')==='true')showError(event.target);});
    document.addEventListener('focusout',event=>{const field=event.target;if(field.form&&field.value&&field.validity&&!field.validity.valid)showError(field);});
    function syncPasswords(){
      const password=document.getElementById('newPasswordInput'),confirm=document.getElementById('confirmPasswordInput');
      if(password&&confirm)confirm.setCustomValidity(confirm.value&&confirm.value!==password.value?'Passwords must match.':'');
    }
    for(const id of ['newPasswordInput','confirmPasswordInput'])document.getElementById(id)?.addEventListener('input',()=>{
      syncPasswords();const confirm=document.getElementById('confirmPasswordInput');if(confirm.getAttribute('aria-invalid')==='true')showError(confirm);
    });

    function improveForm(form){
      form.querySelectorAll('[required]').forEach(field=>{
        const label=field.labels?.[0];if(!label||label.querySelector('.bw-ux-required')||label.textContent.includes('*'))return;
        const mark=document.createElement('span');mark.className='bw-ux-required';mark.textContent=' *';mark.setAttribute('aria-hidden','true');const copy=label.contains(field)&&label.querySelector(':scope > span');(copy||label).append(mark);
      });
      if(form.querySelector('[required]')&&!form.querySelector('.bw-ux-required-note')){
        const note=document.createElement('p');note.className='bw-ux-required-note';note.textContent='Fields marked * are required.';
        (form.querySelector('.bw-modal-body,.platform-form-body')||form).prepend(note);
      }
    }
    document.querySelectorAll('form').forEach(improveForm);

    // Keep mobile summaries short without moving cells or changing table handlers.
    function improveRows(table){
      table.querySelectorAll('tbody tr').forEach(row=>{
        if(row.cells.length<3||row.querySelector('.bw-ux-row-toggle'))return;
        const cells=[...row.cells],secondary=cells.filter((cell,index)=>index>0&&!/status|standing|action|access/i.test(cell.dataset.mobileLabel||''));
        if(!secondary.length)return;
        secondary.forEach(cell=>cell.setAttribute('data-mobile-secondary',''));
        row.dataset.mobileExpanded='false';
        const button=document.createElement('button');button.type='button';button.className='bw-ux-row-toggle';button.textContent='More details';button.setAttribute('aria-expanded','false');
        button.addEventListener('click',()=>{const expanded=row.dataset.mobileExpanded!=='true';row.dataset.mobileExpanded=String(expanded);button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Less details':'More details';});
        row.cells[0].append(button);
      });
    }
    document.querySelectorAll('.bw-mobile-records').forEach(table=>{
      improveRows(table);const body=table.querySelector('tbody');
      if(body)new MutationObserver(()=>improveRows(table)).observe(body,{childList:true});
    });

    // A zero-result search gets a recovery action, not another dead end.
    document.querySelectorAll('[id$="Empty"],[id$="empty"],.platform-empty').forEach(empty=>{
      if(!empty.matches('p'))return;
      const area=empty.closest('.bw-student-picker,.bw-tab-panel');if(!area)return;
      const searches=[...area.querySelectorAll('input[type="search"],input[id*="Search"],input[id$="-search"]')];if(!searches.length)return;
      const clear=document.createElement('button');clear.type='button';clear.className='bw-ux-empty-reset';clear.textContent='Clear filters';clear.hidden=true;empty.after(clear);
      const sync=()=>{clear.hidden=empty.hidden||getComputedStyle(empty).display==='none';};
      clear.addEventListener('click',()=>{
        searches.forEach(input=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));});
        [...area.querySelectorAll('button')].find(button=>/^(All applications|All interns|All listings|All roles)$/i.test(button.textContent.trim()))?.click();
        searches[0].focus();sync();
      });
      new MutationObserver(sync).observe(empty,{attributes:true,attributeFilter:['hidden','style']});sync();
    });

    const applicationStatuses={Applied:'Application pending',Pending:'Application pending',Accepted:'Company accepted',Rejected:'Company rejected','Rejected by company':'Company rejected'};
    const normalizeStatuses=()=>document.querySelectorAll('[data-application-status] .bw-badge,#companyCandidatesTableBody .bw-badge,#companyAcceptedTableBody .bw-badge,#candidateTableBody .bw-badge').forEach(badge=>{
      const replacement=applicationStatuses[badge.textContent.trim()];if(replacement)badge.textContent=replacement;
      const status=badge.textContent.trim();
      if(status==='Accepted · awaiting placement'){badge.title='Accepted by the host company. The college handles placement setup and supervisor assignment.';return;}
      if(status==='Active intern'){badge.title='Training is active.';return;}
      if(!['Application pending','Company accepted','Company rejected'].includes(status))return;
      badge.classList.remove('bw-badge-blue','bw-badge-success','bw-badge-amber','bw-badge-danger');
      badge.classList.add(status==='Application pending'?'bw-badge-amber':status==='Company accepted'?'bw-badge-success':'bw-badge-danger');
      badge.title=status==='Application pending'?'The host company has not made a hiring decision.':status==='Company accepted'?'Accepted by the host company. The college handles placement setup and supervisor assignment.':'The host company declined this application.';
    });
    normalizeStatuses();syncSemanticColors();
    new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        stylePortalContent(node);
        if(node.matches('form')){track(node);improveForm(node);}
        node.querySelectorAll('form').forEach(form=>{track(form);improveForm(form);});
      }));
      normalizeStatuses();syncSemanticColors();
    }).observe(document.body,{childList:true,subtree:true});
  });
})();
