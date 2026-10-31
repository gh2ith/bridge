/* College placement workspace; workflow decisions remain in the shared cycle. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => queueMicrotask(() => {
    const C=window.BridgewayCycle, root=document.getElementById('tab-approved');
    if(!C||!root)return;
    const {E,A,B}=C, setup=root.querySelector('.cycle-section');
    const source=document.createElement('div');
    if(setup)source.append(setup);
    root.replaceChildren();
    root.classList.add('college-placements');
    const intro=E('p','Manage company-accepted internships, follow verified training, and review placement records.','placements-intro');
    const summary=E('div',null,'placements-summary'), panel=E('section',null,'placements-panel');
    const filters=E('div',null,'placements-filters'), search=C.field('Search student internships','','search');
    search.input.placeholder='Student name, ID, company, or internship';
    const toolbar=A(E('div',null,'placements-toolbar'),search.wrap), results=E('p',null,'placements-results');
    results.setAttribute('role','status');
    const content=E('div',null,'placements-table-wrap');
    panel.append(toolbar,filters,results,content);root.append(intro,summary,panel);
    let selected='All', opened;
    const labels=['All','Needs setup','Active training','Completed','Ended early'];
    function records(){
      return window.BridgewayPartners.students.filter(s=>s.college==='college-1').flatMap(s=>{
        const app=C.state.applications.find(a=>a.student===s.id&&a.status==='Accepted');
        const h=C.state.histories.find(h=>h.student===s.id);
        if(app)return [{s,app,role:C.state.listings.find(l=>l.id===app.listing)?.title||'Internship',company:app.company,stage:'Needs setup'}];
        if(!h)return [];
        return [{s,h,role:h.role,company:h.company,stage:h.status==='Completed'?'Completed':h.status==='Active'?'Active training':'Ended early'}];
      });
    }
    function badge(stage){const n=C.status(stage);n.classList.toggle('is-good',stage==='Completed');n.classList.toggle('is-wait',stage==='Needs setup');return n;}
    function progress(r){
      const plan=r.h&&C.state.histories.find(h=>h.student===r.s.id)?.id===r.h.id?C.state.plans[r.s.id]:null;
      return {hours:r.h?.status==='Active'?C.hours(r.s.id):Number(r.h?.verifiedHours??window.BridgewayTrainingHours.verified(plan)),weeks:(plan||[]).filter(w=>w.status==='verified').length};
    }
    function view(r){
      const {s}=r, body=E('div',null,'placement-detail');
      body.append(A(E('div',null,'placement-detail-person'),E('span',s.name.split(' ').map(x=>x[0]).slice(0,2).join(''),'placement-avatar'),A(E('div'),E('h3',s.name),E('p',`Student ID ${s.studentId}`))),badge(r.stage));
      if(r.app){
        const input=setup?.querySelector('input');if(input){input.value=s.studentId;input.dispatchEvent(new Event('input'));}
        const row=setup?.querySelector('.cycle-admission');
        if(row)body.append(row);
        opened=C.dialog('Set up placement',body);return;
      }
      const p=progress(r),facts=E('dl',null,'placement-facts');
      for(const [label,value]of [['Host company',C.org(r.company)],['Internship',r.role],['Academic supervisor',s.supervisor||'Not assigned'],['Started',r.h.start?C.date(r.h.start):'Not recorded'],['Ended',r.h.end?C.date(r.h.end):'Ongoing'],['Verified hours',`${p.hours} h`]])facts.append(A(E('div'),E('dt',label),E('dd',value)));
      body.append(facts);
      if(r.h.reason)body.append(E('p',r.h.reason,'cycle-muted'));
      const actions=E('div',null,'placement-detail-actions');
      actions.append(B('View training progress',()=>{opened.close();const training=E('div');C.training(training,s.id,'admin');opened=C.dialog(`${s.name} · Training`,training);}));
      if(r.stage==='Active training')actions.append(B('End placement',()=>{
        opened.close();const form=E('form'),reason=C.field('Reason for ending this placement','','textarea');reason.input.required=true;reason.input.maxLength=1500;
        form.append(E('p',`End ${s.name}’s placement at ${C.org(r.company)}? The training record and verified hours will be retained.`),reason.wrap);
        const confirm=B('Confirm end placement',()=>{});confirm.type='submit';confirm.classList.add('is-danger');form.append(confirm);
        const d=C.dialog('End placement',form);
        form.addEventListener('submit',ev=>{ev.preventDefault();if(!form.reportValidity()||!reason.input.value.trim())return;if(window.BridgewayLocal?.fresh()===false)return;
          if(r.h.status!=='Active'){C.say('This placement has changed. Reopen its record.');return;}
          const before=structuredClone(r.h);Object.assign(r.h,{status:'Left',end:new Date().toISOString().slice(0,10),reason:reason.input.value.trim(),verifiedHours:C.hours(s.id)});
          if(!C.commit(`College ended the placement for ${s.name}`)){Object.assign(r.h,before);render();return;}
          s.stage='Left';form.dataset.committed='true';d.close();render();
        });
      }));
      body.append(actions);opened=C.dialog('Placement record',body);
    }
    function render(){
      const all=records(),query=search.input.value.trim().toLowerCase();
      summary.replaceChildren();
      for(const [label,icon]of [['Needs setup','person-plus'],['Active training','briefcase'],['Completed','patch-check']]){
        const b=B('',()=>{selected=label;render();});b.className=`placement-summary${label==='Needs setup'&&all.some(r=>r.stage===label)?' needs-action':''}`;b.setAttribute('aria-pressed',String(selected===label));
        b.append(E('i',null,`bi bi-${icon}`),A(E('div'),E('span',label),E('strong',String(all.filter(r=>r.stage===label).length))),E('i',null,'bi bi-arrow-up-right'));b.querySelectorAll('i').forEach(i=>i.setAttribute('aria-hidden','true'));summary.append(b);
      }
      filters.replaceChildren();for(const label of labels){const b=B('',()=>{selected=label;render();});b.setAttribute('aria-pressed',String(selected===label));b.append(E('span',label),E('small',String(all.filter(r=>label==='All'||r.stage===label).length)));filters.append(b);}
      const matches=all.filter(r=>(selected==='All'||r.stage===selected)&&`${r.s.name} ${r.s.studentId} ${r.role} ${C.org(r.company)} ${r.s.supervisor||''}`.toLowerCase().includes(query));
      results.textContent=`${matches.length} of ${all.length} student internships`;content.replaceChildren();
      if(!matches.length){const empty=A(E('div',null,'placements-empty'),E('i',null,'bi bi-inbox'),E('h3',query?'No matching internships':selected==='Needs setup'?'No placements waiting for setup':'No internships here yet'),E('p',query?'Try a different student, company, or internship.':selected==='Needs setup'?'Company-accepted students will appear here when their training needs activation.':'Records will appear as students begin their internships.'));if(query||selected!=='All')empty.append(B('Clear filters',()=>{selected='All';search.input.value='';render();}));content.append(empty);return;}
      const table=E('table',null,'placements-table'),thead=E('thead'),tr=E('tr'),tbody=E('tbody');table.setAttribute('aria-label','Student internships');
      for(const title of ['Student','Internship / Company','Academic supervisor','Verified training','Status','Action']){const th=E('th',title);th.scope='col';tr.append(th);}thead.append(tr);
      for(const r of matches){const row=E('tr'),p=progress(r),person=A(E('div',null,'placement-person'),E('span',r.s.name.split(' ').map(x=>x[0]).slice(0,2).join(''),'placement-avatar'),A(E('div'),E('strong',r.s.name),E('small',r.s.studentId)));
        const training=r.app?E('span','Not started','cycle-muted'):A(E('div',null,'placement-training'),E('strong',`${p.hours} / 120 h`));
        if(!r.app){const meter=E('progress');meter.max=120;meter.value=p.hours;meter.setAttribute('aria-label',`Verified hours for ${r.s.name}`);training.append(meter);}
        const action=B(r.app?'Set up placement':'View placement',()=>view(r),!!r.app);action.setAttribute('aria-label',`${r.app?'Set up':'View'} placement for ${r.s.name}`);
        for(const child of [person,A(E('div',null,'placement-role'),E('strong',r.role),E('small',C.org(r.company))),E('span',r.s.supervisor||'Not assigned'),training,badge(r.stage),action])row.append(A(E('td'),child));tbody.append(row);
      }table.append(thead,tbody);content.append(table);
    }
    search.input.addEventListener('input',render);
    document.addEventListener('bridgeway:cycle-change',ev=>{if(ev.detail?.stored&&opened?.open&&opened.querySelector('.cycle-admission'))opened.close();render();});
    render();
  }));
})();
