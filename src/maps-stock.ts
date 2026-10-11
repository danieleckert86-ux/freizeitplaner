import type {StockItem} from './activity-stock.ts';
import places from './maps-places.json' with {type:'json'};

export function mapsStock():StockItem[]{return places.map(p=>({...p,minutes:null,travelMinutes:null,distanceKm:null,elevationM:null,url:''} as StockItem));}
// Seed once per shared payload. Explicit edits/deletions and all unrelated fields survive.
export function withMapsStock<T extends {activityStock?:StockItem[];stockMapsVersion?:number}>(state:T):T {
 if(state.stockMapsVersion===1)return state;
 const existing=state.activityStock??[];
 const names=new Set(existing.map(a=>a.title.normalize('NFKC').trim().toLocaleLowerCase('de')));
 return {...state,stockMapsVersion:1,activityStock:[...existing,...mapsStock().filter(a=>!existing.some(x=>x.id===a.id)&&!names.has(a.title.normalize('NFKC').trim().toLocaleLowerCase('de')))]};
}
