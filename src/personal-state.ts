import {validTasteProfiles,validTasteAssessments,type TasteProfiles,type TasteAssessments} from './taste-settings.ts';
import {validTasteRating,type TasteRating} from './taste-profile.ts';
import {validStockItem,type StockItem} from './activity-stock.ts';
import {validActivityProperties} from './activity-properties.ts';
import type {KnownActivity} from './known-activities.ts';
export type Appointment = { id: string; title: string; date: string; start: string; end: string; owner: string; uncertain: boolean; repeat: boolean; excludedDates?: string[]; googleEventId?: string; googleSeriesId?: string; googleAllDay?: boolean };
export type Slot = { id: string; date: string; start: string; end: string; energy: string; mood: string; effort: string };
export type Entry = { id: string; title: string; url: string; date: string; start: string; end: string; slotId: string; status: string; createdAt: string; proposedAt: string; organizedAt: string; doneAt: string; note: string; next: string; routineId?: string; source?: string };
export type Routine = KnownActivity;
export type Dinner = {id:string;date:string;recipeId:string;title:string};
export type State = { tasteProfiles?:TasteProfiles; tasteAssessments?:TasteAssessments; tasteRatings?:TasteRating[]; stockMapsVersion?:number; activityStock?:StockItem[]; knownActivitiesVersion?:number; dinners?: Dinner[]; routines?: Routine[]; version: 1; appointments: Appointment[]; slots: Slot[]; entries: Entry[]; checks: string[]; googleDeleteSeries?: string[]; googleSync?: { lastSuccess: string; error?: string } };
export const defaultRoutines = (): Routine[] => [
  {id:'walk',title:'Spazieren durch die Stadt',minutes:45,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eine gemeinsame Runde zu Beginn des Zeitfensters vorschlagen.'},
  {id:'swim',title:'Schwimmen',minutes:90,energy:'medium',mood:'movement',effort:'prepare',outdoor:false,next:'Öffnungszeiten und Badebetrieb prüfen, Zeitpunkt abstimmen und Schwimmsachen vorbereiten.'},
  {id:'kayak',title:'Kajak fahren',minutes:120,energy:'high',mood:'movement',effort:'prepare',outdoor:true,next:'Wasserbedingungen, Befahrbarkeit und Vereinszeiten prüfen; Zeitpunkt und Ausrüstung klären.'},
  {id:'garden',title:'Zum Garten gehen',minutes:60,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Wetter prüfen und abstimmen, ob ihr eine Runde geht oder im Garten bleiben möchtet.'},
  {id:'cafe',title:'Kaffee trinken gehen',minutes:60,energy:'low',mood:'food',effort:'spontaneous',outdoor:false,next:'Ein Café auswählen, Öffnungszeiten prüfen und den Zeitpunkt vorschlagen.'},
  {id:'dinner',title:'Essen gehen',minutes:90,energy:'low',mood:'food',effort:'prepare',outdoor:false,next:'Restaurant mit vegetarischer Auswahl aussuchen und bei Bedarf reservieren.'},
  {id:'bike',title:'Eine kleine Radtour',minutes:90,energy:'medium',mood:'movement',effort:'spontaneous',outdoor:true,next:'Eine einfache Strecke aussuchen, Wetter prüfen und den Zeitpunkt abstimmen.'},
  {id:'film',title:'Filmabend zu Hause',minutes:120,energy:'low',mood:'culture',effort:'spontaneous',outdoor:false,next:'Einen Titel aus „Filme & Serien“ auswählen und einen gemeinsamen Abend abstimmen.'},
  {id:'shortwalk',title:'Eine kleine Runde vor der Tür',minutes:15,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eine gemeinsame Viertelstunde an der frischen Luft vorschlagen.'},
  {id:'tea',title:'Gemeinsam eine Tasse Tee trinken',minutes:15,energy:'low',mood:'food',effort:'spontaneous',outdoor:false,next:'Eine ruhige gemeinsame Viertelstunde vorschlagen.'}
];
const statuses = ['Idee gespeichert', 'Vorgeschlagen', 'Offen', 'Zugesagt', 'Abgelehnt', 'Organisiert', 'Gemacht'];
const day = (s: string) => new Date(s + 'T12:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);
const validDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(day(s).getTime()) && iso(day(s)) === s;
const validTime = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function validState(v: unknown): v is State {
  if (!v || typeof v !== 'object') return false;
  const s = v as State;
  const strings = (x: unknown, keys: string[]) => !!x && typeof x === 'object' && keys.every(k => typeof (x as Record<string, unknown>)[k] === 'string');
  return (s.stockMapsVersion === undefined || s.stockMapsVersion === 1) && (s.knownActivitiesVersion === undefined || s.knownActivitiesVersion === 1) && s.version === 1 && Array.isArray(s.appointments) && Array.isArray(s.slots) && Array.isArray(s.entries) && Array.isArray(s.checks)
    && (s.routines === undefined || Array.isArray(s.routines) && s.routines.every(r => strings(r,['id','title','energy','mood','effort','next']) && Number.isInteger(r.minutes) && r.minutes >= 5 && r.minutes <= 1440 && typeof r.outdoor === 'boolean' && ['low','medium','high'].includes(r.energy) && ['outdoor','movement','food','culture'].includes(r.mood) && ['spontaneous','prepare','trip'].includes(r.effort) && validActivityProperties(r) && (r.ratingScore===undefined||Number.isInteger(r.ratingScore)&&r.ratingScore>=0&&r.ratingScore<=100&&r.ratingScore%5===0) && (r.rating===undefined||Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5)))
    && (s.activityStock===undefined||Array.isArray(s.activityStock)&&s.activityStock.length<=500&&s.activityStock.every(validStockItem)&&new Set(s.activityStock.map(x=>x.id)).size===s.activityStock.length)
    && (s.tasteProfiles===undefined||validTasteProfiles(s.tasteProfiles))
    && (s.tasteAssessments===undefined||validTasteAssessments(s.tasteAssessments))
    && (s.tasteRatings===undefined||Array.isArray(s.tasteRatings)&&s.tasteRatings.length<=2000&&s.tasteRatings.every(validTasteRating)&&new Set(s.tasteRatings.map(r=>r.id)).size===s.tasteRatings.length)
    && (s.googleDeleteSeries === undefined || Array.isArray(s.googleDeleteSeries) && s.googleDeleteSeries.every(id => typeof id === 'string'))
    && (s.googleSync === undefined || !!s.googleSync && typeof s.googleSync.lastSuccess === 'string' && (!s.googleSync.lastSuccess || !isNaN(Date.parse(s.googleSync.lastSuccess))) && (s.googleSync.error === undefined || typeof s.googleSync.error === 'string'))
    && (s.dinners === undefined || Array.isArray(s.dinners) && s.dinners.every(d=>strings(d,['id','date','recipeId','title']) && validDate(d.date) && !!d.id && !!d.recipeId && !!d.title) && new Set(s.dinners.map(d=>d.date)).size===s.dinners.length && new Set(s.dinners.map(d=>d.id)).size===s.dinners.length)
    && s.checks.every(validDate)
    && s.appointments.every(a => strings(a, ['id','title','date','start','end','owner']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && typeof a.uncertain === 'boolean' && typeof a.repeat === 'boolean' && (a.googleEventId === undefined || typeof a.googleEventId === 'string') && (a.googleSeriesId === undefined || typeof a.googleSeriesId === 'string') && (a.googleAllDay === undefined || typeof a.googleAllDay === 'boolean') && (a.excludedDates === undefined || Array.isArray(a.excludedDates) && a.excludedDates.every(validDate)))
    && s.slots.every(a => strings(a, ['id','date','start','end','energy','mood','effort']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && ['low','medium','high'].includes(a.energy) && ['unknown','outdoor','movement','food','culture'].includes(a.mood) && ['spontaneous','prepare','trip'].includes(a.effort))
    && s.entries.every(a => strings(a, ['id','title','url','date','start','end','slotId','status','createdAt','proposedAt','organizedAt','doneAt','note','next']) && statuses.includes(a.status) && (a.routineId === undefined || typeof a.routineId === 'string') && (a.source === undefined || typeof a.source === 'string') && (!a.date || validDate(a.date)) && (!a.start || validTime(a.start)) && (!a.end || validTime(a.end)) && ['createdAt','proposedAt','organizedAt','doneAt'].every(k => !(a as unknown as Record<string,string>)[k] || !isNaN(Date.parse((a as unknown as Record<string,string>)[k]))));
}
