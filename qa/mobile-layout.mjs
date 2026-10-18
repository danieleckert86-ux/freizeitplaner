
import {chromium as pw} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const stamp=new Date().toISOString();const day=stamp.slice(0,10);
const base={title:'Restaurant und Kulturhaus mit besonders langem Namen in Augsburg',type:'Restaurant',description:'Ausführliche Beschreibung für die isolierte mobile Layoutprüfung.',meta:['Augsburg'],url:'https://example.invalid/original',badge:'Passt gut',city:'Augsburg',address:'Maximilianstraße 123, Hinterhof am historischen Stadtmarkt, 86150 Augsburg',verifiedAt:stamp,fitScore:84,location:'Augsburg · Maximilianstraße 123, Hinterhof am historischen Stadtmarkt',closed:false,openingCity:'Augsburg',openingDate:day,openingSourceUrl:'https://example.invalid/opening',date:day,time:'23:59',imdbUrl:'https://www.imdb.com/title/tt1234567/'};
const data={schemaVersion:2,dataUpdated:stamp,weekendRange:'Test',weatherDays:[],top:[],ideas:[],hikes:[],bikes:[],walks:[],discoveries:[],restaurants:[{...base,id:'qa-food',category:'restaurant'}],cinema:[{...base,id:'qa-cinema',title:'Ein besonders langer Kinofilmtitel für die mobile Vorschau',type:'Kino',category:'cinema',imdbRating:7.8,imdbUrl:'https://www.imdb.com/title/tt1234567/',trailerUrl:'https://www.youtube.com/watch?v=example',trailerLanguage:'de'}],stream:[{...base,id:'qa-stream',title:'Eine besonders lange Streamingserie für die mobile Vorschau',type:'Serie',mediaType:'series',category:'stream',platform:'ARD Mediathek',releaseDate:day,imdbRating:8.1,trailerLanguage:'de',trailerUrl:'https://www.youtube.com/watch?v=example'}]};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const file=join(process.cwd(),'dist',u.pathname==='/'?'index.html':u.pathname);const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end('not found');}});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
let browser;
try{
 browser=await pw.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true});
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,deviceScaleFactor:1});
  let writes=0;page.on('pageerror',e=>console.log('QA_PAGE_ERROR '+e.message));page.on('console',m=>{if(m.type()==='error')console.log('QA_CONSOLE '+m.text());});
  await page.route('**/*',async route=>{
   const req=route.request(),url=req.url();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes++;return route.abort();}
   if(url.startsWith('http://127.0.0.1:4173'))return route.continue();
   if(url.includes('/api/leisure/catalog'))return route.fulfill({json:data});
   if(url.includes('recommendation_data'))return route.fulfill({json:{payload:data}});
   return route.fulfill({json:[]});
  });
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.waitForSelector('.lifestyle-card[data-lifestyle-id="qa-food"]',{state:'attached',timeout:15000});
  assert.equal(await page.locator('#tasteArchive').isVisible(),false,'taste overview stays hidden');
  for(const id of ['qa-food','qa-cinema','qa-stream']){
   const card=page.locator('.lifestyle-card[data-lifestyle-id="'+id+'"]');
   await card.evaluate(el=>{for(let p=el;p&&p!==document.body;p=p.parentElement){p.hidden=false;p.classList.remove('is-hidden');p.style.removeProperty('display');}el.removeAttribute('data-profile-rejected');});
   await card.scrollIntoViewIfNeeded();
   const bounds=await card.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const buttons=[...el.querySelectorAll('button,a')].filter(b=>b.getClientRects().length&&getComputedStyle(b).display!=='none').map(b=>{const q=b.getBoundingClientRect();return {text:b.textContent.trim(),left:q.left,right:q.right,top:q.top,bottom:q.bottom,height:q.height};});
    return {left:r.left,right:r.right,bottom:r.bottom,width:r.width,scroll:el.scrollWidth,client:el.clientWidth,buttons};
   });
   assert(bounds.left>=-1&&bounds.right<=width+1,JSON.stringify({width,id,bounds}));
   assert(bounds.scroll<=bounds.client+1,'card horizontal content overflow '+id);
   assert(bounds.buttons.length>=2,'card action buttons rendered '+id);
   for(const b of bounds.buttons){assert(b.left>=bounds.left-1&&b.right<=bounds.right+1&&b.bottom<=bounds.bottom+1,'button containment '+JSON.stringify({width,id,b}));assert(b.height>=43.9,'44px action '+JSON.stringify({width,id,b}));}
   const more=card.locator('button.card-more,button[data-details]').first();
   if(await more.count()){
    await more.click();
    const dialog=page.locator('dialog[open]').first();
    await dialog.waitFor({state:'visible'});
    const d=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,client:el.clientWidth,scroll:el.scrollWidth};});
    assert(d.left>=-1&&d.right<=width+1&&d.scroll<=d.client+1,'dialog mobile overflow '+JSON.stringify({width,id,d}));
    await dialog.evaluate(el=>el.close());
   }else throw Error('Missing actual detail action '+id);
   console.log('MOBILE_LAYOUT_OK '+JSON.stringify({width,id,buttons:bounds.buttons.length,details:true}));
  }
  assert.equal(writes,0,'No write calls during fixture tests');
  console.log('MOBILE_VIEWPORT_OK '+width+' hidden taste overview; long addresses; IMDb/trailer; contained 44px actions; real detail dialogs; synthetic data only');
  await page.close();
 }
 console.log('MOBILE_LAYOUT_PASS 320px 390px');
}finally{await browser?.close();server.close();}
