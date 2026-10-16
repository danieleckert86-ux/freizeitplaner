import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingEvents,topTasteEvents,eventInPeriod,catalogueFitLabel,eventView} from '../src/collection.ts';
import {collectionSourceStates} from '../src/collection.ts';
test('source evidence shows missing, failed and stale separately and never substitutes collection save time',()=>{
 const now=Date.parse('2026-10-10T05:00:00Z');
 const sources=['missing','failed','stale','good'].map(id=>({id,hours:120}));
 const checks=[{id:'failed',status:'failed',checkedAt:'',attemptedAt:'2026-10-10T04:00:00Z'},{id:'stale',status:'checked',checkedAt:'2026-10-01T05:00:00Z'},{id:'good',status:'checked',checkedAt:'2026-10-09T05:00:00Z'}];
 const states=collectionSourceStates(sources,checks,now);
 assert.deepEqual(states.map(x=>x.state),['missing','failed','stale','checked']);
 assert.equal(states[0].checkedAt,'');assert.equal(states[1].checkedAt,'');
 assert.equal(states[2].label,'Prüfung veraltet');assert.equal(states[3].checkedAt,'2026-10-09T05:00:00Z');
});
test('90-day collection retains early finds, hides expired and excluded events, sorts fit before date',()=>{
 const list=[{id:'past',title:'Past',date:'2026-10-08'},{id:'near',title:'Near',date:'2026-10-10',fitScore:80},{id:'far',title:'Far',date:'2026-12-01',fitScore:95},{id:'hidden',title:'Hidden',date:'2026-10-11',fitScore:100},{id:'too-far',title:'Too far',date:'2027-02-01'}];
 assert.deepEqual(upcomingEvents(list,'2026-10-09',new Set(['hidden'])).map(x=>x.id),['far','near']);
});
test('deduplication keeps highest fit, normalized names compare; missing score is honest',()=>{
 const list=[{id:'a',title:' Event ',date:'2026-10-10',time:'19:00',fitScore:70},{id:'b',title:'event',date:'2026-10-10',time:'19:00',fitScore:90}];
 assert.deepEqual(upcomingEvents(list,'2026-10-09',new Set()).map(x=>x.id),['b']);
 assert.equal(catalogueFitLabel({title:'Unknown'}),'Passung noch nicht bewertet');
});
test('event filters cover Friday through Sunday and the month horizon',()=>{
 assert.equal(eventInPeriod('2026-10-09','2026-10-09','weekend'),true);
 assert.equal(eventInPeriod('2026-10-12','2026-10-09','weekend'),false);
 assert.equal(eventInPeriod('2026-10-11','2026-10-11','week'),true);
 assert.equal(eventInPeriod('2026-11-08','2026-10-09','month'),true);
 assert.equal(eventInPeriod('2026-11-09','2026-10-09','month'),false);
});

test('budget pause, retry date and unchanged unresolved source stay visibly unverified',()=>{
 const states=collectionSourceStates([{id:'paused',hours:120},{id:'unknown',hours:120}],[{id:'paused',status:'failed',checkedAt:'',error:'research_budget_paused',nextAttemptAt:'2026-10-17T00:00:00Z'},{id:'unknown',status:'failed',checkedAt:'',error:'catalog_direct_unchanged_unresolved'}]);
 assert.equal(states[0].state,'failed');assert.ok(states[0].label.includes('Freizeitbudget'));assert.ok(states[0].label.includes('2026-10-17'));assert.equal(states[0].checkedAt,'');assert.ok(states[1].label.includes('weiterhin ungeklärt'));
});


test('partial direct batches and original HTTP failures remain visible without manufacturing evidence',()=>{
 const states=collectionSourceStates([{id:'progress',hours:120},{id:'http',hours:120}],[{id:'progress',status:'failed',error:'catalog_source_in_progress',checkedAt:'',attemptedAt:'2026-10-10T05:00Z',lastSuccessfulFetchAt:'2026-10-10T05:01Z',details:{returned:50,attempted:24,accepted:12}},{id:'http',status:'failed',error:'catalog_direct_http_502',checkedAt:'2026-10-06T05:00Z'}],Date.parse('2026-10-10T05:02Z'));
 assert.match(states[0].label,/Prüfung unvollständig/);assert.equal(states[0].checkedAt,'');assert.equal(states[0].accepted,12);assert.equal(states[0].lastSuccessfulFetchAt,'2026-10-10T05:01Z');assert.match(states[1].label,/HTTP 502/);assert.equal(states[1].checkedAt,'2026-10-06T05:00Z');
});

