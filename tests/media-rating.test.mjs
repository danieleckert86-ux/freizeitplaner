import test from 'node:test';
import assert from 'node:assert/strict';
import {imdbRating,mediaRecommendationAllowed,imdbMarkup,imdbTitleUrl} from '../src/media-rating.ts';
test('IMDb boundary is exact, including zero; missing or malformed ratings are unknown',()=>{
 for(const value of [0,6.9,6.99])assert.equal(mediaRecommendationAllowed({imdbRating:value}),false);
 for(const value of [7,7.1,10,undefined,null,NaN,Infinity,-1,11,'6.9'])assert.equal(mediaRecommendationAllowed({imdbRating:value}),true);
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
