import {eventSection} from './finder-navigation.ts';
// Private, explicit ratings. The catalogue and its source timestamps stay unchanged.
export type TasteSuggestion={id:string;title:string;category:string;description:string;kind:string;url:string;mediaType?:'film'|'series';date?:string;fitScore?:number;imported?:boolean;closed?:boolean;facts?:string[]};
export type TasteScope='standard'|'event'|'music'|'cinema'|'stream'|'food'|'outdoor';
export const tasteScopeLabels:Record<TasteScope,string>={standard:'Standardaktivitäten',event:'Kultur & Veranstaltungen',music:'Musik & Konzerte',cinema:'Kino',stream:'Streaming',food:'Essen & entdecken',outdoor:'Raus ins Grüne'};
export function tasteScope(x:TasteSuggestion):TasteScope{
 if(x.kind==='cinema')return 'cinema';
 if(x.kind==='stream')return 'stream';
 if(x.kind==='event')return eventSection(x)==='music'?'music':'event';
 if(['restaurant','cafe','beer-garden'].includes(x.kind))return 'food';
 if(['hike','bike','walk','hike-short','hike-long','bike-short','bike-long'].includes(x.kind))return 'outdoor';
 return 'standard';
}
export function tasteArchiveRatings(ratings:readonly TasteRating[],scope:TasteScope){return ratings.filter(r=>tasteScope(r)===scope);}
export type TasteRating=TasteSuggestion&{score?:number;stars?:number;reason:string;ratedAt:string};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const normalized=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
export const starLabels=['gefällt mir gar nicht','eher nicht mein Geschmack','okay','gefällt mir gut','trifft meinen Geschmack genau'];
export const validScore=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=100&&v%5===0;
export const legacyStarsToScore=(stars:number)=>(stars-1)*25;
export function ratingScore(r:{score?:number;stars?:number}){return r.score??(r.stars===undefined?undefined:legacyStarsToScore(r.stars));}
export function scoreLabel(score:number){return score<=10?'gefällt mir gar nicht':score<40?'eher nicht mein Geschmack':score<=60?'okay':score<90?'gefällt mir gut':'trifft meinen Geschmack genau';}
export function validTasteRating(v:unknown):v is TasteRating{
 if(!v||typeof v!=='object')return false;const x=v as TasteRating;
 return ['id','title','category','description','kind','url','reason','ratedAt'].every(k=>typeof (x as unknown as Record<string,unknown>)[k]==='string')
  &&!!x.id&&x.id.length<=250&&x.title.length<=500&&x.category.length<=300&&x.description.length<=12000&&x.reason.length<=1000&&x.url.length<=2000&&(!x.url||/^https?:\/\//.test(x.url))
  &&(x.score!==undefined?validScore(x.score):typeof x.stars==='number'&&Number.isInteger(x.stars)&&x.stars>=1&&x.stars<=5)&&(!x.ratedAt||Number.isFinite(Date.parse(x.ratedAt)))
  &&(x.fitScore===undefined||Number.isFinite(x.fitScore)&&x.fitScore>=0&&x.fitScore<=100)
  &&(x.date===undefined||/^\d{4}-\d{2}-\d{2}$/.test(x.date))
  &&(x.mediaType===undefined||x.mediaType==='film'||x.mediaType==='series')
  &&(x.facts===undefined||Array.isArray(x.facts)&&x.facts.length<=50&&x.facts.every(f=>typeof f==='string'&&f.length<=1000));
}
export function withTasteRating<T extends {tasteRatings?:TasteRating[]}>(state:T,item:TasteSuggestion,score:number|null,reason='',at=new Date().toISOString()):T{
 if(score!==null&&!validScore(score))throw Error('Invalid score');
 const rows=(state.tasteRatings??[]).filter(x=>x.id!==item.id);
 if(score!==null){const {stars:_oldStars,score:_oldScore,...snapshot}=item as TasteRating;const row={...snapshot,score,reason:reason.trim(),ratedAt:at};if(!validTasteRating(row))throw Error('Invalid taste example');rows.unshift(row);}
 if(rows.length>2000)throw Error('Taste collection full');
 return {...state,tasteRatings:rows};
}
const facets:[string,RegExp][]=[
 ['persönliche Texte',/persönlich\w*\s+(?:texte|songs|songwriting)|eigene\w*\s+(?:texte|songs|lieder)|selbstgeschrieben|erzählend|erzählerisch|starke texte/i],
 ['akustische Instrumente',/akustisch|unplugged|organisch\w*\s+instrument/i],
 ['markante Stimme',/markant\w*\s+stimme|unverwechselbar\w*\s+(?:stimme|gesang)|charakteristisch\w*\s+stimme/i],
 ['Humor und Melancholie',/humor|melanchol|nachdenklich|emotional/i],
 ['persönliches Konzertformat',/wohnzimmerkonzert|klein\w*\s+(?:konzert|bühne|location)|intim\w*\s+(?:konzert|atmosphäre)/i],
 ['Nachwuchs und Support',/nachwuchskünstler|nachwuchsband|support[\s-]*act|debütkonzert/i],
 ['ruhige Tour',/ruhig|einsam|wenig touristisch/i],['Aussicht',/aussicht|panorama/i],['Rundtour',/rundtour|rundwander|rundweg/i],['flache Strecke',/\b(?:flach(?:e|en|er|es)?|eben(?:e|en|er|es)?)\b/i],['feste Wege',/asphalt|befestigt|feste\w*\s+wege/i],
 ['vegetarische Auswahl',/vegetar|vegan/i],['individuelles Konzept',/inhabergeführt|individuell|charaktervoll/i],['Frühstück und Brunch',/frühstück|brunch/i],['asiatische Küche',/asiatisch|vietnames|thai|japanisch|indisch/i],['italienische Küche',/italienisch|pizza/i],
 ['starke Figuren',/charaktergetrieben|starke\w*\s+figuren|persönliche\w*\s+geschichten/i],['menschlicher Ton',/menschlich|warmherzig/i],['witzig',/witzig|komödie|comedy/i],['Saunalandschaft',/saunalandschaft|aufguss|aufgüsse/i]
];
const routeFacets=new Set(['ruhige Tour','Aussicht','Rundtour','flache Strecke','feste Wege']);
export function tasteFeatures(x:TasteSuggestion){
 const text=[x.title,x.category,x.description,...(x.facts??[])].join(' '),outdoor=tasteScope(x)==='outdoor';
 return facets.filter(([name,p])=>(outdoor||!routeFacets.has(name))&&p.test(text)
  &&!(name==='Rundtour'&&/\b(?:kein(?:e|en|er|es)?|nicht(?:\s+als)?)\s+rund(?:tour|weg|wanderung)\b/i.test(text))
  &&!(name==='flache Strecke'&&/\b(?:nicht|kein(?:e|en|er|es)?)\s+(?:flach(?:e|en|er|es)?|eben(?:e|en|er|es)?)\b/i.test(text)))
  .map(([name])=>name);
}
export function tasteDomain(x:TasteSuggestion){
 // Explicit catalogue kinds win over descriptive genre words. Cinema feedback
 // must not train streaming or events; confirmed series and films stay separate.
 const scope=tasteScope(x);
 if(scope==='cinema')return 'cinema:film';
 if(scope==='stream'){
  const format=x.mediaType??(/\bserie\b|\bserien\b|\bstaffel\b/i.test(x.category)?'series':/\bfilm\b/i.test(x.category)?'film':'unknown');
  return 'stream:'+format;
 }
 const text=x.category+' '+x.kind;
 const prefix=scope==='event'?'event:':'';
 if(/restaurant|café|cafe|biergarten/i.test(text))return prefix+'food';
 if(/hike|bike|wander|radtour|fahrrad/i.test(text))return prefix+'tour';
 if(/musik|indie|folk|songwriter|konzert|jazz|rock|pop|liedermacher|chanson/i.test(text))return prefix+'music';
 return prefix+'other:'+normalized(x.kind||x.category);
}
const referenceArtist=/^(?:miles hardt|olli schulz|chance pe[nñ]a|annenmaykantereit|danger dan|croixx)$/i;
export function personalTasteFit(item:TasteSuggestion,ratings:readonly TasteRating[]){
 const features=tasteFeatures(item),domain=tasteDomain(item);
 if(item.imported||!Number.isFinite(item.fitScore))return {score:null,reason:'Grundpassung noch nicht belegt',confidence:'unknown'};
 const original=item.fitScore!;
 if(original===0)return {score:0,reason:'Bestehender Ausschluss bleibt erhalten',confidence:'excluded'};
 const direct=ratings.find(r=>r.id===item.id);
 if(direct)return {score:ratingScore(direct)!,reason:`Deine Bewertung: ${ratingScore(direct)} / 100`,confidence:'rated'};
 // An artist rated at another concert is a useful direct example, not genre training.
 const same=ratings.filter(r=>tasteDomain(r)===domain&&normalized(r.title)===normalized(item.title)).sort((a,b)=>b.ratedAt.localeCompare(a.ratedAt))[0];
 if(same)return {score:ratingScore(same)!,reason:`Dein bewertetes Beispiel „${same.title}“: ${ratingScore(same)} / 100`,confidence:'reference'};
 const broadMusic=(domain==='music'||domain==='event:music')&&features.length===0&&!referenceArtist.test(item.title.trim());
 const base=broadMusic?Math.min(original,70):original;
 // One artist/place contributes once. Weak shared genre alone never trains a whole genre.
 const unique=new Map<string,TasteRating>();
 for(const r of [...ratings].sort((a,b)=>b.ratedAt.localeCompare(a.ratedAt))){const key=tasteDomain(r)+'|'+normalized(r.title);if(!unique.has(key))unique.set(key,r);}
 const related=[...unique.values()].filter(r=>tasteDomain(r)===domain&&tasteFeatures(r).filter(f=>features.includes(f)).length>=2);
 const adjustment=related.length>=2?Math.round(Math.max(-12,Math.min(12,related.reduce((sum,r)=>sum+(ratingScore(r)!-50)*0.24,0)/(related.length+2)))):0;
 const reasons=[broadMusic?'Nur Musikrichtung belegt; Feinpassung offen':features.length?'Belegte Merkmale: '+features.join(', '):'Grundpassung aus deinen Vorgaben',adjustment?`${related.length} ähnliche bewertete Beispiele: ${adjustment>0?'+':''}${adjustment} Punkte`:''];
 return {score:Math.max(0,Math.min(100,base+adjustment)),reason:reasons.filter(Boolean).join(' · '),confidence:broadMusic?'broad':'features'};
}
export function starsMarkup(id:string,score?:number,disabled=false,showSave=true){
 const value=score??50;
 return `<div class="taste-slider" role="group" aria-label="Geschmack bewerten"><label>Deine Bewertung <output data-score-output>${score===undefined?'Noch nicht bewertet':score+' / 100'}</output><input type="range" min="0" max="100" step="5" value="${value}" data-taste-score data-taste-id="${escape(id)}" aria-label="Deine Geschmacksbewertung von 0 bis 100" aria-valuetext="${score===undefined?'Noch nicht bewertet':score+' von 100 · '+scoreLabel(score)}" ${disabled?'disabled':''}></label><div class="taste-scale"><span>0 · gar nicht</span><span>50 · okay</span><span>100 · genau meins</span></div>${showSave?`<button type="button" data-taste-save="${escape(id)}" ${disabled?'disabled':''}>Bewertung speichern</button>`:''}</div>`;
}
export function ratingSectionMarkup(id:string,score?:number,disabled=true){return `<section class="rating-actions taste-rating" data-taste-wrap="${escape(id)}"><div><strong>Dein Geschmack</strong><p data-taste-label>${score===undefined?'Noch nicht bewertet':score+' / 100'}</p></div><button type="button" data-taste-details="${escape(id)}" ${disabled?'disabled':''}>${score===undefined?'Bewerten':'Bewertung ändern'}</button></section>`;}
// Existing actual star ratings are copied in memory, and persisted on the next explicit save.
// Their original rating time is unknown; no timestamp is invented.
export function withExistingTasteRatings<T extends {tasteRatings?:TasteRating[];activityStock?:{id:string;sourceId?:string;title:string;kind:string;note:string;url:string;rating?:number;ratingScore?:number}[];routines?:{id:string;title:string;next:string;mood:string;rating?:number;ratingScore?:number}[]}>(state:T):T{
 const rows=(state.tasteRatings??[]).map(x=>({...x,score:ratingScore(x)}));
 for(const r of state.activityStock??[]){const id=r.sourceId||'stock:'+r.id;if((r.ratingScore!==undefined||r.rating!==undefined)&&!rows.some(x=>x.id===id))rows.push({id,title:r.title,category:r.kind,description:r.note,kind:r.kind,url:r.url,score:r.ratingScore??legacyStarsToScore(r.rating!),reason:'',ratedAt:''});}
 for(const r of state.routines??[]){const id='routine:'+r.id;if((r.ratingScore!==undefined||r.rating!==undefined)&&!rows.some(x=>x.id===id))rows.push({id,title:r.title,category:r.mood,description:r.next,kind:'routine',url:'',score:r.ratingScore??legacyStarsToScore(r.rating!),reason:'',ratedAt:''});}
 return {...state,tasteRatings:rows};
}
