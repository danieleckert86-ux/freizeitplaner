import test from 'node:test';
import assert from 'node:assert/strict';
import {outdoorPicks} from '../src/outdoor-selection.ts';
const tour=(id,fitScore=80,title=id,url='https://example.org/'+id)=>({id,title,url,fitScore});
test('saved aliases, hidden routes and URL duplicates excluded before filling two slots',()=>{
 const rows=[tour('hidden',100),tour('saved',99),tour('alias',98,'Other','https://example.org/hidden?utm_source=x'),tour('one'),tour('duplicate',79,'  ONE  '),tour('two',78),tour('three',77)];
 assert.deepEqual(outdoorPicks(rows,[{title:'library',url:'',importedSourceIds:['saved']}],new Set(['hidden'])).map(x=>x.id),['one','two']);
});
test('library and favorites match title or canonical URL; loading fails closed, no filler',()=>{
 const rows=[tour('one'),tour('two'),tour('three')];
 const saved=[{suggestionId:'legacy',title:'ONE',url:''},{title:'different',url:'https://example.org/two/'}];
 assert.deepEqual(outdoorPicks(rows,saved,new Set()).map(x=>x.id),['three']);
 assert.deepEqual(outdoorPicks(rows,[],new Set(),false),[]);
 assert.equal(outdoorPicks(rows,[],new Set()).length,2);
});