test('explicit cancellation preserves stored IDs and favorites while excluding the closed event from upcoming lists',()=>{
 const stored=[{id:'favorite',favorite:{id:'favorite'},title:'Cancelled',date:'2026-10-11',closed:true},{id:'valid',title:'Other source',date:'2026-10-11'}];
 assert.deepEqual(upcomingEvents(stored,'2026-10-10',new Set()).map(i=>i.id),['valid']);assert.equal(stored[0].favorite.id,'favorite');assert.equal(stored.length,2);
});


test('taste top three automatically replace the weakest event when a better new event arrives',()=>{
 const events=[{id:'a',title:'A',date:'2026-10-20',fitScore:90},{id:'b',title:'B',date:'2026-10-12',fitScore:85},{id:'c',title:'C',date:'2026-11-01',fitScore:80}];
 assert.deepEqual(topTasteEvents(events,'2026-10-11',new Set()).map(x=>x.id),['a','b','c']);
 const added={id:'new',title:'New',date:'2026-12-01',fitScore:95};
 assert.deepEqual(topTasteEvents([...events,added],'2026-10-11',new Set()).map(x=>x.id),['new','a','b']);
 assert.equal(events.length,3);
});
test('top taste excludes unknown imports, cancelled, expired, distant and hidden events; deduplicates and allows fewer than three',()=>{
 const rows=[{id:'ok',title:'Good',date:'2026-10-12',fitScore:70},{id:'duplicate',title:' good ',date:'2026-10-12',fitScore:60},{id:'unknown',title:'Unknown',date:'2026-10-12'},{id:'import',title:'Import',date:'2026-10-12',fitScore:100,imported:true},{id:'closed',title:'Closed',date:'2026-10-12',fitScore:99,closed:true},{id:'past',title:'Past',date:'2026-10-10',fitScore:99},{id:'far',title:'Far',date:'2027-03-01',fitScore:99},{id:'hidden',title:'Hidden',date:'2026-10-12',fitScore:99}];
 assert.deepEqual(topTasteEvents(rows,'2026-10-11',new Set(['hidden'])).map(x=>x.id),['ok']);
});

