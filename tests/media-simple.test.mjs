import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaReleaseLabel,germanTrailerMarkup} from '../src/media-rating.ts';
import {recommendationAllowed,hardEligibilityReason,mediaIdentityKey,mediaHidden} from '../src/recommendation-eligibility.ts';
const now=new Date('2026-10-26T00:30:00Z'),at=now.toISOString();
const movie=(kind='stream',extra={})=>({id:'film',kind,title:'Ozark',description:'',category:kind,url:'https://example.org/film',why:'',date:null,time:null,endTime:null,travelMinutes:null,bookingDeadline:null,km:null,ascent:null,minutes:null,roundTrip:null,exposed:null,climbing:null,closed:null,sourceId:'source',verifiedAt:at,fitScore:0,parts:{},mediaType:'film',releaseDate:'2026-10-01',releaseSourceUrl:'https://example.org/release',imdbRating:7.9,imdbUrl:'https://www.imdb.com/title/tt1234567/',location:kind==='cinema'?'Liliom, Augsburg':'Netflix Deutschland',moviepilotRating:7.4,moviepilotUrl:'https://www.moviepilot.de/movies/testfilm',streamListingUrl:'https://www.moviepilot.de/streaming/neuerscheinungen',streamListingCheckedAt:at,streamListingSection:'Neuerscheinungen',cinemaProgramUrl:'https://www.moviepilot.de/filme/beste/aktuell-kino',cinemaProgramCheckedAt:at,...extra});
test('Source-specific rating boundary, no profile requirement, but genuine source facts remain mandatory',()=>{
 for(const kind of ['cinema','stream']){
  const x=movie(kind);
  for(const approval of [undefined,{status:'rejected'},{status:'qualified'}])assert.equal(recommendationAllowed(x,approval,now),true);
  for(const imdbRating of [null,undefined,NaN,6.9,6.99,10.1])assert.equal(recommendationAllowed({...x,moviepilotRating:imdbRating},null,now),false);
  for(const extra of [{imported:true},{verifiedAt:''},{moviepilotUrl:'https://moviepilot.de.evil/movies/film'},...(kind==='stream'?[{streamListingSection:'Charts'},{streamListingCheckedAt:''}]:[]),{closed:true}])assert.equal(recommendationAllowed({...x,...extra},null,now),false);
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
 assert.equal(mediaReleaseLabel({kind:'cinema',releaseDate:'2026-10-01'}),'Aktuell im Kino · Moviepilot');
 assert.equal(mediaReleaseLabel({kind:'stream',releaseDate:'2026-10-03'}),'Neuerscheinung · Moviepilot');
 assert.equal(mediaReleaseLabel({kind:'cinema',date:'2026-10-25'}),'Aktuell im Kino · Moviepilot');
 assert.match(germanTrailerMarkup({title:'Ein Film'}),/Trailer auf YouTube suchen/);
 assert.match(germanTrailerMarkup({title:'Ein Film',trailerUrl:'https://www.youtube.com/watch?v=video',trailerLanguage:'de'}),/Deutscher Trailer/);
});

 test('cinema accepts Moviepilot user ratings including exactly 7.0, with no IMDb requirement',()=>{
 const film=movie('cinema',{moviepilotRating:7,imdbRating:undefined,imdbUrl:undefined,location:'Deutschland · Moviepilot',releaseDate:undefined,cinemaProgramCheckedAt:'2026-10-25T21:00:00Z'});
 assert.equal(recommendationAllowed(film,null,now),true);
 for(const moviepilotRating of [6.99,6.9,null,undefined,NaN,11])assert.equal(recommendationAllowed({...film,moviepilotRating},null,now),false);
 for(const cinemaProgramUrl of ['https://programmkinosaugsburg.de/programm/liliom','https://programmkinosaugsburg.de/programm/thalia','https://www.cinemaxx.de/kinoprogramm/augsburg/jetzt-im-kino','https://imdb.com.evil/de/showtimes/','https://www.imdb.com/chart/top/'])assert.equal(recommendationAllowed({...film,cinemaProgramUrl},null,now),false);
 assert.equal(recommendationAllowed({...film,cinemaProgramCheckedAt:'2026-10-20T00:00:00Z'},null,now),false);
 assert.equal(recommendationAllowed(movie('stream',{imdbRating:7.6,moviepilotRating:7}),null,now),true);
 });

test('Moviepilot and existing IMDb hidden identities survive offer ID changes',()=>{
 const film=movie('cinema',{id:'new',imdbUrl:undefined}),key=mediaIdentityKey(film);
 assert.equal(key,'media/moviepilot/testfilm');assert.equal(mediaHidden({...film,id:'other'},new Set([key])),true);
 assert.equal(mediaHidden({...film,imdbUrl:'https://www.imdb.com/title/tt1234567/'},new Set(['media/imdb/tt1234567'])),true);
});

test('Moviepilot series identity remains hidden across refresh and never collides with the same film slug',()=>{
 const series={moviepilotUrl:'https://www.moviepilot.de/serie/example'};assert.equal(mediaIdentityKey(series),'media/moviepilot/serie/example');
 assert.equal(mediaHidden({...series,id:'changed'},new Set(['media/moviepilot/serie/example'])),true);
 assert.equal(mediaHidden({moviepilotUrl:'https://www.moviepilot.de/movies/example'},new Set(['media/moviepilot/serie/example'])),false);
});
