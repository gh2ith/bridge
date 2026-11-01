/* Explore existing host-company and academic assignments without changing records. */
(() => {
  'use strict';
  function supervisors(records, sort='Name A to Z') {
    const groups=new Map();
    records.forEach(record=>{
      const name=record.student.supervisor||'Unassigned',college=record.student.college||'',key=JSON.stringify([college,name]);
      if(!groups.has(key))groups.set(key,{key,name,college,records:[],minHours:Infinity});
      const group=groups.get(key);group.records.push(record);group.minHours=Math.min(group.minHours,record.hours);
    });
    return [...groups.values()].sort((a,b)=>(sort==='Fewest verified hours'?a.minHours-b.minHours:0)||a.name.localeCompare(b.name)||a.college.localeCompare(b.college));
  }
  function slicePage(items,requested=1) {
    const pages=Math.max(1,Math.ceil(items.length/10)),page=Math.max(1,Math.min(pages,Math.floor(Number(requested)||1)));
    return {items:items.slice((page-1)*10,page*10),total:items.length,pages,page};
  }
  function render(root,companies,options,state,onChange,companyPagination) {
    const C=window.BridgewayCycle,{E,A,B}=C;
    root.replaceChildren();
    const company=companies.groups.find(group=>group.key===state.companyKey)||companies.groups[0];
    if(!company)return ()=>{};
    if(state.companyKey!==company.key){state.companyKey=company.key;state.supervisorKey='';state.supervisorPage=1;state.studentPage=1;}
    const academic=slicePage(supervisors(company.records,options.sort),state.supervisorPage);state.supervisorPage=academic.page;
    const supervisor=academic.items.find(group=>group.key===state.supervisorKey)||academic.items[0];
    if(state.supervisorKey!==supervisor.key){state.supervisorKey=supervisor.key;state.studentPage=1;}
    const students=window.BridgewayJourney.monitorPage(supervisor.records,{sort:options.sort,page:state.studentPage});state.studentPage=students.page;
    const countText=count=>count+' '+(count===1?'student':'students');
    const summary=E('p',company.name+' / '+supervisor.name+' / '+countText(students.total),'relation-context');summary.setAttribute('role','status');
    const map=E('div',null,'relation-map'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('relation-links');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');map.append(svg);
    function lane(title,copy){const node=E('section',null,'relation-lane'),header=E('header');header.append(E('h3',title),E('p',copy));node.append(header);map.append(node);return node;}
    const companyLane=lane('Host company',companies.total+' '+(companies.total===1?'group':'groups')),
      supervisorLane=lane('Academic supervisor',company.name),studentLane=lane('Students',supervisor.name);
    function update(changes,kind,key){
      onChange(changes);
      const mobile=root.querySelector('.relation-mobile-select[data-relation-kind="'+kind+'"]');
      if(mobile?.getClientRects().length){mobile.focus();return;}
      const choices=[...root.querySelectorAll('.relation-choice')].filter(node=>node.dataset.relationKind===kind);
      (choices.find(node=>node.dataset.relationKey===key)||choices.find(node=>node.getAttribute('aria-pressed')==='true'))?.focus({preventScroll:true});
      if(kind==='students')root.querySelector('.relation-student-count')?.focus();
    }
    function choices(lane,items,selected,kind,choose){
      const picker=E('select',null,'relation-mobile-select');picker.dataset.relationKind=kind;picker.setAttribute('aria-label',kind==='company'?'Select host company':'Select academic supervisor');
      const list=E('div',null,'relation-choices');list.setAttribute('role','group');list.setAttribute('aria-label',kind==='company'?'Host companies':'Academic supervisors');
      let selectedNode;
      items.forEach(item=>{
        const option=E('option',item.name+' · '+(kind==='supervisor'&&item.college?C.org(item.college)+' · ':'')+countText(item.records.length));option.value=item.key;picker.append(option);
        const button=B('',()=>update(choose(item.key),kind,item.key));button.className='relation-choice';button.dataset.relationKind=kind;button.dataset.relationKey=item.key;button.setAttribute('aria-pressed',String(item.key===selected));
        button.append(E('strong',item.name),E('span',countText(item.records.length)));
        if(kind==='supervisor'&&item.college)button.append(E('small',C.org(item.college)));
        if(item.key===selected){selectedNode=button;button.classList.add('is-connected');}
        list.append(button);
      });
      picker.value=selected;picker.addEventListener('change',()=>update(choose(picker.value),kind,picker.value));lane.append(picker,list);
      return ()=>picker.getClientRects().length?picker:selectedNode;
    }
    const companyAnchor=choices(companyLane,companies.groups,company.key,'company',key=>({companyKey:key,supervisorKey:'',supervisorPage:1,studentPage:1}));
    const supervisorAnchor=choices(supervisorLane,academic.items,supervisor.key,'supervisor',key=>({supervisorKey:key,studentPage:1}));
    if(companyPagination)companyLane.append(companyPagination);
    function pager(lane,label,page,pages,turn){
      if(pages<=1)return;
      const nav=E('nav',null,'monitor-pagination relation-pagination');nav.setAttribute('aria-label',label);
      const prev=B('Previous',()=>turn(-1)),next=B('Next',()=>turn(1));prev.disabled=page===1;next.disabled=page===pages;nav.append(prev,E('span','Page '+page+'/'+pages),next);lane.append(nav);
    }
    pager(supervisorLane,'Academic supervisor pages',academic.page,academic.pages,step=>update({supervisorPage:academic.page+step,supervisorKey:'',studentPage:1},'supervisor',''));
    const studentCount=E('p',students.start+' to '+students.end+' of '+countText(students.total),'relation-student-count');studentCount.tabIndex=-1;studentCount.setAttribute('role','status');studentLane.append(studentCount);
    const studentList=E('ul',null,'relation-students');
    students.rows.forEach(record=>{
      const button=B('',()=>{const content=E('div');C.training(content,record.student.id,document.body.dataset.portalRole);C.dialog(record.student.name+' · Training',content);});button.className='relation-student';button.setAttribute('aria-label','View training for '+record.student.name+', student ID '+record.student.studentId);
      button.append(E('strong',record.student.name),E('span','ID '+record.student.studentId),E('small',record.hours+' / 120 h verified'));
      studentList.append(A(E('li'),button));
    });studentLane.append(studentList);
    pager(studentLane,'Related student pages',students.page,students.pages,step=>update({studentPage:students.page+step},'students',''));
    root.append(summary,map);
    function draw(){
      if(!map.isConnected)return;
      const bounds=map.getBoundingClientRect(),mobile=matchMedia('(max-width:760px)').matches;
      svg.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);svg.replaceChildren();
      function link(from,to){const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),x1=(mobile?a.left+a.width/2:a.right)-bounds.left,y1=(mobile?a.bottom:a.top+a.height/2)-bounds.top,x2=(mobile?b.left+b.width/2:b.left)-bounds.left,y2=(mobile?b.top:b.top+b.height/2)-bounds.top;
        const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',mobile?'M '+x1+' '+y1+' C '+x1+' '+(y1+16)+', '+x2+' '+(y2-16)+', '+x2+' '+y2:'M '+x1+' '+y1+' C '+(x1+(x2-x1)/2)+' '+y1+', '+(x1+(x2-x1)/2)+' '+y2+', '+x2+' '+y2);svg.append(path);
      }
      link(companyAnchor(),supervisorAnchor());
      if(mobile){const first=studentList.querySelector('button');if(first)link(supervisorAnchor(),first);}
      else studentList.querySelectorAll('button').forEach(node=>link(supervisorAnchor(),node));
    }
    const resize=new ResizeObserver(draw);resize.observe(map);[...map.querySelectorAll('.relation-choice,.relation-student,.relation-mobile-select')].forEach(node=>resize.observe(node));requestAnimationFrame(draw);
    return ()=>resize.disconnect();
  }
  window.BridgewayProgressRelations={supervisors,slicePage,render};
})();
