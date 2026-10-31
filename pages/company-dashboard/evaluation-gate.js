/* Final ratings open only after all eight reports and 120 hours are verified. */
(()=>{
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>queueMicrotask(()=>{
    const C=window.BridgewayCycle,H=window.BridgewayTrainingHours,root=document.getElementById('companyEvaluationDetail'),picker=document.getElementById('evaluationStudentSelect');
    if(!C||!H||!root||!picker)return;
    const {E,A}=C,lock=E('section',null,'company-evaluation-lock'),disabled=new Map();
    let previousId='',previousReady;
    lock.setAttribute('aria-label','Evaluation availability');lock.setAttribute('role','status');root.append(lock);
    function sync(){
      const id=picker.value,plan=C.state.plans[id]||[],ready=H.evaluationReady(plan),verified=plan.filter(w=>w.status==='verified').length;
      [...picker.options].forEach(option=>{option.dataset.status=`${(C.state.plans[option.value]||[]).filter(w=>w.status==='verified').length} of 8 weeks verified`;});
      document.querySelectorAll('#companyEvaluationStudents .company-student-button').forEach(button=>{const student=window.BridgewayPartners.students.find(s=>s.name===button.querySelector('strong')?.textContent),line=[...button.querySelectorAll('span')].at(-1);if(student&&line)line.textContent=`${(C.state.plans[student.id]||[]).filter(w=>w.status==='verified').length} of 8 weeks verified`;});
      root.classList.toggle('is-evaluation-locked',!ready);lock.hidden=ready||!id;
      if(!id)return;
      [...root.children].filter(n=>n!==lock&&!n.matches('.assessment-header,.bw-detail-toolbar')).forEach(n=>{n.inert=!ready;});
      root.querySelectorAll('.bw-scale-btn,#evaluationComments,#submitRubricBtn,#resetRubricBtn').forEach(control=>{
        if(!ready){if(!disabled.has(control))disabled.set(control,control.disabled);control.disabled=true;}
        else if(disabled.has(control)){control.disabled=disabled.get(control);disabled.delete(control);}
      });
      if(previousId!==id||previousReady!==ready)window.BridgewayUX?.remember(root);
      previousId=id;previousReady=ready;
      if(ready)return;
      const icon=E('i',null,'bi bi-lock');icon.setAttribute('aria-hidden','true');
      const progress=E('progress');progress.max=8;progress.value=verified;progress.setAttribute('aria-label',`${verified} of 8 weekly reports verified`);
      lock.replaceChildren(icon,E('h3','Evaluation opens after week 8'),E('p',`Complete all eight weeks of training and have every report approved by the academic supervisor before rating ${C.student(id)?.name||'this student'}.`),A(E('div',null,'evaluation-lock-progress'),E('strong',`${verified} of 8 weeks verified`),E('span',`${C.hours(id)} / 120 hours`),progress),E('small','The evaluation form will unlock when both requirements are met.'));
    }
    const original=window.selectInternForRubric;
    window.selectInternForRubric=function(...args){const result=original.apply(this,args);if(result?.then)return result.then(value=>{sync();return value;});sync();return result;};
    picker.addEventListener('change',sync);document.addEventListener('bridgeway:cycle-change',sync);sync();
  }));
})();
