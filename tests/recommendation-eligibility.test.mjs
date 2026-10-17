import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationAllowed,hardEligibilityReason} from '../src/recommendation-eligibility.ts';
import {currentAssessment,defaultTasteProfiles} from '../src/taste-settings.ts';
const now=new Date('2026-10-17T12:00:00Z'),at=now.toISOString();
const a={profileKey:'culture',profileUpdatedAt:at,status:'strong',reason:'Belegter Humor und Figuren',caveat:'Ernste Themen',reviewedAt:at,sourceUrls:['https://example.org/detail']};
const x={kind:'event',verifiedAt:at,date:'2026-10-18',time:'19:00',location:'Augsburg'};
test('all discovery categories require a sourced strong decision; hard rejection still wins',()=>{
 for(const kind of ['event','cinema','stream','restaurant','bike','hike','walk'])for(const status of ['qualified','rejected','pending'])assert.equal(recommendationAllowed({...x,kind},{...a,status},now),false);
 assert.equal(recommendationAllowed(x,a,now),true);assert.equal(recommendationAllowed({...x,closed:true},a,now),false);
 assert.equal(recommendationAllowed({...x,contentChangedAt:'2026-10-17T13:00:00Z'},a,now),false);
 assert.equal(currentAssessment('a','culture',{culture:{...defaultTasteProfiles.culture,updatedAt:'2026-10-18T00:00:00Z'}},{a}),null);
});
test('stream 60-day and rating/identity boundaries are enforced in the browser',()=>{
 const stream={...x,kind:'stream',mediaType:'film',location:'Netflix Deutschland',imdbRating:7.8,imdbUrl:'https://www.imdb.com/title/tt1234567/'};
 for(const date of ['2026-10-17','2026-08-18'])assert.equal(recommendationAllowed({...stream,date},a,now),true);
 for(const date of ['2026-08-17','2026-10-18',null,''])assert.equal(recommendationAllowed({...stream,date},a,now),false);
 assert.equal(recommendationAllowed({...stream,imdbRating:7.7},a,now),false);
 assert.equal(recommendationAllowed({...stream,imdbUrl:''},a,now),false);
});
test('old low-ascent imports and long bicycle routes cannot return through a strong review',()=>{
 const hike={...x,routeEvidence:{durationActivity:'walking',ascentMetric:'totalAscent',ascentSourceUrl:'https://example.org/event',ascentVerifiedAt:at,startMunicipality:'Augsburg',startSourceUrl:'https://example.org/event',startVerifiedAt:at,travelMode:'car',travelReference:'augsburg-centre',travelSourceUrl:'https://example.org/event',travelVerifiedAt:at,specialAppeal:'Historischer Natur- und Kulturweg am Kanal',appealSourceUrls:['https://example.org/event'],appealVerifiedAt:at,wayCharacter:'Fester, nicht ausgesetzter Weg',waySourceUrls:['https://example.org/event'],wayVerifiedAt:at,safetySourceUrls:['https://example.org/event'],safetyVerifiedAt:at,surface:'firm'},kind:'hike',km:12,ascent:500,minutes:240,travelMinutes:90,closed:false,exposed:false,climbing:false};
 for(const ascent of [500,900])assert.equal(recommendationAllowed({...hike,ascent},a,now),true);
 for(const ascent of [109,273,499,901])assert.equal(recommendationAllowed({...hike,ascent},a,now),false);
 assert.equal(hardEligibilityReason({...hike,routeEvidence:{...hike.routeEvidence,durationActivity:'cycling'},kind:'bike',km:40.1},now),'bike_distance');
});
