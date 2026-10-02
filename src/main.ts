import { initPlanner } from './planner';
import './styles.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mcpkvssierkwmueekyec.supabase.co',
  'sb_publishable_LKYbSfFZ4WBWPnRpLfxyFQ_tqMGThd2'
);


type Recommendation = {
  day: string; category: string; date: string; title: string; description: string;
  url: string; sourceLabel: string;
  favorite: { id: string; title: string; dayLabel: string; categoryLabel: string; description: string; url: string };
  dayText?: string; badge?: string; facts?: string[]; why?: string;
  label?: string; meta?: string[]; metaLabel?: string; time?: string;
};

type LifestyleRecommendation = {
  id: string; title: string; type: string; description: string; meta: string[];
  url: string; badge: string; imdbRating?: number; imdbUrl?: string; trailerUrl?: string;
};

type StreamRecommendation = LifestyleRecommendation & {
  platform: string; releaseDate: string;
};

type RecommendationData = {
  schemaVersion: number;
  dataUpdated: string;
  weekendRange: string;
  weatherDays: Array<{ date: string; label: string; display: string }>;
  top: Recommendation[];
  ideas: Recommendation[];
  hikes: Recommendation[];
  bikes: Recommendation[];
  discoveries: Recommendation[];
  restaurants: LifestyleRecommendation[];
  cinema: LifestyleRecommendation[];
  stream: StreamRecommendation[];
};

function dataEscape(value = '') {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char] ?? char);
}

function favoriteMarkup(item: Recommendation, compact = false) {
  const f = item.favorite;
  return '<button class="favorite-btn' + (compact ? ' compact' : '') + '" type="button" data-favorite ' +
    'data-id="' + dataEscape(f.id) + '" data-title="' + dataEscape(f.title) + '" ' +
    'data-day-label="' + dataEscape(f.dayLabel) + '" data-category-label="' + dataEscape(f.categoryLabel) + '" ' +
    'data-description="' + dataEscape(f.description) + '" data-url="' + dataEscape(f.url) + '">Merken</button>';
}

function sourceMarkup(item: Recommendation) {
  return '<a class="info-link" href="' + dataEscape(item.url) + '" target="_blank" rel="noopener noreferrer">' +
    dataEscape((item.sourceLabel || 'Originalquelle').replace('Originalquelle', 'Quelle')) + '</a>';
}

function ratingMarkup(id: string, title: string, section: string) {
  return '<div class="rating-actions" data-rating-wrap>' +
    '<button class="rating-btn" type="button" data-rate="1" data-id="' + dataEscape(id) + '" data-section="' + dataEscape(section) + '" data-title="' + dataEscape(title) + '" aria-label="Gefällt mir">👍</button>' +
    '<button class="rating-btn" type="button" data-rate="-1" data-id="' + dataEscape(id) + '" data-section="' + dataEscape(section) + '" data-title="' + dataEscape(title) + '" aria-label="Gefällt mir nicht">👎</button></div>';
}

function lifestyleFavoriteMarkup(item: LifestyleRecommendation, section: 'restaurants' | 'cinema' | 'stream') {
  const category = section === 'restaurants' ? 'Restaurant' : (section === 'cinema' ? 'Kino' : 'Streaming');
  return '<button class="favorite-btn compact" type="button" data-favorite ' +
    'data-id="' + dataEscape('lifestyle-' + item.id) + '" data-title="' + dataEscape(item.title) + '" ' +
    'data-day-label="" data-category-label="' + category + '" data-description="' + dataEscape(item.description) + '" ' +
    'data-url="' + dataEscape(item.url) + '">Merken</button>';
}

