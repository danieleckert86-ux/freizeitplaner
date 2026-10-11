export type KnownActivity = { id:string; title:string; minutes:number; energy:string; mood:string; effort:string; outdoor:boolean; next:string };
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
export function knownActivities():KnownActivity[]{
 return groups.flatMap(([mood,outdoor,minutes,titles],g)=>titles.map((title,i)=>({id:`known-v1-${g}-${i}`,title,minutes,energy:mood==='movement'?'medium':'low',mood,effort:minutes>=180?'trip':'spontaneous',outdoor,next:'Einen konkreten Zeitpunkt vorschlagen.'})));
}
// Defaults are read-only until the user saves. The marker prevents deleted seeds reappearing.
export function withKnownActivities<T extends {routines?:KnownActivity[];knownActivitiesVersion?:number}>(state:T):T{
 if(state.knownActivitiesVersion===1)return state;
 const routines=[...(state.routines??[])];
 const titles=new Set(routines.map(r=>r.title.trim().replace(/\s+/g,' ').toLocaleLowerCase('de')));
 const ids=new Set(routines.map(r=>r.id));
 for(const idea of knownActivities()){
  const title=idea.title.toLocaleLowerCase('de');
  if(!titles.has(title)&&!ids.has(idea.id)){routines.push(idea);titles.add(title);ids.add(idea.id);}
 }
 return {...state,routines,knownActivitiesVersion:1};
}
