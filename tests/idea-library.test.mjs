import test from 'node:test';
import assert from 'node:assert/strict';
import {IdeaStore} from '../src/idea-store.ts';
import {linkedPlaces,visiblePlace,archivedFavorites,collectionKinds,safeLink} from '../src/idea-library.ts';
import {validStockItem} from '../src/activity-stock.ts';

import {fixture,place,routine} from './idea-fixtures.mjs';
test('read-only load keeps exact saved routines, places, ratings, sources and deleted seed markers',async()=>{
 const {database,data}=fixture(),store=new IdeaStore(database),before=structuredClone(data.payload);await store.load();assert.deepEqual(store.state,before);assert.equal(data.writes.length,0);assert.equal(store.state.routines.length,1);assert.equal(store.state.activityStock.length,1);
});
test('editing a place preserves all unrelated payload and hidden source details, accepts JSONB key order',async()=>{
 const {database,data}=fixture(),store=new IdeaStore(database);await store.load();data.mode='reordered';await store.save(s=>{s.activityStock[0]={...s.activityStock[0],title:'Umbenannt'};});
 assert.equal(data.writes.length,1);assert.equal(store.state.activityStock[0].title,'Umbenannt');assert.deepEqual({...store.state.activityStock[0],title:place.title},place);assert.deepEqual(store.state.unknownField,{important:'keep'});assert.deepEqual(store.state.routines,[routine]);assert.equal(store.state.stockMapsVersion,1);assert.equal(store.state.activityStock[0].sourceDetails[0].checkedAt,'2026-10-11T10:00:00Z');
});
test('revision conflicts never overwrite another device and never retry a stale full payload',async()=>{
 const {database,data}=fixture(),store=new IdeaStore(database);await store.load();data.mode='conflict';assert.equal(await store.save(s=>{s.routines[0].title='Stale';}),'conflict');assert.equal(store.state.routines[0].title,routine.title);assert.equal(store.state.unknownField.concurrent,'keep');assert.equal(data.writes.length,1);
});
test('network failure retains confirmed state and blocks another write until a successful fresh read',async()=>{
 const {database,data}=fixture(),store=new IdeaStore(database);await store.load();data.mode='error';await assert.rejects(store.save(s=>{s.activityStock=[];}),/nicht bestätigt/);assert.equal(store.state.activityStock.length,1);await assert.rejects(store.save(s=>{s.activityStock=[];}),/neu laden/);assert.equal(data.writes.length,1);data.mode='normal';await store.load();assert.equal(store.uncertain,false);
});
test('deleted ideas and places do not reappear after saving and reloading; historical data survives',async()=>{
 const {database}=fixture(),store=new IdeaStore(database);await store.load();await store.save(s=>{s.routines=[];s.activityStock=[];});await store.load();assert.deepEqual(store.state.routines,[]);assert.deepEqual(store.state.activityStock,[]);assert.deepEqual(store.state.checks,['2026-10-22']);assert.deepEqual(store.state.unknownField,{important:'keep'});
});
test('failed exclusions hide source-linked records only, including every imported alias',async()=>{
 const {database,data}=fixture(),store=new IdeaStore(database);data.mode='hidden-failure';await store.load();assert.equal(store.decisions.ready,false);assert.equal(visiblePlace(place,store.decisions),false);assert.equal(visiblePlace({...place,sourceId:undefined,importedSourceIds:[]},store.decisions),true);
 assert.equal(visiblePlace(place,{ready:true,hidden:new Set(['alias']),ratings:new Map()}),false);assert.equal(data.writes.length,0);
});
test('short and long tours share their library; additional places support explicit stable-id links',()=>{
 assert.equal(linkedPlaces(routine,[place]).length,1);assert.equal(linkedPlaces({...routine,title:'Meine große Radtour',minutes:400},[place]).length,1);
 const other={...place,kind:'other',linkedRoutineIds:['custom'],address:'Eigener Start'};assert.equal(validStockItem(other),true);assert.equal(linkedPlaces({...routine,title:'Kajak fahren'},[other]).length,1);assert.equal(linkedPlaces({...routine,id:'different'},[other]).length,0);assert.equal(collectionKinds.length,8);
 assert.equal(safeLink('javascript:alert(1)'), '');assert.equal(safeLink('https://user:pass@example.org'),'');
});
test('legacy favorites remain reachable without un-hiding excluded entries or duplicating copied stock',()=>{
 const f=id=>({id,suggestion_id:id,title:id});const d={ready:true,hidden:new Set(['hidden']),ratings:new Map()};assert.deepEqual(archivedFavorites([f('old-source'),f('kept'),f('hidden')],[place],d).map(x=>x.id),['kept']);
 d.hidden.add('media/moviepilot/my-film');assert.deepEqual(archivedFavorites([{...f('changed-id'),url:'https://www.moviepilot.de/movies/my-film'}],[],d),[]);
 assert.equal(visiblePlace({...place,url:'https://www.imdb.com/title/tt1234567/'},{...d,hidden:new Set(['media/imdb/tt1234567'])}),false);
});
