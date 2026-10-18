import {advanceBookingReason,type AdvanceBooking,type TicketPrice} from './event-planning.ts';
import {eventSection} from './finder-navigation.ts';
export type CollectionItem={ticketPrice?:TicketPrice;bookingDeadline?:string|null;advanceBooking?:AdvanceBooking;title:string;location?:string;category?:string;date?:string;time?:string;fitScore?:number;favorite?:{id:string};id?:string;verifiedAt?:string;imported?:boolean;closed?:boolean|null};
export function upcomingEvents<T extends CollectionItem>(items:T[],today:string,hidden:Set<string>):T[]{
 const max=new Date(today+'T12:00:00Z');max.setUTCDate(max.getUTCDate()+90);const last=max.toISOString().slice(0,10);
 const seen=new Set<string>();
 return [...items].filter(x=>x.closed!==true&&x.date&&x.date>=today&&x.date<=last&&!hidden.has(x.id||x.favorite?.id||'')).sort((a,b)=>(b.fitScore||0)-(a.fitScore||0)||(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')).filter(x=>{const key=[x.title.trim().replace(/\s+/g,' ').toLocaleLowerCase('de'),x.date,x.time||''].join('|');if(seen.has(key))return false;seen.add(key);return true;});
}
/** Ranked independently of the list's period filter; unknown taste is never a top pick. */
export function topTasteEvents<T extends CollectionItem>(items:T[],today:string,hidden:Set<string>):T[]{
 const groups=new Set<string>();
 return upcomingEvents(items.filter(x=>!x.imported&&Number.isFinite(x.fitScore)&&x.fitScore!>=0&&x.fitScore!<=100),today,hidden).filter(x=>{
  const key=[x.title,x.location||''].map(v=>v.normalize('NFKC').toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu,' ').trim()).join('|');
  if(groups.has(key))return false;groups.add(key);return true;
 }).slice(0,3);
}
export function eventInPeriod(date:string,today:string,period:string){
 const sunday=new Date(today+'T12:00:00Z');sunday.setUTCDate(sunday.getUTCDate()+(7-sunday.getUTCDay())%7);
 const weekEnd=sunday.toISOString().slice(0,10);const friday=new Date(sunday);friday.setUTCDate(friday.getUTCDate()-2);
 const month=new Date(today+'T12:00:00Z');month.setUTCDate(month.getUTCDate()+30);
 const horizon=new Date(today+'T12:00:00Z');horizon.setUTCDate(horizon.getUTCDate()+90);
 return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=today&&date<=horizon.toISOString().slice(0,10)&&(period==='today'?date===today:period==='week'?date<=weekEnd:period==='weekend'?date>=friday.toISOString().slice(0,10)&&date<=weekEnd:period==='month'?date<=month.toISOString().slice(0,10):true);
}
export type EventSort='date'|'fit';
export function eventView<T extends CollectionItem & {saved?:boolean}>(items:T[],today:string,period='all',sort:EventSort='date',savedOnly=false,section?:'music'|'events'){
 const visible=upcomingEvents(items.filter(x=>!section||eventSection(x)===section),today,new Set()).filter(x=>eventInPeriod(x.date||'',today,period)&&(!savedOnly||x.saved));
 const highlights=topTasteEvents(visible,today,new Set()),top=new Set(highlights);
 const score=(x:T)=>!x.imported&&Number.isFinite(x.fitScore)?x.fitScore!:-1;
 const byDate=(a:T,b:T)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')||a.title.localeCompare(b.title,'de');
 const others=visible.filter(x=>!top.has(x)).sort((a,b)=>sort==='fit'?score(b)-score(a)||byDate(a,b):byDate(a,b)||score(b)-score(a));
 return {highlights,others};
}
/** Current calendar week, then only later events with concrete booking evidence. */
export function weeklyBookingView<T extends CollectionItem & {saved?:boolean}>(items:T[],today:string,sort:EventSort='date',savedOnly=false,section?:'music'|'events'){
 const byDate=(a:T,b:T)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')||a.title.localeCompare(b.title,'de');
 const rank=(a:T,b:T)=>sort==='fit'?(b.fitScore??-1)-(a.fitScore??-1)||byDate(a,b):byDate(a,b);
 const visible=upcomingEvents(items.filter(x=>(!section||eventSection(x)===section)&&(!savedOnly||x.saved)),today,new Set());
 const highlights=visible.filter(x=>eventInPeriod(x.date||'',today,'week')).sort(rank);
 const others=visible.filter(x=>!eventInPeriod(x.date||'',today,'week')&&!!advanceBookingReason(x,today)).sort(rank);
 return {highlights,others};
}
export function catalogueFitLabel(item:CollectionItem){
 return !item.imported&&Number.isFinite(item.fitScore)?`${Math.round(item.fitScore!)} / 100 · passt grundsätzlich`:'Passung noch nicht bewertet';
}
export type CollectionSourceCheck={id:string;status:string;checkedAt:string;attemptedAt?:string;error?:string;directError?:string;nextAttemptAt?:string;method?:string;lastSuccessfulFetchAt?:string;pendingUrls?:string[];sourceFailures?:{url:string;error:string}[];details?:{returned:number;accepted:number;attempted?:number}};
export function collectionSourceStates(sources:{id:string;hours:number}[],checks:CollectionSourceCheck[],now=Date.now()){
 return sources.map(source=>{
  const check=checks.find(c=>c.id===source.id),age=now-Date.parse(check?.checkedAt||'');
  const partialMessage=/^(?:partial|Teilabdeckung)\s*:/i.test(check?.error||'');
  const partial=!!check&&(partialMessage||check.error==='catalog_source_in_progress'||check.error==='catalog_listing_pagination'||!check.error&&!!check.pendingUrls?.length);
  const state=!check?'missing':partial?'partial':check.status!=='checked'?'failed':!Number.isFinite(age)||age < -60000||age>source.hours*3600000?'stale':'checked';
  const labels={missing:'noch nicht geprüft',failed:'Prüfung fehlgeschlagen',stale:'Prüfung veraltet',checked:'geprüft',partial:'Prüfung unvollständig'};
  const directReasons:Record<string,string>={catalog_source_in_progress:'Weitere Detailseiten stehen noch aus',catalog_attempt_started:'Abruf begonnen; noch kein Ergebnis',catalog_event_fields_missing:'Datum, Beginn oder Spielort fehlen',catalog_listing_unrecognized:'Programmstruktur nicht erkannt',catalog_listing_pagination:'Weitere Programmseiten noch ungeprüft',catalog_direct_timeout:'Originalseite antwortet nicht rechtzeitig',catalog_direct_robots_unavailable:'Zugriffsregeln nicht abrufbar',catalog_direct_access_restricted:'Quellenzugriff beschränkt',catalog_detail_redirect_unresolved:'Weiterleitung liefert keine eindeutige Eventseite',catalog_direct_unsafe_url:'Weiterleitung außerhalb der erlaubten Originalquelle'};
  const reason=(partialMessage?check!.error!.replace(/^(?:partial|Teilabdeckung)\s*:\s*/i,'').trim():'')||directReasons[check?.error||'']||(check?.error?.startsWith('research_budget_')?'Bezahlte Recherche pausiert (Freizeitbudget)':check?.error==='catalog_fallback_paused'?'KI-Ersatzprüfung begrenzt':check?.error==='catalog_direct_unchanged_unresolved'?'Quelle unverändert; Angaben weiterhin ungeklärt':check?.directError==='catalog_direct_access_restricted'?'Quellenzugriff beschränkt':check?.error?.startsWith('catalog_direct_http_')?'Originalseite meldet HTTP '+check.error.slice('catalog_direct_http_'.length):'');
  return {id:source.id,state,label:(check?.error==='catalog_source_in_progress'?'Prüfung unvollständig':labels[state])+(reason?' · '+reason:'')+(state==='failed'&&check?.nextAttemptAt?' · erneuter Versuch frühestens '+check.nextAttemptAt.slice(0,10):''),checkedAt:check?.checkedAt||'',attemptedAt:check?.attemptedAt||'',lastSuccessfulFetchAt:check?.lastSuccessfulFetchAt||'',accepted:check?.details?.accepted??null,returned:check?.details?.returned??null,attempted:check?.details?.attempted??null,pending:check?.pendingUrls?.length??0};
 });
}


export function researchTime(value:string){
 const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}).format(date)+' (Berlin)':'unbekannt';
}


