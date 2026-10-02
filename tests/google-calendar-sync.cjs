const vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const clone=value=>JSON.parse(JSON.stringify(value));
const target='288aa1dd08b3218ae703dae006e7ce15c40a882d7732978073deb16ea0889a7d@group.calendar.google.com';
function harness(initial) {
 let cloud={payload:clone(initial),revision:1},events={},props={},calls=[],seq=0,failCas=false,failGet=false;
 const ctx={console,Date,JSON,Error,Number,Object,Array,String,Utilities:{DigestAlgorithm:{SHA_256:'sha256'},
   computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),
   formatDate:(d,z,f)=>f==='HH:mm'?new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d):new Intl.DateTimeFormat('sv-SE',{timeZone:z}).format(d)},
 PropertiesService:{getScriptProperties:()=>({getProperties:()=>clone(props),getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v,setProperties:o=>Object.assign(props,o),deleteProperty:k=>delete props[k]})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>({timeBased(){return this},everyMinutes(n){assert.equal(n,5);return this},create(){}})},
 UrlFetchApp:{fetch:(url,o)=>{assert(url.includes('personal_planning'));let result,status=200;
   if(o.method==='patch') {const revision=Number(url.split('revision=eq.')[1]);if(failCas || revision!==cloud.revision)result=[];else {cloud={payload:JSON.parse(o.payload).payload,revision:cloud.revision+1};result=[cloud];}}
   else result=[cloud];return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(result)};}},
 Calendar:{Events:{
   get:(calendar,id)=>{assert.equal(calendar,target);if(failGet)throw Error('503 unavailable');if(!events[id])throw Error('404 Not Found');return clone(events[id]);},
   insert:(body,calendar)=>{assert.equal(calendar,target);if(events[body.id])throw Error('409 duplicate');const ev={...clone(body),status:'confirmed',etag:'v'+(++seq)};events[ev.id]=ev;calls.push(['insert',ev.id]);return clone(ev);},
   patch:(body,calendar,id,o,h)=>{assert.equal(calendar,target);assert.equal(h['If-Match'],events[id].etag);events[id]={...events[id],...clone(body),etag:'v'+(++seq)};calls.push(['patch',id]);return clone(events[id]);},
   remove:(calendar,id,o,h)=>{assert.equal(calendar,target);assert.equal(h['If-Match'],events[id].etag);events[id]={id,status:'cancelled',etag:'v'+(++seq)};calls.push(['remove',id]);},
   list:(calendar,o)=>{assert.equal(calendar,target);return {items:Object.values(events).filter(ev=>ev.status!=='cancelled'&&!ev.recurrence?.length).map(clone)};}
 }}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/google-calendar/Code.gs','utf8'),ctx);
 return {sync:()=>ctx.syncFreizeitplaner(),ctx,get state(){return clone(cloud.payload)},get events(){return events},get calls(){return calls},set(row){cloud={payload:clone(row),revision:cloud.revision+1}},failCas(v){failCas=v},failGet(v){failGet=v},add(ev){events[ev.id]={status:'confirmed',etag:'v'+(++seq),...clone(ev)}},change(id,patch){events[id]={...events[id],...clone(patch),etag:'v'+(++seq)}}};
}
const blank=()=>({version:1,entries:[],appointments:[],slots:[],checks:[]});
const entry=()=>({id:'planned',title:'Schwimmen',date:'2026-10-03',start:'10:00',end:'11:30',url:'',slotId:'slot',status:'Vorgeschlagen',createdAt:'2026-10-02T10:00:00Z',proposedAt:'2026-10-02T10:00:00Z',organizedAt:'',doneAt:'',note:'Bitte Öffnungszeiten prüfen',next:'Tasche packen'});
const ev=(id,title='Google-Termin',date='2026-10-04')=>({id,summary:title,start:{dateTime:date+'T14:00:00+02:00'},end:{dateTime:date+'T15:00:00+02:00'}});
let state=blank();state.entries=[entry(),{...entry(),id:'unscheduled',date:'',start:'',end:''}];
const h=harness(state);h.sync();assert.equal(h.calls.filter(c=>c[0]==='insert').length,1);const id=h.calls[0][1];h.sync();assert.equal(h.calls.length,1);
state=h.state;state.entries[0].start='12:00';state.entries[0].end='13:30';h.set(state);h.sync();assert.equal(h.events[id].start.dateTime,'2026-10-03T12:00:00');
h.change(id,{summary:'Schwimmen im Freibad',start:{dateTime:'2026-10-03T16:00:00+02:00'},end:{dateTime:'2026-10-03T17:30:00+02:00'}});state=h.state;state.entries[0].start='18:00';state.entries[0].end='19:30';h.set(state);h.sync();assert.equal(h.state.entries[0].start,'16:00');assert.equal(h.state.entries[0].note,'Bitte Öffnungszeiten prüfen');assert(h.state.entries[0].proposedAt);
h.change(id,{status:'cancelled'});h.sync();assert.equal(h.state.entries[0].date,'');assert.equal(h.state.entries[0].status,'Vorgeschlagen');
// Replanning the same activity can recover a Google tombstone with a new ID.
state=h.state;Object.assign(state.entries[0],{date:'2026-10-05',start:'10:00',end:'11:00'});h.set(state);h.sync();assert.equal(h.calls.filter(c=>c[0]==='insert').length,2);
// Google inserts/moves/deletes, app deletion, and multi-day all-day segmentation.
const g=harness(blank());g.add(ev('external'));g.sync();assert.equal(g.state.appointments.length,1);g.change('external',{start:{dateTime:'2026-10-05T12:00:00+02:00'},end:{dateTime:'2026-10-05T13:00:00+02:00'}});g.sync();assert.equal(g.state.appointments[0].date,'2026-10-05');state=g.state;state.appointments=[];g.set(state);g.sync();assert.equal(g.events.external.status,'cancelled');g.sync();assert.equal(g.state.appointments.length,0);
g.add({id:'allday',summary:'Urlaub',start:{date:'2026-10-04'},end:{date:'2026-10-07'}});g.sync();assert.deepEqual(g.state.appointments.map(r=>r.date),['2026-10-04','2026-10-05','2026-10-06']);assert(g.state.appointments.every(r=>r.googleAllDay));state=g.state;state.appointments.splice(1,1);g.set(state);g.sync();assert.equal(g.events.allday.status,'cancelled');assert.equal(g.state.appointments.length,0);
// Series imports and ONLY explicitly tracked series deletion.
g.add(ev('instance1'));g.change('instance1',{recurringEventId:'series'});g.add(ev('instance2','Yoga','2026-10-11'));g.change('instance2',{recurringEventId:'series'});g.add({...ev('series'),recurrence:['RRULE:FREQ=WEEKLY']});g.sync();state=g.state;state.googleDeleteSeries=['not-tracked','series'];state.appointments=[];g.set(state);g.sync();assert(g.calls.some(c=>c[0]==='remove'&&c[1]==='series'));assert(!g.calls.some(c=>c[1]==='not-tracked'));
// Actual Google suppresses all expanded instances of a deleted master.
// App recurring export is a real Google series and keeps excluded dates.
state=blank();state.appointments=[{id:'weekly',title:'Yoga',date:'2026-10-06',start:'18:00',end:'19:30',owner:'Daniel',repeat:true,uncertain:false,excludedDates:['2026-10-13']}];const w=harness(state);w.sync();const master=w.calls[0][1];assert.deepEqual(w.events[master].recurrence,['RRULE:FREQ=WEEKLY','EXDATE;TZID=Europe/Berlin:20261013T180000']);
w.add({...ev('weeklyinstance','Yoga','2026-10-06'),recurringEventId:master});w.sync();assert.equal(w.state.appointments.length,1);assert.equal(w.state.appointments[0].googleSeriesId,master);assert.equal(w.state.appointments[0].repeat,false);w.sync();assert.equal(w.calls.filter(c=>c[0]==='insert').length,1);
// Failed cloud commit then retry must neither duplicate nor lose imported events.
state=blank();state.entries=[entry()];const retry=harness(state);retry.failCas(true);assert.throws(()=>retry.sync(),/gleichzeitig/);assert.equal(retry.calls.filter(c=>c[0]==='insert').length,1);retry.failCas(false);retry.sync();assert.equal(retry.calls.filter(c=>c[0]==='insert').length,1);assert.equal(retry.state.entries.length,1);
retry.failGet(true);assert.throws(()=>retry.sync(),/503/);assert(!retry.calls.some(c=>c[0]==='remove'));assert.equal(retry.state.entries[0].date,'2026-10-03');
console.log('PASS: calendar scope, both directions, idempotent retries, tombstones, Google-wins conflicts, preserved proposal history, imported all-day/multi-day events, recurrence/exceptions, individual/series deletion, CAS failures and API errors.');
