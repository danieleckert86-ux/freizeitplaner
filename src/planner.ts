import './planner.css';
import type { SupabaseClient } from '@supabase/supabase-js';

type Appointment = { id: string; title: string; date: string; start: string; end: string; owner: string; uncertain: boolean; repeat: boolean };
type Slot = { id: string; date: string; start: string; end: string; energy: string; mood: string; effort: string };
type Entry = { id: string; title: string; url: string; date: string; start: string; end: string; slotId: string; status: string; createdAt: string; proposedAt: string; organizedAt: string; doneAt: string; note: string; next: string };
type Routine = { id: string; title: string; minutes: number; energy: string; mood: string; effort: string; outdoor: boolean; next: string };
type State = { routines?: Routine[]; version: 1; appointments: Appointment[]; slots: Slot[]; entries: Entry[]; checks: string[] };
type Idea = { title: string; url: string; next: string; outdoor: boolean; minutes?: number };
const defaultRoutines = (): Routine[] => [
  {id:'walk',title:'Spazieren durch die Stadt',minutes:45,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eva eine gemeinsame Runde zu Beginn des Zeitfensters vorschlagen.'},
  {id:'swim',title:'Schwimmen',minutes:90,energy:'medium',mood:'movement',effort:'prepare',outdoor:false,next:'Öffnungszeiten und Badebetrieb prüfen, Zeitpunkt abstimmen und Schwimmsachen vorbereiten.'},
  {id:'kayak',title:'Kajak fahren',minutes:120,energy:'high',mood:'movement',effort:'prepare',outdoor:true,next:'Wasserbedingungen, Befahrbarkeit und Vereinszeiten prüfen; Zeitpunkt und Ausrüstung klären.'},
  {id:'garden',title:'Zum Garten gehen',minutes:60,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Wetter prüfen und abstimmen, ob ihr eine Runde geht oder im Garten bleiben möchtet.'},
  {id:'cafe',title:'Kaffee trinken gehen',minutes:60,energy:'low',mood:'food',effort:'spontaneous',outdoor:false,next:'Ein Café auswählen, Öffnungszeiten prüfen und Eva den Zeitpunkt vorschlagen.'},
  {id:'dinner',title:'Essen gehen',minutes:90,energy:'low',mood:'food',effort:'prepare',outdoor:false,next:'Restaurant mit vegetarischer Auswahl aussuchen und bei Bedarf reservieren.'},
  {id:'bike',title:'Eine kleine Radtour',minutes:90,energy:'medium',mood:'movement',effort:'spontaneous',outdoor:true,next:'Eine einfache Strecke aussuchen, Wetter prüfen und den Zeitpunkt abstimmen.'},
  {id:'film',title:'Filmabend zu Hause',minutes:120,energy:'low',mood:'culture',effort:'spontaneous',outdoor:false,next:'Einen Titel aus „Filme & Serien“ auswählen und einen gemeinsamen Abend abstimmen.'},
  {id:'shortwalk',title:'Eine kleine Runde vor der Tür',minutes:15,energy:'low',mood:'outdoor',effort:'spontaneous',outdoor:true,next:'Eva eine gemeinsame Viertelstunde an der frischen Luft vorschlagen.'},
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
    && s.checks.every(validDate)
    && s.appointments.every(a => strings(a, ['id','title','date','start','end','owner']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && typeof a.uncertain === 'boolean' && typeof a.repeat === 'boolean')
    && s.slots.every(a => strings(a, ['id','date','start','end','energy','mood','effort']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && ['low','medium','high'].includes(a.energy) && ['unknown','outdoor','movement','food','culture'].includes(a.mood) && ['spontaneous','prepare','trip'].includes(a.effort))
    && s.entries.every(a => strings(a, ['id','title','url','date','start','end','slotId','status','createdAt','proposedAt','organizedAt','doneAt','note','next']) && statuses.includes(a.status) && (!a.date || validDate(a.date)) && (!a.start || validTime(a.start)) && (!a.end || validTime(a.end)) && ['createdAt','proposedAt','organizedAt','doneAt'].every(k => !(a as unknown as Record<string,string>)[k] || !isNaN(Date.parse((a as unknown as Record<string,string>)[k]))));
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
  const isEditing = () => host?.contains(document.activeElement) && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName || '');
  const actionDate = (stamp: string) => stamp ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(stamp)) : '';
  let week = day(today()).getUTCDay() === 0 ? addDays(monday(today()),7) : monday(today());
  let selectedSlot = '';
  let activeDate = today();
  let openEditor = '';
  let openSection = '';
  let editingRoutine = '';
  const energyOptions: [string,string][] = [['low','Wenig'],['medium','Mittel'],['high','Viel']];
  const moodOptions: [string,string][] = [['outdoor','Draußen'],['movement','Bewegung'],['food','Genuss'],['culture','Kultur']];
  const effortOptions: [string,string][] = [['spontaneous','Spontan'],['prepare','Etwas vorbereiten'],['trip','Kleiner Ausflug']];
  let rain: Record<string, number> = {};
  let backup: State | null = null;
  const mutate = async (fn: () => void, feedback = 'Gespeichert. Auf allen Geräten verfügbar.') => {
    if (!loaded || saving) { message = saving ? 'Speicherung läuft. Bitte kurz warten.' : 'Die gemeinsame Planung muss zuerst geladen werden.'; return false; }
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
    const status = host?.querySelector<HTMLElement>('.planner-message'); if (status) status.textContent = message;
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
  const appointmentsFor = (date: string) => state.appointments.filter(a => a.date === date || (a.repeat && a.date <= date && day(a.date).getUTCDay() === day(date).getUTCDay()));
  const overlaps = (a: {start: string; end: string}, b: {start: string; end: string}) => a.start < b.end && b.start < a.end;
  const conflicts = (s: Slot) => appointmentsFor(s.date).filter(a => overlaps(a, s));
  const clash = (s: Slot) => conflicts(s).length > 0 || state.entries.some(a => a.slotId !== s.id && a.date === s.date && a.status !== 'Abgelehnt' && a.start && overlaps(a, s));
  const options = (values: [string, string][], chosen = '') => values.map(([value, text]) => `<option value="${e(value)}" ${value === chosen ? 'selected' : ''}>${e(text)}</option>`).join('');
  const button = (action: string, text: string, id = '') => `<button type="button" data-action="${action}" data-id="${e(id)}">${text}</button>`;
  function ideas(s: Slot): Idea[] {
    const wet = (rain[s.date] ?? 0) >= 50;
    const pool: Idea[] = [];
    const minutes = Number(s.end.slice(0,2))*60 + Number(s.end.slice(3)) - Number(s.start.slice(0,2))*60 - Number(s.start.slice(3));
    const ranks: Record<string,number> = {low:0,medium:1,high:2};
    const effortRanks: Record<string,number> = {spontaneous:0,prepare:1,trip:2};
    const routines = (state.routines ?? []).filter(r => r.minutes <= minutes && ranks[r.energy] <= ranks[s.energy] && effortRanks[r.effort] <= effortRanks[s.effort] && !(wet && r.outdoor));
    routines.sort((a,b) => (s.mood === b.mood ? 20 : 0) - (s.mood === a.mood ? 20 : 0) || ranks[a.energy] - ranks[b.energy] || b.minutes - a.minutes);
    routines.forEach(r => pool.push({title:r.title,next:r.next,outdoor:r.outdoor,url:'',minutes:r.minutes}));
    // Dated events are only offered on their exact date. Unknown durations require a check.
    if (s.effort !== 'spontaneous' && s.energy !== 'low') {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.filterable[data-date]')).filter(card => card.dataset.date === s.date && !card.classList.contains('expired'));
      cards.forEach(card => {
        const title = card.querySelector('h3,h4')?.textContent?.trim();
        const outdoor = card.dataset.category === 'outdoor';
        if (!title || (outdoor && wet) || (card.classList.contains('tour-card') && minutes < 360)) return;
        if (s.mood === 'food' && card.dataset.category !== 'essen') return;
        if (s.mood === 'culture' && !['kultur','musik'].includes(card.dataset.category || '')) return;
        pool.unshift({title, url: card.querySelector<HTMLAnchorElement>('a.info-link')?.href || '', outdoor, next:'Uhrzeit, Dauer, Anfahrt und Verfügbarkeit in der Originalquelle prüfen; anschließend Eva konkret vorschlagen.'});
      });
    }
    return pool.filter((a, i) => pool.findIndex(b => b.title === a.title) === i && !(wet && a.outdoor) && (a.minutes ?? 0) <= minutes).slice(0,3);
  }
  function addEntry(title: string, url = '', status = 'Idee gespeichert', slot?: Slot, next = 'Eva einen konkreten Zeitpunkt vorschlagen.') {
    const now = new Date().toISOString();
    openSection='';
    mutate(() => { state.entries.unshift({id:crypto.randomUUID(), title, url:safeUrl(url), date:slot?.date || '', start:slot?.start || '', end:slot?.end || '', slotId:slot?.id || '', status, createdAt:now, proposedAt:status === 'Vorgeschlagen' ? now : '', organizedAt:'', doneAt:'', note:'', next}); }, status === 'Vorgeschlagen' ? 'Als tatsächlich vorgeschlagen protokolliert.' : 'Idee gespeichert. Nächster Schritt: konkret abstimmen.');
  }
  function weekMarkup() {
    const names=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
    return `<section class="week-board" aria-label="Wochenplan Montag bis Sonntag"><div class="week-board-heading"><h2>Deine Woche auf einen Blick</h2><div class="week-legend"><span class="legend-fixed">Fester Termin</span><span class="legend-free">Freies Zeitfenster</span><span class="legend-plan">Vorhaben</span></div></div><div class="week-days">${names.map((name,i)=>{
      const date=addDays(week,i);const entries=state.entries.filter(x=>x.date===date&&x.status!=='Abgelehnt').sort((a,b)=>a.start.localeCompare(b.start));const slots=state.slots.filter(x=>x.date===date);const events=appointmentsFor(date);
      return `<article class="week-day ${date===today()?'is-today':''} ${date===activeDate?'is-selected':''}"><header><span>${name}</span><strong>${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(day(date))}</strong>${date===today()?'<small>Heute</small>':''}</header><div class="week-day-items">${events.map(a=>`<div class="week-event ${a.uncertain?'is-uncertain':''}"><time>${a.start}–${a.end}</time><strong>${e(a.title)}</strong><span>${e(a.owner)}${a.uncertain?' · unklar':''}</span></div>`).join('')}${entries.map(a=>`<button type="button" class="week-plan" data-action="openEntry" data-id="${e(a.id)}"><time>${a.start?`${a.start}${a.end?'–'+a.end:''}`:'Zeit noch offen'}</time><strong>${e(a.title)}</strong><span>${e(a.status)}</span></button>`).join('')}${slots.filter(a=>!entries.some(x=>x.slotId===a.id)).map(a=>`<button type="button" class="week-free ${clash(a)?'has-conflict':''}" data-action="selectSlot" data-id="${a.id}"><time>${a.start}–${a.end}</time><strong>${clash(a)?'Bitte erst klären':'Zeit für eine Idee'}</strong></button>`).join('')}${!events.length&&!entries.length&&!slots.length?'<p class="week-day-empty">Noch nichts eingetragen</p>':''}</div><button type="button" class="week-add" data-action="selectDay" data-id="${date}">Zeitfenster planen</button></article>`;
    }).join('')}</div></section>`;
  }
  function routinesMarkup() {
    const routines=state.routines??[];const r=routines.find(x=>x.id===editingRoutine);
    return `<section class="planner-box routines-box"><details id="routineSection" ${openSection==='routines'?'open':''}><summary><span>Unsere Standardaktivitäten</span><span class="planner-entry-meta">${routines.length} einfache Ideen für jeden Wochentag</span></summary><p>Hier ergänzt und bearbeitest du eure vertrauten Aktivitäten. Dauer bitte inklusive Vorbereitung und Anfahrt eintragen.</p><div class="routine-grid">${routines.map(x=>`<article class="routine-card"><div><span class="routine-category">${e(moodOptions.find(o=>o[0]===x.mood)?.[1]||'Aktivität')}</span><h3>${e(x.title)}</h3><p>${x.minutes} Min. · ${e(energyOptions.find(o=>o[0]===x.energy)?.[1]||'')} Energie${x.outdoor?' · draußen':''}</p></div><div class="routine-actions">${button('routinePlan','Einplanen',x.id)}${button('editRoutine','Bearbeiten',x.id)}${button('deleteRoutine','Entfernen',x.id)}</div></article>`).join('')||'<p>Ergänze deine erste Standardaktivität.</p>'}</div><h3>${r?'Standardaktivität bearbeiten':'Eine Standardaktivität ergänzen'}</h3><form id="routineForm" class="planner-form"><label>Aktivität<input name="title" required maxlength="200" value="${e(r?.title||'')}" placeholder="Zum Beispiel: Am Lech spazieren"></label><label>Dauer in Minuten<input name="minutes" type="number" min="5" max="1440" required value="${r?.minutes||45}"></label><label>Energie<select name="energy">${options(energyOptions,r?.energy||'low')}</select></label><label>Kategorie<select name="mood">${options(moodOptions,r?.mood||'outdoor')}</select></label><label>Aufwand<select name="effort">${options(effortOptions,r?.effort||'spontaneous')}</select></label><label class="planner-check"><input name="outdoor" type="checkbox" ${r?.outdoor?'checked':''}>Draußen</label><label class="routine-next">Vorbereitung / nächster Schritt<input name="next" maxlength="500" value="${e(r?.next||'')}" placeholder="Was musst du vorher klären?"></label><button>${r?'Änderungen speichern':'Aktivität ergänzen'}</button>${r?button('cancelRoutine','Abbrechen'):''}</form></details></section>`;
  }
  function render() {
    if (!host) return;
    const slots = state.slots.filter(s => inWeek(s.date)).sort((a,b) => (a.date+a.start).localeCompare(b.date+b.start));
    if (!slots.some(s => s.id === selectedSlot)) selectedSlot = slots.find(s=>s.date===activeDate)?.id || '';
    if (!inWeek(activeDate)) activeDate = inWeek(today()) ? today() : week;
    const chosen = slots.find(s => s.id === selectedSlot);
    const proposals = state.entries.filter(a => a.proposedAt && inWeek(actionDate(a.proposedAt))).length;
    const organized = state.entries.filter(a => a.organizedAt && inWeek(actionDate(a.organizedAt))).length;
    const done = state.entries.filter(a => a.doneAt && inWeek(actionDate(a.doneAt))).length;
    const pending = state.entries.filter(a => inWeek(a.date) && !['Abgelehnt','Gemacht'].includes(a.status));
    const appointments = state.appointments.filter(a => a.repeat ? a.date < addDays(week,7) : inWeek(a.date));
    host.innerHTML = `<div class="planner-heading"><div><p class="section-kicker">Deine persönliche Planung</p><h1>Meine Woche</h1><p>Kleine Ideen für den Alltag, schöne Pläne für freie Tage.</p></div><div class="planner-week-nav">${button('prev','Vorige Woche')}${button('current','Diese Woche')}${button('next','Nächste Woche')}</div></div>
      <h2>${label(week)} – ${label(addDays(week,6))}</h2>
      <p class="planner-message" role="status">${e(message)}</p><p class="planner-small">Gemeinsamer Stand für alle Geräte · ohne Login. ${button('refresh','Jetzt aktualisieren')}</p>
      ${weekMarkup()}
      <div class="planner-next"><strong>Dein nächster Schritt</strong><p>${!state.checks.includes(week) ? 'Nimm dir fünf Minuten: feste Termine klären und ein bis zwei freie Zeitfenster markieren.' : slots.length === 0 ? 'Trage ein freies Zeitfenster ein. Unbekannte Termine bitte zuerst klären.' : pending.length ? e(pending[0].next) : 'Wähle einen passenden Vorschlag für eines deiner Zeitfenster.'}</p>${button('calendar','Planungserinnerungen für den Kalender')}</div>
      ${routinesMarkup()}
      <div class="planner-steps"><section class="planner-box"><details class="planner-setup" ${openSection === 'setup' || !state.appointments.length && !slots.length ? 'open' : ''}><summary>Termine &amp; freie Zeitfenster</summary><p>Yoga, Töpfern und Verabredungen eintragen. „Unklar“ heißt: erst nachfragen.</p>
      <form id="appointmentForm" class="planner-form"><label>Termin<input name="title" required maxlength="120" placeholder="Zum Beispiel: Yoga"></label><label>Person<select name="owner">${options([['Daniel','Ich'],['Eva','Eva'],['Beide','Beide']])}</select></label><label>Datum<input name="date" type="date" required value="${activeDate}"></label><label>Von<input name="start" type="time" required value="18:00"></label><label>Bis<input name="end" type="time" required value="19:30"></label><label class="planner-check"><input name="repeat" type="checkbox">Wöchentlich</label><label class="planner-check"><input name="uncertain" type="checkbox">Noch unklar</label><button>Termin hinzufügen</button></form>
      <ul class="planner-list">${appointments.map(a => `<li><span><strong>${e(a.title)}</strong> · ${e(a.owner)}<br>${label(a.date)} · ${a.start}–${a.end}${a.repeat ? ' · wöchentlich ab diesem Datum' : ''}${a.uncertain ? ' · noch unklar' : ''}</span>${button('deleteAppointment','Entfernen',a.id)}</li>`).join('') || '<li>Keine Termine eingetragen. Bitte gemeinsam klären, wann Zeit ist.</li>'}</ul>
      <form id="slotForm" class="planner-form"><label>Freies Zeitfenster<input name="date" type="date" required value="${activeDate}"></label><label>Von<input name="start" type="time" required value="18:30"></label><label>Bis<input name="end" type="time" required value="20:00"></label><button>Zeitfenster hinzufügen</button></form>
      <p class="planner-small">Zeitfenster markierst du selbst nach der Abstimmung. Leere Kalendertage werden nicht als freie Zeit angenommen.</p>
      ${button('checked', state.checks.includes(week) ? 'Wochencheck erledigt ✓' : 'Wochencheck abschließen')}
      </details></section><section class="planner-box" id="guidedIdeas"><h2>Was passt in dein Zeitfenster?</h2>${slots.length ? `<label>Zeitfenster<select id="slotChoice">${options([['','Zeitfenster auswählen'],...slots.map(s => [s.id,`${label(s.date)} · ${s.start}–${s.end}`] as [string,string])],selectedSlot)}</select></label>` : '<p>Markiere zuerst ein freies Zeitfenster.</p>'}
      ${chosen ? `<div class="planner-slot"><p>${label(chosen.date)} · ${chosen.start}–${chosen.end} ${button('deleteSlot','Zeitfenster entfernen',chosen.id)}</p>${clash(chosen) ? '<p class="planner-warning">Dieses Zeitfenster überschneidet sich mit einem Termin oder Vorhaben. Bitte erst klären oder ein anderes wählen.</p>' : ''}${rain[chosen.date] !== undefined ? `<p>Regenwahrscheinlichkeit: ${rain[chosen.date]} % · Tagesprognose Open-Meteo</p>` : '<p class="planner-small">Keine Wetterprognose verfügbar. Vor einer Aktivität draußen bitte Wetter prüfen.</p>'}
      <div class="planner-form"><label>Energie<select data-slot-field="energy">${options([['low','Wenig'],['medium','Mittel'],['high','Viel']],chosen.energy)}</select></label><label>Was wäre angenehm?<select data-slot-field="mood">${options([['unknown','Weiß nicht'],['outdoor','Draußen'],['movement','Bewegung'],['food','Genuss'],['culture','Kultur']],chosen.mood)}</select></label><label>Aufwand<select data-slot-field="effort">${options([['spontaneous','Spontan'],['prepare','Etwas vorbereiten'],['trip','Kleiner Ausflug']],chosen.effort)}</select></label></div>
      <p class="planner-small">${state.entries.some(a => a.slotId === chosen.id && a.status !== 'Abgelehnt') ? 'Für dieses Zeitfenster hast du bereits ein Vorhaben. Bearbeite es unten oder entferne es, bevor du ein anderes auswählst.' : ''}</p><p class="planner-small">Wenn nichts Konkretes dagegenspricht, nimm den ersten passenden Vorschlag. Neue Ideen sind nicht jede Woche nötig.</p>
      ${clash(chosen) || chosen.date < today() ? (chosen.date < today() ? '<p>Dieses Zeitfenster liegt in der Vergangenheit. Wähle eines ab heute.</p>' : '') : ideas(chosen).map((a,i) => `<article class="planner-idea"><span class="section-kicker">${i === 0 ? 'Mein Vorschlag für dich' : 'Alternative'}</span><h3>${e(a.title)}</h3><p>${e(a.next)}</p>${safeUrl(a.url) ? `<a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Originalquelle prüfen</a>` : ''}${a.minutes ? `<p class="planner-small">Zeit einplanen: etwa ${a.minutes} Minuten.</p>` : ''}${button('chooseIdea',state.entries.some(x => x.slotId === chosen.id && x.status !== 'Abgelehnt') ? 'Zeitfenster bereits geplant' : 'Das bereite ich vor',String(i))}</article>`).join('') || '<p>Keine Standardaktivität passt zu diesen Angaben. Ändere die Auswahl oder ergänze deine Liste.</p>'}</div>` : ''}</section></div>
      <section class="planner-box"><h2>3. Vorschlagen und umsetzen</h2><p>Eine gespeicherte Idee zählt erst dann als vorgeschlagen, wenn du sie tatsächlich angesprochen oder geschrieben hast.</p><div class="planner-stats"><span><strong>${proposals}</strong> vorgeschlagen</span><span><strong>${organized}</strong> organisiert</span><span><strong>${done}</strong> gemacht</span></div><p class="planner-small">Gezählt nach dem Datum der jeweiligen Handlung in dieser Woche.</p>
      <form id="entryForm" class="planner-form"><label>Eigener Vorschlag<input name="title" required maxlength="200" placeholder="Zum Beispiel: Dienstag schwimmen"></label><label>Datum der Aktivität<input name="date" type="date" value="${activeDate}"></label><label>Eintragen als<select name="status">${options([['Idee gespeichert','Idee gespeichert'],['Vorgeschlagen','Gerade tatsächlich vorgeschlagen']])}</select></label><button>Eintragen</button></form>
      <h3>Vorhaben dieser Woche</h3>${state.entries.filter(a => inWeek(a.date) || !a.date && inWeek(actionDate(a.createdAt))).map(entryMarkup).join('') || '<p>Noch kein Vorhaben eingetragen.</p>'}
      <details class="planner-history"><summary>Mein Vorschlagsprotokoll · ${state.entries.length} Einträge</summary><p>Deine Gedächtnisstütze: Ideen, tatsächliche Vorschläge und Rückmeldungen.</p>${state.entries.map(entryMarkup).join('') || '<p>Noch keine Einträge.</p>'}</details></section>
      <details class="planner-storage"><summary>Speicherung und Sicherung</summary><p>Termine, Zeitfenster und Vorschlagsprotokoll werden gemeinsam online gespeichert. Alle Geräte sehen denselben Stand. Jeder mit Zugriff auf die App kann ihn lesen und bearbeiten. Eine Sicherung kannst du zusätzlich exportieren.</p>${button('export','Sicherung exportieren')}<label>Sicherung importieren<input id="plannerImport" type="file" accept="application/json,.json"></label>${backup ? `<p>Gültige Sicherung: ${backup.entries.length} Einträge, ${backup.appointments.length} Termine. Import ersetzt die gemeinsame Planung für alle Geräte.</p>${button('confirmImport','Diese Sicherung übernehmen')}${button('cancelImport','Abbrechen')}` : ''}</details>`;
    wire(); setBusy();
  }
  function entryMarkup(a: Entry) {
    const stamp = (s: string) => s ? new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}).format(new Date(s)) : 'Noch nicht';
    return `<article class="planner-entry" data-entry="${e(a.id)}"><details class="planner-entry-editor" ${openEditor === a.id ? 'open' : ''}><summary><span>${e(a.title)}</span><span class="planner-entry-meta">${label(a.date)}${a.start ? ` · ${a.start}–${a.end}` : ''} · ${e(a.status)}</span></summary><div class="planner-form"><label>Status<select data-entry-field="status">${options(statuses.map(s=>[s,s]),a.status)}</select></label><label>Aktivitätsdatum<input type="date" data-entry-field="date" value="${a.date}"></label><label>Von<input type="time" data-entry-field="start" value="${a.start}"></label><label>Bis<input type="time" data-entry-field="end" value="${a.end}"></label><label>Nächster Schritt<input data-entry-field="next" value="${e(a.next)}" maxlength="500"></label><label>Notiz / Rückmeldung<textarea data-entry-field="note" maxlength="2000" placeholder="Was wurde besprochen?">${e(a.note)}</textarea></label></div><p class="planner-small">Vorgeschlagen: ${stamp(a.proposedAt)} · Organisiert: ${stamp(a.organizedAt)} · Gemacht: ${stamp(a.doneAt)}</p><details><summary>Vorschlagsdatum nachtragen oder korrigieren</summary><label>Datum<input type="date" data-entry-field="proposedDate" max="${today()}" value="${actionDate(a.proposedAt)}"></label><p class="planner-small">Eine Erinnerung an einen früheren Vorschlag nachtragen. Leeres Datum entfernt die Markierung „vorgeschlagen“.</p></details><div class="planner-actions">${!a.proposedAt ? button('proposed','Gerade vorgeschlagen',a.id) : ''}${safeUrl(a.url) ? `<a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Quelle</a>` : ''}${a.date && a.start ? button('activityCalendar','In Kalender übernehmen',a.id) : ''}${button('deleteEntry','Eintrag entfernen',a.id)}</div></details></article>`;
  }
  function wire() {
    if (!host) return;
    host.querySelectorAll<HTMLDetailsElement>('.planner-entry-editor').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)openEditor=el.closest<HTMLElement>('[data-entry]')?.dataset.entry||'';}));
    host.querySelector<HTMLDetailsElement>('.planner-setup')?.addEventListener('toggle',ev=>{if((ev.target as HTMLDetailsElement).open)openSection='setup';});
    host.querySelector<HTMLDetailsElement>('#routineSection')?.addEventListener('toggle',ev=>{if((ev.target as HTMLDetailsElement).open)openSection='routines';});
    host.querySelector<HTMLFormElement>('#routineForm')?.addEventListener('submit',async ev=>{
      ev.preventDefault();const d=new FormData(ev.currentTarget as HTMLFormElement);
      const r:Routine={id:editingRoutine||crypto.randomUUID(),title:String(d.get('title')).trim(),minutes:Number(d.get('minutes')),energy:String(d.get('energy')),mood:String(d.get('mood')),effort:String(d.get('effort')),outdoor:d.has('outdoor'),next:String(d.get('next')).trim()||'Eva einen konkreten Zeitpunkt vorschlagen.'};
      if(!r.title)return;openSection='routines';
      if(await mutate(()=>{const routines=state.routines??[];const i=routines.findIndex(x=>x.id===r.id);if(i<0)routines.push(r);else routines[i]=r;state.routines=routines;},'Standardaktivität gespeichert. Auf allen Geräten verfügbar.'))editingRoutine='';render();
    });
    host.querySelector<HTMLFormElement>('#appointmentForm')?.addEventListener('submit',ev=>{
      ev.preventDefault(); const f = ev.currentTarget as HTMLFormElement; const d = new FormData(f); const start = String(d.get('start')), end = String(d.get('end'));
      if (end <= start) { message = 'Das Ende muss nach dem Beginn liegen.'; render(); return; }
      mutate(()=>state.appointments.push({id:crypto.randomUUID(),title:String(d.get('title')).trim(),date:String(d.get('date')),start,end,owner:String(d.get('owner')),repeat:d.has('repeat'),uncertain:d.has('uncertain')}));
    });
    host.querySelector<HTMLFormElement>('#slotForm')?.addEventListener('submit',ev=>{
      ev.preventDefault(); const d = new FormData(ev.currentTarget as HTMLFormElement); const start = String(d.get('start')), end = String(d.get('end'));
      if (end <= start) { message = 'Das Ende muss nach dem Beginn liegen.'; render(); return; }
      mutate(()=>{ const s = {id:crypto.randomUUID(),date:String(d.get('date')),start,end,energy:'medium',mood:'unknown',effort:'spontaneous'}; state.slots.push(s); selectedSlot=s.id; });
    });
    host.querySelector<HTMLFormElement>('#entryForm')?.addEventListener('submit',ev=>{
      ev.preventDefault(); const d = new FormData(ev.currentTarget as HTMLFormElement); const title=String(d.get('title')).trim(); if (!title) return;
      const now=new Date().toISOString(); mutate(()=>state.entries.unshift({id:crypto.randomUUID(),title,url:'',date:String(d.get('date')),start:'',end:'',slotId:'',status:String(d.get('status')),createdAt:now,proposedAt:d.get('status')==='Vorgeschlagen'?now:'',organizedAt:'',doneAt:'',note:'',next:d.get('status')==='Vorgeschlagen'?'Rückmeldung und Zeitpunkt mit Eva klären.':'Eva einen konkreten Zeitpunkt vorschlagen.'}));
    });
    host.querySelector<HTMLSelectElement>('#slotChoice')?.addEventListener('change',ev=>{selectedSlot=(ev.target as HTMLSelectElement).value;render();});
    host.querySelectorAll<HTMLSelectElement>('[data-slot-field]').forEach(el=>el.addEventListener('change',()=>mutate(()=>{const s=state.slots.find(x=>x.id===selectedSlot);if(s)(s as unknown as Record<string,string>)[el.dataset.slotField!]=el.value;})));
    host.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-entry-field]').forEach(el=>el.addEventListener('change',()=>mutate(()=>{
      const a=state.entries.find(x=>x.id===el.closest<HTMLElement>('[data-entry]')?.dataset.entry);if(!a)return;
      openEditor=a.id;const k=el.dataset.entryField!; const now=new Date().toISOString();
      if((k==='start'&&el.value&&a.end&&el.value>=a.end)||(k==='end'&&el.value&&a.start&&el.value<=a.start))throw Error();
      if(k==='proposedDate'){a.proposedAt=el.value?new Date(el.value+'T12:00:00Z').toISOString():'';return;}
      (a as unknown as Record<string,string>)[k]=el.value;
      if(k==='status'){
        if(el.value==='Vorgeschlagen'&&!a.proposedAt)a.proposedAt=now;
        if(el.value==='Organisiert'&&!a.organizedAt)a.organizedAt=now;
        if(el.value==='Gemacht'&&!a.doneAt)a.doneAt=now;
        a.next=el.value==='Vorgeschlagen'||el.value==='Offen'?'Rückmeldung und Zeitpunkt mit Eva klären.':el.value==='Zugesagt'?'Öffnungszeiten, Reservierung und Vorbereitung erledigen.':el.value==='Organisiert'?'Vor dem Termin letzte Details prüfen.':el.value==='Abgelehnt'?'Kurz festhalten, was nicht passte.':el.value==='Gemacht'?'Kurz notieren, wie es euch gefallen hat.':'Eva einen konkreten Zeitpunkt vorschlagen.';
      }
    })));
    host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',async ()=>{
      const action=b.dataset.action,id=b.dataset.id;
      if(action==='selectDay'){activeDate=id!;selectedSlot=state.slots.find(x=>x.date===activeDate)?.id||'';openSection='setup';render();host.querySelector('.planner-setup')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      if(action==='selectSlot'){selectedSlot=id!;activeDate=state.slots.find(x=>x.id===id)?.date||activeDate;render();host.querySelector('#guidedIdeas')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      if(action==='openEntry'){openEditor=id!;render();host.querySelector('[data-entry="'+CSS.escape(id!)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
      if(action==='editRoutine'){editingRoutine=id!;openSection='routines';render();return;}
      if(action==='routinePlan'){const routine=state.routines?.find(x=>x.id===id);const slot=state.slots.find(x=>x.id===selectedSlot);if(!routine)return;if(!slot||clash(slot)||slot.date<today()){message='Wähle zuerst ein freies Zeitfenster ohne Überschneidung.';openSection='setup';render();return;}const minutes=Number(slot.end.slice(0,2))*60+Number(slot.end.slice(3))-Number(slot.start.slice(0,2))*60-Number(slot.start.slice(3));if(routine.minutes>minutes){message='Für diese Aktivität ist dein Zeitfenster zu kurz.';render();return;}if(state.entries.some(x=>x.slotId===slot.id&&x.status!=='Abgelehnt')){message='Dieses Zeitfenster ist bereits geplant.';render();return;}addEntry(routine.title,'','Idee gespeichert',slot,routine.next);return;}
      if(action==='deleteRoutine'){if(!confirm('Diese Standardaktivität entfernen? Bereits geplante Vorhaben bleiben erhalten.'))return;await mutate(()=>{state.routines=state.routines?.filter(x=>x.id!==id);});return;}
      if(action==='cancelRoutine'){editingRoutine='';render();return;}
      if(action==='prev'||action==='next'||action==='current'){week=action==='current'?monday(today()):addDays(week,action==='prev'?-7:7);render();return;}
      if(action==='refresh'){await refreshCloud(true);return;}
      if(action==='export'){download(JSON.stringify(state,null,2),'freizeitplaner-sicherung-'+today()+'.json','application/json');return;}
      if(action==='calendar'){calendar();return;}
      if(action==='activityCalendar'){calendar(state.entries.find(x=>x.id===id));return;}
      if(action==='cancelImport'){backup=null;render();return;}
      if(action==='confirmImport'&&backup){const imported=backup;if(await mutate(()=>{state={...imported,routines:imported.routines ?? defaultRoutines()};},'Sicherung gemeinsam übernommen.'))backup=null;render();return;}
      if(action==='chooseIdea'){const s=state.slots.find(x=>x.id===selectedSlot);if(!s||clash(s)||s.date<today())return;const a=ideas(s)[Number(id)];if(!a||state.entries.some(x=>x.slotId===s.id&&x.status!=='Abgelehnt'))return;addEntry(a.title,a.url,'Idee gespeichert',s,a.next);return;}
      if(action==='deleteEntry'){const entry=state.entries.find(x=>x.id===id);if(!entry||!confirm(`„${entry.title}“ aus deinem persönlichen Protokoll entfernen?`))return;}
      mutate(()=>{
        if(action==='checked'&&!state.checks.includes(week))state.checks.push(week);
        if(action==='deleteAppointment')state.appointments=state.appointments.filter(a=>a.id!==id);
        if(action==='deleteSlot')state.slots=state.slots.filter(a=>a.id!==id);
        if(action==='deleteEntry')state.entries=state.entries.filter(a=>a.id!==id);
        if(action==='proposed'){const a=state.entries.find(x=>x.id===id);if(a){a.proposedAt=new Date().toISOString();a.status='Vorgeschlagen';a.next='Rückmeldung und Zeitpunkt mit Eva klären.';}}
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
  const enhance=()=>document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(b=>{
    if(!b.dataset.title||b.parentElement?.querySelector('[data-personal-action]'))return;
    const action=document.createElement('button');action.type='button';action.className='details-btn';action.dataset.personalAction='true';action.textContent='In meine Planung';
    action.addEventListener('click',()=>{addEntry(b.dataset.title!,b.dataset.url || '');document.querySelector<HTMLButtonElement>('[data-view="planning"]')?.click();});action.disabled=!loaded||saving;b.insertAdjacentElement('afterend',action);
  });
  new MutationObserver(enhance).observe(document.querySelector('#app')!,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCloud();});
  window.addEventListener('focus',()=>{void refreshCloud();});
  window.setInterval(()=>{if(!document.hidden)void refreshCloud();},15000);
  render();enhance();setBusy();
  void refreshCloud();
  const params=new URLSearchParams({latitude:'48.3705',longitude:'10.8978',daily:'precipitation_probability_max',timezone:'Europe/Berlin',forecast_days:'14'});
  fetch('https://api.open-meteo.com/v1/forecast?'+params).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(data.daily?.time)rain=Object.fromEntries(data.daily.time.map((d:string,i:number)=>[d,data.daily.precipitation_probability_max[i]]));if(!host.contains(document.activeElement))render();}).catch(()=>{});
}
