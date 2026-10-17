import test from 'node:test';
import assert from 'node:assert/strict';
import {withTasteRating,withExistingTasteRatings,validTasteRating,personalTasteFit,starsMarkup,tasteFeatures} from '../src/taste-profile.ts';
const item={id:'a',title:'Band A',category:'Livemusik · Indie',description:'Persönliche Texte, akustische Instrumente und eine markante Stimme',kind:'event',url:'https://example.com/a',date:'2026-10-12',fitScore:92};
const rating=(id,stars,title='Band '+id)=>({...item,id,title,stars,reason:'Eigene Stimme gefällt mir',ratedAt:'2026-10-11T10:00:00Z'});
test('all legacy stars map consistently while precise new scores and reasons win',()=>{
 const old={tasteRatings:[1,2,3,4,5].map(n=>rating('old'+n,n)),checks:['keep']};
 const migrated=withExistingTasteRatings(old);assert.deepEqual(migrated.tasteRatings.map(x=>x.score),[0,25,50,75,100]);assert.deepEqual(old.tasteRatings.map(x=>x.stars),[1,2,3,4,5]);
 const precise=withExistingTasteRatings({tasteRatings:[{...rating('a',4),score:80,reason:'eigener Grund'}]});assert.equal(precise.tasteRatings[0].score,80);assert.equal(precise.tasteRatings[0].reason,'eigener Grund');
});
test('ratings archive snapshots across expiry and reload without changing unrelated data; one id is corrected rather than counted twice',()=>{
 const state={version:1,checks:['2026-10-11'],appointments:[{id:'keep'}],tasteRatings:[]};
 const saved=withTasteRating(state,item,100,'Stimme','2026-10-11T10:00:00Z');
 assert.equal(saved.tasteRatings[0].description,item.description);assert.equal(saved.tasteRatings[0].date,item.date);assert.deepEqual(saved.appointments,state.appointments);assert.equal(state.tasteRatings.length,0);
 const reload=JSON.parse(JSON.stringify(saved));assert.ok(validTasteRating(reload.tasteRatings[0]));
 const corrected=withTasteRating(reload,item,25,'zu gleichförmig','2027-01-01T10:00:00Z');assert.equal(corrected.tasteRatings.length,1);assert.equal(corrected.tasteRatings[0].score,25);
 assert.equal(withTasteRating(corrected,item,null).tasteRatings.length,0);assert.throws(()=>withTasteRating(state,item,6));assert.throws(()=>withTasteRating(state,item,5,'x'.repeat(1001)));
});
test('exact star feedback dominates ranking, same artist is remembered at future dates; explicit exclusions remain',()=>{
 assert.equal(personalTasteFit(item,[rating('a',1)]).score,0);
 assert.equal(personalTasteFit(item,[rating('a',5)]).score,100);
 assert.equal(personalTasteFit({...item,id:'next',date:'2027-01-01'},[rating('old',4,'Band A')]).score,75);
 assert.equal(personalTasteFit({...item,fitScore:0},[rating('a',5)]).score,0);
 assert.equal(personalTasteFit({...item,imported:true},[rating('a',5)]).score,null);
});
test('one bad concert and repeated events of the same artist do not train a whole genre',()=>{
 const base=personalTasteFit(item,[]).score;
 assert.equal(personalTasteFit(item,[rating('other',1)]).score,base);
 assert.equal(personalTasteFit(item,[rating('one',1,'Same'),rating('two',1,'Same')]).score,base);
 assert.ok(personalTasteFit(item,[rating('one',1),rating('two',1)]).score<base);
 assert.equal(personalTasteFit({...item,description:'Only genre'},[rating('one',1),rating('two',1)]).score,70);
});
test('different domains and freeform reasons do not invent features; unknown evidence stays unknown',()=>{
 const base=personalTasteFit(item,[]).score;
 assert.equal(personalTasteFit(item,[{...rating('one',1),kind:'restaurant',category:'Restaurant'},{...rating('two',1),kind:'restaurant',category:'Restaurant'}]).score,base);
 assert.deepEqual(tasteFeatures({...item,category:'unknown',title:'unknown',description:'',reason:'markante Stimme'}),[]);
 assert.equal(personalTasteFit({...item,fitScore:undefined},[]).score,null);
 assert.equal(personalTasteFit({...item,description:''},[]).confidence,'broad');
});
test('slider has accessible bounds, five-point steps and a separate unrated state',()=>{
 const markup=starsMarkup('a"<',0);assert.match(markup,/type="range" min="0" max="100" step="5" value="0"/);assert.match(markup,/0 \/ 100/);assert.match(markup,/a&quot;&lt;/);assert.equal(markup.includes('★'),false);assert.equal(markup.includes('👍'),false);
 assert.match(starsMarkup('a'),/Noch nicht bewertet/);assert.match(starsMarkup('a',75,true),/disabled/);
});
test('zero is a persisted rating, null removes it and fine scores retain precision',()=>{
 let s=withTasteRating({tasteRatings:[]},item,0);assert.equal(s.tasteRatings.length,1);assert.equal(s.tasteRatings[0].score,0);assert.ok(validTasteRating(s.tasteRatings[0]));
 s=withTasteRating(s,item,80);assert.equal(personalTasteFit(item,s.tasteRatings).score,80);assert.equal(JSON.parse(JSON.stringify(s)).tasteRatings[0].score,80);
 assert.equal(withTasteRating(s,item,null).tasteRatings.length,0);
 for(const bad of [-5,101,77,NaN])assert.throws(()=>withTasteRating(s,item,bad));
});
test('existing real place stars remain exact and enter the archive without inventing a rating timestamp',()=>{
 const state={activityStock:[{id:'p',title:'Pool',kind:'swim',note:'My pool',url:'',rating:2}],routines:[],checks:['keep']};
 const next=withExistingTasteRatings(state);assert.equal(next.tasteRatings[0].score,25);assert.equal(next.tasteRatings[0].ratedAt,'');assert.ok(validTasteRating(next.tasteRatings[0]));assert.equal(state.tasteRatings,undefined);assert.deepEqual(next.checks,state.checks);
 assert.equal(withExistingTasteRatings(next).tasteRatings.length,1);
});

