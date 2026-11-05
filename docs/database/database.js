(function () {
  'use strict';
  const M=window.BridgewayDatabase,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const svgEl=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
  const relationships=M.tables.flatMap(t=>t.foreignKeys.map(f=>({source:t.id,...f}))),accountLinks=relationships.filter(f=>f.source==='core.UserAccount'||f.target==='core.UserAccount').length;
  let view='er',selected=null;
  const graphs={er:{scale:1,manual:false},schema:{scale:1,manual:false}};
  $('model-summary').textContent=`${M.tables.length} tables · ${relationships.length} relationships`;
  for(const g of M.groups){const option=el('option',g.name+(g.planned?' (planned)':''));option.value=g.id;$('group').append(option);}
  document.querySelectorAll('.account-count').forEach(n=>n.textContent=`(${accountLinks})`);
  const match=t=>($('group').value==='all'||t.group===$('group').value)&&(!searchText()||[t.id,t.description,...t.columns.map(c=>c.name)].join(' ').toLowerCase().includes(searchText()));
  const searchText=()=>$('search').value.trim().toLowerCase();
  function setTab(next,focus=false){
    view=next;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===next;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;$('panel-'+b.dataset.view).hidden=!active;if(active&&focus)b.focus();});
    $('filters').hidden=['sql','rules'].includes(next);
    if(graphs[next])requestAnimationFrame(()=>draw(next));
    if(next==='tables')renderTables();
  }
  const tabs=[...document.querySelectorAll('[data-view]')];
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>setTab(b.dataset.view));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[j].dataset.view,true);});});
  function refresh(){selected=null;for(const g of Object.values(graphs))g.manual=false;const chosen=M.tables.filter(match);$('filter-summary').textContent=`${chosen.length} of ${M.tables.length} tables`;if(view==='tables')renderTables();else if(graphs[view])draw(view);}
  $('search').addEventListener('input',refresh);$('group').addEventListener('change',refresh);$('clear').addEventListener('click',()=>{$('search').value='';$('group').value='all';refresh();});
  function flags(t,col){return [t.primaryKey.columns.includes(col.name)?'PK':'',t.foreignKeys.some(f=>f.columns.includes(col.name))?'FK':'',t.uniqueKeys.some(k=>k.columns.includes(col.name))?'UQ':''].filter(Boolean).join(' ');}
  function marker(defs,id,many,optional){const m=svgEl('marker',{id,viewBox:'-2 -9 32 18',refX:0,refY:0,markerWidth:30,markerHeight:18,orient:'auto-start-reverse',markerUnits:'userSpaceOnUse'});m.append(svgEl('path',{d:many?'M0 -7 L14 0 L0 7 M0 0 L14 0':'M6 -7 L6 7',class:'relation'}));if(optional)m.append(svgEl('circle',{cx:23,cy:0,r:4,fill:'var(--diagram)',stroke:'var(--link)','stroke-width':1.2}));defs.append(m);}
  function draw(kind){
    const g=graphs[kind],svg=$('diagram-'+kind),viewport=$('viewport-'+kind),chosen=M.tables.filter(match),schema=kind==='schema';svg.replaceChildren();svg.setAttribute('role','group');
    svg.append(svgEl('title',{id:kind==='er'?'er-title':'schema-title'},schema?'Field-level database relationships':'Database entity relationships'));
    const defs=svgEl('defs');marker(defs,kind+'-zero-many',true,true);marker(defs,kind+'-many',true,false);marker(defs,kind+'-zero-one',false,true);marker(defs,kind+'-one',false,false);svg.append(defs);
    const layout=M.layout.filter(l=>chosen.some(t=>t.id===l.table)),cols=[...new Set(layout.map(l=>l.column))].sort((a,b)=>a-b),width=schema?430:300,gap=schema?130:100,ys=new Map(),positions=new Map();
    for(const l of layout){const t=M.find(l.table),column=cols.indexOf(l.column),x=40+column*(width+gap),y=ys.get(column)||32,height=schema?72+t.columns.length*25:100;positions.set(t.id,{x,y,width,height});ys.set(column,y+height+36);}
    const naturalWidth=Math.max(600,cols.length*(width+gap)+100),naturalHeight=Math.max(400,...ys.values())+24;g.naturalWidth=naturalWidth;g.naturalHeight=naturalHeight;
    svg.setAttribute('viewBox',`0 0 ${naturalWidth} ${naturalHeight}`);
    const links=svgEl('g',{class:'relations'}),boxes=svgEl('g',{class:'entities'});svg.append(links,boxes);g.positions=positions;g.linkNodes=[];
    for(const [index,f]of relationships.entries()){
      const a=positions.get(f.source),b=positions.get(f.target);if(!a||!b)continue;
      const source=M.find(f.source),target=M.find(f.target),group=svgEl('g',{'data-source':f.source,'data-target':f.target});
      const pairs=schema?f.columns.map((c,i)=>[source.columns.findIndex(v=>v.name===c),target.columns.findIndex(v=>v.name===f.targetColumns[i])]):[[0,0]];
      for(const [pairIndex,[rowA,rowB]]of pairs.entries()){
        let x1,x2,curve;const offset=((index%5)-2)*2,y1=a.y+(schema?58+rowA*25:a.height/2)+offset,y2=b.y+(schema?58+rowB*25:b.height/2)+offset;
        if(a.x===b.x){x1=a.x+a.width;x2=b.x+b.width;const side=x1+40+(index%7)*9;curve=`M${x1} ${y1} C${side} ${y1},${side} ${y2},${x2} ${y2}`;}
        else{x1=a.x+(b.x>a.x?a.width:0);x2=b.x+(b.x>a.x?0:b.width);const mid=(x1+x2)/2;curve=`M${x1} ${y1} C${mid} ${y1},${mid} ${y2},${x2} ${y2}`;}
        const path=svgEl('path',{d:curve,class:'relation','marker-start':`url(#${kind}-${f.cardinality.parentMinimum===1?(f.cardinality.from==='many'?'many':'one'):(f.cardinality.from==='many'?'zero-many':'zero-one')})`,'marker-end':`url(#${kind}-${f.cardinality.optional?'zero-one':'one'})`});
        path.append(svgEl('title',{},`${f.source} (${f.columns.join(', ')}) → ${f.target} (${f.targetColumns.join(', ')})`));group.append(path);
        if(pairIndex===0){const label=svgEl('text',{x:a.x===b.x?a.x+a.width+42+(index%7)*9:(x1+x2)/2,y:(y1+y2)/2-7,class:'relation-label','text-anchor':a.x===b.x?'start':'middle'},f.verb);group.append(label);}
      }
      links.append(group);g.linkNodes.push({node:group,f});
    }
    g.entityNodes=[];
    for(const t of chosen){
      const p=positions.get(t.id),node=svgEl('g',{class:'entity group-'+t.group,transform:`translate(${p.x},${p.y})`,tabindex:0,role:'button','aria-label':`${t.id}, ${t.columns.length} columns. Select relationships.`,'aria-pressed':'false','data-table':t.id});
      node.append(svgEl('rect',{class:'entity-paper',width:p.width,height:p.height,rx:8}),svgEl('path',{class:'entity-head',d:`M8 0 H${p.width-8} Q${p.width} 0 ${p.width} 8 V38 H0 V8 Q0 0 8 0 Z`}),svgEl('text',{x:14,y:25,class:'entity-title'},t.id));
      if(schema)t.columns.forEach((col,i)=>{const y=58+i*25;node.append(svgEl('text',{x:12,y,class:'column-key'},flags(t,col)),svgEl('text',{x:76,y,class:'column-name'},col.name),svgEl('text',{x:p.width-12,y,class:'column-type'},col.type));if(i<t.columns.length-1)node.append(svgEl('line',{x1:12,x2:p.width-12,y1:y+9,y2:y+9,class:'column-rule'}));});
      else{node.append(svgEl('text',{x:14,y:61,class:'entity-subtitle'},`${t.columns.length} columns · PK ${t.primaryKey.columns.join(', ')}`.slice(0,49)),svgEl('text',{x:14,y:82,class:'entity-subtitle'},M.groups.find(g=>g.id===t.group).planned?'Planned integration':'Current workflow'));}
      const choose=()=>{selected=selected===t.id?null:t.id;highlight(kind,selected);};node.addEventListener('click',choose);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});node.addEventListener('mouseenter',()=>highlight(kind,selected||t.id));node.addEventListener('mouseleave',()=>highlight(kind,selected));node.addEventListener('focus',()=>highlight(kind,selected||t.id));node.addEventListener('blur',()=>highlight(kind,selected));boxes.append(node);g.entityNodes.push({node,t});
    }
    svg.onclick=e=>{if(!e.target.closest('.entity')){selected=null;highlight(kind,null);}};
    const legend=$('panel-'+kind).querySelector('.legend');legend.replaceChildren();for(const group of M.groups.filter(gr=>chosen.some(t=>t.group===gr.id))){const label=el('span',undefined,'group-'+group.id);label.append(el('i'),document.createTextNode(group.name));legend.append(label);}
    if(!chosen.length)svg.append(svgEl('text',{x:40,y:60,class:'entity-subtitle'},'No tables match. Clear the filters to see the model.'));
    options(kind);highlight(kind,selected);if(!g.manual)fit(kind);else applyZoom(kind);
    viewport.setAttribute('aria-label',`${schema?'Schema':'ER'} diagram, ${chosen.length} tables. Use the Fit and zoom controls, then scroll.`);
  }
  function applyZoom(kind){const g=graphs[kind],svg=$('diagram-'+kind);svg.setAttribute('width',Math.ceil(g.naturalWidth*g.scale));svg.setAttribute('height',Math.ceil(g.naturalHeight*g.scale));$('panel-'+kind).querySelector('.zoom-value').textContent=Math.round(g.scale*100)+'%';}
  function fit(kind){const g=graphs[kind],v=$('viewport-'+kind);if(!g.naturalWidth)return;g.scale=Math.min(1,(v.clientWidth-24)/g.naturalWidth,(v.clientHeight-24)/g.naturalHeight);applyZoom(kind);v.scrollTo(0,0);}
  function options(kind){const panel=$('panel-'+kind),hide=panel.querySelector('.hide-account').checked,labels=panel.querySelector('.show-labels').checked;for(const {node,f}of graphs[kind].linkNodes||[]){node.toggleAttribute('hidden',hide&&(f.source==='core.UserAccount'||f.target==='core.UserAccount'));node.querySelectorAll('.relation-label').forEach(n=>n.toggleAttribute('hidden',!labels));}}
  function highlight(kind,id){const g=graphs[kind],related=relationships.filter(f=>f.source===id||f.target===id),neighbors=new Set([id,...related.flatMap(f=>[f.source,f.target])]);for(const {node,t}of g.entityNodes||[]){node.classList.toggle('is-dim',!!id&&!neighbors.has(t.id));node.classList.toggle('is-selected',selected===t.id);node.setAttribute('aria-pressed',selected===t.id?'true':'false');}for(const {node,f}of g.linkNodes||[]){const active=f.source===id||f.target===id;node.querySelectorAll('path,text').forEach(n=>{n.classList.toggle('is-related',!!id&&active);n.classList.toggle('is-dim',!!id&&!active);});}
    $('selection-'+kind).textContent=id?`${id}: ${related.length} relationships. `+related.slice(0,3).map(f=>`${f.source} ${f.verb} ${f.target}`).join('; ')+(related.length>3?`; plus ${related.length-3} more.`:'.'):'Select a table to highlight its relationships. Select it again to clear.';
  }
  document.querySelectorAll('.zoom-controls').forEach(control=>control.addEventListener('click',e=>{const b=e.target.closest('[data-zoom]');if(!b)return;const kind=control.dataset.target,g=graphs[kind];if(b.dataset.zoom==='fit'){g.manual=false;fit(kind);}else{g.manual=true;g.scale=b.dataset.zoom==='actual'?1:Math.max(.08,Math.min(2,g.scale*(b.dataset.zoom==='in'?1.35:1/1.35)));applyZoom(kind);}}));
  for(const kind of ['er','schema'])$('panel-'+kind).querySelectorAll('input[type=checkbox]').forEach(n=>n.addEventListener('change',()=>options(kind)));
  let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{if(graphs[view]&&!graphs[view].manual)fit(view);},100);});
  function openTable(id){$('search').value='';$('group').value='all';setTab('tables');requestAnimationFrame(()=>{const item=$('table-'+id.replace('.','-'));if(item){item.open=true;item.querySelector('summary').focus();item.scrollIntoView({block:'start'});}});}
  function refButton(id,label){const b=el('button',label||id);b.type='button';b.addEventListener('click',()=>openTable(id));return b;}
  function renderTables(){const root=$('table-directory');root.replaceChildren();const chosen=M.tables.filter(match);if(!chosen.length){root.append(el('p','No tables match. Clear the filters to see the model.','empty'));return;}
    for(const group of M.groups){const tables=chosen.filter(t=>t.group===group.id);if(!tables.length)continue;const section=el('section',undefined,'table-group');section.append(el('h3',group.name+(group.planned?' · Planned':'')));
      for(const t of tables){const record=el('details',undefined,'table-record');record.id='table-'+t.id.replace('.','-');const summary=el('summary');summary.append(el('strong',t.id),el('span',`${t.columns.length} columns`));record.append(summary);const detail=el('div',undefined,'table-detail');detail.append(el('p',t.description));const scroll=el('div',undefined,'table-scroll'),table=el('table'),head=el('thead'),hr=el('tr');for(const title of ['Column','SQL Server type','Keys','Nullable','Default / identity']){const th=el('th',title);th.scope='col';hr.append(th);}head.append(hr);table.append(head);const body=el('tbody');for(const col of t.columns){const row=el('tr');for(const [i,value]of [col.name,col.type,flags(t,col)||'None',col.nullable?'Yes':'No',col.identity?'IDENTITY(1,1)':col.default??(col.type==='rowversion'?'Server generated':'None')].entries()){const td=el('td',value,i===0?'field-name':i===2?'key-tag':'');if(i===0)td.title=col.description;row.append(td);}body.append(row);}table.append(body);scroll.append(table);detail.append(scroll);
        const constraints=el('ul',undefined,'constraints');for(const key of [t.primaryKey,...t.uniqueKeys])constraints.append(el('li',`${key.name}: (${key.columns.join(', ')})`));for(const check of t.checks)constraints.append(el('li',`${check.name}: ${check.expression}`));detail.append(el('h4','Constraints'),constraints);
        const indexes=el('ul',undefined,'constraints');for(const ix of t.indexes)indexes.append(el('li',`${ix.name}: (${ix.columns.join(', ')})${ix.unique?' UNIQUE':''}${ix.filter?' WHERE '+ix.filter:''}`));if(!t.indexes.length)indexes.append(el('li','Primary and unique keys supply their own indexes.'));detail.append(el('h4','Indexes'),indexes);
        const refs=el('div',undefined,'references');for(const [title,links]of [['Points to',relationships.filter(f=>f.source===t.id)],['Referenced by',relationships.filter(f=>f.target===t.id)]]){const part=el('section'),ul=el('ul');part.append(el('h4',title));for(const f of links){const li=el('li'),target=title==='Points to'?f.target:f.source;li.append(refButton(target),document.createTextNode(` (${f.columns.join(', ')}) → (${f.targetColumns.join(', ')}). Delete: ${f.onDelete}.`));ul.append(li);}if(!links.length)ul.append(el('li','None'));part.append(ul);refs.append(part);}detail.append(refs);record.append(detail);section.append(record);
      }root.append(section);
    }
  }
  $('sql-code').textContent=M.ddl();
  $('download-sql').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([M.ddl()],{type:'application/sql;charset=utf-8'})),a=el('a');a.href=url;a.download='schema.sql';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('sql-status').textContent='Schema downloaded. Install procedures.sql afterward.';});
  $('copy-sql').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(M.ddl());$('sql-status').textContent='SQL copied to clipboard.';}catch{$('sql-status').textContent='Clipboard access is unavailable. Select the SQL text and copy it, or use Download.';}});
  for(const r of M.rules){const item=el('article',undefined,'rule'),heading=el('div');heading.append(el('h3',r.title),el('small',r.phase==='Planned'?'Planned integration':'Current workflow'));const copy=el('div');copy.append(el('p',r.description),el('p',r.enforcement));item.append(heading,copy);$('rules').append(item);}
  refresh();
})();
