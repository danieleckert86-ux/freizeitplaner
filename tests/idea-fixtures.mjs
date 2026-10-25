import {createClient} from '@supabase/supabase-js';
export const routine={id:'custom',title:'Meine kleine Radtour',minutes:90,energy:'medium',effort:'spontaneous',mood:'movement',activityCategory:'movement',setting:'outside',outdoor:true,next:'Meine Vorbereitung',favorite:true,ratingScore:85};
export const place={id:'place',title:'Mein Ort',kind:'bike-short',minutes:80,travelMinutes:37,distanceKm:22,elevationM:70,setting:'outside',energy:'medium',effort:'prepare',note:'Eigene Notiz',url:'https://example.org/tour',favorite:true,rating:4,sourceId:'old-source',importedSourceIds:['alias'],sourceDetails:[{description:'Beleg',checkedAt:'2026-10-11T10:00:00Z',other:'Erhalten'}]};
export const state=()=>({version:1,knownActivitiesVersion:1,stockMapsVersion:1,routines:[structuredClone(routine)],activityStock:[structuredClone(place)],appointments:[],slots:[],entries:[],checks:['2026-10-22'],googleSync:{lastSuccess:'2026-10-20T10:00Z'},unknownField:{important:'keep'},tasteProfiles:{},tasteAssessments:{}});
export function fixture(){
 const data={payload:state(),revision:42,hidden:[],favorites:[],ratings:[],writes:[],requests:[],mode:'normal'};
 const fetcher=async(input,init)=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1),method=init.method||'GET';data.requests.push({table,method});
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  if(method==='PATCH'){
   const body=JSON.parse(init.body);data.writes.push(body);
   if(data.mode==='error')throw Error('offline');
   if(data.mode==='conflict'){data.revision++;data.payload.unknownField.concurrent='keep';data.mode='normal';return reply(null);}
   data.payload=body.payload;data.revision++;
   const row={payload:data.payload,revision:data.revision};
   if(data.mode==='reordered')row.payload=Object.fromEntries(Object.entries(row.payload).reverse());
   return reply(row);
  }
  if(table==='personal_planning')return reply({payload:data.payload,revision:data.revision});
  if(table==='hidden_recommendations')return data.mode==='hidden-failure'?reply({},503):reply(data.hidden);
  if(table==='favorites')return reply(data.favorites);
  if(table==='recommendation_ratings')return reply(data.ratings);
  throw Error('Unexpected external request '+table);
 };
 return {data,database:createClient('https://fixture.example','mock-publishable',{global:{fetch:fetcher},auth:{persistSession:false,autoRefreshToken:false}})};
}
