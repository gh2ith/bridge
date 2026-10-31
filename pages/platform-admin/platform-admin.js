/* Organization and partnership interactions backed by the temporary local workspace. */
document.addEventListener('DOMContentLoaded', () => {
  const organizations = window.BridgewayPartners.organizations;
  const partnerships = window.BridgewayPartners.links;
  const issues = [
    {id:'BW-102',title:'Replace the college administrator contact',organization:'college-2',status:'Open',description:'The college has requested an update to its administrator contact. Confirm the replacement contact details with the college.',resolution:''},
    {id:'BW-101',title:'Partnership access question',organization:'company-2',status:'In progress',description:'The company needs help confirming which colleges are linked to its account.',resolution:''}
  ];
  const $ = id => document.getElementById(id);
  let nextId = 10;
  let editingIssue = null;
  let partnershipView = 'list', selectedNetworkOrg = null, selectedNetworkLink = null;
  let focusedNetworkCollege = 'all';
  const mapMobile = window.matchMedia('(max-width: 760px)');
  const mapMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const linkStatus = link => window.BridgewayPartners.effective(link) ? 'Active' : link.status === 'Active' ? 'Account suspended' : 'Paused';
  const titles = {
    'platform-overview':['Platform overview','Manage the colleges and companies that make Bridgeway possible.'],
    'platform-companies':['Company accounts','Create accounts, maintain contact details, and manage company access.'],
    'platform-colleges':['College accounts','Manage college details and their administrator accounts.'],
    'platform-partnerships':['Partnerships','Connect colleges and companies for internship opportunities.'],
    'platform-issues':['My Tickets','Follow conversations and resolve requests across the platform.']
  };
  const orgName = id => organizations.find(org => org.id === id)?.name || 'Organization';
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function action(text, callback, label) {
    const node = element('button',text,'bw-tag-btn'); node.type='button';
    if (label) node.setAttribute('aria-label',label);
    node.addEventListener('click',callback); return node;
  }
  function badge(status) {
    return element('span',status,`platform-status${status==='Paused'?' is-paused':['Suspended','Inactive','Resolved'].includes(status)?' is-muted': ['Open','In progress'].includes(status)?' is-pending':''}`);
  }
  function cell(row, content) { const td=element('td'); td.append(content); row.append(td); return td; }
  function identity(name,meta) { const div=element('div'); div.append(element('span',name,'platform-record-name'),element('span',meta,'platform-record-meta')); return div; }
  function filterTable(panelId) {
    const query=document.querySelector(`[data-platform-search="${panelId}"]`).value.trim().toLowerCase();
    const rows=Array.from($(`${panelId}-rows`).rows); let count=0;
    rows.forEach(row => {row.hidden=!row.textContent.toLowerCase().includes(query); if(!row.hidden) count++;});
    document.querySelector(`[data-result-count="${panelId}"]`).textContent=`${count} of ${rows.length} records`;
    document.querySelector(`[data-empty="${panelId}"]`).hidden=count>0;
    if(panelId==='platform-partnerships') renderPartnershipMap();
  }
  async function togglePartnership(link) {
    if(link.status==='Active'&&!await window.confirmPartnershipPause(`Are you sure you want to pause the partnership between ${orgName(link.college)} and ${orgName(link.company)}? New applications and placements will stop; existing training continues. `))return;
    const members=organizations.filter(org=>[link.college,link.company].includes(org.id));
    if(link.status!=='Active'&&members.some(org=>org.status!=='Active')) {showPortalToast('Activate both organization accounts before reactivating this partnership.');return;}
    link.status=link.status==='Active'?'Inactive':'Active';
    render();
    if(partnershipView==='map') (document.querySelector(`[data-network-link="${link.id}"]`)||document.querySelector(`[data-network-org="${link.company}"]`))?.focus({preventScroll:true});
    showPortalToast(link.status==='Active'?'Partnership resumed in this workspace.':'Partnership paused in this workspace. Existing training and history remain intact.');
  }
  function networkSelection(orgId,linkId=null) {
    if(organizations.find(org=>org.id===orgId)?.type==='college') focusedNetworkCollege=orgId;
    selectedNetworkOrg=orgId; selectedNetworkLink=linkId;
    renderPartnershipMap();
    const company=partnerships.find(link=>link.id===linkId)?.company;
    const control=linkId?document.querySelector(`[data-network-link="${linkId}"]`)||document.querySelector(`[data-network-org="${company}"]`):document.querySelector(`[data-network-org="${orgId}"]`);
    control?.focus({preventScroll:true});
  }
  function renderNetworkDetail() {
    const detail=$('partnershipMapDetail'); detail.replaceChildren();
    const link=partnerships.find(item=>item.id===selectedNetworkLink);
    const org=organizations.find(item=>item.id===selectedNetworkOrg);
    if(link) {
      detail.append(element('span','PARTNERSHIP DETAILS','partnership-map-eyebrow'),element('h3',orgName(link.college)),element('p',`Connected to ${orgName(link.company)}`,'network-detail-company'),badge(linkStatus(link)));
      const members=window.BridgewayPartners.students.filter(s=>s.college===link.college&&s.company===link.company);
      const summary=element('dl',undefined,'network-detail-stats');
      for(const [label,value] of [['Interns',members.filter(s=>s.stage==='Placed').length],['Pending applicants',members.filter(s=>s.stage==='Applied').length]]) {
        const row=element('div');row.append(element('dt',label),element('dd',String(value)));summary.append(row);
      }
      detail.append(summary,element('p',linkStatus(link)==='Active'?'Students from this college can apply to this company’s open listings.':'New applications and placements are unavailable through this connection. Existing training and history remain intact.','network-detail-note'));
      const controls=element('div',undefined,'network-detail-actions');
      controls.append(action('View cycle',()=>openPartnerCycle(link)),action(link.status==='Active'?'Pause partnership':'Resume partnership',()=>togglePartnership(link)));
      detail.append(controls);
    } else if(org) {
      detail.append(element('span',org.type==='college'?'COLLEGE CONNECTIONS':'COMPANY CONNECTIONS','partnership-map-eyebrow'),element('h3',org.name),element('p',`${org.location} · ${org.status} account`,'network-detail-company'));
      const links=partnerships.filter(l=>l.college===org.id||l.company===org.id);
      detail.append(element('p',`${links.length} partner connection${links.length===1?'':'s'}. Select one to inspect its status and actions.`,'network-detail-note'));
      links.forEach(l=>{const button=action(orgName(org.type==='college'?l.company:l.college),()=>networkSelection(null,l.id));button.append(badge(linkStatus(l)));button.classList.add('network-detail-partner');detail.append(button);});
    } else {
      const icon=element('i',undefined,'bi bi-diagram-3');icon.setAttribute('aria-hidden','true');
      const well=element('span',undefined,'network-detail-icon');well.append(icon);
      detail.append(well,element('h3','Explore a partnership.'),element('p',focusedNetworkCollege==='all'?'Select a college to rearrange the map around its partners. Select a company or connection to inspect partnership details.':'Select a partner company to view details or pause and resume its connection to this college.','network-detail-note'));
    }
  }
  function renderPartnershipMap() {
    if(partnershipView!=='map') return;
    const previous=mapMotion.matches?[]:Array.from(document.querySelectorAll('[data-network-org]')).map(node=>({id:node.dataset.networkOrg,rect:node.getBoundingClientRect()}));
    const query=document.querySelector('[data-platform-search="platform-partnerships"]').value.trim().toLowerCase();
    const matching=partnerships.filter(l=>`${orgName(l.college)} ${orgName(l.company)} ${linkStatus(l)}`.toLowerCase().includes(query));
    if(focusedNetworkCollege!=='all'&&!matching.some(l=>l.college===focusedNetworkCollege)) focusedNetworkCollege='all';
    const picker=$('networkCollege');picker.replaceChildren();
    const all=element('option','All colleges');all.value='all';picker.append(all);
    organizations.filter(o=>o.type==='college'&&matching.some(l=>l.college===o.id)).forEach(o=>{const option=element('option',o.name);option.value=o.id;picker.append(option);});
    picker.value=focusedNetworkCollege;
    const overview=focusedNetworkCollege==='all';
    $('networkMapTitle').textContent=overview?'See the connections.':'Your college connections.';
    document.querySelector('.partnership-map-columns span').textContent=overview?'Colleges':'Selected college';
    document.querySelector('.network-map-hint').textContent=overview?'Select a college to simplify the map. Select a connection for partnership details.':'Select a company to view its partnership details.';
    const links=overview?matching:matching.filter(l=>l.college===focusedNetworkCollege);
    const ids=new Set(links.flatMap(l=>[l.college,l.company]));
    if(overview&&!query) organizations.forEach(o=>ids.add(o.id));
    if(selectedNetworkLink&&!links.some(l=>l.id===selectedNetworkLink)) selectedNetworkLink=null;
    if(selectedNetworkOrg&&!ids.has(selectedNetworkOrg)) selectedNetworkOrg=null;
    const nodes=$('partnershipMapNodes'),svg=$('partnershipMapLines'),canvas=$('partnershipMapCanvas');
    nodes.replaceChildren();svg.replaceChildren();
    canvas.classList.toggle('is-overview',overview);
    const positions=new Map(),halfWidth=overview?126:153;
    canvas.style.height=`${Math.max(510,...['college','company'].map(type=>organizations.filter(o=>o.type===type&&ids.has(o.id)).length*180))}px`;
    for(const type of ['college','company']) {
      const members=organizations.filter(o=>o.type===type&&ids.has(o.id));
      if(overview&&type==='company') {
        const colleges=organizations.filter(o=>o.type==='college'&&ids.has(o.id));
        const rank=company=>Math.max(-1,...links.filter(l=>l.company===company.id).map(l=>colleges.findIndex(c=>c.id===l.college)));
        members.sort((a,b)=>rank(a)-rank(b));
      }
      members.forEach((org,i)=>{
        const x=type==='college'?(overview?170:190):(overview?730:710),y=35+(i+.5)*430/members.length;
        positions.set(org.id,{x,y});
        const connection=!overview&&type==='company'?links.find(l=>l.company===org.id):null;
        const node=action('',()=>networkSelection(connection?null:org.id,connection?.id),connection?`View partnership with ${org.name}`:type==='college'?`Focus map on ${org.name}`:`View ${org.name} connections`);
        node.className=`network-node network-node--${type}`;node.dataset.networkOrg=org.id;
        if(connection) node.dataset.networkLink=connection.id;
        node.style.left=`${x/9}%`;node.style.top=`${y/5}%`;
        const selected=selectedNetworkOrg===org.id||Boolean(connection&&selectedNetworkLink===connection.id);
        node.classList.toggle('is-selected',selected);node.setAttribute('aria-pressed',String(selected));
        const mark=element('span',undefined,'network-node-mark'),icon=element('i',undefined,type==='college'?'bi bi-mortarboard':'bi bi-buildings');
        icon.setAttribute('aria-hidden','true');mark.append(icon);
        const count=partnerships.filter(l=>l.college===org.id||l.company===org.id).length;
        node.append(mark,element('strong',org.name),element('small',`${org.location} · ${count} partner${count===1?'':'s'}`));nodes.append(node);
        if(connection) node.append(badge(linkStatus(connection)));
      });
    }
    links.forEach(link=>{
      const a=positions.get(link.college),b=positions.get(link.company),status=linkStatus(link);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${a.x+halfWidth} ${a.y} C 410 ${a.y}, 490 ${b.y}, ${b.x-halfWidth} ${b.y}`);
      path.setAttribute('class',`network-link${status==='Paused'?' is-paused':status==='Account suspended'?' is-blocked':''}${selectedNetworkLink===link.id?' is-selected':''}`);
      path.classList.toggle('is-dimmed',Boolean(selectedNetworkLink&&selectedNetworkLink!==link.id||selectedNetworkOrg&&link.college!==selectedNetworkOrg&&link.company!==selectedNetworkOrg));
      svg.append(path);path.addEventListener('click',()=>networkSelection(null,link.id));
    });
    renderNetworkDetail();
    previous.forEach(old=>{
      const node=document.querySelector(`[data-network-org="${old.id}"]`);if(!node)return;
      const rect=node.getBoundingClientRect(),dx=old.rect.x-rect.x,dy=old.rect.y-rect.y;
      if(Math.abs(dx)+Math.abs(dy)>1) node.animate([{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px)`},{transform:'translate(-50%,-50%)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
    });
  }
  function setPartnershipView(view) {
    if(view==='map'&&mapMobile.matches)return;
    const fromMap=partnershipView==='map';
    const source=Array.from(document.querySelectorAll(fromMap?'[data-network-org]':'#platform-partnerships-rows tr:not([hidden]) td:nth-child(-n+2)')).map(node=>({name:node.dataset.networkOrg?orgName(node.dataset.networkOrg):node.textContent,rect:node.getBoundingClientRect()}));
    partnershipView=view;
    $('partnershipList').hidden=view==='map';$('partnershipMap').hidden=view!=='map';
    document.querySelectorAll('[data-partnership-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.partnershipView===view)));
    renderPartnershipMap();
    if(!mapMotion.matches) {
      const targets=document.querySelectorAll(view==='map'?'[data-network-org]':'#platform-partnerships-rows tr:not([hidden]) td:nth-child(-n+2)');
      targets.forEach(node=>{
        const name=node.dataset.networkOrg?orgName(node.dataset.networkOrg):node.textContent, previous=source.find(s=>s.name===name);
        if(!previous)return;const rect=node.getBoundingClientRect(),base=node.classList.contains('network-node')?'translate(-50%, -50%)':'translate(0,0)';
        node.animate([{transform:`${base} translate(${previous.rect.x-rect.x}px,${previous.rect.y-rect.y}px) scale(.9)`,opacity:.25},{transform:base,opacity:1}],{duration:500,easing:'cubic-bezier(.22,1,.36,1)'});
      });
    }
  }
  document.querySelectorAll('[data-partnership-view]').forEach(button=>button.addEventListener('click',()=>setPartnershipView(button.dataset.partnershipView)));
  $('partnershipMapReset').addEventListener('click',()=>{focusedNetworkCollege='all';selectedNetworkOrg=null;selectedNetworkLink=null;renderPartnershipMap();});
  $('networkCollege').addEventListener('change',event=>{focusedNetworkCollege=event.target.value;selectedNetworkOrg=null;selectedNetworkLink=null;renderPartnershipMap();});
  function render() {
    for(const type of ['company','college']) {
      const panel=type==='company'?'platform-companies':'platform-colleges';
      const body=$(`${panel}-rows`); body.replaceChildren();
      organizations.filter(org=>org.type===type).forEach(org=>{
        const row=element('tr');
        cell(row,identity(org.name,type==='company'?'Company account':'College account'));
        cell(row,identity(org.admin,org.email)); cell(row,element('span',org.location)); cell(row,badge(org.status));
        cell(row,action('Manage',()=>openOrganization(type,org.id),`Manage ${org.name}`)); body.append(row);
      }); filterTable(panel);
    }
    const partnershipBody=$('platform-partnerships-rows'); partnershipBody.replaceChildren();
    partnerships.forEach(link=>{
      const row=element('tr'); cell(row,element('span',orgName(link.college))); cell(row,element('span',orgName(link.company))); cell(row,badge(window.BridgewayPartners.effective(link)?'Active':link.status==='Active'?'Account suspended':'Paused'));
      cell(row,action('View cycle',()=>openPartnerCycle(link),`View partnership ${orgName(link.college)} and ${orgName(link.company)}`));
      cell(row,action(link.status==='Active'?'Pause':'Resume',()=>togglePartnership(link),`${link.status==='Active'?'Pause':'Resume'} ${orgName(link.college)} and ${orgName(link.company)} partnership`));
      Array.from(row.cells).forEach((td,i)=>td.dataset.label=['College','Company','Status','Cycle','Actions'][i]);partnershipBody.append(row);
    }); filterTable('platform-partnerships');
    const issueBody=$('platform-issues-rows'); issueBody.replaceChildren();
    issues.forEach(issue=>{
      const row=element('tr'); cell(row,identity(issue.title,issue.id)); cell(row,element('span',orgName(issue.organization))); cell(row,badge(issue.status));
      cell(row,action('View issue',()=>openIssue(issue),`View ${issue.id}`)); issueBody.append(row);
    }); filterTable('platform-issues');
    const priority=$('platformPriorityIssues'); priority.replaceChildren();
    issues.filter(issue=>issue.status!=='Resolved').forEach(issue=>{
      const row=element('div'), info=element('div'); info.append(element('strong',issue.title),element('small',`${orgName(issue.organization)} · ${issue.status}`)); row.append(info,action('Review',()=>openIssue(issue),`Review ${issue.id}`)); priority.append(row);
    });
    if(!priority.children.length) priority.append(element('p','No open issues.','platform-empty'));
    $('platformCompanyCount').textContent=organizations.filter(org=>org.type==='company').length;
    $('platformCollegeCount').textContent=organizations.filter(org=>org.type==='college').length;
    $('platformPartnershipCount').textContent=partnerships.filter(link=>window.BridgewayPartners.effective(link)).length;
    const cycle=window.BridgewayCycle;
    $('platformIssueCount').textContent=(cycle?.state.tickets||issues).filter(issue=>(!cycle||cycle.ticketVisible(issue,'platform'))&&issue.status!=='Resolved').length;
    const totals=cycle?{platformStudentCount:window.BridgewayPartners.students.length,platformListingCount:cycle.state.listings.filter(listing=>listing.status!=='Deleted').length,platformPlacementCount:cycle.state.histories.filter(placement=>placement.status==='Active').length}:null;
    for(const [id,key] of [['platformStudentCount','students'],['platformListingCount','listings'],['platformPlacementCount','placements']]) $(id).textContent=totals?totals[id]:organizations.reduce((sum,org)=>sum+(org[key]||0),0);
  }
  function openPartnerCycle(link) {
    let dialog=document.getElementById('partnerCycleDialog');
    if(!dialog){dialog=element('dialog',undefined,'partner-preview');dialog.id='partnerCycleDialog';document.body.append(dialog);}
    dialog.replaceChildren(); const heading=element('h2',`${orgName(link.college)} + ${orgName(link.company)}`);heading.id='partnerCycleTitle';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading);
    const active=window.BridgewayPartners.effective(link);
    dialog.append(element('p',active?'Active: students in this college can apply to this company open listings.':'Paused: no new applications or placements are available through this link.'));
    const students=window.BridgewayPartners.students.filter(s=>s.college===link.college&&s.company===link.company);
    dialog.append(element('h3','Company view'),element('p','Only this company applicants and confirmed interns are visible. Partner college directories are never shared.'));
    students.forEach(s=>dialog.append(element('p',`${s.name} - ${s.stage} - ${s.role}`)));
    if(!students.length)dialog.append(element('p','No applicants or interns for this partnership yet.'));
    dialog.append(element('h3','College & supervisor view'),element('p','The college confirms placements and assigns supervisors. Assigned supervisors review weekly reports and the college reviews the final evaluation.'));
    dialog.append(element('p','Existing placements retain reports and evaluations when this link is paused. Existing training and history remain intact.','partner-scope'));
    if(window.BridgewayPartnerships)dialog.append(action('Review & export partnership',()=>{dialog.close();window.BridgewayPartnerships.open({college:link.college,company:link.company});}));
    dialog.append(action('Close',()=>dialog.close()));dialog.showModal();
  }
  function openOrganization(type,id=null) {
    if(!window.BridgewayAccountEditor){showPortalToast('Account editor could not load. Reload and try again.');return;}
    window.BridgewayAccountEditor.open(type,id?organizations.find(org=>org.id===id):null,()=>{render();window.switchTab(type==='company'?'platform-companies':'platform-colleges');});
  }
  document.querySelectorAll('[data-create-org]').forEach(button=>button.addEventListener('click',()=>openOrganization(button.dataset.createOrg)));
  $('platformAddPartnership').addEventListener('click',()=>{
    for(const type of ['college','company']) {
      const select=$(`partnership${type==='college'?'College':'Company'}`); select.replaceChildren();
      const placeholder=element('option',`Select a ${type}`); placeholder.value=''; select.append(placeholder);
      organizations.filter(org=>org.type===type&&org.status==='Active').forEach(org=>{const option=element('option',org.name);option.value=org.id;select.append(option);});
    }
    $('partnershipError').hidden=true; $('partnershipDialog').showModal();
  });
  $('partnershipForm').addEventListener('submit',event=>{
    event.preventDefault(); const college=$('partnershipCollege').value,company=$('partnershipCompany').value;
    if(partnerships.some(link=>link.college===college&&link.company===company)) { $('partnershipError').textContent='This partnership already exists. You can reactivate it from the table if needed.'; $('partnershipError').hidden=false; return; }
    partnerships.push({id:"partnership-"+crypto.randomUUID(),college,company,status:'Active'}); $('partnershipDialog').close(); render(); showPortalToast('Partnership added to this workspace.');
  });
  function openIssue(issue) {
    editingIssue=issue.id; $('issueDialogTitle').textContent=issue.title; $('issueOrganization').textContent=`${issue.id} · ${orgName(issue.organization)}`;
    $('issueDescription').textContent=issue.description; $('issueStatus').value=issue.status; $('issueResolution').value=issue.resolution; $('issueDialog').showModal();
  }
  $('issueForm').addEventListener('submit',event=>{
    event.preventDefault(); const issue=issues.find(item=>item.id===editingIssue); issue.status=$('issueStatus').value; issue.resolution=$('issueResolution').value.trim(); $('issueDialog').close(); render(); showPortalToast('Issue updated in this workspace.');
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('[data-platform-search]').forEach(input=>input.addEventListener('input',()=>filterTable(input.dataset.platformSearch)));
  document.querySelectorAll('[data-platform-tab]').forEach(button=>button.addEventListener('click',()=>window.switchTab(button.dataset.platformTab)));
  function updateTitle() {
    const panel=document.querySelector('.bw-tab-panel.is-active'); const title=titles[panel?.id]; if(!title)return;
    $('platformPageTitle').textContent=title[0]; $('platformPageDescription').textContent=title[1];
    $('platformOverviewTools').hidden=panel.id!=='platform-overview';
  }
  document.querySelectorAll('.bw-tab-panel').forEach(panel=>new MutationObserver(updateTitle).observe(panel,{attributes:true,attributeFilter:['class']}));
  render(); updateTitle();
});
