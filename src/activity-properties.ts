import type { KnownActivity } from './known-activities';

export type ActivityCategory = 'movement' | 'relaxation' | 'food' | 'culture' | 'explore';
export type ActivitySetting = 'inside' | 'outside' | 'both';
export const activityCategories: [ActivityCategory,string][] = [['movement','Bewegung'],['relaxation','Entspannung'],['food','Genuss'],['culture','Kultur & Kreatives'],['explore','Ausflüge & Entdecken']];
export const activitySettings: [ActivitySetting,string][] = [['inside','Drinnen'],['outside','Draußen'],['both','Drinnen oder draußen']];
export const energyLabels: Record<string,string> = {low:'niedrig',medium:'mittel',high:'hoch'};
export const effortLabels: Record<string,string> = {spontaneous:'direkt loslegen',prepare:'etwas Vorbereitung',trip:'etwas planen'};

export function categoryOf(a: KnownActivity): ActivityCategory {
  if (a.activityCategory) return a.activityCategory;
  if (a.mood === 'movement' || /spaziergang|spazieren|zu fuß|kleine runde|wandern|wanderung|radtour|kajak|yoga|schwimmen/i.test(a.title)) return 'movement';
  if (/lesen|buch draußen|musik hören|massage|ohne handy|puzzle|draußen sitzen|sonnenuntergang|sauna|therme|wellness|tee trinken/i.test(a.title)) return 'relaxation';
  if (/picknick/i.test(a.title)) return 'food';
  if (a.mood === 'food') return 'food';
  if (/ausflug|camper|stadt.*erkunden|viertel|garten|gärtner|pflanzen|hochbeet|kräuter/i.test(a.title) || a.mood === 'outdoor') return 'explore';
  return 'culture';
}
export const settingOf = (a: KnownActivity): ActivitySetting => a.setting ?? (a.outdoor ? 'outside' : 'inside');
export const matchesSetting = (a: KnownActivity, wanted: ActivitySetting | 'unknown') => wanted === 'unknown' || settingOf(a) === 'both' || settingOf(a) === wanted;
// Keep the old fields valid for the existing mail adapter; both is conservatively outdoor.
export const legacyMood = (category: ActivityCategory) => category === 'explore' ? 'outdoor' : category === 'relaxation' ? 'culture' : category;
export function validActivityProperties(a: KnownActivity): boolean {
  return (a.activityCategory === undefined || activityCategories.some(([id])=>id===a.activityCategory))
    && (a.setting === undefined || activitySettings.some(([id])=>id===a.setting) && a.outdoor === (a.setting !== 'inside'));
}
