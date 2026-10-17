import { createClient } from '@supabase/supabase-js';

export const RECIPE_APP_URL = 'https://was-koche-ich-heute-daniel-c82d.vercel.app';
export type DinnerRecipe = {id:string;title:string;category:string;image:string;minutes:number|null;search:string};
const neonBase=import.meta.env.VITE_RECIPE_DATABASE_URL as string|undefined;
if(neonBase&&neonBase!=='https://fahrrad-zur-arbei.vercel.app/api/recipes/database')throw Error('Ungültige Rezept-Verbindung');
const recipeDb = createClient(neonBase||'https://wgiqzmeuxluxqnnsyyue.supabase.co',neonBase?'shared-recipes':'sb_publishable_SElwH8yU99vG347ROLXcGA_B3Haw-n1', {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},...(neonBase?{global:{fetch:async(input:RequestInfo|URL,init?:RequestInit)=>{const headers=new Headers(init?.headers);headers.delete('authorization');headers.delete('apikey');return fetch(input,{...init,headers});}}}:{})});
export const recipeLink = (id:string) => RECIPE_APP_URL + '/?recipe=' + encodeURIComponent(id);

export async function loadDinnerRecipes():Promise<DinnerRecipe[]> {
  const {data,error} = await recipeDb.from('recipes')
    .select('id,title,category,image_url,image_path,total_time,ingredients,tags,updated_at')
    .in('recipe_type',['OWN','ADOPTED']).order('title').abortSignal(AbortSignal.timeout(12000));
  if(error)throw Error('Deine Rezepte sind gerade nicht erreichbar. Bitte erneut versuchen.');
  return (data??[]).filter(r=>typeof r.id==='string'&&typeof r.title==='string').map(r=>{
    let image = r.image_path ? recipeDb.storage.from('recipe-images').getPublicUrl(r.image_path).data.publicUrl : r.image_url;
    if(image) { try {const url=new URL(image,RECIPE_APP_URL);image=/^https?:$/.test(url.protocol)?url.href:'';} catch {image='';} }
    if(image)image+=(image.includes('?')?'&':'?')+'v='+encodeURIComponent(r.updated_at||'');
    const ingredients = Array.isArray(r.ingredients)?r.ingredients.map(i=>i&&typeof i==='object'?'name' in i?String(i.name):'':''): [];
    return {id:r.id,title:r.title,category:r.category||'',image:image||'',minutes:r.total_time,search:[r.title,r.category,...(r.tags??[]),...ingredients].join(' ').toLocaleLowerCase('de-DE')};
  });
}
