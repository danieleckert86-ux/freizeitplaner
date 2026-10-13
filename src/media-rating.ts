export function imdbRating(value:unknown):number|null {
 return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=10?value:null;
}
export function mediaRecommendationAllowed(item:{imdbRating?:unknown}){
 const rating=imdbRating(item.imdbRating);return rating===null||rating>=7;
}
export function imdbTitleUrl(value:unknown):string {
 if(typeof value!=='string')return '';
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['imdb.com','www.imdb.com'].includes(u.hostname)&&/^\/title\/tt\d+(?:\/|$)/.test(u.pathname)?u.href:'';}catch{return '';}
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function imdbMarkup(item:{imdbRating?:unknown;imdbUrl?:unknown}){
 const rating=imdbRating(item.imdbRating);if(rating===null)return '';
 const label='IMDb '+rating.toFixed(1).replace('.',',')+'/10',url=imdbTitleUrl(item.imdbUrl);
 return url?`<a class="imdb-rating" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span class="imdb-rating">${label}</span>`;
}
export function germanTrailerMarkup(item:{trailerUrl?:unknown;trailerLanguage?:unknown}){
 if(item.trailerLanguage!=='de'||typeof item.trailerUrl!=='string')return '';
 try{
  const url=new URL(item.trailerUrl);
  if(url.protocol!=='https:'||url.username||url.password)return '';
  return `<a class="trailer-link trailer-meta" href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">▶ Deutscher Trailer</a>`;
 }catch{return '';}
}
