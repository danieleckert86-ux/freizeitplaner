import './styles.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mcpkvssierkwmueekyec.supabase.co',
  'sb_publishable_LKYbSfFZ4WBWPnRpLfxyFQ_tqMGThd2'
);

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

    if (date < today) {
      const value = day.querySelector<HTMLElement>('.weather-value');
      if (value) value.textContent = 'Tag bereits vorbei';
    }
  });
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

  favoriteButtons.forEach(button => {
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
      '<div class="favorite-meta">' + escapeHtml(item.day) + ' · ' + escapeHtml(item.category) + '</div>' +
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
      const record = {
        suggestion_id: suggestionId,
        title: button.dataset.title ?? '',
        day: button.dataset.dayLabel ?? '',
        category: button.dataset.categoryLabel ?? '',
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