test('period filtering includes top picks and repeated changes restore the eligible cards',()=>{
 const today='2026-10-16';
 const rows=[{id:'top-far',title:'Far',date:'2026-12-01',fitScore:100},{id:'fri',title:'Friday',date:today,fitScore:80},{id:'sat',title:'Saturday',date:'2026-10-17',fitScore:85},{id:'sun',title:'Sunday',date:'2026-10-18',fitScore:90},{id:'mon',title:'Monday',date:'2026-10-19',fitScore:95}];
 const ids=v=>[...v.highlights,...v.others].map(x=>x.id).sort();
 assert.deepEqual(ids(eventView(rows,today,'weekend')),['fri','sat','sun']);
 assert.deepEqual(ids(eventView(rows,today,'today')),['fri']);
 assert.deepEqual(ids(eventView(rows,today,'week')),['fri','sat','sun']);
 assert.deepEqual(ids(eventView(rows,today,'month')),['fri','mon','sat','sun']);
 assert.deepEqual(ids(eventView(rows,today,'all')),['fri','mon','sat','sun','top-far']);
 assert.equal(eventInPeriod('2027-02-01',today,'all'),false);
 assert.equal(eventInPeriod('bad',today,'all'),false);
 assert.deepEqual(ids(eventView(rows,today,'weekend')),['fri','sat','sun']);
});
test('remaining events sort by date or personal fit; ties and unknown scores stay deterministic without mutation',()=>{
 const rows=[{id:'t1',title:'Top1',date:'2026-10-21',fitScore:100},{id:'t2',title:'Top2',date:'2026-10-22',fitScore:99},{id:'t3',title:'Top3',date:'2026-10-23',fitScore:98},{id:'near',title:'Near',date:'2026-10-16',time:'20:00',fitScore:50},{id:'far',title:'Far',date:'2026-10-20',fitScore:80},{id:'early',title:'Earlier',date:'2026-10-16',time:'18:00'},{id:'zero',title:'Zero',date:'2026-10-17',fitScore:0}];
 const before=JSON.stringify(rows);
 assert.deepEqual(eventView(rows,'2026-10-16','all','date').others.map(x=>x.id),['early','near','zero','far']);
 assert.deepEqual(eventView(rows,'2026-10-16','all','fit').others.map(x=>x.id),['far','near','zero','early']);
 assert.deepEqual(eventView(rows,'2026-10-16','all','fit').highlights.map(x=>x.id),['t1','t2','t3']);
 assert.equal(JSON.stringify(rows),before);
});
test('saved-only and empty periods apply to both highlights and remaining list',()=>{
 const rows=[{id:'a',title:'A',date:'2026-10-17',fitScore:90,saved:true},{id:'b',title:'B',date:'2026-10-17',fitScore:95,saved:false}];
 assert.deepEqual(eventView(rows,'2026-10-16','weekend','fit',true).highlights.map(x=>x.id),['a']);
 assert.deepEqual(eventView(rows,'2026-10-16','today'),{highlights:[],others:[]});
 assert.equal(rows.length,2);
 assert.equal(eventInPeriod('2026-10-18','2026-10-18','weekend'),true);
 assert.equal(eventInPeriod('2026-10-16','2026-10-18','weekend'),false);
 assert.equal(eventInPeriod('2026-10-23','2026-10-19','weekend'),true);
});

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('event controls restore hidden cards and filter top picks through the actual DOM controller',()=>{
 const card=(id,date,fitScore,saved=false)=>({dataset:{date,fitScore:String(fitScore),eventTime:'19:00'},hidden:false,attrs:{},classes:new Set(),querySelector(selector){return selector==='h3'?{textContent:id}:selector==='[data-favorite].saved'&&saved?{}:null;},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;}});
 const rows=[card('Friday','2026-10-16',80,true),card('Saturday','2026-10-17',90),card('December','2026-12-01',100)];
 for(const c of rows)c.classList.toggle=(k,v)=>v?c.classes.add(k):c.classes.delete(k);
 const list=()=>({children:[],append(c){if(c.parentElement){const old=c.parentElement.children;old.splice(old.indexOf(c),1);}this.children.push(c);c.parentElement=this;}});
 const top=list(),rest=list(),block={hidden:true},empty={hidden:true},period={value:'all'},sort={value:'date'},saved={checked:false};
 rows.forEach(c=>rest.append(c));
 const nodes={'#topEventList':top,'#discoveries > .discovery-timeline':rest,'#eventHighlights':block,'#eventsEmpty':empty,'#eventPeriod':period,'#eventSort':sort,'#onlySaved':saved};
 const document={querySelector:s=>nodes[s],querySelectorAll:()=>[...top.children,...rest.children]};
 const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function refreshEventHighlights()'),source.indexOf('function quietCardActions()'));
 class FixedDate extends Date{constructor(value){super(value??'2026-10-16T10:00:00Z');}}
 const context={document,eventView,Date:FixedDate,Intl};
 vm.createContext(context);vm.runInContext(ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
 const refresh=()=>vm.runInContext('refreshEventHighlights()',context);
 refresh();assert.equal(top.children.length,3);
 period.value='today';refresh();assert.deepEqual(top.children.map(c=>c.querySelector('h3').textContent),['Friday']);assert.equal(rows[2].hidden,true);assert.equal(rows[2].classes.has('is-hidden'),true);
 period.value='all';refresh();assert.equal(top.children.length,3);assert.equal(rows[2].hidden,false);assert.equal(rows[2].attrs['aria-hidden'],'false');
 period.value='weekend';saved.checked=true;refresh();assert.deepEqual(top.children.map(c=>c.querySelector('h3').textContent),['Friday']);
 saved.checked=false;refresh();assert.equal(top.children.length,2);assert.equal(rows[2].hidden,true);
 period.value='today';rows[0].dataset.date='2026-10-17';refresh();assert.equal(block.hidden,true);assert.equal(empty.hidden,false);
});

test('partial research preserves fetch evidence, pending work and failures separately',()=>{
 const source={id:'p',hours:120},check={id:'p',status:'failed',checkedAt:'',error:'partial: September nicht abgedeckt',attemptedAt:'2026-10-16T10:00Z',lastSuccessfulFetchAt:'2026-10-16T10:01Z',pendingUrls:['https://example.com/a'],details:{returned:30,attempted:4,accepted:2}};
 const before=JSON.stringify(check),s=collectionSourceStates([source],[check])[0];
 assert.equal(s.state,'partial');assert.match(s.label,/September/);assert.equal(s.pending,1);assert.equal(s.attempted,4);assert.equal(s.lastSuccessfulFetchAt,check.lastSuccessfulFetchAt);assert.equal(JSON.stringify(check),before);
});

import {researchTime} from '../src/collection.ts';
test('source attempts display Berlin daylight and standard time without changing stored timestamps',()=>{
 assert.match(researchTime('2026-10-16T10:00:00Z'),/12:00.*Berlin/);
 assert.match(researchTime('2026-11-16T10:00:00Z'),/11:00.*Berlin/);
 assert.equal(researchTime('broken'),'unbekannt');
});