function renderRecommendationData(data: RecommendationData, hiddenIds = new Set<string>()) {
  const state = document.querySelector<HTMLElement>('.data-state');
  if (state) state.textContent = 'Datenstand Freizeit-Tipps: ' + data.dataUpdated;

  const range = document.querySelector<HTMLElement>('.weekend-range');
  if (range) range.textContent = data.weekendRange;

  const weather = document.querySelector<HTMLElement>('.weather-grid');
  if (weather) {
    weather.innerHTML = data.weatherDays.map(day =>
      '<div class="weather-day" data-weather-date="' + dataEscape(day.date) + '">' +
      '<strong>' + dataEscape(day.label) + '</strong>' +
      '<div class="weather-date">' + dataEscape(day.display) + '</div>' +
      '<div class="weather-value">Wetter derzeit nicht verfügbar</div></div>'
    ).join('');
  }

  const top = document.querySelector<HTMLElement>('#topCards');
  if (top) top.innerHTML = data.top.map(item =>
    '<article class="card filterable" data-day="' + dataEscape(item.day) + '" data-category="' + dataEscape(item.category) + '" data-date="' + dataEscape(item.date) + '">' +
    '<div class="card-top"><span class="day">' + dataEscape(item.dayText) + '</span><span class="badge">' + dataEscape(item.badge) + '</span></div>' +
    '<h3>' + dataEscape(item.title) + '</h3><p>' + dataEscape(item.description) + '</p>' +
    '<div class="facts">' + (item.facts ?? []).map(v => '<span>' + dataEscape(v) + '</span>').join('') + '</div>' +
    '<div class="why">' + dataEscape(item.why) + '</div><div class="card-actions item-actions">' +
    sourceMarkup(item) + ratingMarkup(item.favorite.id, item.title, 'weekend') + favoriteMarkup(item) + '</div></article>'
  ).join('');

  const ideas = document.querySelector<HTMLElement>('#alternativeList');
  if (ideas) ideas.innerHTML = data.ideas.map(item =>
    '<article class="idea-card filterable" data-day="' + dataEscape(item.day) + '" data-category="' + dataEscape(item.category) + '" data-date="' + dataEscape(item.date) + '">' +
    '<div class="idea-visual" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/></svg></div>' +
    '<div class="idea-content"><span class="idea-category">' + dataEscape(item.label) + '</span><h3>' + dataEscape(item.title) + '</h3><p>' + dataEscape(item.description) + '</p>' +
    '<div class="idea-meta">' + (item.meta ?? []).map(v => '<span>' + dataEscape(v) + '</span>').join('') + '</div>' +
    '<div class="item-actions">' + sourceMarkup(item) + ratingMarkup(item.favorite.id, item.title, 'weekend') + favoriteMarkup(item, true) + '</div></div></article>'
  ).join('');

  const renderTours = (selector: string, items: Recommendation[]) => {
    const list = document.querySelector<HTMLElement>(selector + ' .tour-list');
    if (!list) return;
    list.innerHTML = items.map(item =>
      '<article class="tour-card filterable" data-day="' + dataEscape(item.day) + '" data-category="' + dataEscape(item.category) + '" data-date="' + dataEscape(item.date) + '">' +
      '<div class="tour-top"><span class="tour-category">' + dataEscape(item.label) + '</span><span class="meta-label">' + dataEscape(item.metaLabel) + '</span></div>' +
      '<h4>' + dataEscape(item.title) + '</h4><p>' + dataEscape(item.description) + '</p>' +
      '<div class="tour-meta">' + (item.meta ?? []).map(v => '<span>' + dataEscape(v) + '</span>').join('') + '</div>' +
      '<div class="item-actions">' + sourceMarkup(item) + ratingMarkup(item.favorite.id, item.title, item.category) + favoriteMarkup(item, true) + '</div></article>'
    ).join('');
  };
  renderTours('#hikeGroup', data.hikes);
  renderTours('#bikeGroup', data.bikes);

  const discoveries = document.querySelector<HTMLElement>('#discoveries .discovery-timeline');
  if (discoveries) discoveries.innerHTML = data.discoveries.map(item =>
    '<article class="discovery-item"><time>' + dataEscape(item.time) + '</time><div><span class="mini-badge">' + dataEscape(item.badge) + '</span>' +
    '<h3>' + dataEscape(item.title) + '</h3><p>' + dataEscape(item.description) + '</p><div class="item-actions">' +
    sourceMarkup(item) + ratingMarkup(item.favorite.id, item.title, 'discoveries') + favoriteMarkup(item, true) + '</div></div></article>'
  ).join('');

  const renderLifestyle = (selector: string, items: LifestyleRecommendation[], section: 'restaurants' | 'cinema' | 'stream') => {
    const list = document.querySelector<HTMLElement>(selector);
    if (!list) return;
    list.innerHTML = items.filter(item => !hiddenIds.has(item.id)).map(item =>
      '<article class="lifestyle-card" data-lifestyle-id="' + dataEscape(item.id) + '">' +
      '<div class="lifestyle-top"><span class="lifestyle-type">' + dataEscape(item.type) + '</span><span class="lifestyle-badge">' + dataEscape(item.badge) + '</span></div>' +
      '<h3>' + dataEscape(item.title) + '</h3><p>' + dataEscape(item.description) + '</p>' +
      '<div class="lifestyle-meta">' + item.meta.map(v => '<span>' + dataEscape(v.replace(/^Neu seit (\d{2})\.(\d{2})\.\d{4}$/, "Seit $1.$2.")) + '</span>').join('') +
      (item.imdbRating ? '<a class="imdb-rating" href="' + dataEscape(item.imdbUrl || item.url) + '" target="_blank" rel="noopener noreferrer">IMDb ' + dataEscape(item.imdbRating.toFixed(1).replace('.', ',')) + '</a>' : '') +
      (item.trailerUrl ? '<a class="trailer-link trailer-meta" href="' + dataEscape(item.trailerUrl) + '" target="_blank" rel="noopener noreferrer">▶ Trailer</a>' : '') + '</div>' +
      '<div class="lifestyle-actions"><div class="lifestyle-links"><a class="info-link" href="' + dataEscape(item.url) + '" target="_blank" rel="noopener noreferrer">Mehr erfahren</a></div>' +
      '<div class="lifestyle-card-buttons">' + ratingMarkup(item.id, item.title, section) + lifestyleFavoriteMarkup(item, section) +
      '<button class="hide-card-btn" type="button" data-hide-card data-id="' + dataEscape(item.id) + '" data-section="' + section + '" data-title="' + dataEscape(item.title) + '">Ausblenden</button></div></div></article>'
    ).join('');
  };
  renderLifestyle('#restaurantList', data.restaurants ?? [], 'restaurants');
  renderLifestyle('#cinemaList', data.cinema ?? [], 'cinema');
  renderLifestyle('#streamList', (data.stream ?? []).filter(item => {
    const age = (Date.now() - new Date(item.releaseDate + 'T00:00:00').getTime()) / 86400000;
    return age >= 0 && age <= 60;
  }), 'stream');
}

