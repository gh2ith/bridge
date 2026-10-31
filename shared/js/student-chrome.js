/* One navigation model for the student workspace and academic profile. */
(() => {
  'use strict';
  window.BridgewayStudentChrome = (main, active, activate) => {
    document.body.classList.add('student-studio','student-shared-navigation');
    const student=window.BridgewayStudent.current();
    const displayName=window.BridgewayLocal?.profile('student:'+student.id).name||student.name;
    const openSection=activate||((id)=>{location.href=window.BridgewayStudent.url(`../student-dashboard/student-dashboard.html#${id}`);});
    const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    const top=node('header',null,'studio-top');top.setAttribute('aria-label','Student workspace header');
    const nav=node('nav',null,'studio-navigation bw-masar-nav');nav.setAttribute('aria-label','Student workspace');
    [['tab-opportunities','Explore','bi-layers'],['tab-applications','Applications','bi-send'],['tab-progress','My training','bi-signpost-split'],['tab-courses','Courses','bi-journal-bookmark']].forEach(([id,label,icon])=>{
      const item=node('button',null,'cycle-button bw-masar-item');item.append(node('span',label));item.dataset.studioTab=id;item.dataset.tab=id;
      const glyph=node('i',null,`bi ${icon}`);glyph.setAttribute('aria-hidden','true');item.prepend(glyph);
      item.type='button';item.addEventListener('click',()=>openSection(id));
      if(id==='tab-applications'){
        const count=node('span',null,'deck-application-count');count.hidden=true;count.setAttribute('aria-hidden','true');
        try{const value=localStorage.getItem(`bridgeway:student-application-count:${student.id}`);count.textContent=value||'0';}catch{count.textContent='0';}
        item.append(count);
      }
      if(id===active)item.setAttribute('aria-current','page');nav.append(item);
    });
    const support=node('button',null,'cycle-button studio-support');support.append(node('span','My Tickets'));support.dataset.studioTab='tab-tickets';support.dataset.tab='tab-tickets';support.classList.add('bw-masar-item');
    support.type='button';support.addEventListener('click',()=>openSection('tab-tickets'));
    const theme=node('button',null,'cycle-button studio-appearance');theme.type='button';theme.addEventListener('click',()=>document.getElementById('bwThemeToggle')?.click());
    const profile=node('a',null,'studio-profile');profile.href=window.BridgewayStudent.url('../student-dashboard/student-dashboard.html#tab-profile');
    if(activate)profile.addEventListener('click',event=>{event.preventDefault();account.open=false;window.BridgewayOpenStudentProfile();});
    profile.setAttribute('aria-label',`My profile for ${student.name}`);
    profile.append(node('span',displayName.split(' ').map(p=>p[0]).slice(0,2).join(''),'studio-avatar'),node('span','My profile'));
    if(active==='profile')profile.setAttribute('aria-current','page');
    const supportIcon=node('i',null,'bi bi-chat-square-text');supportIcon.setAttribute('aria-hidden','true');support.prepend(supportIcon);nav.append(support);
    const account=node('details',null,'studio-account'),toggle=node('summary',null,'studio-account-toggle');
    toggle.append(node('span',displayName.split(' ').map(p=>p[0]).slice(0,2).join(''),'studio-avatar'),node('span',displayName,'studio-account-name'));
    const chevron=node('i',null,'bi bi-chevron-down');chevron.setAttribute('aria-hidden','true');toggle.append(chevron);
    const menu=node('div',null,'studio-account-menu'),caption=node('p','Student account');
    profile.replaceChildren(node('i',null,'bi bi-person'),node('span','My profile'));
    const themeIcon=node('i');themeIcon.setAttribute('aria-hidden','true');theme.append(themeIcon);
    const updateTheme=()=>{const dark=document.documentElement.dataset.theme==='dark',label=dark?'Switch to light mode':'Switch to dark mode';themeIcon.className=dark?'bi bi-sun':'bi bi-moon-stars';theme.setAttribute('aria-label',label);theme.title=label;};
    updateTheme();new MutationObserver(updateTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    const logout=node('a','Sign out','studio-signout');logout.href='../login/login.html';logout.prepend(node('i',null,'bi bi-box-arrow-right'));
    menu.append(caption,profile,logout);account.append(toggle,menu);
    document.addEventListener('click',event=>{if(!account.contains(event.target))account.open=false;});
    account.addEventListener('keydown',event=>{if(event.key==='Escape'){account.open=false;toggle.focus();}});
    const actions=node('div',null,'studio-header-actions');actions.append(theme,account);
    const sidebar=document.querySelector('.bw-masar-sidebar');
    sidebar.querySelector('.bw-masar-nav').replaceWith(nav);
    nav.classList.remove('studio-navigation');
    nav.querySelectorAll('[data-tab]').forEach(item=>{
      item.title=item.textContent.trim();
      item.classList.remove('cycle-button');
      const sync=()=>item.classList.toggle('is-active',item.getAttribute('aria-current')==='page');
      sync();new MutationObserver(sync).observe(item,{attributes:true,attributeFilter:['aria-current']});
    });
    top.append(node('span','Your workspace','student-top-caption'),actions);main.prepend(top);
    window.BridgewayPortalNavigation(sidebar,document.getElementById('bwSidebarToggle'),main);
    return sidebar;
  };
})();
