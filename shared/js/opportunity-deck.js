/* Continuous gallery: each role keeps its own card throughout the spring motion. */
(() => {
  'use strict';
  window.BridgewayOpportunityDeck=(host,{C,roleFit,applyAction,placed})=>{
    const {E,A,B}=C,reduced=matchMedia('(prefers-reduced-motion: reduce)');
    host.className='opportunity-gallery';
    const gallery=E('section',null,'role-gallery'),stage=E('div',null,'gallery-stage'),track=E('div',null,'gallery-track');
    stage.tabIndex=0;stage.setAttribute('role','region');stage.setAttribute('aria-label','Internship cards. Drag or use left and right arrow keys. Up arrow opens role details.');
    const heading=A(E('div',null,'gallery-heading'),E('span','Featured roles'),E('span','','gallery-count'));
    stage.append(track);
    const prev=B('←',()=>choose(index-1)),next=B('→',()=>choose(index+1)),flip=B('See the eight-week journey',()=>flipCard());
    prev.setAttribute('aria-label','Previous role');next.setAttribute('aria-label','Next role');flip.setAttribute('aria-pressed','false');
    const picks=E('nav',null,'gallery-index');picks.setAttribute('aria-label','Select an internship');
    gallery.append(heading,stage,A(E('div',null,'gallery-controls'),prev,flip,next),E('p','Browse the hand. Select a card, or flick it upward to open the role.','gallery-hint'),picks);
    const dossier=E('section',null,'gallery-dossier');dossier.setAttribute('aria-label','Selected internship');
    const announcement=E('p','','gallery-announcement');announcement.setAttribute('role','status');host.append(gallery,dossier,announcement);
    const catalog=E('section',null,'role-catalog'),catalogGrid=E('div',null,'role-catalog-grid'),catalogCount=E('p','','cycle-muted');catalogCount.setAttribute('role','status');
    const search=E('input');search.type='search';search.placeholder='Role, company, or skill';search.setAttribute('aria-label','Search all internships');
    const searchField=A(E('label',null,'role-catalog-search'),E('span','Search internships'),search);
    const noMatches=A(E('div',null,'role-catalog-empty'),E('h3','No internships match your search.'),E('p','Try another role, company, or skill.','cycle-muted'),B('Clear search',()=>{search.value='';visible=12;renderCatalog();search.focus();}));noMatches.hidden=true;
    search.addEventListener('input',()=>{visible=12;renderCatalog();});
    const more=B('Load more internships',()=>{const first=visible;visible+=12;renderCatalog();catalogGrid.children[first]?.querySelector('button')?.focus({preventScroll:true});});
    catalog.tabIndex=-1;
    const browse=B('Browse all internships',()=>{catalog.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});catalog.focus({preventScroll:true});});browse.classList.add('gallery-browse-all');gallery.append(browse);
    catalog.append(A(E('header',null,'role-catalog-heading'),A(E('div'),E('h2','All internships'),E('p','Browse every role. Open the details without losing your place.','cycle-muted')),catalogCount),searchField,catalogGrid,noMatches,more);host.append(catalog);
    let allRoles=[],visible=12;
    function openRole(l){const panel=E('section',null,'gallery-dossier');readRole(l,panel);C.dialog('Internship details',panel);}
    function renderCatalog(){
      const query=search.value?.trim().toLowerCase()||'',matches=allRoles.filter(l=>`${l.title} ${l.skills} ${C.org(l.company)}`.toLowerCase().includes(query));
      catalogGrid.replaceChildren();matches.slice(0,visible).forEach(l=>{
        const card=E('article',null,'role-catalog-card'),open=B(l.title,()=>openRole(l));
        card.append(E('p',C.org(l.company),'role-catalog-company'),A(E('h3'),open),E('p',l.location,'cycle-muted'));
        const skills=E('div',null,'studio-skills');l.skills.split(',').slice(0,4).forEach(s=>skills.append(E('span',s.trim())));card.append(skills,A(E('footer'),E('span',`${l.capacity} ${Number(l.capacity)===1?'seat':'seats'}`,'role-seat-count'),E('span',`Deadline: ${C.date(l.deadline)}`,'role-deadline')));catalogGrid.append(card);
      });
      catalogCount.textContent=`Showing ${Math.min(visible,matches.length)} of ${matches.length} roles`;more.hidden=visible>=matches.length;noMatches.hidden=!!matches.length;
    }
    const plans={software:['Meet the team & tools','Understand the architecture','Build the foundations','Develop a feature','Connect the services','Test & improve','Prepare the delivery','Present your work'],cloud:['Cloud foundations','Linux & networking','Containers','Delivery pipelines','Infrastructure as code','Monitoring & reliability','Deployment practice','Delivery & handover']};
    let roles=[],cards=[],index=0,selectedId=null,position=0,velocity=0,frame=0,last=0,drag=null,ignoreClick=false,entry=1;
    const syllabus=l=>Array.isArray(l.syllabus)&&l.syllabus.length===8?l.syllabus.map(w=>typeof w==='string'?w:w.title):plans[l.category]||plans.software;
    const planNote=l=>Array.isArray(l.syllabus)&&l.syllabus.length===8?'Company-provided curriculum':'Learning outline · Your company sets the training plan after placement.';
    function paint(){
      const spacing=Math.min(116,stage.clientWidth*.18);
      cards.forEach((card,i)=>{
        const d=i-position,abs=Math.abs(d),near=Math.min(abs,2),selected=i===index;
        card.node.style.transform=`translate3d(calc(-50% + ${d*spacing}px),${near*14-18*Math.max(0,1-abs)+(1-entry)*(100+i*16)}px,${-near*50}px) rotateY(${-Math.max(-1,Math.min(1,d))*8}deg) rotateZ(${Math.max(-2,Math.min(2,d))*10}deg) scale(${1-near*.045})`;
        card.node.style.zIndex=String(20-Math.round(abs*4));card.node.style.opacity=String(Math.max(0,1-Math.max(0,abs-2)*2)*entry);
        card.node.style.pointerEvents=abs>2.2?'none':'auto';card.node.classList.toggle('is-selected',selected);card.node.setAttribute('aria-pressed',String(selected));card.node.tabIndex=selected?0:-1;
      });
    }
    function tick(t){const dt=last?Math.min((t-last)/1000,.032):1/60;last=t;
      if(!drag){velocity+=(155*(index-position)-23*velocity)*dt;position+=velocity*dt;}
      entry=Math.min(1,entry+dt*2.3);paint();
      if(entry<1||(!drag&&(Math.abs(index-position)+Math.abs(velocity)>.001)))frame=requestAnimationFrame(tick);
      else{frame=0;last=0;if(!drag){position=index;velocity=0;paint();}}
    }
    function wake(){if(reduced.matches){position=index;entry=1;paint();return;}if(!frame)frame=requestAnimationFrame(tick);}
    function flipCard(){const card=cards[index];if(!card)return;card.flipped=!card.flipped;card.inner.classList.toggle('is-flipped',card.flipped);card.front.setAttribute('aria-hidden',String(card.flipped));card.back.setAttribute('aria-hidden',String(!card.flipped));flip.setAttribute('aria-pressed',String(card.flipped));flip.textContent=card.flipped?'Back to the role':'See the eight-week journey';}
    function makeCard(l,i){
      const node=E('article',null,'gallery-card');node.setAttribute('role','button');node.setAttribute('aria-label',`Select ${l.title} at ${C.org(l.company)}`);
      const inner=E('div',null,'gallery-card-inner'),front=E('div',null,'gallery-card-front'),back=E('div',null,'gallery-card-back');
      node.dataset.family=l.category;node.style.setProperty('--card-color',({'company-1':'#2052c4','company-2':'#5442a6','company-3':'#086c72'})[l.company]||'#2052c4');
      const company=C.org(l.company),mark=E('span',company.split(' ').map(v=>v[0]).slice(0,2).join(''),'gallery-company-mark');front.append(A(E('header'),mark,E('span',company)));
      const art=E('div',null,'gallery-art');art.setAttribute('aria-hidden','true');for(let n=0;n<4;n++)art.append(E('span'));art.append(E('i',null,l.category==='cloud'?'bi bi-cloud':'bi bi-code-slash'));
      front.append(art,E('p',l.categoryLabel||(l.category==='cloud'?'Cloud & infrastructure':'Software & technology'),'gallery-family'),E('h2',l.title),E('p',l.location,'gallery-location'));
      const tags=E('div',null,'gallery-tags');l.skills.split(',').slice(0,3).forEach(s=>tags.append(E('span',s.trim())));front.append(tags,A(E('footer'),E('span','8 weeks to build something'),E('span',`${l.capacity} ${Number(l.capacity)===1?'seat':'seats'}`,'role-seat-count')));
      back.append(E('p','Your learning journey'),E('h2','From first day to final delivery.'),E('small',planNote(l)));const weeks=E('ol');syllabus(l).forEach(w=>weeks.append(E('li',w)));back.append(weeks);back.setAttribute('aria-hidden','true');inner.append(front,back);node.append(inner);
      node.addEventListener('click',()=>{if(ignoreClick)return;if(i!==index)choose(i);else flipCard();});
      node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(i!==index)choose(i);else flipCard();}});
      return {node,inner,front,back,flipped:false};
    }
    function readRole(l,dossierTarget=dossier){
      const dossier=dossierTarget;
      dossier.replaceChildren();dossier.append(A(E('header',null,'gallery-detail-head'),E('span','Inside this role'),E('span','Platform approved','gallery-approved')),E('h2',l.title),E('p',`${C.org(l.company)} · ${l.location}`,'gallery-detail-company'));
      const facts=E('dl',null,'gallery-facts');[['Duration','8 weeks'],['Commitment','15 h / week'],['Application deadline',C.date(l.deadline)],['Seats',String(l.capacity)]].forEach(([k,v])=>facts.append(A(E('div'),E('dt',k),E('dd',v))));dossier.append(roleFit(l),facts,A(E('section',null,'gallery-description'),E('h3','The work'),E('p',l.description)));
      const skills=E('div',null,'studio-skills');l.skills.split(',').forEach(t=>skills.append(E('span',t.trim())));dossier.append(A(E('section'),E('h3','What you’ll bring'),skills));
      if(l.prerequisites?.length){const requirements=E('ul');l.prerequisites.forEach(text=>requirements.append(E('li',text)));dossier.append(A(E('section'),E('h3','Prerequisites'),requirements));}
      const action=placed?B('Continue my training',()=>{dossier.closest('dialog')?.close();window.switchTab('tab-progress');},true):applyAction(l);dossier.append(A(E('footer',null,'gallery-detail-footer'),action,E('p',placed?'You have a placement. These opportunities are available to browse.':'Applying creates a pending application. The company makes the hiring decision.')));
      if(!reduced.matches)dossier.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
    }
    function choose(n){if(!roles.length)return;index=Math.max(0,Math.min(n,roles.length-1));selectedId=roles[index].id;
      cards.forEach(c=>{c.flipped=false;c.inner.classList.remove('is-flipped');c.front.setAttribute('aria-hidden','false');c.back.setAttribute('aria-hidden','true');});flip.textContent='See the eight-week journey';flip.setAttribute('aria-pressed','false');prev.disabled=index===0;next.disabled=index===roles.length-1;heading.lastChild.textContent=`${index+1} of ${roles.length}`;
      picks.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));readRole(roles[index]);announcement.textContent=`${roles[index].title}, ${index+1} of ${roles.length}`;wake();
    }
    stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose(index+(e.key==='ArrowRight'?1:-1));}else if(e.key==='ArrowUp'){e.preventDefault();if(roles[index])openRole(roles[index]);}else if(e.target===stage&&(e.key==='Enter'||e.key===' ')){e.preventDefault();flipCard();}});
    stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastY:e.clientY,start:position,lastX:e.clientX,time:e.timeStamp,speed:0,moved:false};});
    stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;drag.lastY=e.clientY;const flick=e.pointerType==='mouse'&&e.clientY-drag.y < -30;if((Math.abs(dx)>7||flick)&&!drag.moved){drag.moved=true;stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');}if(!drag.moved)return;drag.speed=(e.clientX-drag.lastX)/Math.max(1,e.timeStamp-drag.time);drag.time=e.timeStamp;drag.lastX=e.clientX;position=Math.max(-.3,Math.min(roles.length-.7,drag.start-dx/Math.min(116,stage.clientWidth*.18)));velocity=0;paint();});
    function release(e,cancel=false){if(!drag||drag.id!==e.pointerId)return;const current=drag;drag=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(current.moved){ignoreClick=true;setTimeout(()=>ignoreClick=false,0);if(!cancel&&current.lastY-current.y < -65&&Math.abs(current.lastX-current.x)<80){position=index;wake();openRole(roles[index]);}else choose(cancel?index:Math.round(position-current.speed*.24));}}
    stage.addEventListener('pointerup',e=>release(e));stage.addEventListener('pointercancel',e=>release(e,true));stage.addEventListener('lostpointercapture',e=>release(e,true));
    new ResizeObserver(paint).observe(stage);reduced.addEventListener('change',()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;wake();});
    return {render(items){allRoles=items;visible=12;renderCatalog();roles=items.slice(0,5);gallery.hidden=!roles.length;dossier.hidden=!roles.length;cards=roles.map(makeCard);track.replaceChildren(...cards.map(c=>c.node));picks.replaceChildren();roles.forEach((l,i)=>{const b=B(C.org(l.company).replace(/ Inc\.$/,''),()=>choose(i));b.setAttribute('aria-label',`Choose ${l.title}`);picks.append(b);});index=Math.max(0,roles.findIndex(l=>l.id===selectedId));position=index;velocity=0;entry=reduced.matches?1:0;choose(index);},origin:()=>cards[index]?.node.getBoundingClientRect()||stage.getBoundingClientRect()};
  };
})();
