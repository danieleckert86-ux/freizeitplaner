import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaReleaseLabel,germanTrailerMarkup} from '../src/media-rating.ts';
import {recommendationAllowed,hardEligibilityReason,mediaIdentityKey,mediaHidden} from '../src/recommendation-eligibility.ts';
const now=new Date('2026-10-26T00:30:00Z'),at=now.toISOString();
const movie=(kind='stream',extra={})=>({id:'film',kind,title:'Ozark',description:'',category:kind,url:'https://example.org/film',why:'',date:null,time:null,endTime:null,travelMinutes:null,bookingDeadline:null,km:null,ascent:null,minutes:null,roundTrip:null,exposed:null,climbing:null,closed:null,sourceId:'source',verifiedAt:at,fitScore:0,parts:{},mediaType:'film',releaseDate:'2026-10-01',releaseSourceUrl:'https://example.org/release',imdbRating:7.9,imdbUrl:'https://www.imdb.com/title/tt1234567/',location:kind==='cinema'?'Liliom, Augsburg':'Netflix Deutschland',cinemaProgramUrl:'https://programmkinosaugsburg.de/programm/liliom',cinemaProgramCheckedAt:at,...extra});
test('IMDb strict boundary, no profile requirement, but genuine source facts remain mandatory',()=>{
 for(const kind of ['cinema','stream']){
  const x=movie(kind);
  for(const approval of [undefined,{status:'rejected'},{status:'qualified'}])assert.equal(recommendationAllowed(x,approval,now),true);
  for(const imdbRating of [null,undefined,NaN,7.8,7.79,10.1])assert.equal(recommendationAllowed({...x,imdbRating},null,now),false);
  for(const extra of [{imported:true},{verifiedAt:''},{imdbUrl:'https://imdb.com.evil/title/tt123/'},...(kind==='stream'?[{releaseDate:''},{releaseDate:'2026-10-27'}]:[]),{closed:true}])assert.equal(recommendationAllowed({...x,...extra},null,now),false);
 }
});
test('permanent IMDb exclusion survives reload, offer ID and platform/category changes',()=>{
 const first=movie(),hidden=new Set(JSON.parse(JSON.stringify([mediaIdentityKey(first)])));
 assert.equal(mediaHidden(movie('stream',{id:'different',location:'Disney+ Deutschland'}),hidden),true);
 assert.equal(mediaHidden(movie('cinema',{id:'cinema-copy'}),hidden),true);
 assert.equal(mediaHidden(movie('stream',{imdbUrl:'https://www.imdb.com/title/tt9876543/'}),hidden),false);
 assert.equal(mediaHidden(first,new Set(['film'])),true);
 assert.equal(mediaIdentityKey({imdbUrl:'https://imdb.com.evil/title/tt123/'}),'');
});
test('known availability end never becomes an additional thirty days',()=>{
 assert.equal(recommendationAllowed(movie('stream',{availableUntil:at}),null,now),false);
});

test('release date and German trailer links stay available without taste data',()=>{
 assert.equal(mediaReleaseLabel({kind:'cinema',releaseDate:'2026-10-01'}),'Diese Woche im Kino');
 assert.equal(mediaReleaseLabel({kind:'stream',releaseDate:'2026-10-03'}),'Beim Dienst seit: 03.10.2026');
 assert.equal(mediaReleaseLabel({kind:'cinema',date:'2026-10-25'}),'Diese Woche im Kino');
 assert.match(germanTrailerMarkup({title:'Ein Film'}),/Trailer auf YouTube suchen/);
 assert.match(germanTrailerMarkup({title:'Ein Film',trailerUrl:'https://www.youtube.com/watch?v=video',trailerLanguage:'de'}),/Deutscher Trailer/);
});