async function loadRecommendationRatings() {
  const { data, error } = await supabase.from('recommendation_ratings').select('suggestion_id,rating');
  if (error) return new Map<string, number>();
  return new Map((data ?? []).map(row => [row.suggestion_id as string, row.rating as number]));
}

function wireRatingButtons(ratings: Map<string, number>) {
  document.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach(button => {
    const id = button.dataset.id ?? '';
    const value = Number(button.dataset.rate);
    button.classList.toggle('active', ratings.get(id) === value);
    button.addEventListener('click', async () => {
      const current = ratings.get(id);
      if (current === value) {
        const { error } = await supabase.from('recommendation_ratings').delete().eq('suggestion_id', id);
        if (!error) ratings.delete(id);
      } else {
        const { error } = await supabase.from('recommendation_ratings').upsert({
          suggestion_id: id,
          section: button.dataset.section ?? '',
          title: button.dataset.title ?? '',
          rating: value,
          rated_at: new Date().toISOString(),
        });
        if (!error) ratings.set(id, value);
      }
      document.querySelectorAll<HTMLButtonElement>('[data-rate][data-id="' + CSS.escape(id) + '"]').forEach(b =>
        b.classList.toggle('active', ratings.get(id) === Number(b.dataset.rate))
      );
    });
  });
}

async function loadHiddenRecommendationIds() {
  const { data, error } = await supabase.from('hidden_recommendations').select('suggestion_id');
  if (error) {
    console.error('Hidden recommendations could not be loaded', error);
    return new Set<string>();
  }
  return new Set((data ?? []).map(row => row.suggestion_id as string));
}

async function loadRecommendationData() {
  let data: RecommendationData;

  const { data: recommendationRow, error: recommendationError } = await supabase
    .from('recommendation_data')
    .select('payload')
    .eq('id', 'current')
    .maybeSingle();

  if (!recommendationError && recommendationRow?.payload) {
    data = recommendationRow.payload as RecommendationData;
  } else {
    console.warn('Supabase recommendation data unavailable; using JSON fallback', recommendationError);
    const response = await fetch('/recommendations.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Recommendation data could not be loaded');
    data = await response.json() as RecommendationData;
  }

  if (data.schemaVersion !== 2) throw new Error('Unsupported recommendation schema');
  const [hiddenIds, ratings] = await Promise.all([loadHiddenRecommendationIds(), loadRecommendationRatings()]);
  renderRecommendationData(data, hiddenIds);
  wireRatingButtons(ratings);
}

type Favorite = {
  id: string;
  suggestionId: string;
  title: string;
  day: string;
  category: string;
  description: string;
  url: string;
  savedAt: string;
};

