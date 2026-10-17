import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTasteProfiles,validTasteProfiles,validTasteAssessments,profileKeyFor,currentAssessment,strongAssessmentAllowed} from '../src/taste-settings.ts';
test('confirmed profiles preserve nuanced positive references and separate formats',()=>{
 assert.equal(validTasteProfiles(defaultTasteProfiles),true);
 assert.equal(profileKeyFor({kind:'cinema',category:''}),'film');
 assert.equal(profileKeyFor({kind:'stream',mediaType:'film',category:''}),'film');
 assert.equal(profileKeyFor({kind:'stream',mediaType:'series',category:''}),'series');
 assert.equal(profileKeyFor({kind:'stream',category:''}),null);
 assert.match(defaultTasteProfiles.series.examples,/Love: intelligent und witzig/);
 assert.match(defaultTasteProfiles.series.examples,/Modern Family: entspannte Unterhaltung/);
 assert.equal(validTasteProfiles({film:{wishes:'x',avoid:'',examples:'',updatedAt:'bad'}}),false);
});
test('personal claims require evidence and the exact saved profile version',()=>{
 const p=defaultTasteProfiles.film;
 const a={profileKey:'film',profileUpdatedAt:p.updatedAt,status:'strong',reason:'Figuren und Humor',caveat:'',reviewedAt:p.updatedAt,sourceUrls:['https://example.org/review']};
 assert.equal(validTasteAssessments({id:a}),true);
 assert.equal(currentAssessment('id','film',{film:p},{id:a}),a);
 assert.equal(currentAssessment('id','series',{film:p},{id:a}),null);
 assert.equal(currentAssessment('id','film',{film:{...p,updatedAt:'2026-10-17T00:00:00Z'}},{id:a}),null);
 assert.equal(validTasteAssessments({id:{...a,sourceUrls:[]}}),false);
});
test('food openings have no personal profile or default drafts',()=>{
 assert.equal(profileKeyFor({kind:'restaurant',category:'Café · Frühstück'}),null);
 assert.equal(profileKeyFor({kind:'restaurant',category:'Biergarten'}),null);
 for(const key of ['restaurant','cafe','beerGarden'])assert.equal(defaultTasteProfiles[key],undefined);
});

test('media display requires current evidenced positive decision, retaining content notes',()=>{
 const p=defaultTasteProfiles.film;
 const a={profileKey:'film',profileUpdatedAt:p.updatedAt,status:'strong',reason:'Figurenentwicklung und intelligenter Humor',caveat:'',reviewedAt:p.updatedAt,sourceUrls:['https://example.org/review']};
 const allowed=(a,profiles={film:p})=>strongAssessmentAllowed(currentAssessment('id','film',profiles,{id:a}));
 assert.equal(allowed(a),true);
 for(const status of ['qualified','rejected'])assert.equal(allowed({...a,status}),false);
 assert.equal(strongAssessmentAllowed(null),false);
 assert.equal(strongAssessmentAllowed(undefined),false);
 assert.equal(allowed({...a,caveat:'Ernste Themen, aufmerksam schauen'}),true);
 assert.equal(allowed({...a,sourceUrls:[]}),false);
 assert.equal(allowed(a,{film:{...p,updatedAt:'2026-10-18T00:00:00Z'}}),false);
 assert.equal(allowed(a,{}),false);
});


test('regrouping mixed event formats does not invent a new personal profile review',()=>{
 assert.equal(profileKeyFor({kind:'event',category:'Kabarett · Musik-Comedy'}),'music');
 assert.equal(profileKeyFor({kind:'event',category:'Lesung'}),'culture');
});
