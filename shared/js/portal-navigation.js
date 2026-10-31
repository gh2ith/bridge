/* Shared sidebar: hover expansion, 1200 ms delayed collapse, and optional pin. */
(()=>{
 'use strict';
 window.BridgewayPortalNavigation=(sidebar,toggle,main)=>{
   sidebar.id='portalNavigation';toggle.setAttribute('aria-controls',sidebar.id);
   const small=matchMedia('(max-width:1080px)');
   const rail=document.createElement('div');rail.className='bw-sidebar-rail';sidebar.before(rail);rail.append(sidebar);
   const pinKey='bridgeway:sidebar:pinned',holdKey='bridgeway:sidebar:hold-until';
   const sidebarDelay=1200;
   const readPreference=key=>{try{return sessionStorage.getItem(key);}catch{return null;}};
   const writePreference=(key,value)=>{try{sessionStorage.setItem(key,String(value));}catch{/* UI still works without storage. */}};
   let pinned=readPreference(pinKey)==='true',holdUntil=Math.min(Number(readPreference(holdKey))||0,Date.now()+sidebarDelay);
   const pin=document.createElement('button');pin.type='button';pin.className='bw-sidebar-pin';pin.setAttribute('role','switch');
   const pinLabel=document.createElement('span');pinLabel.textContent='Keep sidebar open';
   const pinSwitch=document.createElement('span');pinSwitch.className='bw-sidebar-pin-track';pinSwitch.setAttribute('aria-hidden','true');
   pin.append(pinLabel,pinSwitch);sidebar.querySelector('.bw-masar-bottom-group').prepend(pin);
   let hovering=false,keyboardFocus=false,keyboardInput=false,mobileOpen=false,holdTimer=0;
   const mobile=document.createElement('button');mobile.type='button';mobile.className='portal-mobile-menu';mobile.textContent='Menu';mobile.setAttribute('aria-controls',sidebar.id);(main.querySelector('.studio-top')||main.querySelector('.company-topbar')||main).prepend(mobile);
   const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='portal-navigation-backdrop';backdrop.setAttribute('aria-label','Close navigation');backdrop.tabIndex=-1;document.body.append(backdrop);
   function renderNavigation(){
     const open=small.matches?mobileOpen:pinned||hovering||keyboardFocus||Date.now()<holdUntil;
     sidebar.classList.toggle('is-collapsed',!open);rail.classList.toggle('is-open',open);rail.classList.toggle('is-pinned',pinned&&!small.matches);
     document.body.classList.toggle('portal-navigation-open',small.matches&&mobileOpen);
     sidebar.inert=small.matches&&!mobileOpen;main.inert=small.matches&&mobileOpen;
     mobile.setAttribute('aria-expanded',String(mobileOpen));
     toggle.setAttribute('aria-expanded',String(open));
     const label=small.matches?(open?'Close navigation':'Open navigation'):(open?'Collapse navigation':'Expand navigation');
     toggle.setAttribute('aria-label',label);toggle.title=label;
     toggle.removeAttribute('aria-pressed');pin.setAttribute('aria-checked',String(pinned));
     const icon=toggle.querySelector('i');if(icon)icon.className=small.matches?'bi bi-list':open?'bi bi-chevron-left':'bi bi-chevron-right';
   }
   function scheduleCollapse(){
     clearTimeout(holdTimer);
     const remaining=holdUntil-Date.now();
     if(remaining>0)holdTimer=setTimeout(()=>{
       holdUntil=0;writePreference(holdKey,0);renderNavigation();
     },remaining);
   }
   sidebar.querySelectorAll('.bw-masar-item,.bw-masar-link').forEach(item=>{
     const label=item.querySelector('span')?.textContent.trim()||item.textContent.trim();
     if(!item.hasAttribute('aria-label'))item.setAttribute('aria-label',label);
     if(!item.title)item.title=label;
   });
   sidebar.addEventListener('pointerenter',event=>{if(small.matches||event.pointerType==='touch')return;hovering=true;renderNavigation();});
   sidebar.addEventListener('pointerleave',()=>{
     const wasHovering=hovering;hovering=false;
     if(wasHovering&&!small.matches&&!pinned){holdUntil=Date.now()+sidebarDelay;writePreference(holdKey,holdUntil);scheduleCollapse();}
     renderNavigation();
   });
   document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardInput=true;});
   sidebar.addEventListener('pointerdown',()=>{keyboardInput=false;keyboardFocus=false;});
   sidebar.addEventListener('focusin',()=>{if(keyboardInput){keyboardFocus=true;renderNavigation();}});
   sidebar.addEventListener('focusout',event=>{if(!sidebar.contains(event.relatedTarget)){keyboardFocus=false;renderNavigation();}});
   toggle.addEventListener('click',()=>{
     if(small.matches)mobileOpen=!mobileOpen;
     else if(!sidebar.classList.contains('is-collapsed')){
       pinned=false;hovering=false;keyboardFocus=false;holdUntil=0;clearTimeout(holdTimer);writePreference(pinKey,false);writePreference(holdKey,0);
     }else{holdUntil=Date.now()+sidebarDelay;writePreference(holdKey,holdUntil);scheduleCollapse();}
     renderNavigation();
   });
   pin.addEventListener('click',()=>{
     pinned=!pinned;hovering=false;holdUntil=pinned?0:Date.now()+sidebarDelay;
     writePreference(pinKey,pinned);writePreference(holdKey,holdUntil);scheduleCollapse();renderNavigation();
   });
   sidebar.addEventListener('click',event=>{
     if(event.target.closest('#bwSidebarToggle,.bw-sidebar-pin')||!event.target.closest('a,button'))return;
     if(small.matches){
       if(event.target.closest('.bw-masar-nav [data-tab]')){mobileOpen=false;renderNavigation();toggle.focus();}
       return;
     }
     holdUntil=Date.now()+sidebarDelay;writePreference(holdKey,holdUntil);renderNavigation();scheduleCollapse();
   },true);
   sidebar.addEventListener('keydown',event=>{
     if(event.key==='Escape'&&small.matches&&mobileOpen){mobileOpen=false;renderNavigation();toggle.focus();event.preventDefault();return;}
     if(event.key==='Escape'&&!small.matches&&!pinned){
       holdUntil=0;hovering=false;keyboardFocus=false;clearTimeout(holdTimer);writePreference(holdKey,0);
       keyboardInput=false;sidebar.querySelector('.bw-masar-item')?.focus();renderNavigation();event.preventDefault();
     }
   });
   small.addEventListener('change',()=>{hovering=false;keyboardFocus=false;mobileOpen=false;renderNavigation();});
   mobile.addEventListener('click',()=>{mobileOpen=true;renderNavigation();toggle.focus();});
   backdrop.addEventListener('click',()=>{mobileOpen=false;renderNavigation();mobile.focus();});
   sidebar.addEventListener('keydown',event=>{
     if(!small.matches||!mobileOpen||event.key!=='Tab')return;
     const items=[...sidebar.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(n=>n.getClientRects().length),first=items[0],last=items.at(-1);
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   });
   renderNavigation();scheduleCollapse();return {render:renderNavigation};
 };
})();
