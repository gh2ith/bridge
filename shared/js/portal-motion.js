/* Presentation only: reuse live DOM and handlers; never copy or change workflow data. */
(() => {
  if(/\/pages\/(home|login)\//.test(location.pathname))return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  let themeTransition=null;
  let themeOrigin=null;
  document.addEventListener('click',event=>{
    const toggle=event.target.closest?.('#bwThemeToggle,.studio-appearance');
    if(!toggle)return;
    const rect=toggle.getBoundingClientRect();
    if(event.clientX||event.clientY)themeOrigin={x:event.clientX,y:event.clientY};
    else if(event.isTrusted&&rect.width)themeOrigin={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  },true);
  function animate(node,frames,duration=340,delay=0) {
    if (!node || reduced.matches || !node.getClientRects().length) return;
    running.get(node)?.cancel();
    const effect=node.animate(frames,{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    running.set(node,effect);
    effect.finished.catch(()=>{}).finally(()=>{if(running.get(node)===effect)running.delete(node);});
  }
  function reveal(node,offset=0) {
    if(!node||reduced.matches||!node.getClientRects().length||node.matches('[data-dashboard-overview],.dashboard-insights'))return;
    const blocks='.bw-card-panel,.cycle-section,.platform-panel,.company-listings,.supervisor-selection-prompt,.supervisor-assessment-workspace,.journey-monitor-row,.student-profile-layout,.studio-application,.support-masthead,.support-intro,.support-history,.insight-widget';
    const candidates=[...node.querySelectorAll(blocks)].filter(n=>n.getClientRects().length);
    const outer=candidates.filter(n=>!candidates.some(parent=>parent!==n&&parent.contains(n)));
    const children=[...node.children].filter(n=>n.getClientRects().length&&!n.matches('script,style'));
    const items=node.matches('[data-dashboard-overview]')?children:outer.length?outer:children.length?children:[node];
    // CSS puts the highlighted metric first; entrance order follows its visible position.
    items.sort((a,b)=>{const one=a.getBoundingClientRect(),two=b.getBoundingClientRect();return Math.abs(one.top-two.top)>8?one.top-two.top:one.left-two.left;});
    items.slice(0,10).forEach(item=>animate(item,[{opacity:.7},{opacity:1}],160));
  }
  function sectionEntrance(panel){
    if(!panel?.getClientRects().length)return;
    const heading=document.querySelector('main > .company-page-heading,main > .bw-page-header,main > .supervisor-page-heading');
    if(heading)animate(heading,[{opacity:.7},{opacity:1}],160);
    reveal(panel,100);
    const grid=document.querySelector('[data-dashboard-overview]');
    if(grid?.getClientRects().length)reveal(grid,60);
  }
  function expand(node,from) {
    if(!node || !from)return;
    const to=node.getBoundingClientRect();
    if(!to.width || !to.height)return;
    const x=from.left-to.left,y=from.top-to.top;
    animate(node,[{transformOrigin:'top left',transform:`translate(${x}px,${y}px) scale(${Math.max(.35,from.width/to.width)},${Math.max(.35,from.height/to.height)})`,opacity:.65},{transformOrigin:'top left',transform:'none',opacity:1}],430);
  }
  function theme(change){
    themeTransition?.skipTransition();
    if(reduced.matches||!document.startViewTransition){change();return;}
    themeTransition=document.startViewTransition(change);
    const current=themeTransition;
    let themeEffect=null;
    current.ready.then(()=>{
      if(reduced.matches||themeTransition!==current)return;
      const source=themeOrigin||{x:innerWidth-40,y:40};
      const fromLeft=source.x<innerWidth/2,width=innerWidth,height=innerHeight;
      // An ocean-like front travels from one side to the other, with broad moving
      // crests along its edge. There is no radial expansion or circular outline.
      const frames=Array.from({length:25},(_,frame)=>{
        const t=frame/24,margin=Math.min(180,width*.1);
        const front=-margin+(width+margin*2)*t;
        const amplitude=Math.min(150,width*.075)*Math.sin(Math.PI*t);
        const side=fromLeft?-2:width+2;
        const edge=Array.from({length:100},(_,point)=>{
          const fraction=point/99,y=-2+fraction*(height+4);
          const wave=amplitude*(Math.sin(fraction*Math.PI*2.4-t*4)*.75+Math.sin(fraction*Math.PI*4.2+t*2)*.25);
          const x=fromLeft?front+wave:width-front-wave;
          return `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        });
        return {offset:t,clipPath:`polygon(${side}px -2px,${edge.join(',')},${side}px ${height+2}px)`};
      });
      themeEffect=document.documentElement.animate(frames,{duration:950,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)',fill:'both'});
    }).catch(()=>{});
    current.finished.catch(()=>{}).finally(()=>{themeEffect?.cancel();if(themeTransition===current)themeTransition=null;});
  }
  window.BridgewayMotion={reveal,expand,theme};
  reduced.addEventListener('change',()=>{if(reduced.matches){running.forEach(effect=>effect.cancel());running.clear();themeTransition?.skipTransition();}});
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.classList.add('bw-motion-ready');
    const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
    // One expanded opportunity, with the actual apply control and its original listener.
    const grid=document.querySelector('#tab-opportunities .bw-opportunities-grid');
    if(grid && grid.dataset.discovery !== 'true') {
      let selected=null,origin=null,returnFocus=null;
      const back=make('button','Back to opportunities','bw-reading-back');back.type='button';
      function close(restoreFocus=true) {
        if(!selected)return;
        const from=selected.getBoundingClientRect(),card=selected;
        selected.classList.remove('bw-opportunity-expanded');grid.classList.remove('bw-reading-opportunities');
        back.remove();selected=null;
        returnFocus?.setAttribute('aria-expanded','false');
        expand(card,from);if(restoreFocus)returnFocus?.focus({preventScroll:true});
      }
      back.addEventListener('click',close);
      grid.querySelectorAll('.bw-opp-card').forEach((card,index)=>{
        card.id ||= `opportunity-preview-${index}`;
        const title=card.querySelector('.bw-opp-title');
        card.tabIndex=0;
        card.setAttribute('aria-label',`View ${title.textContent}`);card.setAttribute('aria-expanded','false');
        function open() {
          if(selected===card)return;
          if(selected)close();
          origin=card.getBoundingClientRect();selected=card;returnFocus=card;
          grid.classList.add('bw-reading-opportunities');card.classList.add('bw-opportunity-expanded');
          card.setAttribute('aria-expanded','true');card.prepend(back);
          title.tabIndex=-1;title.focus({preventScroll:true});card.scrollIntoView({block:'nearest',behavior:'instant'});
          expand(card,origin);
        }
        card.addEventListener('click',event=>{
          if(event.target.closest('button,a,input,select,textarea,[role="button"]'))return;
          open();
        });
        card.addEventListener('keydown',event=>{
          if(event.target!==card || !['Enter',' '].includes(event.key))return;
          event.preventDefault();open();
        });
      });
      grid.addEventListener('keydown',event=>{if(event.key==='Escape'&&selected){event.preventDefault();close();}});
      document.getElementById('oppSearchInput')?.addEventListener('input',()=>close(false));
      document.querySelectorAll('button[data-category]').forEach(button=>button.addEventListener('click',()=>close(false)));
      document.querySelectorAll('.bw-tab-btn').forEach(button=>button.addEventListener('click',()=>close(false)));
    }
    // Focus the existing table row. The original action controls remain live, not cloned.
    document.querySelectorAll('#supervisedStudentsTable,#tab-students table,#companyAcceptedTableBody').forEach(source=>{
      const table=source.matches('table')?source:source.closest('table');
      if(!table)return;
      const area=table.parentElement,back=make('button','Back to students','bw-reading-back');back.type='button';back.hidden=true;area.before(back);
      let selected=null,opener=null;
      function close(restoreFocus=true) {
        if(!selected)return;
        const row=selected;row.classList.remove('bw-record-expanded');table.classList.remove('bw-reading-record');
        selected=null;back.hidden=true;opener?.setAttribute('aria-expanded','false');if(restoreFocus)opener?.focus({preventScroll:true});reveal(table,-1);
      }
      back.addEventListener('click',close);
      function decorate() {
        const labels=[...table.querySelectorAll('thead th')].map(node=>node.textContent.trim());
        table.querySelectorAll('tbody tr').forEach(row=>{
          if(row.querySelector('.bw-record-open') || row.cells.length<2 || row.cells[0].colSpan>1)return;
          [...row.cells].forEach((cell,index)=>{cell.dataset.recordLabel=labels[index]||'Details';});
          const identity=row.cells[0];if(!identity)return;
          const name=table.id==='supervisedStudentsTable'?identity.querySelector('[data-style="s10"]'):null;
          const button=make('button',name?name.textContent:'View record',name?'bw-record-open bw-record-name':'bw-record-open');button.type='button';button.setAttribute('aria-expanded','false');
          button.setAttribute('aria-label',`View student record: ${identity.textContent.trim().replace(/\s+/g,' ').slice(0,80)}`);
          if(name)name.replaceWith(button);else identity.append(button);
          button.addEventListener('click',()=>{
            close();const from=row.getBoundingClientRect();selected=row;opener=button;
            row.classList.add('bw-record-expanded');table.classList.add('bw-reading-record');back.hidden=false;button.setAttribute('aria-expanded','true');
            back.focus({preventScroll:true});area.scrollIntoView({block:'nearest',behavior:'instant'});expand(row,from);
          });
        });
      }
      decorate();new MutationObserver(()=>{if(selected&&!selected.isConnected)close();decorate();}).observe(table.querySelector('tbody'),{childList:true});
      area.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
      back.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
      const panel=table.closest('.bw-tab-panel');
      panel?.querySelectorAll('input[type="search"],input[type="text"]').forEach(input=>input.addEventListener('input',()=>close(false)));
      panel?.querySelectorAll('[data-accepted-filter],[data-filter]').forEach(button=>button.addEventListener('click',()=>close(false)));
      document.querySelectorAll('.bw-tab-btn').forEach(button=>button.addEventListener('click',()=>close(false)));
    });
    // Weekly reports become a one-document-at-a-time reader; no new report content.
    const reports=[...document.querySelectorAll('.training-report')];
    reports.forEach(report=>report.addEventListener('toggle',()=>{
      if(!report.open)return;
      reports.forEach(other=>{if(other!==report)other.open=false;});
      document.querySelectorAll('[data-training-week]').forEach(button=>button.setAttribute('aria-pressed',String(`training-week-${button.dataset.trainingWeek}`===report.id)));
      reveal(report.querySelector('.training-report-body'));
    }));
    // Observe existing detail renderers rather than replacing role-specific selection logic.
    let lastSource=null;
    document.addEventListener('click',event=>{
      const source=event.target.closest('[data-spotlight-review],.spotlight-name-button,.evaluation-student-button,.company-student-button,[data-listing-details],.company-meeting-actions button');
      if(source)lastSource=source.getBoundingClientRect();
    },true);
    document.querySelectorAll('#studentSpotlight,#companyWeeklyDetail,#supervisorReportDetail,.evaluation-detail,.evaluation-form-area,.listing-detail,#partnershipMapDetail').forEach(panel=>{
      let queued=false;
      new MutationObserver(records=>{
        if(records.every(record=>record.target.closest?.('.portal-character-count,[role="status"],.cycle-live')))return;
        if(panel.contains(document.activeElement)&&document.activeElement.matches('input,textarea'))return;
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{queued=false;if(!panel.getClientRects().length)return;if(lastSource&&panel.id==='studentSpotlight')expand(panel,lastSource);else reveal(panel);});
      }).observe(panel,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
    });
    const weekSelect=document.getElementById('programWeekSelect');
    weekSelect?.addEventListener('change',()=>reveal(document.querySelector('#companyWeeklyDetail .weekly-report-context')));
    // Filtering keeps spatial continuity, animating only visible results and existing meters.
    let filterFrame=0;
    function filterMotion(event) {
      const control=event.target.closest('input[type="search"],input[type="text"],select,.bw-tag-btn,[data-filter],[data-training-filter],[data-accepted-filter],[data-listing-filter]');
      if(!control || control.closest('.bw-modal-backdrop,dialog'))return;
      const panel=control.closest('.bw-tab-panel');if(!panel)return;
      const items=[...panel.querySelectorAll('.bw-opp-card,tbody tr,.training-report,.company-meeting-row')];
      const before=new Map(items.filter(node=>node.getClientRects().length).map(node=>[node,node.getBoundingClientRect()]));
      cancelAnimationFrame(filterFrame);
      filterFrame=requestAnimationFrame(()=>{
        filterFrame=0;
        let index=0;
        items.filter(node=>node.getClientRects().length).forEach(node=>{
          const prior=before.get(node),next=node.getBoundingClientRect();
          if(prior) {const dy=prior.top-next.top;if(Math.abs(dy)>1)animate(node,[{transform:`translateY(${dy}px)`},{transform:'none'}],300);}
          else animate(node,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],280,Math.min(index++*35,140));
        });
      });
    }
    document.addEventListener('click',filterMotion,true);document.addEventListener('input',filterMotion,true);document.addEventListener('change',filterMotion,true);
    // Functional totals and progress update immediately without decorative counting.
    document.querySelectorAll('.bw-tab-panel').forEach(panel=>{
      let active=panel.classList.contains('is-active');
      new MutationObserver(()=>{
        const next=panel.classList.contains('is-active');
        if(next&&!active)sectionEntrance(panel);
        active=next;
      }).observe(panel,{attributes:true,attributeFilter:['class']});
    });
    // Run after role-specific scripts have built their live page content.
    requestAnimationFrame(()=>{
      const active=document.querySelector('.bw-tab-panel.is-active');
      if(active)sectionEntrance(active);
      else {
        const main=document.querySelector('main');
        if(main)reveal(main);
      }
    });
    document.addEventListener('click',event=>{
      const toggle=event.target.closest('#bwThemeToggle,.studio-appearance');
      if(toggle)animate(toggle.querySelector('i'),[{transform:'rotate(-90deg) scale(.65)',opacity:.3},{transform:'rotate(0) scale(1)',opacity:1}],360);
    });
  });
})();
