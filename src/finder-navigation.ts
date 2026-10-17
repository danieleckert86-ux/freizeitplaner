export type NewCategory='events'|'music'|'cinema'|'stream'|'restaurants'|'outdoor';
export function finderSectionVisible(section:string,current:boolean,category:NewCategory,standard:'planning'|'stock'){
 if(!current)return section===standard;
 if(category==='music')return section==='events';
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
// Imported routes stay in storage; only eligible climbs belong in new hike suggestions.
// The current backend projection carries ascent in a dedicated meta entry.
export function hikeAscentAllowed(x:{ascent?:number|null;meta?:readonly string[]}):boolean {
 let ascent=x.ascent;
 if(ascent===undefined){
  const values=(x.meta??[]).flatMap(value=>{
   const match=value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:hm|höhenmeter)(?:\s*(?:aufstieg|bergauf))?$/i);
   return match?[Number(match[1].replace(',','.'))]:[];
  });
  if(values.length!==1)return false;
  ascent=values[0];
 }
 return typeof ascent==='number'&&Number.isFinite(ascent)&&ascent>=500&&ascent<=900;
}
// Saved discovery belongs to Neues even when it is an evergreen route or place.
export function favoriteArea(category:string,date?:string):'ideas'|'current' {
 if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))return 'current';
 const c=category.toLocaleLowerCase('de');
 return /wellness|schwimm|kajak|camper/.test(c)?'ideas':'current';
}

export function streamingFormat(x:{mediaType?:'film'|'series';category?:string;type?:string;favorite?:{categoryLabel?:string}}):'film'|'series'|'unknown'{
 if(x.mediaType)return x.mediaType;
 const text=[x.category,x.type,x.favorite?.categoryLabel].join(' ');
 const film=/\bfilme?\b|\bkinofilme?\b/i.test(text),series=/\bserie\b|\bserien\b|\bstaffel\b/i.test(text);
 return film!==series?(film?'film':'series'):'unknown';
}
export function streamingCardMeta(meta:readonly string[]){return meta.filter(v=>!/(?:\b\d+(?:[.,:]\d+)?\s*(?:min(?:uten)?\b|h\b|std\.?\b|stunden?\b)|laufzeit|spieldauer)/i.test(v));}

export function streamingProvider(item:{platform?:string;meta?:readonly string[];url?:string}):string {
 const explicit=item.platform?.trim();
 if(explicit&&!/^(?:In Quelle prüfen|unbekannt|offen|Zu Hause)$/i.test(explicit))return explicit;
 const saved=(item.meta??[]).find(v=>/^(?:Netflix|ARD(?: Mediathek)?|ZDF(?: Mediathek)?|Disney\+|(?:Amazon )?Prime Video|Apple TV\+|WOW|Sky|RTL\+|Joyn|Arte(?: Mediathek)?|3sat(?: Mediathek)?)$/i.test(v.trim()));
 if(saved)return saved.trim();
 try{
  const host=new URL(item.url??'').hostname.toLowerCase();
  const providers:[string,string][]=[['netflix.com','Netflix'],['ardmediathek.de','ARD Mediathek'],['zdf.de','ZDF Mediathek'],['disneyplus.com','Disney+'],['primevideo.com','Prime Video'],['tv.apple.com','Apple TV+'],['wowtv.de','WOW'],['sky.de','Sky'],['plus.rtl.de','RTL+'],['joyn.de','Joyn'],['arte.tv','Arte'],['3sat.de','3sat']];
  return providers.find(([domain])=>host===domain||host.endsWith('.'+domain))?.[1]??'Anbieter noch ungeklärt';
 }catch{return 'Anbieter noch ungeklärt';}
}


export function eventSection(x:{category?:string}):'music'|'events'{return /musik|konzert|indie|folk|songwriter|rock|pop|jazz/i.test(x.category||'')?'music':'events';}
