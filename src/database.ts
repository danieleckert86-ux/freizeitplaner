import {createClient} from '@supabase/supabase-js';

export function createLeisureDatabase(){
 const neonBase=import.meta.env.VITE_LEISURE_DATABASE_URL as string|undefined;
 if(!neonBase)return createClient('https://mcpkvssierkwmueekyec.supabase.co','sb_publishable_LKYbSfFZ4WBWPnRpLfxyFQ_tqMGThd2');
 const url=new URL(neonBase);
 if(url.origin!=='https://fahrrad-zur-arbei.vercel.app'||url.pathname!=='/api/leisure/database')throw Error('Ungültige Planer-Verbindung');
 // Only the PostgREST query builder is reused. No Supabase authentication,
 // database password or privileged credential is sent to the Neon-backed API.
 return createClient(url.href,'shared-planner',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
  const requestHeaders=new Headers(init?.headers);requestHeaders.delete('authorization');requestHeaders.delete('apikey');
  return fetch(input,{...init,headers:requestHeaders});
 }}});
}
