/* Fixed eight-week training credit. Dates and task completion never verify hours. */
(() => {
  'use strict';
  const WEEKS=8, WEEKLY=15, TOTAL=WEEKS*WEEKLY;
  const verified=plan=>(plan||[]).slice(0,WEEKS).reduce((sum,w)=>sum+(w.status==='verified'?Math.min(WEEKLY,Math.max(0,Number(w.actualHours)||0)):0),0);
  const unfinishedTasks=week=>(week.tasks||[]).filter(task=>!task.removedAt&&task.submissions?.at(-1)?.review?.outcome!=='Completed');
  const evaluationReady=plan=>Array.isArray(plan)&&plan.length===WEEKS&&plan.every(w=>w.status==='verified')&&verified(plan)===TOTAL;
  function focusWeek(plan,after){
    if(Number.isInteger(after))return Math.min(WEEKS-1,Math.max(0,after+1));
    const weeks=(plan||[]).slice(0,WEEKS),unfinished=weeks.findIndex(w=>w.status!=='verified');
    return unfinished>=0?unfinished:Math.max(0,weeks.length-1);
  }
  function migrate(state){
    if(state.trainingHoursVersion===2)return false;
    Object.values(state.plans||{}).forEach(plan=>plan.forEach(w=>{
      if(w.hours!==WEEKLY||Number(w.actualHours)>WEEKLY){
        w.legacyHours ||= {planned:w.hours,reported:w.actualHours};
      }
      w.hours=WEEKLY;
      w.actualHours=['submitted','verified','revision'].includes(w.status)?WEEKLY:0;
    }));
    // Keep archived placements and previously issued certificates intact.
    state.trainingHoursVersion=2;
    return true;
  }
  function transition(week,action,actor,notes,persist){
    const before=structuredClone(week),at=new Date().toISOString();
    if(action==='submit'){
      if(actor!=='company'||!['draft','revision'].includes(week.status))throw new Error('Only an unfinished company report can be submitted.');
      if(unfinishedTasks(week).length)throw new Error('Complete and review every active task for this week before submitting its report.');
      if(!String(notes||'').trim())throw new Error('Add weekly feedback before ending the week.');
      week.notes=notes.trim();week.hours=WEEKLY;week.actualHours=WEEKLY;week.status='submitted';week.endedAt=at;
    }else if(action==='verify'||action==='revise'){
      if(actor!=='supervisor'||week.status!=='submitted')throw new Error('Only a submitted report can be reviewed by its supervisor.');
      if(action==='verify'&&unfinishedTasks(week).length)throw new Error('This week still has unfinished tasks. Request a revision so the company can complete its task reviews before approval.');
      if(action==='revise'&&!String(notes||'').trim())throw new Error('Explain the required changes.');
      week.review=String(notes||'').trim();week.status=action==='verify'?'verified':'revision';
      if(action==='verify'){week.actualHours=WEEKLY;week.verifiedAt=at;}
    }else throw new Error('Unknown report action.');
    week.updated=at;
    try{if(persist()===false)throw new Error('The report could not be saved. Your entries are still available; please retry.');}
    catch(error){for(const key of Object.keys(week))delete week[key];Object.assign(week,before);throw error;}
  }
  window.BridgewayTrainingHours={WEEKS,WEEKLY,TOTAL,verified,migrate,transition,focusWeek,unfinishedTasks,evaluationReady};
})();
