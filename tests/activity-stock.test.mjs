import test from 'node:test';
import assert from 'node:assert/strict';
import {stockKinds,stockLists,validStockItem,kindForActivity,kindForFavorite,draftFromFavorite,usableStock,matchingStock,stockMarkup,stockIdeaMarkup,publishStockFavorites,publishStockDecisions} from '../src/activity-stock.ts';
import {emptyGuideAnswers,ActivityGuide} from '../src/activity-guide.ts';
import {withKnownActivities} from '../src/known-activities.ts';
const idea=(id,changes={})=>({id,title:id,kind:'walk',url:'https://example.org/route',minutes:45,travelMinutes:10,distanceKm:3,elevationM:20,setting:'outside',energy:'low',effort:'spontaneous',note:'Route und Wetter prüfen',...changes});
const activity=(title,changes={})=>({id:'routine',title,minutes:60,energy:'low',effort:'spontaneous',mood:'movement',outdoor:true,next:'Prüfen',...changes});
const decisions=(changes={})=>({ready:true,hidden:new Set(),ratings:new Map(),...changes});

test('stock kinds link short/long edited routines and everyday places without treating all movement as a tour',()=>{
 assert.equal(stockKinds.length,9);
 for(const [title,minutes,kind] of [['Eine kleine Radtour',90,'bike-short'],['Eine Große Radtour',400,'bike-long'],['Wanderung kurz',240,'hike-short'],['Eine große Wanderung',400,'hike-long'],['Spaziergang',45,'walk'],['Café besuchen',60,'cafe'],['Essen gehen',90,'restaurant']])assert.equal(kindForActivity(activity(title,{minutes,mood:kind==='cafe'||kind==='restaurant'?'food':'movement'})),kind);
 assert.equal(kindForActivity(activity('Schwimmen')),'swim');
 assert.equal(kindForActivity(activity('Biergarten besuchen',{mood:'food'})),'beer-garden');
 assert.equal(kindForActivity(activity('Radtour',{activityCategory:'culture'})),null);
});
test('favorite imports are explicit drafts with unknown timings and no verification; concerts are not stock',()=>{
 const f={suggestionId:'saved',title:'Meine Tour',category:'Wandern',description:'Gespeicherte Beschreibung',url:'https://example.org/source'};
 const before=JSON.stringify(f),draft=draftFromFavorite(f,'new-id');
 assert.equal(draft.kind,'hike-short');assert.equal(draft.minutes,null);assert.equal(draft.travelMinutes,null);assert.equal(draft.sourceId,'saved');assert.ok(validStockItem(draft));
 assert.equal(JSON.stringify(f),before);assert.ok(!('verifiedAt' in draft));
 assert.equal(kindForFavorite({...f,category:'Musik'}),null);assert.equal(draftFromFavorite({...f,category:'Musik'},'ignored'),null);
 assert.equal(kindForFavorite({...f,title:'Café Flora',category:'Restaurants'}),'cafe');
});
test('missing exclusion data fails closed for linked stock, hidden and negative ratings never reappear',()=>{
 const list=[idea('own'),idea('linked',{sourceId:'source'})];
 assert.deepEqual(usableStock(list,decisions({ready:false})).map(x=>x.id),['own']);
 assert.deepEqual(usableStock(list,decisions({hidden:new Set(['source'])})).map(x=>x.id),['own']);
 assert.deepEqual(usableStock(list,decisions({ratings:new Map([['source',-1]])})).map(x=>x.id),['own']);
 assert.equal(usableStock(list,decisions()).length,2);
});
test('concrete matching requires duration plus return travel and respects place, energy, effort and user ratings',()=>{
 const walk=activity('Spaziergang'),answers={...emptyGuideAnswers(),minutes:60,place:'inside',energy:'low',effort:'spontaneous'};
 assert.equal(matchingStock(walk,[idea('both',{setting:'both'})],answers,decisions())[0].id,'both');
 for(const changes of [{minutes:null},{travelMinutes:null},{minutes:60,travelMinutes:1},{energy:'high'},{effort:'prepare'},{setting:'outside'}])assert.deepEqual(matchingStock(walk,[idea('rejected',{setting:'inside',...changes})],answers,decisions()),[]);
 const a=idea('a',{setting:'inside',sourceId:'a'}),b=idea('b',{setting:'inside',sourceId:'b'});
 assert.equal(matchingStock(walk,[a,b],answers,decisions({ratings:new Map([['b',1]])}))[0].id,'b');
 assert.deepEqual(matchingStock(walk,[{...a,energy:'high'}],{...answers,need:'rest',energy:'unknown'},decisions()),[]);
});
test('schema allows unknown facts but rejects unsafe URLs and invalid categories/ranges',()=>{
 assert.ok(validStockItem(idea('unknown',{minutes:null,travelMinutes:null,distanceKm:null,elevationM:null,url:''})));
 for(const changes of [{minutes:-1},{minutes:0},{minutes:45.5},{travelMinutes:-1},{distanceKm:NaN},{kind:'event'},{setting:'any'},{energy:'invalid'},{effort:'invalid'},{url:'javascript:alert(1)'},{url:'https://user:pass@example.org'},{title:''}])assert.ok(!validStockItem(idea('invalid',changes)));
});
test('JSON roundtrip and known-activity normalization keep stock, calendar, checks and historical fields',()=>{
 const input={version:1,knownActivitiesVersion:1,routines:[],activityStock:[idea('saved')],entries:[{id:'old',note:'My history'}],appointments:[{id:'calendar'}],checks:['2026-10-11'],otherPrivateField:{value:1}};
 const before=JSON.stringify(input),read=withKnownActivities(JSON.parse(before));
 assert.deepEqual(read,input);assert.equal(JSON.stringify(input),before);
 assert.ok(read.activityStock.every(validStockItem));
});
test('markup exposes empty coverage, escapes input and never claims source or safety verification',()=>{
 publishStockFavorites([]);publishStockDecisions(new Set(),new Map(),true);
 const html=stockMarkup([idea('unsafe"',{title:'<img onerror=evil>',note:'<script>evil</script>'})],null,true,false,'');
 assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.match(html,/data-stock-id="unsafe&quot;"/);
 assert.match(html,/Vorrat ergänzen/);assert.match(html,/Aktuelle Bedingungen ungeprüft/);
 assert.match(stockMarkup([],null,false,false,''),/wird geladen/);
 assert.match(stockIdeaMarkup(activity('Spaziergang'),[idea('short')],{...emptyGuideAnswers(),minutes:60},decisions()),/Konkrete Idee/);
 assert.match(stockIdeaMarkup(activity('Spaziergang'),[idea('unknown',{travelMinutes:null})],emptyGuideAnswers(),decisions()),/Noch keine konkrete Vorratsidee/);
});
test('the existing five-question result includes a concrete matching idea and keeps main and alternative bounded',()=>{
 publishStockDecisions(new Set(),new Map(),true);const guide=new ActivityGuide();guide.handle('guideStart');
 for(const answer of ['move','60','low','outside','spontaneous'])guide.handle('guideAnswer',answer);
 const html=guide.markup([activity('Spaziergang')],[idea('stock-walk')]);
 assert.match(html,/Konkrete Idee: stock-walk/);assert.match(html,/data-action="stockPlan"/);
 assert.equal((html.match(/Konkrete Idee:/g)||[]).length,1);
});

test('Maps lists remain source links, never silently populate stock or verify places',()=>{
 assert.equal(Object.keys(stockLists).length,4);
 const html=stockMarkup([],null,true,false,'');
 for(const url of Object.values(stockLists))assert.ok(html.includes(url));
 assert.equal((html.match(/Deine Maps-Liste öffnen/g)||[]).length,4);
 assert.equal((html.match(/0 gespeichert/g)||[]).length,9);
 assert.match(html,/Die Liste ist kein geprüfter Vorrat/);
 assert.match(html,/data-stock-kind="swim"/);
});
