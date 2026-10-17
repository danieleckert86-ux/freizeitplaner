import test from 'node:test';
import assert from 'node:assert/strict';
import {hikeAscentAllowed} from '../src/finder-navigation.ts';
test('new hike suggestions require a known ascent within 500–900 m inclusive',()=>{
 for(const ascent of [109,273,499,901,null,NaN,Infinity])assert.equal(hikeAscentAllowed({ascent}),false);
 for(const ascent of [500,650,900])assert.equal(hikeAscentAllowed({ascent}),true);
 assert.equal(hikeAscentAllowed({meta:['12 km','273 Hm','4 h']}),false);
 assert.equal(hikeAscentAllowed({meta:['12 km','500 Hm','4 h']}),true);
 assert.equal(hikeAscentAllowed({meta:['900 Höhenmeter']}),true);
 for(const meta of [[],['Höchster Punkt 800 m'],['Höhendifferenz 600 m'],['600 Hm','700 Hm']])assert.equal(hikeAscentAllowed({meta}),false);
 assert.equal(hikeAscentAllowed({ascent:273,meta:['650 Hm']}),false);
 assert.equal(hikeAscentAllowed({ascent:null,meta:['650 Hm']}),false);
 const old={ascent:273,meta:['273 Hm']};const before=JSON.stringify(old);hikeAscentAllowed(old);assert.equal(JSON.stringify(old),before);
});

