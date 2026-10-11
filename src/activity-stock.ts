import {categoryOf,matchesSetting, type ActivitySetting} from './activity-properties.ts';
import type {KnownActivity} from './known-activities';
import type {GuideAnswers} from './activity-guide';

export const stockKinds = [['bike','Fahrradtouren'],['hike','Wanderungen'],['walk','Spaziergang'],['swim','Schwimmen'],['cafe','Café'],['restaurant','Restaurant'],['beer-garden','Biergarten']] as const;
export type StockKind = typeof stockKinds[number][0] | 'bike-short' | 'bike-long' | 'hike-short' | 'hike-long';
export const normalizedStockKind=(kind:StockKind)=>kind.startsWith('bike')?'bike':kind.startsWith('hike')?'hike':kind;
export const placeOnlyKind=(kind:string)=>['swim','cafe','restaurant','beer-garden'].includes(kind);
// User-provided source lists, not imported or verified places. No automatic fetch.
export const stockLists:Partial<Record<StockKind,string>>={restaurant:'https://maps.app.goo.gl/WfdLtvt9Mdo6UJor5',swim:'https://maps.app.goo.gl/8e3gtYTg9j1BvQw98',cafe:'https://maps.app.goo.gl/MFDfsD7oW6aF68Yy6','beer-garden':'https://maps.app.goo.gl/S9TPz1PT38783Roq8'};
export type StockItem = {id:string;title:string;kind:StockKind;url:string;minutes:number|null;travelMinutes:number|null;distanceKm:number|null;elevationM:number|null;setting:ActivitySetting;energy:string;effort:string;note:string;sourceId?:string;unavailable?:boolean;favorite?:boolean;rating?:number;sourceDetails?:Record<string,unknown>[];importedSourceIds?:string[]};
export type StockFavorite = {suggestionId:string;title:string;category:string;description:string;url:string};
export type StockDecisions = {ready:boolean;hidden:ReadonlySet<string>;ratings:ReadonlyMap<string,number>};
const bounded=(v:unknown,max:number)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
export const safeStockUrl=(s:string)=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function validStockItem(v:unknown):v is StockItem {
 if(!v||typeof v!=='object')return false;const a=v as StockItem;
 return typeof a.id==='string'&&a.id.length>0&&a.id.length<=100&&typeof a.title==='string'&&a.title.trim().length>0&&a.title.length<=200
  && (stockKinds.some(([id])=>id===a.kind)||['bike-short','bike-long','hike-short','hike-long'].includes(a.kind))&&typeof a.url==='string'&&a.url.length<=2000&&(!a.url||!!safeStockUrl(a.url))
  && bounded(a.minutes,1440)&&(a.minutes===null||Number.isInteger(a.minutes)&&a.minutes>=5)&&bounded(a.travelMinutes,1440)&&(a.travelMinutes===null||Number.isInteger(a.travelMinutes))
  && bounded(a.distanceKm,1000)&&bounded(a.elevationM,10000)&&['inside','outside','both'].includes(a.setting)&&['low','medium','high'].includes(a.energy)&&['spontaneous','prepare','trip'].includes(a.effort)
  && (a.unavailable===undefined||typeof a.unavailable==='boolean') && (a.favorite===undefined||typeof a.favorite==='boolean') && (a.rating===undefined||Number.isInteger(a.rating)&&a.rating>=1&&a.rating<=5)
  && typeof a.note==='string'&&a.note.length<=2000&&(a.sourceId===undefined||typeof a.sourceId==='string'&&a.sourceId.length<=200);
}
export function withStockRating(row:StockItem,rating:number):StockItem {
 if(!Number.isInteger(rating)||rating<0||rating>5)throw new Error('Invalid rating');
 const next={...row};if(rating===0)delete next.rating;else next.rating=rating;return next;
}
const personalPreference=(x:StockItem)=>(x.rating??3)-3;
const stockMinutes=(x:StockItem,a:KnownActivity)=>['swim','cafe','restaurant','beer-garden'].includes(x.kind)?a.minutes:x.minutes;
export function kindForActivity(a:KnownActivity):StockKind|null {
 if(categoryOf(a)==='movement'){
  if(/schwimm/i.test(a.title))return 'swim';
  if(/rad|fahrrad/i.test(a.title))return 'bike';
  if(/wander/i.test(a.title))return 'hike';
  if(/spazier|spazieren|zu fuß|kleine runde/i.test(a.title))return 'walk';
 }
 if(categoryOf(a)==='food'){
  if(/biergarten/i.test(a.title))return 'beer-garden';
  if(/café|cafe|kaffee|kuchen/i.test(a.title))return 'cafe';
  if(/restaurant|essen gehen|essen.*besuch/i.test(a.title))return 'restaurant';
 }
 return null;
}
export function kindForFavorite(a:StockFavorite):StockKind|null {
 const c=a.category.toLocaleLowerCase('de');
 if(/schwimm/.test(c))return 'swim';
 if(/biergarten/.test(c)||/restaurant|gastronomie|essen/.test(c)&&/biergarten/i.test(a.title))return 'beer-garden';
 if(/fahrrad|radtour/.test(c))return 'bike';
 if(/wander/.test(c))return 'hike';
 if(/spazier/.test(c))return 'walk';
 if(/café|cafe/.test(c)||/restaurant|gastronomie|essen/.test(c)&&/café|cafe/i.test(a.title))return 'cafe';
 if(/restaurant|gastronomie|essen/.test(c))return 'restaurant';
 return null;
}
export function draftFromFavorite(a:StockFavorite,id:string):StockItem|null {
 const kind=kindForFavorite(a);if(!kind)return null;
 return {id,title:a.title.slice(0,200),kind,url:safeStockUrl(a.url),minutes:null,travelMinutes:null,distanceKm:null,elevationM:null,setting:['cafe','restaurant'].includes(kind)?'inside':'outside',energy:kind.startsWith('bike')||kind.startsWith('hike')?'medium':'low',effort:'prepare',note:a.description.slice(0,2000),sourceId:a.suggestionId};
}
// Import only explicit metadata. Unknown values remain unknown, no new source check.
export function stockFromSuggestion(a:StockFavorite,id:string,meta:readonly string[]=[],snapshot:Record<string,unknown>|null=null):StockItem|null {
 const row=draftFromFavorite(a,id);if(!row)return null;
 if(snapshot){row.sourceDetails=[JSON.parse(JSON.stringify(snapshot))];row.importedSourceIds=[a.suggestionId];}
 for(const fact of meta){
  const value=(pattern:RegExp)=>{const m=fact.trim().match(pattern);return m?Number(m[1].replace(',','.')):null;};
  const km=value(/^(\d+(?:[.,]\d+)?)\s*km$/i),hm=value(/^(\d+)\s*(?:hm|höhenmeter)$/i),min=value(/^(\d+)\s*(?:min\.?|minuten)$/i),hours=value(/^(\d+(?:[.,]\d+)?)\s*(?:h|stunden?)$/i);
  if(km!==null)row.distanceKm=km;if(hm!==null)row.elevationM=hm;
  if(min!==null)row.minutes=min;else if(hours!==null&&Number.isInteger(hours*60))row.minutes=hours*60;
 }
 row.note=snapshot?'':[row.note,...meta].filter(Boolean).join(' · ').slice(0,2000);
 return validStockItem(row)?row:null;
}
export function existingStockSuggestion(items:readonly StockItem[],a:StockFavorite):StockItem|undefined {
 const normalize=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
 return items.find(x=>x.sourceId===a.suggestionId||x.importedSourceIds?.includes(a.suggestionId)||normalize(x.title)===normalize(a.title));
}
export function usableStock(items:readonly StockItem[],decisions:StockDecisions,includeUnavailable=false):StockItem[]{
 return items.filter(a=>(includeUnavailable||!a.unavailable)&&(!a.sourceId||decisions.ready&&!decisions.hidden.has(a.sourceId)&&(decisions.ratings.get(a.sourceId)??0)>=0));
}
export function matchingStock(a:KnownActivity,items:readonly StockItem[],answers:GuideAnswers,decisions:StockDecisions):StockItem[]{
 const kind=kindForActivity(a);if(!kind)return [];
 return usableStock(items,decisions).filter(x=>normalizedStockKind(x.kind)===kind&&stockMinutes(x,a)!==null
  && (answers.minutes===null||stockMinutes(x,a)!<=answers.minutes)
  && matchesSetting({...a,setting:x.setting,outdoor:x.setting!=='inside'},answers.place)
  && (answers.need!=='rest'||x.energy==='low'&&x.effort==='spontaneous')
  && (answers.energy!=='low'||x.energy==='low')&&(answers.energy!=='medium'||x.energy!=='high')
  && (answers.effort!=='spontaneous'||x.effort==='spontaneous')&&(answers.effort!=='prepare'||x.effort!=='trip'))
  .sort((x,y)=>(personalPreference(y)-personalPreference(x))*10+(Number(y.energy===answers.energy)-Number(x.energy===answers.energy))*10+(decisions.ratings.get(y.sourceId||'')??0)-(decisions.ratings.get(x.sourceId||'')??0)||x.minutes!-y.minutes!||x.id.localeCompare(y.id)).slice(0,1);
}

