// Run against a local dev server. Every external request is intercepted; no user data is written.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const binary=process.env.CHROMIUM_MODULE?createRequire(import.meta.url)(process.env.CHROMIUM_MODULE):null;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}:{}),...(binary?{executablePath:await binary.executablePath(),args:binary.args}:{})});
const baseUrl=process.argv[2]||'http://127.0.0.1:4187/#aktuell',appOrigin=new URL(baseUrl).origin;
const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});
const at='2026-10-17T10:00:00Z';
const profile={wishes:'Figuren, eigene Geschichten und Humor',avoid:'',examples:'',updatedAt:at};
const profiles=Object.fromEntries(['film','series','music','culture','restaurant','cafe','beerGarden','hike','bike','walk','standard'].map(k=>[k,{...profile}]));
const assessments={};
function rec(id,kind,extra={}){
 const item={id,kind,title:id,category:kind==='event'?'Kultur':kind==='restaurant'?'Restaurant':kind,type:kind==='stream'?'Streaming':'Restaurant',description:'Belegte Beschreibung',url:'https://example.org/'+id,location:kind==='stream'?'RTL+ Deutschland':'Augsburg',day:'all',date:kind==='stream'?'2026-10-01':'2026-10-18',time:'19:00',favorite:{id,title:id,categoryLabel:kind==='event'?'Kultur':kind,description:'Beschreibung',url:'https://example.org/'+id,dayLabel:'2026-10-18'},badge:kind,meta:[],facts:[],label:kind,fitScore:90,verifiedAt:at,imported:false,closed:false,...extra};
 assessments[id]={profileKey:kind==='event'?'culture':kind==='stream'?'film':kind,profileUpdatedAt:at,status:'strong',reason:'Belegte Passung',caveat:'',reviewedAt:at,sourceUrls:['https://example.org/'+id]};return item;
}
const approved=rec('event-approved','event'),pending=rec('event-pending','event'),qualified=rec('food-qualified','restaurant'),food=rec('food-approved','restaurant');
delete assessments[pending.id];assessments[qualified.id].status='qualified';
const stream=rec('stream-approved','stream',{mediaType:'film',platform:'RTL+ Deutschland',releaseDate:'2026-10-01',imdbRating:8,imdbUrl:'https://www.imdb.com/title/tt0120737/'});
const expired=rec('stream-expired','stream',{...stream,id:'stream-expired',title:'stream-expired',favorite:undefined,date:'2026-08-17',releaseDate:'2026-08-17'});
const hike=rec('hike-approved','hike',{routeEvidence:{durationActivity:'walking',ascentMetric:'totalAscent',ascentSourceUrl:'https://example.org/event',ascentVerifiedAt:at,startMunicipality:'Augsburg',startSourceUrl:'https://example.org/event',startVerifiedAt:at,travelMode:'car',travelReference:'augsburg-centre',travelSourceUrl:'https://example.org/event',travelVerifiedAt:at,specialAppeal:'Historischer Natur- und Kulturweg am Kanal',appealSourceUrls:['https://example.org/event'],appealVerifiedAt:at,wayCharacter:'Fester, nicht ausgesetzter Weg',waySourceUrls:['https://example.org/event'],wayVerifiedAt:at,safetySourceUrls:['https://example.org/event'],safetyVerifiedAt:at,surface:'firm'},km:12,ascent:700,minutes:240,travelMinutes:100,exposed:false,climbing:false});
const low=rec('hike-too-low','hike',{routeEvidence:{durationActivity:'walking',ascentMetric:'totalAscent',ascentSourceUrl:'https://example.org/event',ascentVerifiedAt:at,startMunicipality:'Augsburg',startSourceUrl:'https://example.org/event',startVerifiedAt:at,travelMode:'car',travelReference:'augsburg-centre',travelSourceUrl:'https://example.org/event',travelVerifiedAt:at,specialAppeal:'Historischer Natur- und Kulturweg am Kanal',appealSourceUrls:['https://example.org/event'],appealVerifiedAt:at,wayCharacter:'Fester, nicht ausgesetzter Weg',waySourceUrls:['https://example.org/event'],wayVerifiedAt:at,safetySourceUrls:['https://example.org/event'],safetyVerifiedAt:at,surface:'firm'},km:12,ascent:273,minutes:240,travelMinutes:100,exposed:false,climbing:false});
const data={schemaVersion:2,dataUpdated:at,weekendRange:'Fixture',weatherDays:[],top:[],ideas:[],discoveries:[approved,pending],restaurants:[food,qualified],cinema:[],stream:[stream,expired],hikes:[hike,low],bikes:[],walks:[],catalogChecks:[],catalogSources:[]};
const personal={version:1,appointments:[],slots:[],entries:[],checks:[],routines:[],activityStock:[],tasteProfiles:profiles,tasteAssessments:assessments};
let writes=0;
await page.route('**/*',async route=>{
 const request=route.request(),url=request.url();
 if(new URL(url).origin===appOrigin)return route.continue();
 if(request.method()!=='GET'){writes++;return route.fulfill({status:405,body:'Fixture is read-only'});}
 const headers={'access-control-allow-origin':'*','content-type':'application/json'};
 if(url.includes('/api/leisure/catalog'))return route.fulfill({headers,body:JSON.stringify(data)});
 if(url.includes('/personal_planning'))return route.fulfill({headers,body:JSON.stringify({payload:personal,revision:1})});
 if(/hidden_recommendations|recommendation_ratings|favorites/.test(url))return route.fulfill({headers,body:'[]'});
 return route.fulfill({status:503,headers,body:'{}'});
});
try{
 await page.goto(baseUrl);
 const visible=title=>page.getByRole('heading',{name:title,exact:true});
 await visible('event-approved').waitFor({state:'visible'});
 assert.equal(await visible('event-pending').isVisible(),false);
 await page.locator('[data-new-tab="restaurants"]').click();
 await visible('food-approved').waitFor({state:'visible'});
 assert.equal(await visible('food-qualified').isVisible(),false);
 await page.locator('[data-new-tab="stream"]').click();
 await visible('stream-approved').waitFor({state:'visible'});
 assert.equal(await visible('stream-expired').isVisible(),false);
 await page.locator('[data-new-tab="outdoor"]').click();
 await visible('hike-approved').waitFor({state:'visible'});
 assert.equal(await visible('hike-too-low').count(),0);
 // Simulate a saved profile change in the read-only API fixture.
 profiles.hike.updatedAt='2026-10-17T13:00:00Z';
 // Reload with a changed saved profile; old assessments must become pending.
 await page.reload();await page.locator('[data-new-tab="outdoor"]').click();
 await page.waitForFunction(()=>document.querySelector('.taste-profile-preview'));
 await page.waitForTimeout(100);
 assert.equal(await visible('hike-approved').isVisible(),false);
 assert.deepEqual(errors,[]);assert.equal(writes,0);
 console.log(JSON.stringify({browser:'passed',strongOnly:true,stream60Days:true,hikeBounds:true,profileChange:true,consoleErrors:errors,writes}));
}finally{await browser.close();}
