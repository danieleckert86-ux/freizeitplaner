// Kept byte-identical with freizeitplaner/src/recommendation-eligibility.ts.
// Facts and explicit personal approval are independent gates; no taste scoring here.
export type RecommendationFacts={kind:string;contentChangedAt?:string;date?:string|null;releaseDate?:string|null;time?:string|null;location?:string;platform?:string;mediaType?:string;imdbRating?:number|null;imdbUrl?:string;imported?:boolean;closed?:boolean|null;verifiedAt?:string;km?:number|null;ascent?:number|null;minutes?:number|null;travelMinutes?:number|null;exposed?:boolean|null;climbing?:boolean|null;latitude?:number|null;longitude?:number|null};
export type Approval={status:string;reason:string;caveat?:string;profileUpdatedAt:string;reviewedAt:string;sourceUrls:string[]};
const timestamp=(v:unknown)=>typeof v==='string'&&v.includes('T')&&Number.isFinite(Date.parse(v));
const isoDay=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function berlinDay(now:Date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);}
export function hardEligibilityReason(x:RecommendationFacts,now=new Date()):string|null{
 if(x.closed===true)return 'unavailable';
 if(x.imported===true||!timestamp(x.verifiedAt))return 'unverified';
 const day=berlinDay(now),date=x.releaseDate??x.date;
 if(x.kind==='event'||x.kind==='cinema'){
  if(!isoDay(x.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time||'')||!x.location?.trim())return 'event_facts_missing';
  const age=(Date.parse(x.date)-Date.parse(day))/86400000;
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  if(age<0||age>90||age===0&&x.time!<=clock)return 'outside_event_window';
  if(x.kind==='cinema'&&!/augsburg/i.test(x.location))return 'cinema_location_unconfirmed';
 }
 if(x.kind==='stream'){
  if(!isoDay(date))return 'release_unknown';
  const age=(Date.parse(day)-Date.parse(date))/86400000;
  if(age<0||age>60)return 'outside_stream_window';
  if(!['film','series'].includes(x.mediaType||''))return 'format_unknown';
  if(!/^(Netflix(?: Deutschland)?|Disney\+(?: Deutschland)?|RTL\+(?: Deutschland)?|ARD Mediathek|ZDFmediathek)$/i.test(x.platform||x.location||''))return 'service_unknown';
 }
 if(['stream','cinema'].includes(x.kind)){
  if(!number(x.imdbRating)||x.imdbRating<0||x.imdbRating>10)return 'imdb_unknown';
  if(x.imdbRating<7.8)return 'imdb_threshold';
  if(!/^https:\/\/(www\.)?imdb\.com\/title\/tt\d+(?:\/|$)/.test(x.imdbUrl||''))return 'imdb_identity_unknown';
 }
 if(['hike','bike','walk'].includes(x.kind)){
  if(!number(x.km)||x.km<=0||!number(x.minutes)||x.minutes<=0||x.exposed!==false||x.climbing!==false||x.closed!==false)return 'route_facts_missing';
  if(x.kind==='hike'&&(!number(x.ascent)||!number(x.travelMinutes)))return 'route_facts_missing';
  if(x.kind==='hike'&&(x.km>15||!number(x.ascent)||x.ascent<500||x.ascent>900||x.minutes<180||x.minutes>360||!number(x.travelMinutes)||x.travelMinutes<0||x.travelMinutes>120))return 'hike_limits';
  if(x.kind==='bike'&&x.km>40)return 'bike_distance';
  if(x.kind==='walk'){
   if(!number(x.latitude)||Math.abs(x.latitude)>90||!number(x.longitude)||Math.abs(x.longitude)>180)return 'walk_start_unknown';
   const rad=(v:number)=>v*Math.PI/180,a=rad(x.latitude-48.3668),b=rad(x.longitude-10.8985);
   const h=Math.sin(a/2)**2+Math.cos(rad(48.3668))*Math.cos(rad(x.latitude))*Math.sin(b/2)**2;
   if(6371*2*Math.asin(Math.sqrt(Math.min(1,h)))>15+1e-9)return 'walk_radius';
   // No invented commute: a positive car journey needs a current sourced strong review
   // of the exceptional appeal as well as the bounded journey fact.
   if(x.travelMinutes!==null&&x.travelMinutes!==undefined&&(!number(x.travelMinutes)||x.travelMinutes<0||x.travelMinutes>30))return 'walk_travel';
  }
 }
 return null;
}
export function recommendationAllowed(x:RecommendationFacts,a:Approval|null|undefined,now=new Date()):boolean{
 return !!a&&(!x.contentChangedAt||timestamp(x.contentChangedAt)&&Date.parse(a.reviewedAt)>=Date.parse(x.contentChangedAt))&&a.status==='strong'&&!!a.reason?.trim()&&timestamp(a.profileUpdatedAt)&&timestamp(a.reviewedAt)&&Array.isArray(a.sourceUrls)&&a.sourceUrls.length>0&&a.sourceUrls.every(u=>{try{const url=new URL(u);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}})&&hardEligibilityReason(x,now)===null;
}
