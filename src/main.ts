import './styles.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://mcpkvssierkwmueekyec.supabase.co', 'sb_publishable_LKYbSfFZ4WBWPnRpLfxyFQ_tqMGThd2');

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
const topCards = Array.from(document.querySelectorAll<HTMLElement>('.card[data-day]'));
const alternatives = Array.from(document.querySelectorAll<HTMLElement>('.alt[data-day]'));
const weekdayTips = Array.from(document.querySelectorAll<HTMLElement>('.weekday-tip[data-day]'));
const weekdaySection = document.querySelector<HTMLElement>('#weekdaySection');
const topSection = document.querySelector<HTMLElement>('#topSection');
const weekendSection = document.querySelector<HTMLElement>('#weekendSection');
const statusText = document.querySelector<HTMLElement>('#statusText');
const favoriteButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-favorite]'));
const favoritesList = document.querySelector<HTMLElement>('#favoritesList');
const favoritesEmpty = document.querySelector<HTMLElement>('#favoritesEmpty');
const favoritesMessage = document.querySelector<HTMLElement>('#favoritesMessage');
const savedCount = document.querySelector<HTMLElement>('#savedCount');
const outdoorList = document.querySelector<HTMLElement>('#outdoorList');

// Keep outdoor decisions separate from event alternatives without duplicating data.
if (outdoorList) {
  alternatives.filter(item => ['wandern', 'fahrrad'].includes(item.dataset.category ?? '')).forEach(item => outdoorList.appendChild(item));
}

let activeDay = 'all';
let activeCategory = 'all';
let activeFavoriteCategory = 'all';
let favorites: Favorite[] = [];

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

  let visibleTop = 0;
  topCards.forEach(card => {
    const dayMatches = activeDay === 'all' || card.dataset.day === activeDay;
    const categoryMatches = activeCategory === 'all' || card.dataset.category === activeCategory;
    const show = dayMatches && categoryMatches;
    card.classList.toggle('is-hidden', !show);
    if (show) visibleTop += 1;
  });

  alternatives.forEach(item => {
    const dayMatches = activeDay === 'all' || item.dataset.day === activeDay;
    const categoryMatches = activeCategory === 'all' || item.dataset.category === activeCategory;
    item.classList.toggle('is-hidden', !(dayMatches && categoryMatches));
  });

  let visibleWeekday = 0;
  weekdayTips.forEach(item => {
    if (!item.classList.contains('is-hidden')) visibleWeekday += 1;
  });

  const weekdayDays = new Set(['mo', 'di', 'mi', 'do']);
  const weekendDays = new Set(['fr', 'sa', 'so']);
  const selectingWeekday = weekdayDays.has(activeDay);
  const selectingWeekend = weekendDays.has(activeDay);

  weekdaySection?.classList.toggle('is-hidden', selectingWeekend || (activeDay !== 'all' && visibleWeekday === 0));
  topSection?.classList.toggle('is-hidden', selectingWeekday);
  weekendSection?.classList.toggle('is-hidden', selectingWeekday);

  if (statusText) {
    statusText.textContent = visibleTop === 1 ? '1 Top-Empfehlung' : visibleTop + ' Top-Empfehlungen';
  }
}

function updateFavoriteButtons() {
  if (savedCount) savedCount.textContent = String(favorites.length);
  const savedIds = new Set(favorites.map(item => item.suggestionId));
  favoriteButtons.forEach(button => {
    const saved = savedIds.has(button.dataset.id ?? '');
    button.classList.toggle('saved', saved);
    button.textContent = saved ? '★ Gemerkt' : '☆ Merken';
    button.setAttribute('aria-pressed', String(saved));
  });
}

function renderFavorites() {
  if (!favoritesList || !favoritesEmpty) return;
  favoritesList.innerHTML = '';

  const filtered = favorites.filter(item => {
    return activeFavoriteCategory === 'all' || normalizeCategory(item.category) === activeFavoriteCategory;
  });

  favoritesEmpty.hidden = filtered.length > 0;
  favoritesEmpty.textContent =
    favorites.length === 0
      ? 'Noch nichts gemerkt. Tippe bei einer Empfehlung auf „☆ Merken“.'
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
      '<a class="info-link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener noreferrer">Mehr Infos ↗</a>' +
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
        const { error } = await supabase.from('favorites').delete().eq('id', id); if (error) throw error;
        favorites = favorites.filter(item => item.id !== id);
        renderFavorites();
        updateFavoriteButtons();
      } catch {
        showFavoriteMessage('Konnte den Eintrag nicht entfernen.');
        button.disabled = false;
      }
    });
  });

  updateFavoriteButtons();
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

async function loadFavorites() {
  try {
    const { data, error } = await supabase.from('favorites').select('id,suggestion_id,title,day,category,description,url,saved_at').order('saved_at', { ascending: false });
    if (error) throw error;
    favorites = (data ?? []).map(item => ({ id: item.id, suggestionId: item.suggestion_id, title: item.title, day: item.day, category: item.category, description: item.description, url: item.url, savedAt: item.saved_at }));
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
      const record = { suggestion_id: suggestionId, title: button.dataset.title ?? '', day: button.dataset.dayLabel ?? '', category: button.dataset.categoryLabel ?? '', description: button.dataset.description ?? '', url: button.dataset.url ?? '' };
      const { data, error } = await supabase.from('favorites').insert(record).select('id,suggestion_id,title,day,category,description,url,saved_at').single();
      if (error) throw error;
      const saved: Favorite = { id: data.id, suggestionId: data.suggestion_id, title: data.title, day: data.day, category: data.category, description: data.description, url: data.url, savedAt: data.saved_at };
      favorites = [saved, ...favorites];
      renderFavorites();
      showFavoriteMessage('Gespeichert. Die gemeinsame Merkliste ist auf allen Geräten identisch.');
    } catch {
      showFavoriteMessage('Speichern ist fehlgeschlagen. Bitte noch einmal versuchen.');
    } finally {
      button.disabled = false;
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

renderCurrentFilters();
void loadFavorites();