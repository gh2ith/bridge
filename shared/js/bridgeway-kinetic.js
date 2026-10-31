/* Bridgeway-native interaction studies. No uploads, network requests, or framework dependency. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn,cls='cycle-button')=>{const n=el('button',text,cls);n.type='button';n.addEventListener('click',fn);return n;};
  const motion=(n,frames,options)=>{if(reduced.matches||!n.isConnected)return Promise.resolve();const animation=n.animate(frames,options);return animation.finished.catch(()=>{});};
  function pulse(n){if(!reduced.matches)motion(n,[{transform:'translateY(1px) scale(.98)'},{transform:'none'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});}
  function buttonState(n,label){
    if(n.textContent===label)return;
    const width=n.getBoundingClientRect().width;n.textContent=label;
    const next=n.getBoundingClientRect().width;
    if(!reduced.matches)motion(n,[{width:width+'px',opacity:.65},{width:next+'px',opacity:1}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
    n.classList.add('bw-dynamic-action');
  }
  function undoToast(text,undo){
    const toast=el('div',null,'bw-undo-toast');toast.setAttribute('role','status');
    const copy=el('span',text),action=button('Undo',()=>{clearTimeout(timer);undo();toast.remove();}),close=button('×',()=>{clearTimeout(timer);toast.remove();});
    close.setAttribute('aria-label','Dismiss notice');toast.append(copy,action,close);document.body.append(toast);
    let timer;const start=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!toast.contains(document.activeElement))toast.remove();},8000);};
    toast.addEventListener('pointerenter',()=>clearTimeout(timer));toast.addEventListener('pointerleave',start);
    toast.addEventListener('focusin',()=>clearTimeout(timer));toast.addEventListener('focusout',start);start();
  }
  function confirmDelete({title,onDelete,onUndo,copy={}}){
    const holdLabel=copy.hold||'Hold to delete';
    const d=el('dialog',null,'cycle-dialog bw-delete-dialog'),heading=el('h2',copy.heading||'Delete this post?');
    if(copy.compact)d.classList.add('bw-reject-dialog');
    heading.id='delete-'+crypto.randomUUID();d.setAttribute('aria-labelledby',heading.id);
    const description=el('p',copy.description||'The post will leave discovery. Existing applications and training history stay intact. You can restore it from the Deleted filter.','cycle-muted');
    description.id=heading.id+'-description';d.setAttribute('aria-describedby',description.id);
    d.append(heading,el('p',title,'bw-delete-name'),description);
    const hold=el('button',null,'bw-hold-delete');hold.type='button';
    const icon=el('i',null,copy.icon||'bi bi-trash3');icon.setAttribute('aria-hidden','true');
    const label=el('span',holdLabel);hold.append(icon,label);
    hold.setAttribute('aria-label',copy.accessibleHold||'Hold for one second to delete this post. A click confirmation alternative follows.');
    const hint=el('p',copy.hint||'Hold for one second. Release early to cancel.','bw-hold-hint');
    const alternate=button('Use click confirmation',()=>{cancel();hold.hidden=true;hint.textContent=copy.alternateHint||'Delete this post? It can be restored later.';alternate.hidden=true;confirm.hidden=false;confirm.focus();},'bw-delete-alternative');
    const confirm=button(copy.confirm||'Confirm delete',finish,'cycle-button is-danger');confirm.hidden=true;
    const keep=button(copy.keep||'Keep post',()=>d.close());
    const actions=el('div',null,'bw-delete-actions');actions.append(keep);if(!copy.holdOnly)actions.append(confirm);d.append(hold,hint);if(!copy.holdOnly)d.append(alternate);d.append(actions);
    const opener=document.activeElement;let frame=0,start=0,pointer=null,heldKey=null,finished=false;
    function cancel(){cancelAnimationFrame(frame);frame=0;hold.style.setProperty('--hold','0%');label.textContent=holdLabel;hold.classList.remove('is-holding');pointer=null;heldKey=null;}
    function finish(){if(finished)return;finished=true;cancel();onDelete();d.close();undoToast(copy.notice||'Post moved to Deleted.',onUndo);}
    function tick(t){const progress=Math.min(1,(t-start)/1000);hold.style.setProperty('--hold',(progress*100)+'%');if(progress===1)finish();else frame=requestAnimationFrame(tick);}
    function begin(){start=performance.now();hold.classList.add('is-holding');label.textContent='Keep holding…';frame=requestAnimationFrame(tick);}
    hold.addEventListener('pointerdown',event=>{if(event.button!==0||finished||frame)return;event.preventDefault();hold.focus();pointer=event.pointerId;hold.setPointerCapture(pointer);begin();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])hold.addEventListener(type,()=>{if(pointer!==null)cancel();});
    hold.addEventListener('keydown',event=>{if(![' ','Enter'].includes(event.key))return;event.preventDefault();if(event.repeat||finished||frame)return;heldKey=event.key;begin();});
    hold.addEventListener('keyup',event=>{if(event.key===heldKey){event.preventDefault();cancel();}});
    hold.addEventListener('blur',cancel);
    if(copy.holdOnly){hold.addEventListener('focus',()=>{hint.textContent='Hold 1 second · Mouse, Space or Enter';});hold.addEventListener('blur',()=>{hint.textContent=copy.hint;});}
    const blur=()=>cancel();window.addEventListener('blur',blur);
    d.addEventListener('close',()=>{cancel();window.removeEventListener('blur',blur);d.remove();if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
    window.BridgewayUX?.decorateConfirmation(d,heading.textContent);document.body.append(d);d.showModal();keep.focus();return d;
  }
  function confirmReject({title,onReject,onUndo}){
    return confirmDelete({title,onDelete:onReject,onUndo,copy:{
      heading:'Reject application?',hold:'Hold to reject',keep:'Cancel',icon:'bi bi-x-circle',compact:true,holdOnly:true,
      description:'This will decline the applicant for this role. You can undo this decision.',hint:'Hold 1 second · Release to cancel',
      accessibleHold:'Hold for one second to reject. Use mouse, Space or Enter. Release early to cancel.',notice:'Application rejected.'
    }});
  }
  function cvDrop(zone,input,onFile){
    if(!zone||zone.dataset.magnetic)return;zone.dataset.magnetic='true';zone.classList.add('bw-magnetic-cv');
    input.setAttribute('aria-label','Select or replace your CV');
    const hint=zone.querySelector('span'),originalHint=hint?.textContent;
    function reset(){zone.style.setProperty('--drop-x','0px');zone.style.setProperty('--drop-y','0px');zone.classList.remove('is-near','is-over');if(hint)hint.textContent=originalHint;}
    function over(event){
      if(!Array.from(event.dataTransfer?.types||[]).includes('Files'))return;
      const r=zone.getBoundingClientRect();if(!r.width||!r.height){reset();return;}
      const dx=event.clientX-(r.left+r.width/2),dy=event.clientY-(r.top+r.height/2);
      const distance=Math.hypot(Math.max(0,Math.abs(dx)-r.width/2),Math.max(0,Math.abs(dy)-r.height/2));
      if(distance>100){reset();return;}
      const inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
      zone.classList.add('is-near');zone.classList.toggle('is-over',inside);
      const strength=reduced.matches||inside?0:(1-distance/100)*7/Math.max(1,Math.hypot(dx,dy));
      zone.style.setProperty('--drop-x',dx*strength+'px');zone.style.setProperty('--drop-y',dy*strength+'px');
      if(hint)hint.textContent=inside?'Release to select your CV':'Bring your CV closer';
    }
    window.addEventListener('dragover',over);window.addEventListener('dragend',reset);window.addEventListener('drop',reset);
    zone.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
    zone.addEventListener('drop',event=>{if(!Array.from(event.dataTransfer?.types||[]).includes('Files'))return;event.preventDefault();reset();const file=event.dataTransfer.files[0];if(file)onFile(file);});
  }
  function cvState(zone,file){if(!zone)return;zone.classList.toggle('has-file',!!file);const label=zone.querySelector('label');if(label)label.textContent=file?'Replace your CV':'Select your CV';const icon=zone.querySelector('i');if(icon)icon.className=file?'bi bi-file-earmark-check':'bi bi-file-earmark-arrow-up';}
  function ticketPaper(){
    const paper=el('article',null,'bw-paper-ticket'),main=el('div',null,'bw-ticket-main'),stub=el('div',null,'bw-ticket-stub');
    const brand=el('div',null,'bw-ticket-brand');brand.append(el('i',null,'bi bi-chat-square-text'),el('span','Bridgeway Support'),el('small','Draft'));
    const title=el('h3','Your support ticket'),body=el('p','A clear subject and description help keep the conversation on track.','bw-ticket-description');
    main.append(brand,title,body);stub.append(el('span','Keep the conversation together.'),el('strong','Workspace'));
    paper.append(main,stub);
    // The source component uses react-parallax-tilt; keep the same restrained
    // six-degree response without introducing React into these static portals.
    paper.addEventListener('pointermove',event=>{
      if(reduced.matches||event.pointerType!=='mouse'||paper.classList.contains('is-cut')||paper.classList.contains('is-cutting')||paper.closest('.is-issued'))return;
      const r=paper.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
      paper.style.transform=`perspective(1100px) rotateX(${-y*6}deg) rotateY(${x*6}deg) scale(1.012)`;
    });
    paper.addEventListener('pointerleave',()=>{paper.style.transform='';});
    return {paper,title,body,brand,stub};
  }
  // A deterministic paper edge keeps the remaining ticket and the loose stub matched.
  const ticketTooth=x=>1.2+Math.abs(Math.sin(x*1.73)*Math.cos(x*.61))*3.2;
  function ticketEdge(width,front=width){
    const points=['0 0','100% 0','100% 100%'];
    for(let x=width;x>=0;x-=4)points.push(`${x}px calc(100% - ${x<front?ticketTooth(x):0}px)`);
    points.push('0 100%');return `polygon(${points.join(',')})`;
  }
  function ticketCurl(stub,width,height){
    const canvas=el('canvas',null,'bw-ticket-curl'),ctx=canvas.getContext?.('2d');
    if(!ctx)return null;
    canvas.setAttribute('aria-hidden','true');
    const ratio=Math.min(window.devicePixelRatio||1,2),pad=36,depth=260;
    canvas.width=(width+pad*2)*ratio;canvas.height=depth*ratio;
    canvas.style.width=(width+pad*2)+'px';canvas.style.height=depth+'px';canvas.style.left=-pad+'px';
    const texture=el('canvas'),back=el('canvas'),layer=el('canvas');
    texture.width=back.width=Math.ceil(width*ratio);texture.height=back.height=Math.ceil(height*ratio);
    layer.width=canvas.width;layer.height=canvas.height;
    const frontCtx=texture.getContext('2d'),backCtx=back.getContext('2d'),surface=layer.getContext('2d');
    const style=getComputedStyle(stub),font=style.fontFamily;
    for(const [paint,isBack] of [[frontCtx,false],[backCtx,true]]){
      paint.scale(ratio,ratio);paint.beginPath();paint.moveTo(0,12);
      for(let x=0;x<=width;x+=2)paint.lineTo(x,Math.max(ticketTooth(x),12-Math.sqrt(Math.max(0,144-(x<12?12-x:x>width-12?x-width+12:0)**2))));
      paint.lineTo(width,height-18);paint.quadraticCurveTo(width,height,width-18,height);
      paint.lineTo(18,height);paint.quadraticCurveTo(0,height,0,height-18);paint.closePath();paint.clip();
      const fill=paint.createLinearGradient(0,0,width,height);
      if(isBack){fill.addColorStop(0,'#f2f1e9');fill.addColorStop(.55,'#dce4ec');fill.addColorStop(1,'#b5c5d8');}
      else{fill.addColorStop(0,style.getPropertyValue('--ticket-paper').trim()||'#16335d');fill.addColorStop(1,'#0d1e38');}
      paint.fillStyle=fill;paint.fillRect(0,0,width,height);
      // Fine, stationary fibers belong to the paper, so they travel with the curl.
      for(let i=0;i<650;i++){
        const x=(i*73.31)%width,y=(i*31.73)%height;
        paint.fillStyle=isBack?'#ffffff30':'#ffffff08';paint.fillRect(x,y,.7+(i%3)*.4,.4);
      }
      if(!isBack){
        paint.strokeStyle='#ffffff66';paint.lineWidth=1;paint.setLineDash([4,5]);paint.beginPath();paint.moveTo(18,1);paint.lineTo(width-18,1);paint.stroke();paint.setLineDash([]);
        for(const selector of ['span','strong']){
          const node=stub.querySelector(selector),textStyle=getComputedStyle(node),rect=node.getBoundingClientRect(),base=stub.getBoundingClientRect();
          paint.font=`${textStyle.fontWeight} ${textStyle.fontSize} ${font}`;paint.fillStyle=textStyle.color;paint.textBaseline='middle';
          paint.fillText(node.textContent,rect.left-base.left,rect.top-base.top+rect.height/2,width-48);
        }
      }
    }
    const columns=Math.ceil(width/7),rows=12,nx=1/Math.hypot(1,2.8),ny=2.8*nx,radius=15;
    // Bend a textured sheet around a diagonal cylinder. The underside is a real
    // second surface; perspective and normals provide the fold's light and shade.
    const project=(x,y,front,drop)=>{
      const distance=Math.max(0,(front-x-2.8*y)*nx),angle=Math.min(distance/radius,2.72);
      const tail=Math.max(0,distance-radius*2.72),arc=radius*Math.sin(angle)+tail*Math.cos(angle);
      const z=radius*(1-Math.cos(angle))+tail*Math.sin(angle);
      let px=x+nx*(distance-arc),py=y+ny*(distance-arc);
      const perspective=850/(850-z);px=width/2+(px-width/2)*perspective;py*=perspective;
      const rotation=-.1*drop,dx=px-width/2;
      return {x:pad+width/2+dx*Math.cos(rotation)-py*Math.sin(rotation)-14*drop,y:dx*Math.sin(rotation)+py*Math.cos(rotation)+96*drop*drop,z,angle,u:x*ratio,v:y*ratio};
    };
    function triangle(a,b,c){
      const det=(b.u-a.u)*(c.v-a.v)-(c.u-a.u)*(b.v-a.v);
      const angle=(a.angle+b.angle+c.angle)/3,isBack=Math.cos(angle)<0;
      surface.save();surface.beginPath();surface.moveTo(a.x,a.y);surface.lineTo(b.x,b.y);surface.lineTo(c.x,c.y);surface.closePath();surface.clip();
      const ax=((b.x-a.x)*(c.v-a.v)-(c.x-a.x)*(b.v-a.v))/det;
      const bx=((c.x-a.x)*(b.u-a.u)-(b.x-a.x)*(c.u-a.u))/det;
      const ay=((b.y-a.y)*(c.v-a.v)-(c.y-a.y)*(b.v-a.v))/det;
      const by=((c.y-a.y)*(b.u-a.u)-(b.y-a.y)*(c.u-a.u))/det;
      surface.transform(ax,ay,bx,by,a.x-ax*a.u-bx*a.v,a.y-ay*a.u-by*a.v);
      surface.drawImage(isBack?back:texture,0,0);
      // The narrow dark valley and bright ridge make the roll legible at phone size.
      const shade=isBack?.12+.2*Math.sin(angle):.32*Math.sin(angle);
      surface.globalCompositeOperation='source-atop';surface.fillStyle=`rgba(8,24,43,${shade})`;surface.fillRect(0,0,texture.width,texture.height);
      surface.restore();
    }
    return {canvas,draw(front,drop){
      surface.setTransform(ratio,0,0,ratio,0,0);surface.clearRect(0,0,canvas.width/ratio,depth);
      const grid=Array.from({length:rows+1},(_,r)=>Array.from({length:columns+1},(_,c)=>project(c*width/columns,r*height/rows,front,drop))),triangles=[];
      for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
        const a=grid[r][c],b=grid[r][c+1],d=grid[r+1][c],e=grid[r+1][c+1];triangles.push([a,b,d],[b,e,d]);
      }
      triangles.sort((a,b)=>a.reduce((sum,p)=>sum+p.z,0)-b.reduce((sum,p)=>sum+p.z,0));
      triangles.forEach(points=>triangle(...points));
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,canvas.width/ratio,depth);
      ctx.globalAlpha=1-Math.pow(drop,1.5);ctx.shadowColor='#08172e38';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
      ctx.drawImage(layer,0,0,canvas.width/ratio,depth);ctx.shadowColor='transparent';
      // A thin exposed stock edge follows the actual torn top of the sheet.
      ctx.beginPath();
      for(let x=0;x<=Math.min(width,front);x+=2){const p=project(x,ticketTooth(x),front,drop);if(x===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
      ctx.strokeStyle='#e3e8eec9';ctx.lineWidth=.8;ctx.stroke();ctx.globalAlpha=1;
    }};
  }
  async function tearTicket(paper){
    if(paper.dataset.tearing)return;
    paper.dataset.tearing='true';paper.style.transform='';
    const stub=paper.querySelector('.bw-ticket-stub'),main=paper.querySelector('.bw-ticket-main');
    const reference=el('div',null,'bw-ticket-reference');
    reference.append(el('span','Ticket reference'),el('strong',stub.querySelector('strong').textContent));main.append(reference);
    const width=paper.getBoundingClientRect().width,modal=paper.closest?.('dialog');
    let curl,frame=0,settle;
    const finish=()=>{
      cancelAnimationFrame(frame);curl?.canvas.remove();stub.hidden=true;stub.style.visibility='';
      main.style.transform='';main.style.clipPath=ticketEdge(width);
      paper.style.height='';
      paper.classList.remove('is-cutting');paper.classList.add('is-cut');
      modal?.removeEventListener?.('close',finish);window.removeEventListener('resize',finish);
      document.removeEventListener?.('visibilitychange',onVisibility);reduced.removeEventListener?.('change',finish);
      settle?.();
    };
    const onVisibility=()=>{if(document.hidden)finish();};
    if(reduced.matches||document.hidden){finish();return;}
    try{
      curl=ticketCurl(stub,width,stub.getBoundingClientRect().height);
      if(!curl){finish();return;}
      curl.canvas.style.top=main.getBoundingClientRect().height+'px';paper.append(curl.canvas);
      paper.classList.add('is-cutting');stub.style.visibility='hidden';
      modal?.addEventListener('close',finish,{once:true});window.addEventListener('resize',finish,{once:true});
      document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener?.('change',finish,{once:true});
      await new Promise(resolve=>{
        settle=resolve;const start=performance.now();
        const smooth=t=>t*t*(3-2*t);
        function tick(now){
          const t=now-start;
          if(!paper.isConnected||t>=1580){finish();return;}
          let front;
          if(t<180)front=22*smooth(t/180);
          else if(t<1120)front=22+(width-27)*smooth((t-180)/940);
          else if(t<1230)front=width-5+13*smooth((t-1120)/110);
          else front=width+8+40*smooth(Math.min(1,(t-1230)/350));
          const drop=Math.max(0,(t-1230)/350);
          curl.draw(front,drop);main.style.clipPath=ticketEdge(width,front);
          const tension=t<1230?Math.min(1,front/width):Math.exp(-drop*6)*Math.cos(drop*10);
          main.style.transform=`translateY(${-1.5*tension}px) rotate(${.22*tension}deg)`;
          if(t>=1230)paper.classList.add('is-cut');
          frame=requestAnimationFrame(tick);
        }
        tick(start);
      });
    }finally{finish();}
  }
  function credential({student,company,hours,complete,start,end}){
    const card=el('section',null,'bw-credential'+(complete?' is-complete':''));card.setAttribute('aria-label',complete?'Training completion card':'Training verification progress');
    if(!complete){
      card.classList.add('is-progress');
      const bar=el('progress');bar.max=120;bar.value=hours;bar.setAttribute('aria-label',hours+' of 120 hours supervisor-verified');
      card.append(el('h2','Your completion card'),el('p',hours+' / 120 h verified','bw-credential-company'),bar,el('small','The blue/silver card unlocks after all eight weeks and 120 hours are verified.'));return card;
    }
    card.append(el('div',complete?'✓':'◷','bw-credential-seal'),el('p',complete?'Training completion card':'Your training record','bw-credential-kicker'),el('h2',complete?'Eight weeks. Earned.':'Building your experience.'),el('strong',student),el('p',company,'bw-credential-company'));
    const facts=el('div',null,'bw-credential-facts');facts.append(el('strong',hours+' / 120 h'),el('span',complete?'Supervisor-verified':'Verified so far'));card.append(facts);
    if(start)card.append(el('p','Started '+start+(end?' · Finished '+end:''),'bw-credential-dates'));
    card.append(el('small',complete?'Training summary · Not an official certificate.':'Your completion card unlocks when all eight weeks and 120 hours are verified.'));
    if(complete){
      card.tabIndex=0;
      card.addEventListener('pointermove',event=>{if(reduced.matches||event.pointerType==='touch')return;const r=card.getBoundingClientRect();card.style.setProperty('--foil-x',((event.clientX-r.left)/r.width*100)+'%');card.style.setProperty('--foil-y',((event.clientY-r.top)/r.height*100)+'%');});
      card.addEventListener('pointerleave',()=>{card.style.setProperty('--foil-x','50%');card.style.setProperty('--foil-y','50%');});
    }
    return card;
  }
  function meetingPass(meeting){
    meeting.classList.add('bw-meeting-pass');
    const join=meeting.querySelector('#studentMeetingJoin');
    if(join&&!meeting.querySelector('.bw-meeting-stub')){const stub=el('div',null,'bw-meeting-stub');stub.append(join);meeting.append(stub);}
  }
  const fadeSelector='.cycle-plan-nav,.cycle-ticket-list,.evaluation-roster,#weeklyStudentList,#supervisorReportStudents,#evaluationStudentList,.company-student-list';
  const watched=new WeakSet();
  const dynamic=new WeakSet();
  function dynamicButtons(root){
    const selector='.cycle-button.is-primary,.company-primary';
    const nodes=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
    nodes.forEach(n=>{if(dynamic.has(n))return;dynamic.add(n);n.classList.add('bw-dynamic-action');let previous=n.textContent,width=n.getBoundingClientRect().width;
      new ResizeObserver(()=>{width=n.getBoundingClientRect().width;}).observe(n);
      new MutationObserver(()=>{if(n.textContent===previous)return;previous=n.textContent;const next=n.getBoundingClientRect().width;if(!reduced.matches)motion(n,[{width:width+'px',opacity:.5},{width:next+'px',opacity:1}],{duration:230,easing:'ease-out'});width=next;}).observe(n,{childList:true,subtree:true,characterData:true});
    });
  }
  function fades(root){
    const nodes=[...(root.matches?.(fadeSelector)?[root]:[]),...root.querySelectorAll(fadeSelector)];
    nodes.forEach(n=>{if(watched.has(n))return;watched.add(n);n.classList.add('bw-scroll-fade');
      const update=()=>{const vertical=getComputedStyle(n).overflowY!=='visible'&&n.scrollHeight>n.clientHeight+2;n.style.setProperty('--fade-top',vertical&&n.scrollTop>2?'14px':'0px');n.style.setProperty('--fade-bottom',vertical&&n.scrollTop+n.clientHeight<n.scrollHeight-2?'18px':'0px');};
      n.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(n);new MutationObserver(update).observe(n,{childList:true,subtree:true});update();
    });
  }
  window.BridgewayKinetic={buttonState,confirmDelete,confirmReject,undoToast,cvDrop,cvState,ticketPaper,tearTicket,credential,meetingPass};
  document.addEventListener('DOMContentLoaded',()=>{
    document.addEventListener('click',event=>{const n=event.target.closest('.cycle-button.is-primary,.company-primary');if(n&&!n.disabled)pulse(n);});
    fades(document);dynamicButtons(document);
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(n=>{if(n.nodeType===1){fades(n);dynamicButtons(n);}}))).observe(document.body,{childList:true,subtree:true});
  });
})();
