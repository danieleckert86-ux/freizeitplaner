// All non-local network traffic is intercepted. Writes only update synthetic fixture memory.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {state,place,routine} from './idea-fixtures.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const binary=process.env.CHROMIUM_MODULE?(await import(process.env.CHROMIUM_MODULE)).default:null;
const browser=await chromium.launch({headless:true,...(binary?{executablePath:await binary.executablePath(),args:binary.args}:{}),...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process']}:{})});
const base=process.argv[2]||'http://127.0.0.1:4187';
const dev=process.env.START_VITE?(await import('vite')).createServer({server:{port:4187,host:'127.0.0.1'}}):null;
const server=dev?await dev:null;
if(server)await server.listen();
let payload=state(),revision=1,writes=0;
payload.routines.push({...routine,id:'restaurant',title:'Essen gehen',activityCategory:'food',mood:'food'});
payload.activityStock.push(...Array.from({length:32},(_,i)=>({...place,id:'restaurant-'+i,title:'Restaurant mit einem besonders langen Namen '+i,kind:'restaurant',sourceId:undefined,importedSourceIds:[],note:'Meine persönliche Notiz'})));
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.origin===new URL(base).origin)return route.continue();
 const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,PATCH,OPTIONS','access-control-allow-headers':'*','content-type':'application/json'};
 if(req.method()==='OPTIONS')return route.fulfill({headers,body:''});
 if(url.pathname.endsWith('personal_planning')){
  if(req.method()==='PATCH'){writes++;payload=req.postDataJSON().payload;revision++;}
  return route.fulfill({headers,body:JSON.stringify({payload,revision})});
 }
 if(/favorites|recommendation_ratings|hidden_recommendations/.test(url.pathname))return route.fulfill({headers,body:'[]'});
 return route.fulfill({status:404,headers,body:'{}'});
});
try{
 for(const width of [320,390,1024]){
  await page.setViewportSize({width,height:900});await page.goto(base);await page.getByRole('heading',{name:'Meine kleine Radtour',exact:true}).waitFor();
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();
  await page.getByLabel('Eigene Notiz / Vorbereitung').fill('Vorbereitung '+width);
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await page.getByText('Vorbereitung '+width,{exact:true}).waitFor();
  assert.equal(await page.locator('nav[aria-label=Hauptbereiche]').count(),0);
  await page.getByLabel('Sammlungsbereich').selectOption('food');
  await page.getByRole('heading',{name:'Essen gehen',exact:true}).waitFor();
  const targetId='restaurant-'+([320,390,1024].indexOf(width));
  await page.locator('[data-action=open-place][data-id="'+targetId+'"]').click();
  await page.getByRole('heading',{name:'Restaurant mit einem besonders langen Namen '+[320,390,1024].indexOf(width),exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'horizontal overflow at '+width);
  assert.equal(await page.getByRole('button',{name:'Neues',exact:true}).count(),0);
  if(width<740){assert.equal(await page.locator('.idea-index').isVisible(),false);await page.locator('[data-action=toggle-list]').click();assert.equal(await page.locator('.idea-index').isVisible(),true);await page.locator('[data-action=toggle-list]').click();assert.equal(await page.locator('.idea-index').isVisible(),false);}
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();
  await page.getByRole('textbox',{name:'Name',exact:true}).fill('Mein Restaurant '+width);
  await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await page.getByRole('heading',{name:'Mein Restaurant '+width,exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.reload();await page.getByLabel('Idee, Ort oder Tour suchen').fill('Mein Restaurant '+width);
  await page.getByRole('heading',{name:'Mein Restaurant '+width,exact:true}).waitFor();
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/freizeitideen-'+width+'.png',fullPage:true});
 }
 assert.equal(writes,6);assert.deepEqual(errors,[]);assert.equal(payload.unknownField.important,'keep');assert.equal(payload.activityStock[0].sourceDetails[0].checkedAt,'2026-10-11T10:00:00Z');
 console.log('Chromium: 320/390/1024px, 32 Orte, single entry, linked places, global search, edit/save/reload, safe widths; 6 fixture writes, 0 production writes.');
}finally{await browser.close();if(server)await server.close();}
