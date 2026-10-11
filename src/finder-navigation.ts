// Classify saved research by its nature, never by whether it was favorited.
export function favoriteArea(category:string,date?:string):'ideas'|'current' {
 if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))return 'current';
 const c=category.toLocaleLowerCase('de');
 return /wander|fahrrad|radtour|restaurant|café|cafe|gastr|essen|wellness|schwimm|kajak|camper|spazier/.test(c)?'ideas':'current';
}
