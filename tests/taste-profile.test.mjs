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
