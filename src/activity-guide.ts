import {stockIdeaMarkup,stockSources, type StockItem} from './activity-stock.ts';
import {categoryOf,matchesSetting,settingOf} from './activity-properties.ts';
import type { KnownActivity } from './known-activities';

export type GuideAnswers = { need: 'rest' | 'move' | 'change' | 'unknown'; minutes: number | null; energy: 'low' | 'medium' | 'high' | 'unknown'; effort: 'spontaneous' | 'prepare' | 'trip' | 'unknown'; place: 'inside' | 'outside' | 'unknown' };
export const emptyGuideAnswers = (): GuideAnswers => ({need:'unknown',minutes:null,energy:'unknown',effort:'unknown',place:'unknown'});

// Use only the current collection. Never seed deleted activities or infer availability.
export function chooseActivities(activities: readonly KnownActivity[], answers: GuideAnswers): KnownActivity[] {
  const calm = /tee|lesen|buch|musik hören|massage|ohne handy|draußen sitzen|sonnenuntergang|spaziergang|kleine runde|puzzle|zeichnen|malen|fotos anschauen|kaffee|picknick/i;
  const moving = (a: KnownActivity) => categoryOf(a) === 'movement';
  const pool = activities.filter(a => (answers.minutes === null || a.minutes <= answers.minutes)
    && matchesSetting(a,answers.place)
    && (answers.effort !== 'spontaneous' || a.effort === 'spontaneous')
    && (answers.effort !== 'prepare' || a.effort !== 'trip')
    && (answers.energy !== 'low' || a.energy === 'low')
    && (answers.energy !== 'medium' || a.energy !== 'high')
    && (answers.need !== 'move' || moving(a))
    && (answers.need !== 'rest' || a.energy === 'low' && a.effort === 'spontaneous' && (categoryOf(a)==='relaxation'||calm.test(a.title))));
  const score = (a: KnownActivity) => ((a.rating??3)-3)*30 + (a.effort === 'spontaneous' ? 30 : a.effort === 'prepare' ? 10 : 0)
    + (answers.need === 'rest' && (categoryOf(a)==='relaxation'||calm.test(a.title)) ? 40 : 0)
    + (answers.need === 'change' && ['culture','food','explore'].includes(categoryOf(a)) ? 20 : 0)
    + (answers.energy === a.energy ? 80 : 0)
    + (answers.energy === 'high' && a.energy === 'medium' ? 40 : 0)
    + (answers.need === 'unknown' && a.energy === 'low' ? 10 : 0);
  const sorted = [...pool].sort((a,b) => score(b)-score(a) || a.minutes-b.minutes || a.id.localeCompare(b.id));
  const first = sorted[0];
  if (!first) return [];
  const second = sorted.find(a => a.id !== first.id && categoryOf(a) !== categoryOf(first)) ?? sorted.find(a => a.id !== first.id);
  return second ? [first,second] : [first];
}

const escape = (value: string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const questions = [
  {title:'Was könnte dir gerade guttun?',options:[['rest','Etwas Ruhiges'],['move','Bewegung'],['change','Etwas Schönes erleben'],['unknown','Weiß ich nicht']]},
  {title:'Wie viel Zeit möchtest du dir nehmen?',options:[['60','Bis 1 Stunde'],['180','Bis 3 Stunden'],['1440','Ganzer Tag']]},
  {title:'Wie viel Energie hast du gerade?',options:[['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['unknown','Weiß ich nicht']]},
  {title:'Wo wäre es gerade angenehmer?',options:[['inside','Drinnen'],['outside','Draußen'],['unknown','Egal / weiß ich nicht']]},
  {title:'Wie viel Organisation ist heute okay?',options:[['spontaneous','Direkt loslegen'],['prepare','Ein bisschen vorbereiten'],['trip','Auch etwas planen'],['unknown','Weiß ich nicht']]}
];

export class ActivityGuide {
  private open = false;
  private step = 0;
  private answers = emptyGuideAnswers();
  handle(action: string, value?: string): boolean {
    if (action === 'guideStart') {this.open=true;this.step=0;this.answers=emptyGuideAnswers();return true;}
    if (action === 'guideClose') {this.open=false;return true;}
    if (action === 'guideBack') {this.step=Math.max(0,this.step-1);return true;}
    if (action !== 'guideAnswer' || !questions[this.step]?.options.some(([id])=>id===value)) return false;
    if (this.step===0) this.answers.need=value as GuideAnswers['need'];
    if (this.step===1) this.answers.minutes=Number(value);
    if (this.step===2) this.answers.energy=value as GuideAnswers['energy'];
    if (this.step===3) this.answers.place=value as GuideAnswers['place'];
    if (this.step===4) this.answers.effort=value as GuideAnswers['effort'];
    this.step++;
    return true;
  }
  markup(activities: readonly KnownActivity[], stock: readonly StockItem[] = []): string {
    if (!this.open) return '<div class="activity-guide-start"><button type="button" data-action="guideStart">Hilf mir entscheiden</button><p class="planner-small">Fünf kurze Fragen. Du musst deine Wünsche nicht genau kennen.</p></div>';
    const question=questions[this.step];
    const navigation=`<div class="planner-actions">${this.step?'<button type="button" data-action="guideBack">Zurück</button>':''}<button type="button" data-action="guideClose">Schließen</button></div>`;
    if (question) return `<section class="activity-guide" aria-label="Entscheidungshilfe"><p class="section-kicker">Frage ${this.step+1} von ${questions.length}</p><h3 tabindex="-1" data-guide-focus>${question.title}</h3><div class="activity-guide-options">${question.options.map(([value,label])=>`<button type="button" data-action="guideAnswer" data-id="${value}">${label}</button>`).join('')}</div>${navigation}</section>`;
    const picks=chooseActivities(activities,this.answers);
    return `<section class="activity-guide" aria-label="Dein Vorschlag"><h3 tabindex="-1" data-guide-focus>${picks.length?'Ein guter Anfang':'Noch kein passender Vorschlag'}</h3>${picks.map((a,i)=>`<article class="activity-guide-pick" data-id="${escape(a.id)}"><span class="section-kicker">${i?'Eine Alternative':'Mein Vorschlag'}</span><h4>${escape(a.title)}</h4><p>Richtdauer aus deiner Sammlung: ${a.minutes} Minuten. ${settingOf(a)==='outside'||settingOf(a)==='both'&&this.answers.place!=='inside'?'Wetter und Bedingungen vor Ort prüfen.':'Öffnungszeiten oder Verfügbarkeit bei Bedarf prüfen.'}</p><p>${escape(a.next)}</p>${stockIdeaMarkup(a,stock,this.answers,stockSources().decisions)}</article>`).join('')||'<p>Deine gespeicherten Aktivitäten passen nicht zu diesen Antworten. Geh zurück und ändere Zeit, Energie, Ort oder Aufwand, oder ergänze eine eigene kurze Aktivität.</p>'}${picks.length?'<p class="planner-small">Die Richtdauer ist geschätzt; Vorbereitung kann dazukommen. Du musst dich nicht festlegen: Wenn die Aktivität es erlaubt, probiere sie kurz aus und höre wieder auf. Hinterher reicht: Hat es mir gutgetan?</p>':''}<button type="button" data-action="guideCurrent">Aktuelle Angebote ansehen</button>${navigation}<button type="button" data-action="guideStart">Neu beginnen</button></section>`;
  }
}