async function bootstrap() {
  initPlanner(supabase);

  const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'));
  const viewSections = Array.from(document.querySelectorAll<HTMLElement>('[data-app-view]'));
  const setAppView = (view: string) => {
    viewButtons.forEach(button => button.classList.toggle('active', button.dataset.view === view));
    viewSections.forEach(section => {
      const active = section.dataset.appView === view;
      section.hidden = !active;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  viewButtons.forEach(button => button.addEventListener('click', () => setAppView(button.dataset.view ?? 'weekend')));
  setAppView('planning');

  try { await loadRecommendationData(); } catch {
    const state = document.querySelector<HTMLElement>('.data-state');
    if (state) state.textContent = 'Freizeit-Tipps gerade nicht verfügbar. Deine Wochenplanung funktioniert weiterhin.';
  }

  document.querySelectorAll<HTMLButtonElement>('[data-hide-card]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id ?? '';
      const section = button.dataset.section ?? '';
      const title = button.dataset.title ?? '';
      if (!id || !['restaurants', 'cinema', 'stream'].includes(section)) return;
      button.disabled = true;
      button.textContent = 'Wird ausgeblendet …';
      const { error } = await supabase.from('hidden_recommendations').upsert({
        suggestion_id: id, section, title, hidden_at: new Date().toISOString(),
      }, { onConflict: 'suggestion_id' });
      if (error) {
        console.error('Recommendation could not be hidden', error);
        button.disabled = false;
        button.textContent = 'Ausblenden';
        return;
      }
      button.closest<HTMLElement>('.lifestyle-card')?.remove();
    });
  });

  const mediaTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-media-tab]'));
  const mediaPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-media-panel]'));
  mediaTabs.forEach(tab => tab.addEventListener('click', () => {
    const target = tab.dataset.mediaTab;
    mediaTabs.forEach(button => button.classList.toggle('active', button === tab));
    mediaPanels.forEach(panel => {
      const active = panel.dataset.mediaPanel === target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }));

const dayButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter'));
const categoryButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.category-filter'));
const favoriteCategoryButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.favorite-category-filter'));
const filterableItems = Array.from(document.querySelectorAll<HTMLElement>('.filterable[data-day]'));
const topCards = Array.from(document.querySelectorAll<HTMLElement>('#topCards .filterable'));
const ideaCards = Array.from(document.querySelectorAll<HTMLElement>('#alternativeList .filterable'));
const hikeCards = Array.from(document.querySelectorAll<HTMLElement>('#hikeGroup .filterable'));
const bikeCards = Array.from(document.querySelectorAll<HTMLElement>('#bikeGroup .filterable'));

const topSection = document.querySelector<HTMLElement>('#topSection');
const weekendSection = document.querySelector<HTMLElement>('#weekendSection');
const outdoorSection = document.querySelector<HTMLElement>('#outdoorSection');
const hikeGroup = document.querySelector<HTMLElement>('#hikeGroup');
const bikeGroup = document.querySelector<HTMLElement>('#bikeGroup');
const statusText = document.querySelector<HTMLElement>('#statusText');
const resultCount = document.querySelector<HTMLElement>('#resultCount');
const resetFilters = document.querySelector<HTMLButtonElement>('#resetFilters');

const favoriteButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-favorite]'));
const favoritesList = document.querySelector<HTMLElement>('#favoritesList');
const favoritesEmpty = document.querySelector<HTMLElement>('#favoritesEmpty');
const favoritesMessage = document.querySelector<HTMLElement>('#favoritesMessage');
const savedCount = document.querySelector<HTMLElement>('#savedCount');

const detailDialog = document.querySelector<HTMLDialogElement>('#detailDialog');
const detailClose = document.querySelector<HTMLButtonElement>('#detailClose');
const detailBadge = document.querySelector<HTMLElement>('#detailBadge');
const detailTitle = document.querySelector<HTMLElement>('#detailTitle');
const detailMeta = document.querySelector<HTMLElement>('#detailMeta');
const detailDescription = document.querySelector<HTMLElement>('#detailDescription');
const detailFacts = document.querySelector<HTMLElement>('#detailFacts');
const detailSource = document.querySelector<HTMLAnchorElement>('#detailSource');
const detailFavorite = document.querySelector<HTMLButtonElement>('#detailFavorite');
const backToTop = document.querySelector<HTMLButtonElement>('#backToTop');
const weatherGrid = document.querySelector<HTMLElement>('.weather-grid');

let activeDay = 'all';
let activeCategory = 'all';
let activeFavoriteCategory = 'all';
let favorites: Favorite[] = [];
let detailFavoriteSource: HTMLButtonElement | null = null;

function berlinDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

function normalizeCategory(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    fahrrad: 'fahrrad',
    wandern: 'wandern',
    musik: 'musik',
    gastro: 'gastro',
    markt: 'markt',
    'märkte/feste': 'markt',
    kultur: 'kultur',
    'kultur/kino': 'kultur',
    kajak: 'kajak',
    'schwimmen/wellness': 'wellness',
    wellness: 'wellness',
    camper: 'camper',
    wildcard: 'wildcard',
  };
  return aliases[normalized] ?? normalized;
}

