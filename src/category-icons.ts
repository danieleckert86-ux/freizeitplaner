// Lightweight SVG icons match the existing outline graphics and stay sharp on mobile.
const paths: Record<string,string> = {
  hike: '<path d="m3 20 7-15 4 8 3-5 4 12H3Z"/><path d="m8 9 2 2 2-2"/>',
  bike: '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9h-10l7-6h5l2 6M8 8h4M16 5h3l1 3"/>',
  food: '<path d="M5 3v7c0 2 4 2 4 0V3M7 3v18M19 3c-4 3-4 9 0 9V3Zm0 9v9"/>',
  comedy: '<path d="M3 4c4 2 7 2 11 0v7c0 5-5 8-5 8s-6-3-6-8V4Z"/><path d="M6 9h1m3 0h1M6 12c1 3 4 3 5 0M17 6l4-1v8c0 4-4 7-4 7l-3-2M17 10h1"/>',
  market: '<path d="M3 9h18l-2-6H5L3 9Zm1 0v12h16V9M8 21v-7h5v7M3 9c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
  music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  swim: '<circle cx="16" cy="5" r="2"/><path d="m4 12 5-4 5 4 4-3M9 8l-3-3M2 17c2-3 4 3 6 0s4 3 6 0 4 3 8 0M2 21c2-3 4 3 6 0s4 3 6 0 4 3 8 0"/>',
  kayak: '<path d="M3 15c4 6 14 6 18 0H3ZM6 3l12 12M4 2l4 4-2 2-4-4 2-2ZM16 14l4 4 2-2-4-4-2 2Z"/><circle cx="12" cy="8" r="2"/><path d="m10 12 2-2 3 3"/>',
  cafe: '<path d="M4 8h12v7c0 6-12 6-12 0V8ZM16 9h2a3 3 0 0 1 0 6h-2M3 21h16M7 2v3m6-3v3"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4m-11-7 5 3-5 3V9Z"/>',
  culture: '<path d="m3 8 9-5 9 5H3ZM3 21h18M5 10v8m5-8v8m4-8v8m5-8v8M3 18h18"/>',
  outdoor: '<path d="m12 3-7 9h4l-5 6h6v3h4v-3h6l-5-6h4l-7-9Z"/>',
  wellness: '<path d="M12 20c-6 0-9-5-9-9 4 0 7 2 9 5 2-3 5-5 9-5 0 4-3 9-9 9Z"/><path d="M12 16c-4-4-4-8 0-13 4 5 4 9 0 13Z"/>',
  idea: '<path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z"/>'
};
export function categoryIcon(category: string, context = ''): string {
  const text = (category + ' ' + context).toLowerCase();
  const kind = /kabarett|comedy|komik|satire/.test(text) ? 'comedy'
    : /wandern|wanderung|hike|alpspitz/.test(text) ? 'hike'
    : /fahrrad|radfahren|radtour|bike/.test(text) ? 'bike'
    : /kajak|paddeln/.test(text) ? 'kayak'
    : /schwimmen/.test(text) ? 'swim'
    : /café|cafe|kaffee/.test(text) ? 'cafe'
    : /markt|märkte|feste/.test(text) ? 'market'
    : /musik|konzert|folk|singer/.test(text) ? 'music'
    : /kino|film|stream|serie/.test(text) ? 'film'
    : /restaurant|essen|gastro/.test(text) ? 'food'
    : /wellness|yoga/.test(text) ? 'wellness'
    : /kultur|theater|museum/.test(text) ? 'culture'
    : /outdoor|draußen|spazier|garten/.test(text) ? 'outdoor' : 'idea';
  return '<svg class="category-icon icon-' + kind + '" data-category-icon="' + kind + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths[kind] + '</svg>';
}
