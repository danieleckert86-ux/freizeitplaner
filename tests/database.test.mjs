import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
function factory(env,fetcher){
 const source=fs.readFileSync(new URL('../src/database.ts',import.meta.url),'utf8').replace("import {createClient} from '@supabase/supabase-js';",'').replace('export function','function').replaceAll('import.meta.env','env');
 const code=ts.transpile(source,{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022});
 return new Function('createClient','env','fetch',code+';return createLeisureDatabase();')(createClient,env,fetcher);
}
const base='https://fahrrad-zur-arbei.vercel.app/api/leisure/database';
test('Neon-backed planner uses the exact API and does not send Supabase credentials',async()=>{
 let sent;const client=factory({VITE_LEISURE_DATABASE_URL:base},async(url,init)=>{sent={url:String(url),init};return new Response(JSON.stringify([{payload:{version:1},revision:12}]),{status:200,headers:{'content-type':'application/json'}});});
 const result=await client.from('personal_planning').update({payload:{version:1}}).eq('id','shared').eq('revision',11).select('payload,revision').maybeSingle();
 assert.equal(result.error,null);assert.equal(result.data.revision,12);
 assert(sent.url.startsWith(base+'/rest/v1/personal_planning?'));assert(sent.url.includes('revision=eq.11'));
 assert.equal(sent.init.headers.get('authorization'),null);assert.equal(sent.init.headers.get('apikey'),null);
 assert.deepEqual(JSON.parse(sent.init.body),{payload:{version:1}});
});
test('stale revision is returned as an empty CAS result',async()=>{
 const client=factory({VITE_LEISURE_DATABASE_URL:base},async()=>new Response('[]',{status:200,headers:{'content-type':'application/json'}}));
 const result=await client.from('personal_planning').update({payload:{version:1}}).eq('id','shared').eq('revision',11).select('payload,revision').maybeSingle();
 assert.equal(result.error,null);assert.equal(result.data,null);
});
test('unexpected database targets fail before any network access',()=>{
 assert.throws(()=>factory({VITE_LEISURE_DATABASE_URL:'https://example.org'},()=>{throw Error('must not fetch');}),/Ungültige/);
});
