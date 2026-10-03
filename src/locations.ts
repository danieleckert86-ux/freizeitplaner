type Located = { title: string; description?: string; location?: string; venue?: string; city?: string; address?: string; badge?: string; facts?: string[]; meta?: string[]; platform?: string };
const venues = /Grandhotel Cosmopolis|Kresslesmühle|Soho Stage|Sensemble(?: Theater)?|Kulturhaus abraxas|abraxas|Märchenzelt|Schloss Scherneck|Glaspalast(?: Augsburg)?|Brechthaus(?: Augsburg)?|Maximilianmuseum|Provino Club|Ballonfabrik|KAPPENECK|Kantine(?: Augsburg)?|Zeughaus|Gaswerk|CineStar(?: Augsburg)?|CinemaxX(?: Augsburg)?|Thalia(?: Augsburg)?|Stadtmarkt(?: Augsburg)?/gi;
const towns = /Bad Hindelang|Hinterstein|Eisenburg|Memmingen|Pfronten|Nesselwang|Gundelfingen|Bächingen|Neusäß|Welden|Rehling|Bad Wörishofen|Jakobervorstadt/gi;
export function recommendationPlace(item: Located, section = ''): string {
  if (section === 'stream') return 'Zu Hause' + (item.platform ? ' · ' + item.platform : '');
  const explicit = [item.venue, item.location, item.address, item.city].filter((x): x is string => Boolean(x?.trim()));
  if (explicit.length) return [...new Set(explicit)].join(' · ');
  const meta = [...(item.facts || []), ...(item.meta || [])];
  const titleVenues = item.title.match(venues) || [];
  const titleTowns = item.title.match(towns) || [];
  const text = [item.title, ...meta, item.description || ''].join(' ');
  const placeVenues = titleVenues.length ? titleVenues : text.match(venues) || [];
  const placeTowns = titleTowns.length ? titleTowns : text.match(towns) || [];
  const address = meta.find(x => /(?:straße|strasse|gasse|gässchen|platz|Hinter der Metzg)\s*\d+/i.test(x));
  const city = /Augsburg/i.test([item.title, item.badge, ...meta].join(' ')) ? 'Augsburg' : '';
  const candidates = [...placeVenues.slice(0,1), ...placeTowns.slice(0,2), ...(address ? [address] : []), ...(city ? [city] : [])];
  const place = [...new Set(candidates.map(x => x.replace(/^abraxas$/i,'Kulturhaus abraxas')))].join(' · ');
  return place || meta.find(x => /Allgäu|Donautal|Donauried|Holzwinkel/i.test(x)) || 'Ort in Quelle prüfen';
}
export function travelNote(item: Located): string {
  return (item.meta || []).find(x => /^Anfahrt\b/i.test(x)) || '';
}
