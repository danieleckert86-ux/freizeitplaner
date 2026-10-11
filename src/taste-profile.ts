// Private, explicit ratings. The catalogue and its source timestamps stay unchanged.
export type TasteSuggestion={id:string;title:string;category:string;description:string;kind:string;url:string;date?:string;fitScore?:number;imported?:boolean;closed?:boolean;facts?:string[]};
export type TasteRating=TasteSuggestion&{stars:number;reason:string;ratedAt:string};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const normalized=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
export const starLabels=['gefällt mir gar nicht','eher nicht mein Geschmack','okay','gefällt mir gut','trifft meinen Geschmack genau'];
export function validTasteRating(v:unknown):v is TasteRating{
 if(!v||typeof v!=='object')return false;const x=v as TasteRating;
 return ['id','title','category','description','kind','url','reason','ratedAt'].every(k=>typeof (x as unknown as Record<string,unknown>)[k]==='string')
  &&!!x.id&&x.id.length<=250&&x.title.length<=500&&x.category.length<=300&&x.description.length<=12000&&x.reason.length<=1000&&x.url.length<=2000&&(!x.url||/^https?:\/\//.test(x.url))
  &&Number.isInteger(x.stars)&&x.stars>=1&&x.stars<=5&&(!x.ratedAt||Number.isFinite(Date.parse(x.ratedAt)))
  &&(x.fitScore===undefined||Number.isFinite(x.fitScore)&&x.fitScore>=0&&x.fitScore<=100)
  &&(x.date===undefined||/^\d{4}-\d{2}-\d{2}$/.test(x.date))
  &&(x.facts===undefined||Array.isArray(x.facts)&&x.facts.length<=50&&x.facts.every(f=>typeof f==='string'&&f.length<=1000));
}
export function withTasteRating<T extends {tasteRatings?:TasteRating[]}>(state:T,item:TasteSuggestion,stars:number,reason='',at=new Date().toISOString()):T{
 if(!Number.isInteger(stars)||stars<0||stars>5)throw Error('Invalid stars');
 const rows=(state.tasteRatings??[]).filter(x=>x.id!==item.id);
 if(stars){const row={...item,stars,reason:reason.trim(),ratedAt:at};if(!validTasteRating(row))throw Error('Invalid taste example');rows.unshift(row);}
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
 ['ruhige Tour',/ruhig|einsam|wenig touristisch/i],['Aussicht',/aussicht|panorama/i],['Rundtour',/rundtour|rundwander|rundweg/i],['flache Strecke',/flach|eben/i],['feste Wege',/asphalt|befestigt|feste\w*\s+wege/i],
 ['vegetarische Auswahl',/vegetar|vegan/i],['individuelles Konzept',/inhabergeführt|individuell|charaktervoll/i],['Frühstück und Brunch',/frühstück|brunch/i],['asiatische Küche',/asiatisch|vietnames|thai|japanisch|indisch/i],['italienische Küche',/italienisch|pizza/i],
 ['starke Figuren',/charaktergetrieben|starke\w*\s+figuren|persönliche\w*\s+geschichten/i],['menschlicher Ton',/menschlich|warmherzig/i],['witzig',/witzig|komödie|comedy/i],['Saunalandschaft',/saunalandschaft|aufguss|aufgüsse/i]
];
export function tasteFeatures(x:TasteSuggestion){const text=[x.title,x.category,x.description,...(x.facts??[])].join(' ');return facets.filter(([,p])=>p.test(text)).map(([name])=>name);}
export function tasteDomain(x:TasteSuggestion){
 const text=x.category+' '+x.kind;
 if(/restaurant|café|cafe|biergarten/i.test(text))return 'food';
 if(/hike|bike|wander|radtour|fahrrad/i.test(text))return 'tour';
 if(/cinema|stream|kino|film|serie/i.test(text))return 'film';
 if(/musik|indie|folk|songwriter|konzert|jazz|rock|pop|liedermacher|chanson/i.test(text))return 'music';
 return 'other:'+normalized(x.kind||x.category);
}
const referenceArtist=/^(?:miles hardt|olli schulz|chance pe[nñ]a|annenmaykantereit|danger dan|croixx)$/i;
export function personalTasteFit(item:TasteSuggestion,ratings:readonly TasteRating[]){
 const features=tasteFeatures(item),domain=tasteDomain(item);
 if(item.imported||!Number.isFinite(item.fitScore))return {score:null,reason:'Grundpassung noch nicht belegt',confidence:'unknown'};
 const original=item.fitScore!;
 if(original===0)return {score:0,reason:'Bestehender Ausschluss bleibt erhalten',confidence:'excluded'};
 const direct=ratings.find(r=>r.id===item.id);
 if(direct)return {score:[15,35,60,85,100][direct.stars-1],reason:`Deine Bewertung: ${direct.stars} von 5 Sternen`,confidence:'rated'};
 // An artist rated at another concert is a useful direct example, not genre training.
 const same=ratings.filter(r=>tasteDomain(r)===domain&&normalized(r.title)===normalized(item.title)).sort((a,b)=>b.ratedAt.localeCompare(a.ratedAt))[0];
 if(same)return {score:[15,35,60,85,100][same.stars-1],reason:`Dein bewertetes Beispiel „${same.title}“: ${same.stars} von 5 Sternen`,confidence:'reference'};
 const broadMusic=domain==='music'&&features.length===0&&!referenceArtist.test(item.title.trim());
 const base=broadMusic?Math.min(original,70):original;
 // One artist/place contributes once. Weak shared genre alone never trains a whole genre.
 const unique=new Map<string,TasteRating>();
 for(const r of [...ratings].sort((a,b)=>b.ratedAt.localeCompare(a.ratedAt))){const key=tasteDomain(r)+'|'+normalized(r.title);if(!unique.has(key))unique.set(key,r);}
 const related=[...unique.values()].filter(r=>tasteDomain(r)===domain&&tasteFeatures(r).filter(f=>features.includes(f)).length>=2);
 const adjustment=related.length>=2?Math.round(Math.max(-12,Math.min(12,related.reduce((sum,r)=>sum+(r.stars-3)*6,0)/(related.length+2)))):0;
 const reasons=[broadMusic?'Nur Musikrichtung belegt; Feinpassung offen':features.length?'Belegte Merkmale: '+features.join(', '):'Grundpassung aus deinen Vorgaben',adjustment?`${related.length} ähnliche bewertete Beispiele: ${adjustment>0?'+':''}${adjustment} Punkte`:''];
 return {score:Math.max(0,Math.min(100,base+adjustment)),reason:reasons.filter(Boolean).join(' · '),confidence:broadMusic?'broad':'features'};
}
export function starsMarkup(id:string,stars?:number,disabled=false){
 return `<div class="taste-stars" role="group" aria-label="Geschmack bewerten">${[1,2,3,4,5].map(n=>`<button type="button" data-taste-rate="${n}" data-taste-id="${escape(id)}" aria-label="${n} ${n===1?'Stern':'Sterne'} – ${starLabels[n-1]}" aria-pressed="${stars===n}" ${disabled?'disabled':''}>${n<=(stars??0)?'★':'☆'}</button>`).join('')}</div>`;
}
export function ratingSectionMarkup(id:string,stars?:number,disabled=true){return `<section class="rating-actions taste-rating" data-taste-wrap="${escape(id)}"><strong>Dein Geschmack</strong>${starsMarkup(id,stars,disabled)}<p data-taste-label>${stars?`${stars} / 5 · ${starLabels[stars-1]}`:'Noch nicht bewertet'}</p><button type="button" data-taste-details="${escape(id)}">Bewertung & Begründung</button></section>`;}
// Existing actual star ratings are copied in memory, and persisted on the next explicit save.
// Their original rating time is unknown; no timestamp is invented.
export function withExistingTasteRatings<T extends {tasteRatings?:TasteRating[];activityStock?:{id:string;sourceId?:string;title:string;kind:string;note:string;url:string;rating?:number}[];routines?:{id:string;title:string;next:string;mood:string;rating?:number}[]}>(state:T):T{
 const rows=[...(state.tasteRatings??[])];
 for(const r of state.activityStock??[]){const id=r.sourceId||'stock:'+r.id;if(r.rating&&!rows.some(x=>x.id===id))rows.push({id,title:r.title,category:r.kind,description:r.note,kind:r.kind,url:r.url,stars:r.rating,reason:'',ratedAt:''});}
 for(const r of state.routines??[]){const id='routine:'+r.id;if(r.rating&&!rows.some(x=>x.id===id))rows.push({id,title:r.title,category:r.mood,description:r.next,kind:'routine',url:'',stars:r.rating,reason:'',ratedAt:''});}
 return {...state,tasteRatings:rows};
}
