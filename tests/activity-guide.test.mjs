import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseActivities,emptyGuideAnswers,ActivityGuide} from '../src/activity-guide.ts';
import {knownActivities} from '../src/known-activities.ts';
const activity=(id,overrides={})=>({id,title:id,minutes:30,energy:'low',mood:'culture',effort:'spontaneous',outdoor:false,next:'Selbst prüfen',...overrides});

test('outside movement changes from walking to kayak with available energy, while time stays hard',()=>{
 const list=[activity('walk',{title:'Spaziergang',outdoor:true,minutes:45}),activity('bike',{mood:'movement',energy:'medium',outdoor:true,minutes:90}),activity('kayak',{mood:'movement',energy:'high',effort:'prepare',outdoor:true,minutes:120})];
 const answers={need:'move',minutes:180,place:'outside',energy:'low'};
 assert.deepEqual(chooseActivities(list,answers).map(x=>x.id),['walk']);
 assert.equal(chooseActivities(list,{...answers,energy:'medium'})[0].id,'bike');
 assert.equal(chooseActivities(list,{...answers,energy:'high'})[0].id,'kayak');
 assert.equal(chooseActivities(list,{...answers,energy:'high',minutes:60})[0].id,'walk');
 assert.equal(chooseActivities([{...list[0],id:'my-new-activity'}],answers)[0].id,'my-new-activity');
});

test('time question offers exactly one hour, three hours and full day',()=>{
 const guide=new ActivityGuide();guide.handle('guideStart');guide.handle('guideAnswer','unknown');
 const html=guide.markup([]);
 assert.equal((html.match(/data-action="guideAnswer"/g)||[]).length,3);
 for(const id of ['60','180','1440'])assert.ok(html.includes(`data-id="${id}"`));
 assert.equal(guide.handle('guideAnswer','unknown'),false);
 assert.equal(guide.handle('guideAnswer','30'),false);
 guide.handle('guideAnswer','1440');guide.handle('guideAnswer','unknown');guide.handle('guideAnswer','unknown');
 assert.match(guide.markup([activity('day',{minutes:600})]),/data-id="day"/);
});

test('hard limits respect edited durations, place and movement; no invented shorter variants',()=>{
 const list=[activity('walk',{title:'Spaziergang',outdoor:true,minutes:45}),activity('yoga',{mood:'movement',minutes:20}),activity('tea',{mood:'food'})];
 const answer={need:'move',minutes:30,energy:'unknown',place:'inside'};
 assert.deepEqual(chooseActivities(list,answer).map(x=>x.id),['yoga']);
 assert.deepEqual(chooseActivities(list,{...answer,place:'outside'}),[]);
 assert.deepEqual(chooseActivities([activity('long',{minutes:120})],{...emptyGuideAnswers(),minutes:30}),[]);
});
test('rest favors calm, low effort activities and alternative is distinct',()=>{
 const list=[activity('concert',{title:'Konzert',minutes:60}),activity('read',{title:'Gemeinsam lesen',minutes:60}),activity('tea',{title:'Tee trinken',mood:'food',minutes:60}),activity('trip',{effort:'trip'}),activity('sport',{energy:'high'})];
 assert.deepEqual(chooseActivities(list,{need:'rest',minutes:60,energy:'unknown',place:'inside'}).map(x=>x.id),['read','tea']);
});
test('unknown answers provide at most two stable choices from the current collection without writes',()=>{
 const list=knownActivities();const before=JSON.stringify(list);
 const result=chooseActivities(list,emptyGuideAnswers());
 assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);
 assert.deepEqual(chooseActivities([...list].reverse(),emptyGuideAnswers()),result);
 assert.equal(JSON.stringify(list),before);
 assert.deepEqual(chooseActivities([],emptyGuideAnswers()),[]);
 assert.deepEqual(chooseActivities([list[0]],emptyGuideAnswers()),[list[0]]);
 assert.ok(!chooseActivities(list.filter(x=>x.id!==result[0].id),emptyGuideAnswers()).some(x=>x.id===result[0].id));
});
test('four steps accept unknown, validate input, support back/reset, escape user fields and use fresh collection',()=>{
 const guide=new ActivityGuide();assert.match(guide.markup([]),/Hilf mir entscheiden/);
 guide.handle('guideStart');assert.match(guide.markup([]),/Frage 1 von 4/);
 assert.equal(guide.handle('guideAnswer','invalid'),false);
 guide.handle('guideAnswer','unknown');assert.match(guide.markup([]),/Frage 2 von 4/);
 guide.handle('guideBack');assert.match(guide.markup([]),/Frage 1 von 4/);
 for(const answer of ['unknown','60','unknown','unknown'])guide.handle('guideAnswer',answer);
 assert.match(guide.markup([]),/Noch kein passender Vorschlag/);
 const html=guide.markup([activity('unsafe"',{title:'<img onerror=alert(1)>',next:'<script>bad</script>'})]);
 assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.match(html,/data-id="unsafe&quot;"/);
 assert.match(html,/data-action="routinePlan"/);assert.ok(!html.includes('Frage 5'));
 guide.handle('guideStart');assert.match(guide.markup([]),/Frage 1 von 4/);
 guide.handle('guideClose');assert.match(guide.markup([]),/Hilf mir entscheiden/);
});
