import {categoryOf,legacyMood, type ActivityCategory, type ActivitySetting} from './activity-properties.ts';
export type KnownActivity = { id:string; title:string; minutes:number; energy:string; mood:string; effort:string; outdoor:boolean; next:string; activityCategory?:ActivityCategory; setting?:ActivitySetting };
const groups: [string,boolean,number,string[]][] = [
 ['outdoor',true,45,[
  'Spaziergang am Lech','Runde durch den Siebentischwald','Spaziergang zum Hochablass','Kleine Runde durch die Altstadt','Neues Augsburger Viertel zu Fuß erkunden','Spaziergang mit Kaffee oder Eis','Picknick im Grünen','Mit einem Buch draußen sitzen','Sonnenuntergang am Wasser anschauen','Spaziergang an einem See'
 ]],
 ['movement',true,90,[
  'Kleine Fahrradrunde mit Café-Stopp','Radtour entlang von Lech oder Wertach','Fahrradausflug mit Picknick','Kajak am Eiskanal, wenn es für beide passt'
 ]],
 ['movement',false,60,['Gemeinsam schwimmen gehen','Gemeinsam Yoga machen']],
 ['movement',true,240,['Kleine Wanderung mit Einkehr','Rundwanderung mit Gipfel, ohne ausgesetzte Stellen']],
 ['food',false,90,[
  'Ein bekanntes Lieblingsgericht gemeinsam kochen','Ein neues vegetarisches Rezept ausprobieren','Pizza selbst machen','Gemeinsam backen','Frühstück oder Brunch zu Hause','Frühstücken gehen','Kaffee und Kuchen essen gehen','Vegetarisch essen gehen','Essen holen und gemütlich zu Hause essen','Ein Picknick vorbereiten','Gemeinsam auf dem Markt einkaufen und daraus kochen','Ein vertrautes Café oder Restaurant wieder besuchen','Einen neuen Laden ausprobieren'
 ]],
 ['culture',false,120,[
  'Ins Kino gehen','Filmabend mit einem Film von eurer Merkliste','Eine Folge einer gemeinsamen Serie anschauen','Ein Indie- oder Singer-Songwriter-Konzert besuchen','Kleines Konzert mit lokalen Musikern','Museum besuchen','Ausstellung oder Galerie anschauen','Theater oder Kabarett','Durch einen Buchladen stöbern','Gemeinsam einen Film für den nächsten Abend auswählen'
 ]],
 ['culture',true,90,['Flohmarkt besuchen','Stadtspaziergang mit Architektur oder Geschichte verbinden','Einen kleinen Fotospaziergang machen']],
 ['culture',false,90,[
  'Gemeinsam töpfern','Keramik bemalen','Etwas zeichnen oder malen','Einen Blumenstrauß zusammenstellen','Ein kleines, überschaubares DIY-Projekt machen','Fotos anschauen und einige Lieblingsbilder auswählen'
 ]],
 ['outdoor',true,60,['Pflanzen für den Balkon aussuchen','Gemeinsam im Hochbeet gärtnern','Kräuter pflanzen oder ernten']],
 ['food',false,60,['Gemeinsam etwas aus der Ernte kochen','Tee trinken und in Ruhe erzählen']],
 ['culture',false,60,[
  'Gemeinsam lesen','Musik hören und neue Lieblingslieder zeigen','Karten- oder Brettspiel spielen','Puzzle machen','Gemütlicher Abend ohne Handy','Gegenseitige Massage'
 ]],
 ['food',true,60,['Auf dem Balkon frühstücken']],
 ['outdoor',true,45,['Einfach zusammen draußen sitzen, ohne Programm']],
 ['culture',false,180,['Sauna oder Therme','Wellness-Ausflug, beispielsweise nach Bad Aibling']],
 ['outdoor',true,360,[
  'Tagesausflug an einen See','Neue Stadt oder kleinen Ort erkunden','Café-Besuch mit einem Spaziergang verbinden','Wanderung mit anschließendem Essen','Fahrräder mitnehmen und eine neue Gegend erkunden','Kleiner Campervan-Ausflug','Eine Nacht mit dem Camper wegfahren','Einen Ausflug mit Freunden machen'
 ]],
 ['food',false,180,['Freunde zum Essen oder Spieleabend einladen']]
];
export function legacyKnownActivities():KnownActivity[]{
 return groups.flatMap(([mood,outdoor,minutes,titles],g)=>titles.map((title,i)=>({id:`known-v1-${g}-${i}`,title,minutes,energy:mood==='movement'?'medium':'low',mood,effort:minutes>=180?'trip':'spontaneous',outdoor,next:'Einen konkreten Zeitpunkt vorschlagen.'})));
}
// General defaults retain a publisher-independent stable ID from the original list.
const generalTitles: string[][] = [
 ['Spaziergang','Spaziergang','Spaziergang','Stadt erkunden','Stadt erkunden','Spaziergang','Picknick','Draußen lesen','Sonnenuntergang anschauen','Spaziergang'],
 ['Radtour','Radtour','Radtour','Kajak fahren'],
 ['Schwimmen','Yoga'],
 ['Wanderung','Wanderung'],
 ['Kochen','Kochen','Pizza backen','Backen','Frühstück zu Hause','Frühstücken gehen','Café besuchen','Essen gehen','Essen bestellen','Picknick vorbereiten','Auf dem Markt einkaufen','Café besuchen','Neuen Laden entdecken'],
 ['Kino besuchen','Filmabend','Serie anschauen','Konzert besuchen','Konzert besuchen','Museum besuchen','Ausstellung besuchen','Theater oder Kabarett','Buchladen besuchen','Film auswählen'],
 ['Flohmarkt besuchen','Stadt erkunden','Fotografieren'],
 ['Töpfern','Keramik bemalen','Zeichnen oder malen','Blumen arrangieren','Kleines DIY-Projekt','Fotos anschauen'],
 ['Gärtnern','Gärtnern','Gärtnern'],
 ['Kochen','Tee trinken'],
 ['Lesen','Musik hören','Karten- oder Brettspiel','Puzzle','Abend ohne Handy','Massage'],
 ['Frühstück zu Hause'],
 ['Draußen sitzen'],
 ['Sauna oder Therme besuchen','Sauna oder Therme besuchen'],
 ['Ausflug an einen See','Stadt erkunden','Spaziergang','Wanderung','Radtour','Camper-Ausflug','Camper-Ausflug mit Übernachtung','Ausflug mit Freunden'],
 ['Freunde einladen']
];
const normalized = (title:string) => title.trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
function generalize(a:KnownActivity):KnownActivity {
 const [,g,i]=a.id.split('-').slice(1);
 const title=({walk:'Spaziergang',shortwalk:'Spaziergang',cafe:'Café besuchen',dinner:'Essen gehen',garden:'Gärtnern',film:'Filmabend',tea:'Tee trinken'} as Record<string,string>)[a.id]??generalTitles[Number(g)]?.[Number(i)]??a.title;
 const activityCategory=categoryOf({...a,title});
 const both=/^(Yoga|Zeichnen oder malen|Fotografieren|Lesen|Musik hören|Karten- oder Brettspiel|Frühstück zu Hause)$/.test(title);
 const setting:ActivitySetting=both?'both':a.outdoor?'outside':'inside';
 return {...a,title,activityCategory,setting,mood:legacyMood(activityCategory),outdoor:setting!=='inside'};
}
export function knownActivities():KnownActivity[]{
 const seen=new Set<string>();
 return legacyKnownActivities().map(generalize).filter(a=>{const key=normalized(a.title);if(seen.has(key))return false;seen.add(key);return true;});
}

