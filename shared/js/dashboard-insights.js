/* Role-scoped dashboard charts. All values come from current workspace reports. */
(() => {
  'use strict';
  function summarize(C,role,students){
    const viewer=C.identity();
    const scoped=students.filter(s=>role==='company'?viewer==='company:'+s.company:role==='admin'?viewer==='admin:'+s.college:role==='supervisor'?s.supervisor==='Dr. Ahmad S.':role==='platform_admin'&&viewer==='platform');
    const trainees=scoped.filter(s=>(C.state.plans[s.id]||[]).length===8);
    const weeks=Array.from({length:8},(_,index)=>{
      const result={week:index+1,verified:0,submitted:0,revision:0,hours:0,pendingHours:0};
      trainees.forEach(s=>{const w=C.state.plans[s.id][index];if(w.status==='verified'){result.verified++;result.hours+=Math.min(15,Math.max(0,Number(w.actualHours)||0));}if(w.status==='submitted'){result.submitted++;result.pendingHours+=Math.min(15,Math.max(0,Number(w.actualHours)||0));}if(w.status==='revision')result.revision++;});
      return result;
    });
    const statuses={verified:0,submitted:0,revision:0,draft:0};
    const learners=trainees.map(s=>{const plan=C.state.plans[s.id];plan.forEach(w=>statuses[Object.hasOwn(statuses,w.status)?w.status:'draft']++);return {id:s.id,name:s.name,hours:plan.filter(w=>w.status==='verified').reduce((sum,w)=>sum+Math.min(15,Math.max(0,Number(w.actualHours)||0)),0)};});
    const completion={training:0,evaluations:0,college:0,completed:0,ended:0};
    trainees.forEach(s=>{
      const plan=C.state.plans[s.id],h=C.state.histories?.find(h=>h.student===s.id),certificate=C.state.certificates?.[s.id];
      if(h?.status==='Completed'||certificate&&certificate.placement===h?.id){completion.completed++;return;}
      if(h?.status==='Left'){completion.ended++;return;}
      const tasks=plan.flatMap(w=>(w.tasks||[]).filter(t=>!t.removedAt));
      const hours=learners.find(l=>l.id===s.id)?.hours||0;
      const trainingReady=plan.every(w=>w.status==='verified')&&hours>=120&&tasks.every(t=>(window.BridgewayWeeklyTasks?.taskStatus(t)||t.status)==='Completed');
      if(!trainingReady||h?.status!=='Active'){completion.training++;return;}
      const e=C.state.evaluations?.[s.id],a=C.state.academicEvaluations?.[s.id];
      const assessmentsReady=e&&e.company===h.company&&a&&a.placement===h.id&&a.companyDate===e.date&&a.criteria?.length===3&&a.criteria.every(c=>c.result==='Meets requirements');
      completion[assessmentsReady?'college':'evaluations']++;
    });
    return {trainees:trainees.length,weeks,statuses,learners,completion,verifiedHours:weeks.reduce((sum,w)=>sum+w.hours,0),verifiedReports:weeks.reduce((sum,w)=>sum+w.verified,0),plannedHours:trainees.length*120,plannedReports:trainees.length*8};
  }
  window.BridgewayDashboardInsights={summarize};
  document.addEventListener('DOMContentLoaded',()=>{
    const grid=document.querySelector('[data-dashboard-overview]'),C=window.BridgewayCycle;
    if(!grid||!C)return;
    const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
    const panel=E('section',null,'dashboard-insights');panel.setAttribute('aria-labelledby','trainingOverviewTitle');
    const header=E('header'),heading=E('div'),title=E('h2','Training overview');title.id='trainingOverviewTitle';
    const scope=E('p','Eight-week training · 15 hours per week');heading.append(title,scope);
    const controls=E('div',null,'insight-switch');controls.setAttribute('role','group');controls.setAttribute('aria-label','Training chart measure');header.append(heading,controls);
    let mode='hours',selected=0,data;
    const buttons=['hours','reports'].map(value=>{const b=E('button',value==='hours'?'Hours':'Reports');b.type='button';b.addEventListener('click',()=>{mode=value;render();});controls.append(b);return b;});
    const content=E('div',null,'insight-content'),summary=E('div',null,'insight-summary'),ring=E('div',null,'insight-ring');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('aria-hidden','true');
    for(const name of ['track','fill']){const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','60');circle.setAttribute('cy','60');circle.setAttribute('r','50');circle.setAttribute('class','insight-ring-'+name);svg.append(circle);}
    const percent=E('strong'),caption=E('div',null,'insight-summary-copy'),total=E('strong'),label=E('span'),note=E('small');ring.append(svg,percent);caption.append(total,label,note);summary.append(ring,caption);
    const chart=E('div',null,'insight-chart'),legend=E('div',null,'insight-legend');
    for(const [cls,text]of [['verified','Verified'],['submitted','In review']])legend.append(E('span',text,'is-'+cls));
    const plot=E('div',null,'insight-plot'),detail=E('p',null,'insight-detail');detail.id='trainingChartDetail';detail.setAttribute('role','status');
    const bars=Array.from({length:8},(_,index)=>{const b=E('button');b.type='button';b.setAttribute('aria-describedby',detail.id);const tooltip=E('span',null,'insight-tooltip');tooltip.setAttribute('aria-hidden','true');const visual=E('span',null,'insight-bar'),verified=E('span',null,'insight-bar-verified'),pending=E('span',null,'insight-bar-pending');visual.setAttribute('aria-hidden','true');visual.append(verified,pending);b.append(tooltip,visual,E('span',String(index+1).padStart(2,'0'),'insight-week'));const choose=()=>{selected=index;renderSelection();};b.addEventListener('mouseenter',choose);b.addEventListener('focus',choose);b.addEventListener('click',choose);plot.append(b);return {b,tooltip,verified,pending};});
    const card=(name,copy,cls)=>{const n=E('section',null,'insight-widget '+cls);const h=E('header');h.append(E('h3',name),E('p',copy));n.append(h);return n;};
    const completion=card('Training completion status','Where students are in the completion process','insight-completion');
    const completionRows=E('div',null,'insight-completion-rows'),completionNote=E('p',null,'insight-detail');completion.append(completionRows,completionNote);
    const S=(tag,attrs)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
    const weekly=card('Weekly activity','Select a week to inspect its recorded totals','insight-weekly');weekly.append(legend,plot,detail);
    const distribution=card('Report distribution','Share of all eight-week reports','insight-distribution'),statusLegend=E('div',null,'insight-status-legend');distribution.append(summary,statusLegend);
    const studentProgress=card('Student progress','Verified hours · 120-hour target per student','insight-students'),studentRows=E('div',null,'insight-student-rows');studentProgress.append(studentRows);
    const pipeline=card('Report pipeline','Submission and verification are separate steps','insight-pipeline'),pipelineRows=E('div',null,'insight-pipeline-rows');pipeline.append(pipelineRows);
    const top=E('div',null,'insight-analytics-top'),bottom=E('div',null,'insight-analytics-bottom');top.append(completion,weekly);bottom.append(distribution,studentProgress,pipeline);panel.append(header,top,bottom);grid.after(panel);
    const overview={admin:'tab-overview',company:'tab-posts',supervisor:'tab-roster',platform_admin:'platform-overview'}[document.body.dataset.portalRole];
    function visibility(){const wasHidden=panel.hidden;panel.hidden=!document.getElementById(overview)?.classList.contains('is-active');if(wasHidden&&!panel.hidden)requestAnimationFrame(render);}
    function renderSelection(){
      const w=data.weeks[selected];bars.forEach(({b},index)=>b.setAttribute('aria-pressed',String(index===selected)));
      detail.textContent=mode==='hours'?`Week ${w.week} · ${w.hours} hours verified · ${w.pendingHours} hours in review`:`Week ${w.week} · ${w.verified} verified · ${w.submitted} in review · ${w.revision} needing revision`;

    }
    function render(){
      data=summarize(C,document.body.dataset.portalRole,window.BridgewayPartners.students);
      const hours=mode==='hours',value=hours?data.verifiedHours:data.verifiedReports,max=hours?data.plannedHours:data.plannedReports,ratio=max?Math.min(1,value/max):0;
      const reportRatio=data.plannedReports?data.verifiedReports/data.plannedReports:0;
      percent.textContent=Math.round(reportRatio*100)+'%';svg.querySelector('.insight-ring-fill').style.strokeDashoffset=String(314.16*(1-reportRatio));
      total.textContent=String(data.plannedReports);label.textContent='Weekly reports';note.textContent=data.trainees?`${data.trainees} training plans`:'No training plans yet';
      summary.setAttribute('aria-label',`${data.verifiedReports} of ${data.plannedReports} weekly reports verified`);
      svg.querySelectorAll('.insight-ring-segment').forEach(n=>n.remove());statusLegend.replaceChildren();let arcOffset=data.statuses.verified/(data.plannedReports||1)*314.16;
      const statusNames={verified:'Verified',submitted:'In review',revision:'Revision',draft:'Planned'};
      for(const [key,count]of Object.entries(data.statuses)){
        if(key!=='verified'&&count){const length=count/(data.plannedReports||1)*314.16;svg.append(S('circle',{cx:60,cy:60,r:50,class:'insight-ring-segment status-'+key,'stroke-dasharray':`${Math.max(0,length-2)} ${314.16-length+2}`,'stroke-dashoffset':String(-arcOffset)}));arcOffset+=length;}
        const row=E('div');row.append(E('span',statusNames[key],'status-'+key),E('strong',`${data.plannedReports?Math.round(count/data.plannedReports*100):0}%`),E('small',String(count)));statusLegend.append(row);
      }
      studentRows.replaceChildren();data.learners.slice(0,5).forEach(s=>{const row=E('div',null,'insight-student-row'),top=E('div'),track=E('div',null,'insight-horizontal-track'),fill=E('span');top.append(E('span',s.name),E('strong',`${s.hours} / 120 h`));fill.style.width=`${s.hours/120*100}%`;track.append(fill);row.append(top,track);studentRows.append(row);});
      if(!data.learners.length)studentRows.append(E('p','No training plans yet.','portal-muted'));
      if(data.learners.length>5)studentRows.append(E('small',`Showing 5 of ${data.learners.length} students. Open the student directory for all records.`));
      pipelineRows.replaceChildren();const submitted=data.statuses.verified+data.statuses.submitted+data.statuses.revision;
      for(const [text,count]of [['Planned',data.plannedReports],['Submitted',submitted],['Verified',data.verifiedReports]]){const row=E('div',null,'insight-pipeline-row'),track=E('div',null,'insight-horizontal-track'),fill=E('span');fill.style.width=`${data.plannedReports?count/data.plannedReports*100:0}%`;track.append(fill);row.append(E('span',text),track,E('strong',String(count)));pipelineRows.append(row);}
      completionRows.replaceChildren();
      const stages=[['training','Training in progress','Weekly reports, verified hours or assigned tasks still need to be completed.'],['evaluations','Final evaluations pending','Training requirements are met; the company evaluation or academic assessment is still needed.'],['college','Ready for college confirmation','Training requirements and both evaluations meet the requirements. College confirmation is still needed.'],['completed','Completed training','The placement is recorded as completed or has a current college-issued certificate.']];
      if(data.completion.ended)stages.push(['ended','Ended early','The placement ended before completion.']);
      for(const [key,text,description]of stages){const row=E('div',null,'insight-completion-row stage-'+key),label=E('div'),track=E('div',null,'insight-horizontal-track'),fill=E('span'),count=data.completion[key];label.append(E('span',text),E('strong',String(count)));row.title=description;row.setAttribute('aria-label',text+': '+count+'. '+description);fill.style.width=(data.trainees?count/data.trainees*100:0)+'%';track.setAttribute('aria-hidden','true');track.append(fill);row.append(label,track);completionRows.append(row);}
      completionNote.textContent=data.trainees?data.trainees+' students with training plans · Current placement records':'No students have an eight-week training plan yet.';
      buttons.forEach((b,index)=>b.setAttribute('aria-pressed',String(index===(hours?0:1))));
      const ceiling=Math.max(1,...data.weeks.map(w=>hours?w.hours+w.pendingHours:w.verified+w.submitted));
      data.weeks.forEach((w,index)=>{const verified=hours?w.hours:w.verified,pending=hours?w.pendingHours:w.submitted;bars[index].verified.style.height=`${verified/ceiling*100}%`;bars[index].pending.style.height=`${pending/ceiling*100}%`;bars[index].tooltip.textContent=`${verified}${hours?'h':''} verified · ${pending}${hours?'h':''} in review`;bars[index].b.setAttribute('aria-label',`Week ${w.week}: ${verified} verified, ${pending} in review${hours?' hours':' reports'}`);});
      renderSelection();visibility();
    }
    render();document.addEventListener('bridgeway:cycle-change',render);
    const root=document.getElementById(overview);if(root)new MutationObserver(visibility).observe(root,{attributes:true,attributeFilter:['class']});
  });
})();
