export type NewCategory='events'|'cinema'|'stream'|'restaurants'|'outdoor';
export function finderSectionVisible(section:string,current:boolean,category:NewCategory,standard:'planning'|'stock'){
 if(!current)return section===standard;
 return category==='cinema'||category==='stream'?section==='movies':section===category;
}
export function discoveryFoodKind(x:{type?:string;category?:string}){
 const text=[x.type,x.category].join(' ');
 return /biergarten|beer.garden/i.test(text)?'beer-garden':/caf[eé]|coffee/i.test(text)?'cafe':'restaurant';
}
export function discoveryRouteKind(x:{kind?:string;category?:string;label?:string}){
 if(x.kind==='walk'||/spazier|walking/i.test([x.category,x.label].join(' ')))return 'walk';
 return x.kind==='bike'?'bike':'hike';
}
// Saved discovery belongs to Neues even when it is an evergreen route or place.
export function favoriteArea(category:string,date?:string):'ideas'|'current' {
 if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))return 'current';
 const c=category.toLocaleLowerCase('de');
 return /wellness|schwimm|kajak|camper/.test(c)?'ideas':'current';
}
