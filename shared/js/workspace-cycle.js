/* Connected workspace. Local workspace state only; never backend authorization. */
(() => {
  'use strict';
  const key='bridgeway:workspace-cycle:v1';
  const H=window.BridgewayTrainingHours;
  const reportGates=new WeakMap();
  const model=window.BridgewayPartners;
  if(!model)return;
  const topics=['Orientation & environment','Data foundations','Application development','Testing & deployment','Integration & quality','Endpoints & evaluation','Delivery & documentation','Handover & reflection'];
  const objectives=[['Complete environment setup','Review the team workflow','Agree on a learning baseline'],['Model a small dataset','Implement validated queries','Explain the data model'],['Build a working feature','Use source control and code review','Demonstrate the feature'],['Write repeatable tests','Run the delivery pipeline','Document test results'],['Integrate a service','Investigate a performance issue','Complete a quality review'],['Implement a REST endpoint','Add integration test coverage','Demonstrate validation and error handling'],['Prepare release documentation','Resolve review findings','Present a delivery walkthrough'],['Hand over project artifacts','Reflect on learning outcomes','Present the completed project']];
  const now=()=>new Date().toISOString();
  const seed=()=>({version:1,plans:Object.fromEntries(model.students.filter(s=>s.stage==='Placed').map(s=>[s.id,topics.map((title,i)=>({title,hours:15,revision:1,objectives:objectives[i].map((text,j)=>({id:`${i}-${j}`,text,done:i<s.weeks-1||s.weeks===8||i===s.weeks-1&&j<2,evidence:i<s.weeks?'Mentor walkthrough and project review':''})),status:i<s.weeks-1||s.weeks===8?'verified':i===s.weeks-1?'submitted':'draft',actualHours:i<s.weeks?15:0,notes:i<s.weeks?'Completed the planned work and demonstrated it to the company mentor.':'',review:'',ratings:[],locked:false,updated:now()}))])),
    listings:[{id:'listing-tech',title:'Frontend React Developer Intern',company:'company-1',category:'software',location:'Amman · Hybrid',skills:'React, TypeScript, REST APIs',description:'Build accessible interfaces, connect them to APIs, and test the experience with your mentor.',capacity:3,deadline:'2026-12-10',status:'Published',review:'Approved listing',created:now()},{id:'listing-nexus',title:'.NET Full-Stack Developer Intern',company:'company-2',category:'software',location:'Amman · On site',skills:'C#, ASP.NET Core, SQL Server',description:'Develop application features, review database queries, and write integration tests.',capacity:2,deadline:'2026-11-30',status:'Published',review:'Approved listing',created:now()},{id:'listing-cloud',title:'Cloud & DevOps Trainee',company:'company-3',category:'cloud',location:'Amman · Hybrid',skills:'Docker, AWS, CI/CD',description:'Work with delivery pipelines and cloud services under structured mentorship.',capacity:4,deadline:'2026-11-25',status:'Published',review:'Approved listing',created:now()},{id:'listing-review',title:'Quality Engineering Intern',company:'company-1',category:'software',location:'Amman · Hybrid',skills:'Testing, Git, JavaScript',description:'Create automated checks and document test evidence for a product team.',capacity:2,deadline:'2026-12-15',status:'Pending review',review:'',created:now()}],
    tickets:[{id:'BW-103',subject:'Week 6 report needs clarification',owner:'student:ghaith',priority:'Normal',status:'In progress',context:'Ghaith Amourah · Week 6',created:now(),messages:[{author:'Ghaith Amourah',body:'Could you help confirm which training evidence I should provide for week 6?',at:now()}]},{id:'BW-102',subject:'Administrator contact update',owner:'admin:college-1',priority:'Normal',status:'Awaiting requester',context:'Al-Balqa Applied University',created:now(),messages:[{author:'College Admin',body:'Please help us update the college administrator contact.',at:now()},{author:'Platform Admin',body:'Please confirm the replacement contact through your institutional account.',at:now()}]}],
    histories:[{id:'placement-alice',student:'alice',company:'company-1',role:'Frontend React Developer Intern',start:'2026-09-20',end:'',status:'Active',reason:''},{id:'placement-ghaith',student:'ghaith',company:'company-1',role:'Software Engineering Intern',start:'2026-09-06',end:'',status:'Active',reason:''},{id:'placement-sarah',student:'sarah',company:'company-2',role:'Full-Stack .NET Developer Intern',start:'2026-08-10',end:'2026-10-04',status:'Completed',reason:'Eight weeks and 120 hours verified.'},{id:'placement-alice-old',student:'alice',company:'company-2',role:'Application Development Trainee',start:'2026-07-01',end:'2026-07-15',status:'Left',verifiedHours:80,reason:'placement ended after a schedule conflict.'}],audit:[]});
  let state;
  try {state=JSON.parse(localStorage.getItem(key));}catch{}
  if(!state||state.version!==1||!Array.isArray(state.listings)||!state.plans)state=seed();
  if(H.migrate(state)){try{if(window.BridgewayLocal?.fresh()!==false)localStorage.setItem(key,JSON.stringify(state));}catch{ /* Retry migration on the next successful save. */ }}
  // Migrate the retired initial ticket state; messages and routing are unchanged.
  state.tickets.forEach(ticket=>{if(ticket.status==='Open')ticket.status='In progress';});
  state.applications ||= [];
  if(!state.seededApplication){state.listings.push({id:'listing-software',title:'Software Engineering Intern',company:'company-1',category:'software',location:'Amman · Hybrid',skills:'C#, ASP.NET Core, PostgreSQL',description:'Build and test application services with a company mentor and an eight-week learning plan.',capacity:3,deadline:'2026-11-30',status:'Published',review:'Approved listing',created:now()});state.applications.push({id:'sample-omar',student:'omar',listing:'listing-software',company:'company-1',status:'Pending',at:now()});state.seededApplication=true;}
  state.evaluations ||= {sarah:{scores:[5,5,4,5,4,4,5,5],comments:'Completed the training requirements with strong ownership and reliable delivery.',date:'2026-10-04T12:00:00Z',company:'company-2'}};
  // Normalize only known system-authored seed copy; never rewrite users' tickets or notes.
  state.listings.forEach(listing=>{if(listing.review==='Approved sample listing')listing.review='Approved listing';});
  state.histories.forEach(history=>{if(history.reason==='Sample history: placement ended after a schedule conflict.')history.reason='Placement ended after a schedule conflict.';});
  state.audit.forEach(event=>{if(event.action==='Sample application withdrawn')event.action='Application withdrawn';});
  for(const s of model.students){const app=state.applications.find(a=>a.student===s.id&&['Accepted','Placed'].includes(a.status));if(app){s.company=app.company;s.role=state.listings.find(l=>l.id===app.listing)?.title;s.stage=app.status==='Placed'?'Placed':'Awaiting placement';s.supervisor=window.BridgewayAcademicAssignments?window.BridgewayAcademicAssignments.get(s.name,s.college):app.supervisor||null;}}
  for(const s of model.students){const h=state.histories.find(h=>h.student===s.id);if(h&&['Left','Completed'].includes(h.status)&&!state.applications.some(a=>a.student===s.id&&a.status==='Accepted'))s.stage=h.status;}
  const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
  window.BridgewayReportVisibility.initialize(state,model.students);
  const reportRestricted=id=>window.BridgewayReportVisibility.restricted(state,model.students,id);
  const A=(node,...children)=>{node.append(...children.filter(Boolean));return node;};
  const B=(text,fn,primary=false)=>{const n=E('button',text,primary?'cycle-button is-primary':'cycle-button');n.type='button';n.addEventListener('click',fn);return n;};
  const notice=(text)=>window.showPortalToast?.(text);
  function commit(action) {if(window.BridgewayLocal?.fresh()===false)return false;state.audit.unshift({action,at:now(),role:document.body.dataset.portalRole});let stored=true;try{localStorage.setItem(key,JSON.stringify(state));}catch{stored=false;notice('Browser storage is unavailable. Changes could not be saved.');}document.dispatchEvent(new CustomEvent('bridgeway:cycle-change',{detail:{action,stored}}));if(stored&&!/^Objective (?:checklist|evidence|assessment)/i.test(action))notice(action);return stored;}
  const org=id=>model.organizations.find(o=>o.id===id)?.name||'Not assigned';
  const student=id=>model.students.find(s=>s.id===id);
  const hours=id=>H.verified(state.plans[id]);
  const status=(text)=>E('span',({draft:'Draft report',submitted:'In review',revision:'Revision requested',verified:'Verified'})[text]||text,`cycle-status ${/verified|Published|Completed|Resolved|Accepted|Placed|^Active$/i.test(text)?'is-good':/Pending|submitted|revision|Open/i.test(text)?'is-wait':''}`);
  const field=(label,value='',type='text')=>{const wrap=E('label',null,'cycle-field');const input=E(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;wrap.append(E('span',label),input);return {wrap,input};};
  const select=(label,options,value)=>{const wrap=E('label',null,'cycle-field'),input=E('select');options.forEach(item=>{const [v,t]=Array.isArray(item)?item:[item,item];const o=E('option',t);o.value=v;input.append(o);});input.value=value;wrap.append(E('span',label),input);return {wrap,input};};
  const message=E('p','','cycle-live');message.setAttribute('role','status');
  function say(text){message.textContent=text;notice(text);}
  function dialog(title,content){
    const d=E('dialog',null,'cycle-dialog'),h=E('h2',title);h.id=`cycle-title-${crypto.randomUUID()}`;d.setAttribute('aria-labelledby',h.id);
    const form=content.matches('form')?content:null;
    const capture=()=>JSON.stringify(form?[...form.querySelectorAll('input,textarea,select')].filter(n=>!n.disabled).map(n=>[n.dataset?.credential==='true'?'password':n.type,n.type==='checkbox'?n.checked:n.dataset?.credential==='true'?n.value.length:n.value]):[]);
    const baseline=capture();let asking=false;
    function dismiss(){if(!form||form.dataset.committed==='true'||capture()===baseline){d.close();return;}if(asking)return;asking=true;const confirmation=E('dialog',null,'cycle-dialog');confirmation.setAttribute('aria-label','Discard draft changes?');confirmation.append(E('h2','Discard draft changes?'),E('p','Your unfinished entries will be cleared.'));confirmation.append(A(E('div',null,'cycle-actions'),B('Keep editing',()=>confirmation.close()),B('Discard draft',()=>{confirmation.close();d.close();})));confirmation.addEventListener('close',()=>{asking=false;confirmation.remove();});window.BridgewayUX?.decorateConfirmation(confirmation,'Discard draft changes?');document.body.append(confirmation);confirmation.showModal();confirmation.querySelector('button')?.focus();}
    const close=B('Close',dismiss);d.append(A(E('header'),h,close),content);if(!form&&/^(?:Resolve|Withdraw|Cancel|Delete|Pause|Resume|Reject|Accept|Approve|Verify|Discard)\b/i.test(title))window.BridgewayUX?.decorateConfirmation(d,title);const opener=document.activeElement;
    d.addEventListener('cancel',ev=>{if(form&&form.dataset.committed!=='true'&&capture()!==baseline){ev.preventDefault();dismiss();}});
    d.addEventListener('close',()=>{d.remove();opener?.isConnected&&opener.focus({preventScroll:true});},{once:true});document.body.append(d);d.showModal();return d;
  }
  const section=(title,copy)=>A(E('section',null,'cycle-section'),A(E('header',null,'cycle-heading'),A(E('div'),E('h2',title),copy?E('p',copy):null)));
  function nav(id,label,icon='bi-grid') {
    const n=B('',()=>{document.querySelectorAll('.bw-tab-panel').forEach(p=>p.classList.toggle('is-active',p.id===id));document.querySelectorAll('.bw-tab-btn[data-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.tab===id));history.replaceState(null,'',`#${id}`);});n.className='bw-masar-item bw-tab-btn';n.dataset.tab=id;n.setAttribute('aria-label',label);n.append(E('i',null,`bi ${icon}`),E('span',label));document.querySelector('.bw-masar-nav')?.append(n);
    const p=E('section',null,'bw-tab-panel');p.id=id;document.querySelector('.bw-main-content')?.append(p);return p;
  }
  const identity=()=>{const role=document.body.dataset.portalRole;return role==='student'?`student:${window.BridgewayStudent.current().id}`:role==='company'?'company:company-1':role==='admin'?'admin:college-1':role==='supervisor'?'supervisor:ahmad':'platform';};
  const author=()=>document.body.dataset.portalRole==='student'?window.BridgewayStudent.current().name:document.body.dataset.portalRole==='company'?'Tech Corp Inc.':document.body.dataset.portalRole==='supervisor'?'Dr. Ahmad S.':document.body.dataset.portalRole==='admin'?'College Admin':'Platform Admin';
  // Routing is presentation logic for this browser, not server authorization.
  function supervisorAccount(owner){
    if(owner==='supervisor:ahmad')return {name:'Dr. Ahmad S.',college:'college-1'};
    let accounts=[];try{accounts=JSON.parse(localStorage.getItem('bridgeway:managed-accounts:v1')||'[]');}catch{}
    return Array.isArray(accounts)?accounts.find(a=>a.type==='supervisor'&&'supervisor:'+a.id===owner):null;
  }
  function ticketViewer(viewer=identity()){
    const account=supervisorAccount(viewer);
    return account?`supervisor:${account.college}:${account.name}`:viewer;
  }
  function ticketRecipient(ticket){
    if(ticket.owner?.startsWith('student:')){
      const s=model.students.find(s=>'student:'+s.id===ticket.owner);
      const name=s&&(window.BridgewayAcademicAssignments?window.BridgewayAcademicAssignments.get(s.name,s.college):s.supervisor);
      return name?`supervisor:${s.college}:${name}`:'';
    }
    if(ticket.owner?.startsWith('supervisor:')){
      const college=supervisorAccount(ticket.owner)?.college;
      return college?'admin:'+college:'';
    }
    return /^(company|admin):/.test(ticket.owner||'')?'platform':'';
  }
  function ticketVisible(ticket,viewer=identity()){
    return ticket.owner===viewer||Boolean(ticketRecipient(ticket)&&ticketRecipient(ticket)===ticketViewer(viewer));
  }
  function ticketCanManage(ticket,viewer=identity()){
    return Boolean(ticketRecipient(ticket)&&ticketRecipient(ticket)===ticketViewer(viewer));
  }
  function ticketDestinationLabel(ticket){
    const recipient=ticketRecipient(ticket);
    return recipient==='platform'?'Platform Admin':recipient.startsWith('admin:')?'College Admin · '+org(recipient.slice(6)):recipient.startsWith('supervisor:')?recipient.split(':').slice(2).join(':'):'Awaiting supervisor assignment';
  }
  function ticketSheets({view='all',ticketId=''}={}){
    if(!['all','mine','received'].includes(view))throw new Error('Unknown ticket view');
    const records=state.tickets.filter(t=>ticketVisible(t)&&(!ticketId||t.id===ticketId)&&(view==='all'||view==='mine'&&t.owner===identity()||view==='received'&&ticketCanManage(t))).slice().sort((a,b)=>String(b.messages.at(-1)?.at||b.created).localeCompare(String(a.messages.at(-1)?.at||a.created)));
    const dateValue=value=>{
      if(!value||!Number.isFinite(Date.parse(value)))return null;
      const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Amman'}).formatToParts(new Date(value));
      const get=type=>parts.find(p=>p.type===type).value;
      return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00Z`);
    };
    const title=ticketId?'Ticket record':view==='mine'?'My tickets':view==='received'?'Received tickets':'Support tickets';
    const note=`Exported ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date())}. ${records.length} ${records.length===1?'ticket':'tickets'}.`;
    return [
      {name:'Tickets',title,note,context:'Records visible in the selected ticket view. Dates use Amman time.',widths:[19,36,25,22,26,16,16,44],freezeColumns:1,headers:['Ticket ID','Subject','Category','Status','Opened by','Opened','Last updated','Related details'],rows:records.map(t=>[t.id,t.subject,t.category||'General support',t.status,t.messages[0]?.author||'',dateValue(t.created),dateValue(t.updated||t.messages.at(-1)?.at||t.created),t.context||''])},
    ];
  }
  const date=v=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Amman'}).format(new Date(v));
  window.BridgewayCycle={get state(){return state;},commit,org,student,hours,E,A,B,status,field,select,dialog,section,say,date,identity};
  window.BridgewayCycle.reportRestricted=reportRestricted;
  Object.assign(window.BridgewayCycle,{ticketRecipient,ticketVisible,ticketCanManage,ticketDestinationLabel,ticketSheets,mountTickets:tickets});
  const published=()=>state.listings.filter(l=>l.status==='Published'&&model.organizations.find(o=>o.id===l.company)?.status==='Active'&&(document.body.dataset.portalRole!=='student'||model.organizations.find(o=>o.id===window.BridgewayStudent.current().college)?.status==='Active'&&!state.collegeListingRestrictions?.[window.BridgewayStudent.current().college]?.[l.id]));
  window.BridgewayCycle.published=published;
  if(document.getElementById('tab-opportunities'))document.querySelector('.bw-opportunities-grid').dataset.discovery='true';

  function tickets(root,platform=false) {
    root.replaceChildren();let chosen='';
    const role=document.body.dataset.portalRole,manager=platform||['admin','supervisor'].includes(role);
    const masthead=E('header',null,'support-masthead');
    masthead.append(E('h1','My Tickets'));
    root.append(masthead);
    // Expand only the ticket view; all other portal pages retain their existing shell.
    const ticketPanel=root.closest('.bw-tab-panel');
    if(ticketPanel){
      const syncTicketPage=()=>document.body.classList.toggle('is-ticket-page',ticketPanel.classList.contains('is-active'));
      new MutationObserver(syncTicketPage).observe(ticketPanel,{attributes:true,attributeFilter:['class']});
      syncTicketPage();
    }
    let ticketView=manager?'received':'mine';
    const icon=name=>{const n=E('i',null,'bi bi-'+name);n.setAttribute('aria-hidden','true');return n;};
    const description=platform?'Review and manage support conversations in one place.':'Start a ticket and keep every reply in one place.';
    const shell=E('div',null,'support-hub');
    const overview=E('div',null,'support-overview'),intro=E('section',null,'support-intro'),introTitle=E('h2',platform?'Your support desk':'Need a hand?'),introCopy=E('p',description);
    const introContent=A(E('div',null,'support-intro-content'),introTitle,introCopy);intro.append(introContent);
    function ensureMascotSprite(){
      if(document.getElementById?.('mascot-art'))return;
      const target=document.body||document.documentElement;
      if(!target)return;
      const sprite=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','svg'):E('svg');
      sprite.setAttribute('class','sprite');sprite.setAttribute('aria-hidden','true');sprite.setAttribute('focusable','false');
      sprite.innerHTML='<defs><g id="mascot-art" stroke-linejoin="round" stroke-linecap="round"><path d="M20 62 C20 2 100 2 100 62" fill="none" stroke="#5b6b8c" stroke-width="6"/><path d="M20 62 C20 2 100 2 100 62" fill="none" stroke="#9aaccf" stroke-width="1.6" transform="translate(0 -1.4)"/><path d="M103 82 C103 96 88 98 78 96" fill="none" stroke="#4b5a78" stroke-width="3.4"/><rect x="67" y="92" width="13" height="8" rx="4" fill="#4b5a78" stroke="#16335d" stroke-width="2"/><rect x="9" y="54" width="17" height="30" rx="8" fill="#7587ab" stroke="#16335d" stroke-width="2.4"/><rect x="9" y="54" width="7" height="30" rx="3.5" fill="#4b5a78"/><rect x="94" y="54" width="17" height="30" rx="8" fill="#7587ab" stroke="#16335d" stroke-width="2.4"/><rect x="104" y="54" width="7" height="30" rx="3.5" fill="#4b5a78"/><path d="M31 50 L60 61 L89 50 V70 C89 84 31 84 31 70 Z" fill="#2f6be0" stroke="#16335d" stroke-width="2.4"/><path d="M60 62 L88 51.5 V70 C88 80 74 83 60 83 Z" fill="#1f4fb8"/><path d="M10 40 L60 58 L110 40 V45 L60 63 L10 45 Z" fill="#c4d1ea" stroke="#16335d" stroke-width="2.4"/><path d="M10 40 L60 22 L110 40 L60 58 Z" fill="#ffffff" stroke="#16335d" stroke-width="2.4"/><path d="M12 40 L60 23.5 L60 56.5 Z" fill="#e9eff9"/><path d="M60 40 Q76 46 92 41" fill="none" stroke="#f5a623" stroke-width="2.4"/><circle cx="60" cy="40" r="3.4" fill="#f5a623" stroke="#16335d" stroke-width="1.6"/><path d="M92 41 V57" fill="none" stroke="#f5a623" stroke-width="2.4"/><path d="M88.5 56 H95.5 L97 69 H87 Z" fill="#f5a623" stroke="#16335d" stroke-width="2"/></g></defs>';
      if(target.prepend)target.prepend(sprite);else if(target.append)target.append(sprite);
    }
    if(!platform){
      ensureMascotSprite();
      const submit=B('',()=>compose());submit.className='ticket-btn support-submit';
      const perf=E('span',null,'ticket-perf');perf.setAttribute('aria-hidden','true');
      const mascot=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','svg'):E('svg');
      mascot.setAttribute('class','mascot');mascot.classList?.add?.('mascot');mascot.setAttribute('viewBox','0 0 120 100');mascot.setAttribute('aria-hidden','true');mascot.setAttribute('focusable','false');
      const use=document.createElementNS?document.createElementNS('http://www.w3.org/2000/svg','use'):E('use');
      use.setAttribute('href','#mascot-art');mascot.append(use);
      submit.append(perf,E('span','Submit a ticket'),mascot);
      introContent.append(submit);
    }
    const historySection=E('section',null,'support-history'),historyHeading=E('h2',manager?'Ticket inbox':'My Tickets');
    const list=E('div',null,'support-ticket-list');list.id='support-list-'+crypto.randomUUID();
    const views=E('div',null,'support-views');views.setAttribute('role','group');views.setAttribute('aria-label','Ticket views');
    const viewButtons=[['mine','My Tickets'],['received','Received tickets']].map(([value,text])=>{
      const button=B(text,()=>{ticketView=value;chosen='';render();});button.dataset.ticketView=value;button.setAttribute('aria-controls',list.id);views.append(button);return button;
    });
    list.setAttribute('aria-label',manager?'Received tickets':'My Tickets');historySection.append(A(E('header',null,'support-history-heading'),historyHeading),views,list);overview.append(intro,historySection);
    const thread=E('section',null,'support-conversation');thread.hidden=true;
    shell.append(overview,thread);root.append(shell);
    const ticketStatus=t=>{const badge=E('span',t.status,'support-status');badge.dataset.state=t.status;return badge;};
    const timestamp=value=>{const n=E('time',new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date(value)));n.dateTime=value;return n;};
    const focusHeading=()=>{const heading=thread.querySelector('h2');heading?.focus({preventScroll:true});shell.scrollIntoView?.({block:'start',behavior:'instant'});};
    function compose(reference=''){
      const form=E('form',null,'support-compose-form');
      const subject=field('Subject *'),body=field('How can we help? *','','textarea'),context=field('Related details (optional)'),category=select('Category',['General support','Attendance / punctuality','Training quality','Conduct','Administration'],'General support');
      subject.input.required=true;subject.input.maxLength=120;subject.input.placeholder='Give your request a short title';
      body.input.required=true;body.input.maxLength=3000;body.input.placeholder='Describe what happened and what you need help with.';
      context.input.maxLength=180;context.input.placeholder='A week, report, or listing';
      const submit=E('button','Create ticket','cycle-button is-primary');submit.type='submit';
      const fields=A(E('div',null,'support-compose-fields'),subject.wrap,category.wrap,context.wrap,body.wrap,E('p','This conversation is kept in your browser.','support-session-note'),A(E('div',null,'support-compose-actions'),submit));
      form.append(fields);
      const kinetic=window.BridgewayKinetic,preview=kinetic?.ticketPaper?.();
      if(preview){
        const panel=E('aside',null,'support-compose-preview');panel.setAttribute('aria-hidden','true');panel.append(preview.paper);form.append(panel);
        const updatePreview=()=>{preview.title.textContent=subject.input.value.trim()||'Your support ticket';preview.body.textContent=body.input.value.trim()||'Add the details here. Your ticket takes shape as you write.';preview.stub.querySelector('strong').textContent=category.input.value;};
        subject.input.addEventListener('input',updatePreview);body.input.addEventListener('input',updatePreview);category.input.addEventListener('change',updatePreview);updatePreview();
        form.classList.add('has-ticket-preview');
      }
      const d=dialog('Submit a ticket',form);d.classList.add('support-composer');subject.input.focus();
      if(preview)d.classList.add('support-preview-dialog');
      form.addEventListener('submit',ev=>{
        ev.preventDefault();if(form.dataset.committed==='true')return;
        if(!subject.input.value.trim()||!body.input.value.trim()){const input=!subject.input.value.trim()?subject.input:body.input;input.setCustomValidity('Enter '+(input===subject.input?'a subject.':'a description.'));input.reportValidity();input.setCustomValidity('');return;}
        const id='BW-'+crypto.randomUUID().slice(0,8).toUpperCase();
        state.tickets.unshift({id,subject:subject.input.value.trim(),owner:identity(),priority:'Normal',status:'In progress',context:context.input.value.trim(),reference,placement:reference.startsWith('report:')?state.histories.find(h=>h.student===reference.split(':')[1])?.id:null,category:category.input.value,created:now(),messages:[{author:author(),sender:identity(),body:body.input.value.trim(),at:now()}]});
        form.dataset.committed='true';chosen=id;ticketView='mine';
        commit(`Ticket ${id} opened`);render();
        if(!kinetic?.ticketPaper||!kinetic?.tearTicket){d.close();focusHeading();say('Ticket created in this workspace.');return;}
        const receipt=preview||kinetic.ticketPaper();receipt.title.textContent=subject.input.value.trim();receipt.body.textContent=body.input.value.trim();
        receipt.brand.querySelector('small').textContent='Created';receipt.stub.querySelector('strong').textContent=id;
        const note=E('p','Your ticket has been created.','support-issued-note');note.setAttribute('role','status');
        const view=B('View ticket',()=>{d.close();focusHeading();},true);view.disabled=true;
        form.classList.add('support-issued');d.classList.add('support-issued-dialog');form.setAttribute('aria-busy','true');
        d.querySelector('h2').textContent='Ticket created';
        form.replaceChildren(receipt.paper,A(E('div',null,'support-issued-actions'),note,view));
        d.addEventListener('close',focusHeading,{once:true});
        Promise.resolve().then(()=>kinetic.tearTicket(receipt.paper)).catch(()=>{
          // The ticket is already recorded; an animation failure must never submit it again.
          note.textContent='Your ticket is ready to view.';
        }).finally(()=>{form.setAttribute('aria-busy','false');view.disabled=false;if(d.open)view.focus();say('Ticket created in this workspace.');});
      });
    }
    function render(){
      const visible=state.tickets.filter(t=>ticketVisible(t)),own=visible.filter(t=>t.owner===identity()),active=own.filter(t=>t.status!=='Resolved').length;
      introTitle.textContent=platform?'Your support desk':own.length&&!active?'No active tickets':'Need a hand?';
      introCopy.textContent=description;
      const received=visible.filter(t=>ticketCanManage(t));
      views.hidden=!(['admin','supervisor'].includes(role)||own.length>0&&received.length>0);
      viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ticketView===ticketView)));
      historyHeading.textContent=ticketView==='received'?'Received tickets':'My Tickets';list.setAttribute('aria-label',historyHeading.textContent);
      const matches=(ticketView==='received'?received:own).slice().sort((a,b)=>String(b.messages.at(-1)?.at||b.created).localeCompare(String(a.messages.at(-1)?.at||a.created)));
      list.replaceChildren();
      matches.forEach(t=>{
        const b=B('',()=>{chosen=t.id;render();focusHeading();});b.className='support-ticket';b.dataset.ticketId=t.id;
        b.setAttribute('aria-label',`${t.subject}. ${t.status}. Open conversation`);
        const top=A(E('span',null,'support-ticket-top'),E('strong',t.subject),ticketStatus(t),icon('chevron-right'));
        const meta=A(E('span',null,'support-ticket-meta'),E('span',t.id),E('span',t.category||'General support'));
        const footer=A(E('span',null,'support-ticket-footer'),A(E('span'),E('span','Opened '),timestamp(t.created)),A(E('span'),E('span','Updated '),timestamp(t.updated||t.messages.at(-1)?.at||t.created)));
        b.append(top,meta,footer);list.append(b);
      });
      if(!matches.length)list.append(A(E('div',null,'support-empty'),icon('chat-square-text'),E('h3','No tickets yet'),E('p',ticketView==='received'?'Tickets you receive will appear here.':'Tickets you open will appear here.')));
      const t=visible.find(t=>t.id===chosen);shell.dataset.view=t?'conversation':'overview';overview.hidden=!!t;thread.hidden=!t;thread.replaceChildren();if(!t){chosen='';return;}
      const back=B('',()=>{const old=chosen;chosen='';render();[...list.querySelectorAll('button')].find(b=>b.dataset.ticketId===old)?.focus({preventScroll:true});});back.className='support-back';back.append(icon('arrow-left'),E('span','Back to tickets'));
      const heading=E('h2',t.subject);heading.tabIndex=-1;
      const headingBar=A(E('header',null,'support-conversation-heading'),heading);thread.append(back,headingBar);
      const layout=E('div',null,'support-conversation-layout'),details=E('aside',null,'support-ticket-details');details.setAttribute('aria-label','Ticket details');
      const facts=E('dl');
      const fullTimestamp=value=>{const n=timestamp(value);n.textContent+=' · '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Amman'}).format(new Date(value));return n;};
      [['Category',E('span',t.category||'General support')],['Ticket ID',E('span',t.id)],['Opened',fullTimestamp(t.created)],['Last activity',fullTimestamp(t.updated||t.messages.at(-1)?.at||t.created)],['Status',ticketStatus(t)]].forEach(([label,value])=>facts.append(A(E('div'),E('dt',label),A(E('dd'),value))));
      if(t.context)facts.append(A(E('div'),E('dt','Related details'),E('dd',t.context)));
      details.append(facts);
      if(t.reference?.startsWith('report:')){const [,id,week]=t.reference.split(':');details.append(B(`Open related report · Week ${Number(week)+1}`,()=>{const body=E('div',null,'cycle-training');training(body,id,platform?'platform':role,Number(week));dialog('Related training record',body);}));}
      if(t.reference?.startsWith('listing:')){const listing=state.listings.find(l=>l.id===t.reference.slice(8));if(listing)details.append(A(E('div',null,'support-ticket-link'),E('strong','Linked listing'),E('p',listing.title)));}
      const surface=E('div',null,'support-thread-surface'),messages=E('ol',null,'support-messages');messages.setAttribute('aria-label','Conversation messages');
      t.messages.forEach(m=>{
        const mine=m.sender?m.sender===identity():m.author===author(),name=m.author||'Unknown author';
        const words=name.split(/\s+/).filter(word=>word&&!/^(dr|prof|mr|ms)\.?$/i.test(word)),initials=words.length?(words[0][0]+(words.length>1?words.at(-1)[0]:'')).toUpperCase():'?';
        const avatar=E('span',initials,'support-message-avatar');avatar.setAttribute('aria-hidden','true');
        const card=A(E('li',null,'support-message'),A(E('header'),avatar,A(E('div',null,'support-message-author'),E('strong',name),fullTimestamp(m.at))),E('p',m.body));
        card.dataset.side=mine?'mine':'other';messages.append(card);
      });surface.append(messages);
      if(t.status==='Resolved'){
        const closed=A(E('div',null,'support-closed'),icon('lock'),A(E('div'),E('strong','Ticket closed'),E('p','This conversation is resolved. No more replies can be added.')));closed.tabIndex=-1;
        surface.append(closed);layout.append(details,surface);thread.append(layout);return;
      }
      const managing=ticketCanManage(t);
      const form=E('form',null,'support-reply-form'),reply=field('Your reply','','textarea');reply.input.required=true;reply.input.maxLength=3000;reply.input.placeholder='Write a reply…';
      const count=E('span','0 / 3000','support-reply-count');count.id='support-reply-count-'+t.id;reply.input.setAttribute('aria-describedby',count.id);
      const error=E('p','','support-reply-error');error.hidden=true;error.setAttribute('role','alert');
      reply.input.addEventListener('input',()=>{count.textContent=reply.input.value.length+' / 3000';error.hidden=true;reply.input.setAttribute('aria-invalid','false');});
      const send=E('button','Add reply','cycle-button is-primary');send.type='submit';
      const actions=A(E('div',null,'support-reply-actions'),send);
      if(managing&&t.status!=='Resolved'){
        let resolutionDialog;
        const canResolve=()=>{
          const last=t.messages.at(-1);
          return ticketVisible(t)&&ticketCanManage(t)&&t.status!=='Resolved'&&Boolean(last&&(last.sender?last.sender===identity():last.author===author()));
        };
        const resolveButton=B('',()=>{
          if(!canResolve()||resolutionDialog?.open)return;
          const content=E('div',null,'support-resolution-confirmation');
          const note=E('p','This will close the conversation. No more replies can be added.','support-resolution-note');
          let confirmed=false;
          const confirm=B('Confirm resolution',()=>{
            if(confirmed)return;
            if(!canResolve()){resolutionDialog.close();return;}
            confirmed=true;t.status='Resolved';t.updated=now();
            resolutionDialog.close();commit(`Ticket ${t.id} resolved`);render();thread.querySelector('.support-closed')?.focus({preventScroll:true});say('Ticket resolved. The conversation is closed.');
          });confirm.className+=' is-primary support-confirm-resolution';
          const cancel=B('Cancel',()=>resolutionDialog.close());
          content.append(note,A(E('div',null,'cycle-actions'),cancel,confirm));
          resolutionDialog=dialog('Resolve ticket?',content);resolutionDialog.classList.add('support-resolution-dialog');cancel.focus();
        });resolveButton.className+=' support-resolve';resolveButton.disabled=!canResolve();resolveButton.title=resolveButton.disabled?'Send a reply before resolving this ticket.':'Resolve ticket';resolveButton.append(icon('check2-circle'),E('span','Resolve ticket'));headingBar.append(resolveButton);
      }
      form.append(reply.wrap,error,A(E('div',null,'support-reply-toolbar'),count,actions));surface.append(form);layout.append(details,surface);thread.append(layout);
      form.addEventListener('submit',ev=>{
        ev.preventDefault();if(!ticketVisible(t)||t.status==='Resolved')return;
        if(!reply.input.value.trim()){error.textContent='Write a reply before adding it.';error.hidden=false;reply.input.setAttribute('aria-invalid','true');reply.input.focus();return;}
        t.messages.push({author:author(),sender:identity(),body:reply.input.value.trim(),at:now()});t.status=ticketCanManage(t)?'Awaiting requester':'In progress';t.updated=now();
        commit(`Reply added to ${t.id}`);render();thread.querySelector('textarea')?.focus({preventScroll:true});say('Reply added to this workspace.');
      });
    }
    if(!platform)document.addEventListener('bridgeway:new-ticket',ev=>compose(ev.detail?.reference||''));
    document.addEventListener('bridgeway:cycle-change',render);render();
  }

  function editFullPlan(id,refresh){
    const plan=state.plans[id],form=E('form',null,'cycle-plan-form');
    const layout=E('div',null,'cycle-plan-layout'),nav=E('nav',null,'cycle-plan-nav'),workspace=E('div',null,'cycle-plan-workspace');
    nav.setAttribute('aria-label','Training plan weeks');
    const intro=A(E('div',null,'cycle-plan-intro'),E('strong',student(id).name),E('p','Plan the work. Review the results.','cycle-muted'));
    nav.append(intro);layout.append(nav,workspace);form.append(layout);
    let current=Math.max(0,plan.findIndex(w=>['draft','revision'].includes(w.status)));
    const panels=[],buttons=[];
    const announce=E('p','','cycle-plan-announcement');announce.setAttribute('aria-live','polite');
    function choose(index){current=index;panels.forEach((p,i)=>p.hidden=i!==index);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
    const fields=plan.map((w,i)=>{
      const editable=['draft','revision'].includes(w.status);
      const button=B('',()=>choose(i));button.className='cycle-plan-week';
      button.append(E('span',`Week ${i+1}`),E('strong',w.title),E('small',editable?'Editable':w.status==='verified'?'Verified · Read only':'In review · Read only'));
      nav.append(button);buttons.push(button);
      const panel=E('section',null,'cycle-plan-week-panel');panel.setAttribute('aria-label',`Week ${i+1} plan`);panels.push(panel);workspace.append(panel);
      panel.append(A(E('header',null,'cycle-plan-week-heading'),A(E('div'),E('p',`Week ${i+1} of 8`,'cycle-muted'),E('h3',editable?'Shape this week’s work':'Recorded weekly plan')),status(w.status)));
      if(!editable)panel.append(E('p','This report is already submitted or verified. Its plan cannot be changed unless your supervisor requests a revision.','cycle-callout'));
      const title=field('Week title *',w.title),hours=field('Planned hours *',w.hours,'number');
      title.input.maxLength=160;hours.input.value=15;hours.input.readOnly=true;hours.input.min=15;hours.input.max=15;
      for(const f of [title,hours]){f.input.disabled=!editable;f.input.required=editable;}
      panel.append(A(E('div',null,'cycle-plan-basics'),title.wrap,hours.wrap));
      const heading=E('div',null,'cycle-plan-objective-heading'),count=E('span','','cycle-muted');
      heading.append(E('h4','Checklist objectives'),count);panel.append(heading,E('p',editable?'Each objective below becomes a separate checkbox in the weekly report. Add one clear, assessable outcome per row.':'These are the objectives recorded for this week.','cycle-plan-hint'));
      const rows=E('div',null,'cycle-plan-objective-list'),entries=[];
      panel.append(rows);
      function update(){count.textContent=`${entries.length} objective${entries.length===1?'':'s'}`;entries.forEach((item,j)=>{item.label.textContent=`Objective ${j+1} *`;item.remove.disabled=!editable||entries.length===1;item.remove.setAttribute('aria-label',`Remove objective ${j+1} from week ${i+1}`);});}
      function add(text='',focus=false){
        const row=E('div',null,'cycle-plan-objective-row'),icon=E('i',null,'bi bi-check2-square');icon.setAttribute('aria-hidden','true');
        const task=field('',text),remove=B('×',()=>{
          const pos=entries.indexOf(entry);entries.splice(pos,1);row.remove();update();
          (entries[Math.min(pos,entries.length-1)]?.input||addButton).focus();
          announce.textContent=`Objective removed from week ${i+1}. Save the plan to apply this change.`;
        });
        task.input.required=editable;task.input.disabled=!editable;task.input.maxLength=500;task.input.placeholder='e.g. Build and test the authentication flow';
        remove.classList.add('cycle-plan-remove');remove.title='Remove objective';
        const entry={input:task.input,label:task.wrap.firstElementChild,remove};
        entries.push(entry);row.append(icon,task.wrap,remove);rows.append(row);update();if(focus)task.input.focus();
      }
      const addButton=B('＋ Add objective',()=>{add('',true);announce.textContent=`Objective added to week ${i+1}.`;});addButton.classList.add('cycle-plan-add');addButton.disabled=!editable;
      w.objectives.forEach(o=>add(o.text));if(!entries.length)add();
      if(editable)panel.append(addButton,E('p','Unchanged objectives keep their completion and evidence. New or rewritten objectives start unchecked.','cycle-plan-hint'));
      panel.addEventListener('input',()=>{button.querySelector('strong').textContent=title.input.value.trim()||'Untitled week';});
      return {title,hours,entries,editable,panel};
    });
    const total=E('span','','cycle-muted');
    function totals(){total.textContent=`${fields.reduce((sum,f)=>sum+(Number(f.hours.input.value)||0),0)} planned hours across 8 weeks`;}
    form.addEventListener('input',totals);totals();
    const save=E('button','Save training plan','cycle-button is-primary');save.type='submit';
    form.append(announce,A(E('footer',null,'cycle-plan-footer'),A(E('div'),total,null),save));
    choose(current);
    const d=dialog('Eight-week training plan',form);d.classList.add('cycle-plan-dialog');
    form.addEventListener('invalid',ev=>{const index=fields.findIndex(f=>f.panel.contains(ev.target));if(index>=0)choose(index);},true);
    form.addEventListener('submit',ev=>{
      ev.preventDefault();
      for(const [i,f] of fields.entries()){
        if(!f.editable)continue;
        const inputs=[f.title.input,...f.entries.map(e=>e.input)];
        const empty=inputs.find(input=>!input.value.trim());
        const texts=f.entries.map(e=>e.input.value.trim());
        const duplicate=texts.findIndex((text,j)=>texts.indexOf(text)!==j);
        const invalid=empty||(duplicate>=0?f.entries[duplicate].input:null);
        if(invalid){choose(i);invalid.setCustomValidity(empty?'Enter a value, not only spaces.':'Use a distinct objective for each row.');invalid.reportValidity();invalid.setCustomValidity('');return;}
      }
      fields.forEach((f,i)=>{
        if(!f.editable)return;
        const w=plan[i],lines=f.entries.map(e=>e.input.value.trim());
        const changed=w.title!==f.title.input.value.trim()||w.hours!==Number(f.hours.input.value)||lines.join('\n')!==w.objectives.map(o=>o.text).join('\n');
        if(!changed)return;
        (w.planHistory||=[]).push({title:w.title,hours:w.hours,objectives:w.objectives.map(o=>o.text),revision:w.revision,at:now()});
        w.title=f.title.input.value.trim();w.hours=H.WEEKLY;
        w.objectives=lines.map(text=>w.objectives.find(o=>o.text===text)||{id:crypto.randomUUID(),text,done:false,evidence:''});
        w.revision++;w.updated=now();
      });
      commit(`Eight-week plan updated for ${student(id).name}`);d.close();refresh();
    });
  }
  function supervisorChecklist(host,w){
    host.classList.add('supervisor-submission');
    const complete=w.objectives.filter(o=>o.done).length;
    host.append(A(E('header',null,'supervisor-submission-heading'),A(E('div'),E('h3','Objective results'),E('p',w.status==='draft'?'Company plan · Not submitted':'Reported by the company · Read only','cycle-muted')),E('span',w.status==='draft'?'Planned':`${complete} of ${w.objectives.length} complete`,'supervisor-source-tag')));
    w.objectives.forEach(o=>{
      const completed=w.status!=='draft'&&o.done,row=E('section',null,'supervisor-submission-objective'),mark=E('i',null,completed?'bi bi-check2-circle':'bi bi-circle');mark.setAttribute('aria-hidden','true');
      const content=A(E('div',null,'supervisor-objective-content'),A(E('div',null,'supervisor-company-result'),E('h4',o.text),E('span',w.status==='draft'?'Planned':completed?'Completed':'Not completed',`supervisor-completion${completed?' is-complete':''}`)));
      if(o.evidence)content.append(A(E('p',null,'supervisor-company-note'),E('span','Company note'),E('span',o.evidence)));
      row.append(mark,content);
      host.append(row);
    });
  }
  function training(root,id,role,selectedWeek) {
    let week=Number.isInteger(selectedWeek)?Math.max(0,Math.min(selectedWeek,7)):H.focusWeek(state.plans[id]),editing=false;
    const closed=['Left','Completed'].includes(state.histories.find(h=>h.student===id)?.status);
    function render(){const plan=state.plans[id];root.replaceChildren();root.classList.toggle('cycle-supervisor-review',role==='supervisor');root.classList.toggle('cycle-company-training',role==='company');if(!plan){root.append(E('p','The company creates a training plan after placement.','cycle-muted'));return;}
      const w=plan[week];const heading=A(E('div',null,'cycle-heading'),A(E('div'),E('p',role==='supervisor'?`${org(student(id).company)} · Eight-week training plan`:`${student(id).name} · ${org(student(id).company)}`,'cycle-muted'),A(E('div',null,'cycle-plan-title'),E('h2',role==='supervisor'||role==='company'?student(id).name:'The eight-week plan'),status(`${hours(id)} / 120 h verified`))));root.append(heading);if(role==='company'&&!closed)heading.append(B('Plan all eight weeks',()=>editFullPlan(id,render)));if(closed)root.append(E('p','Placement ended. The training record is retained for reference.','cycle-callout'));
      const rail=E('div',null,'cycle-weeks');rail.setAttribute('aria-label','Training weeks');plan.forEach((p,i)=>{const b=B('',async()=>{const draft=root.querySelector('.company-week-report textarea');if(i!==week&&draft&&draft.value!==w.notes&&window.BridgewayUX&&!await window.BridgewayUX.confirmDiscard('Switching weeks will discard your unfinished weekly feedback.'))return;week=i;editing=false;render();});b.setAttribute('aria-pressed',String(week===i));b.append(E('span',`Week ${i+1}`),E('small',p.status==='verified'?'Verified':p.status==='submitted'?'In review':p.status==='revision'?'Revision':'Planned'));if(role==='student'&&reportRestricted(id)){const lock=E('i',null,'bi bi-lock');lock.setAttribute('aria-hidden','true');b.firstChild.append(lock);b.title='Report hidden by your supervisor. The weekly plan remains available.';b.setAttribute('aria-label',`Week ${i+1} · ${b.querySelector('small').textContent} · Report hidden by your supervisor`);}rail.append(b);});root.append(rail);
      const top=A(E('div',null,'cycle-heading'),A(E('div'),E('h3',role==='supervisor'||role==='company'?`Week ${week+1} · ${w.title}`:w.title),E('p',`${role==='supervisor'&&w.status!=='draft'?`${w.actualHours} reported hours · `:''}${w.hours} planned hours · Plan revision ${w.revision}`,'cycle-muted')),status(w.status));if(role==='company')top.querySelector(':scope > .cycle-status')?.remove();root.append(top);if(role==='platform')top.append(status(reportRestricted(id)?'Hidden from student':'Visible to student'));
      if(role==='company'&&!closed&&['draft','revision'].includes(w.status))top.append(B(editing?'Cancel editing':'Edit weekly plan',()=>{editing=!editing;render();}));
      if(editing){const form=E('form',null,'cycle-form'),title=field('Week title',w.title),planned=field('Planned hours',w.hours,'number');title.input.required=true;planned.input.value=15;planned.input.readOnly=true;planned.input.min=15;planned.input.max=15;const tasks=field('Objectives · one per line',w.objectives.map(o=>o.text).join('\n'),'textarea');tasks.input.required=true;form.append(title.wrap,planned.wrap,tasks.wrap);const save=E('button','Update plan','cycle-button is-primary');save.type='submit';form.append(save);root.append(form);form.addEventListener('submit',ev=>{ev.preventDefault();const lines=tasks.input.value.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length||!title.input.value.trim()){tasks.input.setCustomValidity('Add at least one objective and a week title.');tasks.input.reportValidity();tasks.input.setCustomValidity('');return;}(w.planHistory||=[]).push({title:w.title,hours:w.hours,objectives:w.objectives.map(o=>o.text),revision:w.revision,at:now()});w.title=title.input.value.trim();w.hours=H.WEEKLY;w.objectives=lines.map((text,i)=>{const old=w.objectives.find(o=>o.text===text);return old||{id:`${week}-${i}-${Date.now()}`,text,done:false,evidence:''};});w.revision++;w.updated=now();editing=false;commit(`Week ${week+1} plan updated for ${student(id).name}`);render();});return;}
      const assignedTasks=window.BridgewayWeeklyTasks?.render(id,week,role);if(assignedTasks)root.append(assignedTasks);
      const checklist=E('div',null,'cycle-objectives');root.append(checklist);
      const studentLocked=role==='student'&&reportRestricted(id);
      if(w.planHistory?.length){const history=E('details',null,'cycle-plan-history');history.append(E('summary',`Plan changes · ${w.planHistory.length} earlier revision${w.planHistory.length===1?'':'s'}`));w.planHistory.forEach(h=>history.append(A(E('div'),E('strong',`Revision ${h.revision} · ${h.title}`),E('p',`${h.hours} hours · ${h.objectives.join('; ')}`,'cycle-muted'))));root.insertBefore(history,checklist);}
      if(!studentLocked&&role!=='supervisor'){const count=w.objectives.filter(o=>o.done).length;const summary=A(E('div',null,'cycle-outcome-summary'),E('span',`${count} of ${w.objectives.length} objectives marked complete by the company`));const progress=E('progress');progress.max=w.objectives.length;progress.value=count;progress.setAttribute('aria-label','Company-reported objective completion');summary.append(progress);root.insertBefore(summary,checklist);}
      if(studentLocked){const lock=A(E('section',null,'cycle-lock'),E('i',null,'bi bi-lock'),A(E('div'),E('strong','Report hidden by your supervisor'),E('p','You can still view this week’s plan. Report evidence, results, and supervisor feedback are hidden. Verified hours are unchanged.')));lock.setAttribute('aria-label','Weekly report visibility');lock.querySelector('i').setAttribute('aria-hidden','true');root.insertBefore(lock,checklist);}
      const editable=role==='company'&&!closed&&['draft','revision'].includes(w.status);
      if(role==='supervisor'||role==='company'&&!editable){
        supervisorChecklist(checklist,w,id,week);
        if(role==='company'){checklist.firstElementChild.remove();checklist.classList.remove('supervisor-submission');checklist.classList.add('company-objectives-record');}
      }
      else w.objectives.forEach((o,i)=>{const row=E('div',null,'cycle-objective');if(role==='student'){row.append(E('span',String(i+1),'cycle-objective-number'),A(E('div'),E('strong',o.text),!studentLocked?E('p',o.done?'Company marked complete':'Not yet complete','cycle-muted'):null));if(!studentLocked&&o.evidence)row.append(E('p',o.evidence,'cycle-evidence'));}
        else {const label=E('label',null,'cycle-check'),check=E('input');check.type='checkbox';check.checked=o.done;check.disabled=!editable;label.append(check,E('strong',o.text));row.append(label);check.addEventListener('change',()=>{o.done=check.checked;const count=w.objectives.filter(o=>o.done).length;const summary=root.querySelector('.cycle-outcome-summary');if(summary){summary.querySelector('span').textContent=role==='company'?`${count} of ${w.objectives.length} completed`:`${count} of ${w.objectives.length} objectives marked complete by the company`;summary.querySelector('progress').value=count;}commit('Objective checklist updated');});
          const evidence=field('Evidence / deliverable',o.evidence);evidence.input.disabled=!editable;evidence.input.maxLength=500;if(role==='company'){const disclosure=E('details',null,'company-objective-evidence'),summary=E('summary',o.evidence?'View evidence':editable?'Add evidence':'No evidence');disclosure.append(summary,editable?evidence.wrap:E('p',o.evidence||'No evidence was recorded.','company-recorded-evidence'));row.append(disclosure);evidence.input.addEventListener('change',()=>summary.textContent=evidence.input.value?'View evidence':'Add evidence');}else row.append(evidence.wrap);evidence.input.addEventListener('change',()=>{o.evidence=evidence.input.value;commit('Objective evidence updated');});
        }
        checklist.append(row);});
      if(studentLocked)return;
      if(role==='company'){
        const report=E('form',null,'cycle-form'),notes=field('Weekly feedback about the student',w.notes,'textarea');
        notes.input.required=true;notes.input.maxLength=3000;notes.input.disabled=!editable;
        report.append(E('p','Each week is 15 hours. End the week and submit its report; supervisor approval adds those hours to the 120-hour verified total.','cycle-muted'),notes.wrap);
        if(w.review)report.append(E('p','Supervisor: '+w.review,'cycle-callout'));
        const submit=E('button',w.status==='revision'?'Resubmit week · 15 hours':w.status==='submitted'?'Week submitted · awaiting review':w.status==='verified'?'Week verified · 15 hours':'End week & submit report','cycle-button is-primary');
        submit.type='submit';submit.disabled=!editable;report.append(submit);
        report.addEventListener('submit',ev=>{ev.preventDefault();if(!editable)return;
          try{H.transition(w,'submit','company',notes.input.value,()=>commit('Week '+(week+1)+' ended and submitted for '+student(id).name));render();say('Week submitted: 15 hours awaiting supervisor approval.');}
          catch(error){say(error.message);}
        });
        report.classList.add('company-week-report');
        const taskGate=E('p',null,'company-report-task-gate');taskGate.setAttribute('role','status');
        function updateTaskGate(){const tasks=(w.tasks||[]).filter(t=>!t.removedAt),remaining=H.unfinishedTasks(w).length;taskGate.hidden=!tasks.length;taskGate.textContent=remaining?`${tasks.length-remaining} of ${tasks.length} tasks completed. Review and complete the remaining ${remaining===1?'task':`${remaining} tasks`} before ending this week.`:`All ${tasks.length} tasks completed. This week is ready for your report.`;taskGate.classList.toggle('is-ready',!remaining);submit.disabled=!editable||remaining>0;}
        reportGates.set(report,updateTaskGate);report.insertBefore(taskGate,submit);updateTaskGate();
        report.querySelector(':scope > p')?.remove();
        notes.wrap.firstElementChild.textContent='Weekly feedback *';
        if(!editable){notes.wrap.replaceWith(E('p',w.notes||'No written feedback was added.','company-report-feedback'));submit.remove();}
        notes.input.placeholder='Summarize the work completed, learning, and any support needed.';
        report.prepend(A(E('header',null,'company-report-heading'),E('h3','Weekly report'),status(w.status)));
        report.append(E('p',w.status==='verified'?'15 hours have been verified by the supervisor.':w.status==='submitted'?'Submitted to the supervisor. You can review this week while approval is pending.':'Submission ends this week. The supervisor reviews the report before its 15 hours are verified.','company-report-hint'));
        const objectivePanel=E('section',null,'company-week-objectives'),summary=root.querySelector('.cycle-outcome-summary'),history=root.querySelector('.cycle-plan-history');
        const objectiveHeading=E('header',null,'company-objectives-heading'),objectiveIcon=E('i',null,'bi bi-bullseye');objectiveIcon.setAttribute('aria-hidden','true');
        objectiveHeading.append(objectiveIcon,A(E('div',null,'company-objectives-title'),E('h3','Weekly objectives'),E('p',editable?'Complete the planned outcomes and add evidence of the work.':'Company-reported results · Read only','cycle-muted')));
        if(summary){summary.querySelector('span').textContent=`${w.objectives.filter(o=>o.done).length} of ${w.objectives.length} completed`;objectiveHeading.append(summary);}
        objectivePanel.setAttribute('aria-label','Weekly objectives');objectivePanel.append(objectiveHeading,checklist);if(history)objectivePanel.append(history);
        const main=E('div',null,'company-week-main');main.append(objectivePanel);if(assignedTasks)main.append(assignedTasks);
        root.append(A(E('div',null,'company-week-layout'),main,report));
      }
      else if(role==='supervisor'){
        const mentor=A(E('section',null,'supervisor-mentor-note'),E('h3','Company feedback about the student'),E('p',w.notes||'The company has not added written feedback to this report.'));root.append(mentor);
        const reviewArea=E('section',null,'supervisor-review-footer');reviewArea.append(E('h3','Your review'),E('p',w.status==='submitted'?'Read the company’s feedback and results, then approve its report or request a revision.':w.status==='verified'?'Company report approved. Its content and verified hours remain unchanged.':w.status==='revision'?'Revision requested. Review reopens when the company resubmits.':'Approval becomes available after the company submits this report.','cycle-muted'));
        const review=field('Review notes / required revisions',w.review,'textarea');review.input.maxLength=3000;review.input.placeholder='Add an optional approval note, or explain what the company needs to revise.';review.input.disabled=w.status!=='submitted';reviewArea.append(review.wrap);
        const controls=E('div',null,'cycle-actions');const verify=B(`Approve report · ${w.actualHours} h`,()=>{if(closed||w.status!=='submitted')return;try{H.transition(w,'verify','supervisor',review.input.value,()=>commit(`Week ${week+1} verified for ${student(id).name}`));week=H.focusWeek(state.plans[id]);render();root.querySelector('.cycle-weeks [aria-pressed=true]')?.focus({preventScroll:true});say(`15 hours verified. Total: ${hours(id)} / 120 hours. ${hours(id)===120?'All eight weeks verified.':`Week ${week+1} is now open.`}`);}catch(error){say(error.message);}},true),revise=B('Request revision',()=>{if(!review.input.value.trim()){review.input.setCustomValidity('Explain the required changes.');review.input.reportValidity();review.input.setCustomValidity('');return;}if(closed)return;try{H.transition(w,'revise','supervisor',review.input.value,()=>commit(`Week ${week+1} revision requested`));render();}catch(error){say(error.message);}});verify.dataset.supervisorVerify='true';verify.disabled=closed||w.status!=='submitted';revise.disabled=closed||w.status!=='submitted';controls.append(revise,verify);reviewArea.append(controls);
        root.append(A(E('div',null,'supervisor-report-columns'),A(E('div',null,'supervisor-report-content'),assignedTasks,checklist,mentor),reviewArea));
      } else if(w.status!=='draft'){root.append(E('p',`${w.actualHours} reported hours · ${w.notes}`,'cycle-muted'));if(role==='student'){const review=A(E('section',null,'cycle-callout cycle-student-review'),E('h4','Supervisor review'),E('p',w.review||(w.status==='submitted'?'Your supervisor has not added feedback yet.':'No written feedback was added for this week.')));review.setAttribute('aria-label','Supervisor review');root.append(review);}else if(w.review)root.append(E('p',w.review,'cycle-callout'));}
    }render();return render;
  }
  window.BridgewayCycle.training=training;
  function archivedRecord(h){const body=section('Archived training record',`${org(h.company)} · ${h.start} to ${h.end}`);for(const [i,w]of state.archivedPlans[h.id].entries()){const week=E('details',null,'cycle-plan-editor');week.append(E('summary',`Week ${i+1} · ${w.title} · ${w.status}`),E('p',`${w.actualHours} reported hours · ${w.hours} planned hours`,'cycle-muted'));w.objectives.forEach((o,j)=>week.append(E('p',`${o.done?'Completed':'Not completed'}: ${o.text}${o.evidence?' · '+o.evidence:''}`,'cycle-muted')));if(w.notes)week.append(E('p',w.notes));if(w.review)week.append(E('p',`Supervisor: ${w.review}`,'cycle-callout'));body.append(week);}const evaluation=state.archivedEvaluations?.[h.id];if(evaluation){body.append(E('h3','Company final evaluation'),E('p',`${evaluation.scores.reduce((a,b)=>a+b,0)} / 40 · ${date(evaluation.date)}`),E('p',evaluation.comments||'No mentor comments.'));}dialog('Placement archive',body);}
  window.BridgewayCycle.evaluation=(id)=>{const record=state.evaluations[id],body=E('div',null,'cycle-evaluation');if(!record){body.append(E('h3','Evaluation not submitted'),E('p','The host company submits the final assessment after training.','cycle-muted'));return body;}const names=['Performance','Responsibility','Accuracy','Attendance','Teamwork','Adaptability','Learning','Curriculum'];body.append(status('Company-submitted evaluation'),E('h3',student(id).name),E('p',`${org(record.company)} · ${date(record.date)}`,'cycle-muted'),E('h2',`${record.scores.reduce((a,b)=>a+b,0)} / 40`));if(window.BridgewayRadar){const radar=E('div',null,'cycle-evaluation-radar');body.append(radar);queueMicrotask(()=>{if(radar.isConnected)window.BridgewayRadar.mount(radar).update(record.scores,{submitted:true});});}names.forEach((name,i)=>body.append(A(E('div',null,'cycle-evaluation-row'),E('span',name),E('strong',`${record.scores[i]} / 5`))));body.append(E('p',record.comments||'No additional mentor comments.'));return body;};
  window.BridgewayCycle.seedPlan=id=>{if(!state.plans[id])state.plans[id]=topics.map((title,i)=>({title,hours:15,revision:1,objectives:objectives[i].map((text,j)=>({id:`${i}-${j}`,text,done:false,evidence:''})),status:'draft',actualHours:0,notes:'',review:'',ratings:[],locked:false,updated:now()}));};

  function exportCsv(rows,name){const csv='\uFEFF'+rows.map(row=>row.map(v=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=E('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  // A historical placement is never another current internship or a source of current hours.
  function placementRecord(id){
    const history=state.histories.filter(h=>h.student===id);
    const current=history.find(h=>h.status==='Active')||history[0]||null;
    return {current,previous:history.filter(h=>h!==current).sort((a,b)=>String(b.start).localeCompare(String(a.start))),activeCount:history.filter(h=>h.status==='Active').length,trainingOwner:history[0]?.id||null};
  }
  window.BridgewayCycle.placementRecord=placementRecord;
  function studentRecord(detail,s,refresh,filter='All outcomes'){
    const record=placementRecord(s.id),h=record.current;
    const icon=name=>{const i=E('i',null,'bi '+name);i.setAttribute('aria-hidden','true');return i;};
    const fact=(label,value)=>A(E('div'),E('dt',label),E('dd',value));
    const displayDate=value=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date(value+'T00:00:00Z')):'Present';
    const placementHours=h=>window.BridgewayPartnerships?.placementHours(h)??null;
    detail.setAttribute('aria-label',s.name+' placement record');
    detail.append(A(E('header',null,'record-identity'),E('span',s.name.split(/\s+/).map(n=>n[0]).slice(0,2).join(''),'record-avatar'),A(E('div'),E('h3',s.name),E('p',org(s.college),'record-college'))));
    detail.append(A(E('dl',null,'record-academic'),fact('Student ID',s.studentId),fact('GPA',s.gpa+' / 4.00'),fact('Academic supervisor',s.supervisor||'Not assigned')));
    if(!h){
      detail.append(A(E('div',null,'record-empty'),icon('bi-briefcase'),E('h4','No placement yet'),E('p','No internship placement has been recorded for this student.','cycle-muted'),status(s.stage)));
      return;
    }
    if(record.activeCount>1)detail.append(E('p','Multiple active placement records need review. Hours below belong only to the selected placement.','cycle-callout'));
    const current=A(E('article',null,'record-placement'),A(E('header',null,'record-placement-heading'),A(E('div'),E('p',h.status==='Active'?'Current placement':'Most recent placement','record-eyebrow'),E('h4',org(h.company)),E('p',h.role,'record-role')),status(h.status)));
    current.dataset.placementId=h.id;
    const verified=placementHours(h),facts=A(E('dl',null,'record-placement-facts'),fact('Started',h.start?displayDate(h.start):'Not recorded'),fact(h.end||h.status!=='Active'?'Ended':'End date',h.end?displayDate(h.end):h.status==='Active'?'Ongoing':'Not recorded'),fact('Verified hours',verified==null?'Not recorded':String(verified)+' h'));
    current.append(facts);
    if(h.reason)current.append(A(E('div',null,'record-outcome-note'),E('span','Outcome note'),E('p',h.reason)));
    const actions=E('footer',null,'record-actions'),ownsTraining=record.trainingOwner===h.id;
    if(ownsTraining&&state.plans[s.id]){
      const reports=B('Plan & weekly reports',()=>{const body=E('div',null,'cycle-training');training(body,s.id,'platform');dialog(s.name+' · Training record',body);},true);
      reports.prepend(icon('bi-journal-text'));actions.append(reports);
    } else if(state.archivedPlans?.[h.id]){
      const archive=B('Archived reports',()=>archivedRecord(h));archive.prepend(icon('bi-archive'));actions.append(archive);
    }
    if(ownsTraining){
      const evaluation=B('Company evaluation',()=>dialog('Final evaluation',window.BridgewayCycle.evaluation(s.id)));
      evaluation.prepend(icon('bi-award'));actions.append(evaluation);
      const assessment=B('Academic assessment',()=>{
        const a=window.BridgewayJourney?.academic(s.id),body=E('div',null,'cycle-evaluation');
        body.append(E('h3',s.name));
        if(!a||a.placement!==h.id){
          body.append(status('Not submitted'),E('p','The assigned academic supervisor adds a separate academic assessment after the company submits its final evaluation, then forwards it to the college administrator.','cycle-muted'));
        }else{
          body.append(status(a.status),E('p',`${a.supervisor} · ${date(a.at)}`,'cycle-muted'));
          a.criteria.forEach(c=>body.append(A(E('div',null,'cycle-evaluation-row'),E('span',c.name),E('strong',c.result))));
          body.append(E('h4','Assessment notes'),E('p',a.notes));
        }
        dialog('Academic assessment',body);
      });
      assessment.prepend(icon('bi-mortarboard'));actions.append(assessment);
    }
    if(actions.childElementCount)current.append(actions);
    detail.append(current);
  }
  function oversight(root){const panel=section('Student register','Student placements, verified training hours, and company evaluations.');root.append(panel);let selected='',filtered=[];const search=field('Search name, ID, college, or company','','search'),college=select('College',[['all','All colleges'],...model.organizations.filter(o=>o.type==='college').map(o=>[o.id,o.name])],'all'),outcome=select('Placement outcome',['All outcomes','Active','Completed','Left','No placement'],'All outcomes');const tools=A(E('div',null,'cycle-toolbar'),search.wrap,college.wrap,outcome.wrap,B('Export filtered register',()=>exportCsv([['Student','Student ID','College','Company','Role','Start','End','Outcome','Verified hours','Reason'],...filtered.flatMap(s=>{const h=state.histories.filter(h=>h.student===s.id&&(outcome.input.value==='All outcomes'||h.status===outcome.input.value));return (h.length?h:[{}]).map(h=>[s.name,s.studentId,org(s.college),h.company?org(h.company):'',h.role,h.start,h.end,h.status||s.stage,h.id?(window.BridgewayPartnerships?.placementHours(h)??'Not recorded'):'',h.reason]);})],'bridgeway-student-register.csv')));panel.append(tools);const summary=E('div',null,'cycle-metrics');panel.append(summary);const workspace=A(E('div',null,'cycle-register')),list=E('div',null,'cycle-register-list'),detail=E('section',null,'cycle-record-detail');detail.id='platform-student-record';workspace.append(list,detail);panel.append(workspace);
    function render(){const q=search.input.value.toLowerCase().trim();filtered=model.students.filter(s=>(college.input.value==='all'||s.college===college.input.value)&&(outcome.input.value==='All outcomes'||outcome.input.value==='No placement'&&!state.histories.some(h=>h.student===s.id)||state.histories.some(h=>h.student===s.id&&h.status===outcome.input.value))&&`${s.name} ${s.studentId} ${org(s.college)} ${state.histories.filter(h=>h.student===s.id).map(h=>org(h.company)).join(' ')}`.toLowerCase().includes(q));const scopedHistories=state.histories.filter(h=>filtered.some(s=>s.id===h.student)&&(outcome.input.value==='All outcomes'||h.status===outcome.input.value));summary.replaceChildren(...[['Students',filtered.length],['Active placements',scopedHistories.filter(h=>h.status==='Active').length],['Completed',scopedHistories.filter(h=>h.status==='Completed').length],['Left placements',scopedHistories.filter(h=>h.status==='Left').length]].map(([label,n])=>A(E('div'),E('strong',String(n)),E('span',label))));list.replaceChildren();filtered.forEach(s=>{const b=B('',()=>{selected=s.id;render();[...list.querySelectorAll('[data-student-id]')].find(n=>n.dataset.studentId===s.id)?.focus({preventScroll:true});});b.dataset.studentId=s.id;b.setAttribute('aria-controls','platform-student-record');b.className='cycle-ticket';b.setAttribute('aria-pressed',String(selected===s.id));b.append(E('strong',s.name),E('small',`${s.studentId} · ${org(s.college)}`),status(state.histories.find(h=>h.student===s.id)?.status||s.stage));list.append(b);});if(!filtered.length)list.append(E('p','No students match these filters.','cycle-muted'));detail.replaceChildren();const s=filtered.find(s=>s.id===selected);if(!s){detail.append(E('h3','Select a student'),E('p','Inspect every recorded placement, the learning plan, reports, and verified hours.','cycle-muted'));return;}studentRecord(detail,s,render,outcome.input.value);}
    const exportButton=tools.querySelector('button');exportButton.classList.add('is-primary','cycle-export-button');exportButton.prepend(E('i',null,'bi bi-download'));
    exportButton.querySelector('i').setAttribute('aria-hidden','true');
    const exportNote=E('p','CSV download · Includes students and placement outcomes matching your filters.','cycle-muted');exportNote.id='registerExportNote';tools.after(exportNote);exportButton.setAttribute('aria-describedby',exportNote.id);
    const updateExport=()=>{exportButton.disabled=!filtered.length;exportNote.textContent=filtered.length?`CSV download · ${filtered.length} matching student${filtered.length===1?'':'s'}. Includes placement histories for the selected outcome.`:'No matching students. Broaden the filters to export.';};
    [search.input,college.input,outcome.input].forEach(n=>n.addEventListener(n===search.input?'input':'change',()=>{render();updateExport();}));render();updateExport();
  }
  function publications(root,company=false){
    let filter='All',drawer=null,drawerListing='',drawerOpener=null;
    const dedicatedCompanyPage=company&&root.id==='companyListingsPage';
    const deadlineLabel=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date(value+'T00:00:00Z')):'Not recorded';
    const panel=section(company?'Publication desk':'Listing review desk',company?'Submit for platform review. Approved opportunities are available across all active colleges.':'Review the opportunity before students from all colleges can discover it.');
    root.append(panel);
    const pick=select('Publication status',['All','Pending review','Published','Rejected','Paused',...(company?['Deleted']:[])],'All');
    const search=field('Search listings','','search'),sort=select('Sort listings',['Pending first','Deadline: earliest first','Role: A to Z'],'Pending first'),filters=E('div',null,'publication-filters'),result=E('p','','publication-result');
    const filterButtons=[];
    const list=E('div',null,'publication-table-wrap');
    {
      panel.classList.add('publication-review-desk');panel.setAttribute('aria-label','Internship listings');panel.querySelector('header').remove();
      search.input.placeholder=company?'Search internships':'Search role, company, or skill';
      search.wrap.classList.add('publication-search');
      const searchIcon=E('i',null,'bi bi-search');searchIcon.setAttribute('aria-hidden','true');search.wrap.append(searchIcon);
      filters.setAttribute('role','group');filters.setAttribute('aria-label','Publication status');
      (company?['All','Published','Pending review','Paused','Rejected','Deleted']:['All','Pending review','Published','Paused','Rejected']).forEach(value=>{
        const button=B('',()=>{filter=value;pick.input.value=value;render();});
        button.dataset.status=value;filterButtons.push(button);filters.append(button);
      });
      result.setAttribute('role','status');
      panel.append(filters,A(E('div',null,'publication-toolbar'),search.wrap,sort.wrap),list,A(E('footer',null,'publication-table-footer'),result,E('p','All active colleges · Local restrictions apply','cycle-muted')));
      search.input.addEventListener('input',render);sort.input.addEventListener('change',render);
    }
    if(company){
      panel.classList.add('company-publications');
      filters.remove();panel.querySelector('.publication-toolbar').remove();
      pick.input.setAttribute('aria-label','Publication status');
      panel.prepend(A(E('div',null,'company-publication-filter'),pick.wrap));
      list.classList.add('cycle-publications','is-company-posts');

      sort.input.prepend(new Option('Published first','Published first'));sort.input.value='Published first';
      const sectionHeading=A(E('header',null,'company-listing-heading'),A(E('div'),E(dedicatedCompanyPage?'h1':'h2','Internship listings'),E('p','Manage submitted, reviewed, and published roles from one place.','cycle-muted')));panel.prepend(sectionHeading);
      const create=E('a','Post internship','cycle-button is-primary');create.href='../company-post-role/company-post-role.html?v=company-pages-4';sectionHeading.append(create);
      document.addEventListener('bridgeway:publication-filter',ev=>{filter=ev.detail;search.input.value='';render();});
      document.addEventListener('bridgeway:cycle-change',render);
    }
    function applicants(l,pending=false){
      if(dedicatedCompanyPage){location.href='../company-dashboard/company-dashboard.html#tab-candidates';return;}
      const inbox=document.querySelector('.cycle-applicant-inbox');if(!inbox)return;
      const input=inbox.querySelector('input'),statusSelect=inbox.querySelector('select');input.value=l?.title||'';statusSelect.value=pending?'Pending':'All';input.dispatchEvent(new Event('input',{bubbles:true}));statusSelect.dispatchEvent(new Event('change',{bubbles:true}));window.switchTab('tab-candidates');
    }
    function showPending(){if(filter!=='All'){filter='Pending review';pick.input.value=filter;}render();}
    function edit(l){location.href=`../company-post-role/company-post-role.html?listing=${encodeURIComponent(l.id)}`;}
    function remove(l){
      if(window.BridgewayKinetic){
        const previous=l.status;
        window.BridgewayKinetic.confirmDelete({title:l.title,onDelete:()=>{
          l.deletedFromStatus=previous;l.status='Deleted';l.deletedAt=now();
          commit('Company deleted listing; existing records retained');render();
        },onUndo:()=>{
          if(l.status!=='Deleted')return;
          l.status=l.deletedFromStatus||previous;delete l.deletedAt;delete l.deletedFromStatus;
          commit('Company restored deleted listing');render();say('Post restored in this workspace.');
        }});return;
      }
      const body=E('div');
      body.append(E('p',l.title,'cycle-delete-title'),E('p','This removes the post from discovery and the publication desk. Existing applications, student placements, and training history will be retained. You can restore it from the Deleted filter.','cycle-muted'));
      const d=dialog('Delete this post?',body);
      const cancel=B('Keep post',()=>d.close()),confirm=B('Delete post',()=>{
        l.deletedFromStatus=l.status;l.status='Deleted';l.deletedAt=now();
        commit('Company deleted listing; existing records retained');d.close();render();
      });confirm.classList.add('is-danger');
      body.append(A(E('div',null,'cycle-actions'),cancel,confirm));cancel.focus();
    }
    const publicationIcon=name=>{const node=E('i',null,'bi '+name);node.setAttribute('aria-hidden','true');return node;};
    function confirmCompanyPause(l,opener){
      if(l.status!=='Published')return;
      const form=E('form',null,'publication-pause-form');
      const cancel=B('Cancel',()=>popup.querySelector('header button').click()),confirm=E('button','Confirm pause','cycle-button is-primary');confirm.type='submit';confirm.dataset.confirmation='custom';
      form.append(E('p',l.title,'publication-pause-title'),E('p','This listing will be hidden from discovery. Existing applications and training remain intact.','cycle-muted'),A(E('div',null,'cycle-actions'),cancel,confirm));
      const popup=dialog('Pause this listing?',form);popup.classList.add('publication-pause-confirm','bw-dialog-surface');
      const heading=popup.querySelector('header'),icon=E('i',null,'bi bi-info-circle bw-dialog-heading-icon');icon.setAttribute('aria-hidden','true');heading.classList.add('bw-dialog-heading');heading.prepend(icon);
      popup.addEventListener('close',()=>{if(opener?.isConnected)return;const target=drawer?.open?drawer.querySelector('.publication-drawer-close'):[...list.querySelectorAll('[data-listing-id]')].find(row=>row.dataset.listingId===l.id)?.querySelector('summary')||pick.input;target?.focus({preventScroll:true});});
      form.addEventListener('submit',event=>{
        event.preventDefault();
        if(l.status!=='Published'){form.dataset.committed='true';popup.close();return;}
        l.status='Paused';form.dataset.committed='true';window.BridgewayUX?.remember(form);commit(`Listing ${l.title}: Paused`);render();if(drawer?.open)renderDrawer(l);popup.close();
      });
      cancel.focus();
    }
    function restorePublicationFocus(){
      const target=drawerOpener?.isConnected?drawerOpener:[...list.querySelectorAll('[data-listing-id]')].find(row=>row.dataset.listingId===drawerListing)?.querySelector('button,summary')||(company?pick.input:search.input);
      target.focus({preventScroll:true});
    }
    async function discardDecision(){
      const notes=drawer?.querySelector('textarea');
      return !notes?.value.trim()||!window.BridgewayUX?.confirmDiscard||await window.BridgewayUX.confirmDiscard();
    }
    async function dismissDrawer(){if(await discardDecision())drawer?.close();}
    function openListing(l,opener,nextStatus=''){
      if(drawer?.open)return;
      drawerListing=l.id;drawerOpener=opener;
      const sourceRow=opener.closest('[data-listing-id]');sourceRow?.classList.add('is-reviewing');
      drawer=E('dialog',null,'publication-drawer');drawer.setAttribute('aria-labelledby','publicationDrawerTitle');
      const close=B('',dismissDrawer);close.classList.add('publication-drawer-close');close.setAttribute('aria-label','Close listing details');close.append(publicationIcon('bi-x-lg'));
      drawer.append(A(E('header',null,'publication-drawer-top'),E('span','Listing details'),close),E('div',null,'publication-detail'));
      drawer.addEventListener('cancel',ev=>{ev.preventDefault();dismissDrawer();});
      drawer.addEventListener('click',ev=>{if(ev.target!==drawer)return;const r=drawer.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)dismissDrawer();});
      drawer.addEventListener('close',()=>{sourceRow?.classList.remove('is-reviewing');drawer.remove();drawer=null;restorePublicationFocus();},{once:true});
      document.body.append(drawer);renderDrawer(l,nextStatus);drawer.showModal();close.focus({preventScroll:true});
    }
    function renderDrawer(l,nextStatus=''){
      const detail=drawer.querySelector('.publication-detail');detail.replaceChildren();
      const title=E('h2',l.title);title.id='publicationDrawerTitle';
      detail.append(A(E('header',null,'publication-detail-heading'),status(l.status),title,E('p',`${org(l.company)} · ${l.location}`,'cycle-muted')));
      const facts=E('dl',null,'publication-facts');
      [['Application deadline',deadlineLabel(l.deadline)],['Open places',String(l.capacity)],['Training duration','8 weeks'],['Availability','All active colleges']].forEach(([label,value])=>facts.append(A(E('div'),E('dt',label),E('dd',value))));
      const skills=E('div',null,'publication-skills');l.skills.split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>skills.append(E('span',s)));
      if(l.categoryLabel)detail.append(A(E('p',null,'cycle-muted'),E('strong','Category: '),E('span',l.categoryLabel)));
      detail.append(facts,E('h3','Responsibilities'),E('p',l.description,'publication-description'),E('h3','Required skills'),skills);
      if(l.prerequisites?.length){const requirements=E('ul',null,'publication-prerequisites');l.prerequisites.forEach(text=>requirements.append(E('li',text)));detail.append(E('h3','Prerequisites'),requirements);}
      if(l.review&&l.review!=='Approved listing')detail.append(A(E('div',null,'publication-review-note'),E('h3','Latest review'),E('p',l.review)));
      if(nextStatus&&(!company||nextStatus==='Paused')){
        const required=nextStatus!=='Published',label=nextStatus==='Published'?(l.status==='Paused'?'Confirm resume':'Confirm publication'):nextStatus==='Paused'?'Confirm pause':'Confirm rejection';
        const form=E('form',null,'publication-decision'),notes=field(required?'Reason *':'Review notes (optional)','','textarea');notes.input.required=required;notes.input.maxLength=2000;
        const explanation=nextStatus==='Published'?'The listing will be available to active colleges, subject to their local availability restrictions.':nextStatus==='Paused'?'The listing will be hidden from discovery. Existing applications and training remain intact.':'The listing will remain unpublished. Add a reason the company can use when revising it.';
        const cancel=B('Cancel',async()=>{if(await discardDecision()){renderDrawer(l);drawer.querySelector('.publication-detail-actions button')?.focus();}}),confirm=E('button',label,'cycle-button '+(nextStatus==='Rejected'?'is-danger':'is-primary'));confirm.type='submit';confirm.dataset.confirmation='custom';
        const decisionTitle=nextStatus==='Published'?(l.status==='Paused'?'Resume this listing?':'Approve this listing?'):nextStatus==='Paused'?'Pause this listing?':'Reject this listing?';
        form.append(E('h3',decisionTitle),E('p',explanation,'cycle-muted'),notes.wrap,A(E('div',null,'cycle-actions'),cancel,confirm));detail.append(form);
        notes.input.addEventListener('input',()=>notes.input.setCustomValidity(''));
        form.addEventListener('submit',ev=>{
          ev.preventDefault();
          if(required&&!notes.input.value.trim()){notes.input.setCustomValidity('Add a reason for this decision.');notes.input.reportValidity();return;}
          const allowed=company?nextStatus==='Paused'&&l.status==='Published':nextStatus==='Published'?['Pending review','Paused'].includes(l.status):nextStatus==='Paused'?l.status==='Published':l.status==='Pending review';
          if(!allowed){renderDrawer(l);return;}
          l.status=nextStatus;l.review=notes.input.value.trim();form.dataset.committed='true';commit(`Listing ${l.title}: ${l.status}`);render();drawer.close();
        });
      }else{
        const actions=E('footer',null,'publication-detail-actions');
        const choices=company?(l.status==='Published'?[['Pause listing','Paused']]:[]):l.status==='Pending review'?[['Reject listing','Rejected'],['Approve & publish','Published']]:l.status==='Published'?[['Pause listing','Paused']]:l.status==='Paused'?[['Resume listing','Published']]:[];
        choices.forEach(([label,next])=>{const button=B(label,()=>{if(company&&next==='Paused'){confirmCompanyPause(l,button);return;}renderDrawer(l,next);drawer.querySelector('textarea').focus();},next==='Published');button.dataset.confirmation='custom';if(next==='Rejected')button.classList.add('is-danger');actions.append(button);});
        if(company&&l.status!=='Deleted'){
          const editButton=B('Edit listing',()=>edit(l));actions.prepend(editButton);
          const apps=B('View applications',()=>{drawer.close();applicants(l);});actions.append(apps);
        }
        if(!company&&!choices.length)actions.append(E('p','The company can revise and resubmit this listing.','cycle-muted'));
        if(company&&l.status==='Pending review')detail.append(E('p','Awaiting Platform Admin review. This listing is not published yet.','cycle-callout'));
        detail.append(actions);
      }
    }
    function reviewTable(items){
      const table=E('table',null,'publication-table');table.setAttribute('aria-label','Internship listings');
      const head=E('thead'),headRow=E('tr');(company?['Internship','Publication','Deadline','Actions']:['Internship / Company','Workplace','Deadline','Status','Actions']).forEach(label=>{const th=E('th',label);th.scope='col';headRow.append(th);});head.append(headRow);
      const body=E('tbody');table.append(head,body);
      items.forEach(l=>{
        const row=E('tr');row.dataset.listingId=l.id;
        const cell=label=>{const td=E('td');td.dataset.label=label;row.append(td);return td;};
        const identity=cell('Internship / Company'),title=B(l.title,()=>openListing(l,title));title.className='publication-title';title.setAttribute('aria-haspopup','dialog');identity.append(title,E('span',company?`${l.location} · ${l.capacity} ${l.capacity===1?'place':'places'}`:org(l.company),'publication-company'));
        if(company){const copy=E('div');copy.append(...identity.childNodes);identity.append(A(E('div',null,'company-listing-identity'),publicationIcon('bi-briefcase'),copy));}
        if(company){
          cell('Publication').append(status(l.status));
        }else{
        const parts=l.location.split('·').map(value=>value.trim()),place=cell('Workplace');place.append(E('span',parts[0]),E('span',parts.slice(1).join(' · '),'publication-company'));
        const dateCell=cell('Deadline');const time=E('time',deadlineLabel(l.deadline));time.dateTime=l.deadline;dateCell.append(time);
        cell('Status').append(status(l.status));
        }
        if(company){const time=E('time',deadlineLabel(l.deadline));time.dateTime=l.deadline;cell('Deadline').append(time);}
        const actions=A(cell('Actions'),E('div',null,'publication-row-actions')).firstElementChild;
        const view=B(company?'View listing':l.status==='Pending review'?'Review':'View details',()=>openListing(l,view),!company&&l.status==='Pending review');view.setAttribute('aria-haspopup','dialog');if(!company)actions.append(view);
        const menu=E('details',null,'publication-menu'),trigger=E('summary');trigger.setAttribute('aria-label',`Actions for ${l.title}`);trigger.append(publicationIcon('bi-three-dots'));
        const options=E('div',null,'publication-menu-options');
        const option=(label,next='')=>{const button=B(label,()=>{menu.open=false;if(company&&next==='Paused'){trigger.focus();confirmCompanyPause(l,trigger);}else openListing(l,trigger,next);});button.dataset.confirmation='custom';button.setAttribute('aria-haspopup','dialog');button.prepend(publicationIcon(next==='Paused'?'bi-pause-circle':next==='Published'?'bi-play-circle':'bi-file-earmark-text'));options.append(button);};
        if(company){
          const companyAction=(label,fn)=>{
            const button=B(label,()=>{menu.open=false;trigger.focus();fn();});button.dataset.confirmation='custom';
            button.prepend(publicationIcon(label==='Edit listing'?'bi-pencil-square':label==='Restore listing'?'bi-arrow-counterclockwise':'bi-trash3'));
            if(label==='Delete listing'){button.classList.add('publication-delete-action','is-danger');button.setAttribute('aria-haspopup','dialog');}
            options.append(button);
          };
          if(l.status==='Deleted')companyAction('Restore listing',()=>{l.status=l.deletedFromStatus||'Pending review';delete l.deletedAt;delete l.deletedFromStatus;filter='All';commit('Company restored listing');render();});
          else{companyAction('Edit listing',()=>edit(l));if(l.status==='Published')option('Pause listing','Paused');companyAction('Delete listing',()=>remove(l));}
        }else{option('View listing');if(l.status==='Published')option('Pause listing','Paused');if(l.status==='Paused')option('Resume listing','Published');}
        menu.append(trigger,options);actions.append(menu);
        menu.addEventListener('toggle',()=>{if(menu.open)list.querySelectorAll('details[open]').forEach(other=>{if(other!==menu)other.open=false;});});
        menu.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();menu.open=false;trigger.focus();}});
        body.append(row);
      });
      if(!items.length){const td=E('td',null,'publication-empty');td.colSpan=company?4:5;const reset=B('Clear filters',()=>{filter='All';pick.input.value='All';search.input.value='';render();(company?pick.input:search.input).focus();});td.append(publicationIcon('bi-search'),E('strong','No matching listings'),E('p',company?'Choose another publication status.':'Try another role, company, or publication status.'),reset);body.append(A(E('tr'),td));}
      if(company&&items.length){
        items.forEach(l=>{
          const source=[...body.children].find(row=>row.dataset.listingId===l.id),menu=source.querySelector('.publication-menu');
          const card=E('article',null,'company-post-card');card.dataset.listingId=l.id;
          const title=B(l.title,()=>openListing(l,title));title.className='company-post-title';title.setAttribute('aria-haspopup','dialog');
          menu.classList.add('cycle-post-menu');menu.querySelector('.publication-menu-options').classList.add('cycle-post-menu-options');
          const heading=A(E('header',null,'company-post-card-heading'),status(l.status),menu);
          const skills=E('div',null,'company-post-card-skills'),tokens=[...new Set(l.skills.split(',').map(s=>s.trim()).filter(Boolean))];
          skills.setAttribute('aria-label','Required skills');tokens.slice(0,3).forEach(text=>skills.append(E('span',text)));
          if(tokens.length>3){const more=B(`+${tokens.length-3}`,()=>openListing(l,more));more.setAttribute('aria-label',`View all ${tokens.length} required skills for ${l.title}`);more.setAttribute('aria-haspopup','dialog');skills.append(more);}
          const facts=E('dl',null,'company-post-card-facts');
          facts.append(A(E('div'),E('dt','Open places'),E('dd',String(l.capacity))),A(E('div'),E('dt','Application deadline'),A(E('dd'),Object.assign(E('time',deadlineLabel(l.deadline)),{dateTime:l.deadline}))));
          card.append(heading,A(E('h3'),title),A(E('p',null,'company-post-card-location'),publicationIcon('bi-geo-alt'),E('span',l.location)),E('p',l.description,'company-post-card-description'),skills,facts,E('p','All active colleges','company-post-card-availability'));
          if(l.review&&l.review!=='Approved listing')card.append(A(E('div',null,'company-post-card-review'),E('strong','Latest review'),E('p',l.review)));
          list.append(card);
        });
      }else list.append(table);
    }
    function render(){
      list.replaceChildren();
      const query=search.input.value.trim().toLowerCase();
      const items=state.listings.filter(l=>(!company||l.company==='company-1')&&(filter==='All'?l.status!=='Deleted':l.status===filter)&&(!query||`${l.title} ${org(l.company)} ${l.skills} ${l.location}`.toLowerCase().includes(query)));
      {
        filterButtons.forEach(button=>{
          const value=button.dataset.status,count=state.listings.filter(l=>(!company||l.company==='company-1')&&(value==='All'?l.status!=='Deleted':l.status===value)).length;
          button.replaceChildren(E('span',value==='All'?(company?'All':'All listings'):value),E('span',String(count),'publication-filter-count'));
          button.setAttribute('aria-pressed',String(filter===value));
        });
        if(company)pick.input.value=filter;
        result.textContent=`${items.length} of ${state.listings.filter(l=>(!company||l.company==='company-1')&&(filter==='Deleted'||l.status!=='Deleted')).length} ${company?'internships':'listings'}${query?' matching your search':''}`;
      }
      items.sort((a,b)=>sort.input.value==='Role: A to Z'?a.title.localeCompare(b.title):sort.input.value==='Deadline: earliest first'?a.deadline.localeCompare(b.deadline):sort.input.value==='Published first'?Number(b.status==='Published')-Number(a.status==='Published'):Number(b.status==='Pending review')-Number(a.status==='Pending review'));
      reviewTable(company?items.sort((a,b)=>state.listings.indexOf(a)-state.listings.indexOf(b)):items);
    }

    panel.addEventListener('click',ev=>{list.querySelectorAll('details[open]').forEach(menu=>{if(!menu.contains(ev.target))menu.open=false;});});
    document.addEventListener('pointerdown',ev=>{if(!panel.contains(ev.target))list.querySelectorAll('details[open]').forEach(menu=>{menu.open=false;});});
    pick.input.addEventListener('change',()=>{filter=pick.input.value||'All';render();});render();
  }
function admissions(root,college=false){const panel=section(college?'Placement setup':'Applicant inbox',college?'Activate training after company acceptance. Keep or update the assigned academic supervisor.':'Review applicants, arrange interviews, and make your hiring decisions.');if(!college)panel.classList.add('cycle-applicant-inbox');root.prepend(panel);const tools=E('div',null,'cycle-toolbar'),search=field('Find an applicant','','search'),filter=select('Application status',['All','Pending','Accepted','Placed','Rejected','Withdrawn','Closed'],'All');tools.append(search.wrap);if(!college)tools.append(filter.wrap);if(!college)search.input.placeholder='Search by name, student ID, or role';panel.append(tools);const list=E('div');panel.append(list);search.input.addEventListener('input',render);filter.input.addEventListener('change',render);
    function render(){list.replaceChildren();const apps=state.applications.filter(a=>college?student(a.student).college==='college-1'&&['Accepted','Placed'].includes(a.status):a.company==='company-1').filter(a=>(filter.input.value==='All'||college||a.status===filter.input.value)&&`${student(a.student).name} ${student(a.student).studentId} ${state.listings.find(l=>l.id===a.listing)?.title}`.toLowerCase().includes(search.input.value.toLowerCase().trim()));if(!apps.length){list.append(E('p',college?'No accepted applicants waiting for placement.':(search.input.value.trim()||filter.input.value!=='All'?'No applicants match these filters. Try another name or choose All statuses.':'Applications to your listings will appear here.'),'cycle-muted'));return;}apps.forEach(a=>{const s=student(a.student),l=state.listings.find(l=>l.id===a.listing);const row=A(E('section',null,'cycle-admission'),A(E('div'),E('strong',s.name),E('p',`${s.studentId} · ${l?.title} · ${org(a.company)}`,'cycle-muted')),status(a.status));row.append(B('Student details',()=>{const body=section(s.name,`${s.studentId} · ${org(s.college)}`);body.append(E('p',`GPA ${s.gpa} · Applied for ${l.title}`),status(a.status),E('p','Application. CV document contents are not stored or analyzed.','cycle-muted'));if(a.profile){body.append(E('h3',a.profile.name||'Student introduction'),E('p',a.profile.bio||''),E('p',a.profile.phone||''));}if(a.skills?.length)body.append(window.BridgewayJourney.skillsPanel(s.id,l,a.skills));(a.answers||[]).forEach(answer=>body.append(E('h3',answer.question),E('p',answer.answer)));if(a.closedReason)body.append(E('p',a.closedReason));dialog('Applicant record',body);}));if(college&&a.status==='Placed'){row.append(E('p',`Assigned to ${a.supervisor}. Training plan is ready for the company.`,'cycle-muted'));}else if(college){const supervisor=select('Academic supervisor',[['','Select a supervisor'],...[...new Set(['Dr. Ahmad S.',...model.students.filter(item=>item.college===s.college).map(item=>item.supervisor).filter(Boolean)])].map(name=>[name,name])],s.supervisor||'');row.append(supervisor.wrap,B('Activate placement',()=>{if(!supervisor.input.value){supervisor.input.setCustomValidity('Select an academic supervisor.');supervisor.input.reportValidity();supervisor.input.setCustomValidity('');return;}a.status='Placed';a.supervisor=supervisor.input.value;s.stage='Placed';s.company=a.company;s.supervisor=supervisor.input.value;const previous=state.histories.find(h=>h.student===s.id);if(previous&&previous.status!=='Active'&&state.plans[s.id]){(state.archivedPlans||={})[previous.id]=structuredClone(state.plans[s.id]);if(state.evaluations[s.id]){(state.archivedEvaluations||={})[previous.id]=structuredClone(state.evaluations[s.id]);delete state.evaluations[s.id];}delete state.plans[s.id];}state.histories.unshift({id:crypto.randomUUID(),student:s.id,company:a.company,role:l.title,start:new Date().toISOString().slice(0,10),end:'',status:'Active',reason:''});window.BridgewayCycle.seedPlan(s.id);window.BridgewayAcademicAssignments?.set(s.name,s.college,s.supervisor);commit(`College assigned a supervisor to ${s.name}`);render();},true));}else if(a.status==='Pending')row.append(A(E('div',null,'cycle-actions'),B('Accept applicant',()=>{if(state.applications.some(other=>other.id!==a.id&&other.student===a.student&&(other.status==='Accepted'||other.status==='Placed'&&state.histories.some(h=>h.student===a.student&&h.status==='Active')))){say('This student already has another accepted application or active placement.');return;}a.status='Accepted';s.stage='Awaiting placement';s.company=a.company;state.applications.filter(other=>other.id!==a.id&&other.student===a.student&&other.status==='Pending').forEach(other=>{other.status='Closed';other.closedReason='Another internship accepted this student.';other.closedAt=now();if(other.interview)other.interview.status='Cancelled';});commit(`Company accepted ${s.name}`);render();},true),B('Reject applicant',()=>{
          const reject=()=>{if(a.status!=='Pending')return;a.status='Rejected';commit(`Company rejected ${s.name}`);render();};
          if(window.BridgewayKinetic?.confirmReject)window.BridgewayKinetic.confirmReject({
            title:s.name,onReject:reject,
            onUndo:()=>{if(a.status!=='Rejected'){say('This application has changed. Reopen it to review the latest status.');return;}a.status='Pending';commit(`Company restored ${s.name}'s pending application`);render();}
          });else reject();
        })));if(!college){if(a.status==='Pending')row.append(B(a.interview?'Manage interview':'Request interview',()=>window.BridgewayCycle.interviews?.request(a,render)));row.classList.add('cycle-company-application');
          const identity=row.firstElementChild,badge=row.children[1],details=row.children[2];
          identity.replaceChildren(E('strong',s.name),E('p',l?.title||'Internship application','cycle-applicant-role'),E('p',`Student ID ${s.studentId} · ${org(s.college)}`,'cycle-muted'));
          const heading=A(E('div',null,'cycle-applicant-heading'),identity,badge);
          const controls=E('div',null,'cycle-admission-controls'),secondary=E('div',null,'cycle-applicant-secondary');
          secondary.append(details);
          const decisions=row.querySelector('.cycle-actions');
          const rejection=decisions?.querySelector('button:last-child');
          if(rejection){rejection.classList.add('is-danger');rejection.dataset.holdReject='true';rejection.setAttribute('aria-haspopup','dialog');}
          [...row.children].filter(n=>n!==decisions).forEach(n=>secondary.append(n));
          const interview=secondary.querySelector('button:last-child');
          if(a.status==='Pending'&&interview&&interview!==details){const camera=E('i',null,'bi bi-camera-video');camera.setAttribute('aria-hidden','true');interview.prepend(camera);}
          controls.append(secondary);
          if(decisions){decisions.setAttribute('aria-label',`Hiring decision for ${s.name}`);controls.append(decisions);}
          row.append(heading,controls);}list.append(row);});}render();
  }
  function evaluations(root){root.replaceChildren();const layout=E('div',null,'cycle-evaluation-workspace'),picker=section('Assigned students','Company-submitted evaluations · Read only'),search=field('Find an evaluation','','search'),list=E('div'),detail=section('Select a student','Read the company assessment, scores, and mentor comments.');picker.append(search.wrap,list);layout.append(picker,detail);root.append(layout);let selected='';function render(){list.replaceChildren();const matches=model.students.filter(s=>s.supervisor==='Dr. Ahmad S.'&&`${s.name} ${s.studentId} ${org(s.company)}`.toLowerCase().includes(search.input.value.trim().toLowerCase()));matches.forEach(s=>{const b=B('',()=>{selected=s.id;render();});b.className='cycle-ticket';b.setAttribute('aria-pressed',String(selected===s.id));b.append(E('strong',s.name),E('small',`${s.studentId} · ${org(s.company)}`),status(state.evaluations[s.id]?'Submitted':'Not submitted'));list.append(b);});if(!matches.length)list.append(E('p','No matching assigned students.','cycle-muted'));if(selected&&matches.some(s=>s.id===selected)){detail.replaceChildren(window.BridgewayCycle.evaluation(selected));}else if(selected){detail.replaceChildren(E('h2','Select a matching student'));}}search.input.addEventListener('input',render);render();}
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.append(message);const role=document.body.dataset.portalRole;const main=document.querySelector('.bw-main-content');if(!main)return;
    if(role==='platform_admin'||location.pathname.includes('/platform-admin/')){
      const register=nav('platform-students','Student register','bi-people');oversight(register);
      const moderation=nav('platform-publications','Listing review','bi-file-check');publications(moderation);
      const issues=document.getElementById('platform-issues');if(issues){[...issues.children].forEach(n=>n.hidden=true);const desk=E('div');issues.append(desk);tickets(desk,true);document.querySelector('[data-tab="platform-issues"] span').textContent='My Tickets';}
      document.querySelectorAll('.company-text-button[data-platform-tab="platform-issues"]').forEach(b=>b.textContent='Open support desk');
      const legacyIssues=document.getElementById('platformPriorityIssues')?.closest('section');if(legacyIssues)legacyIssues.hidden=true;
      const issueNav=document.querySelector('[data-tab="platform-issues"]');if(issueNav){issueNav.setAttribute('aria-label','My Tickets');issueNav.title='My Tickets';}
      const overview=document.getElementById('platform-overview');if(overview){const ops=section('Operations at a glance','Publication decisions, training visibility, and conversations across the platform.');const actions=E('div',null,'cycle-operations');for(const [key,tab]of [['listings','platform-publications'],['tickets','platform-issues'],['students','platform-students']]){const button=B('',()=>window.switchTab(tab));button.dataset.cycleCount=key;actions.append(button);}ops.append(actions);overview.prepend(ops);}
      const titles={'platform-students':'Student register','platform-publications':'Listing review','platform-issues':'My Tickets'};document.querySelectorAll('.bw-tab-panel').forEach(p=>new MutationObserver(()=>{if(p.classList.contains('is-active')&&titles[p.id]){document.getElementById('platformPageTitle').textContent=titles[p.id];document.getElementById('platformPageDescription').textContent='Operations workspace';document.getElementById('platformOverviewTools').hidden=true;}}).observe(p,{attributes:true,attributeFilter:['class']}));
    }else{
      const ticketPanel=nav('tab-tickets','My Tickets','bi-chat-square-text');tickets(ticketPanel);
      new MutationObserver(()=>{if(ticketPanel.classList.contains('is-active')&&role!=='student'){const heading=main.querySelector('h1');if(heading)heading.textContent='My Tickets';}}).observe(ticketPanel,{attributes:true,attributeFilter:['class']});
      document.querySelectorAll('.portal-report-issue').forEach(old=>old.remove());
    }
    const companyListingsPage=document.getElementById('companyListingsPage');
    if(role==='company'&&companyListingsPage)publications(companyListingsPage,true);
    if(role==='company'&&document.getElementById('companyWeeklyDetail')){
      const old=document.getElementById('companyWeeklyForm');old.dataset.cycleManaged='true';old.hidden=true;document.querySelector('.weekly-section-heading').hidden=true;document.querySelector('.weekly-report-context').hidden=true;
      const mount=E('section',null,'cycle-training');old.after(mount);const original=window.selectWeeklyIntern;window.selectWeeklyIntern=(id,...args)=>{original(id,...args);training(mount,id==='1'?'alice':'ghaith','company');};
      const reviewPending=()=>{window.switchTab('tab-candidates');const inbox=document.querySelector('.cycle-applicant-inbox');if(!inbox)return;const search=inbox.querySelector('input'),select=inbox.querySelector('select');search.value='';select.value='Pending';search.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));};
      document.querySelectorAll('[data-summary]').forEach(button=>button.addEventListener('click',()=>{
        if(button.dataset.summary==='published')location.href='../company-listings/company-listings.html';
        else if(button.dataset.summary==='applications')reviewPending();
        else{window.switchTab(button.dataset.kpiTab);if(button.dataset.summary==='interns')document.querySelector('[data-accepted-filter="accepted"]')?.click();}
      }));

      const candidates=document.getElementById('tab-candidates');if(candidates){[...candidates.children].forEach(n=>n.hidden=true);admissions(candidates);}
      for(const s of model.students.filter(s=>s.company==='company-1'&&state.histories.some(h=>h.student===s.id&&h.status==='Active')&&!['alice','ghaith'].includes(s.id))){const b=B('',()=>{document.getElementById('companyWeeklyPrompt').hidden=true;document.getElementById('companyWeeklyDetail').hidden=false;training(mount,s.id,'company');});b.className='company-student-button';b.append(E('strong',s.name),E('small',s.studentId));document.getElementById('weeklyStudentList').append(b);}
      const selected=document.getElementById('activeInternSelect').value;if(selected)training(mount,selected==='1'?'alice':'ghaith','company');
      const submit=document.getElementById('submitRubricBtn');submit.addEventListener('click',ev=>{ev.stopImmediatePropagation();const id=document.getElementById('evaluationStudentSelect').value;if(student(id)?.company!=='company-1'||state.histories.find(h=>h.student===id)?.status!=='Active'||window.BridgewayJourney?.certificate(id)){say('Only your active interns can receive a final evaluation.');return;}if(!H.evaluationReady(state.plans[id])){say('Verify all eight weekly reports and all 120 training hours before opening the final evaluation.');return;}const scores=[...document.querySelectorAll('#rubricCriteriaContainer .bw-rubric-rating-row')].map(row=>Number(row.querySelector('.bw-scale-btn.is-active')?.dataset.val||0));if(scores.length!==8||scores.some(n=>!n)){say('Rate all eight evaluation criteria.');return;}state.evaluations[id]={scores,comments:document.getElementById('evaluationComments').value.trim(),company:'company-1',date:now()};commit(`Company evaluation forwarded to academic supervisor for ${student(id).name}`);dialog('Submitted assessment',window.BridgewayCycle.evaluation(id));},true);
    }
    if(role==='supervisor'){
      const supervisor='Dr. Ahmad S.',panel=document.getElementById('tab-reports');
      if(panel){
        const visibility=E('section',null,'cycle-visibility'),icon=E('i'),copy=E('div'),title=E('strong'),description=E('p','Applies to every week for all students assigned to you, including future weeks. Weekly plans and verified hours remain visible.');
        icon.setAttribute('aria-hidden','true');visibility.setAttribute('aria-label','Report visibility for all assigned students');
        const toggle=B('',()=>{const restricted=!state.reportVisibility[supervisor];window.BridgewayReportVisibility.set(state,supervisor,restricted);commit(restricted?'Supervisor restricted all assigned student reports':'Supervisor made all assigned student reports visible');updateVisibility();});
        toggle.id='supervisorReportVisibility';
        function updateVisibility(){const restricted=!!state.reportVisibility[supervisor];visibility.classList.toggle('is-locked',restricted);icon.className=restricted?'bi bi-shield-lock':'bi bi-eye';title.textContent=restricted?'Restricted view':'Visible to students';toggle.textContent=restricted?'Make reports visible':'Restrict view';toggle.setAttribute('aria-pressed',String(restricted));toggle.setAttribute('aria-label',restricted?'Make all reports visible to assigned students':'Restrict all reports from assigned students');}
        const scope=E('small','All assigned students · All weeks');title.setAttribute('role','status');copy.append(scope,title,description);visibility.append(icon,copy,toggle);panel.prepend(visibility);updateVisibility();
      }
      const evaluationPanel=document.getElementById('tab-endorsement');if(evaluationPanel)evaluations(evaluationPanel);
      const detail=document.getElementById('supervisorReportDetail');if(detail){detail.dataset.cycleManaged='true';detail.querySelectorAll('.report-week-tracker,.report-student-summary,.report-document').forEach(n=>n.hidden=true);const mount=E('section',null,'cycle-training');detail.append(mount);const original=window.reviewStudentReport;window.reviewStudentReport=(name,...args)=>{original(name,...args);const s=model.students.find(s=>s.name===name);if(s)training(mount,s.id,'supervisor');};}
    }
    if(role==='admin'&&document.getElementById('tab-approved')){
      admissions(document.getElementById('tab-approved'),true);
      const reason=field('Reason for ending the placement','','textarea');reason.input.maxLength=1500;document.querySelector('#terminateModal .bw-modal-body')?.append(reason.wrap);
      document.getElementById('confirmTerminateBtn')?.addEventListener('click',ev=>{if(!reason.input.value.trim()){ev.stopImmediatePropagation();reason.input.setCustomValidity('Record why the placement is ending.');reason.input.reportValidity();reason.input.setCustomValidity('');return;}const name=document.getElementById('terminateStudentName').textContent,s=model.students.find(s=>s.name===name),h=state.histories.find(h=>h.student===s?.id&&h.status==='Active');if(h){h.status='Left';h.end=new Date().toISOString().slice(0,10);h.reason=reason.input.value.trim();h.verifiedHours=hours(s.id);queueMicrotask(()=>commit(`College ended the placement for ${name}`));}},true);
    }
    const id=location.hash.slice(1);if(document.getElementById(id)?.classList.contains('bw-tab-panel'))window.switchTab(id);
    function updateCounts(){
      document.querySelectorAll('.company-week-report').forEach(report=>reportGates.get(report)?.());
      for(const s of model.students){const plan=state.plans[s.id];if(!plan?.length)continue;s.weeks=H.focusWeek(plan)+1;s.hours=hours(s.id);}
      document.querySelectorAll('[data-weekly-id]').forEach(button=>{
        const s=student(button.dataset.weeklyId==='1'?'alice':button.dataset.weeklyId==='2'?'ghaith':button.dataset.weeklyId),plan=state.plans[s?.id];if(!plan?.length)return;
        const week=H.focusWeek(plan)+1;button.dataset.weeklyWeek=String(week);
        const small=button.querySelector('small');if(small)small.textContent=`ID ${s.studentId} · ${plan.every(w=>w.status==='verified')?'All weeks verified':`Week ${week} of 8`}`;
      });
      const companyPosts=document.getElementById('kpiActivePosts');if(companyPosts)companyPosts.textContent=published().filter(l=>l.company==='company-1').length;
      const pendingApplications=document.getElementById('companyApplicationsMetric');if(pendingApplications)pendingApplications.textContent=state.applications.filter(a=>a.company==='company-1'&&a.status==='Pending').length;if(pendingApplications)pendingApplications.closest('button').classList.toggle('has-pending',Number(pendingApplications.textContent)>0);
      const activeInterns=document.getElementById('companyInternsMetric');if(activeInterns)activeInterns.textContent=new Set(state.histories.filter(h=>h.company==='company-1'&&h.status==='Active').map(h=>h.student)).size;
      const reportTotal=ids=>ids.reduce((n,id)=>n+(state.plans[id]||[]).filter(w=>w.status==='submitted').length,0);
      const companyReports=document.querySelector('[data-kpi-tab="tab-weekly-reports"] .bw-kpi-value');if(companyReports)companyReports.textContent=reportTotal(model.students.filter(s=>s.company==='company-1').map(s=>s.id));
      if(role==='supervisor'){
        const assigned=model.students.filter(s=>s.supervisor==='Dr. Ahmad S.'),total=reportTotal(assigned.map(s=>s.id));
        const badge=document.querySelector('[data-tab="tab-reports"] .bw-tab-badge');if(badge)badge.textContent=total;
        const rosterBadge=document.querySelector('[data-tab="tab-roster"] .bw-tab-badge');if(rosterBadge)rosterBadge.textContent=assigned.length;
        const reported = assigned.flatMap(student => state.plans[student.id] || []).filter(week => week.status !== 'draft');
        const metrics = {
          supervisedStudentsMetric: assigned.length,
          submittedReportsMetric: reported.length,
          reportedHoursMetric: reported.reduce((sum, week) => sum + Number(week.actualHours || 0), 0) + ' h',
          kpiPendingReports: total
        };
        for (const [id, value] of Object.entries(metrics)) {
          const metric = document.getElementById(id);
          if (metric) metric.textContent = value;
        }
      }
      const totals={platformStudentCount:model.students.length,platformPlacementCount:state.histories.filter(h=>h.status==='Active').length,platformListingCount:state.listings.filter(l=>l.status!=='Deleted').length,platformIssueCount:state.tickets.filter(t=>ticketVisible(t,'platform')&&t.status!=='Resolved').length};
      for(const [id,n]of Object.entries(totals)){const node=document.getElementById(id);if(node)node.textContent=n;}
      const pending=state.listings.filter(l=>l.status==='Pending review').length,tickets=totals.platformIssueCount,students=model.students.length;
      const labels={listings:`${pending} ${pending===1?'listing':'listings'} awaiting review`,tickets:`${tickets} active ${tickets===1?'ticket':'tickets'}`,students:`${students} ${students===1?'student':'students'} in the register`};
      document.querySelectorAll('[data-cycle-count]').forEach(button=>button.textContent=labels[button.dataset.cycleCount]);
    }
    updateCounts();document.addEventListener('bridgeway:cycle-change',updateCounts);
    const syncCollege=()=>{if(role!=='admin')return;document.querySelectorAll('#tab-approved tbody tr[data-student-id]').forEach(row=>{const h=state.histories.find(h=>h.student===row.dataset.studentId);if(!h||h.status==='Active')return;row.cells[5].replaceChildren(status(h.status));row.cells[6].replaceChildren(E('span','History retained','cycle-muted'));});const count=document.querySelector('[data-tab="tab-approved"] .bw-tab-badge');if(count)count.textContent=new Set(state.histories.filter(h=>student(h.student)?.college==='college-1').map(h=>h.student)).size;};
    syncCollege();document.addEventListener('bridgeway:cycle-change',syncCollege);
    if(role==='supervisor'){
      const directory=document.getElementById('supervisorReportStudents');
      const sync=()=>{directory?.querySelectorAll('button').forEach(b=>{const s=model.students.find(s=>s.name===b.querySelector('strong')?.textContent);if(!s||!state.plans[s.id])return;const plans=state.plans[s.id],i=H.focusWeek(plans);const small=b.querySelector('small');if(small)small.textContent=plans.every(w=>w.status==='verified')?'All weeks verified':`Week ${i+1} · ${plans[i].status==='submitted'?'In review':plans[i].status==='revision'?'Revision requested':plans[i].status}`;});};
      sync();if(directory)new MutationObserver(sync).observe(directory,{childList:true});document.addEventListener('bridgeway:cycle-change',sync);
    }
  });
})();
