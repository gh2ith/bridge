/* Company assignments are part of the weekly plan, independent of report results.
   Uses the existing local workspace; this is not backend authorization. */
(() => {
  'use strict';
  const C = window.BridgewayCycle;
  if (!C) return;
  const { E, A, B } = C;

  function weekFor(studentId, weekIndex) {
    if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex >= 8) return null;
    return C.state.plans[studentId]?.[weekIndex] || null;
  }
  function list(studentId, weekIndex) {
    return (weekFor(studentId, weekIndex)?.tasks || []).filter(task => !task.removedAt);
  }
  function canManage(studentId, weekIndex) {
    const viewer = C.identity();
    const week=weekFor(studentId,weekIndex);
    if (!viewer.startsWith('company:') || !week || !['draft','revision'].includes(week.status)) return false;
    const company = viewer.slice('company:'.length);
    const placement = C.state.histories.find(record => record.student === studentId);
    return C.student(studentId)?.company === company && placement?.company === company && placement.status === 'Active';
  }
  function invalid(message, field) {
    const error = new Error(message);
    error.field = field;
    return error;
  }
  function valuesFor(values) {
    const title = typeof values?.title === 'string' ? values.title.trim() : '';
    const instructions = typeof values?.instructions === 'string' ? values.instructions.trim() : '';
    const dueDate = typeof values?.dueDate === 'string' ? values.dueDate.trim() : '';
    if (!title) throw invalid('Enter a task title.', 'title');
    if (title.length > 120) throw invalid('Keep the task title to 120 characters or fewer.', 'title');
    if (instructions.length > 2000) throw invalid('Keep the instructions to 2,000 characters or fewer.', 'instructions');
    if (dueDate) {
      const parsed = new Date(dueDate + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dueDate) {
        throw invalid('Choose a valid due date.', 'dueDate');
      }
    }
    return { title, instructions, dueDate };
  }
  function writableWeek(studentId, weekIndex) {
    const week=weekFor(studentId,weekIndex);
    if(week&&!['draft','revision'].includes(week.status))throw new Error('This week is read-only. Task changes reopen only if the supervisor requests a revision.');
    if (!canManage(studentId, weekIndex)) throw new Error('Tasks can only be changed for your own active interns.');
    return weekFor(studentId, weekIndex);
  }
  function submit(studentId, weekIndex, values, files) {
    const week = writableWeek(studentId, weekIndex);
    const fields = valuesFor(values);
    const timestamp = new Date().toISOString();
    const task = { id: crypto.randomUUID(), company: C.student(studentId).company, ...fields, createdAt: timestamp, updatedAt: timestamp };
    if(files)task.attachments=structuredClone(files);
    (week.tasks ||= []).push(task);
    if(C.commit(`Task added to Week ${weekIndex + 1} for ${C.student(studentId).name}`)===false){week.tasks.pop();throw new Error('The task could not be saved. Your draft is still open.');}
    return task;
  }
  function update(studentId, weekIndex, taskId, values, files) {
    writableWeek(studentId, weekIndex);
    const task = list(studentId, weekIndex).find(item => item.id === taskId);
    if (!task) throw new Error('This task is no longer available.');
    const fields = valuesFor(values);
    const before=structuredClone(task);
    Object.assign(task, fields, { updatedAt: new Date().toISOString() });
    if(files)task.attachments=structuredClone(files);
    if(C.commit(`Task updated in Week ${weekIndex + 1} for ${C.student(studentId).name}`)===false){Object.keys(task).forEach(key=>delete task[key]);Object.assign(task,before);throw new Error('The task could not be saved. Your draft is still open.');}
    return task;
  }
  function remove(studentId, weekIndex, taskId) {
    writableWeek(studentId, weekIndex);
    const task = list(studentId, weekIndex).find(item => item.id === taskId);
    if (!task) throw new Error('This task is no longer available.');
    task.removedAt = new Date().toISOString();
    task.updatedAt = task.removedAt;
    C.commit(`Task removed from Week ${weekIndex + 1} for ${C.student(studentId).name}`);
    return task;
  }
  const icon = name => {
    const element = E('i', null, `bi bi-${name}`);
    element.setAttribute('aria-hidden', 'true');
    return element;
  };
  const dueLabel = value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const taskStatus = task => task.submissions?.at(-1)?.review?.outcome || (task.submissions?.length ? (task.submissions.length > 1 ? 'Resubmitted' : 'Submitted') : 'Assigned');
  const overdue = task => !!task.dueDate && task.dueDate < new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) && taskStatus(task) !== 'Completed';
  function deliver(studentId, weekIndex, taskId, values) {
    const task = list(studentId, weekIndex).find(t => t.id === taskId);
    if (!task || C.identity() !== `student:${studentId}` || C.state.histories.find(h=>h.student===studentId)?.status !== 'Active') throw new Error('Only the student in this active placement can submit work.');
    if(!['draft','revision'].includes(weekFor(studentId,weekIndex)?.status))throw new Error('This week is read-only. Wait for a revision request before submitting more task work.');
    if (!['Assigned','Changes requested'].includes(taskStatus(task))) throw new Error('Wait for company review before submitting another version.');
    const description = String(values.description || '').trim(), link = String(values.link || '').trim();
    if (description.length > 3000) throw new Error('Keep your description to 3,000 characters.');
    if (link && !/^https?:\/\//i.test(link)) throw new Error('Use an https:// or http:// work link.');
    if (link) { try {new URL(link);} catch {throw new Error('Enter a valid work link.');} }
    const files=(task.attachments||[]).filter(f=>f.owner===C.identity()).map(f=>f.id);
    if (!description && !link && !files.length) throw new Error('Add a description, a work link, or a PDF before submitting.');
    (task.submissions ||= []).push({id:crypto.randomUUID(),version:task.submissions.length+1,description,link,files,instructions:task.instructions,at:new Date().toISOString()});
    if(C.commit('Student task submission recorded')===false){task.submissions.pop();throw new Error('Browser storage is full. Your work was not submitted.');} return task;
  }
  function review(studentId, weekIndex, taskId, outcome, feedback) {
    writableWeek(studentId,weekIndex);
    const task=list(studentId,weekIndex).find(t=>t.id===taskId), submission=task?.submissions?.at(-1);
    if (!submission || submission.review) throw new Error('Only a submission awaiting review can be reviewed.');
    if (!['Completed','Changes requested'].includes(outcome)) throw new Error('Choose a review outcome.');
    feedback=String(feedback||'').trim();
    if (feedback.length>3000 || outcome==='Changes requested'&&!feedback) throw new Error('Explain the requested changes in up to 3,000 characters.');
    submission.review={outcome,feedback,at:new Date().toISOString(),by:C.identity()};
    if(C.commit('Company task review recorded')===false){delete submission.review;throw new Error('Browser storage is unavailable. Your review was not saved.');}return task;
  }

  function submissionPanel(task,studentId,weekIndex,role,onUpdate) {
    const box=E('section',null,'task-submissions');
    const previous=E('details',null,'task-submission-history');previous.append(E('summary',`Previous submissions (${Math.max(0,(task.submissions||[]).length-1)})`));
    (task.submissions||[]).slice().reverse().forEach(s=>{
      const details=E('details',null,'task-submission-version');details.open=s===task.submissions.at(-1);
      details.append(E('summary',`Submission ${s.version} · ${C.date(s.at)}`),E('p',s.description||'PDF / linked deliverable'));
      if(s.link){const a=E('a','Open submitted work');a.href=s.link;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}
      (s.files||[]).forEach(id=>{const file=task.attachments?.find(f=>f.id===id);if(file)details.append(E('p',file.name,'cycle-muted'));});
      if(s.review)details.append(C.status(s.review.outcome),E('p',s.review.feedback||'Work completed.'));
      if(role==='company'&&s===task.submissions.at(-1)){
        const latest=E('section',null,'task-latest-submission');
        latest.append(A(E('header'),A(E('strong'),icon('arrow-up-right-square'),E('span','Latest submission')),E('small',`Version ${s.version} · ${C.date(s.at)}`)));
        [...details.children].slice(1).forEach(child=>latest.append(child));box.append(latest);
      }else if(role==='company')previous.append(details);else box.append(details);
    });
    if(role==='company'&&(task.submissions||[]).length>1)box.append(previous);
    const maySubmit=role==='student'&&C.identity()===`student:${studentId}`&&C.state.histories.find(h=>h.student===studentId)?.status==='Active'&&['draft','revision'].includes(weekFor(studentId,weekIndex)?.status)&&['Assigned','Changes requested'].includes(taskStatus(task));
    const mayReview=role==='company'&&canManage(studentId,weekIndex)&&['Submitted','Resubmitted'].includes(taskStatus(task));
    if(maySubmit||mayReview){
      const form=E('form',null,'cycle-form'),text=C.field(maySubmit?'Describe your work':'Feedback (optional)','','textarea'),link=maySubmit?C.field('Work link (optional)','','url'):null,error=E('p','','weekly-task-error');error.setAttribute('role','alert');text.input.maxLength=3000;
      form.append(text.wrap);if(link)form.append(link.wrap);
      const outcome=mayReview?{input:{value:''}}:null;
      const save=E('button',maySubmit?(task.submissions?.length?'Resubmit work':'Submit work'):'Save review','cycle-button is-primary');save.type='submit';form.append(error,save);
      if(mayReview){
        form.classList.add('task-review-form');
        text.input.rows=2;text.input.placeholder='Leave a short note for the student.';
        const feedback=E('details',null,'task-review-feedback'),feedbackSummary=E('summary','Add feedback (optional)');feedback.append(feedbackSummary,text.wrap);
        const complete=E('button','Complete task','cycle-button is-primary');complete.type='submit';complete.value='Completed';complete.prepend(icon('check2'));
        const revise=B('Request changes',()=>setRevision(true));revise.prepend(icon('arrow-counterclockwise'));
        const cancel=B('Cancel',()=>setRevision(false));cancel.hidden=true;
        save.textContent='Send revision request';save.value='Changes requested';save.hidden=true;
        function setRevision(active){form.classList.toggle('is-revision',active);outcome.input.value=active?'Changes requested':'';feedback.open=active||!!text.input.value;feedbackSummary.textContent=active?'Explain the changes needed':'Add feedback (optional)';text.input.required=active;text.wrap.firstElementChild.textContent=active?'Changes needed *':'Feedback (optional)';text.input.placeholder=active?'Tell the student what to improve before resubmitting.':'Leave a short note for the student.';complete.hidden=active;revise.hidden=active;save.hidden=!active;cancel.hidden=!active;if(active)text.input.focus();}
        form.prepend(feedback);form.append(A(E('footer',null,'task-review-footer'),E('span','Review the latest version','task-review-prompt'),A(E('div',null,'task-review-buttons'),cancel,revise,complete,save)));
      }
      form.addEventListener('submit',ev=>{ev.preventDefault();try{if(maySubmit)deliver(studentId,weekIndex,task.id,{description:text.input.value,link:link.input.value});else review(studentId,weekIndex,task.id,ev.submitter?.value||outcome.input.value,text.input.value);box.replaceWith(submissionPanel(task,studentId,weekIndex,role,onUpdate));if(onUpdate)onUpdate();}catch(e){error.textContent=e.message;}});box.append(form);
    }
    return box;
  }

  function attachments(task, studentId, weekIndex, role, draftOptions=null) {
    const box = E('div', null, 'weekly-task-attachments');
    const owner = C.identity();
    const writable = () => canManage(studentId, weekIndex) || owner === `student:${studentId}` && C.state.histories.find(h => h.student === studentId)?.status === 'Active'&&['draft','revision'].includes(weekFor(studentId,weekIndex)?.status);
    function refresh() {
      const heading=A(E('div',null,'task-files-heading'),E('strong','Files'),E('span',String((task.attachments||[]).length),'weekly-tasks-count'));
      const fileList=E('div',null,'task-file-list');box.replaceChildren(heading,fileList);
      (task.attachments || []).forEach(file => {
        const row=E('div',null,'task-file-row'),details=A(E('div',null,'task-file-info'),E('span',file.name,'task-file-name'),E('small',`${file.author} · PDF${file.size?` · ${file.size<1024*1024?Math.max(1,Math.round(file.size/1024))+' KB':(file.size/1024/1024).toFixed(1)+' MB'}`:''}`));
        const link = B('Download', () => {
          const bytes = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
          const a = E('a'); a.href = url; a.download = file.name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        link.classList.add('task-file-download');link.setAttribute('aria-label',`Download ${file.name}`);
        row.append(icon('file-earmark-pdf'),details,link);
        if (file.owner === owner && writable() && !task.submissions?.some(s=>s.files?.includes(file.id))) {
          const remove=B('',()=>{
            const body=E('div');body.append(E('p',`Remove “${file.name}” from this task?`));
            const d=C.dialog('Remove attachment?',body),cancel=B('Keep file',()=>d.close()),confirm=B('Remove file',()=>{
              if(!writable()||task.submissions?.some(s=>s.files?.includes(file.id)))return;
              const before=task.attachments;task.attachments=before.filter(item=>item.id!==file.id);
              if(!draftOptions&&C.commit('Task PDF removed')===false){task.attachments=before;return;}
              draftOptions?.changed();
              d.close();refresh();
            });body.append(A(E('div',null,'cycle-actions'),cancel,confirm));cancel.focus();
          });remove.append(icon('trash3'));remove.classList.add('task-file-remove');remove.setAttribute('aria-label',`Remove ${file.name}`);row.append(remove);
        }
        fileList.append(row);
      });
      if (!['company', 'student'].includes(role) || !writable() || role==='student'&&!['Assigned','Changes requested'].includes(taskStatus(task))) return;
      const input = C.field(role === 'company' ? 'Attach task PDF' : 'Submit task PDF', '', 'file');
      input.wrap.hidden=true;
      input.input.accept = '.pdf,application/pdf';
      const add=B('Attach PDF',()=>input.input.click());add.prepend(icon('paperclip'));add.classList.add('task-file-add');heading.append(add);
      const message = E('p', 'PDF · Up to 1 MB per file · Stored in this browser only', 'weekly-task-hint');
      message.setAttribute('role', 'status');
      input.input.addEventListener('change', async () => {
        const file = input.input.files[0]; if (!file) return;
        input.input.disabled = true;add.disabled=true;add.lastChild.textContent='Attaching…';draftOptions?.busy(true);
        try {
          if (!/\.pdf$/i.test(file.name) || !file.size || file.size > 1024 * 1024) throw new Error('Choose a non-empty PDF up to 1 MB.');
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('This file does not have a valid PDF header.');
          if (!writable() || task.removedAt) throw new Error('This task is no longer open for submission.');
          const data = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
          const record = { id: crypto.randomUUID(), name: file.name, data, size: file.size, owner, author: role === 'company' ? 'Company' : 'Student', at: new Date().toISOString() };
          (task.attachments ||= []).push(record);
          if(!draftOptions)try {
            // Check quota before committing; never report a file as saved after a failed write.
            const key = 'bridgeway:task-pdf-quota-check';
            localStorage.setItem(key, JSON.stringify(C.state)); localStorage.removeItem(key);
          } catch { task.attachments.pop(); throw new Error('Browser storage is full. Choose a smaller PDF.'); }
          if(!draftOptions&&C.commit(`${record.author} PDF attached to task`)===false){task.attachments.pop();throw new Error('The PDF could not be saved. Please try again.');}draftOptions?.changed(); refresh();
        } catch (error) { message.textContent = error.message;message.classList.add('weekly-task-error');input.input.disabled = false; input.input.value = '';add.disabled=false;add.lastChild.textContent='Attach PDF'; }
        finally {draftOptions?.busy(false);}
      });
      box.append(input.wrap, message);
    }
    refresh(); return box;
  }

  function render(studentId, weekIndex, role = 'student') {
    const host = E('section', null, 'weekly-tasks');
    host.setAttribute('aria-label', `Tasks for Week ${weekIndex + 1}`);
    const manager = () => role === 'company' && canManage(studentId, weekIndex);
    function focusAction(taskId) {
      const target = [...host.querySelectorAll('[data-task-edit]')].find(button => button.dataset.taskEdit === taskId);
      (target || host.querySelector('[data-task-add]'))?.focus({ preventScroll: true });
    }
    function editor(task = null) {
      if (!manager()) return;
      const form = E('form', null, 'weekly-task-form');
      const context = A(E('div', null, 'weekly-task-context'), icon('calendar3'), A(E('div'), E('strong', `Week ${weekIndex + 1} · ${weekFor(studentId, weekIndex).title}`), E('span', C.student(studentId).name)));
      const title = C.field('Task title *', task?.title || '');
      title.input.required = true;
      title.input.maxLength = 120;
      title.input.placeholder = 'e.g. Build and test the profile page';
      const instructions = C.field('Instructions (optional)', task?.instructions || '', 'textarea');
      instructions.input.maxLength = 2000;
      instructions.input.rows = 5;
      instructions.input.placeholder = 'Describe the work and what the student should deliver.';
      const due = C.field('Due date (optional)', task?.dueDate || '', 'date');
      const hint = E('p', 'The task will appear in this student’s selected training week.', 'weekly-task-hint');
      const error = E('p', '', 'weekly-task-error');
      error.id = `task-error-${crypto.randomUUID()}`;
      error.setAttribute('role', 'alert');
      const save = E('button', task ? 'Save changes' : 'Submit task', 'cycle-button is-primary');
      save.type = 'submit';
      const draft=structuredClone(task||{attachments:[],submissions:[]}),fileChanges=E('input');fileChanges.type='hidden';fileChanges.name='attachmentChanges';fileChanges.value=JSON.stringify((draft.attachments||[]).map(f=>f.id));
      const files=attachments(draft,studentId,weekIndex,'company',{changed(){fileChanges.value=JSON.stringify((draft.attachments||[]).map(f=>f.id));fileChanges.dispatchEvent(new Event('input',{bubbles:true}));},busy(value){save.disabled=value;}});
      files.classList.add('weekly-task-editor-files');
      form.append(files,fileChanges,context, title.wrap, instructions.wrap, due.wrap, error, A(E('footer', null, 'weekly-task-form-footer'), hint, save));
      const d = C.dialog(task ? 'Edit weekly task' : 'New weekly task', form);
      d.classList.add('weekly-task-dialog');
      title.input.focus();
      const inputs = { title: title.input, instructions: instructions.input, dueDate: due.input };
      form.addEventListener('input', () => {
        error.textContent = '';
        Object.values(inputs).forEach(input => { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); });
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const values = { title: title.input.value, instructions: instructions.input.value, dueDate: due.input.value };
        save.disabled = true;
        try {
          const record = task ? update(studentId, weekIndex, task.id, values,draft.attachments||[]) : submit(studentId, weekIndex, values,draft.attachments||[]);
          form.dataset.committed = 'true';
          d.close();
          refresh();
          focusAction(record.id);
        } catch (failure) {
          error.textContent = failure.message;
          const input = inputs[failure.field];
          if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', error.id); input.focus(); }
          save.disabled = false;
        }
      });
    }
    function confirmRemove(task) {
      const body = E('div', null, 'weekly-task-removal');
      body.append(E('p', `Remove “${task.title}” from Week ${weekIndex + 1}?`), E('p', 'It will no longer appear in the student’s task list. The weekly report and its verified hours stay unchanged.', 'weekly-task-hint'));
      const cancel = B('Keep task', () => d.close());
      const confirm = B('Remove task', () => {
        try { remove(studentId, weekIndex, task.id); d.close(); refresh(); focusAction(); }
        catch (failure) { error.textContent = failure.message; }
      });
      confirm.classList.add('weekly-task-remove-confirm');
      const error = E('p', '', 'weekly-task-error');error.setAttribute('role', 'alert');
      body.append(error, A(E('div', null, 'cycle-actions'), cancel, confirm));
      const d = C.dialog('Remove task?', body);
      cancel.focus();
    }
    function refresh() {
      host.replaceChildren();
      const tasks = list(studentId, weekIndex);
      const heading = E('header', null, 'weekly-tasks-heading');
      const title = A(E('div', null, 'weekly-tasks-title'), icon('clipboard-check'), E('h3', 'Tasks for this week'), E('span', String(tasks.length), 'weekly-tasks-count'));
      heading.append(title);
      if (manager()) {
        const add = B('', () => editor(), true);
        add.dataset.taskAdd = 'true';
        add.append(icon('plus-lg'), E('span', 'Add task'));
        heading.append(add);
      }
      host.append(heading, E('p', role === 'company' ? manager()?'Give your intern clear work to focus on this week.':'Recorded tasks · Read only' : `Assigned by ${C.org(C.student(studentId)?.company)}`, 'weekly-tasks-intro'));
      if (!tasks.length) {
        host.append(A(E('div', null, 'weekly-tasks-empty'), icon('clipboard-plus'), A(E('div'), E('strong', 'No tasks assigned yet'), E('p', manager() ? 'Add a task with instructions and an optional due date.' : 'Tasks from your company will appear here for this week.'))));
        return;
      }
      const rows = E('ul', null, 'weekly-tasks-list');
      tasks.forEach(task => {
        const row = E('li', null, 'weekly-task-row');
        row.dataset.taskId=task.id;
        const content = E('div', null, 'weekly-task-content'),taskHeading=A(E('div',null,'weekly-task-row-heading'),E('h4',task.title));
        taskHeading.append(C.status(taskStatus(task)));if(overdue(task))taskHeading.append(C.status('Overdue'));content.append(taskHeading);
        const body=E('div',null,'weekly-task-body');body.id=`task-body-${crypto.randomUUID()}`;content.append(body);
        function collapseCompleted(focus=false){
          const completed=taskStatus(task)==='Completed';row.classList.toggle('is-completed',completed);if(!completed)return;
          body.hidden=true;const toggle=B('',()=>{body.hidden=!body.hidden;updateToggle();});toggle.classList.add('weekly-task-expand');toggle.setAttribute('aria-controls',body.id);
          function updateToggle(){toggle.replaceChildren(icon(body.hidden?'chevron-down':'chevron-up'));toggle.setAttribute('aria-expanded',String(!body.hidden));toggle.setAttribute('aria-label',`${body.hidden?'Expand':'Collapse'} completed task: ${task.title}`);toggle.title=body.hidden?'Show task details':'Hide task details';}
          updateToggle();let controls=row.querySelector('.weekly-task-actions');if(!controls){controls=E('div',null,'weekly-task-actions');row.append(controls);}controls.append(toggle);if(focus)toggle.focus({preventScroll:true});
        }
        if (task.instructions) body.append(E('p', task.instructions, 'weekly-task-instructions'));
        if (task.dueDate) {
          const date = E('time', `Due ${dueLabel(task.dueDate)}`);date.dateTime = task.dueDate;
          body.append(A(E('div', null, 'weekly-task-due'), icon('calendar3'), date));
        }
        if(role!=='company')body.append(attachments(task, studentId, weekIndex, role));
        body.append(submissionPanel(task,studentId,weekIndex,role,()=>{taskHeading.replaceChildren(E('h4',task.title),C.status(taskStatus(task)));if(overdue(task))taskHeading.append(C.status('Overdue'));collapseCompleted(true);}));
        row.append(A(E('span', null, 'weekly-task-mark'), icon('file-earmark-text')), content);
        if (manager()) {
          const edit = B('Edit', () => editor(task));edit.dataset.taskEdit = task.id;edit.setAttribute('aria-label', `Edit task: ${task.title}`);
          const discard = B('', () => confirmRemove(task));discard.append(icon('trash3'));discard.setAttribute('aria-label', `Remove task: ${task.title}`);
          row.append(A(E('div', null, 'weekly-task-actions'), edit, discard));
        }
        collapseCompleted();rows.append(row);
      });
      host.append(rows);
    }
    refresh();
    return host;
  }
  window.BridgewayWeeklyTasks = { list, canManage, submit, update, remove, render, deliver, review, taskStatus, overdue };
})();