test('archives separate events, cinema, streaming and standard activities without losing stored examples',async()=>{
 const {tasteArchiveRatings}=await import('../src/taste-profile.ts');
 const rows=['event','cinema','stream','restaurant','routine'].map((kind,i)=>({...rating(kind,3),kind,score:i*5,reason:'Kommentar '+kind}));
 rows.push({...rating('culture',3),category:'Lesung',kind:'event'});
 assert.deepEqual(tasteArchiveRatings(rows,'music').map(x=>x.id),['event']);
 assert.deepEqual(tasteArchiveRatings(rows,'event').map(x=>x.id),['culture']);
 assert.deepEqual(tasteArchiveRatings(rows,'cinema').map(x=>x.id),['cinema']);
 assert.deepEqual(tasteArchiveRatings(rows,'stream').map(x=>x.id),['stream']);
 assert.deepEqual(tasteArchiveRatings(rows,'standard').map(x=>x.id),['routine']);
 assert.deepEqual(tasteArchiveRatings(rows,'food').map(x=>x.id),['restaurant']);
 assert.equal(rows.length,6);
});
test('cinema score zero, comment and confirmed format survive save and reload',()=>{
 const film={...item,id:'kino',kind:'cinema',category:'Film · Drama',mediaType:'film'};
 const state=withTasteRating({tasteRatings:[],checks:['keep']},film,0,'Zu bedrückend für mich');
 const saved=JSON.parse(JSON.stringify(state));
 assert.ok(validTasteRating(saved.tasteRatings[0]));
 assert.equal(saved.tasteRatings[0].score,0);assert.equal(saved.tasteRatings[0].reason,'Zu bedrückend für mich');assert.equal(saved.tasteRatings[0].mediaType,'film');
 assert.equal(personalTasteFit(film,saved.tasteRatings).score,0);
 assert.deepEqual(saved.checks,['keep']);
 assert.equal(validTasteRating({...saved.tasteRatings[0],mediaType:'unknown'}),false);
});
test('similar examples cannot cross cinema, streaming, events or streaming formats',()=>{
 const film={...item,id:'new',title:'Neuer Film',kind:'cinema',category:'Film · Drama',mediaType:'film',description:'Charaktergetrieben, menschlich und witzig',fitScore:85};
 const examples=[1,2].map(n=>({...film,id:'old'+n,title:'Alter Film '+n,score:100,reason:'Figuren gefallen',ratedAt:'2026-10-13T10:00:00Z'}));
 assert.ok(personalTasteFit(film,examples).score>85);
 for(const kind of ['stream','event'])assert.equal(personalTasteFit(film,examples.map(r=>({...r,kind}))).score,85);
 const streamed={...film,kind:'stream'};
 assert.equal(personalTasteFit(streamed,examples).score,85);
 assert.ok(personalTasteFit(streamed,examples.map(r=>({...r,kind:'stream'}))).score>85);
 assert.equal(personalTasteFit({...streamed,mediaType:'series'},examples.map(r=>({...r,kind:'stream'}))).score,85);
 assert.equal(personalTasteFit({...streamed,mediaType:undefined,category:'Streaming'},examples.map(r=>({...r,kind:'stream'}))).score,85);
});

test('food and outdoor discovery archives use existing place and route ratings',async()=>{
 const {tasteArchiveRatings}=await import('../src/taste-profile.ts');
 const rows=['restaurant','cafe','beer-garden','hike','bike','walk','routine'].map(kind=>({...rating(kind,4),kind}));
 assert.deepEqual(tasteArchiveRatings(rows,'food').map(x=>x.kind),['restaurant','cafe','beer-garden']);
 assert.deepEqual(tasteArchiveRatings(rows,'outdoor').map(x=>x.kind),['hike','bike','walk']);
 assert.deepEqual(tasteArchiveRatings(rows,'standard').map(x=>x.kind),['routine']);
});

test('flat route evidence matches whole words rather than Leben',()=>{
 const x={...item,kind:'stream',description:'Das Leben neben dem Krankenhaus',title:'Neues Leben',category:'Serie'};
 assert.ok(!tasteFeatures(x).includes('flache Strecke'));
 for(const description of ['flach','flache Strecke','ebener Weg','auf ebenen Wegen'])assert.ok(tasteFeatures({...x,kind:'walk',description}).includes('flache Strecke'));
});

test('route features belong to outdoor examples, not concerts or media',()=>{
 const description='Ruhige Tour mit Aussicht, Rundtour auf flachen festen Wegen';
 for(const kind of ['event','stream','cinema','restaurant'])assert.ok(!tasteFeatures({...item,kind,description}).some(f=>['ruhige Tour','Aussicht','Rundtour','flache Strecke','feste Wege'].includes(f)));
 assert.ok(tasteFeatures({...item,kind:'walk',description}).includes('Rundtour'));
});
test('explicitly negated loop and flatness facts cannot train positive route preferences',()=>{
 const x={...item,kind:'walk',title:'Spazierweg',category:'Spazierweg',description:'Eine Strecke, keine Rundtour; nicht eben.'};
 assert.ok(!tasteFeatures(x).includes('Rundtour'));assert.ok(!tasteFeatures(x).includes('flache Strecke'));
 assert.ok(tasteFeatures({...x,description:'Rundtour auf ebenen Wegen'}).includes('Rundtour'));
});
