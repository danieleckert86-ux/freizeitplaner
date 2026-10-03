// Personal names stay in calendar ownership; recommendation prose stays neutral.
export function neutralDescription(value = ''): string {
  return value.replace(/\b(?:Eva und Daniel|Daniel und Eva)\b/gi, 'euch')
    .replace(/\bmit Eva\b/g, 'gemeinsam')
    .replace(/\bEva\b/g, 'deine Partnerin')
    .replace(/\bDaniel\b/g, 'dich');
}