function broadCategory(category: string) {
  const normalized = normalizeCategory(category);
  if (['wandern', 'fahrrad', 'kajak', 'camper'].includes(normalized)) return 'outdoor';
  if (['gastro', 'markt'].includes(normalized)) return 'essen';
  if (normalized === 'wellness') return 'wellness';
  if (normalized === 'musik') return 'musik';
  if (normalized === 'kultur') return 'kultur';
  return normalized;
}

function categoryMatches(category: string, filter: string) {
  return filter === 'all' || broadCategory(category) === filter;
}

function markPastItems() {
  const today = berlinDateIso();

  filterableItems.forEach(item => {
    const date = item.dataset.date;
    if (date && date < today) {
      item.classList.add('expired');
      item.setAttribute('aria-hidden', 'true');
    }
  });
}

function markWeatherDays() {
  const today = berlinDateIso();
  document.querySelectorAll<HTMLElement>('[data-weather-date]').forEach(day => {
    const date = day.dataset.weatherDate;
    if (!date) return;
    day.classList.toggle('is-today', date === today);
    day.classList.toggle('is-past', date < today);
  });
}

type WeatherDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
};

type WeatherResponse = {
  daily?: WeatherDaily;
};

function weatherLabel(code: number) {
  if (code === 0) return 'Sonnig';
  if ([1, 2].includes(code)) return 'Heiter';
  if (code === 3) return 'Bewölkt';
  if ([45, 48].includes(code)) return 'Nebel';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Nieselregen';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Regen';
  if ([71, 73, 75, 77].includes(code)) return 'Schnee';
  if ([80, 81, 82].includes(code)) return 'Schauer';
  if ([85, 86].includes(code)) return 'Schneeschauer';
  if ([95, 96, 99].includes(code)) return 'Gewitter';
  return 'Wechselhaft';
}


function weatherIcon(code: number) {
  const sun = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="7"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.3 4.3M33.2 33.2l4.3 4.3M37.5 10.5l-4.3 4.3M14.8 33.2l-4.3 4.3"/></svg>';
  const cloud = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 34h23a7 7 0 0 0 1-13.9A12 12 0 0 0 14.2 23 5.7 5.7 0 0 0 13 34Z"/></svg>';
  const rain = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 29h23a7 7 0 0 0 1-13.9A12 12 0 0 0 14.2 18 5.7 5.7 0 0 0 13 29Z"/><path d="M17 34l-2 5M26 34l-2 5M35 34l-2 5"/></svg>';
  const storm = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 27h23a7 7 0 0 0 1-13.9A12 12 0 0 0 14.2 16 5.7 5.7 0 0 0 13 27Z"/><path d="M25 30l-5 8h5l-2 6 8-10h-5l3-4"/></svg>';
  const fog = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 17h30M6 24h36M11 31h28"/></svg>';
  const mixed = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="17" r="6"/><path d="M18 6v4M8 17h4M11 10l3 3"/><path d="M16 33h21a6 6 0 0 0 1-11.9A10 10 0 0 0 19 23a5 5 0 0 0-3 10Z"/></svg>';
  if (code === 0) return sun;
  if ([1, 2].includes(code)) return mixed;
  if (code === 3) return cloud;
  if ([45, 48].includes(code)) return fog;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 71, 73, 75, 77, 85, 86].includes(code)) return rain;
  if ([95, 96, 99].includes(code)) return storm;
  return cloud;
}

function renderWeatherHint(daily: WeatherDaily) {
  if (!weatherGrid) return;

  weatherGrid.querySelector('.weather-hint')?.remove();

  const today = berlinDateIso();
  const candidates = daily.time
    .map((date, index) => ({
      date,
      index,
      probability: daily.precipitation_probability_max[index] ?? 100,
      precipitation: daily.precipitation_sum[index] ?? 99,
      code: daily.weather_code[index] ?? 99,
    }))
    .filter(item => item.date >= today && Array.from(document.querySelectorAll<HTMLElement>('[data-weather-date]')).some(day => day.dataset.weatherDate === item.date));

  if (candidates.length === 0) return;

  const dayNames = Object.fromEntries(
    Array.from(document.querySelectorAll<HTMLElement>('[data-weather-date]')).map(day => [
      day.dataset.weatherDate ?? '',
      day.querySelector('strong')?.textContent?.trim() ?? 'Der Tag',
    ])
  ) as Record<string, string>;

  const ranked = [...candidates].sort((a, b) => {
    const scoreA = a.probability + a.precipitation * 12 + (a.code >= 51 ? 25 : 0);
    const scoreB = b.probability + b.precipitation * 12 + (b.code >= 51 ? 25 : 0);
    return scoreA - scoreB;
  });

  const best = ranked[0];
  const wetter = ranked.find(item => item.probability >= 50 || item.precipitation >= 1 || item.code >= 51);

  const hint = document.createElement('div');
  hint.className = 'weather-hint';

  let text = '';
  if (best && best.probability <= 35 && best.precipitation < 1) {
    text = dayNames[best.date] + ' wirkt aktuell am geeignetsten für draußen.';
  } else if (best) {
    text = dayNames[best.date] + ' hat aktuell die günstigsten Außenbedingungen.';
  }

  if (wetter && wetter.date !== best.date) {
    text += ' Für ' + dayNames[wetter.date] + ' sind Kultur und Wellness eine wetterunabhängige Alternative.';
  }

  const now = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  hint.innerHTML =
    '<span>' + escapeHtml(text) + '</span>' +
    '<small>Wetter aktualisiert ' + escapeHtml(now) + ' · Open-Meteo</small>';

  weatherGrid.appendChild(hint);
}

