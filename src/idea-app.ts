import type {SupabaseClient} from '@supabase/supabase-js';
import {IdeaStore,type SavedIdea} from './idea-store.ts';
import {collectionKinds,stockKind,linkedPlaces,visiblePlace,archivedFavorites,escapeHtml as e,safeLink,timeLabel,ideaProperties,placeProperties} from './idea-library.ts';
import {activityCategories,activitySettings,categoryOf,settingOf,legacyMood,type ActivityCategory} from './activity-properties.ts';
import {kindForActivity,placeOnlyKind,type StockItem} from './activity-stock.ts';
import type {KnownActivity} from './known-activities.ts';
import {chooseActivities,emptyGuideAnswers,type GuideAnswers} from './activity-guide.ts';
import {categoryIcon} from './category-icons.ts';

type View='ideas'|'places';
type Editor={kind:'idea'|'place';id:string;original?:KnownActivity|StockItem;linkedTo?:string;blocked?:boolean;values?:Record<string,string>};
const energies=[['low','Niedrig'],['medium','Mittel'],['high','Hoch']] as const;
const efforts=[['spontaneous','Direkt loslegen'],['prepare','Etwas Vorbereitung'],['trip','Auch etwas planen']] as const;
const icon=(label:string)=>categoryIcon(label);
const action=(name:string,label:string,attrs='')=>`<button type="button" data-action="${name}" ${attrs}>${label}</button>`;
const options=(rows:readonly (readonly [string,string])[],selected:string)=>rows.map(([v,l])=>`<option value="${e(v)}" ${v===selected?'selected':''}>${e(l)}</option>`).join('');
const select=(name:string,label:string,rows:readonly (readonly [string,string])[],value:string)=>`<label>${label}<select name="${name}">${options(rows,value)}</select></label>`;
const input=(name:string,label:string,value:unknown='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
const meta=(values:readonly string[])=>`<div class="idea-meta">${values.map(v=>`<span>${e(v)}</span>`).join('')}</div>`;
const kindLabel=(kind:string)=>collectionKinds.find(([k])=>k===kind)?.[1]||'Weitere Orte';

export function initIdeaApp(root:HTMLElement,database:SupabaseClient){
 const store=new IdeaStore(database);
 let view:View=location.hash==='#orte'||location.hash==='#gemerkt'?'places':'ideas';
 let group=view==='ideas'?'movement':'bike',selected='',query='',onlyFavorites=false;
 let editor:Editor|null=null,status='',loading=false,guideOpen=false,listOpen=false;
 const compact=window.matchMedia('(max-width:740px)');
 let answers:GuideAnswers=emptyGuideAnswers();
 const routines=()=>store.state?.routines??[];
 const places=()=>store.state?.activityStock??[];
 const visiblePlaces=()=>places().filter(p=>visiblePlace(p,store.decisions));
 const favorites=()=>archivedFavorites(store.favorites,places(),store.decisions);
 const textMatch=(s:string)=>s.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de').trim());
 function selection(){return view==='ideas'?routines().find(x=>x.id===selected):group==='archive'?favorites().find(x=>x.id===selected):visiblePlaces().find(x=>x.id===selected);}
 function groups(){return view==='ideas'?activityCategories:[...collectionKinds,['archive','Weitere gemerkte Ideen'] as const];}
 function groupItems(key:string):(KnownActivity|StockItem|SavedIdea)[]{
  if(view==='ideas')return routines().filter(a=>categoryOf(a)===key&&(!onlyFavorites||a.favorite)&&textMatch(a.title));
  if(key==='archive')return favorites().filter(a=>textMatch(a.title));
  return visiblePlaces().filter(p=>stockKind(p)===key&&(!onlyFavorites||p.favorite)&&textMatch(p.title+' '+p.note+' '+(p.address||'')));
 }
 function render(){
  const list=groupItems(group);if(!list.some(x=>x.id===selected))selected=list[0]?.id||'';
  root.innerHTML=`<div class="idea-shell"><header class="idea-header"><button class="idea-brand" type="button" data-action="ideas"><img src="./favicon.svg" alt="" width="34" height="34">Freizeitideen</button><nav aria-label="Hauptbereiche">${action('ideas','Freizeitideen',`aria-pressed="${view==='ideas'}"`)}${action('places','Orte &amp; Touren',`aria-pressed="${view==='places'}"`)}</nav></header><main><div class="idea-heading"><div><p class="eyebrow">Deine persönliche Sammlung</p><h1>Etwas Schönes vorhaben.</h1><p class="muted">Kleine Ideen. Vertraute Orte. Zeit für euch.</p></div>${action('add',view==='ideas'?'+ Idee hinzufügen':'+ Ort / Tour hinzufügen','class="primary" '+(!store.state||loading?'disabled':''))}</div><p id="appStatus" role="status" aria-live="polite">${e(status||(!store.state?'Deine Sammlung wird geladen …':''))}</p>${warnings()}${view==='ideas'?guide():''}<div class="idea-book"><aside><div class="index-label"><span>${view==='ideas'?'Deine Freizeitideen':'Deine Orte & Touren'}</span><span>${view==='ideas'?routines().length:visiblePlaces().length}</span></div><label class="field-label">Bereich<select id="collectionGroup" aria-label="Sammlungsbereich">${options(groups().map(([k,v])=>[k,v+' · '+groupItems(k).length]),group)}</select></label><label class="field-label">${view==='ideas'?'Idee suchen':'Ort oder Tour suchen'}<input id="collectionSearch" type="search" value="${e(query)}" maxlength="100" autocomplete="off"></label><label class="favorite-filter"><input type="checkbox" id="favoriteFilter" ${onlyFavorites?'checked':''}> Nur Favoriten</label>${compact.matches?action('toggle-list',e(selection()?.title||'Eintrag wählen')+'<small>Eintrag wechseln · '+list.length+' Einträge</small>','class="mobile-picker" aria-expanded="'+listOpen+'"'):''}<div class="idea-index" aria-label="Einträge" ${compact.matches&&!listOpen?'hidden':''}>${list.map(row=>indexRow(row)).join('')||`<p class="empty">${!store.state?'Sammlung wird geladen …':group==='archive'&&!store.favoritesReady?'Gemerkte Ideen konnten nicht geladen werden.':'Hier ist noch kein passender Eintrag.'}</p>`}</div><p class="index-foot">Von dir gesammelt, für dich.</p></aside><section class="idea-detail" aria-label="Ausgewählter Eintrag">${editor?form():details()}</section></div></main><footer><span>${store.state?routines().length+' Freizeitideen · '+places().length+' Orte & Touren':'Gemeinsame Sammlung'} · auf allen Geräten</span><div>${action('reload',loading?'Wird geladen …':'Neu laden',(loading||store.saving?'disabled':''))}${action('backup','Sicherung herunterladen',store.state?'':'disabled')}</div></footer></div>`;
  wireForm();
  if(editor)root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#collectionSearch,.choice-fields select').forEach(el=>el.disabled=true);
 }
 function warnings(){const warnings=[];
  if(store.state&&!store.decisions.ready)warnings.push('Ausblendungen oder Bewertungen konnten nicht geladen werden. Eigene Einträge bleiben sichtbar; verknüpfte Recherchefunde werden vorsichtshalber ausgeblendet.');
  if(store.state&&!store.favoritesReady)warnings.push('Die frühere Merkliste ist gerade nicht erreichbar. Ihre Inhalte bleiben gespeichert.');
  return warnings.map(x=>`<p class="notice">${e(x)}</p>`).join('');
 }
 function indexRow(row:KnownActivity|StockItem|SavedIdea){
  const sub='kind'in row&&placeOnlyKind(row.kind)?activitySettings.find(([k])=>k===row.setting)?.[1]:'minutes'in row?timeLabel(row.minutes):row.category;
  return `<button type="button" class="index-item" data-action="select" data-id="${e(row.id)}" aria-pressed="${row.id===selected}">${icon('kind'in row?kindLabel(stockKind(row)):row.title)}<span><strong>${e(row.title)}</strong><small>${e(sub)}${'unavailable'in row&&row.unavailable?' · Pausiert':''}${'favorite'in row&&row.favorite?' · ★':''}</small></span><span aria-hidden="true">›</span></button>`;
 }
 function placeRow(p:StockItem){return `<button type="button" class="place-row" data-action="open-place" data-id="${e(p.id)}">${icon(kindLabel(stockKind(p)))}<span><strong>${e(p.title)}</strong><small>${e(placeProperties(p).join(' · '))}</small></span><span aria-hidden="true">↗</span></button>`;}
 function details(){
  const row=selection();if(!row)return `<div class="empty-detail"><h2>${store.state?'Platz für deine Ideen.':'Deine Sammlung wird geladen.'}</h2><p class="muted">${store.state?'Ergänze einen Eintrag oder wähle einen anderen Bereich.':'Deine gespeicherten Inhalte bleiben erhalten.'}</p></div>`;
  if(view==='places'&&group==='archive'){const f=row as SavedIdea;return `<p class="eyebrow">Aus deiner bisherigen Merkliste · ${e(f.category)}</p><h2>${e(f.title)}</h2><p class="description">${e(f.description)}</p>${f.day?`<p>Gespeicherte Terminangabe: ${e(f.day)}</p>`:''}${link(f.url)}<p class="muted">Gespeicherter Fund. Keine erneute Recherche oder aktuelle Verfügbarkeitsprüfung.</p>`;}
  const toolbar=`<div class="detail-top"><span class="detail-icon">${icon(row.title)}</span><div>${action('favorite',('favorite'in row&&row.favorite)?'★ Favorit':'☆ Merken',`aria-pressed="${'favorite'in row&&!!row.favorite}"`)}${action('edit','Bearbeiten')}</div></div>`;
  if(view==='ideas'){const a=row as KnownActivity;const linked=linkedPlaces(a,visiblePlaces());return `${toolbar}<p class="eyebrow">${e(activityCategories.find(([k])=>k===categoryOf(a))?.[1])}</p><h2>${e(a.title)}</h2>${meta(ideaProperties(a))}${a.next?`<p class="description">${e(a.next)}</p>`:''}<div class="detail-section"><h3>Passende Orte & Touren <span>${linked.length}</span></h3>${action('add-linked','+ Ergänzen')}</div>${linked.map(placeRow).join('')||'<p class="empty">Noch kein Ziel hinterlegt. Diese Idee funktioniert auch ohne gespeicherten Ort.</p>'}<p class="detail-note">Die Idee bleibt allgemein. Deine konkreten Ziele stehen hier.</p>`;}
  const p=row as StockItem;return `${toolbar}<p class="eyebrow">${e(kindLabel(stockKind(p)))}</p><h2>${e(p.title)}</h2>${meta(placeProperties(p))}${meta(['Energie '+(energies.find(([k])=>k===p.energy)?.[1]||p.energy),efforts.find(([k])=>k===p.effort)?.[1]||p.effort])}${p.address?`<p>${e(p.address)}</p>`:''}<p class="description">${e(p.note)}</p>${link(p.url)}${p.unavailable?'<p class="notice">Als geschlossen oder vorerst nicht verfügbar gespeichert. Wird von der Auswahlhilfe ausgelassen.</p>':''}<div class="detail-section"><h3>Passende Freizeitideen</h3></div>${routines().filter(a=>linkedPlaces(a,[p]).length).map(a=>action('open-idea',e(a.title),`data-id="${e(a.id)}" class="linked-idea"`)).join('')||'<p class="muted">Im Bearbeiten-Dialog kannst du eine Freizeitidee verknüpfen.</p>'}${sourceDetails(p)}<p class="detail-note">Persönliche Sammlung. Angaben sind gespeichert, aktuelle Öffnung und Bedingungen nicht automatisch geprüft.</p>`;
 }
 function link(url:string){const safe=safeLink(url);return safe?`<a class="source-link" href="${e(safe)}" target="_blank" rel="noopener noreferrer">Link öffnen ↗</a>`:'';}
 function sourceDetails(p:StockItem){return p.sourceDetails?.length?`<details class="source-details"><summary>Übernommene Angaben ansehen</summary>${p.sourceDetails.map(s=>`<p class="description">${e([s.description,s.why,s.conditionsStatus].filter(x=>typeof x==='string').join('\n\n'))}</p>${Array.isArray(s.meta)?meta(s.meta.filter((x):x is string=>typeof x==='string')):''}${typeof s.url==='string'?link(s.url):''}`).join('')}</details>`:'';}
 function guide(){const picks=chooseActivities(routines(),answers);return `<details class="choice-helper" ${guideOpen?'open':''}><summary>Noch unentschlossen? <span>Eine kleine Auswahlhilfe, wenn du magst.</span></summary><div class="choice-fields">${select('need','Was könnte dir guttun?',[['unknown','Weiß ich nicht'],['rest','Etwas Ruhiges'],['move','Bewegung'],['change','Etwas erleben']],answers.need)}${select('minutes','Wie viel Zeit?',[['','Egal / weiß ich nicht'],['60','Bis 1 Stunde'],['180','Bis 3 Stunden'],['1440','Ganzer Tag']],answers.minutes===null?'':String(answers.minutes))}${select('energy','Wie viel Energie?',[['unknown','Weiß ich nicht'],...energies],answers.energy)}${select('place','Drinnen oder draußen?',[['unknown','Egal / weiß ich nicht'],['inside','Drinnen'],['outside','Draußen']],answers.place)}${select('effort','Wie viel Organisation?',[['unknown','Weiß ich nicht'],...efforts],answers.effort)}</div><div class="choice-result" aria-live="polite">${picks.length?picks.map((a,i)=>`<div><small>${i?'Eine Alternative':'Ein guter Anfang'}</small>${action('open-idea',e(a.title),`data-id="${e(a.id)}"`)}<span>${e(ideaProperties(a).join(' · '))}</span></div>`).join(''):'Keine passende Idee in deiner Sammlung. Du kannst eine Antwort lockern.'}<p>Richtwerte aus deiner Sammlung · keine Kalenderprüfung.</p></div></details>`;}
 function form(){
  const ed=editor!;const original=ed.original;
  const get=(k:string,fallback:unknown='')=>ed.values?.[k]??(original as unknown as Record<string,unknown>|undefined)?.[k]??fallback;
  const idea=ed.kind==='idea',a=idea?original as KnownActivity|undefined:undefined,p=idea?undefined:original as StockItem|undefined;
  const formKinds:readonly (readonly [string,string])[]=p&&!collectionKinds.some(([k])=>k===p.kind)?[...collectionKinds,[p.kind,kindLabel(stockKind(p))+' (bisherige Einordnung)']]:collectionKinds;
  const category=ed.values?.activityCategory??(a?categoryOf(a):group);
  const setting=ed.values?.setting??(a&&idea?settingOf(a):get('setting','outside') as string);
  return `<div class="form-title"><h2>${idea?'Freizeitidee':'Ort / Tour'} ${original?'bearbeiten':'ergänzen'}</h2>${action('cancel','Schließen')}</div><form id="ideaEditor">${input('title','Name',get('title'),'text','required maxlength="200"')}${idea?select('activityCategory','Bereich',activityCategories,category)+input('minutes','Richtdauer in Minuten',get('minutes',45),'number','required min="5" max="1440" step="1"'):select('kind','Sammlungsbereich',formKinds,String(get('kind','walk')))+input('url','Original-, Maps- oder Tourenlink',get('url'),'url','maxlength="2000"')+input('address','Adresse / Startpunkt',get('address'),'text','maxlength="500"')+'<details class="tour-fields" '+(placeOnlyKind(String(get('kind','walk')))?'':'open')+'><summary>Dauer & Strecke (für Touren)</summary><div class="form-pair">'+input('minutes','Dauer in Minuten (optional)',get('minutes'),'number','min="5" max="1440" step="1"')+input('distanceKm','Strecke in km (optional)',get('distanceKm'),'number','min="0" max="1000" step="any"')+'</div>'+input('elevationM','Höhenmeter (optional)',get('elevationM'),'number','min="0" max="10000" step="any"')+'</details>'}${select('setting','Drinnen / draußen',activitySettings,String(setting))}<div class="form-pair">${select('energy','Benötigte Energie',energies,String(get('energy','low')))}${select('effort','Planungsaufwand',efforts,String(get('effort','spontaneous')))}</div>${idea?`<label>Eigene Notiz / Vorbereitung<textarea name="next" maxlength="500" rows="3">${e(get('next'))}</textarea></label>`:`<label>Eigene Notiz<textarea name="note" maxlength="2000" rows="4">${e(get('note'))}</textarea></label><details class="linked-checkboxes"><summary>Mit Freizeitideen verknüpfen (optional)</summary><p>Ohne Auswahl erfolgt die Zuordnung über den Sammlungsbereich.</p>${routines().map(r=>`<label><input type="checkbox" name="linkedRoutineIds" value="${e(r.id)}" ${(p?.linkedRoutineIds??(ed.linkedTo?[ed.linkedTo]:[])).includes(r.id)?'checked':''}> ${e(r.title)}</label>`).join('')}</details><label class="check-label"><input type="checkbox" name="unavailable" ${p?.unavailable?'checked':''}> Geschlossen / vorerst nicht vorschlagen</label>`}<p class="editor-status" role="status" aria-live="polite"></p><div class="form-actions"><button class="primary" type="submit" ${store.saving||ed.blocked||store.uncertain?'disabled':''}>${store.saving?'Wird gespeichert …':'Speichern'}</button>${action('cancel','Abbrechen')}${original?action('remove',idea?'Idee löschen':'Ort / Tour löschen','class="danger"'):''}${ed.blocked||store.uncertain?action('reload','Aktuellen Stand laden'):''}</div></form>`;
 }
 function openEditor(kind:'idea'|'place',id='',linkedTo?:string){
  const original=(kind==='idea'?routines():places()).find(x=>x.id===id);
  editor={kind,id:id||crypto.randomUUID(),original:original?structuredClone(original):undefined,linkedTo};
  if(!original){const a=routines().find(x=>x.id===linkedTo);if(a&&kindForActivity(a))editor.linkedTo=undefined;editor.values=kind==='place'?{kind:a?kindForActivity(a)||'other':group==='archive'?'other':group,setting:a?settingOf(a):'outside'}:undefined;}
  render();root.querySelector<HTMLInputElement>('#ideaEditor input')?.focus();
 }
 async function saveEditor(form:HTMLFormElement){
  if(!editor||store.saving)return;
  const ed=editor,d=new FormData(form),str=(key:string)=>String(d.get(key)??'').trim(),number=(key:string)=>str(key)===''?null:Number(d.get(key));
  ed.values=Object.fromEntries([...d].filter(([k])=>k!=='linkedRoutineIds').map(([k,v])=>[k,String(v)]));
  const old=ed.original;
  const row=ed.kind==='idea'?{...old,id:ed.id,title:str('title'),minutes:number('minutes'),energy:str('energy'),effort:str('effort'),setting:str('setting'),outdoor:str('setting')!=='inside',activityCategory:str('activityCategory'),mood:legacyMood(str('activityCategory') as ActivityCategory),next:str('next')}: {travelMinutes:null,...old,id:ed.id,title:str('title'),kind:str('kind'),url:str('url'),address:str('address'),minutes:number('minutes'),distanceKm:number('distanceKm'),elevationM:number('elevationM'),energy:str('energy'),effort:str('effort'),setting:str('setting'),note:str('note'),unavailable:d.has('unavailable'),linkedRoutineIds:d.getAll('linkedRoutineIds').map(String)};
  const feedback=form.querySelector<HTMLElement>('.editor-status')!;
  const controls=form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('input,select,textarea,button');controls.forEach(c=>c.disabled=true);feedback.textContent='Wird gespeichert …';
  try{const result=await store.save(state=>{if(ed.kind==='idea'){const list=state.routines??[];const index=list.findIndex(x=>x.id===ed.id);if(index>=0)list[index]=row as KnownActivity;else list.push(row as KnownActivity);state.routines=list;}else{const list=state.activityStock??[];const index=list.findIndex(x=>x.id===ed.id);if(index>=0)list[index]=row as StockItem;else list.push(row as StockItem);state.activityStock=list;}});
   if(result==='conflict'){ed.blocked=true;status='Auf einem anderen Gerät wurde die Sammlung geändert. Deine Eingaben stehen noch im Formular. Bitte schließe es und öffne den aktuellen Eintrag erneut.';controls.forEach(c=>c.disabled=false);form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=true;feedback.textContent=status;return;}
   view=ed.kind==='idea'?'ideas':'places';group=ed.kind==='idea'?categoryOf(row as KnownActivity):stockKind(row as StockItem);selected=ed.id;editor=null;query='';status='Gespeichert. Auf allen Geräten verfügbar.';render();
  }catch(error){feedback.textContent=(error as Error).message;controls.forEach(c=>c.disabled=false);if(store.uncertain){form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=true;feedback.append(' Über „Neu laden“ unten kannst du den bestätigten Stand laden.');}}
 }
 function wireForm(){root.querySelector<HTMLFormElement>('#ideaEditor')?.addEventListener('submit',ev=>{ev.preventDefault();void saveEditor(ev.currentTarget as HTMLFormElement);});}
 async function load(){if(loading||store.saving)return;if(editor&&!confirm('Formular schließen und gespeicherten Stand neu laden? Nicht gespeicherte Eingaben gehen verloren.'))return;editor=null;loading=true;status='Sammlung wird geladen …';render();try{await store.load();status='';}catch(err){status=(err as Error).message;}finally{loading=false;render();}}
 function canLeave(){return !editor||!store.saving&&confirm('Bearbeitung ohne Speichern schließen?');}
 root.addEventListener('change',ev=>{const target=ev.target as HTMLInputElement|HTMLSelectElement;
  if(target.id==='collectionGroup'){if(!canLeave()){target.value=group;return;}editor=null;group=target.value;selected='';render();}
  else if(target.id==='favoriteFilter'){const checkbox=target as HTMLInputElement;if(!canLeave()){checkbox.checked=onlyFavorites;return;}editor=null;onlyFavorites=checkbox.checked;render();}
  else if(target.closest('.choice-fields')){const key=target.name as keyof GuideAnswers;answers={...answers,[key]:key==='minutes'?(target.value?Number(target.value):null):target.value};guideOpen=true;render();root.querySelector<HTMLSelectElement>('.choice-fields [name="'+key+'"]')?.focus();}
 });
 root.addEventListener('input',ev=>{const target=ev.target as HTMLInputElement;if(target.id!=='collectionSearch'||editor)return;const start=target.selectionStart;query=target.value;render();const search=root.querySelector<HTMLInputElement>('#collectionSearch')!;search.focus();if(start!==null)search.setSelectionRange(start,start);});
 root.addEventListener('toggle',ev=>{if((ev.target as Element).classList.contains('choice-helper'))guideOpen=(ev.target as HTMLDetailsElement).open;},true);
 root.addEventListener('click',ev=>{const b=(ev.target as Element).closest<HTMLButtonElement>('[data-action]');if(!b||b.disabled)return;const name=b.dataset.action,id=b.dataset.id||'';
  if(name==='reload'){void load();return;}
  if(name==='toggle-list'){listOpen=!listOpen;render();return;}
  if(name==='backup'){if(!store.state)return;const url=URL.createObjectURL(new Blob([JSON.stringify(store.state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='freizeitideen-sicherung.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  if(store.saving)return;
  if(['ideas','places','select','open-place','open-idea','add','add-linked','edit','cancel'].includes(name||'')&&!canLeave())return;
  if(name==='ideas'||name==='places'){editor=null;view=name;group=view==='ideas'?'movement':'bike';query='';selected='';history.replaceState(null,'',view==='ideas'?'#ideen':'#orte');render();}
  else if(name==='select'){editor=null;selected=id;listOpen=false;render();}
  else if(name==='open-place'||name==='open-idea'){editor=null;view=name==='open-place'?'places':'ideas';selected=id;group=view==='ideas'?categoryOf(routines().find(a=>a.id===id)!):stockKind(places().find(p=>p.id===id)!);query='';onlyFavorites=false;render();}
  else if(name==='add'&&store.state)openEditor(view==='ideas'?'idea':'place');
  else if(name==='add-linked')openEditor('place','',selected);
  else if(name==='edit')openEditor(view==='ideas'?'idea':'place',selected);
  else if(name==='cancel'){editor=null;render();}
  else if(name==='favorite'&&store.state){void updateFavorite();}
  else if(name==='remove'&&editor){void remove();}
 });
 async function updateFavorite(){const id=selected,currentView=view;try{const result=await store.save(state=>{const row=(currentView==='ideas'?state.routines:state.activityStock)?.find(x=>x.id===id);if(row)row.favorite=!row.favorite;});status=result==='saved'?'Favorit gespeichert.':'Sammlung wurde auf einem anderen Gerät geändert. Bitte erneut wählen.';}catch(err){status=(err as Error).message;}render();}
 async function remove(){const ed=editor!;if(!confirm('Diesen Eintrag aus deiner Sammlung löschen? Bereits geplante Vorhaben, Quellen und frühere Bewertungen bleiben erhalten.'))return;try{const result=await store.save(state=>{if(ed.kind==='idea')state.routines=state.routines?.filter(x=>x.id!==ed.id);else state.activityStock=state.activityStock?.filter(x=>x.id!==ed.id);});if(result==='saved'){editor=null;status='Eintrag entfernt.';}else{ed.blocked=true;status='Sammlung wurde inzwischen geändert. Bitte den aktuellen Eintrag erneut öffnen.';}}catch(err){status=(err as Error).message;}render();}
 compact.addEventListener('change',()=>{if(!editor)render();});
 window.addEventListener('beforeunload',ev=>{if(editor||store.saving){ev.preventDefault();}});
 render();void load();
}