// Private in-memory bridge, never sent to the public catalogue or a research provider.
let favorites:StockFavorite[]=[];
let decisions:StockDecisions={ready:false,hidden:new Set(),ratings:new Map()};
export const stockSources=()=>({favorites,decisions});
const notify=()=>{if(typeof document!=='undefined')document.dispatchEvent(new Event('activity-stock-sources'));};
export function publishStockFavorites(value:StockFavorite[]){favorites=value.map(x=>({...x}));notify();}
export function publishStockDecisions(hidden:Set<string>,ratings:Map<string,number>,ready:boolean){decisions={ready,hidden:new Set(hidden),ratings:new Map(ratings)};notify();}
export function blockStockSource(id:string){decisions={...decisions,hidden:new Set([...decisions.hidden,id])};notify();}
export function publishStockRatings(ratings:Map<string,number>){decisions={...decisions,ratings:new Map(ratings)};notify();}

const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const importedDetailsMarkup=(row:StockItem)=> (row.sourceDetails??[]).map(source=>{
 const strings=(keys:string[])=>keys.map(key=>typeof source[key]==='string'?source[key] as string:'').filter(Boolean);
 const meta=Array.isArray(source.meta)?source.meta.filter((x):x is string=>typeof x==='string'):[];
 const url=typeof source.url==='string'?safeStockUrl(source.url):source.favorite&&typeof source.favorite==='object'&&typeof (source.favorite as Record<string,unknown>).url==='string'?safeStockUrl((source.favorite as Record<string,unknown>).url as string):'';
 return `<section class="stock-source-details"><h3>Übernommene Informationen</h3>${strings(['description','place','location','why','conditionsStatus','bookingDeadline','time','date']).map(text=>`<p>${e(text)}</p>`).join('')}${meta.length?`<p>${meta.map(e).join(' · ')}</p>`:''}${url&&url!==safeStockUrl(row.url)?`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">Weitere Originalquelle öffnen</a>`:''}</section>`;
}).join('');
const ratingMarkup=(row:StockItem,disabled:string)=>`<section class="stock-rating" aria-label="Deine Bewertung"><h3>Deine Bewertung</h3><p>${row.rating?`${row.rating} von 5 Sternen`:'Noch nicht bewertet'}</p><div class="stock-rating-buttons" role="group" aria-label="1 bis 5 Sterne">${[1,2,3,4,5].map(n=>`<button type="button" data-stock-action="rate" data-stock-id="${e(row.id)}" data-stock-rating="${n}" aria-label="${n} ${n===1?'Stern':'Sterne'}" aria-pressed="${row.rating===n}" ${disabled}>${n<=(row.rating??0)?'★':'☆'}</button>`).join('')}</div><p class="planner-small">1 = gefällt mir nicht · 3 = okay · 5 = sehr gut</p>${row.rating?`<button type="button" data-stock-action="rate" data-stock-id="${e(row.id)}" data-stock-rating="0" ${disabled}>Bewertung entfernen</button>`:''}<p class="planner-small">Gute Bewertungen werden bei passenden Ideen bevorzugt.</p></section>`;
const choices=(pairs:readonly (readonly [string,string])[],selected:string)=>pairs.map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${label}</option>`).join('');
export function stockMarkup(items:readonly StockItem[],draft:StockItem|null,loaded:boolean,saving:boolean,message:string,viewId:string|null=null,_onlySaved=false):string {
 const {favorites,decisions}=stockSources();const active=usableStock(items,decisions,true);
 const view=items.find(a=>a.id===viewId);
 const disabled=!loaded||saving?'disabled':'';
 const candidates=decisions.ready?favorites.filter(a=>!decisions.hidden.has(a.suggestionId)&&(decisions.ratings.get(a.suggestionId)??0)>=0&&kindForFavorite(a)&&!items.some(x=>x.sourceId===a.suggestionId)):[];
 return `<h2>Orte & Touren</h2><p class="planner-small">Dauerhaft gespeicherte Orte und konkrete Touren.</p><p role="status">${e(message||(!loaded?'Gemeinsamer Vorrat wird geladen …':''))}</p><button type="button" data-stock-action="new" ${disabled}>Tour oder Ort ergänzen</button>
 ${draft?`<dialog id="stockDialog" class="stock-dialog" aria-label="${draft.title?'Ort oder Tour bearbeiten':'Ort oder Tour ergänzen'}"><header><h2>${draft.title?'Bearbeiten':'Ergänzen'}</h2><button type="button" data-stock-action="cancel" aria-label="Fenster schließen">×</button></header><form id="stockForm" class="planner-form"><p class="stock-form-message" role="status"></p><label>Name<input name="title" required maxlength="200" value="${e(draft.title)}"></label><label>Art<select name="kind">${choices(stockKinds,normalizedStockKind(draft.kind))}</select></label><label>Original-Link<input name="url" type="url" maxlength="2000" value="${e(draft.url)}"></label><label data-stock-duration ${placeOnlyKind(draft.kind)?'hidden':''}>Dauer in Minuten<input name="minutes" type="number" min="5" max="1440" value="${draft.minutes??''}" placeholder="Unbekannt"></label><label>Strecke in km<input name="distanceKm" type="number" min="0" max="1000" step="0.1" value="${draft.distanceKm??''}" placeholder="Unbekannt"></label><label>Höhenmeter<input name="elevationM" type="number" min="0" max="10000" value="${draft.elevationM??''}" placeholder="Unbekannt"></label><label><input name="unavailable" type="checkbox" ${draft.unavailable?'checked':''}>Geschlossen / vorerst nicht vorschlagen</label><label>Ort<select name="setting">${choices([['inside','Drinnen'],['outside','Draußen'],['both','Beides']],draft.setting)}</select></label><label>Energie<select name="energy">${choices([['low','Niedrig'],['medium','Mittel'],['high','Hoch']],draft.energy)}</select></label><label>Aufwand<select name="effort">${choices([['spontaneous','Direkt loslegen'],['prepare','Etwas vorbereiten'],['trip','Auch planen']],draft.effort)}</select></label><label>Ort, Anforderungen und Vorbereitung<textarea name="note" maxlength="2000">${e(draft.note.replace(/Dauer und Anfahrt noch ergänzen;/g,'Dauer noch ergänzen;'))}</textarea></label><p class="planner-small">Deine Angaben, keine verifizierte Quellenprüfung. Bei Touren Route, Sperren und Wetter; bei Orten Öffnung prüfen.</p><button type="submit" ${disabled}>Im Vorrat speichern</button><button type="button" data-stock-action="cancel" ${saving?'disabled':''}>Abbrechen</button></form></dialog>`:''}
 ${!draft&&view?`<dialog id="stockDialog" class="stock-dialog" aria-label="Details zu ${e(view.title)}"><header><h2>${e(view.title)}</h2><button type="button" data-stock-action="cancel" aria-label="Fenster schließen">×</button></header><p role="status">${e(message)}</p>${ratingMarkup(view,disabled)}${!placeOnlyKind(view.kind)?`<p>${view.minutes===null?'Dauer noch offen':`${view.minutes} Min.`}${view.distanceKm===null?'':` · ${view.distanceKm} km`}${view.elevationM===null?'':` · ${view.elevationM} hm`}</p>`:''}<p>Energie ${e(({low:'niedrig',medium:'mittel',high:'hoch'} as Record<string,string>)[view.energy])} · ${e(({spontaneous:'direkt loslegen',prepare:'etwas vorbereiten',trip:'auch planen'} as Record<string,string>)[view.effort])} · ${e(({inside:'drinnen',outside:'draußen',both:'beides'} as Record<string,string>)[view.setting])}</p><p>${e(view.note.replace(/Dauer und Anfahrt noch ergänzen;/g,placeOnlyKind(view.kind)?'':'Dauer noch ergänzen;').replace(placeOnlyKind(view.kind)?/Dauer noch ergänzen;/g:/$^/g,''))}</p><p class="planner-small">${view.unavailable?'Als geschlossen übernommen · nicht in der Auswahl.':'Aktuelle Bedingungen ungeprüft.'}</p>${view.url?`<p><a href="${e(safeStockUrl(view.url))}" target="_blank" rel="noopener noreferrer">Originalquelle öffnen</a></p>`:''}${importedDetailsMarkup(view)}<div class="stock-dialog-actions"><button type="button" data-stock-action="edit" data-stock-id="${e(view.id)}" ${disabled}>Bearbeiten</button><button type="button" data-stock-action="remove" data-stock-id="${e(view.id)}" ${disabled}>Aus Vorrat entfernen</button></div></dialog>`:''}
 <div class="stock-groups">${stockKinds.map(([kind,label])=>{const rows=active.filter(a=>normalizedStockKind(a.kind)===kind);const icon=kind.startsWith('bike')?'🚲':kind.startsWith('hike')?'🥾':({walk:'🌿',swim:'🏊',cafe:'☕',restaurant:'🍽️','beer-garden':'🌳'} as Record<string,string>)[kind];return `<details class="stock-category" data-stock-category="${kind}"><summary><span>${icon} ${label}</span><span class="stock-count">${rows.length}</span></summary><div class="stock-list">${rows.map(a=>`<article class="stock-row"><div><h3>${e(a.title)}</h3><p>${placeOnlyKind(a.kind)?'':`${a.minutes===null?'Dauer offen':`${a.minutes} Min.`} · `}${e(({inside:'Drinnen',outside:'Draußen',both:'Beides'} as Record<string,string>)[a.setting])}${a.unavailable?' · Geschlossen':''}</p></div><button type="button" class="stock-more" data-stock-action="details" data-stock-id="${e(a.id)}" aria-label="Details zu ${e(a.title)}">Mehr</button></article>`).join('')||'<p class="planner-small">Noch keine Idee hinterlegt.</p>'}<button type="button" class="stock-add" data-stock-action="new" data-stock-kind="${kind}" ${disabled}>+ ${label} ergänzen</button></div></details>`;}).join('')}</div>
 ${!decisions.ready?'<p>Merkliste-Ausschlüsse und Bewertungen gerade nicht vollständig geladen. Verknüpfte Ideen werden bis dahin nicht vorgeschlagen.</p>':''}
 ${candidates.length?`<details><summary>Aus deiner Merkliste übernehmen · ${candidates.length}</summary><p>Art und Planungsangaben beim Übernehmen prüfen. Tourdauer und Route bei Bedarf ergänzen.</p>${candidates.map(a=>`<div class="stock-candidate"><span>${e(a.title)}</span><button type="button" data-stock-action="import" data-stock-id="${e(a.suggestionId)}" ${disabled}>Angaben ergänzen</button></div>`).join('')}</details>`:''}`;
}

export function stockIdeaMarkup(a:KnownActivity,items:readonly StockItem[],answers:GuideAnswers,decisions:StockDecisions):string {
 const kind=kindForActivity(a);if(!kind)return '';
 const matches=matchingStock(a,items,answers,decisions);
 if(!matches.length)return '<p class="planner-small">Noch keine konkrete Vorratsidee mit passenden Angaben. Ergänze unter Orte & Touren deinen Vorrat oder die Dauer.</p>';
 const x=matches[0];const minutes=stockMinutes(x,a);return `<div class="stock-guide-match"><strong>Konkrete Idee: ${e(x.title)}</strong><p>${minutes} Min.${['swim','cafe','restaurant','beer-garden'].includes(x.kind)?' (Standardaktivität)':''} ${e(x.note.replace(/Dauer und Anfahrt noch ergänzen;/g,'Dauer noch ergänzen;'))}</p><p class="planner-small">Angaben aus deinem Vorrat. Aktuelle Öffnung, Wetter und gegebenenfalls Route/Sperren vor Durchführung prüfen.</p></div>`;
}