async function loadWeather() {
  const days = Array.from(document.querySelectorAll<HTMLElement>('[data-weather-date]'));
  const requestedDates = days.map(day => day.dataset.weatherDate).filter(Boolean) as string[];
  if (requestedDates.length === 0) return;

  const params = new URLSearchParams({
    latitude: '48.3705',
    longitude: '10.8978',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    timezone: 'Europe/Berlin',
    past_days: '2',
    forecast_days: '7',
  });

  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params.toString());
    if (!response.ok) throw new Error('Weather request failed');

    const data = await response.json() as WeatherResponse;
    if (!data.daily) throw new Error('Weather data missing');

    days.forEach(day => {
      const date = day.dataset.weatherDate;
      const value = day.querySelector<HTMLElement>('.weather-value');
      if (!date || !value) return;

      const index = data.daily!.time.indexOf(date);
      if (index < 0) {
        value.textContent = 'Wetter derzeit nicht verfügbar';
        return;
      }

      const code = data.daily!.weather_code[index];
      const max = Math.round(data.daily!.temperature_2m_max[index]);
      const min = Math.round(data.daily!.temperature_2m_min[index]);
      const probability = Math.round(data.daily!.precipitation_probability_max[index]);
      const precipitation = data.daily!.precipitation_sum[index];

      value.innerHTML =
        '<div class="weather-main">' +
          '<span class="weather-icon">' + weatherIcon(code) + '</span>' +
          '<div class="weather-reading">' +
            '<span class="weather-temp">' + max + '°</span>' +
            '<span class="weather-low">/ ' + min + '°</span>' +
          '</div>' +
        '</div>' +
        '<div class="weather-summary"><span class="weather-condition">' + escapeHtml(weatherLabel(code)) + '</span><span class="weather-rain">' + probability + '% · ' + precipitation.toFixed(1) + ' mm</span></div>';
    });

    renderWeatherHint(data.daily);
  } catch {
    days.forEach(day => {
      const value = day.querySelector<HTMLElement>('.weather-value');
      if (value) value.textContent = 'Wetter derzeit nicht verfügbar';
    });
  }
}

function isVisible(item: HTMLElement) {
  return !item.classList.contains('is-hidden') && !item.classList.contains('expired');
}

