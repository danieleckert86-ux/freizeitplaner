// Kept byte-identical with freizeitplaner/src/recommendation-eligibility.ts.
// Media use release/IMDb facts; other personal recommendations retain their approval gate.
export type RouteEvidence={durationActivity:'walking'|'cycling';ascentMetric?:'totalAscent'|'heightDifference'|'unknown';ascentSourceUrl?:string;ascentVerifiedAt?:string;startMunicipality:string;startSourceUrl:string;startVerifiedAt:string;travelMode:'walk'|'bike'|'transit'|'car';travelReference?:'augsburg-centre';travelSourceUrl?:string;travelVerifiedAt?:string;specialAppeal?:string;appealSourceUrls?:string[];appealVerifiedAt?:string;wayCharacter:string;waySourceUrls:string[];wayVerifiedAt:string;surface?:'asphalt'|'firm'|'mixed'|'unknown';surfaceComponents?:('asphalt'|'firm'|'unsuitable')[];safetySourceUrls:string[];safetyVerifiedAt:string};
export type RecommendationFacts={kind:string;openingDate?:string;openingCity?:string;openingSourceUrl?:string;routeEvidence?:RouteEvidence;contentChangedAt?:string;date?:string|null;releaseDate?:string|null;releaseSourceUrl?:string;cinemaProgramUrl?:string;cinemaProgramCheckedAt?:string;availableUntil?:string;time?:string|null;location?:string;platform?:string;mediaType?:string;imdbRating?:number|null;imdbUrl?:string;imported?:boolean;closed?:boolean|null;verifiedAt?:string;km?:number|null;ascent?:number|null;minutes?:number|null;travelMinutes?:number|null;exposed?:boolean|null;climbing?:boolean|null;latitude?:number|null;longitude?:number|null};
export type Approval={status:string;reason:string;caveat?:string;profileUpdatedAt:string;reviewedAt:string;sourceUrls:string[]};
const timestamp=(v:unknown)=>typeof v==='string'&&v.includes('T')&&Number.isFinite(Date.parse(v));
const isoDay=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const source=(v:unknown)=>{try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const sources=(v:unknown):v is string[]=>Array.isArray(v)&&v.length>0&&v.every(source);
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function berlinDay(now:Date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);}
export function hardEligibilityReason(x:RecommendationFacts,now=new Date()):string|null{
 if(x.closed===true)return 'unavailable';
 // Known physical failures do not become open research just because an import lacks verification.
 if(x.kind==='hike'&&(number(x.km)&&x.km>15||number(x.ascent)&&(x.ascent<500||x.ascent>900)||number(x.travelMinutes)&&(x.travelMinutes<0||x.travelMinutes>120)))return 'hike_limits';
 if(x.kind==='bike'&&number(x.km)&&x.km>40)return 'bike_distance';
 if(['hike','bike','walk'].includes(x.kind)&&(x.exposed===true||x.climbing===true))return 'route_unsuitable';
 const day=berlinDay(now),date=x.releaseDate??x.date;
 // Expired or not-yet-relevant imports do not need a new original-source review.
 if(x.kind==='event'&&isoDay(x.date)){
  const age=(Date.parse(x.date)-Date.parse(day))/86400000;
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  if(age<0||age>90||age===0&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time||'')&&x.time!<=clock)return 'outside_event_window';
 }
 if(['cinema','stream'].includes(x.kind)&&number(x.imdbRating)&&x.imdbRating>=0&&x.imdbRating<=7.8)return 'imdb_threshold';
 if(x.imported===true||!timestamp(x.verifiedAt))return 'unverified';
 if(x.kind==='restaurant'){
  if(x.openingCity!=='Augsburg'||!x.location?.trim())return 'opening_location_unconfirmed';
  if(!source(x.openingSourceUrl))return 'opening_source_missing';
  const opened=x.openingDate;
  const month=typeof opened==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(opened);
  if(!month&&!isoDay(opened))return 'opening_date_unknown';
  const earliest=month?opened+'-01':opened!;
  const verifiedDay=berlinDay(new Date(x.verifiedAt!));
  if(earliest>verifiedDay||earliest>day)return 'opening_not_yet_verified';
  const age=(Date.parse(day)-Date.parse(earliest))/86400000;
  // A coarse month must fit entirely in the window; never invent an opening day.
  if(age>60)return 'outside_opening_window';
  if(x.closed!==false)return 'opening_operating_status_unknown';
 }
 if(x.kind==='event'){
  if(!isoDay(x.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time||'')||!x.location?.trim())return 'event_facts_missing';
  const age=(Date.parse(x.date)-Date.parse(day))/86400000;
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  if(age<0||age>90||age===0&&x.time!<=clock)return 'outside_event_window';
 }
 if(x.kind==='stream'){
  if(!isoDay(date))return 'release_unknown';
  const age=(Date.parse(day)-Date.parse(date))/86400000;
  if(age<0||age>=30)return 'outside_stream_window';
  if(!['film','series'].includes(x.mediaType||''))return 'format_unknown';
  if(!/^(Netflix(?: Deutschland)?|Disney\+(?: Deutschland)?|RTL\+(?: Deutschland)?|ARD Mediathek|ZDFmediathek)$/i.test(x.platform||x.location||''))return 'service_unknown';
 }
 if(['stream','cinema'].includes(x.kind)){
  // Cinema is selected from this week's programme, regardless of release age.
  if(x.availableUntil!==undefined&&(!timestamp(x.availableUntil)||Date.parse(x.availableUntil)<=now.getTime()))return 'unavailable';
  if(x.kind==='cinema'){
   if(!/augsburg/i.test(x.location||''))return 'cinema_location_unconfirmed';
   if(!source(x.cinemaProgramUrl)||!timestamp(x.cinemaProgramCheckedAt)||Date.parse(x.cinemaProgramCheckedAt!)>now.getTime()||now.getTime()-Date.parse(x.cinemaProgramCheckedAt!)>120*3600000)return 'cinema_program_unconfirmed';
   const programme=new URL(x.cinemaProgramUrl!);
   if(!((['programmkinosaugsburg.de','www.programmkinosaugsburg.de'].includes(programme.hostname)&&/^\/programm\/(liliom|thalia)(?:\/|$)/.test(programme.pathname))||(['cinemaxx.de','www.cinemaxx.de'].includes(programme.hostname)&&/^\/kinoprogramm\/augsburg(?:\/|$)/.test(programme.pathname))))return 'cinema_source_not_allowed';
   const weekday=new Date(day+'T12:00:00Z').getUTCDay()||7;
   const monday=new Date(day+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-weekday+1);
   if(berlinDay(new Date(x.cinemaProgramCheckedAt!))<monday.toISOString().slice(0,10))return 'cinema_program_unconfirmed';
  }
  if(!number(x.imdbRating)||x.imdbRating<0||x.imdbRating>10)return 'imdb_unknown';
  if(x.imdbRating<=7.8)return 'imdb_threshold';
  if(!/^https:\/\/(www\.)?imdb\.com\/title\/tt\d+(?:\/|$)/.test(x.imdbUrl||''))return 'imdb_identity_unknown';
 }
 if(['hike','bike','walk'].includes(x.kind)){
  // Reject known hard failures before spending effort on missing descriptive evidence.
  // Walking time is a preference, not a hard 3–6 hour exclusion.
  if(x.kind==='bike'&&number(x.km)&&x.km>40)return 'bike_distance';
  const e=x.routeEvidence;
  if(!e||!e.startMunicipality?.trim()||!source(e.startSourceUrl)||!timestamp(e.startVerifiedAt)||!['walk','bike','transit','car'].includes(e.travelMode)||!e.wayCharacter?.trim()||!sources(e.waySourceUrls)||!timestamp(e.wayVerifiedAt)||!sources(e.safetySourceUrls)||!timestamp(e.safetyVerifiedAt))return 'route_evidence_missing';
  if(e.durationActivity!==(x.kind==='bike'?'cycling':'walking'))return 'route_duration_sport_mismatch';
  if(x.kind==='hike'&&(e.ascentMetric!=='totalAscent'||!source(e.ascentSourceUrl)||!timestamp(e.ascentVerifiedAt)))return 'route_ascent_evidence_missing';
  if(e.travelMode==='car'&&(!number(x.travelMinutes)||x.travelMinutes<0||!source(e.travelSourceUrl)||!timestamp(e.travelVerifiedAt)||e.travelReference!=='augsburg-centre'))return 'route_travel_evidence_missing';
  // No known closure is sufficient; null never claims confirmed closure freedom.
  if(!number(x.km)||x.km<=0||!number(x.minutes)||x.minutes<=0||x.exposed!==false||x.climbing!==false)return 'route_facts_missing';
  if(x.kind==='hike'&&(!number(x.ascent)||!number(x.travelMinutes)))return 'route_facts_missing';
  if(x.kind==='hike'&&(x.km>15||!number(x.ascent)||x.ascent<500||x.ascent>900||!number(x.travelMinutes)||x.travelMinutes<0||x.travelMinutes>120))return 'hike_limits';
  if(x.kind==='bike'&&x.km>40)return 'bike_distance';
  if(x.kind==='bike'&&!(['asphalt','firm'].includes(e.surface||'')||e.surface==='mixed'&&!!e.surfaceComponents?.length&&e.surfaceComponents.every(s=>['asphalt','firm'].includes(s))))return 'bike_surface_unconfirmed';
  if(x.kind==='walk'){
   if(!number(x.latitude)||Math.abs(x.latitude)>90||!number(x.longitude)||Math.abs(x.longitude)>180)return 'walk_start_unknown';
   const rad=(v:number)=>v*Math.PI/180,a=rad(x.latitude-48.3668),b=rad(x.longitude-10.8985);
   const h=Math.sin(a/2)**2+Math.cos(rad(48.3668))*Math.cos(rad(x.latitude))*Math.sin(b/2)**2;
   if(6371*2*Math.asin(Math.sqrt(Math.min(1,h)))>15+1e-9)return 'walk_radius';
   // Municipality is a separately sourced fact, never guessed from a publisher's name.
   // Unknown access mode cannot silently become a walk without a car.
   if(e.travelMode==='car'&&(!e.specialAppeal?.trim()||!sources(e.appealSourceUrls)||!timestamp(e.appealVerifiedAt)))return 'walk_special_appeal_missing';
   if(e.travelMode==='car'&&(!number(x.travelMinutes)||x.travelMinutes<0||x.travelMinutes<0||x.travelMinutes>30))return 'walk_travel';
  }
 }
 return null;
}
export function recommendationAllowed(x:RecommendationFacts,a:Approval|null|undefined,now=new Date()):boolean{
 if(['restaurant','cinema','stream'].includes(x.kind))return hardEligibilityReason(x,now)===null;
 return !!a&&(!x.contentChangedAt||timestamp(x.contentChangedAt)&&Date.parse(a.reviewedAt)>=Date.parse(x.contentChangedAt))&&a.status==='strong'&&!!a.reason?.trim()&&timestamp(a.profileUpdatedAt)&&timestamp(a.reviewedAt)&&Array.isArray(a.sourceUrls)&&a.sourceUrls.length>0&&a.sourceUrls.every(u=>{try{const url=new URL(u);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}})&&hardEligibilityReason(x,now)===null;
}

// Persist this key in the existing hidden_recommendations table, across offer IDs.
export function mediaIdentityKey(x:{imdbUrl?:string}){
 if(!source(x.imdbUrl))return '';
 const u=new URL(x.imdbUrl!);if(!['imdb.com','www.imdb.com'].includes(u.hostname))return '';
 const id=/^\/title\/(tt\d+)(?:\/|$)/.exec(u.pathname)?.[1];
 return id?'media/imdb/'+id:'';
}
export function mediaHidden(x:{id?:string;imdbUrl?:string},hidden:ReadonlySet<string>){return !!x.id&&(hidden.has(x.id)||hidden.has('lifestyle-'+x.id))||!!mediaIdentityKey(x)&&hidden.has(mediaIdentityKey(x));}

export function foodOpeningLabel(x:{openingDate?:string}){
 const value=x.openingDate||'';
 if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return 'Eröffnet im '+new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',month:'long',year:'numeric'}).format(new Date(value+'-01T12:00:00Z'));
 return isoDay(value)?'Eröffnet am '+value.split('-').reverse().join('.'):'Eröffnung noch nicht belegt';
}

