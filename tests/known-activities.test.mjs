import test from 'node:test';
import assert from 'node:assert/strict';
import {knownActivities,withKnownActivities} from '../src/known-activities.ts';

test('the complete approved list has unique stable IDs and valid editable routine fields',()=>{
 const ideas=knownActivities();
 assert.equal(ideas.length,74);
 assert.equal(new Set(ideas.map(x=>x.id)).size,ideas.length);
 assert.equal(new Set(ideas.map(x=>x.title)).size,ideas.length);
 for(const x of ideas){
  assert.ok(x.title.length<=200&&x.title.length>0);
  assert.ok(Number.isInteger(x.minutes)&&x.minutes>=5&&x.minutes<=1440);
  assert.ok(['outdoor','movement','food','culture'].includes(x.mood));
  assert.ok(['low','medium','high'].includes(x.energy));
  assert.ok(['spontaneous','prepare','trip'].includes(x.effort));
 }
});
test('initial read preserves existing edits and unrelated planning data without mutating the input',()=>{
 const old={...knownActivities()[0],minutes:25,next:'Mein eigener Schritt'};
 const input={routines:[old],entries:[{id:'entry'}],appointments:[{id:'appointment'}]};
 const result=withKnownActivities(input);
 assert.equal(input.routines.length,1);assert.equal(input.knownActivitiesVersion,undefined);
 assert.equal(result.routines.length,74);assert.equal(result.routines[0],old);
 assert.equal(result.entries,input.entries);assert.equal(result.appointments,input.appointments);
 assert.equal(result.knownActivitiesVersion,1);
});
test('after the first explicit save, deleted and edited defaults stay deleted or edited on reload',()=>{
 const seeded=withKnownActivities({routines:[]});
 const removed=seeded.routines[0].id;
 seeded.routines=seeded.routines.filter(x=>x.id!==removed);
 seeded.routines[0].title='Meine eigene Lechrunde';
 const reloaded=withKnownActivities(JSON.parse(JSON.stringify(seeded)));
 assert.equal(reloaded.routines.length,73);
 assert.ok(!reloaded.routines.some(x=>x.id===removed));
 assert.equal(reloaded.routines[0].title,'Meine eigene Lechrunde');
 assert.equal(withKnownActivities({routines:[],knownActivitiesVersion:1}).routines.length,0);
});
test('normalized existing titles avoid duplicates even with another user ID',()=>{
 const old={...knownActivities()[0],id:'mine',title:'  Spaziergang   am Lech  '};
 const seeded=withKnownActivities({routines:[old]});
 assert.equal(seeded.routines.length,74);assert.equal(seeded.routines[0].id,'mine');
});