function renderCurrentFilters() {
  dayButtons.forEach(button => {
    const active = button.dataset.day === activeDay;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  categoryButtons.forEach(button => {
    const active = button.dataset.category === activeCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  filterableItems.forEach(item => {
    if (item.classList.contains('expired')) {
      item.classList.add('is-hidden');
      return;
    }

    const dayMatches = activeDay === 'all' || item.dataset.day === activeDay;
    const categoryMatchesCurrent = categoryMatches(item.dataset.category ?? '', activeCategory);
    item.classList.toggle('is-hidden', !(dayMatches && categoryMatchesCurrent));
  });

  const visibleTop = topCards.filter(isVisible).length;
  const visibleIdeas = ideaCards.filter(isVisible).length;
  const visibleHikes = hikeCards.filter(isVisible).length;
  const visibleBikes = bikeCards.filter(isVisible).length;
  const visibleTours = visibleHikes + visibleBikes;
  const visibleAll = filterableItems.filter(isVisible).length;

  topSection?.classList.toggle('is-hidden', visibleTop === 0);
  weekendSection?.classList.toggle('is-hidden', visibleIdeas === 0);
  hikeGroup?.classList.toggle('is-hidden', visibleHikes === 0);
  bikeGroup?.classList.toggle('is-hidden', visibleBikes === 0);
  outdoorSection?.classList.toggle('is-hidden', visibleTours === 0);

  if (statusText) {
    statusText.textContent =
      visibleTop === 1 ? '1 Empfehlung' : visibleTop + ' Empfehlungen';
  }

  if (resultCount) {
    resultCount.textContent =
      visibleAll === 1 ? '1 passende Idee' : visibleAll + ' passende Ideen';
  }

  if (resetFilters) {
    resetFilters.hidden = activeDay === 'all' && activeCategory === 'all';
  }
}

function syncDetailFavorite() {
  if (!detailFavorite || !detailFavoriteSource) return;
  const suggestionId = detailFavoriteSource.dataset.id ?? '';
  const saved = favorites.some(item => item.suggestionId === suggestionId);
  detailFavorite.textContent = saved ? 'Gemerkt' : 'Merken';
  detailFavorite.classList.toggle('saved', saved);
  detailFavorite.setAttribute('aria-pressed', String(saved));
}

function updateFavoriteButtons() {
  if (savedCount) savedCount.textContent = String(favorites.length);
  const savedIds = new Set(favorites.map(item => item.suggestionId));

  document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button => {
    const saved = savedIds.has(button.dataset.id ?? '');
    button.classList.toggle('saved', saved);
    button.textContent = saved ? 'Gemerkt' : 'Merken';
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute(
      'aria-label',
      saved
        ? (button.dataset.title ?? 'Vorschlag') + ' ist gemerkt'
        : (button.dataset.title ?? 'Vorschlag') + ' merken'
    );
  });

  syncDetailFavorite();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char] ?? char);
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function showFavoriteMessage(text: string) {
  if (!favoritesMessage) return;
  favoritesMessage.textContent = text;
}

function renderFavorites() {
  if (!favoritesList || !favoritesEmpty) return;
  favoritesList.innerHTML = '';

  const filtered = favorites.filter(item =>
    activeFavoriteCategory === 'all' ||
    categoryMatches(item.category, activeFavoriteCategory)
  );

  favoritesEmpty.hidden = filtered.length > 0;
  favoritesEmpty.textContent =
    favorites.length === 0
      ? 'Noch nichts gemerkt. Nutze bei einer Empfehlung „Merken“.'
      : 'Keine gemerkten Vorschläge in dieser Kategorie.';

  favoriteCategoryButtons.forEach(button => {
    const active = button.dataset.favoriteCategory === activeFavoriteCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  filtered.forEach(item => {
    const row = document.createElement('article');
    row.className = 'favorite-row';
    row.innerHTML =
      '<div class="favorite-copy">' +
      '<div class="favorite-meta">' + escapeHtml(['wandern', 'fahrrad'].includes(normalizeCategory(item.category)) ? item.category : [item.day, item.category].filter(Boolean).join(' · ')) + '</div>' +
      '<h3>' + escapeHtml(item.title) + '</h3>' +
      '<p>' + escapeHtml(item.description) + '</p>' +
      '</div>' +
      '<div class="favorite-actions">' +
      '<a class="info-link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener noreferrer">Originalquelle</a>' +
      '<button class="remove-favorite" type="button" data-remove="' + escapeAttr(item.id) + '">Entfernen</button>' +
      '</div>';
    favoritesList.appendChild(row);
  });

  favoritesList.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.remove;
      if (!id) return;

      button.disabled = true;
      try {
        const { error } = await supabase.from('favorites').delete().eq('id', id);
        if (error) throw error;

        favorites = favorites.filter(item => item.id !== id);
        renderFavorites();
        updateFavoriteButtons();
        showFavoriteMessage('Aus der Merkliste entfernt.');
      } catch {
        showFavoriteMessage('Konnte den Eintrag nicht entfernen.');
        button.disabled = false;
      }
    });
  });

  updateFavoriteButtons();
}

async function loadFavorites() {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id,suggestion_id,title,day,category,description,url,saved_at')
      .order('saved_at', { ascending: false });

    if (error) throw error;

    favorites = (data ?? []).map(item => ({
      id: item.id,
      suggestionId: item.suggestion_id,
      title: item.title,
      day: item.day,
      category: item.category,
      description: item.description,
      url: item.url,
      savedAt: item.saved_at,
    }));

    renderFavorites();
  } catch {
    showFavoriteMessage('Merkliste konnte gerade nicht geladen werden.');
  }
}

