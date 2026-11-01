/* College dashboard reference. Existing controls and workflow handlers are retained. */
(() => {
  'use strict';
  function summarize({college,students=[],histories=[],listings=[],organizations=[],restrictions={},links=[]}) {
    const ids=new Set(students.filter(s=>s.college===college).map(s=>s.id)),latest=new Map();
    histories.forEach(h=>{if(ids.has(h.student)&&!latest.has(h.student))latest.set(h.student,h);});
    const activeOrg=id=>organizations.some(o=>o.id===id&&o.status==='Active');
    return {
      students:ids.size,
      active:[...latest.values()].filter(h=>h.status==='Active').length,
      completed:histories.filter(h=>ids.has(h.student)&&h.status==='Completed').length,
      partners:new Set(links.filter(l=>l.college===college).map(l=>l.company)).size,
      available:activeOrg(college)?listings.filter(l=>l.status==='Published'&&activeOrg(l.company)&&!restrictions[college]?.[l.id]).length:0
    };
  }
  window.BridgewayCollegeOverview={summarize};
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body.dataset.portalRole!=='admin')return;
    const grid=document.querySelector('[data-dashboard-overview]'),C=window.BridgewayCycle,M=window.BridgewayPartners;
    if(!grid||!C||!M)return;
    const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    document.body.classList.add('college-dashboard-reference');grid.classList.add('college-summary');
    const heading=document.getElementById('dashboardOverviewTitle');heading.textContent='College summary';
    const headingActions = document.querySelector('#portalHeadingTools [data-style="s2"]');
    const createByDirectory = {
      '2': headingActions?.querySelector('[data-open-modal="registerStudentModal"]'),
      '4': headingActions?.querySelector('[data-open-modal="addSupervisorModal"]')
    };
    const directories = [
      ['College directory', [['2', 'Students'], ['4', 'Academic supervisors'], ['1', 'College accounts']]],
      ['Companies and listings', [['3', 'Partner companies'], ['5', 'Available listings']]]
    ];
    for (const [title, entries] of directories) {
      const section = E('section', null, 'college-directory-group');
      section.append(E('h3', title));
      for (const [id, label] of entries) {
        const row = grid.querySelector(`[data-onclick="querySelector--${id}"]`);
        const count = row.querySelector('.bw-kpi-value');
        const arrow = E('i', null, 'bi bi-chevron-right');
        arrow.setAttribute('aria-hidden', 'true');
        row.classList.replace('bw-kpi-card', 'college-directory-row');
        row.removeAttribute('data-style');
        row.replaceChildren(E('span', label), count, arrow);
        const create = createByDirectory[id];
        if (create) {
          const entry = E('div', null, 'college-directory-entry');
          create.className = 'college-row-create-action';
          create.removeAttribute('data-style');
          create.setAttribute('aria-label', `Add ${label.toLowerCase().replace('academic ', '').replace(/s$/, '')}`);
          create.replaceChildren(E('i', null, 'bi bi-plus-lg'), E('span', 'Add'));
          create.querySelector('i').setAttribute('aria-hidden', 'true');
          entry.append(row, create);
          section.append(entry);
        } else section.append(row);
      }
      grid.append(section);
    }
    if (headingActions && !headingActions.childElementCount) headingActions.remove();
    const placementCard=grid.querySelector('[data-onclick="querySelector--6"]'),placementIcon=E('i',null,'bi bi-briefcase college-placement-icon');
    placementCard.dataset.collegeSummary = 'active';
    placementCard.querySelector('.bw-kpi-icon')?.remove();
    placementCard.querySelector('.bw-kpi-label').textContent = 'Active placements';
    placementCard.querySelector('.bw-kpi-desc').firstChild.textContent = 'View placements';
    placementIcon.setAttribute('aria-hidden','true');placementCard.append(placementIcon);
    placementCard.querySelector('.bw-kpi-desc i').className='bi bi-arrow-up-right';
    const refresh=()=>{
      const college=C.identity().split(':').slice(1).join(':')||'college-1';
      const totals=summarize({college,students:M.students,histories:C.state.histories,listings:C.state.listings,organizations:M.organizations,restrictions:C.state.collegeListingRestrictions,links:M.links});
      placementCard.title=`${totals.active} active placements. ${totals.completed} completed placements.`;
      window.refreshCollegeCounts?.();
    };
    refresh();document.addEventListener('bridgeway:cycle-change',refresh);

    // Replace static department percentages and repeated directory shortcuts with real next steps.
    const root=document.getElementById('tab-overview'),work=E('section',null,'college-next-steps');
    work.setAttribute('aria-labelledby','collegeNextTitle');const title=E('h2','Continue your work');title.id='collegeNextTitle';work.append(title);
    const list=E('div',null,'college-work-links');
    for(const [tab,label,copy]of [['tab-progress-monitor','Monitor training','Review students by company, supervisor, or individual progress.'],['tab-completion','Review completion','Check training requirements and both final evaluations.'],['tab-companies','Manage partnerships','View company contacts and manage your college’s connections.']]){
      const b=E('button');b.type='button';const text=E('span');text.append(E('strong',label),E('small',copy));const arrow=E('i',null,'bi bi-arrow-right');arrow.setAttribute('aria-hidden','true');b.append(text,arrow);
      b.addEventListener('click',()=>{window.switchTab(tab);requestAnimationFrame(()=>{const h=document.querySelector(`#${tab} h2`);if(h){h.tabIndex=-1;h.focus({preventScroll:true});}});});list.append(b);
    }
    work.append(list);root.replaceChildren(work);
    const insights=document.querySelector('.dashboard-insights');
    if(insights){
      const measure = insights.querySelector('.insight-switch');
      const weeklyHeader = insights.querySelector('.insight-weekly header');
      if (weeklyHeader && measure) {
        measure.setAttribute('aria-label', 'Weekly activity measure');
        weeklyHeader.append(measure);
      }
      const students=insights.querySelector('.insight-students');
      const link=E('button','Open progress monitor','college-chart-link');link.type='button';link.addEventListener('click',()=>window.switchTab('tab-progress-monitor'));students?.append(link);
      const completion=E('button','Open completion review','college-chart-link');completion.type='button';completion.addEventListener('click',()=>window.switchTab('tab-completion'));insights.querySelector('.insight-completion')?.append(completion);
    }
  });
})();
