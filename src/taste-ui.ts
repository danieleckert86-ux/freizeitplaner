import {tasteSettingsMarkup,profileAssessment} from './taste-settings-ui';
import {foodPlace,googleMapsPlaceUrl} from './locations.ts';
import {ratingScore,scoreLabel,validScore,ratingSectionMarkup,tasteArchiveRatings,tasteScopeLabels,type TasteScope,type TasteRating,type TasteSuggestion} from './taste-profile';
const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const suggestions=new Map<string,TasteSuggestion>();
const detailProviders=new Map<string,()=>HTMLElement>();
export function registerTasteDetails(id:string,provider:()=>HTMLElement){detailProviders.set(id,provider);}
export function closeTasteDetails(){document.querySelector<HTMLDialogElement>('#tasteRatingDialog')?.close();}
let archiveScope:TasteScope='standard';
export function setTasteArchiveScope(scope:TasteScope){if(scope===archiveScope)return;archiveScope=scope;refreshTasteUI();}
let profileSignature='';
let returnDialogId='';
let ratings:TasteRating[]=[],ready=false,busy=false,legacy=new Map<string,number>();
export function registerTasteSuggestion(item:TasteSuggestion){suggestions.set(item.id,item);}
export const tasteRatingMarkup=(id:string)=>'<span hidden class="rating-actions" data-taste-wrap="'+e(id)+'"></span>';
void ratingSectionMarkup;
export function setLegacyTasteRatings(value:Map<string,number>){legacy=new Map(value);void legacy;refreshTasteUI();}
export function tasteRatingById(id:string){return ratings.find(x=>x.id===id);}
export function effectiveLegacyRatings(value:Map<string,number>){const next=new Map(value);for(const r of ratings){const score=ratingScore(r)!;next.set(r.id,score<40?-1:score>60?1:0);}return next;}
export function publishTasteProfile(value:readonly TasteRating[],available:boolean){const signature=JSON.stringify([available,value]);if(signature===profileSignature)return;profileSignature=signature;ratings=[...value];ready=available;refreshTasteUI();document.dispatchEvent(new Event('taste-scores-changed'));}
export function adjustedTaste(item:TasteSuggestion){const a=profileAssessment(item);return {score:null as number|null,reason:a?a.reason+(a.caveat?' · Vorbehalt: '+a.caveat:''):'Noch kein Inhaltsabgleich mit deinem aktuellen Profil dokumentiert.',confidence:a?.status??'pending'};}
export function refreshTasteUI(){
 const host=document.querySelector<HTMLElement>('#tasteArchive');if(!host)return;
 const open=host.querySelector('details')?.open??false;
 const visible=tasteArchiveRatings(ratings,archiveScope);
 host.setAttribute('aria-label','Mein Geschmack · '+tasteScopeLabels[archiveScope]);
 host.innerHTML=tasteSettingsMarkup(archiveScope)+'<details '+(open?'open':'')+'><summary>Bisherige Bewertungen · '+tasteScopeLabels[archiveScope]+' <span>'+visible.length+'</span></summary><p>Als persönliche Beispiele erhalten. Neue Einzelbewertungen sind nicht erforderlich.</p>'+(visible.length?'<div class="taste-archive-list">'+visible.map(r=>'<div class="taste-archive-row"><div><strong>'+e(r.title)+'</strong><p>'+e(r.reason)+'</p></div><span>'+ratingScore(r)+' / 100</span><button type="button" data-taste-details="'+e(r.id)+'">Details</button></div>').join('')+'</div>':'<p>Keine bisherigen Bewertungen in dieser Kategorie.</p>')+'</details>';
}
function dialogMarkup(item:TasteSuggestion){
 const rating=tasteRatingById(item.id),fit=adjustedTaste(item);
 return '<header><div><p class="taste-eyebrow">DETAILS</p><h2>'+e(item.title)+'</h2></div><button type="button" data-taste-close aria-label="Details schließen">×</button></header><details class="taste-extra" open><summary>Inhalt und persönliche Passung</summary><p>'+e(item.category)+'</p><p>'+e(item.description||'Ausführliche Beschreibung noch offen.')+'</p>'+(item.facts?.length?'<p>'+item.facts.map(e).join(' · ')+'</p>':'')+'<p>'+e(fit.reason)+'</p>'+(item.url||foodPlace(item)?'<p><a href="'+e(foodPlace(item)?googleMapsPlaceUrl(item):item.url)+'" target="_blank" rel="noopener noreferrer">'+(foodPlace(item)?'Google Maps öffnen':'Originalquelle öffnen')+'</a></p>':'')+(rating?'<p class="planner-small">Bisherige Bewertung: '+ratingScore(rating)+' / 100'+(rating.reason?' · '+e(rating.reason):'')+'</p>':'')+'</details>';
}
export function openTasteDetails(id:string,extra?:HTMLElement){const item=suggestions.get(id)||ratings.find(r=>r.id===id);if(!item)return;let dialog=document.querySelector<HTMLDialogElement>('#tasteRatingDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='tasteRatingDialog';dialog.className='taste-dialog';document.body.append(dialog);dialog.addEventListener('close',()=>{const previous=returnDialogId?document.getElementById(returnDialogId) as HTMLDialogElement|null:null;returnDialogId='';if(previous?.isConnected&&!previous.open)previous.showModal();});}dialog.dataset.tasteId=id;dialog.setAttribute('aria-label','Details zu '+item.title);dialog.innerHTML=dialogMarkup(item);const extraDetails=extra??detailProviders.get(id)?.();if(extraDetails)dialog.querySelector('.taste-extra')!.append(extraDetails);if(!dialog.open){const previous=document.querySelector<HTMLDialogElement>('dialog[open]');returnDialogId=previous?.id??'';previous?.close();dialog.showModal();}}
async function saveRating(item:TasteSuggestion,score:number|null,reason:string){
 if(!ready||busy)return;busy=true;refreshTasteUI();
 const dialog=document.querySelector<HTMLDialogElement>('#tasteRatingDialog');dialog?.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(b=>b.disabled=true);
 const result=await new Promise<{ok:boolean;message:string}>(resolve=>document.dispatchEvent(new CustomEvent('taste-rating-request',{detail:{item,score,reason,done:(ok:boolean,message:string)=>resolve({ok,message})}})));
 busy=false;refreshTasteUI();
 if(dialog?.open&&!result.ok){dialog.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(b=>b.disabled=false);dialog.querySelector<HTMLElement>('[data-taste-status]')!.textContent=result.message;return;}
 dialog?.close();const status=document.querySelector<HTMLElement>('#tasteStatus');if(status){status.textContent=result.message;setTimeout(()=>{if(status.textContent===result.message)status.textContent='';},6000);}
}
export function initTasteUI(){
 document.addEventListener('input',ev=>{const input=ev.target as HTMLInputElement;if(!input.matches('[data-taste-score]'))return;input.dataset.dirty='true';const group=input.closest('.taste-slider')!,score=Number(input.value);group.querySelector('output')!.textContent=score+' / 100';input.setAttribute('aria-valuetext',score+' von 100 · '+scoreLabel(score));const note=input.closest('[data-taste-wrap],#tasteRatingDialog')?.querySelector<HTMLElement>('[data-dialog-rating],[data-taste-label]');if(note)note.textContent=input.closest('#tasteRatingDialog')?'Noch nicht gespeichert':score+' / 100 · '+scoreLabel(score)+' · noch nicht gespeichert';});
 document.addEventListener('click',ev=>{
  const target=ev.target as Element;if(target.closest('[data-taste-close]')){document.querySelector<HTMLDialogElement>('#tasteRatingDialog')?.close();return;}
  const detail=target.closest<HTMLElement>('[data-taste-details]');if(detail){openTasteDetails(detail.dataset.tasteDetails!);return;}
  const button=target.closest<HTMLButtonElement>('[data-taste-save],[data-taste-remove]');if(!button||button.disabled)return;
  const id=button.dataset.tasteSave??button.dataset.tasteRemove!,score=button.hasAttribute('data-taste-remove')?null:Number(button.closest('.taste-slider')!.querySelector<HTMLInputElement>('input')!.value);
  const item=ratings.find(r=>r.id===id)||suggestions.get(id);if(!item||score!==null&&!validScore(score))return;
  const reason=button.closest('#tasteRatingDialog')?.querySelector<HTMLTextAreaElement>('textarea')?.value??tasteRatingById(id)?.reason??'';void saveRating(item,score,reason);
 });
 document.addEventListener('submit',ev=>{const form=(ev.target as Element).closest<HTMLFormElement>('#tasteReasonForm');if(!form)return;ev.preventDefault();const id=form.closest<HTMLDialogElement>('#tasteRatingDialog')?.dataset.tasteId,score=Number(form.querySelector<HTMLInputElement>('[data-taste-score]')!.value),item=suggestions.get(id!)||ratings.find(x=>x.id===id);if(item&&validScore(score))void saveRating(item,score,String(new FormData(form).get('reason')||''));});
}

document.addEventListener('taste-settings-changed',()=>{refreshTasteUI();document.dispatchEvent(new Event('taste-scores-changed'));});