favoriteButtons.forEach(button => {
  button.addEventListener('click', async () => {
    const suggestionId = button.dataset.id;
    if (!suggestionId) return;

    const existing = favorites.find(item => item.suggestionId === suggestionId);
    if (existing) {
      showFavoriteMessage('Dieser Vorschlag ist bereits gemerkt.');
      return;
    }

    button.disabled = true;
    showFavoriteMessage('Wird gespeichert …');

    try {
      const category = button.dataset.categoryLabel ?? '';
      const record = {
        suggestion_id: suggestionId,
        title: button.dataset.title ?? '',
        day: ['wandern', 'fahrrad'].includes(normalizeCategory(category)) ? '' : (button.dataset.dayLabel ?? ''),
        category,
        description: button.dataset.description ?? '',
        url: button.dataset.url ?? '',
      };

      const { data, error } = await supabase
        .from('favorites')
        .insert(record)
        .select('id,suggestion_id,title,day,category,description,url,saved_at')
        .single();

      if (error) throw error;

      const saved: Favorite = {
        id: data.id,
        suggestionId: data.suggestion_id,
        title: data.title,
        day: data.day,
        category: data.category,
        description: data.description,
        url: data.url,
        savedAt: data.saved_at,
      };

      favorites = [saved, ...favorites];
      renderFavorites();
      showFavoriteMessage('Gespeichert. Die gemeinsame Merkliste ist auf allen Geräten identisch.');
    } catch {
      showFavoriteMessage('Speichern ist fehlgeschlagen. Bitte noch einmal versuchen.');
    } finally {
      button.disabled = false;
      updateFavoriteButtons();
    }
  });
});

dayButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeDay = button.dataset.day ?? 'all';
    renderCurrentFilters();
  });
});

categoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.category ?? 'all';
    renderCurrentFilters();
  });
});

favoriteCategoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeFavoriteCategory = button.dataset.favoriteCategory ?? 'all';
    renderFavorites();
  });
});

resetFilters?.addEventListener('click', () => {
  activeDay = 'all';
  activeCategory = 'all';
  renderCurrentFilters();
});

function openDetails(item: HTMLElement) {
  if (
    !detailDialog ||
    !detailTitle ||
    !detailDescription ||
    !detailMeta ||
    !detailFacts ||
    !detailBadge ||
    !detailSource
  ) return;

  const title =
    item.querySelector<HTMLElement>('h3, h4')?.textContent?.trim() ?? 'Details';
  const badge =
    item.querySelector<HTMLElement>('.badge, .idea-category, .tour-category, .mini-badge')?.textContent?.trim() ?? 'Freizeitidee';
  const description =
    item.querySelector<HTMLElement>('p')?.textContent?.trim() ?? '';
  const day =
    item.querySelector<HTMLElement>('.day, .idea-meta, time')?.textContent?.trim() ?? '';

  const factsSource = item.querySelector<HTMLElement>('.facts, .stats, .tour-meta');
  const source = item.querySelector<HTMLAnchorElement>('a.info-link');
  const favorite = item.querySelector<HTMLButtonElement>('[data-favorite]');

  detailTitle.textContent = title;
  detailBadge.textContent = badge;
  detailMeta.textContent = day;
  detailDescription.textContent = description;
  detailFacts.innerHTML = factsSource ? factsSource.outerHTML : '';

  if (source) {
    detailSource.href = source.href;
    detailSource.textContent = source.textContent?.includes('Tour') ? 'Tour öffnen' : 'Originalquelle';
    detailSource.hidden = false;
  } else {
    detailSource.hidden = true;
  }

  detailFavoriteSource = favorite ?? null;
  if (detailFavorite) detailFavorite.hidden = !detailFavoriteSource;
  syncDetailFavorite();

  detailDialog.showModal();
  detailClose?.focus();
}

function enhanceDetails() {
  document.querySelectorAll<HTMLElement>('.card, .idea-card, .tour-card, .discovery-item').forEach(item => {
    const actions = item.querySelector<HTMLElement>('.item-actions');
    if (!actions || actions.querySelector('[data-details]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'details-btn';
    button.dataset.details = 'true';
    button.textContent = 'Details';

    const source = actions.querySelector('a.info-link');
    actions.insertBefore(button, source);
    button.addEventListener('click', () => openDetails(item));
  });
}

detailClose?.addEventListener('click', () => detailDialog?.close());

detailDialog?.addEventListener('click', event => {
  if (event.target === detailDialog) detailDialog.close();
});

detailFavorite?.addEventListener('click', () => {
  detailFavoriteSource?.click();
});

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  if (!backToTop) return;
  backToTop.hidden = window.scrollY < 650;
}, { passive: true });

markPastItems();
markWeatherDays();
enhanceDetails();
renderCurrentFilters();
void loadFavorites();
void loadWeather();
}

void bootstrap();
