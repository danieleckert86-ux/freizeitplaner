import test from 'node:test';
import assert from 'node:assert/strict';
import {imdbRating,mediaRecommendationAllowed,imdbMarkup,imdbTitleUrl,germanTrailerMarkup,youtubeTrailerSearchUrl} from '../src/media-rating.ts';
test('IMDb requires a confirmed rating strictly above 7.8; unknown is not approved',()=>{
 for(const value of [0,7,7.6,7.79,7.8,undefined,null,NaN,Infinity,-1,11,'8.5'])assert.equal(mediaRecommendationAllowed({imdbRating:value}),false);
 for(const value of [7.9,8,10])assert.equal(mediaRecommendationAllowed({imdbRating:value}),true);
 assert.equal(imdbRating(0),0);assert.equal(imdbRating('7'),null);
});
test('rating markup uses German decimal and only a genuine IMDb title link',()=>{
 assert.match(imdbMarkup({imdbRating:7.3,imdbUrl:'https://www.imdb.com/title/tt1234567/'}),/IMDb 7,3\/10/);
 assert.match(imdbMarkup({imdbRating:7}),/^<span/);
 for(const imdbUrl of ['javascript:alert(1)','https://imdb.com.evil.org/title/tt123/','https://user:pass@imdb.com/title/tt123/','https://imdb.com/chart/top/']){
  assert.equal(imdbTitleUrl(imdbUrl),'');assert.match(imdbMarkup({imdbRating:7,imdbUrl}),/^<span/);
 }
 assert.equal(imdbMarkup({}), '');assert.equal(imdbMarkup({imdbRating:Infinity}), '');
});

test('German trailer needs explicit language evidence; missing or English is not relabelled',()=>{
 const trailerUrl='https://www.youtube.com/watch?v=confirmed-video';
 assert.match(germanTrailerMarkup({trailerUrl,trailerLanguage:'de'}),/Deutscher Trailer/);
 for(const trailerLanguage of [undefined,null,'en','other'])assert.equal(germanTrailerMarkup({trailerUrl,trailerLanguage}),'');
 assert.equal(germanTrailerMarkup({trailerLanguage:'de'}),'');
});
test('trailer links are HTTPS, credential-free and safely escaped',()=>{
 for(const trailerUrl of ['javascript:alert(1)','http://example.org/video','https://user:pass@example.org/video','not a url'])assert.equal(germanTrailerMarkup({trailerUrl,trailerLanguage:'de'}),'');
 assert.match(germanTrailerMarkup({trailerUrl:'https://example.org/trailer?a=1&b=2',trailerLanguage:'de'}),/a=1&amp;b=2/);
});

test('missing or unconfirmed German trailers link to an encoded YouTube title search',()=>{
 const title='Film & Serie: Äpfel / Staffel 2';
 for(const trailerLanguage of [undefined,'en','other','de']){
  const html=germanTrailerMarkup({title,trailerLanguage,trailerUrl:'javascript:alert(1)'});
  assert.match(html,/Trailer auf YouTube suchen/);
  assert.ok(html.includes(encodeURIComponent(title+' trailer deutsch')));
  assert.doesNotMatch(html,/▶ Deutscher Trailer/);
 }
 const url=new URL(youtubeTrailerSearchUrl(title));
 assert.equal(url.hostname,'www.youtube.com');
 assert.equal(url.searchParams.get('search_query'),title+' trailer deutsch');
 assert.equal(youtubeTrailerSearchUrl('  '),'');
 assert.match(germanTrailerMarkup({title,trailerLanguage:'de',trailerUrl:'https://example.org/trailer'}),/Deutscher Trailer/);
 assert.doesNotMatch(germanTrailerMarkup({title,trailerLanguage:'de',trailerUrl:'https://example.org/trailer'}),/YouTube suchen/);
});

test('cinema rating gate accepts 7.6 but keeps streaming above 7.8',()=>{
 for(const imdbRating of [7.6,7.8,7.9,10])assert.equal(mediaRecommendationAllowed({kind:'cinema',imdbRating}),true);
 for(const imdbRating of [7.5,undefined,null,NaN,11])assert.equal(mediaRecommendationAllowed({kind:'cinema',imdbRating}),false);
 assert.equal(mediaRecommendationAllowed({kind:'stream',imdbRating:7.6}),false);
});
