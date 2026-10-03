import './planner.css';
import { neutralDescription } from './wording';
import { categoryIcon } from './category-icons';
import { loadDinnerRecipes, recipeLink, type DinnerRecipe } from './dinner-recipes';
import type { SupabaseClient } from '@supabase/supabase-js';

type Appointment = { id: string; title: string; date: string; start: string; end: string; owner: string; uncertain: boolean; repeat: boolean; excludedDates?: string[]; googleEventId?: string; googleSeriesId?: string; googleAllDay?: boolean };
type Slot = { id: string; date: string; start: string; end: string; energy: string; mood: string; effort: string };
type Entry = { id: string; title: string; url: string; date: string; start: string; end: string; slotId: string; status: string; createdAt: string; proposedAt: string; organizedAt: string; doneAt: string; note: string; next: string; routineId?: string; source?: string };
type Routine = { id: string; title: string; minutes: number; energy: string; mood: string; effort: string; outdoor: boolean; next: string };
type Dinner = {id:string;date:string;recipeId:string;title:string};
type State = { dinners?: Dinner[]; routines?: Routine[]; version: 1; appointments: Appointment[]; slots: Slot[]; entries: Entry[]; checks: string[]; googleDeleteSeries?: string[]; googleSync?: { lastSuccess: string; error?: string } };
type Idea = { title: string; url: string; next: string; outdoor: boolean; minutes?: number; source?: string; routineId?: string; date?: string; start?: string; tourKind?: string; flexible?: boolean };
const defaultRoutines = (): Routine[] => [
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
const KEY = 'freizeitplaner.personal.v1';
const statuses = ['Idee gespeichert', 'Vorgeschlagen', 'Offen', 'Zugesagt', 'Abgelehnt', 'Organisiert', 'Gemacht'];
const e = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const day = (s: string) => new Date(s + 'T12:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = day(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const monday = (s: string) => addDays(s, -((day(s).getUTCDay() + 6) % 7));
const label = (s: string) => s ? new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(day(s)) : 'Ohne Termin';
const empty = (): State => ({ version: 1, appointments: [], slots: [], entries: [], checks: [], routines: defaultRoutines() });
const safeUrl = (s: string) => /^https?:\/\//i.test(s) ? s : '';
const validDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(day(s).getTime()) && iso(day(s)) === s;
const validTime = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
function validState(v: unknown): v is State {
  if (!v || typeof v !== 'object') return false;
  const s = v as State;
  const strings = (x: unknown, keys: string[]) => !!x && typeof x === 'object' && keys.every(k => typeof (x as Record<string, unknown>)[k] === 'string');
  return s.version === 1 && Array.isArray(s.appointments) && Array.isArray(s.slots) && Array.isArray(s.entries) && Array.isArray(s.checks)
    && (s.routines === undefined || Array.isArray(s.routines) && s.routines.every(r => strings(r,['id','title','energy','mood','effort','next']) && Number.isInteger(r.minutes) && r.minutes >= 5 && r.minutes <= 1440 && typeof r.outdoor === 'boolean' && ['low','medium','high'].includes(r.energy) && ['outdoor','movement','food','culture'].includes(r.mood) && ['spontaneous','prepare','trip'].includes(r.effort)))
    && (s.googleDeleteSeries === undefined || Array.isArray(s.googleDeleteSeries) && s.googleDeleteSeries.every(id => typeof id === 'string'))
    && (s.googleSync === undefined || !!s.googleSync && typeof s.googleSync.lastSuccess === 'string' && (!s.googleSync.lastSuccess || !isNaN(Date.parse(s.googleSync.lastSuccess))) && (s.googleSync.error === undefined || typeof s.googleSync.error === 'string'))
    && (s.dinners === undefined || Array.isArray(s.dinners) && s.dinners.every(d=>strings(d,['id','date','recipeId','title']) && validDate(d.date) && !!d.id && !!d.recipeId && !!d.title) && new Set(s.dinners.map(d=>d.date)).size===s.dinners.length && new Set(s.dinners.map(d=>d.id)).size===s.dinners.length)
    && s.checks.every(validDate)
    && s.appointments.every(a => strings(a, ['id','title','date','start','end','owner']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && typeof a.uncertain === 'boolean' && typeof a.repeat === 'boolean' && (a.googleEventId === undefined || typeof a.googleEventId === 'string') && (a.googleSeriesId === undefined || typeof a.googleSeriesId === 'string') && (a.googleAllDay === undefined || typeof a.googleAllDay === 'boolean') && (a.excludedDates === undefined || Array.isArray(a.excludedDates) && a.excludedDates.every(validDate)))
    && s.slots.every(a => strings(a, ['id','date','start','end','energy','mood','effort']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && ['low','medium','high'].includes(a.energy) && ['unknown','outdoor','movement','food','culture'].includes(a.mood) && ['spontaneous','prepare','trip'].includes(a.effort))
    && s.entries.every(a => strings(a, ['id','title','url','date','start','end','slotId','status','createdAt','proposedAt','organizedAt','doneAt','note','next']) && statuses.includes(a.status) && (a.routineId === undefined || typeof a.routineId === 'string') && (a.source === undefined || typeof a.source === 'string') && (!a.date || validDate(a.date)) && (!a.start || validTime(a.start)) && (!a.end || validTime(a.end)) && ['createdAt','proposedAt','organizedAt','doneAt'].every(k => !(a as unknown as Record<string,string>)[k] || !isNaN(Date.parse((a as unknown as Record<string,string>)[k]))));
}

export function initPlanner(database: SupabaseClient) {
  const host = document.querySelector<HTMLElement>('#personalPlanner');
  if (!host) return;
  let state = empty();
  let loaded = false;
  let saving = false;
  let refreshing = false;
  let revision = -1;
  let message = 'Gemeinsame Planung wird geladen …';
  let legacy: State | null = null;
  // Read the previous version once to migrate it, never persist new planning data locally.
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (validState(parsed)) legacy = parsed; } } catch { /* Cloud data remains authoritative. */ }
  async function readCloud() {
    const { data, error } = await database.from('personal_planning').select('payload,revision').eq('id', 'shared').abortSignal(AbortSignal.timeout(12000)).single();
    if (error || !data || !validState(data.payload) || !Number.isSafeInteger(Number(data.revision))) throw Error('Cloud data unavailable');
    return { state: { ...data.payload, routines: data.payload.routines ?? defaultRoutines() } as State, revision: Number(data.revision) };
  }
  const isEditing = () => !!dinnerDate || !!calendarEdit || !!dragging || !!draft || !!pendingIdea || host?.contains(document.activeElement) && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName || '');
  const actionDate = (stamp: string) => stamp ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(stamp)) : '';
  let week = day(today()).getUTCDay() === 0 ? addDays(monday(today()),7) : monday(today());
  let selectedSlot = '';
  let activeDate = today();
  let openEditor = '';
  let openSection = '';
  let editingRoutine = '';
  let routineFormOpen = false;
  let pendingIdea: Idea | null = null;
  let scheduleSlot = '';
  let calendarEdit: {kind:'entry'|'appointment'|'slot';id:string;date:string} | null = null;
  let dinnerDate = '';
  let dinnerEditingId = '';
  let dinnerQuery = '';
  let dinnerRecipes: DinnerRecipe[] = [];
  let recipesLoading = false;
  let recipesError = '';
  let dragging = '';
  let undoMove: {state:State;revision:number;text?:string} | null = null;
  let draft: Slot | null = null;
  let draftReady = false;
  let moreIdeas = false;
  let weeklyCheck = false;
  const moodOptions: [string,string][] = [['outdoor','Draußen'],['movement','Bewegung'],['food','Genuss'],['culture','Kultur']];
  let rain: Record<string, number> = {};
  let backup: State | null = null;
  let settingsOpen = false;
  const routineFeedback = (text: string) => /^(Gemeinsame Planung (wird geladen|geladen)|Gemeinsamer Stand aktualisiert|Gespeichert\.|Standardaktivität gespeichert|Dieser Termin wurde gelöscht|Die gesamte Terminserie wurde gelöscht|Der Termin wurde gelöscht)/.test(text);
  const mutate = async (fn: () => void, feedback = 'Gespeichert. Auf allen Geräten verfügbar.') => {
    if (!loaded || saving) { message = saving ? 'Speicherung läuft. Bitte kurz warten.' : 'Die gemeinsame Planung muss zuerst geladen werden.'; return false; }
    undoMove = null;
    const previous = JSON.stringify(state);
    saving = true;
    let payload: State;
    try { fn(); if (!validState(state)) throw Error(); payload = JSON.parse(JSON.stringify(state)); }
    catch { state = JSON.parse(previous); saving = false; message = 'Änderung ungültig. Bitte Datum und Uhrzeiten prüfen.'; render(); return false; }
    message = 'Wird gemeinsam gespeichert …';
    setBusy();
    try {
      const { data, error } = await database.from('personal_planning').update({ payload }).eq('id','shared').eq('revision',revision).select('payload,revision').abortSignal(AbortSignal.timeout(12000)).maybeSingle();
      if (error) throw error;
      if (!data) {
        const latest = await readCloud(); state = latest.state; revision = latest.revision;
        message = 'Auf einem anderen Gerät wurde die Planung geändert. Der aktuelle Stand ist geladen. Bitte deine Änderung noch einmal vornehmen.';
        return false;
      }
      if (!validState(data.payload)) throw Error();
      state = data.payload; revision = Number(data.revision); message = feedback;
      return true;
    } catch {
      state = JSON.parse(previous);
      message = 'Speichern fehlgeschlagen. Diese Änderung wurde nicht bestätigt. Prüfe die Verbindung und versuche es erneut.';
      return false;
    } finally { saving = false; render(); }
  };
  function setBusy() {
    const status = host?.querySelector<HTMLElement>('.planner-message'); if (status) {status.textContent = message;status.hidden = routineFeedback(message);}
    host?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('input,select,textarea,button').forEach(el => {
      const a = el.dataset.action;
      el.disabled = saving || (!loaded && !['prev','next','current','refresh'].includes(a || ''));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-personal-action]').forEach(el => { el.disabled = !loaded || saving; });
  }
  async function refreshCloud(manual = false) {
    if (saving || refreshing || (!manual && loaded && isEditing())) return;
    refreshing = true;
    try {
      const latest = await readCloud();
      const changed = !loaded || latest.revision !== revision;
      // A poll must not replace a form the user began editing while the request was running.
      if (loaded && !manual && isEditing()) return;
      state = latest.state; revision = latest.revision; loaded = true;
      if (legacy) {
        const old = legacy;
        const merge = <T extends {id:string}>(shared:T[], local:T[]) => [...shared, ...local.filter(a => !shared.some(b => b.id === a.id))];
        const hasData = old.appointments.length || old.slots.length || old.entries.length || old.checks.length;
        if (!hasData || await mutate(() => {
          state.appointments = merge(state.appointments,old.appointments);
          state.slots = merge(state.slots,old.slots);
          state.entries = merge(state.entries,old.entries);
          state.checks = [...new Set([...state.checks,...old.checks])];
          if (old.routines) state.routines = merge(state.routines ?? [],old.routines);
        }, 'Bisherige Gerätedaten übernommen. Deine Planung ist auf allen Geräten verfügbar.')) {
          legacy = null;
          try { localStorage.removeItem(KEY); } catch { /* No new local data is written. */ }
        }
      } else if (changed || manual) {
        message = manual ? 'Gemeinsamer Stand aktualisiert.' : 'Gemeinsame Planung geladen.';
      }
      if (changed || manual) render();
    } catch { message = loaded ? 'Aktualisierung gerade nicht möglich. Der zuletzt geladene Stand bleibt sichtbar.' : 'Gemeinsame Planung konnte nicht geladen werden. Bitte die Verbindung prüfen und erneut laden.'; render(); }
    finally { refreshing = false; }
  }
  const inWeek = (date: string) => date >= week && date < addDays(week, 7);
  const appointmentsFor = (date: string) => state.appointments.filter(a => !a.excludedDates?.includes(date) && (a.date === date || (a.repeat && a.date <= date && day(a.date).getUTCDay() === day(date).getUTCDay())));
  const overlaps = (a: {start: string; end: string}, b: {start: string; end: string}) => a.start < b.end && b.start < a.end;
  const conflicts = (s: Slot) => appointmentsFor(s.date).filter(a => overlaps(a, s));
  const clash = (s: Slot) => conflicts(s).length > 0 || state.entries.some(a => a.slotId !== s.id && a.date === s.date && a.status !== 'Abgelehnt' && a.start && overlaps(a, s));
  const options = (values: [string, string][], chosen = '') => values.map(([value, text]) => `<option value="${e(value)}" ${value === chosen ? 'selected' : ''}>${e(text)}</option>`).join('');
  const button = (action: string, text: string, id = '') => `<button type="button" data-action="${action}" data-id="${e(id)}">${text}</button>`;
  const duration = (s: {start:string;end:string}) => Number(s.end.slice(0,2))*60 + Number(s.end.slice(3)) - Number(s.start.slice(0,2))*60 - Number(s.start.slice(3));
  const occupied = (s: Slot) => state.entries.some(a => a.slotId === s.id && a.status !== 'Abgelehnt');
  const canSchedule = (s: Slot, idea: Idea) => s.date >= today() && (!idea.date || idea.date === s.date) && (!idea.start || idea.start === s.start) && !clash(s) && !occupied(s) && duration(s) >= (idea.minutes ?? 0);
  function ideas(s: Slot): Idea[] {
    const pool:Idea[]=[];const minutes=duration(s);
    const outdoorCategories=['outdoor','wandern','fahrrad','kajak'];
    const matchesMood=(mood:string,outdoor:boolean)=>s.mood==='unknown'||(s.mood==='outdoor'?outdoor:mood===s.mood);
    const routines=(state.routines??[]).filter(r=>r.minutes<=minutes&&matchesMood(r.mood,r.outdoor));
    routines.sort((a,b)=>b.minutes-a.minutes);
    routines.forEach(r=>pool.push({title:r.title,next:r.next,outdoor:r.outdoor,url:'',minutes:r.minutes,source:'routine',routineId:r.id}));
    const cards=Array.from(document.querySelectorAll<HTMLElement>('.filterable[data-date]'));
    cards.forEach(card=>{
      const tour=card.classList.contains('tour-card');const flexible=tour&&card.dataset.flexibleTour==='true';
      if(!flexible&&(card.dataset.date!==s.date||card.classList.contains('expired')))return;
      const category=card.dataset.category||'';const outdoor=outdoorCategories.includes(category);
      const mood=category==='essen'?'food':['kultur','musik'].includes(category)?'culture':['wandern','fahrrad','kajak','sport','schwimmen'].includes(category)?'movement':outdoor?'outdoor':'';
      if(!matchesMood(mood,outdoor))return;
      const tourMinutes=Number(card.dataset.tourMinutes)||undefined;
      if(tour&&(tourMinutes?minutes<tourMinutes:minutes<180))return;
      const title=card.querySelector('h3,h4')?.textContent?.trim();if(!title)return;
      const start=card.querySelector<HTMLButtonElement>('[data-event-start]')?.dataset.eventStart;
      pool.push({source:'recommendation',date:flexible?undefined:s.date,start:validTime(start)?start:undefined,title,url:card.querySelector<HTMLAnchorElement>('a.info-link')?.href||'',outdoor,minutes:tourMinutes,tourKind:tour?category:undefined,flexible,
        next:flexible?'Tourzeit plus Anfahrt, Wetter, Wegzustand und gegebenenfalls Befahrbarkeit für deinen gewählten Tag prüfen; anschließend konkret vorschlagen.':'Uhrzeit, Dauer, Anfahrt und Verfügbarkeit in der Originalquelle prüfen; anschließend konkret vorschlagen.'});
    });
    return pool.filter((a,i)=>pool.findIndex(b=>b.title===a.title)===i);
  }
  async function addEntry(title: string, url = '', status = 'Idee gespeichert', slot?: Slot, next = 'Einen konkreten Zeitpunkt vorschlagen.', origin?: Idea) {
    const now=new Date().toISOString();openSection='';
    const saved=await mutate(()=>{
      if(slot&&!state.slots.some(x=>x.id===slot.id))state.slots.push(slot);
      state.entries.unshift({id:crypto.randomUUID(),title,url:safeUrl(url),date:slot?.date||'',start:slot?.start||'',end:slot?.end||'',slotId:slot?.id||'',status,createdAt:now,proposedAt:status==='Vorgeschlagen'?now:'',organizedAt:'',doneAt:'',note:'',next,routineId:origin?.routineId,source:origin?.source});
    },status==='Vorgeschlagen'?'Als tatsächlich vorgeschlagen protokolliert.':slot?'Eingeplant. Nächster Schritt: konkret vorschlagen.':'Idee gespeichert.');
    if(saved){dinnerDate='';calendarEdit=null;draft=null;draftReady=false;pendingIdea=null;render();host?.querySelector('.week-board')?.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  const entryLabel = (a: Entry) => a.status === 'Idee gespeichert' ? (a.date && a.start && a.end ? 'Geplant' : 'Gemerkt') : a.status;
  let dialogReturn = '';
  function startDay(date: string, slot?: Slot) {
    activeDate=date;pendingIdea=null;openEditor='';moreIdeas=false;
    draft=slot?{...slot}:{id:crypto.randomUUID(),date,start:'18:30',end:'20:00',energy:'medium',mood:'unknown',effort:'prepare'};
    draftReady=!!slot;render();host?.querySelector('#dayComposer')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function composerMarkup() {
    if(!draft||pendingIdea)return '';
    return `<section class="planner-box day-composer" id="dayComposer" aria-label="Etwas planen"><div class="routine-heading"><div><span class="section-kicker">${draftReady?'2 · Eine Idee auswählen':'1 · Wann hast du Zeit?'}</span><h2>${label(draft.date)} · Etwas planen</h2></div>${button('cancelDraft','Schließen')}</div><form id="dayPlanForm" class="planner-form"><label>Tag<input name="date" type="date" min="${today()}" value="${draft.date}" required></label><label class="planner-time">Beginn<input name="start" type="time" value="${draft.start}" required></label><label class="planner-time">Zeit in Minuten<input name="minutes" type="number" min="5" max="1440" step="5" value="${duration(draft)}" required></label><label>Worauf hättest du Lust?<select name="mood">${options([['unknown','Noch offen'],...moodOptions],draft.mood)}</select></label><button class="planner-submit">${draftReady?'Vorschläge aktualisieren':'Passende Ideen zeigen'}</button></form><p class="planner-small">Du musst vorher kein Zeitfenster anlegen. Leere Tage gelten nicht automatisch als frei.</p>${draft.mood==='outdoor'&&(rain[draft.date]??0)>=50?'<p class="planner-warning">Regen ist möglich. Outdoor-Ideen bleiben sichtbar; prüfe das Wetter am Ziel vor dem Losfahren.</p>':''}${draftReady?clash(draft)||occupied(draft)?'<p class="planner-warning">Diese Zeit ist bereits belegt oder noch unklar. Wähle einen anderen Zeitpunkt.</p>':suggestionsMarkup(draft):''}</section>`;
  }
  function calendarRow(target = calendarEdit) {
    if (!target) return undefined;
    return target.kind === 'entry' ? state.entries.find(x=>x.id===target.id) : target.kind === 'slot' ? state.slots.find(x=>x.id===target.id) : state.appointments.find(x=>x.id===target.id);
  }
  function collisionTitles(target: NonNullable<typeof calendarEdit>, date:string, start:string, end:string) {
    const span={start,end};
    return [...appointmentsFor(date).filter(x=>!(target.kind==='appointment'&&x.id===target.id&&date===target.date)&&overlaps(x,span)).map(x=>x.title),
      ...state.entries.filter(x=>!(target.kind==='entry'&&x.id===target.id)&&x.date===date&&x.status!=='Abgelehnt'&&x.start&&x.end&&overlaps(x,span)).map(x=>x.title)];
  }
  function openCalendar(kind:'entry'|'appointment'|'slot', id:string, date:string) {
    calendarEdit={kind,id,date};draft=null;pendingIdea=null;render();
  }
  function editCalendarMarkup() {
    const row=calendarRow();if(!row||!calendarEdit)return '';
    const date=calendarEdit.date||row.date||activeDate;
    const imported=calendarEdit.kind==='appointment' ? row as Appointment : null;
    const multiDay=imported?.googleEventId&&state.appointments.filter(x=>x.googleEventId===imported.googleEventId).length>1;
    return `<section class="planner-box" id="calendarEditor"><div class="routine-heading"><div><span class="section-kicker">Termin ändern</span><h2>${e('title' in row ? row.title : 'Freies Zeitfenster')}</h2></div>${button('cancelCalendar','Schließen')}</div>
      ${multiDay?'<p>Dieser mehrtägige Google-Termin wird in Google bearbeitet.</p><a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Google Kalender öffnen</a>':`<form id="calendarEditForm" class="planner-form"><label>Datum<input name="date" type="date" required value="${date}"></label><div class="calendar-day-picker" role="group" aria-label="Tag auswählen">${Array.from({length:7},(_,i)=>{const d=addDays(monday(date),i);return `<button type="button" data-calendar-date="${d}" aria-pressed="${d===date}">${label(d)}</button>`;}).join('')}</div><label class="planner-time">Startzeit<input name="start" type="time" required value="${row.start||'18:00'}"></label><label>Dauer in Minuten<input name="minutes" type="number" required min="5" max="1439" value="${validTime(row.start)&&validTime(row.end)?duration(row):60}"></label><div class="calendar-time-shifts">${button('shiftEarlier','−30 Min.')}${button('shiftLater','+30 Min.')}<output id="calendarEnd"></output></div><p id="calendarCollision" role="status"></p>${imported?.repeat?'<p class="planner-small">Die Änderung gilt nur für diesen Termin. Die übrige wöchentliche Serie bleibt bestehen.</p>':''}${imported?.googleEventId?'<p class="planner-small">Der verschobene Termin ersetzt beim nächsten Google-Abgleich den ursprünglichen Termin.</p>':''}<div class="planner-actions"><button class="planner-submit">Speichern</button>${button('cancelCalendar','Abbrechen')}${calendarEdit.kind==='entry'?button('calendarDetails','Weitere Angaben',row.id):''}</div></form>`}</section>`;
  }
  async function moveCalendar(target:NonNullable<typeof calendarEdit>,date:string,start:string,minutes:number) {
    const row=calendarRow(target);if(!row)return false;
    const endMinutes=Number(start.slice(0,2))*60+Number(start.slice(3))+minutes;
    if(!validDate(date)||!validTime(start)||!Number.isInteger(minutes)||minutes<5||endMinutes>=1440){message='Bitte eine gültige Startzeit und Dauer wählen. Der Termin muss am selben Tag enden.';render();return false;}
    const end=String(Math.floor(endMinutes/60)).padStart(2,'0')+':'+String(endMinutes%60).padStart(2,'0');
    const collisions=collisionTitles(target,date,start,end);
    if(collisions.length&&!confirm('Überschneidung mit '+collisions.join(', ')+'. Trotzdem verschieben?'))return false;
    const before=JSON.parse(JSON.stringify(state)) as State;
    const saved=await mutate(()=>{
      if(target.kind==='appointment') {
        const a=row as Appointment;
        if(a.googleEventId&&state.appointments.filter(x=>x.googleEventId===a.googleEventId).length>1)throw Error();
        if(a.repeat){a.excludedDates=[...new Set([...(a.excludedDates||[]),target.date])];state.appointments.push({...a,id:crypto.randomUUID(),date,start,end,repeat:false,excludedDates:[],googleEventId:undefined,googleSeriesId:undefined});}
        else if(a.googleEventId){state.appointments=state.appointments.filter(x=>x.id!==a.id);state.appointments.push({...a,id:crypto.randomUUID(),date,start,end,googleEventId:undefined,googleSeriesId:undefined,googleAllDay:false});}
        else Object.assign(a,{date,start,end});
      } else if(target.kind==='entry') {
        const a=row as Entry;const oldSlot=a.slotId;a.slotId='';Object.assign(a,{date,start,end});
        if(oldSlot&&!state.entries.some(x=>x.id!==a.id&&x.slotId===oldSlot))state.slots=state.slots.filter(x=>x.id!==oldSlot);
      } else Object.assign(row,{date,start,end});
      activeDate=date;week=monday(date);
    },'Termin verschoben.');
    if(saved){undoMove={state:before,revision};calendarEdit=null;render();}return saved;
  }
  function dinnerMarkup(date:string) {
    const dinner=state.dinners?.find(d=>d.date===date);
    const title=dinnerRecipes.find(r=>r.id===dinner?.recipeId)?.title||dinner?.title;
    return `<footer class="day-dinner">${dinner?`<div class="dinner-card" data-dinner-id="${e(dinner.id)}" data-dinner-date="${date}"><span class="dinner-label">${categoryIcon('essen')}Abendessen</span><a class="dinner-title" href="${e(recipeLink(dinner.recipeId))}" target="_blank" rel="noopener noreferrer">${e(title!)}</a><div class="dinner-actions">${button('chooseDinner','Ändern',date)}${button('removeDinner','Entfernen',dinner.id)}</div></div>`:`<button type="button" class="dinner-add" data-action="chooseDinner" data-id="${date}">${categoryIcon('essen')}Abendessen planen</button>`}</footer>`;
  }
  async function fetchDinnerRecipes() {
    if(recipesLoading)return;
    recipesLoading=true;recipesError='';render();
    try {dinnerRecipes=await loadDinnerRecipes();}
    catch(error){recipesError=error instanceof Error?error.message:'Rezepte konnten nicht geladen werden.';}
    finally {recipesLoading=false;if(dinnerDate)render();}
  }
  function openDinner(date:string) {
    dinnerDate=date;dinnerEditingId=state.dinners?.find(d=>d.date===date)?.id||'';dinnerQuery='';calendarEdit=null;draft=null;pendingIdea=null;render();void fetchDinnerRecipes();
  }
  function dinnerResultsMarkup() {
    const filtered=dinnerRecipes.filter(r=>r.search.includes(dinnerQuery.toLocaleLowerCase('de-DE').trim()));
    if(recipesLoading)return '<p role="status">Meine Rezepte werden geladen …</p>';
    if(recipesError)return `<p role="alert">${e(recipesError)}</p>${button('retryRecipes','Erneut versuchen')}`;
    return `<p class="planner-small" role="status">${filtered.length} Rezepte</p><div class="dinner-recipes">${filtered.map(r=>`<button type="button" class="dinner-recipe" data-recipe-id="${e(r.id)}">${r.image?`<img src="${e(r.image)}" alt="" loading="lazy" decoding="async">`:`<span class="dinner-image-placeholder" aria-hidden="true">${categoryIcon('essen')}</span>`}<span><strong>${e(r.title)}</strong><small>${e([r.category,r.minutes?`${r.minutes} Min.`:''].filter(Boolean).join(' · '))}</small></span></button>`).join('')||'<p>Keine passenden Rezepte. Ändere die Suche oder ergänze ein Rezept in der Rezepte-App.</p>'}</div>`;
  }
  function dinnerPickerMarkup() {
    if(!dinnerDate)return '';
    const current=state.dinners?.find(d=>d.id===dinnerEditingId);
    return `<section class="planner-box dinner-picker" id="dinnerPicker"><div class="routine-heading"><div><span class="section-kicker">Meine Rezepte</span><h2>Abendessen planen</h2></div>${button('cancelDinner','Schließen')}</div><label class="dinner-date-label">Tag<input id="dinnerDate" type="date" required value="${dinnerDate}"></label><p class="planner-small">Das Gericht erscheint ohne Uhrzeit am Ende des Tages.</p>${current?`<p class="dinner-current">Geplant: <a href="${e(recipeLink(current.recipeId))}" target="_blank" rel="noopener noreferrer">${e(current.title)}</a></p>${current.date!==dinnerDate?button('moveCurrentDinner','Auf diesen Tag verschieben',current.id):''}`:''}<label class="dinner-search">Rezept oder Zutat suchen<input id="dinnerSearch" type="search" value="${e(dinnerQuery)}" placeholder="Zum Beispiel: Pasta oder Spinat"></label><div id="dinnerResults">${dinnerResultsMarkup()}</div></section>`;
  }
  async function moveDinner(id:string,date:string) {
    const dinner=state.dinners?.find(d=>d.id===id);if(!dinner||dinner.date===date||!validDate(date))return;
    const other=state.dinners?.find(d=>d.date===date);
    if(other&&!confirm(`Am ${label(date)} ist bereits „${other.title}“ geplant. Die beiden Abendessen tauschen?`))return;
    const before=JSON.parse(JSON.stringify(state)) as State;
    if(await mutate(()=>{if(other)other.date=dinner.date;dinner.date=date;},other?'Abendessen getauscht.':'Abendessen verschoben.')){undoMove={state:before,revision,text:other?'Abendessen getauscht.':'Abendessen verschoben.'};dinnerDate='';render();}
  }
  function wireDinner() {
    host?.querySelector<HTMLInputElement>('#dinnerSearch')?.addEventListener('input',ev=>{dinnerQuery=(ev.target as HTMLInputElement).value;const list=host?.querySelector('#dinnerResults');if(list){list.innerHTML=dinnerResultsMarkup();wireRecipeChoices();}});
    host?.querySelector<HTMLInputElement>('#dinnerDate')?.addEventListener('change',ev=>{const date=(ev.target as HTMLInputElement).value;if(validDate(date)){dinnerDate=date;render();}});
    wireRecipeChoices();
    host?.querySelectorAll<HTMLElement>('[data-dinner-id]').forEach(el=>{
      el.draggable=(window.matchMedia?.('(pointer:fine)').matches??false)&&loaded&&!saving;
      el.addEventListener('dragstart',ev=>{if(!el.draggable||!ev.dataTransfer)return;dragging=JSON.stringify({kind:'dinner',id:el.dataset.dinnerId,date:el.dataset.dinnerDate});ev.dataTransfer.setData('application/x-freizeitplaner',dragging);ev.dataTransfer.effectAllowed='move';el.classList.add('is-dragging');});
      el.addEventListener('dragend',()=>{dragging='';el.classList.remove('is-dragging');host?.querySelectorAll('.is-drop-target').forEach(x=>x.classList.remove('is-drop-target'));});
    });
  }
  function wireRecipeChoices() {
    host?.querySelectorAll<HTMLButtonElement>('[data-recipe-id]').forEach(b=>b.addEventListener('click',async()=>{
      const recipe=dinnerRecipes.find(r=>r.id===b.dataset.recipeId);if(!recipe||!validDate(dinnerDate))return;
      const date=dinnerDate;
      const source=state.dinners?.find(d=>d.id===dinnerEditingId);const target=state.dinners?.find(d=>d.date===date&&d.id!==source?.id);
      if(source&&target&&!confirm(`Am ${label(date)} ist bereits „${target.title}“ geplant. Die Tage der beiden Abendessen tauschen?`))return;
      const saved=await mutate(()=>{
        const dinners=state.dinners??[];if(source&&target)target.date=source.date;const existing=source||dinners.find(d=>d.date===date);
        if(existing)Object.assign(existing,{date,recipeId:recipe.id,title:recipe.title});
        else dinners.push({id:crypto.randomUUID(),date,recipeId:recipe.id,title:recipe.title});
        state.dinners=dinners;activeDate=date;week=monday(date);
      },'Abendessen geplant.');
      if(saved){dinnerDate='';render();}
    }));
  }
  function weekMarkup() {
    const names=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
    return `<section class="week-board" aria-label="Wochenplan Montag bis Sonntag"><div class="week-board-heading"><h2>${label(week)} – ${label(addDays(week,6))}</h2><div class="planner-week-nav">${button('prev','Vorige Woche')}${button('current','Diese Woche')}${button('next','Nächste Woche')}${button('weeklyCheck',weeklyCheck?'Wochencheck schließen':'Wochencheck')}</div></div>${weeklyCheckMarkup()}<div class="week-days">${names.map((name,i)=>{
      const date=addDays(week,i);const entries=state.entries.filter(x=>x.date===date&&x.status!=='Abgelehnt').sort((a,b)=>a.start.localeCompare(b.start));const slots=state.slots.filter(x=>x.date===date);const events=appointmentsFor(date);
      return `<article data-drop-date="${date}" class="week-day ${date===today()?'is-today':''} ${date===activeDate?'is-selected':''}"><header><span>${name}</span><strong>${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(day(date))}</strong>${date===today()?'<small>Heute</small>':''}</header><div class="week-day-items">${events.map(a=>`<div data-calendar-kind="appointment" data-calendar-id="${e(a.id)}" data-calendar-occurrence="${date}" class="week-event ${a.uncertain?'is-uncertain':''}"><time>${a.googleAllDay?'Ganztägig':`${a.start}–${a.end}`}</time><button type="button" class="week-event-open" data-action="editAppointment" data-id="${e(a.id)}" data-date="${date}" aria-label="${e(a.title)}: Termin ändern"><strong>${e(a.title)}</strong></button><span>${e(a.owner)}${a.googleSeriesId?' · Serie':''}${a.repeat?' · wöchentlich':''}${a.uncertain?' · unklar':''}</span><details class="event-delete-menu"><summary aria-label="${e(a.title)} am ${label(date)} löschen">Löschen</summary><div><button type="button" data-action="deleteOccurrence" data-id="${e(a.id)}" data-date="${date}">${a.repeat||a.googleSeriesId?'Nur diesen Termin löschen':'Termin löschen'}</button>${a.repeat||a.googleSeriesId?`<button type="button" data-action="deleteSeries" data-id="${e(a.id)}">Gesamte Serie löschen</button>`:''}</div></details></div>`).join('')}${entries.map(a=>`<div class="week-plan" data-calendar-kind="entry" data-calendar-id="${e(a.id)}" data-calendar-occurrence="${date}"><button type="button" class="week-plan-open" data-action="openEntry" data-id="${e(a.id)}"><time>${a.start?`${a.start}${a.end?'–'+a.end:''}`:'Zeit noch offen'}</time><strong>${e(a.title)}</strong><span>${e(entryLabel(a))}</span></button><div class="week-quick-actions">${!a.proposedAt?button('proposed','Vorgeschlagen',a.id):''}${a.status!=='Gemacht'?button('done','Gemacht',a.id):''}</div></div>`).join('')}${slots.filter(a=>!entries.some(x=>x.slotId===a.id || x.start && x.end && x.start<=a.start && x.end>=a.end)).map(a=>`<button type="button" data-calendar-kind="slot" data-calendar-id="${e(a.id)}" data-calendar-occurrence="${date}" class="week-free ${clash(a)?'has-conflict':''}" data-action="selectSlot" data-id="${a.id}"><time>${a.start}–${a.end}</time><strong>${clash(a)?'Überschneidung prüfen':'Zeit für eine Idee'}</strong></button>`).join('')}${!events.length&&!entries.length&&!slots.length?'<p class="week-day-empty">Noch nichts eingetragen</p>':''}</div><button type="button" class="week-add" data-action="selectDay" data-id="${date}">Etwas planen</button><button type="button" class="week-fixed-add" data-action="fixedDay" data-id="${date}">Festen Termin eintragen</button>${dinnerMarkup(date)}</article>`;
    }).join('')}</div></section>`;
  }
  function beginPlanning(idea: Idea) {
    pendingIdea=idea;scheduleSlot=selectedSlot;
    if(idea.date){activeDate=idea.date;week=monday(idea.date);}
    render();
    document.querySelector<HTMLButtonElement>('[data-view="planning"]')?.click();
    host?.querySelector('#ideaScheduler')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function schedulerMarkup() {
    if(!pendingIdea)return '';
    const idea=pendingIdea;
    const available=state.slots.filter(s=>inWeek(s.date)&&canSchedule(s,idea)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    const slot=available.find(s=>s.id===scheduleSlot);
    const date=slot?.date || idea.date || draft?.date || (activeDate>=today()?activeDate:today());
    const draftTime=draft&&(!idea.date||draft.date===idea.date)?draft:null;
    const start=slot?.start||idea.start||draftTime?.start||'18:30';
    const endMinutes=Math.min(1439,Number(start.slice(0,2))*60+Number(start.slice(3))+(idea.minutes??(draftTime?duration(draftTime):60)));
    const end=slot?.end || (draftTime&&!idea.start?draftTime.end:'') || `${String(Math.floor(endMinutes/60)).padStart(2,'0')}:${String(endMinutes%60).padStart(2,'0')}`;
    return `<section class="planner-box idea-scheduler" id="ideaScheduler" aria-label="Aktivität einplanen"><span class="section-kicker">${idea.source==='routine'?'Meine Standardaktivität':'Aus den Empfehlungen'}</span><h2>${e(idea.title)} einplanen</h2><p>${e(neutralDescription(idea.next))}</p>${idea.minutes?`<p class="planner-small">${idea.tourKind?`Tourzeit: etwa ${idea.minutes} Minuten. Plane Anfahrt und Pausen zusätzlich ein.`:`Plane mindestens ${idea.minutes} Minuten inklusive Vorbereitung und Anfahrt ein.`}</p>`:'<p class="planner-warning">Uhrzeit, Dauer und Verfügbarkeit bitte zuerst in der Quelle prüfen. Das Zeitfenster legst du selbst fest.</p>'}${safeUrl(idea.url)?`<a href="${e(idea.url)}" target="_blank" rel="noopener noreferrer">Quelle prüfen</a>`:''}
      ${available.length?`<label>Freies Zeitfenster dieser Woche<select id="ideaSlot">${options([['','Neues Zeitfenster festlegen'],...available.map(s=>[s.id,`${label(s.date)} · ${s.start}–${s.end}`] as [string,string])],slot?.id||'')}</select></label>`:'<p class="planner-small">Lege einen Zeitpunkt fest, den ihr abgestimmt habt. Bereits belegte Zeiten werden beim Speichern geprüft.</p>'}
      <form id="ideaScheduleForm" class="planner-form" data-slot-id="${slot?.id||''}"><label>Tag<input name="date" type="date" min="${today()}" required value="${date}" ${slot||idea.date?'readonly':''}></label><label class="planner-time">Von<input name="start" type="time" required value="${start}" ${slot||idea.start?'readonly':''}></label><label class="planner-time">Bis<input name="end" type="time" required value="${end}" ${slot?'readonly':''}></label><button class="planner-submit">Einplanen</button></form><div class="planner-actions">${button('cancelSchedule','Abbrechen')}${button('saveUnscheduled','Merken')}</div><p class="planner-small">Das Einplanen zählt erst als Vorschlag, wenn du es tatsächlich angesprochen hast.</p></section>`;
  }
  function suggestionsMarkup(slot: Slot) {
    const pool=ideas(slot);
    const routines=pool.filter(a=>a.source==='routine');const events=pool.filter(a=>a.source==='recommendation');
    const longOutdoor=duration(slot)>=180&&['outdoor','movement'].includes(slot.mood);
    const hike=longOutdoor?events.find(a=>a.tourKind==='wandern'&&a.flexible):undefined;
    const bike=longOutdoor?events.find(a=>a.tourKind==='fahrrad'&&a.flexible):undefined;
    const tours=[hike,bike].filter((a):a is Idea=>!!a);
    const initial=tours.length?[...tours,...routines.slice(0,3-tours.length)]:[...routines.slice(0,events.length?2:3),...events.slice(0,1)];
    const picks=moreIdeas?pool:initial.length<3?[...initial,...pool.filter(a=>!initial.includes(a)).slice(0,3-initial.length)]:initial;
    return `<div class="unified-ideas"><p class="planner-small">${moreIdeas?'Passende Ideen':'Vorschläge'}</p><div class="unified-idea-grid">${picks.map(a=>`<article class="planner-idea"><span class="section-kicker">${a.source==='routine'?'Meine Aktivitäten':a.flexible?'Touridee':'Aktuelles Event'}</span><h3>${categoryIcon(a.tourKind||a.source||'',a.title)}${e(a.title)}</h3><p>${a.minutes?`${a.tourKind?'Tourzeit':'Etwa'} ${a.minutes} Minuten${a.tourKind?' · Anfahrt zusätzlich prüfen':''}`:a.tourKind?'Tourzeit und Anfahrt prüfen':'Uhrzeit und Dauer in der Quelle prüfen'}</p>${button('chooseIdea',a.source==='routine'?'Einplanen':'Einplanen',String(pool.indexOf(a)))}</article>`).join('')||'<p>Keine passende Idee gefunden. Ändere Dauer oder Wünsche, oder trage deine eigene Idee ein.</p>'}</div>${pool.length>3?button('moreIdeas',moreIdeas?'Weniger Ideen':'Weitere Ideen'):''}<details class="custom-plan"><summary>Eigene Idee einplanen</summary><form id="customPlanForm" class="planner-form"><label>Aktivität<input name="title" required maxlength="200" placeholder="Was möchtest du machen?"></label><button class="planner-submit">Einplanen</button></form></details>${state.slots.some(s=>s.id===slot.id)?button('deleteSlot','Dieses freie Zeitfenster entfernen',slot.id):''}</div>`;
  }
  const toolSummary = (title: string, _help: string, badge = '') => `<span class="tool-summary-copy"><strong>${e(title)}</strong></span>${badge?`<span class="tool-summary-badge">${e(badge)}</span>`:''}<span class="tool-summary-toggle" aria-hidden="true">+</span>`;
  function routinesMarkup() {
    const routines=state.routines??[];const r=routines.find(x=>x.id===editingRoutine);
    return `<section class="planner-box routines-box"><details id="routineLibrary" ${openSection==='routines'?'open':''}><summary>${toolSummary('Meine regelmäßigen Aktivitäten','Schwimmen, Spazieren, Kajak … auswählen, einplanen oder ergänzen.',`${routines.length} Ideen`)}</summary><div class="routine-grid">${routines.map(x=>{
      const count=state.entries.filter(a=>inWeek(a.date)&&a.status!=='Abgelehnt'&&(a.routineId===x.id||!a.routineId&&a.title===x.title)).length;
      return `<article class="routine-card"><div><span class="routine-category">${categoryIcon(x.mood,x.title)}${e(moodOptions.find(o=>o[0]===x.mood)?.[1]||'Aktivität')}</span><h3>${e(x.title)}</h3><p>${x.minutes} Min.</p>${count?`<span class="routine-planned">${count}× diese Woche eingeplant</span>`:''}</div><div class="routine-actions">${button('routinePlan','Einplanen',x.id)}${button('editRoutine','Bearbeiten',x.id)}${button('deleteRoutine','Löschen',x.id)}</div></article>`;
    }).join('')||'<p>Ergänze deine erste Standardaktivität.</p>'}</div><details id="routineSection" ${r || routineFormOpen?'open':''}><summary>${r?`„${e(r.title)}“ bearbeiten`:'+ Neue Aktivität ergänzen'}</summary><h3>${r?'Standardaktivität bearbeiten':'Eine Standardaktivität ergänzen'}</h3><form id="routineForm" class="planner-form"><label>Aktivität<input name="title" required maxlength="200" value="${e(r?.title||'')}" placeholder="Zum Beispiel: Am Lech spazieren"></label><label>Dauer in Minuten<input name="minutes" type="number" min="5" max="1440" required value="${r?.minutes||45}"></label><label>Kategorie<select name="mood">${options(moodOptions,r?.mood||'outdoor')}</select></label><label class="planner-check"><input name="outdoor" type="checkbox" ${r?.outdoor?'checked':''}>Draußen</label><label class="routine-next">Vorbereitung / nächster Schritt<input name="next" maxlength="500" value="${e(neutralDescription(r?.next||''))}" placeholder="Was musst du vorher klären?"></label><button class="planner-submit">${r?'Änderungen speichern':'Aktivität ergänzen'}</button>${button('cancelRoutine','Abbrechen')}</form></details></details></section>`;
  }
  function weeklyCheckMarkup() {
    if (!weeklyCheck) return '';
    const planned = state.entries.filter(a=>inWeek(a.date)&&a.date>=today()&&!['Abgelehnt','Gemacht'].includes(a.status));
    const next = planned.find(a=>!a.proposedAt);
    return `<section class="weekly-check" aria-label="Wochencheck"><h2>Fünf Minuten für deine Woche</h2><ol><li><strong>Termine prüfen</strong><p>Was steht bereits fest?</p>${button('checkAppointments','Termine öffnen')}</li><li><strong>Aktivitäten auswählen</strong><p>${planned.length ? `${planned.length} Vorhaben eingeplant.` : 'Ein oder zwei schöne Vorhaben reichen. Freie Zeit darf frei bleiben.'}</p>${button('checkPlan','Etwas planen')}</li><li><strong>Gemeinsam besprechen</strong><p>${next?e(next.title):'Aktuell kein offenes Vorhaben zu besprechen.'}</p>${next?button('checkPropose','Vorhaben öffnen',next.id):button('checkIdeas','Ideen entdecken')}</li></ol><div class="planner-actions">${button('checked',state.checks.includes(week)?'Wochencheck erledigt ✓':'Wochencheck abschließen')}${button('weeklyCheck','Schließen')}</div></section>`;
  }
  function render() {
    if(!host)return;
    const focused=document.activeElement as HTMLElement | null;
    if((draft||pendingIdea)&&focused?.dataset.action&&!focused.closest('.planning-dialog'))dialogReturn=`[data-action="${CSS.escape(focused.dataset.action)}"][data-id="${CSS.escape(focused.dataset.id||'')}"]`;
    if(!inWeek(activeDate)&&!draft&&!pendingIdea)activeDate=inWeek(today())?today():week;
    const proposed=state.entries.filter(a=>a.proposedAt&&inWeek(actionDate(a.proposedAt))).length;
    const done=state.entries.filter(a=>a.doneAt&&inWeek(actionDate(a.doneAt))).length;
    const planned=state.entries.filter(a=>inWeek(a.date)&&a.date>=today()&&!['Abgelehnt','Gemacht'].includes(a.status));
    const next=planned.find(a=>!a.proposedAt);
    const editor=state.entries.find(a=>a.id===openEditor);
    host.innerHTML=`<div class="planner-heading"><h1>Meine Woche</h1></div><p class="planner-message" role="status" ${routineFeedback(message)?'hidden':''}>${e(message)}</p>
      ${undoMove?`<div class="calendar-undo" role="status">${e(undoMove.text||'Termin verschoben.')} ${button('undoCalendar','Rückgängig')}</div>`:''}${weekMarkup()}${composerMarkup()}${schedulerMarkup()}${editCalendarMarkup()}${dinnerPickerMarkup()}
      ${editor?`<section class="planner-box selected-entry"><div class="routine-heading"><h2>Vorhaben bearbeiten</h2>${button('closeEntry','Schließen')}</div>${entryMarkup(editor)}</section>`:''}
      ${next?`<section class="planner-next"><div><h2>Gemeinsam besprechen</h2><p class="next-activity"><strong>${e(next.title)}</strong><span>${label(next.date)}${next.start?` · ${next.start}–${next.end}`:''}</span></p></div><div class="planner-actions">${button('proposed','Als vorgeschlagen markieren',next.id)}</div></section>`:''}
      <div class="planner-tools"><section class="tool-group" aria-label="Aktivitäten auswählen">${routinesMarkup()}</section><section class="tool-group" aria-label="Termine und Rückblick"><header><h2>Termine &amp; Rückblick</h2></header><div class="tool-group-grid">
      <section class="planner-box"><details class="planner-setup" ${openSection==='setup'?'open':''}><summary>${toolSummary('Feste Termine eintragen','Yoga, Töpfern und Verabredungen blockieren Zeit im Kalender.')}</summary><form id="appointmentForm" class="planner-form"><label>Termin<input name="title" required maxlength="120" placeholder="Zum Beispiel: Yoga"></label><label>Person<select name="owner">${options([['Daniel','Ich'],['Eva','Eva'],['Beide','Beide']])}</select></label><label>Datum<input name="date" type="date" required value="${activeDate}"></label><label class="planner-time">Von<input name="start" type="time" required value="18:00"></label><label class="planner-time">Bis<input name="end" type="time" required value="19:30"></label><div class="planner-options" role="group" aria-label="Terminoptionen"><label class="planner-check"><input name="repeat" type="checkbox">Wöchentlich</label><label class="planner-check"><input name="uncertain" type="checkbox">Noch unklar</label></div><button class="planner-submit">Termin hinzufügen</button></form></details></section>
      <section class="planner-box"><details class="planner-history"><summary>${toolSummary('Vorschläge & Rückmeldungen','Ideen merken und festhalten, was du vorgeschlagen hast.',`${state.entries.length} Einträge`)}</summary><div class="planner-stats"><span><strong>${proposed}</strong> vorgeschlagen</span><span><strong>${done}</strong> gemacht</span></div><p class="planner-small">Nach dem Datum der Handlung in dieser Woche.</p><form id="entryForm" class="planner-form"><label>Idee / früherer Vorschlag<input name="title" required maxlength="200" placeholder="Was möchtest du festhalten?"></label><label>Datum der Aktivität<input name="date" type="date" value="${activeDate}"></label><label>Eintragen als<select name="status">${options([['Idee gespeichert','Gemerkt'],['Vorgeschlagen','Vorgeschlagen']])}</select></label><button class="planner-submit">Im Protokoll speichern</button></form>${state.entries.map(entryMarkup).join('')||'<p>Noch keine Einträge.</p>'}</details></section></div></section></div><section class="tool-group planner-settings" aria-label="Verbindung und Sicherung"><details id="plannerSettings" ${settingsOpen || backup?'open':''}><summary>${toolSummary('Verbindung & Sicherung','Google-Abgleich und Datensicherung bei Bedarf öffnen.')}</summary><div class="settings-refresh">${button('refresh','Stand aktualisieren')}</div><div class="tool-group-grid">
      <section class="planner-box"><details class="planner-setup"><summary>${toolSummary('Google Kalender',state.googleSync?.lastSuccess?`Freizeitplaner · letzter Abgleich ${new Date(state.googleSync.lastSuccess).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`:'Kalender „Freizeitplaner“ verbinden und automatisch abgleichen.',state.googleSync?.error?'Abgleich prüfen':state.googleSync?.lastSuccess?'Eingerichtet':'Einrichten')}</summary><p>${state.googleSync?.lastSuccess ? `Letzte Synchronisierung: ${e(new Date(state.googleSync.lastSuccess).toLocaleString('de-DE'))}. Änderungen werden etwa alle fünf Minuten abgeglichen.` : 'Noch nicht aktiviert. Die Verbindung benötigt einmalig deine Freigabe in Google.'}</p>${state.googleSync?.lastSuccess && Date.now()-Date.parse(state.googleSync.lastSuccess)>15*60*1000?'<p role="status">Seit mehr als 15 Minuten kein erfolgreicher Abgleich. Bitte das Google-Script und seinen Zeit-Trigger prüfen.</p>':''}${state.googleSync?.error?'<p role="alert">Der letzte Abgleich ist fehlgeschlagen. Bitte die Ausführungen im Google-Script prüfen.</p>':''}<p>Es wird ausschließlich der Google-Kalender „Freizeitplaner“ synchronisiert. Geplante Aktivitäten und feste Termine werden übertragen; gespeicherte Ideen ohne vollständigen Zeitpunkt bleiben im Planer. Google-Termine erscheinen als feste Termine. Bei gleichzeitigen Änderungen an Titel oder Zeitpunkt hat Google Vorrang; dein Vorschlagsprotokoll bleibt erhalten.</p><p>Aus Google werden die vergangenen 30 Tage und die kommenden zwölf Monate geladen. Ganztägige und mehrtägige Termine erscheinen pro Tag. Serien kannst du im Kalender einzeln oder vollständig löschen; Einzelne Termine kannst du hier verschieben. Serienregeln und mehrtägige Google-Termine bearbeitest du in Google.</p><ol><li><a href="https://script.google.com/home/start" target="_blank" rel="noopener noreferrer">Google Apps Script öffnen</a> und ein neues Projekt erstellen.</li><li><a href="/google-calendar/Code.gs" download>Verbindungscode herunterladen</a>, öffnen und vollständig in „Code.gs“ einsetzen.</li><li>Links unter „Dienste“ auf + klicken und „Google Calendar API“ hinzufügen.</li><li>Oben die Funktion <strong>install</strong> auswählen, ausführen und den Zugriff freigeben. Sie startet den ersten Abgleich und richtet den Fünf-Minuten-Takt ein.</li></ol><p class="planner-small">Kein Web-App-Deployment erforderlich. Die Verbindung läuft in deinem Google-Konto. Zum Beenden dort die Funktion „uninstall“ ausführen. Bitte nur ein Script-Projekt installieren.</p></details></section>
      <section class="planner-box"><details class="planner-storage"><summary>${toolSummary('Planung sichern','Eine Sicherung herunterladen oder einen gespeicherten Stand importieren.')}</summary><p>Die Planung wird gemeinsam online gespeichert. Jeder mit Zugriff auf die App kann sie lesen und bearbeiten.</p>${button('export','Sicherung exportieren')}<label>Sicherung importieren<input id="plannerImport" type="file" accept="application/json,.json"></label>${backup?`<p>Sicherung mit ${backup.entries.length} Einträgen. Die Übernahme ersetzt die Planung auf allen Geräten.</p>${button('confirmImport','Diese Sicherung übernehmen')}${button('cancelImport','Abbrechen')}`:''}</details></section></div></details></section>`;
    wire();setBusy();
    const content=host.querySelector<HTMLElement>('#dinnerPicker,#calendarEditor,#dayComposer,#ideaScheduler');
    if(content){
      const dialog=document.createElement('dialog');dialog.className='planning-dialog';dialog.setAttribute('aria-label',dinnerDate?'Abendessen planen':calendarEdit?'Termin ändern':'Aktivität planen');
      content.replaceWith(dialog);dialog.append(content);
      dialog.addEventListener('cancel',ev=>{ev.preventDefault();dinnerDate='';calendarEdit=null;draft=null;draftReady=false;pendingIdea=null;render();});
      dialog.addEventListener('click',ev=>{if(ev.target===dialog){const r=dialog.getBoundingClientRect();const mouse=ev as MouseEvent;if(mouse.clientX<r.left||mouse.clientX>r.right||mouse.clientY<r.top||mouse.clientY>r.bottom){dinnerDate='';calendarEdit=null;draft=null;draftReady=false;pendingIdea=null;render();}}});
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
      dialog.querySelector<HTMLInputElement>(dinnerDate?'#dinnerSearch':'input[name=start]')?.focus();
    }else if(dialogReturn){host.querySelector<HTMLElement>(dialogReturn)?.focus();dialogReturn='';}

  }
  function entryMarkup(a: Entry) {
    const stamp = (s: string) => s ? new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}).format(new Date(s)) : 'Noch nicht';
    return `<article class="planner-entry" data-entry="${e(a.id)}"><details class="planner-entry-editor" ${openEditor === a.id ? 'open' : ''}><summary><span>${e(a.title)}</span><span class="planner-entry-meta">${label(a.date)}${a.start ? ` · ${a.start}–${a.end}` : ''} · ${e(entryLabel(a))}</span></summary><div class="planner-form"><label>Status<select data-entry-field="status">${options(statuses.map(s=>[s,s==='Idee gespeichert'?(a.date&&a.start?'Geplant':'Gemerkt'):s]),a.status)}</select></label>${button('editEntryTime','Termin ändern',a.id)}<label>Nächster Schritt<input data-entry-field="next" value="${e(neutralDescription(a.next))}" maxlength="500"></label><label>Notiz / Rückmeldung<textarea data-entry-field="note" maxlength="2000" placeholder="Was wurde besprochen?">${e(a.note)}</textarea></label></div><p class="planner-small">Vorgeschlagen: ${stamp(a.proposedAt)} · Organisiert: ${stamp(a.organizedAt)} · Gemacht: ${stamp(a.doneAt)}</p><details><summary>Vorschlagsdatum nachtragen oder korrigieren</summary><label>Datum<input type="date" data-entry-field="proposedDate" max="${today()}" value="${actionDate(a.proposedAt)}"></label><p class="planner-small">Eine Erinnerung an einen früheren Vorschlag nachtragen. Leeres Datum entfernt die Markierung „vorgeschlagen“.</p></details><div class="planner-actions">${!a.proposedAt ? button('proposed','Vorgeschlagen',a.id) : ''}${safeUrl(a.url) ? `<a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Quelle</a>` : ''}${a.date && a.start && !state.googleSync?.lastSuccess ? button('activityCalendar','In Kalender übernehmen',a.id) : ''}${button('deleteEntry','Eintrag entfernen',a.id)}</div></details></article>`;
  }
  function wireCalendar() {
    const form=host?.querySelector<HTMLFormElement>('#calendarEditForm');
    if(form) {
      const date=form.elements.namedItem('date') as HTMLInputElement,start=form.elements.namedItem('start') as HTMLInputElement,minutes=form.elements.namedItem('minutes') as HTMLInputElement;
      const preview=()=>{const end=Number(start.value.slice(0,2))*60+Number(start.value.slice(3))+Number(minutes.value);form.querySelector('output')!.textContent=end<1440?'Ende: '+String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0'):'Ende liegt am nächsten Tag';const names=calendarEdit&&validDate(date.value)&&validTime(start.value)&&end<1440?collisionTitles(calendarEdit,date.value,start.value,String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0')):[];const warning=form.querySelector<HTMLElement>('#calendarCollision')!;warning.textContent=names.length?'Überschneidung: '+names.join(', '):'';warning.className=names.length?'planner-warning':'';form.querySelectorAll<HTMLButtonElement>('[data-calendar-date]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.calendarDate===date.value)));};
      form.addEventListener('input',preview);
      form.querySelectorAll<HTMLButtonElement>('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{date.value=b.dataset.calendarDate!;preview();}));
      form.querySelectorAll<HTMLButtonElement>('[data-action^=shift]').forEach(b=>b.addEventListener('click',()=>{const n=Number(start.value.slice(0,2))*60+Number(start.value.slice(3))+(b.dataset.action==='shiftEarlier'?-30:30);if(n>=0&&n+Number(minutes.value)<1440){start.value=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');preview();}}));
      form.addEventListener('submit',ev=>{ev.preventDefault();if(calendarEdit)void moveCalendar({...calendarEdit},date.value,start.value,Number(minutes.value));});preview();
    }
    host?.querySelectorAll<HTMLElement>('[data-calendar-kind]').forEach(el=>{
      const enabled=window.matchMedia?.('(pointer:fine)').matches??false;const appointment=state.appointments.find(x=>x.id===el.dataset.calendarId);const multiDay=appointment?.googleEventId&&state.appointments.filter(x=>x.googleEventId===appointment.googleEventId).length>1;el.draggable=enabled&&loaded&&!saving&&!multiDay;
      if(el.dataset.calendarKind==='appointment')el.addEventListener('click',ev=>{if((ev.target as Element).closest('button,summary,a,details'))return;openCalendar('appointment',el.dataset.calendarId!,el.dataset.calendarOccurrence!);});
      el.addEventListener('dragstart',ev=>{if(!el.draggable||!ev.dataTransfer)return;dragging=JSON.stringify({kind:el.dataset.calendarKind,id:el.dataset.calendarId,date:el.dataset.calendarOccurrence});ev.dataTransfer.setData('application/x-freizeitplaner',dragging);ev.dataTransfer.effectAllowed='move';el.classList.add('is-dragging');});
      el.addEventListener('dragend',()=>{dragging='';el.classList.remove('is-dragging');host?.querySelectorAll('.is-drop-target').forEach(x=>x.classList.remove('is-drop-target'));});
    });
    host?.querySelectorAll<HTMLElement>('[data-drop-date]').forEach(el=>{
      el.addEventListener('dragover',ev=>{if(!dragging||saving)return;ev.preventDefault();if(ev.dataTransfer)ev.dataTransfer.dropEffect='move';el.classList.add('is-drop-target');});
      el.addEventListener('dragleave',ev=>{if(!el.contains(ev.relatedTarget as Node))el.classList.remove('is-drop-target');});
      el.addEventListener('drop',ev=>{if(!dragging||saving)return;ev.preventDefault();const target=JSON.parse(dragging) as NonNullable<typeof calendarEdit>|{kind:'dinner';id:string;date:string};dragging='';el.classList.remove('is-drop-target');if(target.kind==='dinner'){void moveDinner(target.id,el.dataset.dropDate!);return;}const row=calendarRow(target);if(!row||target.date===el.dataset.dropDate)return;if(validTime(row.start)&&validTime(row.end))void moveCalendar(target,el.dataset.dropDate!,row.start,duration(row));else openCalendar(target.kind,target.id,el.dataset.dropDate!);});
    });
  }
  function wire() {
    host?.querySelector<HTMLDetailsElement>('#plannerSettings')?.addEventListener('toggle',ev=>{settingsOpen=(ev.currentTarget as HTMLDetailsElement).open;});
    if (!host) return;
    wireCalendar();wireDinner();
    host.querySelectorAll<HTMLDetailsElement>('.planner-entry-editor').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)openEditor=el.closest<HTMLElement>('[data-entry]')?.dataset.entry||'';}));
    host.querySelector<HTMLDetailsElement>('.planner-setup')?.addEventListener('toggle',ev=>{if((ev.target as HTMLDetailsElement).open)openSection='setup';});
    host.querySelector<HTMLDetailsElement>('#routineSection')?.addEventListener('toggle',ev=>{routineFormOpen=(ev.currentTarget as HTMLDetailsElement).open;});
    host.querySelector<HTMLDetailsElement>('#routineLibrary')?.addEventListener('toggle',ev=>{openSection=(ev.target as HTMLDetailsElement).open?'routines':openSection==='routines'?'':openSection;});
    host.querySelector<HTMLFormElement>('#dayPlanForm')?.addEventListener('submit',ev=>{
      ev.preventDefault();if(!draft)return;const d=new FormData(ev.currentTarget as HTMLFormElement);
      const date=String(d.get('date')),start=String(d.get('start')),minutes=Number(d.get('minutes'));
      const endMinutes=Number(start.slice(0,2))*60+Number(start.slice(3))+minutes;
      if(!validDate(date)||date<today()||!validTime(start)||!Number.isInteger(minutes)||minutes<5||endMinutes>=1440){message='Bitte eine gültige Zeit ab heute wählen. Die Aktivität muss am selben Tag enden.';render();return;}
      const end=String(Math.floor(endMinutes/60)).padStart(2,'0')+':'+String(endMinutes%60).padStart(2,'0');
      const existing=state.slots.find(s=>s.date===date&&s.start===start&&s.end===end);
      draft={id:existing?.id||crypto.randomUUID(),date,start,end,energy:'medium',mood:String(d.get('mood')),effort:'prepare'};
      activeDate=date;week=monday(date);draftReady=true;moreIdeas=false;render();
    });
    host.querySelector<HTMLFormElement>('#customPlanForm')?.addEventListener('submit',ev=>{
      ev.preventDefault();if(!draft||!draftReady||clash(draft)||occupied(draft))return;const d=new FormData(ev.currentTarget as HTMLFormElement);const title=String(d.get('title')).trim();if(title)void addEntry(title,'','Idee gespeichert',draft);
    });
    host.querySelector<HTMLSelectElement>('#ideaSlot')?.addEventListener('change',ev=>{scheduleSlot=(ev.target as HTMLSelectElement).value;render();});
    host.querySelector<HTMLFormElement>('#ideaScheduleForm')?.addEventListener('submit',async ev=>{
      ev.preventDefault();if(!pendingIdea)return;
      const form=ev.currentTarget as HTMLFormElement;const d=new FormData(form);const idea=pendingIdea;
      const existing=state.slots.find(s=>s.id===form.dataset.slotId);
      const date=String(d.get('date')),start=String(d.get('start')),end=String(d.get('end'));
      const match=state.slots.find(s=>s.date===date&&s.start===start&&s.end===end);
      const candidate:Slot=existing??match??{id:crypto.randomUUID(),date,start,end,energy:'medium',mood:'unknown',effort:'prepare'};
      if(!validDate(candidate.date)||!validTime(candidate.start)||!validTime(candidate.end)||candidate.end<=candidate.start||!canSchedule(candidate,idea)){
        message='Dieser Zeitpunkt passt nicht: Prüfe Datum, Dauer und Überschneidungen. Wähle eine freie Zeit ab heute.';render();return;
      }
      const now=new Date().toISOString();
      if(await mutate(()=>{
        if(!state.slots.some(s=>s.id===candidate.id))state.slots.push(candidate);
        selectedSlot=candidate.id;activeDate=candidate.date;week=monday(candidate.date);
        state.entries.unshift({id:crypto.randomUUID(),title:idea.title,url:safeUrl(idea.url),date:candidate.date,start:candidate.start,end:candidate.end,slotId:candidate.id,status:'Idee gespeichert',createdAt:now,proposedAt:'',organizedAt:'',doneAt:'',note:'',next:idea.next,routineId:idea.routineId,source:idea.source});
      },'In deine Woche eingeplant. Nächster Schritt: konkret vorschlagen.')){pendingIdea=null;draft=null;draftReady=false;render();host.querySelector('.week-board')?.scrollIntoView({behavior:'smooth',block:'start'});}
    });
    host.querySelector<HTMLFormElement>('#routineForm')?.addEventListener('submit',async ev=>{
      ev.preventDefault();const d=new FormData(ev.currentTarget as HTMLFormElement);
      const r:Routine={id:editingRoutine||crypto.randomUUID(),title:String(d.get('title')).trim(),minutes:Number(d.get('minutes')),energy:state.routines?.find(x=>x.id===editingRoutine)?.energy||'medium',mood:String(d.get('mood')),effort:state.routines?.find(x=>x.id===editingRoutine)?.effort||'prepare',outdoor:d.has('outdoor'),next:String(d.get('next')).trim()||'Einen konkreten Zeitpunkt vorschlagen.'};
      if(!r.title)return;openSection='routines';
      if(await mutate(()=>{const routines=state.routines??[];const i=routines.findIndex(x=>x.id===r.id);if(i<0)routines.push(r);else routines[i]=r;state.routines=routines;},'Standardaktivität gespeichert. Auf allen Geräten verfügbar.')){editingRoutine='';routineFormOpen=false;}render();
    });
    host.querySelector<HTMLFormElement>('#appointmentForm')?.addEventListener('submit',ev=>{
      ev.preventDefault(); const f = ev.currentTarget as HTMLFormElement; const d = new FormData(f); const start = String(d.get('start')), end = String(d.get('end'));
      if (end <= start) { message = 'Das Ende muss nach dem Beginn liegen.'; render(); return; }
      mutate(()=>state.appointments.push({id:crypto.randomUUID(),title:String(d.get('title')).trim(),date:String(d.get('date')),start,end,owner:String(d.get('owner')),repeat:d.has('repeat'),uncertain:d.has('uncertain')}));
    });
    host.querySelector<HTMLFormElement>('#entryForm')?.addEventListener('submit',ev=>{
      ev.preventDefault(); const d = new FormData(ev.currentTarget as HTMLFormElement); const title=String(d.get('title')).trim(); if (!title) return;
      const now=new Date().toISOString(); mutate(()=>state.entries.unshift({id:crypto.randomUUID(),title,url:'',date:String(d.get('date')),start:'',end:'',slotId:'',status:String(d.get('status')),createdAt:now,proposedAt:d.get('status')==='Vorgeschlagen'?now:'',organizedAt:'',doneAt:'',note:'',next:d.get('status')==='Vorgeschlagen'?'Rückmeldung und Zeitpunkt gemeinsam klären.':'Einen konkreten Zeitpunkt vorschlagen.'}));
    });
    host.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-entry-field]').forEach(el=>el.addEventListener('change',()=>mutate(()=>{
      const a=state.entries.find(x=>x.id===el.closest<HTMLElement>('[data-entry]')?.dataset.entry);if(!a)return;
      openEditor=a.id;const k=el.dataset.entryField!; const now=new Date().toISOString();
      if((k==='start'&&el.value&&a.end&&el.value>=a.end)||(k==='end'&&el.value&&a.start&&el.value<=a.start))throw Error();
      if(k==='proposedDate'){a.proposedAt=el.value?new Date(el.value+'T12:00:00Z').toISOString():'';return;}
      if(['date','start','end'].includes(k)){
        const changed={...a,[k]:el.value};
        if(changed.date&&changed.start&&changed.end){
          if(changed.end<=changed.start||appointmentsFor(changed.date).some(x=>overlaps(x,changed))||state.entries.some(x=>x.id!==a.id&&x.status!=='Abgelehnt'&&x.date===changed.date&&x.start&&x.end&&overlaps(x,changed)))throw Error();
        }
        const oldSlot=a.slotId;a.slotId='';
        if(oldSlot&&!state.entries.some(x=>x.id!==a.id&&x.slotId===oldSlot))state.slots=state.slots.filter(x=>x.id!==oldSlot);
      }
      (a as unknown as Record<string,string>)[k]=el.value;
      if(k==='status'){
        if(el.value==='Vorgeschlagen'&&!a.proposedAt)a.proposedAt=now;
        if(el.value==='Organisiert'&&!a.organizedAt)a.organizedAt=now;
        if(el.value==='Gemacht'&&!a.doneAt)a.doneAt=now;
        a.next=el.value==='Vorgeschlagen'||el.value==='Offen'?'Rückmeldung und Zeitpunkt gemeinsam klären.':el.value==='Zugesagt'?'Öffnungszeiten, Reservierung und Vorbereitung erledigen.':el.value==='Organisiert'?'Vor dem Termin letzte Details prüfen.':el.value==='Abgelehnt'?'Kurz festhalten, was nicht passte.':el.value==='Gemacht'?'Kurz notieren, wie es euch gefallen hat.':'Einen konkreten Zeitpunkt vorschlagen.';
      }
    })));
    host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',async ()=>{
      const action=b.dataset.action,id=b.dataset.id;
      if(action==='chooseDinner'){openDinner(id!);return;}
      if(action==='moveCurrentDinner'){await moveDinner(id!,dinnerDate);return;}
      if(action==='cancelDinner'){dinnerDate='';render();return;}
      if(action==='retryRecipes'){void fetchDinnerRecipes();return;}
      if(action==='removeDinner'){await mutate(()=>{state.dinners=state.dinners?.filter(d=>d.id!==id);},'Abendessen entfernt.');return;}
      if(action==='editAppointment'){openCalendar('appointment',id!,b.dataset.date!);return;}
      if(action==='editEntryTime'){const a=state.entries.find(x=>x.id===id);if(a)openCalendar('entry',id!,a.date);return;}
      if(action==='calendarDetails'){calendarEdit=null;openEditor=id!;render();host.querySelector('.selected-entry')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='cancelCalendar'){calendarEdit=null;render();return;}
      if(action==='shiftEarlier'||action==='shiftLater')return;
      if(action==='undoCalendar'){const undo=undoMove;if(!undo)return;if(undo.revision!==revision){undoMove=null;message='Die Planung wurde inzwischen geändert. Bitte den Termin erneut bearbeiten.';render();return;}await mutate(()=>{state=undo.state;},'Verschiebung rückgängig gemacht.');return;}
      if(action==='checkPlan'){startDay(week>today()?week:today());return;}
      if(action==='checkIdeas'){document.querySelector<HTMLButtonElement>('[data-main-view=ideas]')?.click();return;}
      if(action==='checkPropose'){openEditor=id!;render();host.querySelector('.selected-entry')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='selectDay'){startDay(id!);return;}
      if(action==='fixedDay'){activeDate=id!;openSection='setup';draft=null;pendingIdea=null;render();host.querySelector('.planner-setup')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='selectSlot'){const slot=state.slots.find(s=>s.id===id);if(slot)startDay(slot.date,slot);return;}
      if(action==='cancelDraft'){draft=null;draftReady=false;render();return;}
      if(action==='moreIdeas'){moreIdeas=!moreIdeas;render();return;}
      if(action==='weeklyCheck'){weeklyCheck=!weeklyCheck;render();host.querySelector('.weekly-check')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='checkAppointments'){openSection='setup';render();host.querySelector('.planner-setup')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='openEntry'){const a=state.entries.find(x=>x.id===id);if(a)openCalendar('entry',id!,a.date);return;}
      if(action==='closeEntry'){openEditor='';render();return;}
      if(action==='editRoutine'){editingRoutine=id!;routineFormOpen=true;openSection='routines';render();host.querySelector('#routineSection')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='routinePlan'){const r=state.routines?.find(x=>x.id===id);if(r)beginPlanning({title:r.title,url:'',next:r.next,outdoor:r.outdoor,minutes:r.minutes,source:'routine',routineId:r.id});return;}
      if(action==='cancelSchedule'){pendingIdea=null;render();return;}
      if(action==='saveUnscheduled'){const idea=pendingIdea;if(idea){pendingIdea=null;addEntry(idea.title,idea.url,'Idee gespeichert',undefined,idea.next,idea);}return;}
      if(action==='deleteRoutine'){if(!confirm('Diese Standardaktivität entfernen? Bereits geplante Vorhaben bleiben erhalten.'))return;if(await mutate(()=>{state.routines=state.routines?.filter(x=>x.id!==id);}) && editingRoutine===id){editingRoutine='';routineFormOpen=false;render();}return;}
      if(action==='cancelRoutine'){editingRoutine='';routineFormOpen=false;render();return;}
      if(action==='prev'||action==='next'||action==='current'){week=action==='current'?monday(today()):addDays(week,action==='prev'?-7:7);draft=null;pendingIdea=null;openEditor='';render();return;}
      if(action==='refresh'){await refreshCloud(true);return;}
      if(action==='export'){download(JSON.stringify(state,null,2),'freizeitplaner-sicherung-'+today()+'.json','application/json');return;}
      if(action==='calendar'){calendar();return;}
      if(action==='activityCalendar'){calendar(state.entries.find(x=>x.id===id));return;}
      if(action==='cancelImport'){backup=null;render();return;}
      if(action==='confirmImport'&&backup){const imported=backup;if(await mutate(()=>{state={...imported,routines:imported.routines ?? defaultRoutines()};},'Sicherung gemeinsam übernommen.'))backup=null;render();return;}
      if(action==='chooseIdea'){const slot=draft;if(!slot||!draftReady||clash(slot)||slot.date<today()||occupied(slot))return;const idea=ideas(slot)[Number(id)];if(!idea)return;if(idea.source==='recommendation'){beginPlanning(idea);return;}await addEntry(idea.title,idea.url,'Idee gespeichert',slot,idea.next,idea);return;}
      if(action==='deleteOccurrence'||action==='deleteSeries'){
        const appointment=state.appointments.find(a=>a.id===id);const date=b.dataset.date;
        if(!appointment || action==='deleteOccurrence' && (!validDate(date)||!appointmentsFor(date!).some(a=>a.id===id)))return;
        if(action==='deleteSeries' && !confirm(`Die gesamte Serie „${appointment.title}“ löschen? Damit werden alle vergangenen und zukünftigen Termine dieser Serie entfernt.`))return;
        await mutate(()=>{
          if(action==='deleteSeries' && appointment.googleSeriesId){
            state.googleDeleteSeries=[...new Set([...(state.googleDeleteSeries??[]),appointment.googleSeriesId])];
            state.appointments=state.appointments.filter(a=>a.googleSeriesId!==appointment.googleSeriesId);
          }
          else if(appointment.googleEventId)state.appointments=state.appointments.filter(a=>a.googleEventId!==appointment.googleEventId);
          else if(action==='deleteOccurrence' && appointment.repeat)appointment.excludedDates=[...new Set([...(appointment.excludedDates??[]),date!])];
          else state.appointments=state.appointments.filter(a=>a.id!==id);
        },action==='deleteOccurrence' && appointment.repeat?'Dieser Termin wurde gelöscht. Die übrige Serie bleibt erhalten.':action==='deleteSeries'?'Die gesamte Terminserie wurde gelöscht.':'Der Termin wurde gelöscht.');
        return;
      }
      if(action==='deleteEntry'){const entry=state.entries.find(x=>x.id===id);if(!entry||!confirm(`„${entry.title}“ aus deinem persönlichen Protokoll entfernen?`))return;}
      mutate(()=>{
        if(action==='checked'&&!state.checks.includes(week))state.checks.push(week);
        if(action==='deleteSlot')state.slots=state.slots.filter(a=>a.id!==id);
        if(action==='deleteEntry')state.entries=state.entries.filter(a=>a.id!==id);
        if(action==='done'){const a=state.entries.find(x=>x.id===id);if(a){a.doneAt=new Date().toISOString();a.status='Gemacht';a.next='Kurz notieren, wie es euch gefallen hat.';}}
        if(action==='proposed'){const a=state.entries.find(x=>x.id===id);if(a){a.proposedAt=new Date().toISOString();a.status='Vorgeschlagen';a.next='Rückmeldung und Zeitpunkt gemeinsam klären.';}}
      });
    }));
    host.querySelector<HTMLInputElement>('#plannerImport')?.addEventListener('change',async ev=>{
      const file=(ev.target as HTMLInputElement).files?.[0];if(!file)return;
      try { if(file.size>5000000)throw Error();const parsed:unknown=JSON.parse(await file.text());if(!validState(parsed))throw Error();backup=parsed;message='Sicherung geprüft. Bitte die Übernahme bestätigen.'; }
      catch {message='Diese Datei ist keine gültige Freizeitplaner-Sicherung.';backup=null;}render();host.querySelector<HTMLDetailsElement>('.planner-storage')!.open=true;
    });
  }
  function download(content: string, name: string, type: string) {
    const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function calendar(entry?: Entry) {
    const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const event=(uid:string,date:string,time:string,title:string,description:string,rule='',end='')=>[
      'BEGIN:VEVENT','UID:'+uid+'@freizeitplaner','DTSTAMP:'+stamp,
      'DTSTART;TZID=Europe/Berlin:'+date.replace(/-/g,'')+'T'+time.replace(':','')+'00',
      ...(end?['DTEND;TZID=Europe/Berlin:'+date.replace(/-/g,'')+'T'+end.replace(':','')+'00']:['DURATION:PT15M']),
      'SUMMARY:'+esc(title),'DESCRIPTION:'+esc(description),...(rule?['RRULE:'+rule]:[]),
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(title),'TRIGGER:-PT15M','END:VALARM','END:VEVENT'];
    const events=entry?event(entry.id,entry.date,entry.start,entry.title,entry.next+'\n'+entry.note,'',entry.end):[
      ...event('weekly-check',addDays(monday(today()),6),'18:00','Freizeitplaner: nächste Woche vorbereiten','Feste Termine klären, ein bis zwei Zeitfenster auswählen. '+location.origin,'FREQ=WEEKLY;BYDAY=SU'),
      ...event('weekend-check',addDays(monday(today()),9),'18:00','Freizeitplaner: Wochenende abstimmen','Einen konkreten Vorschlag machen und Vorbereitung übernehmen. '+location.origin,'FREQ=WEEKLY;BYDAY=WE')];
    const timezone=['BEGIN:VTIMEZONE','TZID:Europe/Berlin','BEGIN:STANDARD','DTSTART:19701025T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','BEGIN:DAYLIGHT','DTSTART:19700329T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','END:VTIMEZONE'];
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Freizeitplaner//Meine Woche//DE','CALSCALE:GREGORIAN',...timezone,...events,'END:VCALENDAR'];
    const folded=lines.map(line=>{const chunks:string[]=[];let chunk='';for(const c of line){if(new TextEncoder().encode(chunk+c).length>73){chunks.push(chunk);chunk=' '+c;}else chunk+=c;}chunks.push(chunk);return chunks.join('\r\n');}).join('\r\n')+'\r\n';
    download(folded,entry?'freizeit-aktivitaet.ics':'freizeit-planungserinnerungen.ics','text/calendar');
    message=entry?'Kalenderdatei erstellt. Bitte in deinen Kalender importieren.':'Kalenderdatei erstellt: Sonntag und Mittwoch um 18 Uhr, jeweils mit Erinnerung. Bitte importieren; erst danach erinnert dich dein Kalender.';render();
  }
  // Preserve the existing recommendation and favorites flows. Add personal actions separately.
  const enhance=()=>document.querySelectorAll<HTMLButtonElement>('[data-favorite],[data-plan-favorite]').forEach(b=>{
    const saved=b.hasAttribute('data-plan-favorite');
    if(!b.dataset.title||saved&&b.dataset.plannerWired||!saved&&b.parentElement?.querySelector('[data-personal-action]'))return;
    const action=saved?b:document.createElement('button');action.type='button';action.className='details-btn';action.dataset.personalAction='true';action.textContent='Einplanen';
    if(saved)b.dataset.plannerWired='true';
    action.addEventListener('click',()=>{
      const original=saved?Array.from(document.querySelectorAll<HTMLButtonElement>('.filterable [data-favorite]')).find(source=>source.dataset.id===b.dataset.suggestionId):b;
      const card=original?.closest<HTMLElement>('.filterable');const date=card?.dataset.date;const category=card?.dataset.category||b.dataset.category||'';
      beginPlanning({title:b.dataset.title!,url:b.dataset.url||'',next:'Uhrzeit, Dauer, Anfahrt und Verfügbarkeit prüfen; anschließend konkret vorschlagen.',outdoor:['outdoor','wandern','fahrrad','kajak'].includes(category.toLowerCase()),source:'recommendation',minutes:Number(card?.dataset.tourMinutes)||undefined,tourKind:card?.classList.contains('tour-card')?card.dataset.category:undefined,flexible:card?.dataset.flexibleTour==='true',date:card?.dataset.flexibleTour==='true'?undefined:validDate(date)?date:undefined,start:validTime(original?.dataset.eventStart)?original?.dataset.eventStart:undefined});
    });
    action.disabled=!loaded||saving;if(!saved)b.insertAdjacentElement('afterend',action);
  });
  new MutationObserver(records=>{enhance();if(!isEditing()&&records.some(record=>record.target instanceof Element && record.target.closest('#topCards,#alternativeList,#hikeGroup,#bikeGroup')))render();}).observe(document.querySelector('#app')!,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCloud();});
  window.addEventListener('focus',()=>{void refreshCloud();});
  window.setInterval(()=>{if(!document.hidden)void refreshCloud();},15000);
  render();enhance();setBusy();
  void refreshCloud();
  const params=new URLSearchParams({latitude:'48.3705',longitude:'10.8978',daily:'precipitation_probability_max',timezone:'Europe/Berlin',forecast_days:'14'});
  fetch('https://api.open-meteo.com/v1/forecast?'+params).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(data.daily?.time)rain=Object.fromEntries(data.daily.time.map((d:string,i:number)=>[d,data.daily.precipitation_probability_max[i]]));if(!host.contains(document.activeElement))render();}).catch(()=>{});
}

