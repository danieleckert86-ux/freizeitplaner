import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingEvents,eventInPeriod,catalogueFitLabel} from '../src/collection.ts';
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
 assert.equal(states[0].state,'failed');assert.ok(states[0].label.includes('gemeinsames Job-/Freizeitbudget'));assert.ok(states[0].label.includes('2026-10-17'));assert.equal(states[0].checkedAt,'');assert.ok(states[1].label.includes('weiterhin ungeklärt'));
});
