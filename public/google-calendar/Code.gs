/** Freizeitplaner ↔ ausschließlich der Google-Kalender Freizeitplaner.
 * Einrichtung: Google Calendar API unter Dienste hinzufügen; install ausführen.
 * Kein Web-App-Deployment, keine Tokens in der öffentlichen App.
 */
const FP_CALENDAR = '288aa1dd08b3218ae703dae006e7ce15c40a882d7732978073deb16ea0889a7d@group.calendar.google.com';
const FP_DB = 'https://mcpkvssierkwmueekyec.supabase.co/rest/v1/personal_planning';
const FP_KEY = 'sb_publishable_LKYbSfFZ4WBWPnRpLfxyFQ_tqMGThd2';
const FP_ZONE = 'Europe/Berlin';

function install() {
  // Verify the ONLY calendar before installing a persistent trigger.
  Calendar.Events.list(FP_CALENDAR, {maxResults: 1});
  uninstall();
  ScriptApp.newTrigger('syncFreizeitplaner').timeBased().everyMinutes(5).create();
  syncFreizeitplaner();
}
function uninstall() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'syncFreizeitplaner')
    .forEach(t => ScriptApp.deleteTrigger(t));
}
function fpHash(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value))
    .map(n => ('0' + ((n + 256) % 256).toString(16)).slice(-2)).join('');
}
function fpDay(date, offset) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function fpTime(value) {
  return value.date ? {date:value.date, time:'00:00'} : {
    date:Utilities.formatDate(new Date(value.dateTime), FP_ZONE, 'yyyy-MM-dd'),
    time:Utilities.formatDate(new Date(value.dateTime), FP_ZONE, 'HH:mm')
  };
}
function fpRemoteHash(event) {
  // Notes, attendees, location etc. in Google are retained, not overwritten.
  return fpHash([event.status, event.summary, event.start, event.end, event.recurrence]);
}
function fpActive(row, kind) {
  return row && row.date && row.start && row.end && row.end > row.start
    && (kind !== 'entries' || row.status !== 'Abgelehnt');
}
function fpLocalHash(row, kind) {
  return fpActive(row,kind) ? fpHash([row.title,row.date,row.start,row.end,
    kind === 'appointments' && row.repeat, row.excludedDates || []]) : '';
}
function fpGet(id) {
  try { return Calendar.Events.get(FP_CALENDAR, id); }
  catch (error) {
    if (/not found|gone|404|410/i.test(String(error))) return {id:id,status:'cancelled'};
    throw error; // Authentication, quota and network errors never mean deletion.
  }
}
function fpRemove(event) {
  if (event.status !== 'cancelled') Calendar.Events.remove(FP_CALENDAR,event.id,
    {sendUpdates:'none'}, {'If-Match':event.etag});
}
function fpCreate(row,kind,props) {
  const key=kind+':'+row.id, generationKey='generation:'+fpHash(key);
  let generation=Number(props.getProperty(generationKey) || 0);
  for(let attempt=0;attempt<5;attempt++) {
    const id='fp'+fpHash([key,generation]);
    const remote=fpGet(id);
    if(remote.status!=='cancelled') return remote;
    try { return Calendar.Events.insert({...fpBody(row,kind),id:id},FP_CALENDAR,{sendUpdates:'none'}); }
    catch(error) {
      if(!/409|already exists|duplicate/i.test(String(error))) throw error;
      // A tombstone reserves its ID permanently. A timed-out successful insert
      // is recovered through GET, rather than creating a second calendar event.
      const existing=fpGet(id);
      if(existing.status!=='cancelled') return existing;
      generation++;props.setProperty(generationKey,String(generation));
    }
  }
  throw Error('Google-ID konnte nicht angelegt werden.');
}
function fpBody(row, kind) {
  const result = {
    summary:row.title,
    start:{dateTime:row.date + 'T' + row.start + ':00',timeZone:FP_ZONE},
    end:{dateTime:row.date + 'T' + row.end + ':00',timeZone:FP_ZONE},
    recurrence:[],
    extendedProperties:{private:{freizeitKey:kind + ':' + row.id,
      freizeitOwner:row.owner || 'Beide',freizeitUncertain:String(!!row.uncertain)}}
  };
  if (kind === 'appointments' && row.repeat) {
    result.recurrence=['RRULE:FREQ=WEEKLY'];
    if ((row.excludedDates || []).length) result.recurrence.push('EXDATE;TZID=' + FP_ZONE + ':' +
      row.excludedDates.map(date => date.replace(/-/g,'') + 'T' + row.start.replace(':','') + '00').join(','));
  }
  return result;
}
function fpRead() {
  const response=UrlFetchApp.fetch(FP_DB+'?id=eq.shared&select=payload,revision', {
    headers:{apikey:FP_KEY},muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw Error('Planung konnte nicht gelesen werden.');
  const rows=JSON.parse(response.getContentText());
  if (rows.length!==1 || rows[0].payload.version!==1 || !Array.isArray(rows[0].payload.entries)
      || !Array.isArray(rows[0].payload.appointments)) throw Error('Ungültige Planung.');
  return rows[0];
}
function fpWrite(snapshot) {
  const response=UrlFetchApp.fetch(FP_DB+'?id=eq.shared&revision=eq.'+snapshot.revision, {
    method:'patch',contentType:'application/json',headers:{apikey:FP_KEY,Prefer:'return=representation'},
    payload:JSON.stringify({payload:snapshot.payload}),muteHttpExceptions:true});
  if (response.getResponseCode() !== 200 || JSON.parse(response.getContentText()).length!==1)
    throw Error('Planung wurde gleichzeitig geändert. Nächster Abgleich versucht es erneut.');
}
function fpList() {
  const now=Utilities.formatDate(new Date(),FP_ZONE,'yyyy-MM-dd');
  const result=[]; let pageToken;
  do {
    const page=Calendar.Events.list(FP_CALENDAR, {singleEvents:true,showDeleted:false,maxResults:2500,
      timeMin:fpDay(now,-30)+'T00:00:00Z',timeMax:fpDay(now,366)+'T00:00:00Z',pageToken:pageToken});
    result.push(...(page.items || [])); pageToken=page.nextPageToken;
  } while (pageToken);
  return result;
}
function fpParts(event) {
  const start=fpTime(event.start), end=fpTime(event.end);
  const last=end.time==='00:00' ? fpDay(end.date,-1) : end.date;
  const parts=[]; const metadata=event.extendedProperties && event.extendedProperties.private || {};
  for(let date=start.date;date<=last;date=fpDay(date,1)) {
    const from=date===start.date?start.time:'00:00';
    const to=date===end.date?end.time:'23:59';
    if(to<=from) continue;
    parts.push({id:'google-'+event.id+'-'+date,title:event.summary || 'Ohne Titel',date:date,
      start:from,end:to,owner:metadata.freizeitOwner || 'Beide',uncertain:metadata.freizeitUncertain==='true',
      repeat:false,googleEventId:event.id,googleSeriesId:event.recurringEventId || '',googleAllDay:!!event.start.date});
    if(parts.length>400) throw Error('Ein Termin umfasst zu viele Tage.');
  }
  return parts;
}
function fpDrop(state, record) {
  if(record.kind==='entries') {
    const entry=state.entries.find(row=>row.id===record.localId);
    if(entry) { entry.date=''; entry.start=''; entry.end=''; entry.slotId=''; }
  } else state.appointments=state.appointments.filter(row=>!record.ids.includes(row.id));
  // Slots are availability, never Google events. Keep the user's availability.
}
function fpPull(state,event,record) {
  const parts=fpParts(event);
  if(record && record.kind==='entries' && parts.length===1 && !event.start.date && !(event.recurrence || []).length) {
    const row=state.entries.find(row=>row.id===record.localId);
    if(row) {const part=parts[0];row.title=part.title;row.date=part.date;row.start=part.start;row.end=part.end;row.slotId='';}
    return {...record,remoteHash:fpRemoteHash(event),appHash:fpLocalHash(row,'entries')};
  }
  // Complex Google events are fixed appointments. Preserve proposal history separately.
  if(record) fpDrop(state,record);
  state.appointments=state.appointments.filter(row=>row.googleEventId!==event.id);
  if(record && record.kind==='appointments' && record.ids.length===1 && parts.length===1 && !event.recurringEventId) {
    parts[0].id=record.ids[0];
  }
  state.appointments.push(...parts);
  return {kind:'appointments',ids:parts.map(p=>p.id),seriesId:event.recurringEventId || '',
    remoteHash:fpRemoteHash(event),appHash:fpHash(parts.map(p=>fpLocalHash(p,'appointments')))};
}
function syncFreizeitplaner() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  const props=PropertiesService.getScriptProperties();
  try {
    // A missing/inaccessible calendar must never be interpreted as all events deleted.
    Calendar.Events.list(FP_CALENDAR,{maxResults:1});
    const snapshot=fpRead(), state=snapshot.payload;
    const stored=props.getProperties(), records={};
    Object.keys(stored).filter(key=>key.startsWith('event:')).forEach(key=>records[key.slice(6)]=JSON.parse(stored[key]));
    // Explicit series deletion is accepted ONLY for series previously imported by this script.
    for(const series of state.googleDeleteSeries || []) {
      if(!Object.keys(records).some(id=>id===series && records[id].guard || records[id].seriesId===series)) continue;
      fpRemove(fpGet(series));
      Object.keys(records).filter(id=>id===series || records[id].seriesId===series).forEach(id=>{
        fpDrop(state,records[id]);delete records[id];
      });
    }
    state.googleDeleteSeries=[];
    for(const id of Object.keys(records)) {
      const record=records[id];
      if(record.guard) continue; // Google now owns the series rule; individual occurrences are mapped below.
      let remote=fpGet(id);
      if(remote.status==='cancelled') {fpDrop(state,record);delete records[id];continue;}
      const row=record.kind==='entries' ? state.entries.find(r=>r.id===record.localId)
        : state.appointments.find(r=>r.id===record.ids[0]);
      const native=record.localId || row && !row.googleEventId;
      const current=native?fpLocalHash(row,record.kind):fpHash(record.ids.map(key=>{
        const item=state.appointments.find(r=>r.id===key);return fpLocalHash(item,'appointments');
      }));
      if(fpRemoteHash(remote)!==record.remoteHash) {
        if((remote.recurrence || []).length) {
          // A modified series will be rebuilt from expanded Google occurrences below.
          fpDrop(state,record); records[id]={guard:true,kind:'appointments',ids:[],seriesId:id};
        } else records[id]=fpPull(state,remote,record);
        continue; // Google wins calendar-field conflicts. Proposal history is preserved.
      }
      const missing=native?!fpActive(row,record.kind):record.ids.some(key=>!state.appointments.some(r=>r.id===key));
      if(missing) {fpRemove(remote);fpDrop(state,record);delete records[id];continue;}
      if(native && current!==record.appHash) {
        remote=Calendar.Events.patch(fpBody(row,record.kind),FP_CALENDAR,id,{sendUpdates:'none'},{'If-Match':remote.etag});
        records[id]={...record,appHash:current,remoteHash:fpRemoteHash(remote)};
      }
    }
    // New local rows have deterministic Google IDs, so retries never duplicate events.
    for(const kind of ['entries','appointments']) for(const row of state[kind]) {
      if(!fpActive(row,kind) || row.googleEventId || Object.values(records).some(r=>r.localId===row.id && r.kind===kind || r.kind===kind && (r.ids || []).includes(row.id))) continue;
      const remote=fpCreate(row,kind,props),id=remote.id;
      records[id]={kind:kind,localId:row.id,ids:[row.id],remoteHash:fpRemoteHash(remote),appHash:fpLocalHash(row,kind)};
      // Non-secret recovery marker: the event can be remapped if cloud CAS fails.
    }
    for(const remote of fpList()) {
      if(remote.status==='cancelled') continue;
      const record=records[remote.id];
      const metadata=remote.extendedProperties && remote.extendedProperties.private || {};
      const master=remote.recurringEventId && records[remote.recurringEventId];
      if(master && !master.guard) {
        // Convert exported weekly rows to mapped instances. Enables single/series deletion
        // and arbitrary recurrence edits in Google without manufacturing another series.
        fpDrop(state,master);
        records[remote.recurringEventId]={guard:true,kind:'appointments',ids:[],seriesId:remote.recurringEventId};
      }
      if(!record) {
        if(metadata.freizeitKey && !remote.recurringEventId) {
          const split=metadata.freizeitKey.indexOf(':');const kind=metadata.freizeitKey.slice(0,split),key=metadata.freizeitKey.slice(split+1);
          const row=(state[kind] || []).find(r=>r.id===key);
          if(row && ['entries','appointments'].includes(kind)) {
            records[remote.id]=fpPull(state,remote,{kind:kind,localId:key,ids:[key]});continue;
          }
        }
        records[remote.id]=fpPull(state,remote,null);
      } else if(!record.guard && fpRemoteHash(remote)!==record.remoteHash) records[remote.id]=fpPull(state,remote,record);
    }
    state.googleSync={lastSuccess:new Date().toISOString()};
    fpWrite(snapshot); // Compare-and-swap: never overwrite concurrent app edits.
    const next={};Object.keys(records).forEach(id=>next['event:'+id]=JSON.stringify(records[id]));
    props.setProperties(next,false);
    Object.keys(stored).filter(key=>key.startsWith('event:') && !(key in next)).forEach(key=>props.deleteProperty(key));
  } catch(error) {
    // Never put access tokens or Google error bodies in the public planning payload.
    try {const snapshot=fpRead();snapshot.payload.googleSync={...(snapshot.payload.googleSync || {lastSuccess:''}),error:'sync_failed'};fpWrite(snapshot);} catch(ignore) {}
    throw error;
  } finally {lock.releaseLock();}
}
