import test from 'node:test';
import assert from 'node:assert/strict';
import {knownActivities,withKnownActivities,legacyKnownActivities,simplifyStandardActivities} from '../src/known-activities.ts';
import {categoryOf,settingOf,matchesSetting,validActivityProperties} from '../src/activity-properties.ts';

test('old defaults simplify in memory, preserving edited movement, own rows and historical entries',()=>{
 const old=legacyKnownActivities();
 const edited={...old[0],title:'Mein Spaziergang',minutes:25};
 const movement={...old.find(a=>a.mood==='movement'),title:'Eine Große Radtour',minutes:400};
 const mine={...old[0],id:'mine',title:'Meine eigene Runde'};
 const state={knownActivitiesVersion:1,routines:[edited,movement,mine,...old.slice(1)],entries:[{routineId:old[2].id,title:'Früherer Spaziergang'}],appointments:[{id:'private'}]};
 const before=JSON.stringify(state),result=withKnownActivities(state);
 assert.equal(JSON.stringify(state),before);
 assert.equal(result.entries,state.entries);assert.equal(result.appointments,state.appointments);
 for(const a of [edited,movement,mine])assert.ok(result.routines.includes(a));
 assert.equal(result.routines.filter(a=>a.title==='Spaziergang').length,1);
 assert.deepEqual(withKnownActivities(result),result);
 assert.ok(result.routines.every(a=>validActivityProperties(a)));
});

test('edited metadata and duplicate user rows never get silently merged or renamed',()=>{
 const old=legacyKnownActivities()[1];
 for(const changes of [{minutes:20},{energy:'medium'},{effort:'prepare'},{next:'Meine Notiz'},{outdoor:false},{activityCategory:'relaxation'},{setting:'both'}]){
  const edited={...old,...changes};assert.equal(simplifyStandardActivities([edited])[0],edited);
 }
 const own=knownActivities()[0],same={...own,id:'own-copy'};
 assert.equal(simplifyStandardActivities([own,same]).length,2);
 assert.deepEqual(withKnownActivities({routines:[],knownActivitiesVersion:1}).routines,[]);
 const noWalk=legacyKnownActivities().filter(a=>!/^Spaziergang|Runde durch|Kleine Runde|Neues Augsburger Viertel|Café-Besuch/.test(a.title));
 assert.ok(!simplifyStandardActivities(noWalk).some(a=>a.title==='Spaziergang'));
});

test('category and setting are independent, both appears in either filter and old booleans remain compatible',()=>{
 const yoga=knownActivities().find(a=>a.title==='Yoga');
 assert.equal(categoryOf(yoga),'movement');assert.equal(settingOf(yoga),'both');
 assert.ok(matchesSetting(yoga,'inside')&&matchesSetting(yoga,'outside'));
 const custom={...yoga,title:'Meine Ruheübung',activityCategory:'relaxation',setting:'inside',outdoor:false};
 assert.equal(categoryOf(custom),'relaxation');assert.ok(!matchesSetting(custom,'outside'));
 assert.ok(validActivityProperties(custom));
 assert.ok(!validActivityProperties({...custom,activityCategory:'invalid'}));
 assert.ok(!validActivityProperties({...custom,setting:'invalid'}));
 assert.ok(!validActivityProperties({...custom,setting:'inside',outdoor:true}));
 assert.equal(settingOf({...custom,setting:undefined,outdoor:true}),'outside');
 assert.equal(categoryOf({...custom,activityCategory:undefined,title:'Spaziergang',mood:'outdoor'}),'movement');
});

test('legacy short routines retain supported IDs, estimates and next steps when consolidating duplicates',()=>{
 const walk={id:'walk',title:'Spazieren durch die Stadt',minutes:45,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eine gemeinsame Runde zu Beginn des Zeitfensters vorschlagen.'};
 const film={id:'film',title:'Filmabend zu Hause',minutes:120,energy:'low',mood:'culture',effort:'spontaneous',outdoor:false,next:'Einen Titel aus „Filme & Serien“ auswählen und einen gemeinsamen Abend abstimmen.'};
 const result=simplifyStandardActivities([walk,film,...legacyKnownActivities()]);
 assert.equal(result.filter(a=>a.title==='Spaziergang').length,1);
 assert.equal(result.find(a=>a.title==='Spaziergang').id,'walk');
 assert.equal(result.filter(a=>a.title==='Filmabend').length,1);
 assert.equal(result.find(a=>a.title==='Filmabend').id,'film');
 assert.equal(result[0].minutes,walk.minutes);assert.equal(result[0].next,walk.next);
 assert.equal(simplifyStandardActivities([{...walk,minutes:25}])[0].title,walk.title);
});

test('the generalized default list has unique stable IDs and valid editable routine fields',()=>{
 const ideas=knownActivities();
 assert.ok(ideas.length < legacyKnownActivities().length);
 assert.equal(ideas.filter(a=>a.title==='Spaziergang').length,1);
 assert.ok(!ideas.some(a=>/am Lech|Siebentischwald|Hochablass/.test(a.title)));
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
 assert.equal(result.routines.length,knownActivities().length);assert.equal(result.routines[0],old);
 assert.equal(result.entries,input.entries);assert.equal(result.appointments,input.appointments);
 assert.equal(result.knownActivitiesVersion,1);
});
test('after the first explicit save, deleted and edited defaults stay deleted or edited on reload',()=>{
 const seeded=withKnownActivities({routines:[]});
 const removed=seeded.routines[0].id;
 seeded.routines=seeded.routines.filter(x=>x.id!==removed);
 seeded.routines[0].title='Meine eigene Lechrunde';
 const reloaded=withKnownActivities(JSON.parse(JSON.stringify(seeded)));
 assert.equal(reloaded.routines.length,knownActivities().length-1);
 assert.ok(!reloaded.routines.some(x=>x.id===removed));
 assert.equal(reloaded.routines[0].title,'Meine eigene Lechrunde');
 assert.equal(withKnownActivities({routines:[],knownActivitiesVersion:1}).routines.length,0);
});
test('normalized existing titles avoid duplicates even with another user ID',()=>{
 const old={...knownActivities()[0],id:'mine',title:'  Spaziergang  '};
 const seeded=withKnownActivities({routines:[old]});
 assert.equal(seeded.routines.length,knownActivities().length);assert.equal(seeded.routines[0].id,'mine');
});

