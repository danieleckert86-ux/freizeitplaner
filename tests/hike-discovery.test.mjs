import test from 'node:test';
import assert from 'node:assert/strict';
import {hikeMatchesProfile} from '../src/finder-navigation.ts';

test('hiking discovery uses inclusive 500–900m with honest unknowns',()=>{
 for(const ascent of [500,762,900])assert.equal(hikeMatchesProfile({ascent}),true);
 for(const ascent of [0,109,273,400,499,901,NaN,Infinity])assert.equal(hikeMatchesProfile({ascent}),false);
 for(const row of [{},{ascent:null},{meta:['13,7 km','4 h','Anfahrt 30 Min.']},{meta:['höchstens 900 hm']},{meta:['500 hm','900 hm']}])assert.equal(hikeMatchesProfile(row),false);
 assert.equal(hikeMatchesProfile({meta:['12 km','500 Hm']}),true);
 assert.equal(hikeMatchesProfile({meta:['900 höhenmeter']}),true);
 assert.equal(hikeMatchesProfile({ascent:273,meta:['762 hm']}),false);
});

test('actual imported low routes leave discovery without deleting collection, saved choices or evidence',()=>{
 const stored=[{id:'hindelang',meta:['13,7 km','273 hm','4 h'],imported:true,verifiedAt:'2026-10-09',ratingScore:100},{id:'lauberhart',meta:['11,11 km','109 hm']},{id:'matching',meta:['762 hm']}];
 const before=JSON.stringify(stored),saved=stored.slice(0,1);
 assert.deepEqual(stored.filter(hikeMatchesProfile).map(x=>x.id),['matching']);
 assert.equal(JSON.stringify(stored),before);assert.equal(saved[0].ratingScore,100);assert.equal(saved[0].verifiedAt,'2026-10-09');
});
