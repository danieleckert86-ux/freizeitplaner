export type TourIdentity={id:string;title:string;url:string;fitScore?:number};
type SavedTour={id?:string;suggestionId?:string;sourceId?:string;importedSourceIds?:string[];title:string;url:string};
const name=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const url=(s:string)=>{try{const u=new URL(s);u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key))u.searchParams.delete(key);return u.href.replace(/\/$/,'');}catch{return '';}};
/** Decisions apply before ranking/capping; alternate IDs cannot resurrect the same route. */
export function outdoorPicks<T extends TourIdentity>(items:T[],saved:SavedTour[],hidden:ReadonlySet<string>,ready=true):T[]{
 if(!ready)return [];
 const excluded:SavedTour[]=[...saved,...items.filter(x=>hidden.has(x.id))];
 const ids=new Set([...hidden,...excluded.flatMap(x=>[x.id,x.suggestionId,x.sourceId,...(x.importedSourceIds??[])].filter((v):v is string=>!!v))]);
 const names=new Set(excluded.map(x=>name(x.title)).filter(Boolean)),urls=new Set(excluded.map(x=>url(x.url)).filter(Boolean));
 const seenNames=new Set<string>(),seenUrls=new Set<string>();
 return [...items].sort((a,b)=>(b.fitScore??-1)-(a.fitScore??-1)||a.title.localeCompare(b.title,'de')).filter(x=>{
  const n=name(x.title),u=url(x.url);
  if(ids.has(x.id)||names.has(n)||u&&urls.has(u)||seenNames.has(n)||u&&seenUrls.has(u))return false;
  seenNames.add(n);if(u)seenUrls.add(u);return true;
 }).slice(0,2);
}
