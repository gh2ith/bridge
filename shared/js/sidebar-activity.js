/* Sidebar dots indicate unseen activity, never directory totals. Session-local only. */
(() => {
 'use strict';
 const unread=(records,seen={})=>records.some(([id,version])=>seen[id]!==version);
 function sources(C,role,model){
  const state=C.state,viewer=C.identity(),items={};
  const ticketTab=role==='platform_admin'?'platform-issues':'tab-tickets';
  items[ticketTab]=state.tickets.filter(t=>C.ticketVisible(t)).filter(t=>{
   const last=t.messages.at(-1);if(!last)return false;
   if(last.sender)return last.sender!==viewer;
   return t.owner===viewer?last.author!==t.messages[0]?.author:last.author===t.messages[0]?.author;
  }).map(t=>[t.id,JSON.stringify([t.messages.length,t.messages.at(-1)?.at,t.updated,t.status])]);
  if(role==='supervisor'||role==='company'){
   const students=model.students.filter(s=>role==='company'?s.company==='company-1':s.supervisor==='Dr. Ahmad S.');
   items[role==='company'?'tab-weekly-reports':'tab-reports']=students.flatMap(s=>(state.plans[s.id]||[]).flatMap((w,i)=>w.status===(role==='company'?'revision':'submitted')?[[s.id+':'+i,JSON.stringify([w.updated,w.revision,w.status])]]:[]));
   if(role==='supervisor')items['tab-endorsement']=students.flatMap(s=>state.evaluations?.[s.id]?[[s.id,JSON.stringify(state.evaluations[s.id])]]:[]);
  }
  if(role==='company'){
   items['tab-candidates']=state.applications.filter(a=>a.company==='company-1'&&a.status==='Pending').map(a=>[a.id,a.at||a.id]);
   items['tab-meetings']=state.applications.filter(a=>a.company==='company-1'&&['Confirmed','Reschedule requested'].includes(a.interview?.status)).map(a=>[a.id,JSON.stringify(a.interview)]);
  }
  if(role==='student'){
   items['tab-applications']=state.applications.filter(a=>'student:'+a.student===viewer&&(a.status!=='Pending'||a.interview)).map(a=>[a.id,JSON.stringify([a.status,a.interview])]);
   const id=viewer.slice('student:'.length);
   items['tab-progress']=(state.plans[id]||[]).flatMap((w,i)=>(w.tasks||[]).filter(t=>!t.removedAt).map(t=>[t.id,JSON.stringify([t.updatedAt,t.submissions?.at(-1)?.review])]));
   if(state.certificates?.[id])items['tab-progress'].push(['certificate',state.certificates[id].id]);
  }
  if(['company','supervisor','admin'].includes(role)){
   const students=model.students.filter(s=>role==='company'?s.company==='company-1':role==='admin'?s.college==='college-1':s.supervisor==='Dr. Ahmad S.');
   items['tab-progress-monitor']=students.flatMap(s=>(state.plans[s.id]||[]).flatMap(w=>(w.tasks||[]).filter(t=>!t.removedAt).map(t=>[t.id,JSON.stringify([t.updatedAt,t.submissions?.length,t.submissions?.at(-1)?.review])])));
   if(role==='admin')items['tab-completion']=students.filter(s=>state.academicEvaluations?.[s.id]).map(s=>[s.id,JSON.stringify(state.academicEvaluations[s.id])]);
  }
  if(role==='admin')items['tab-approved']=state.applications.filter(a=>a.status==='Accepted'&&model.students.find(s=>s.id===a.student)?.college==='college-1').map(a=>[a.id,JSON.stringify([a.status,a.at])]);
  if(role==='platform_admin')items['platform-publications']=state.listings.filter(l=>l.status==='Pending review').map(l=>[l.id,JSON.stringify([l.updated,l.review,l.title])]);
  return items;
 }
 window.BridgewaySidebarActivity={unread,sources};
 document.addEventListener('DOMContentLoaded',()=>queueMicrotask(()=>{
  const C=window.BridgewayCycle,model=window.BridgewayPartners;if(!C||!model)return;
  const role=document.body.dataset.portalRole,key='bridgeway:sidebar-seen:v1:'+C.identity();let seen={};
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))seen=saved;}catch{}
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(seen));}catch{}};
  function mark(tab,records){seen[tab]=Object.fromEntries(records);save();}
  function sync(){
   const records=sources(C,role,model);
   document.querySelectorAll('.bw-masar-nav [data-tab]').forEach(nav=>{
    const tab=nav.dataset.tab,entries=records[tab]||[];
    const panel=document.getElementById(tab);
    if(nav.classList.contains('is-active')&&panel?.classList.contains('is-active'))mark(tab,entries);
    const fresh=unread(entries,seen[tab]);let dot=nav.querySelector('.bw-nav-activity');
    if(!dot&&fresh){dot=document.createElement('span');dot.className='bw-nav-activity';dot.setAttribute('aria-hidden','true');nav.append(dot);}
    if(dot)dot.hidden=!fresh;
    const label=nav.querySelector('span:not(.bw-tab-badge):not(.company-nav-count):not(.bw-nav-activity)')?.textContent.trim()||nav.getAttribute('aria-label')?.split(',')[0]||'Workspace';
    nav.setAttribute('aria-label',label+(fresh?', new activity':''));nav.title=label+(fresh?' · New activity':'');
   });
  }
  document.querySelectorAll('.bw-masar-nav [data-tab]').forEach(nav=>nav.addEventListener('click',()=>{mark(nav.dataset.tab,sources(C,role,model)[nav.dataset.tab]||[]);sync();}));
  document.addEventListener('bridgeway:cycle-change',sync);
  window.addEventListener('hashchange',sync);
  const observer=new MutationObserver(sync);document.querySelectorAll('.bw-tab-panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));sync();
 }));
})();
