export type CollectionItem={title:string;date?:string;time?:string;fitScore?:number;favorite?:{id:string};id?:string;verifiedAt?:string;imported?:boolean};
export function upcomingEvents<T extends CollectionItem>(items:T[],today:string,hidden:Set<string>):T[]{
 const max=new Date(today+'T12:00:00Z');max.setUTCDate(max.getUTCDate()+90);const last=max.toISOString().slice(0,10);
 const seen=new Set<string>();
 return [...items].filter(x=>x.date&&x.date>=today&&x.date<=last&&!hidden.has(x.id||x.favorite?.id||'')).sort((a,b)=>(b.fitScore||0)-(a.fitScore||0)||(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')).filter(x=>{const key=[x.title.trim().replace(/\s+/g,' ').toLocaleLowerCase('de'),x.date,x.time||''].join('|');if(seen.has(key))return false;seen.add(key);return true;});
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
