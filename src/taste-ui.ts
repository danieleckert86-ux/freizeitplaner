import {personalTasteFit,starsMarkup,ratingScore,scoreLabel,validScore,ratingSectionMarkup,type TasteRating,type TasteSuggestion} from './taste-profile';
const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const suggestions=new Map<string,TasteSuggestion>();
const detailProviders=new Map<string,()=>HTMLElement>();
export function registerTasteDetails(id:string,provider:()=>HTMLElement){detailProviders.set(id,provider);}
export function closeTasteDetails(){document.querySelector<HTMLDialogElement>('#tasteRatingDialog')?.close();}
let profileSignature='';
let returnDialogId='';
let ratings:TasteRating[]=[],ready=false,busy=false,legacy=new Map<string,number>();
export function registerTasteSuggestion(item:TasteSuggestion){suggestions.set(item.id,item);}
export const tasteRatingMarkup=ratingSectionMarkup;
export function setLegacyTasteRatings(value:Map<string,number>){legacy=new Map(value);refreshTasteUI();}
export function tasteRatingById(id:string){return ratings.find(x=>x.id===id);}
export function effectiveLegacyRatings(value:Map<string,number>){const next=new Map(value);for(const r of ratings){const score=ratingScore(r)!;next.set(r.id,score<40?-1:score>60?1:0);}return next;}
export function publishTasteProfile(value:readonly TasteRating[],available:boolean){const signature=JSON.stringify([available,value]);if(signature===profileSignature)return;profileSignature=signature;ratings=[...value];ready=available;refreshTasteUI();document.dispatchEvent(new Event('taste-scores-changed'));}
export function adjustedTaste(item:TasteSuggestion){return personalTasteFit(item,ready?ratings:[]);}
export function refreshTasteUI(){
 document.querySelectorAll<HTMLElement>('[data-taste-wrap]').forEach(w=>{const id=w.dataset.tasteWrap!,r=tasteRatingById(id),score=r?ratingScore(r):undefined;w.querySelector<HTMLElement>('[data-taste-label]')!.textContent=score!==undefined?score+' / 100':legacy.has(id)?'Frühere Rückmeldung: '+(legacy.get(id)===1?'positiv':'negativ'):'Noch nicht bewertet';const button=w.querySelector<HTMLButtonElement>('[data-taste-details]')!;button.disabled=!ready||busy;button.textContent=score===undefined?'Bewerten':'Bewertung ändern';});
 const host=document.querySelector<HTMLElement>('#tasteArchive');if(!host)return;
 const open=host.querySelector('details')?.open??false;
 host.innerHTML='<details '+(open?'open':'')+'><summary>Mein Geschmack <span>'+ratings.length+' Bewertungen</span></summary><p>Deine Bewertungen bleiben auch nach dem Eventtermin erhalten. 0 = gar nicht · 50 = okay · 100 = genau mein Geschmack. Frühere Sterne: 1/2/3/4/5 → 0/25/50/75/100.</p>'+(!ready?'<p>Geschmacksprofil wird geladen oder ist gerade nicht erreichbar.</p>':ratings.length?'<div class="taste-archive-list">'+ratings.map(r=>'<div class="taste-archive-row"><div><strong>'+e(r.title)+'</strong><small>'+e(r.category)+(r.date?' · '+e(r.date):'')+'</small></div><span>'+ratingScore(r)+' / 100</span><button type="button" data-taste-details="'+e(r.id)+'">Mehr</button></div>').join('')+'</div>':'<p>Noch keine Bewertungen. Bewerte eine Idee unter „Mehr“.</p>')+'</details>';
}
function dialogMarkup(item:TasteSuggestion){
 const rating=tasteRatingById(item.id),score=rating?ratingScore(rating):undefined,fit=adjustedTaste(item);
 return '<header><div><p class="taste-eyebrow">DEIN GESCHMACK</p><h2>'+e(item.title)+'</h2></div><button type="button" data-taste-close aria-label="Bewertungsfenster schließen">×</button></header><p class="taste-hint">Wie gut passt das zu dir? Der Termin spielt keine Rolle.</p><form id="tasteReasonForm">'+starsMarkup(item.id,score,!ready||busy,false)+'<p class="taste-draft-note" data-dialog-rating></p><details class="taste-reason" '+(rating?.reason?'open':'')+'><summary>Begründung '+(rating?.reason?'bearbeiten':'hinzufügen')+' <span>optional</span></summary><label class="sr-only" for="tasteReasonInput">Deine Begründung</label><textarea id="tasteReasonInput" name="reason" rows="2" maxlength="1000" placeholder="Was gefällt dir – oder was fehlt?">'+e(rating?.reason??'')+'</textarea></details><p role="status" data-taste-status></p><footer class="taste-form-actions"><button type="button" data-taste-close>Abbrechen</button><button type="submit" class="taste-primary" '+(!ready||busy?'disabled':'')+'>Speichern</button></footer></form><details class="taste-extra" open><summary>Details zum Vorschlag</summary><p class="planner-small">'+e(item.category)+(item.date?' · '+e(item.date):'')+'</p><p>'+e(item.description||'Keine ausführliche Beschreibung vorhanden.')+'</p>'+(item.facts?.length?'<p>'+item.facts.map(e).join(' · ')+'</p>':'')+(item.url?'<p><a href="'+e(item.url)+'" target="_blank" rel="noopener noreferrer">Originalquelle öffnen</a></p>':'')+'<p class="planner-small">'+e(fit.reason)+'</p>'+(rating?'<button type="button" class="taste-remove" data-taste-remove="'+e(item.id)+'">Bewertung entfernen</button>':'')+'</details>';
}
export function openTasteDetails(id:string,extra?:HTMLElement){const item=suggestions.get(id)||ratings.find(r=>r.id===id);if(!item)return;let dialog=document.querySelector<HTMLDialogElement>('#tasteRatingDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='tasteRatingDialog';dialog.className='taste-dialog';document.body.append(dialog);dialog.addEventListener('close',()=>{const previous=returnDialogId?document.getElementById(returnDialogId) as HTMLDialogElement|null:null;returnDialogId='';if(previous?.isConnected&&!previous.open)previous.showModal();});}dialog.dataset.tasteId=id;dialog.setAttribute('aria-label','Geschmacksbewertung zu '+item.title);dialog.innerHTML=dialogMarkup(item);const extraDetails=extra??detailProviders.get(id)?.();if(extraDetails)dialog.querySelector('.taste-extra')!.append(extraDetails);if(!dialog.open){const previous=document.querySelector<HTMLDialogElement>('dialog[open]');returnDialogId=previous?.id??'';previous?.close();dialog.showModal();}}
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
 document.addEventListener('submit',ev=>{const form=(ev.target as Element).closest<HTMLFormElement>('#tasteReasonForm');if(!form)return;ev.preventDefault();const id=form.closest<HTMLDialogElement>('#tasteRatingDialog')?.dataset.tasteId,score=Number(form.querySelector<HTMLInputElement>('[data-taste-score]')!.value),item=ratings.find(x=>x.id===id)||suggestions.get(id!);if(item&&validScore(score))void saveRating(item,score,String(new FormData(form).get('reason')||''));});
}
