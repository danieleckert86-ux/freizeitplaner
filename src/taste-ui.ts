import {personalTasteFit,starsMarkup,starLabels,ratingSectionMarkup,type TasteRating,type TasteSuggestion} from './taste-profile';
const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const suggestions=new Map<string,TasteSuggestion>();
let profileSignature='';
let ratings:TasteRating[]=[],ready=false,busy=false,legacy=new Map<string,number>();
export function registerTasteSuggestion(item:TasteSuggestion){suggestions.set(item.id,item);}
export const tasteRatingMarkup=ratingSectionMarkup;
export function setLegacyTasteRatings(value:Map<string,number>){legacy=new Map(value);refreshTasteUI();}
export function tasteRatingById(id:string){return ratings.find(x=>x.id===id);}
export function effectiveLegacyRatings(value:Map<string,number>){const next=new Map(value);for(const r of ratings)next.set(r.id,r.stars<=2?-1:r.stars>=4?1:0);return next;}
export function publishTasteProfile(value:readonly TasteRating[],available:boolean){const signature=JSON.stringify([available,value]);if(signature===profileSignature)return;profileSignature=signature;ratings=[...value];ready=available;refreshTasteUI();document.dispatchEvent(new Event('taste-scores-changed'));}
export function adjustedTaste(item:TasteSuggestion){return personalTasteFit(item,ready?ratings:[]);}
export function refreshTasteUI(){
 document.querySelectorAll<HTMLElement>('[data-taste-wrap]').forEach(w=>{const id=w.dataset.tasteWrap!,r=tasteRatingById(id);w.querySelector('.taste-stars')!.outerHTML=starsMarkup(id,r?.stars,!ready||busy);const label=w.querySelector<HTMLElement>('[data-taste-label]')!;label.textContent=r?`${r.stars} / 5 · ${starLabels[r.stars-1]}`:legacy.has(id)?`Frühere Rückmeldung: ${legacy.get(id)===1?'positiv':'negativ'} · noch keine Sterne`:'Noch nicht bewertet';});
 const host=document.querySelector<HTMLElement>('#tasteArchive');if(!host)return;
 const open=host.querySelector('details')?.open??false;
 host.innerHTML=`<details ${open?'open':''}><summary>Mein Geschmack <span>${ratings.length} Bewertungen</span></summary><p>Deine Bewertungen bleiben auch nach dem Eventtermin erhalten. 1 = gefällt mir gar nicht · 3 = okay · 5 = trifft meinen Geschmack genau.</p>${!ready?'<p>Geschmacksprofil wird geladen oder ist gerade nicht erreichbar.</p>':ratings.length?`<div class="taste-archive-list">${ratings.map(r=>`<div class="taste-archive-row"><div><strong>${e(r.title)}</strong><small>${e(r.category)}${r.date?' · '+e(r.date):''}</small></div><span>${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span><button type="button" data-taste-details="${e(r.id)}">Mehr</button></div>`).join('')}</div>`:'<p>Noch keine Sternebewertungen. Bewerte eine Idee unter „Mehr“.</p>'}</details>`;
}
function dialogMarkup(item:TasteSuggestion){const rating=tasteRatingById(item.id),fit=adjustedTaste(item);return `<header><h2>${e(item.title)}</h2><button type="button" data-taste-close aria-label="Bewertungsfenster schließen">×</button></header><p>Bewerte ausschließlich deinen Geschmack – unabhängig vom Termin.</p>${starsMarkup(item.id,rating?.stars,!ready||busy)}<p data-dialog-rating>${rating?`${rating.stars} / 5 · ${starLabels[rating.stars-1]}`:'Noch nicht bewertet'}</p><p role="status" data-taste-status></p><form id="tasteReasonForm"><label>Warum? (optional)<textarea name="reason" maxlength="1000" placeholder="Zum Beispiel: Stimme gefällt mir besonders">${e(rating?.reason??'')}</textarea></label><button type="submit" ${!rating?'disabled':''}>Begründung speichern</button></form><p class="taste-fit-explanation">${e(fit.reason)}</p><details><summary>Gespeicherte Beschreibung & Merkmale</summary><p>${e(item.description||'Keine ausführliche Beschreibung vorhanden.')}</p>${item.facts?.length?'<p>'+item.facts.map(e).join(' · ')+'</p>':''}${item.url?`<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">Originalquelle</a>`:''}</details>${rating?`<button type="button" data-taste-rate="0" data-taste-id="${e(item.id)}">Bewertung entfernen</button>`:''}`;}
function openTasteDetails(id:string){const item=ratings.find(r=>r.id===id)||suggestions.get(id);if(!item)return;let dialog=document.querySelector<HTMLDialogElement>('#tasteRatingDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='tasteRatingDialog';dialog.className='taste-dialog';document.body.append(dialog);}dialog.dataset.tasteId=id;dialog.setAttribute('aria-label','Geschmacksbewertung zu '+item.title);dialog.innerHTML=dialogMarkup(item);if(!dialog.open)dialog.showModal();}
async function saveRating(item:TasteSuggestion,stars:number,reason:string){
 if(!ready||busy)return;busy=true;refreshTasteUI();
 const dialog=document.querySelector<HTMLDialogElement>('#tasteRatingDialog');dialog?.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);
 const result=await new Promise<{ok:boolean;message:string}>(resolve=>document.dispatchEvent(new CustomEvent('taste-rating-request',{detail:{item,stars,reason,done:(ok:boolean,message:string)=>resolve({ok,message})}})));
 busy=false;refreshTasteUI();
 if(dialog?.open){const id=dialog.dataset.tasteId!,current=ratings.find(r=>r.id===id)||suggestions.get(id)||item;dialog.innerHTML=dialogMarkup(current);dialog.querySelector<HTMLElement>('[data-taste-status]')!.textContent=result.message;}
 else {const status=document.querySelector<HTMLElement>('#tasteStatus');if(status)status.textContent=result.message;}
}
export function initTasteUI(){
 document.addEventListener('click',ev=>{const target=ev.target as Element;if(target.closest('[data-taste-close]')){document.querySelector<HTMLDialogElement>('#tasteRatingDialog')?.close();return;}
  const detail=target.closest<HTMLElement>('[data-taste-details]');if(detail){openTasteDetails(detail.dataset.tasteDetails!);return;}
  const button=target.closest<HTMLButtonElement>('[data-taste-rate]');if(!button||button.disabled)return;const id=button.dataset.tasteId!,stars=Number(button.dataset.tasteRate);const item=ratings.find(r=>r.id===id)||suggestions.get(id);if(!item||!Number.isInteger(stars)||stars<0||stars>5)return;
  const dialog=button.closest<HTMLDialogElement>('#tasteRatingDialog');const reason=dialog?.querySelector<HTMLTextAreaElement>('textarea')?.value??tasteRatingById(id)?.reason??'';void saveRating(item,stars,reason);
 });
 document.addEventListener('submit',ev=>{const form=(ev.target as Element).closest<HTMLFormElement>('#tasteReasonForm');if(!form)return;ev.preventDefault();const id=form.closest<HTMLElement>('[data-taste-id]')?.dataset.tasteId||document.querySelector<HTMLDialogElement>('#tasteRatingDialog')?.dataset.tasteId;const r=ratings.find(x=>x.id===id);if(r)void saveRating(r,r.stars,String(new FormData(form).get('reason')||''));});
}