// Only untouched default rows are simplified. Never merge user rows or edited movement.
export function simplifyStandardActivities(activities:readonly KnownActivity[]):KnownActivity[]{
 const originals=new Map(legacyKnownActivities().map(a=>[a.id,a]));
 originals.set('walk',{id:'walk',title:'Spazieren durch die Stadt',minutes:45,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eine gemeinsame Runde zu Beginn des Zeitfensters vorschlagen.'});
 originals.set('shortwalk',{id:'shortwalk',title:'Eine kleine Runde vor der Tür',minutes:15,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eine gemeinsame Viertelstunde an der frischen Luft vorschlagen.'});
 originals.set('cafe',{id:'cafe',title:'Kaffee trinken gehen',minutes:60,energy:'low',mood:'food',effort:'spontaneous',outdoor:false,next:'Ein Café auswählen, Öffnungszeiten prüfen und den Zeitpunkt vorschlagen.'});
 originals.set('dinner',{id:'dinner',title:'Essen gehen',minutes:90,energy:'low',mood:'food',effort:'prepare',outdoor:false,next:'Restaurant mit vegetarischer Auswahl aussuchen und bei Bedarf reservieren.'});
 originals.set('garden',{id:'garden',title:'Zum Garten gehen',minutes:60,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Wetter prüfen und abstimmen, ob ihr eine Runde geht oder im Garten bleiben möchtet.'});
 originals.set('film',{id:'film',title:'Filmabend zu Hause',minutes:120,energy:'low',mood:'culture',effort:'spontaneous',outdoor:false,next:'Einen Titel aus „Filme & Serien“ auswählen und einen gemeinsamen Abend abstimmen.'});
 originals.set('tea',{id:'tea',title:'Gemeinsam eine Tasse Tee trinken',minutes:15,energy:'low',mood:'food',effort:'spontaneous',outdoor:false,next:'Eine ruhige gemeinsame Viertelstunde vorschlagen.'});
 const fields=['title','minutes','energy','mood','effort','outdoor','next'] as const;
 const untouched=(a:KnownActivity)=>{const old=originals.get(a.id);return old&&a.mood!=='movement'&&a.activityCategory===undefined&&a.setting===undefined&&fields.every(k=>a[k]===old[k]);};
 const protectedTitles=new Set(activities.filter(a=>!untouched(a)).map(a=>normalized(a.title)));
 const seen=new Set<string>();
 return activities.flatMap(a=>{
  if(!untouched(a))return [a];
  const next=generalize(a),key=normalized(next.title);
  if(next.activityCategory==='movement'&&activities.some(r=>!untouched(r)&&r.mood==='movement'&&({Spaziergang:/spazier|spazieren|kleine runde/i,Radtour:/rad|fahrrad/i,Wanderung:/wander/i} as Record<string,RegExp>)[next.title]?.test(r.title)))return [];
  if(protectedTitles.has(key)||seen.has(key))return [];
  seen.add(key);return [next];
 });
}
// Reading transforms only memory; the next explicit save uses the revision guard.
// The existing marker prevents deleted seeds reappearing on reload.
export function withKnownActivities<T extends {routines?:KnownActivity[];knownActivitiesVersion?:number}>(state:T):T{
 if(state.knownActivitiesVersion===1)return {...state,routines:simplifyStandardActivities(state.routines??[])};
 const routines=[...(state.routines??[])];
 const titles=new Set(routines.map(r=>normalized(r.title)));
 const ids=new Set(routines.map(r=>r.id));
 for(const idea of knownActivities()){
  const title=normalized(idea.title);
  if(!titles.has(title)&&!ids.has(idea.id)){routines.push(idea);titles.add(title);ids.add(idea.id);}
 }
 return {...state,routines:simplifyStandardActivities(routines),knownActivitiesVersion:1};
}
