import {mapsStock,withMapsStock} from '../src/maps-stock.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {stockKinds,stockLists,validStockItem,kindForActivity,kindForFavorite,draftFromFavorite,usableStock,matchingStock,stockMarkup,stockIdeaMarkup,publishStockFavorites,publishStockDecisions} from '../src/activity-stock.ts';
import {emptyGuideAnswers,ActivityGuide} from '../src/activity-guide.ts';
import {withKnownActivities} from '../src/known-activities.ts';
const idea=(id,changes={})=>({id,title:id,kind:'walk',url:'https://example.org/route',minutes:45,travelMinutes:10,distanceKm:3,elevationM:20,setting:'outside',energy:'low',effort:'spontaneous',note:'Route und Wetter prüfen',...changes});
const activity=(title,changes={})=>({id:'routine',title,minutes:60,energy:'low',effort:'spontaneous',mood:'movement',outdoor:true,next:'Prüfen',...changes});
const decisions=(changes={})=>({ready:true,hidden:new Set(),ratings:new Map(),...changes});

test('stock kinds link short/long edited routines and everyday places without treating all movement as a tour',()=>{
 assert.equal(stockKinds.length,7);
 for(const [title,minutes,kind] of [['Eine kleine Radtour',90,'bike'],['Eine Große Radtour',400,'bike'],['Wanderung kurz',240,'hike'],['Eine große Wanderung',400,'hike'],['Spaziergang',45,'walk'],['Café besuchen',60,'cafe'],['Essen gehen',90,'restaurant']])assert.equal(kindForActivity(activity(title,{minutes,mood:kind==='cafe'||kind==='restaurant'?'food':'movement'})),kind);
 assert.equal(kindForActivity(activity('Schwimmen')),'swim');
 assert.equal(kindForActivity(activity('Biergarten besuchen',{mood:'food'})),'beer-garden');
 assert.equal(kindForActivity(activity('Radtour',{activityCategory:'culture'})),null);
});
test('favorite imports are explicit drafts with unknown timings and no verification; concerts are not stock',()=>{
 const f={suggestionId:'saved',title:'Meine Tour',category:'Wandern',description:'Gespeicherte Beschreibung',url:'https://example.org/source'};
 const before=JSON.stringify(f),draft=draftFromFavorite(f,'new-id');
 assert.equal(draft.kind,'hike');assert.equal(draft.minutes,null);assert.equal(draft.travelMinutes,null);assert.equal(draft.sourceId,'saved');assert.ok(validStockItem(draft));
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
test('concrete matching uses activity duration without requiring travel and respects place, energy, effort and user ratings',()=>{
 const walk=activity('Spaziergang'),answers={...emptyGuideAnswers(),minutes:60,place:'inside',energy:'low',effort:'spontaneous'};
 assert.equal(matchingStock(walk,[idea('both',{setting:'both'})],answers,decisions())[0].id,'both');
 for(const changes of [{minutes:null},{minutes:61},{energy:'high'},{effort:'prepare'},{setting:'outside'}])assert.deepEqual(matchingStock(walk,[idea('rejected',{setting:'inside',...changes})],answers,decisions()),[]);
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
 const html=stockMarkup([idea('unsafe"',{title:'<img onerror=evil>',note:'<script>evil</script>'})],null,true,false,'','unsafe"');
 assert.ok(!html.includes('<img')&&!html.includes('<script>'));assert.match(html,/data-stock-id="unsafe&quot;"/);
 assert.match(html,/Tour oder Ort ergänzen/);assert.match(html,/Aktuelle Bedingungen ungeprüft/);
 assert.match(stockMarkup([],null,false,false,''),/wird geladen/);
 assert.match(stockIdeaMarkup(activity('Spaziergang'),[idea('short')],{...emptyGuideAnswers(),minutes:60},decisions()),/Konkrete Idee/);
 assert.match(stockIdeaMarkup(activity('Spaziergang'),[idea('unknown',{minutes:null})],emptyGuideAnswers(),decisions()),/Noch keine konkrete Vorratsidee/);
});
test('the existing five-question result includes a concrete matching idea and keeps main and alternative bounded',()=>{
 publishStockDecisions(new Set(),new Map(),true);const guide=new ActivityGuide();guide.handle('guideStart');
 for(const answer of ['move','60','low','outside','spontaneous'])guide.handle('guideAnswer',answer);
 const html=guide.markup([activity('Spaziergang')],[idea('stock-walk')]);
 assert.match(html,/Konkrete Idee: stock-walk/);assert.ok(!html.includes('stockPlan'));
 assert.equal((html.match(/Konkrete Idee:/g)||[]).length,1);
});

test('stock groups no longer display Maps-list links',()=>{
 const html=stockMarkup([],null,true,false,'');
 assert.ok(!html.includes('Deine Maps-Liste öffnen'));
 for(const url of Object.values(stockLists))assert.ok(!html.includes(url));
 assert.equal((html.match(/class="stock-count">0/g)||[]).length,7);
});

test('Maps imports contain 108 distinct editable places with unknown timings and no visible links',()=>{
 const places=mapsStock();assert.equal(places.length,108);assert.equal(new Set(places.map(x=>x.id)).size,108);
 assert.ok(places.every(validStockItem));assert.ok(places.every(x=>x.minutes===null&&x.travelMinutes===null&&x.url===''));
 assert.ok(places.some(x=>x.title==='Altes Stadtbad'&&x.kind==='swim'));
 assert.ok(places.some(x=>x.title==='Café Flora'&&x.kind==='cafe'));
 assert.equal(places.filter(x=>x.title==='Gaststätte Kulperhütte').length,1);
 assert.ok(!places.some(x=>x.title.startsWith('CARE U')));
});
test('Maps seeds preserve edits, deleted rows after save and unrelated private fields',()=>{
 const own=idea('own',{title:'Café Flora',minutes:70});
 const old={activityStock:[own],entries:[{id:'history'}],checks:['2026-10-11'],otherPrivateField:1};
 const copy=JSON.stringify(old);const seeded=withMapsStock(old);assert.equal(JSON.stringify(old),copy);
 assert.equal(seeded.activityStock.filter(x=>x.title==='Café Flora').length,1);assert.equal(seeded.activityStock[0].minutes,70);
 seeded.activityStock=seeded.activityStock.filter(x=>x.title!=='Altes Stadtbad');
 const reload=withMapsStock(JSON.parse(JSON.stringify(seeded)));assert.ok(!reload.activityStock.some(x=>x.title==='Altes Stadtbad'));assert.deepEqual(reload.entries,old.entries);assert.deepEqual(reload.checks,old.checks);assert.equal(reload.otherPrivateField,1);
});
test('closed imported places stay editable but are excluded from suggestions and planning',()=>{
 const places=mapsStock();assert.equal(places.filter(x=>x.unavailable).length,10);
 const closed=places.find(x=>x.unavailable);assert.ok(!usableStock(places,decisions()).some(x=>x.id===closed.id));
 const html=stockMarkup([closed],null,true,false,'',closed.id);assert.match(html,/Als geschlossen übernommen/);assert.ok(!html.includes('Einplanen'));
 assert.ok(usableStock([{...closed,unavailable:false}],decisions()).length===1);
});

test('stock overview is compact and details plus editing live in a modal without scheduling or travel',()=>{
 const a=idea('compact',{note:'Long private note'});const overview=stockMarkup([a],null,true,false,'');
 assert.match(overview,/class="stock-row"/);assert.match(overview,/data-stock-action="details"/);
 assert.ok(!overview.includes('Long private note')&&!overview.includes('Anfahrt')&&!overview.includes('Einplanen'));
 const detail=stockMarkup([a],null,true,false,'',a.id);assert.match(detail,/<dialog id="stockDialog"/);assert.match(detail,/Long private note/);
 const edit=stockMarkup([a],a,true,false,'');assert.match(edit,/<dialog id="stockDialog"/);assert.ok(!edit.includes('name="travelMinutes"'));
 assert.ok(!detail.includes('Einplanen')&&!edit.includes('Einplanen'));
});
test('unknown travel no longer blocks a concrete selection',()=>{
 const a=activity('Spaziergang');const place=idea('no-travel',{minutes:60,travelMinutes:null});
 assert.equal(matchingStock(a,[place],{...emptyGuideAnswers(),minutes:60},decisions())[0].id,'no-travel');
});

// Nature of the suggestion controls its home, independent of its saved state.
import {favoriteArea} from '../src/finder-navigation.ts';
test('permanent places and routes stay distinct from time-bound programs',()=>{
 for(const kind of ['Wellness','Schwimmen','Kajak'])assert.equal(favoriteArea(kind),'ideas');
 for(const kind of ['Kino','Streaming','Musik','Kultur','Wandern','Fahrrad','Restaurant','Café','Biergarten','Spaziergang'])assert.equal(favoriteArea(kind),'current');
 assert.equal(favoriteArea('Essen','2026-10-20'),'current');
});
test('stock collection stays visible independently of legacy favorite flags',()=>{
 const rows=[idea('yes',{title:'Lieblingscafé',favorite:true}),idea('no',{title:'Anderes Café'})];
 const before=JSON.stringify(rows);const html=stockMarkup(rows,null,true,false,'',null,true);
 assert.ok(html.includes('Lieblingscafé'));assert.ok(html.includes('Anderes Café'));assert.ok(!html.includes('data-stock-action="favorite"'));assert.equal(JSON.stringify(rows),before);
 assert.equal(withMapsStock({stockMapsVersion:1,activityStock:rows}).activityStock[0].favorite,true);
});

import {stockFromSuggestion,existingStockSuggestion} from '../src/activity-stock.ts';
test('one-click copy keeps explicit route facts, leaves ranges unknown and does not overwrite existing places',()=>{
 const suggestion={suggestionId:'route-1',title:'Lechrunde',category:'Fahrrad',description:'Rundtour',url:'https://example.com/route'};
 const copy=stockFromSuggestion(suggestion,'new',['12,4 km','240 hm','90 min']);
 assert.ok(copy);assert.equal(copy.distanceKm,12.4);assert.equal(copy.elevationM,240);assert.equal(copy.minutes,90);assert.equal(copy.sourceId,'route-1');assert.equal(copy.travelMinutes,null);
 assert.equal(stockFromSuggestion(suggestion,'new',['3–4 h']).minutes,null);
 const own=idea('own',{title:' LECHRUNDE ',note:'Meine Änderung'});assert.equal(existingStockSuggestion([own],suggestion),own);assert.equal(own.note,'Meine Änderung');
 assert.equal(stockFromSuggestion({...suggestion,category:'Musik'},'event'),null);
});

test('import retains the original recommendation and exposes safe links only inside details',()=>{
 const s={suggestionId:'tour',title:'Tour',category:'Wandern',description:'Kurztext',url:'https://example.com/tour'};
 const original={description:'Vollständige Beschreibung',why:'Gipfeltour',conditionsStatus:'Sperren ungeprüft',meta:['12 km'],url:s.url,otherConfirmedFact:'bleibt erhalten'};
 const row=stockFromSuggestion(s,'new',original.meta,original);assert.deepEqual(row.sourceDetails,[original]);original.description='später geändert';assert.equal(row.sourceDetails[0].description,'Vollständige Beschreibung');
 const overview=stockMarkup([row],null,true,false,'');assert.ok(!overview.includes('Vollständige Beschreibung'));assert.ok(!overview.includes('href="https://example.com/tour"'));
 const detail=stockMarkup([row],null,true,false,'',row.id);assert.ok(detail.includes('Vollständige Beschreibung'));assert.ok(detail.includes('Sperren ungeprüft'));assert.ok(detail.includes('href="https://example.com/tour"'));
 const edit=JSON.parse(JSON.stringify({...row,title:'Mein Titel',note:'Eigene Notiz'}));assert.equal(edit.sourceDetails[0].otherConfirmedFact,'bleibt erhalten');
});

import {withStockRating} from '../src/activity-stock.ts';
test('star ratings validate 1–5, clear explicitly and preserve complete imported data',()=>{
 const original=idea('rated',{favorite:true,sourceDetails:[{description:'Beleg',checkedAt:'2026-10-10'}],importedSourceIds:['old'],note:'Eigene Notiz'});
 const before=JSON.stringify(original);
 for(let n=0;n<=100;n+=5){const rated=withStockRating(original,n);assert.ok(validStockItem(rated));assert.equal(JSON.parse(JSON.stringify(rated)).ratingScore,n);assert.deepEqual(withStockRating(rated,null),original);}
 for(const rating of [-1,101,77,NaN])assert.throws(()=>withStockRating(original,rating));
 for(const rating of [null,0,6,'5',2.5])assert.equal(validStockItem({...original,rating}),false);
 assert.equal(JSON.stringify(original),before);
});
test('personal stars prefer matching places while unrated and three stars remain neutral',()=>{
 const a=activity('Spaziergang');const answers={...emptyGuideAnswers(),minutes:60};
 assert.equal(matchingStock(a,[idea('a'),idea('z',{rating:5})],answers,decisions())[0].id,'z');
 assert.equal(matchingStock(a,[idea('a'),idea('z',{rating:3})],answers,decisions())[0].id,'a');
 assert.equal(matchingStock(a,[idea('a',{rating:1}),idea('z')],answers,decisions())[0].id,'z');
 const tooLong=idea('long',{rating:5,minutes:61}),closed=idea('closed',{rating:5,unavailable:true}),hidden=idea('hidden',{rating:5,sourceId:'hidden'});
 assert.equal(matchingStock(a,[tooLong,closed,hidden,idea('okay')],answers,decisions({hidden:new Set(['hidden'])}))[0].id,'okay');
});
test('fine point ratings rank places without reverting to stars; zero remains persisted',()=>{
 const a=activity('Spaziergang'),answers={...emptyGuideAnswers(),minutes:60};
 assert.equal(matchingStock(a,[idea('a',{ratingScore:75}),idea('z',{ratingScore:80})],answers,decisions())[0].id,'z');
 const zero=withStockRating(idea('zero'),0);assert.equal(zero.ratingScore,0);assert.ok(validStockItem(zero));assert.equal(withStockRating(zero,null).ratingScore,undefined);
});
test('rated pools use the standard swim duration without inventing a duration for the place',()=>{
 const a=activity('Schwimmen',{minutes:90,outdoor:false});const place=idea('pool',{kind:'swim',minutes:null,setting:'inside',rating:5});
 assert.equal(matchingStock(a,[place],{...emptyGuideAnswers(),minutes:180,place:'inside'},decisions())[0].id,'pool');
 assert.deepEqual(matchingStock(a,[place],{...emptyGuideAnswers(),minutes:60},decisions()),[]);
 assert.equal(place.minutes,null);
});
test('stock details retain data without rating controls or changing favorites',()=>{
 const row=idea('rated',{rating:4,favorite:true});
 assert.ok(!stockMarkup([row],null,true,false,'').includes('data-taste-rate="4"'));
 const dialog=stockMarkup([row],null,true,false,'Bewertung gespeichert.',row.id);
 assert.doesNotMatch(dialog,/type="range"/);
 assert.doesNotMatch(dialog,/data-taste-details|data-taste-score/);
 assert.match(dialog,/Bewertung gespeichert/);
 assert.equal(row.favorite,true);
});

test('short and long legacy tours share one category without changing stored details',()=>{
 const rows=[idea('short',{kind:'hike-short',minutes:90,rating:4}),idea('long',{kind:'hike-long',minutes:300,note:'Historische Notiz'})];
 const before=JSON.stringify(rows);assert.ok(rows.every(validStockItem));const html=stockMarkup(rows,null,true,false,'');
 assert.equal((html.match(/data-stock-category="hike"/g)||[]).length,1);assert.match(html,/Wanderungen/);assert.ok(!html.includes('Wanderung kurz')&&!html.includes('Wanderung lang'));assert.equal(JSON.stringify(rows),before);
 assert.equal(matchingStock(activity('Wanderung'),rows,{...emptyGuideAnswers(),minutes:180},decisions())[0].id,'short');
});
test('permanent places show no individual duration while routes retain it and old values survive',()=>{
 const pool=idea('pool',{kind:'swim',minutes:90}),tour=idea('tour',{kind:'bike',minutes:120});
 assert.ok(!stockMarkup([pool],null,true,false,'').includes('90 Min.'));
 assert.ok(!stockMarkup([pool],null,true,false,'',pool.id).includes('90 Min.'));
 assert.match(stockMarkup([pool],pool,true,false,''),/data-stock-tour hidden/);
 assert.match(stockMarkup([tour],null,true,false,''),/120 Min\./);
 assert.equal(pool.minutes,90);
});


import {finderSectionVisible,discoveryFoodKind,discoveryRouteKind} from '../src/finder-navigation.ts';
test('standard navigation shows only its two private collection tabs; discovery is under Neues',()=>{
 const sections=['planning','stock','events','movies','restaurants','outdoor'];
 for(const tab of ['planning','stock'])assert.deepEqual(sections.filter(s=>finderSectionVisible(s,false,'events',tab)),[tab]);
 for(const [category,section] of [['events','events'],['cinema','movies'],['stream','movies'],['restaurants','restaurants'],['outdoor','outdoor']])assert.deepEqual(sections.filter(s=>finderSectionVisible(s,true,category,'planning')),[section]);
});
test('discovery separates cafes, restaurants and beer gardens and identifies labelled walks',()=>{
 assert.equal(discoveryFoodKind({type:'Café / Frühstück'}),'cafe');
 assert.equal(discoveryFoodKind({type:'Restaurant · Biergarten'}),'beer-garden');
 assert.equal(discoveryFoodKind({type:'Restaurant'}),'restaurant');
 assert.equal(discoveryRouteKind({kind:'hike',category:'Spaziergang am Lech'}),'walk');
 assert.equal(discoveryRouteKind({kind:'bike',category:'Radtour'}),'bike');
 assert.equal(discoveryRouteKind({kind:'hike',category:'Wanderung'}),'hike');
});


import {streamingFormat,streamingCardMeta,streamingProvider} from '../src/finder-navigation.ts';
import {recommendationPlace} from '../src/locations.ts';
test('streaming groups respect confirmed format and leave ambiguous legacy categories unresolved',()=>{
 assert.equal(streamingFormat({mediaType:'film',category:'Serie'}),'film');
 assert.equal(streamingFormat({category:'Serie · Drama'}),'series');
 assert.equal(streamingFormat({favorite:{categoryLabel:'Film · Tragikomödie'}}),'film');
 assert.equal(streamingFormat({category:'Filme & Serien'}),'unknown');
 assert.equal(streamingFormat({type:'Streaming'}),'unknown');
});
test('streaming previews omit duration while preserving service and start-date metadata',()=>{
 const meta=['Netflix','Seit 01.10.2026','132 min','2.2 h','42 Minuten pro Folge','Laufzeit offen'];
 assert.deepEqual(streamingCardMeta(meta),['Netflix','Seit 01.10.2026']);assert.equal(meta.length,6);
});

test('media duration filtering also covers cinema and streaming provider uses stored evidence',()=>{
 assert.deepEqual(streamingCardMeta(['Thalia','1.9 h','115 Minuten','Seit 13.10.','IMDb 7,3/10']),['Thalia','Seit 13.10.','IMDb 7,3/10']);
 assert.equal(streamingProvider({platform:'Netflix',meta:['ARD Mediathek']}),'Netflix');
 assert.equal(streamingProvider({platform:'In Quelle prüfen',meta:['ARD Mediathek']}),'ARD Mediathek');
 assert.equal(streamingProvider({url:'https://www.netflix.com/de/title/123'}),'Netflix');
 assert.equal(streamingProvider({url:'https://www.zdf.de/serien/a'}),'ZDF Mediathek');
 assert.equal(streamingProvider({url:'https://netflix.com.example.org/a'}),'Anbieter noch ungeklärt');
 assert.equal(streamingProvider({url:'invalid'}),'Anbieter noch ungeklärt');
 assert.equal(recommendationPlace({title:'Film',meta:['Disney+']},'stream'),'Disney+');
});


import {googleMapsPlaceUrl,foodPlace} from '../src/locations.ts';
test('food place links use public Maps search with exact title and available address',()=>{
 const x={title:'Friedrich · Café & Bistro',location:'Hessingstraße 17, Augsburg',url:'https://bistro-friedrich.de/'};
 const before=JSON.stringify(x),u=new URL(googleMapsPlaceUrl(x));
 assert.equal(u.origin,'https://www.google.com');assert.equal(u.pathname,'/maps/search/');assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.get('query'),'Friedrich · Café & Bistro, Hessingstraße 17, Augsburg');assert.equal(JSON.stringify(x),before);
 assert.equal(new URL(googleMapsPlaceUrl({title:'Café Flora'})).searchParams.get('query'),'Café Flora, Augsburg');
 for(const category of ['Restaurant','Café','Biergarten','Bistro'])assert.equal(foodPlace({category}),true);
 assert.equal(foodPlace({kind:'cinema',category:'Kino'}),false);
});
test('existing Maps links are kept and lookalike or credential-bearing links are not used',()=>{
 for(const url of ['https://maps.app.goo.gl/example','https://www.google.de/maps/place/Cafe'])assert.equal(googleMapsPlaceUrl({title:'Ort',url}),url);
 for(const url of ['https://www.google.com.evil.test/maps/place/a','javascript:alert(1)','https://name:secret@www.google.com/maps/a'])assert.equal(new URL(googleMapsPlaceUrl({title:'Ort',url})).searchParams.get('query'),'Ort, Augsburg');
});
test('restaurant cafe and beer garden stock details open Maps without modifying saved homepage',()=>{
 for(const kind of ['restaurant','cafe','beer-garden']){
  const x=idea('food',{kind,title:'Testort',url:'https://restaurant.example/',sourceDetails:[{url:'https://other.example/',description:'Speisekarte'}]});const before=JSON.stringify(x);
  const html=stockMarkup([x],null,true,false,'',x.id);
  assert.match(html,/Google Maps öffnen/);assert.match(html,/google\.com\/maps\/search/);assert.ok(!html.includes('href="https://restaurant.example/"'));assert.ok(!html.includes('href="https://other.example/"'));assert.equal(JSON.stringify(x),before);
 }
 const route=idea('route');assert.match(stockMarkup([route],null,true,false,'',route.id),/href="https:\/\/example.org\/route"/);
});
