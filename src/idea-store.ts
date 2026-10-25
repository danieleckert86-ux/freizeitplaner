import type {SupabaseClient} from '@supabase/supabase-js';
import {validState,type State} from './personal-state.ts';
import {withKnownActivities} from './known-activities.ts';
import {withMapsStock} from './maps-stock.ts';

export type SavedIdea={id:string;suggestion_id:string;title:string;category:string;description:string;url:string;day:string;saved_at:string};
export type Decisions={ready:boolean;hidden:Set<string>;ratings:Map<string,number>};
const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
export class IdeaStore {
 state:State|null=null;
 revision=-1;
 saving=false;
 uncertain=false;
 favorites:SavedIdea[]=[];
 favoritesReady=false;
 decisions:Decisions={ready:false,hidden:new Set(),ratings:new Map()};
 private database:SupabaseClient;
 constructor(database:SupabaseClient){this.database=database;}
 async load(){
  const results=await Promise.allSettled([
   this.database.from('personal_planning').select('payload,revision').eq('id','shared').abortSignal(AbortSignal.timeout(12000)).single(),
   this.database.from('favorites').select('id,suggestion_id,title,day,category,description,url,saved_at').order('saved_at',{ascending:false}).abortSignal(AbortSignal.timeout(12000)),
   this.database.from('hidden_recommendations').select('suggestion_id').abortSignal(AbortSignal.timeout(12000)),
   this.database.from('recommendation_ratings').select('suggestion_id,rating').abortSignal(AbortSignal.timeout(12000)),
  ] as const);
  const personal=results[0].status==='fulfilled'?results[0].value:null;
  const favorites=results[1].status==='fulfilled'?results[1].value:null;
  const hidden=results[2].status==='fulfilled'?results[2].value:null;
  const ratings=results[3].status==='fulfilled'?results[3].value:null;
  this.decisions={ready:false,hidden:new Set(),ratings:new Map()};
  if(hidden&&!hidden.error&&Array.isArray(hidden.data)&&ratings&&!ratings.error&&Array.isArray(ratings.data)){
   this.decisions={ready:true,hidden:new Set(hidden.data.map(x=>String(x.suggestion_id))),ratings:new Map(ratings.data.map(x=>[String(x.suggestion_id),Number(x.rating)]))};
  }
  this.favoritesReady=!!favorites&&!favorites.error&&Array.isArray(favorites.data);
  this.favorites=this.favoritesReady?favorites!.data as SavedIdea[]:[];
  if(!personal||personal.error||!validState(personal.data?.payload)||!Number.isSafeInteger(Number(personal.data.revision))||Number(personal.data.revision)<0)throw Error('Die Sammlung konnte nicht sicher geladen werden. Bitte erneut laden.');
  // Same one-time legacy adapters as the previous app; read-only, no reseeding after markers.
  this.state=withMapsStock(withKnownActivities(structuredClone(personal.data.payload)));
  this.revision=Number(personal.data.revision);this.uncertain=false;
 }
 async save(change:(draft:State)=>void):Promise<'saved'|'conflict'>{
  if(!this.state||this.saving||this.uncertain)throw Error('Bitte zuerst den aktuellen gespeicherten Stand neu laden.');
  const draft=structuredClone(this.state);change(draft);
  if(!validState(draft))throw Error('Bitte die Eingaben prüfen. Die Änderung ist nicht gültig.');
  this.saving=true;
  try{
   const {data,error}=await this.database.from('personal_planning').update({payload:draft}).eq('id','shared').eq('revision',this.revision).select('payload,revision').abortSignal(AbortSignal.timeout(12000)).maybeSingle();
   if(error)throw error;
   if(!data){await this.load();return 'conflict';}
   if(!validState(data.payload)||!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<=this.revision||JSON.stringify(canonical(data.payload))!==JSON.stringify(canonical(draft)))throw Error('unconfirmed_write');
   this.state=structuredClone(data.payload);this.revision=Number(data.revision);return 'saved';
  }catch{this.uncertain=true;throw Error('Speicherung nicht bestätigt. Deine Eingaben bleiben im Formular. Bitte neu laden, bevor du erneut speicherst.');}
  finally{this.saving=false;}
 }
}
