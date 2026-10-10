export type CollectionItem={title:string;date?:string;time?:string;fitScore?:number;favorite?:{id:string};id?:string;verifiedAt?:string;imported?:boolean;closed?:boolean|null};
export function upcomingEvents<T extends CollectionItem>(items:T[],today:string,hidden:Set<string>):T[]{
 const max=new Date(today+'T12:00:00Z');max.setUTCDate(max.getUTCDate()+90);const last=max.toISOString().slice(0,10);
 const seen=new Set<string>();
 return [...items].filter(x=>x.closed!==true&&x.date&&x.date>=today&&x.date<=last&&!hidden.has(x.id||x.favorite?.id||'')).sort((a,b)=>(b.fitScore||0)-(a.fitScore||0)||(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')).filter(x=>{const key=[x.title.trim().replace(/\s+/g,' ').toLocaleLowerCase('de'),x.date,x.time||''].join('|');if(seen.has(key))return false;seen.add(key);return true;});
}
export function eventInPeriod(date:string,today:string,period:string){
 const sunday=new Date(today+'T12:00:00Z');sunday.setUTCDate(sunday.getUTCDate()+(7-sunday.getUTCDay())%7);
 const weekEnd=sunday.toISOString().slice(0,10);const friday=new Date(sunday);friday.setUTCDate(friday.getUTCDate()-2);
 const month=new Date(today+'T12:00:00Z');month.setUTCDate(month.getUTCDate()+30);
 return date>=today&&(period==='today'?date===today:period==='week'?date<=weekEnd:period==='weekend'?date>=friday.toISOString().slice(0,10)&&date<=weekEnd:period==='month'?date<=month.toISOString().slice(0,10):true);
}
export function catalogueFitLabel(item:CollectionItem){
 return !item.imported&&Number.isFinite(item.fitScore)?`${Math.round(item.fitScore!)} / 100 · passt grundsätzlich`:'Passung noch nicht bewertet';
}
export type CollectionSourceCheck={id:string;status:string;checkedAt:string;attemptedAt?:string;error?:string;directError?:string;nextAttemptAt?:string;method?:string;lastSuccessfulFetchAt?:string;details?:{returned:number;accepted:number;attempted?:number}};
export function collectionSourceStates(sources:{id:string;hours:number}[],checks:CollectionSourceCheck[],now=Date.now()){
 return sources.map(source=>{
  const check=checks.find(c=>c.id===source.id),age=now-Date.parse(check?.checkedAt||'');
  const state=!check?'missing':check.status!=='checked'?'failed':!Number.isFinite(age)||age < -60000||age>source.hours*3600000?'stale':'checked';
  const labels={missing:'noch nicht geprüft',failed:'Prüfung fehlgeschlagen',stale:'Prüfung veraltet',checked:'geprüft'};
  const directReasons:Record<string,string>={catalog_source_in_progress:'Weitere Detailseiten stehen noch aus',catalog_attempt_started:'Abruf begonnen; noch kein Ergebnis',catalog_event_fields_missing:'Datum, Beginn oder Spielort fehlen',catalog_listing_unrecognized:'Programmstruktur nicht erkannt',catalog_listing_pagination:'Weitere Programmseiten noch ungeprüft',catalog_direct_timeout:'Originalseite antwortet nicht rechtzeitig',catalog_direct_robots_unavailable:'Zugriffsregeln nicht abrufbar',catalog_direct_access_restricted:'Quellenzugriff beschränkt',catalog_detail_redirect_unresolved:'Weiterleitung liefert keine eindeutige Eventseite',catalog_direct_unsafe_url:'Weiterleitung außerhalb der erlaubten Originalquelle'};
  const reason=directReasons[check?.error||'']||(check?.error?.startsWith('research_budget_')?'Bezahlte Recherche pausiert (Freizeitbudget)':check?.error==='catalog_fallback_paused'?'KI-Ersatzprüfung begrenzt':check?.error==='catalog_direct_unchanged_unresolved'?'Quelle unverändert; Angaben weiterhin ungeklärt':check?.directError==='catalog_direct_access_restricted'?'Quellenzugriff beschränkt':check?.error?.startsWith('catalog_direct_http_')?'Originalseite meldet HTTP '+check.error.slice('catalog_direct_http_'.length):'');
  return {id:source.id,state,label:(check?.error==='catalog_source_in_progress'?'Prüfung unvollständig':labels[state])+(reason?' · '+reason:'')+(state==='failed'&&check?.nextAttemptAt?' · erneuter Versuch frühestens '+check.nextAttemptAt.slice(0,10):''),checkedAt:check?.checkedAt||'',attemptedAt:check?.attemptedAt||'',lastSuccessfulFetchAt:check?.lastSuccessfulFetchAt||'',accepted:check?.details?.accepted??null};
 });
}

