import './planner.css';

type Appointment = { id: string; title: string; date: string; start: string; end: string; owner: string; uncertain: boolean; repeat: boolean };
type Slot = { id: string; date: string; start: string; end: string; energy: string; mood: string; effort: string };
type Entry = { id: string; title: string; url: string; date: string; start: string; end: string; slotId: string; status: string; createdAt: string; proposedAt: string; organizedAt: string; doneAt: string; note: string; next: string };
type State = { version: 1; appointments: Appointment[]; slots: Slot[]; entries: Entry[]; checks: string[] };
type Idea = { title: string; url: string; next: string; outdoor: boolean };
const KEY = 'freizeitplaner.personal.v1';
const statuses = ['Idee gespeichert', 'Vorgeschlagen', 'Offen', 'Zugesagt', 'Abgelehnt', 'Organisiert', 'Gemacht'];
const e = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const day = (s: string) => new Date(s + 'T12:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = day(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const monday = (s: string) => addDays(s, -((day(s).getUTCDay() + 6) % 7));
const label = (s: string) => s ? new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(day(s)) : 'Ohne Termin';
const empty = (): State => ({ version: 1, appointments: [], slots: [], entries: [], checks: [] });
const safeUrl = (s: string) => /^https?:\/\//i.test(s) ? s : '';
const validDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(day(s).getTime()) && iso(day(s)) === s;
const validTime = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
function validState(v: unknown): v is State {
  if (!v || typeof v !== 'object') return false;
  const s = v as State;
  const strings = (x: unknown, keys: string[]) => !!x && typeof x === 'object' && keys.every(k => typeof (x as Record<string, unknown>)[k] === 'string');
  return s.version === 1 && Array.isArray(s.appointments) && Array.isArray(s.slots) && Array.isArray(s.entries) && Array.isArray(s.checks)
    && s.checks.every(validDate)
    && s.appointments.every(a => strings(a, ['id','title','date','start','end','owner']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && typeof a.uncertain === 'boolean' && typeof a.repeat === 'boolean')
    && s.slots.every(a => strings(a, ['id','date','start','end','energy','mood','effort']) && validDate(a.date) && validTime(a.start) && validTime(a.end) && a.end > a.start && ['low','medium','high'].includes(a.energy) && ['unknown','outdoor','movement','food','culture'].includes(a.mood) && ['spontaneous','prepare','trip'].includes(a.effort))
    && s.entries.every(a => strings(a, ['id','title','url','date','start','end','slotId','status','createdAt','proposedAt','organizedAt','doneAt','note','next']) && statuses.includes(a.status) && (!a.date || validDate(a.date)) && (!a.start || validTime(a.start)) && (!a.end || validTime(a.end)) && ['createdAt','proposedAt','organizedAt','doneAt'].every(k => !(a as unknown as Record<string,string>)[k] || !isNaN(Date.parse((a as unknown as Record<string,string>)[k]))));
}

export function initPlanner() {
  const host = document.querySelector<HTMLElement>('#personalPlanner');
  if (!host) return;
  let state = empty();
  let damaged = false;
  let message = '';
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (!validState(parsed)) throw Error(); state = parsed; } }
  catch { damaged = true; message = 'Gespeicherte Daten konnten nicht gelesen werden. Bitte eine Sicherung importieren; vorhandene Daten werden nicht überschrieben.'; }
  const actionDate = (stamp: string) => stamp ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(stamp)) : '';
  let week = day(today()).getUTCDay() === 0 ? addDays(monday(today()),7) : monday(today());
  let selectedSlot = '';
  let rain: Record<string, number> = {};
  let backup: State | null = null;
  const mutate = (fn: () => void, feedback = 'Gespeichert auf diesem Gerät.') => {
    if (damaged) { message = 'Bitte zuerst eine gültige Sicherung importieren.'; render(); return; }
    const previous = JSON.stringify(state);
    try { fn(); localStorage.setItem(KEY, JSON.stringify(state)); message = feedback; }
    catch { state = JSON.parse(previous); message = 'Speichern fehlgeschlagen. Bitte eine Sicherung exportieren und den Browserspeicher prüfen.'; }
    render();
  };
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
    const routine = (title: string, next: string, outdoor = false) => pool.push({title, next, outdoor, url:''});
    if (s.mood === 'culture') routine('Ein gemeinsamer Filmabend', 'Einen Titel aus „Filme & Serien“ auswählen und den Zeitpunkt abstimmen.');
    if (s.mood === 'food') routine('Gemeinsam essen gehen', 'Ein Restaurant aus der App auswählen, vegetarische Optionen und Öffnungszeiten prüfen.');
    if (s.mood === 'movement' && s.energy !== 'low') routine('Gemeinsam schwimmen gehen', 'Öffnungszeiten und freien Badebetrieb prüfen, dann Eva den Zeitpunkt vorschlagen.');
    if (s.mood === 'outdoor' && !wet) routine('Eine Runde zum Garten', 'Eva den Zeitpunkt vorschlagen und klären, ob ihr dort bleiben oder nur eine Runde gehen möchtet.', true);
    if (!wet) routine('Ein kurzer Spaziergang durch die Stadt', 'Eva eine Runde von 30–45 Minuten zu Beginn dieses Zeitfensters vorschlagen.', true);
    if (wet || s.energy === 'low') routine('Ein gemeinsamer Filmabend', 'Einen Titel aus „Filme & Serien“ auswählen und den Zeitpunkt abstimmen.');
    const minutes = Number(s.end.slice(0,2))*60 + Number(s.end.slice(3)) - Number(s.start.slice(0,2))*60 - Number(s.start.slice(3));
    if (s.energy !== 'low' && minutes >= 90) routine('Gemeinsam schwimmen gehen', 'Öffnungszeiten und freien Badebetrieb prüfen, dann Eva den Zeitpunkt vorschlagen.');
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
    routine('In Ruhe einen Kaffee trinken gehen', 'Ein Café auswählen, Öffnungszeiten prüfen und Eva den Zeitpunkt vorschlagen.');
    routine('Eine Runde zum Garten', 'Wetter prüfen und Eva den Zeitpunkt vorschlagen.', true);
    return pool.filter((a, i) => pool.findIndex(b => b.title === a.title) === i && !(wet && a.outdoor)).slice(0,3);
  }
  function addEntry(title: string, url = '', status = 'Idee gespeichert', slot?: Slot, next = 'Eva einen konkreten Zeitpunkt vorschlagen.') {
    const now = new Date().toISOString();
    mutate(() => { state.entries.unshift({id:crypto.randomUUID(), title, url:safeUrl(url), date:slot?.date || '', start:slot?.start || '', end:slot?.end || '', slotId:slot?.id || '', status, createdAt:now, proposedAt:status === 'Vorgeschlagen' ? now : '', organizedAt:'', doneAt:'', note:'', next}); }, status === 'Vorgeschlagen' ? 'Als tatsächlich vorgeschlagen protokolliert.' : 'Idee gespeichert. Nächster Schritt: konkret abstimmen.');
  }
  function render() {
    if (!host) return;
    const slots = state.slots.filter(s => inWeek(s.date)).sort((a,b) => (a.date+a.start).localeCompare(b.date+b.start));
    if (!slots.some(s => s.id === selectedSlot)) selectedSlot = slots[0]?.id || '';
    const chosen = slots.find(s => s.id === selectedSlot);
    const proposals = state.entries.filter(a => a.proposedAt && inWeek(actionDate(a.proposedAt))).length;
    const organized = state.entries.filter(a => a.organizedAt && inWeek(actionDate(a.organizedAt))).length;
    const done = state.entries.filter(a => a.doneAt && inWeek(actionDate(a.doneAt))).length;
    const pending = state.entries.filter(a => inWeek(a.date) && !['Abgelehnt','Gemacht'].includes(a.status));
    const appointments = state.appointments.filter(a => a.repeat ? a.date < addDays(week,7) : inWeek(a.date));
    host.innerHTML = `<div class="planner-heading"><div><p class="section-kicker">Deine persönliche Planung</p><h1>Meine Woche</h1><p>Ein bis zwei Vorhaben reichen. Erst Zeit finden, dann einen passenden Vorschlag machen.</p></div><div class="planner-week-nav">${button('prev','Vorige Woche')}${button('current','Diese Woche')}${button('next','Nächste Woche')}</div></div>
      <h2>${label(week)} – ${label(addDays(week,6))}</h2>
      <p class="planner-message" role="status">${e(message)}</p>
      <div class="planner-next"><strong>Dein nächster Schritt</strong><p>${!state.checks.includes(week) ? 'Nimm dir fünf Minuten: feste Termine klären und ein bis zwei freie Zeitfenster markieren.' : slots.length === 0 ? 'Trage ein freies Zeitfenster ein. Unbekannte Termine bitte zuerst klären.' : pending.length ? e(pending[0].next) : 'Wähle einen passenden Vorschlag für eines deiner Zeitfenster.'}</p>${button('calendar','Planungserinnerungen für den Kalender')}</div>
      <div class="planner-steps"><section class="planner-box"><h2>1. Wann ist Raum?</h2><p>Yoga, Töpfern und Verabredungen eintragen. „Unklar“ heißt: erst nachfragen.</p>
      <form id="appointmentForm" class="planner-form"><label>Termin<input name="title" required maxlength="120" placeholder="Zum Beispiel: Yoga"></label><label>Person<select name="owner">${options([['Daniel','Ich'],['Eva','Eva'],['Beide','Beide']])}</select></label><label>Datum<input name="date" type="date" required value="${inWeek(today()) ? today() : week}"></label><label>Von<input name="start" type="time" required value="18:00"></label><label>Bis<input name="end" type="time" required value="19:30"></label><label class="planner-check"><input name="repeat" type="checkbox">Wöchentlich</label><label class="planner-check"><input name="uncertain" type="checkbox">Noch unklar</label><button>Termin hinzufügen</button></form>
      <ul class="planner-list">${appointments.map(a => `<li><span><strong>${e(a.title)}</strong> · ${e(a.owner)}<br>${label(a.date)} · ${a.start}–${a.end}${a.repeat ? ' · wöchentlich ab diesem Datum' : ''}${a.uncertain ? ' · noch unklar' : ''}</span>${button('deleteAppointment','Entfernen',a.id)}</li>`).join('') || '<li>Keine Termine eingetragen. Bitte gemeinsam klären, wann Zeit ist.</li>'}</ul>
      <form id="slotForm" class="planner-form"><label>Freies Zeitfenster<input name="date" type="date" required value="${inWeek(today()) ? today() : week}"></label><label>Von<input name="start" type="time" required value="18:30"></label><label>Bis<input name="end" type="time" required value="20:00"></label><button>Zeitfenster hinzufügen</button></form>
      <p class="planner-small">Zeitfenster markierst du selbst nach der Abstimmung. Leere Kalendertage werden nicht als freie Zeit angenommen.</p>
      ${button('checked', state.checks.includes(week) ? 'Wochencheck erledigt ✓' : 'Wochencheck abschließen')}
      </section><section class="planner-box"><h2>2. Was passt gerade?</h2>${slots.length ? `<label>Zeitfenster<select id="slotChoice">${options(slots.map(s => [s.id,`${label(s.date)} · ${s.start}–${s.end}`]),selectedSlot)}</select></label>` : '<p>Markiere zuerst ein freies Zeitfenster.</p>'}
      ${chosen ? `<div class="planner-slot"><p>${label(chosen.date)} · ${chosen.start}–${chosen.end} ${button('deleteSlot','Zeitfenster entfernen',chosen.id)}</p>${clash(chosen) ? '<p class="planner-warning">Dieses Zeitfenster überschneidet sich mit einem Termin oder Vorhaben. Bitte erst klären oder ein anderes wählen.</p>' : ''}${rain[chosen.date] !== undefined ? `<p>Regenwahrscheinlichkeit: ${rain[chosen.date]} % · Tagesprognose Open-Meteo</p>` : '<p class="planner-small">Keine Wetterprognose verfügbar. Vor einer Aktivität draußen bitte Wetter prüfen.</p>'}
      <div class="planner-form"><label>Energie<select data-slot-field="energy">${options([['low','Wenig'],['medium','Mittel'],['high','Viel']],chosen.energy)}</select></label><label>Was wäre angenehm?<select data-slot-field="mood">${options([['unknown','Weiß nicht'],['outdoor','Draußen'],['movement','Bewegung'],['food','Genuss'],['culture','Kultur']],chosen.mood)}</select></label><label>Aufwand<select data-slot-field="effort">${options([['spontaneous','Spontan'],['prepare','Etwas vorbereiten'],['trip','Kleiner Ausflug']],chosen.effort)}</select></label></div>
      <p class="planner-small">${state.entries.some(a => a.slotId === chosen.id && a.status !== 'Abgelehnt') ? 'Für dieses Zeitfenster hast du bereits ein Vorhaben. Bearbeite es unten oder entferne es, bevor du ein anderes auswählst.' : ''}</p><p class="planner-small">Wenn nichts Konkretes dagegenspricht, nimm den ersten passenden Vorschlag. Neue Ideen sind nicht jede Woche nötig.</p>
      ${clash(chosen) || chosen.date < today() ? (chosen.date < today() ? '<p>Dieses Zeitfenster liegt in der Vergangenheit. Wähle eines ab heute.</p>' : '') : ideas(chosen).map((a,i) => `<article class="planner-idea"><span class="section-kicker">${i === 0 ? 'Mein Vorschlag für dich' : 'Alternative'}</span><h3>${e(a.title)}</h3><p>${e(a.next)}</p>${safeUrl(a.url) ? `<a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Originalquelle prüfen</a>` : ''}${button('chooseIdea',state.entries.some(x => x.slotId === chosen.id && x.status !== 'Abgelehnt') ? 'Zeitfenster bereits geplant' : 'Das bereite ich vor',String(i))}</article>`).join('')}</div>` : ''}</section></div>
      <section class="planner-box"><h2>3. Vorschlagen und umsetzen</h2><p>Eine gespeicherte Idee zählt erst dann als vorgeschlagen, wenn du sie tatsächlich angesprochen oder geschrieben hast.</p><div class="planner-stats"><span><strong>${proposals}</strong> vorgeschlagen</span><span><strong>${organized}</strong> organisiert</span><span><strong>${done}</strong> gemacht</span></div><p class="planner-small">Gezählt nach dem Datum der jeweiligen Handlung in dieser Woche.</p>
      <form id="entryForm" class="planner-form"><label>Eigener Vorschlag<input name="title" required maxlength="200" placeholder="Zum Beispiel: Samstag schwimmen"></label><label>Datum der Aktivität<input name="date" type="date"></label><label>Eintragen als<select name="status">${options([['Idee gespeichert','Idee gespeichert'],['Vorgeschlagen','Gerade tatsächlich vorgeschlagen']])}</select></label><button>Eintragen</button></form>
      <h3>Vorhaben dieser Woche</h3>${state.entries.filter(a => inWeek(a.date) || !a.date && inWeek(actionDate(a.createdAt))).map(entryMarkup).join('') || '<p>Noch kein Vorhaben eingetragen.</p>'}
      <details class="planner-history"><summary>Mein Vorschlagsprotokoll · ${state.entries.length} Einträge</summary><p>Deine Gedächtnisstütze: Ideen, tatsächliche Vorschläge und Rückmeldungen.</p>${state.entries.map(entryMarkup).join('') || '<p>Noch keine Einträge.</p>'}</details></section>
      <details class="planner-storage"><summary>Speicherung und Sicherung</summary><p>Termine und Protokoll bleiben in diesem Browser auf diesem Gerät. Keine automatische Synchronisierung. Beim Löschen der Browserdaten gehen sie verloren. Exportiere regelmäßig eine Sicherung.</p>${button('export','Sicherung exportieren')}<label>Sicherung importieren<input id="plannerImport" type="file" accept="application/json,.json"></label>${backup ? `<p>Gültige Sicherung: ${backup.entries.length} Einträge, ${backup.appointments.length} Termine. Import ersetzt die persönlichen Planungsdaten auf diesem Gerät.</p>${button('confirmImport','Diese Sicherung übernehmen')}${button('cancelImport','Abbrechen')}` : ''}</details>`;
    wire();
  }
  function entryMarkup(a: Entry) {
    const stamp = (s: string) => s ? new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}).format(new Date(s)) : 'Noch nicht';
    return `<article class="planner-entry" data-entry="${e(a.id)}"><div><h3>${e(a.title)}</h3><p>${label(a.date)}${a.start ? ` · ${a.start}–${a.end}` : ''}</p></div><div class="planner-form"><label>Status<select data-entry-field="status">${options(statuses.map(s=>[s,s]),a.status)}</select></label><label>Aktivitätsdatum<input type="date" data-entry-field="date" value="${a.date}"></label><label>Nächster Schritt<input data-entry-field="next" value="${e(a.next)}" maxlength="500"></label><label>Notiz / Rückmeldung<textarea data-entry-field="note" maxlength="2000" placeholder="Was wurde besprochen?">${e(a.note)}</textarea></label></div><p class="planner-small">Vorgeschlagen: ${stamp(a.proposedAt)} · Organisiert: ${stamp(a.organizedAt)} · Gemacht: ${stamp(a.doneAt)}</p><details><summary>Vorschlagsdatum nachtragen oder korrigieren</summary><label>Datum<input type="date" data-entry-field="proposedDate" max="${today()}" value="${actionDate(a.proposedAt)}"></label><p class="planner-small">Eine Erinnerung an einen früheren Vorschlag nachtragen. Leeres Datum entfernt die Markierung „vorgeschlagen“.</p></details><div class="planner-actions">${!a.proposedAt ? button('proposed','Gerade vorgeschlagen',a.id) : ''}${safeUrl(a.url) ? `<a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">Quelle</a>` : ''}${a.date && a.start ? button('activityCalendar','In Kalender übernehmen',a.id) : ''}${button('deleteEntry','Eintrag entfernen',a.id)}</div></article>`;
  }
  function wire() {
    if (!host) return;
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
      const k=el.dataset.entryField!; const now=new Date().toISOString();
      if(k==='proposedDate'){a.proposedAt=el.value?new Date(el.value+'T12:00:00Z').toISOString():'';return;}
      (a as unknown as Record<string,string>)[k]=el.value;
      if(k==='status'){
        if(el.value==='Vorgeschlagen'&&!a.proposedAt)a.proposedAt=now;
        if(el.value==='Organisiert'&&!a.organizedAt)a.organizedAt=now;
        if(el.value==='Gemacht'&&!a.doneAt)a.doneAt=now;
        a.next=el.value==='Vorgeschlagen'||el.value==='Offen'?'Rückmeldung und Zeitpunkt mit Eva klären.':el.value==='Zugesagt'?'Öffnungszeiten, Reservierung und Vorbereitung erledigen.':el.value==='Organisiert'?'Vor dem Termin letzte Details prüfen.':el.value==='Abgelehnt'?'Kurz festhalten, was nicht passte.':el.value==='Gemacht'?'Kurz notieren, wie es euch gefallen hat.':'Eva einen konkreten Zeitpunkt vorschlagen.';
      }
    })));
    host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>{
      const action=b.dataset.action,id=b.dataset.id;
      if(action==='prev'||action==='next'||action==='current'){week=action==='current'?monday(today()):addDays(week,action==='prev'?-7:7);render();return;}
      if(action==='export'){download(JSON.stringify(state,null,2),'freizeitplaner-sicherung-'+today()+'.json','application/json');return;}
      if(action==='calendar'){calendar();return;}
      if(action==='activityCalendar'){calendar(state.entries.find(x=>x.id===id));return;}
      if(action==='cancelImport'){backup=null;render();return;}
      if(action==='confirmImport'&&backup){try{localStorage.setItem(KEY,JSON.stringify(backup));state=backup;backup=null;damaged=false;message='Sicherung übernommen.';}catch{message='Import konnte nicht gespeichert werden.';}render();return;}
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
    action.addEventListener('click',()=>{addEntry(b.dataset.title!,b.dataset.url || '');document.querySelector<HTMLButtonElement>('[data-view="planning"]')?.click();});b.insertAdjacentElement('afterend',action);
  });
  new MutationObserver(enhance).observe(document.querySelector('#app')!,{childList:true,subtree:true});
  window.addEventListener('storage',ev=>{if(ev.key!==KEY)return;try{const parsed=ev.newValue?JSON.parse(ev.newValue):empty();if(!validState(parsed))throw Error();state=parsed;damaged=false;message='Planung aus einem anderen Tab übernommen.';render();}catch{message='Änderung aus einem anderen Tab konnte nicht gelesen werden.';render();}});
  render();enhance();
  const params=new URLSearchParams({latitude:'48.3705',longitude:'10.8978',daily:'precipitation_probability_max',timezone:'Europe/Berlin',forecast_days:'14'});
  fetch('https://api.open-meteo.com/v1/forecast?'+params).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(data.daily?.time)rain=Object.fromEntries(data.daily.time.map((d:string,i:number)=>[d,data.daily.precipitation_probability_max[i]]));if(!host.contains(document.activeElement))render();}).catch(()=>{});
}
