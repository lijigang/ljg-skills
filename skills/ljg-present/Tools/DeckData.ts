import { createHash } from 'node:crypto';
export const VERSION='4.8.0';
export const themes=['hacker-dark','hacker','black','red','yellow'];
export const roles=['identity','chapter','statement','sequence','quotation','chart','evidence'];
export const bodyKeys=['headline','kicker','caption','lines','pre','preTitle','table','chart','diagram'];
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function resolveTheme(theme?:string,tags:string[]=[]){
  const chosen=theme??tags.find(t=>/^theme_(hacker-dark|hacker|black|red|yellow)$/.test(t))?.slice(6)??'hacker-dark';
  if(!themes.includes(chosen))throw Error('Unknown theme: '+chosen);return chosen;
}
export function contentOf(slide:any){return Object.fromEntries(bodyKeys.filter(k=>slide[k]!==undefined).map(k=>[k,slide[k]]));}
const isRecord=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:any)=>Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'&&x.length>0);
export function dataErrors(deck:any):string[]{
 const errors:string[]=[];const fail=(s:string)=>errors.push(s);
 if(!isRecord(deck))return ['deck must be an object'];
 if(typeof deck.title!=='string'||!deck.title.trim())fail('title required');
 if(deck.mode&&!['faithful','editorial'].includes(deck.mode))fail('mode must be faithful or editorial');
 if(deck.mode==='editorial'&&(typeof deck.editingBasis!=='string'||!deck.editingBasis.trim()))fail('editorial mode must record the user-authorized editing basis');
 try{resolveTheme(deck.theme,deck.tags)}catch(e){fail(String(e))}
 if(!Array.isArray(deck.slides)||!deck.slides.length)return [...errors,'slides required'];
 if(!Array.isArray(deck.sources))return [...errors,'source manifest required'];
 const sources=new Map<string,any>();
 for(const s of deck.sources){if(!s?.id||sources.has(s.id))fail('source IDs must be non-empty and unique');else sources.set(s.id,s);if(!isRecord(s?.content))fail('source '+s?.id+' needs independently transcribed content');}
 const refs:string[]=[];
  const allowed=new Set(['role','cover','title','emphasis','depth','lines','semanticGroup','quote','pre','preTitle','table','chart','diagram','headline','kicker','caption','notes','sourceIds','derivedFrom','sourceParts']);
 deck.slides.forEach((s:any,i:number)=>{
  const bad=(m:string)=>fail('slide '+(i+1)+': '+m);
  if(!isRecord(s)){bad('must be object');return;}
  for(const key of Object.keys(s))if(!allowed.has(key))bad('unsupported field '+key);
  if(!roles.includes(s.role))bad('explicit semantic role required');
  const bodies=['lines','pre','table','chart','diagram'].filter(k=>s[k]!==undefined);
  if(bodies.length!==1)bad('exactly one primary content body required');
  for(const k of ['headline','kicker','caption','notes','pre','preTitle'])if(s[k]!==undefined&&typeof s[k]!=='string')bad(k+' must be string');
  if(['identity','chapter','statement','sequence','quotation'].includes(s.role)&&!s.lines)bad(s.role+' requires lines');
  if(s.role==='chart'&&!s.chart&&!s.diagram)bad('chart role requires chart or diagram');
  if(s.role==='evidence'&&!s.table&&s.pre===undefined)bad('evidence role requires table or verbatim pre');
  if(s.role==='identity'&&i!==0)bad('identity belongs at the beginning');
  if(s.role==='identity'&&s.lines?.map((l:any)=>l.chunks?.map((c:any)=>c.t).join('')).join('').replace(/\s/g,'')!==deck.title?.replace(/\s/g,''))bad('cover must show the document title');
  if(s.lines&&(!Array.isArray(s.lines)||!s.lines.length||s.lines.some((l:any)=>!Array.isArray(l?.chunks)||!l.chunks.length||l.chunks.some((c:any)=>typeof c?.t!=='string'))))bad('invalid lines/chunks');
  if(s.table&&(!Array.isArray(s.table.rows)||!s.table.rows.length||s.table.rows.some((r:any)=>!Array.isArray(r)||r.length!==s.table.rows[0].length||r.some((c:any)=>typeof c!=='string'))))bad('table must have rectangular string cells');
  if(s.table?.header!==undefined&&typeof s.table.header!=='boolean')bad('table.header must be boolean');
  if(s.table?.caption!==undefined&&typeof s.table.caption!=='string')bad('table.caption must be string');
  if(s.chart){
   const c=s.chart, numeric=['bar','line'].includes(c.kind);
   for(const key of Object.keys(c))if(!['kind','title','items','note',...(numeric?['unit']:[]),...(c.kind==='line'?['xLabel','yLabel']:[])].includes(key))bad('unsupported chart field '+key);
   for(const key of ['note','unit','xLabel','yLabel'])if(c[key]!==undefined&&typeof c[key]!=='string')bad('chart '+key+' must be string');
   if(!['bar','line','flow','compare'].includes(c.kind)||typeof c.title!=='string'||!c.title.trim()||!Array.isArray(c.items))bad('invalid chart');
   else{
    const limits=c.kind==='compare'?[2,2]:c.kind==='flow'?[2,4]:[2,6];
    if(c.items.length<limits[0]||c.items.length>limits[1])bad('chart item count');
    if(c.items.filter((x:any)=>x.emphasis===true).length>1)bad('one chart highlight maximum');
    c.items.forEach((x:any,j:number)=>{if(typeof x.label!=='string'||!x.label)bad('chart label required');if(numeric&&!Number.isFinite(x.value))bad('finite numeric value required');if(c.kind==='line'&&(!Number.isFinite(x.x)||(j&&x.x<=c.items[j-1].x)))bad('line x must strictly increase');if(c.kind==='compare'&&(!x.text||typeof x.text!=='string'))bad('compare text required');});
   }
  }
  if(s.diagram){
   const d=s.diagram;
   if(!Number.isInteger(d.columns)||!Number.isInteger(d.rows)||d.columns<3||d.rows<2||d.columns>60||d.rows>20||!Array.isArray(d.nodes)||!Array.isArray(d.edges))bad('diagram needs a finite grid, nodes and edges');
   else{
    const ids=new Set();const locations=new Set();
    for(const n of d.nodes){if(!n.id||ids.has(n.id)||typeof n.label!=='string'||!n.label)bad('unique node ID and label required');if(n.caption!==undefined&&typeof n.caption!=='string')bad('node caption must be string');ids.add(n.id);const key=n.col+','+n.row;if(locations.has(key))bad('nodes cannot share an anchor');locations.add(key);if(!Number.isInteger(n.col)||!Number.isInteger(n.row)||n.col<0||n.col>=d.columns||n.row<0||n.row>=d.rows)bad('node outside diagram grid');}
    const outside=(p:any)=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<0||p[0]>=d.columns||p[1]<0||p[1]>=d.rows;
    for(const e of d.edges){if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)bad('edge must connect distinct existing nodes');if(e.label!==undefined&&typeof e.label!=='string')bad('edge label must be string');if(e.via!==undefined&&(!Array.isArray(e.via)||e.via.some(outside)))bad('route point outside grid');if(e.at!==undefined&&outside(e.at))bad('edge label outside grid');}
   }
  }
  const ids=s.sourceIds??[],derived=s.derivedFrom??[];
  if(!strings(ids)&&!(s.role==='identity'&&Array.isArray(ids)&&!ids.length)&&!derived.length)bad('sourceIds required');
  if(ids.length&&derived.length)bad('sourceIds and derivedFrom are exclusive');
  if(derived.length){if(!strings(derived))bad('derivedFrom must be source IDs');for(const id of derived)if(!sources.has(id))bad('unknown derived source '+id);if(deck.mode!=='editorial'){const prior=deck.slides[i-1]?.sourceIds??[];if(!derived.every((id:string)=>prior.includes(id)))bad('faithful supplemental diagram must follow its source');}}
  for(const id of ids){if(!sources.has(id))bad('unknown source '+id);refs.push(id);}
  if((deck.mode??'faithful')==='faithful'&&ids.length){
   if(s.sourceParts?.length){if(ids.length!==1||s.sourceParts.length!==1||s.sourceParts[0].id!==ids[0]||!s.lines||bodyKeys.some(k=>k!=='lines'&&s[k]!==undefined)||Object.keys(sources.get(ids[0])?.content??{}).some(k=>k!=='lines'))bad('continuation needs one text-only source');}
   else if(ids.length===1){if(JSON.stringify(contentOf(s))!==JSON.stringify(sources.get(ids[0])?.content))bad('faithful source content changed');}
   else {const expected=ids.flatMap((id:string)=>sources.get(id)?.content?.lines??[]);if(!s.lines||JSON.stringify(expected)!==JSON.stringify(s.lines)||s.headline||s.caption||s.kicker)bad('grouped sources must reconstruct their original lines');}
  }
 });
 const first=[...new Set(refs)];
 for(const id of sources.keys())if(!first.includes(id))fail('unreferenced source '+id+'; editorial omissions belong in speaker notes with a referenced slide');
 if((deck.mode??'faithful')==='faithful'){
  if(JSON.stringify(first)!==JSON.stringify([...sources.keys()]))fail('faithful source order changed');
  for(const [id,source] of sources){const owners=deck.slides.map((s:any,i:number)=>({s,i})).filter(({s}:any)=>s.sourceIds?.includes(id));
   if(owners.length>1||owners.some(({s}:any)=>s.sourceParts?.length)){const parts=owners.map(({s}:any)=>s.sourceParts?.[0]);if(parts.some((p:any,j:number)=>!p||p.index!==j+1||p.total!==owners.length||p.joinBefore!==undefined&&typeof p.joinBefore!=='string')||owners.some((v:any,j:number)=>j&&v.i!==owners[j-1].i+1))fail('invalid or noncontiguous continuation '+id);else{const original=source.content?.lines?.map((l:any)=>l.chunks.map((c:any)=>c.t).join('')).join('\n');const joined=owners.map(({s}:any,j:number)=>(j?(s.sourceParts[0].joinBefore??''):'')+s.lines.map((l:any)=>l.chunks.map((c:any)=>c.t).join('')).join('\n')).join('');if(original!==joined)fail('continuation text changed '+id);}}
  }
 }
 return errors;
}
export function prepareDeck(input:any){
 const deck=structuredClone(input);deck.mode??='faithful';deck.theme=resolveTheme(deck.theme,deck.tags);
 const errors=dataErrors(deck);if(errors.length)throw Error(errors.join('\n'));
 if(deck.slides[0].role!=='identity'){
  const first=deck.slides[0],text=first.lines?.map((l:any)=>l.chunks.map((c:any)=>c.t).join('')).join('\n');
  if(text===deck.title&&!first.caption&&!first.headline)first.role='identity';
  else deck.slides.unshift({role:'identity',cover:true,sourceIds:[],lines:[{chunks:[{t:deck.title}]}]});
 }
 const {slides,...meta}=deck;meta.version=VERSION;return {slides,meta};
}
export function materialize(template:string,prepared:{slides:any[];meta:any}){
 const {buildId:_old,...meta}=prepared.meta;meta.templateId=hash(normalizedTemplate(template));meta.buildId=hash(safeJson({slides:prepared.slides,meta}));prepared.meta=meta;
 const replacements:Record<string,string>={TITLE:escapeHtml(prepared.meta.title),SUBTITLE:escapeHtml(prepared.meta.subtitle??''),THEME:prepared.meta.theme,SLIDES_JSON:safeJson(prepared.slides),DECK_META_JSON:safeJson(prepared.meta)};
 return template.replace(/\{\{(TITLE|SUBTITLE|THEME|SLIDES_JSON|DECK_META_JSON)\}\}/g,(_match,key)=>replacements[key]);
}
export function parseDeck(html:string){
 const raw=html.match(/const RAW_SLIDES = ([\s\S]*?);\n/)?.[1],meta=html.match(/const DECK_META = ([\s\S]*?);\n/)?.[1];
 if(!raw||!meta)throw Error('compiled deck payload missing');return {slides:JSON.parse(raw),meta:JSON.parse(meta)};
}
export function normalizedTemplate(html:string){
 return html.replace(/\/\* BEGIN DECK FONTS \*\/[\s\S]*?\/\* END DECK FONTS \*\//,'/* DECK FONTS */').replace(/<template id="deck-font-license">[\s\S]*?<\/template>\n?/,'').replace(/<title>[\s\S]*?<\/title>/,'<title>{{TITLE}}</title>').replace(/(<body\b[^>]*\bdata-theme=")[^"]*(")/,'$1{{THEME}}$2').replace(/(<div class="meta-footer" id="metaFooter">)[\s\S]*?(<\/div>)/,'$1{{SUBTITLE}}$2').replace(/const RAW_SLIDES = [\s\S]*?;\n/,'const RAW_SLIDES = {{SLIDES_JSON}};\n').replace(/const DECK_META = [\s\S]*?;\n/,'const DECK_META = {{DECK_META_JSON}};\n');
}
