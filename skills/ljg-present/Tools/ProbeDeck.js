async () => {
  await document.fonts.ready;
  const api=window.__DECK_AUDIT;
  if(!api||typeof RAW_SLIDES==='undefined'||typeof DECK_META==='undefined')throw Error('Current deck runtime not found');
  const initial=api.activeIndex(),portrait=innerWidth<innerHeight,pages=[];
  const tick=()=>new Promise(requestAnimationFrame);
  const expectedText=line=>{const box=document.createElement('div');box.innerHTML=line.chunks.map(c=>api.renderMathAware(c.t)).join('');return box.textContent;};
  for(let i=0;i<RAW_SLIDES.length;i++){
    api.show(i);await tick();await tick();
    const input=RAW_SLIDES[i],slide=document.querySelector('.slide.active'),failures=[];
    const check=(condition,message)=>{if(!condition)failures.push(message);};
    check(slide.dataset.composition===input.role,'semantic role mismatch');
    const primary=slide.querySelectorAll('.primary-object');check(primary.length===1,'expected one primary object');
    check(slide.classList.contains(input.role),'role layout class missing');
    if(input.lines)check(JSON.stringify([...slide.querySelectorAll('.primary-object .line')].map(n=>n.textContent))===JSON.stringify(input.lines.map(expectedText)),'visible lines changed');
    if(input.pre!==undefined)check(slide.querySelector('.source-pre')?.textContent===input.pre,'verbatim block changed');
    if(input.table)check(JSON.stringify([...slide.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>c.textContent)))===JSON.stringify(input.table.rows),'table cells changed');
    if(input.chart){check(slide.querySelector('.chart-title')?.textContent===input.chart.title,'chart title changed');const labels=[...slide.querySelectorAll('.relation-item>.chart-label,.bar-head>.chart-label')].map(n=>n.textContent);if(input.chart.kind!=='line')check(JSON.stringify(labels)===JSON.stringify(input.chart.items.map(n=>n.label)),'chart labels or order changed');}
    if(input.diagram){
      const nodes=[...slide.querySelectorAll('.diagram-node')];
      check(JSON.stringify(nodes.map(n=>[n.dataset.nodeId,n.querySelector('.node-label')?.textContent]))===JSON.stringify(input.diagram.nodes.map(n=>[n.id,n.label])),'diagram labels changed');
      check(!/[+|\-]/.test(slide.querySelector('.connector-grid').textContent),'connector grid contains ASCII drawing');
      for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++){const x=nodes[a].getBoundingClientRect(),y=nodes[b].getBoundingClientRect();check(!(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2),'diagram node labels overlap');}
    }
    check(slide.dataset.fits==='true','content frame outside stage');
    const fit=+slide.dataset.fitScale,scale=+slide.dataset.stageScale;check(fit>=.8,'layout needs repagination, fit below 0.80');
    const nodes=[...slide.querySelectorAll('.line,.headline,.caption,.node-label,.node-caption,.edge-label,th,td,.source-pre,.chart-title,.chart-label,.chart-value,.relation-text,.chart-note,.chart-axis,svg text')];
    const measures=[];
    for(const node of nodes){
      if(!node.getClientRects().length)continue;
      const r=node.getBoundingClientRect(),css=getComputedStyle(node),svg=node instanceof SVGTextElement,m=svg?node.getScreenCTM():null;
      const font=parseFloat(css.fontSize)*(svg?Math.hypot(m.a,m.b):fit*scale);
      const note=node.matches('.caption,.chart-note,.chart-axis,.node-caption,.edge-label');
      const chart=node.matches('.chart-label,.chart-value,.relation-text,.node-label,svg text');
      const floor=portrait?(note?16:node.matches('.source-pre')?16:node.matches('th,td')?16:20):note?20:chart?26:node.matches('th,td')?30:node.matches('.source-pre')?22:node.matches('.line')&&['identity','statement','chapter'].includes(input.role)?56:40;
      check(font>=floor-.1,'small '+node.className+' '+font.toFixed(1)+' < '+floor);
      const pan=portrait&&node.closest('.diagram-shell,.pre-shell');
      if(!pan)check(r.left>=-.5&&r.right<=innerWidth+.5&&r.top>=-.5&&r.bottom<=innerHeight-34,'clipped '+node.className);
      measures.push({kind:typeof node.className==='string'?node.className:'svg-text',font:+font.toFixed(1)});
    }
    pages.push({page:i+1,role:input.role,prototype:slide.dataset.prototype,fit,pass:!failures.length,failures,measures});
  }
  const key=async(k,target=document)=>{target.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));await tick();};
  const keys=[];api.show(0);await tick();
  for(const k of ['ArrowRight','ArrowDown',' ','Enter','j','PageDown']){const prior=api.activeIndex();await key(k);keys.push(api.activeIndex()===Math.min(RAW_SLIDES.length-1,prior+1));}
  for(const k of ['ArrowLeft','ArrowUp','k','PageUp']){const prior=api.activeIndex();await key(k);keys.push(api.activeIndex()===Math.max(0,prior-1));}
  await key('End');keys.push(api.activeIndex()===RAW_SLIDES.length-1);await key('Home');keys.push(api.activeIndex()===0);
  await key('n');const dialog=document.getElementById('speakerNotes');keys.push(dialog.open&&document.getElementById('notesBody').textContent===(RAW_SLIDES[0].notes||'本页没有附加讲稿。'));await key('ArrowRight');keys.push(api.activeIndex()===0);await key('n');keys.push(!dialog.open);
  const noteIndex=RAW_SLIDES.findIndex(s=>typeof s.notes==='string'&&s.notes.length>0);
  if(noteIndex>=0){api.show(noteIndex);await tick();await key('n');keys.push(dialog.open&&document.getElementById('notesBody').textContent===RAW_SLIDES[noteIndex].notes);await key('n');keys.push(!dialog.open);api.show(0);await tick();}
  const input=document.createElement('input');document.body.appendChild(input);await key('PageDown',input);keys.push(api.activeIndex()===0);input.remove();
  api.show(initial);await tick();
  const remoteRequests=performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).map(r=>r.name);
  return {version:api.templateVersion,buildId:api.buildId,viewport:{width:innerWidth,height:innerHeight},count:pages.length,pass:pages.every(p=>p.pass)&&keys.every(Boolean)&&!remoteRequests.length,keyboard:keys.every(Boolean),remoteRequests,pages};
}
