import {categoryOf,settingOf,type ActivityCategory} from './activity-properties.ts';
import {kindForActivity,normalizedStockKind,safeStockUrl,stockKinds,placeOnlyKind,type StockItem} from './activity-stock.ts';
import type {KnownActivity} from './known-activities.ts';
import type {Decisions,SavedIdea} from './idea-store.ts';
import {mediaIdentityKeys} from './recommendation-eligibility.ts';

export const collectionKinds=[...stockKinds,['other','Weitere Orte'] as const] as const;
export type CollectionKind=typeof collectionKinds[number][0];
export type LibraryEntry={kind:'idea';item:KnownActivity}|{kind:'place';item:StockItem}|{kind:'archive';item:SavedIdea};
export function searchLibrary(ideas:readonly KnownActivity[],places:readonly StockItem[],favorites:readonly SavedIdea[],query:string,onlyFavorites=false):LibraryEntry[]{
 const needle=query.trim().toLocaleLowerCase('de');
 const rows:LibraryEntry[]=[...ideas.map(item=>({kind:'idea' as const,item})),...places.map(item=>({kind:'place' as const,item})),...favorites.map(item=>({kind:'archive' as const,item}))];
 return rows.filter(row=>(!onlyFavorites||row.kind==='archive'||row.item.favorite)&&[row.item.title,row.kind==='idea'?row.item.next:row.kind==='place'?[row.item.note,row.item.address].filter(Boolean).join(' '):row.item.description].join(' ').toLocaleLowerCase('de').includes(needle));
}
export const stockKind=(p:StockItem)=>normalizedStockKind(p.kind);
const identityIds=(id:string,url:string)=>[id,id.startsWith('lifestyle-')?id.slice(10):'lifestyle-'+id,...mediaIdentityKeys({imdbUrl:url,moviepilotUrl:url})];
export function linkedPlaces(idea:KnownActivity,places:readonly StockItem[]){
 const kind=kindForActivity(idea);
 return places.filter(p=>p.linkedRoutineIds?.length?p.linkedRoutineIds.includes(idea.id):kind!==null&&stockKind(p)===kind);
}
export function visiblePlace(p:StockItem,d:Decisions){
 const declared=[p.sourceId,...p.importedSourceIds??[]].filter((x):x is string=>!!x);
 const ids=declared.flatMap(id=>identityIds(id,p.url));
 for(const snapshot of p.sourceDetails??[])ids.push(...mediaIdentityKeys(snapshot));
 return !ids.length||d.ready&&!ids.some(id=>d.hidden.has(id)||(d.ratings.get(id)??0)<0);
}
export function archivedFavorites(f:readonly SavedIdea[],places:readonly StockItem[],d:Decisions){
 if(!d.ready)return [];
 return f.filter(x=>!identityIds(x.suggestion_id,x.url).some(id=>d.hidden.has(id))&&!places.some(p=>p.sourceId===x.suggestion_id||p.importedSourceIds?.includes(x.suggestion_id)));
}
export const safeLink=(url:string)=>safeStockUrl(url);
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const timeLabel=(minutes:number|null|undefined)=>minutes==null?'Dauer offen':minutes<60?minutes+' Min.':minutes%60===0?minutes/60+' Std.':Math.floor(minutes/60)+' Std. '+minutes%60+' Min.';
export function ideaGroup(idea:KnownActivity):ActivityCategory{return categoryOf(idea);}
export function placeProperties(p:StockItem){return [p.unavailable?'Geschlossen / pausiert':'',...placeOnlyKind(p.kind)?[]:[timeLabel(p.minutes),p.distanceKm==null?'':p.distanceKm+' km',p.elevationM==null?'':p.elevationM+' hm'],({inside:'Drinnen',outside:'Draußen',both:'Drinnen oder draußen'})[p.setting]].filter(Boolean);}
export function ideaProperties(a:KnownActivity){return [timeLabel(a.minutes),'Energie '+({low:'niedrig',medium:'mittel',high:'hoch'} as Record<string,string>)[a.energy],({spontaneous:'Direkt loslegen',prepare:'Etwas Vorbereitung',trip:'Etwas planen'} as Record<string,string>)[a.effort],({inside:'Drinnen',outside:'Draußen',both:'Drinnen oder draußen'})[settingOf(a)]];}
