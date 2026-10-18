/** Public booking evidence; separate from personal taste and event availability. */
export type AdvanceBooking={reason:string;sourceUrl:string;verifiedAt:string};
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validAdvanceBooking(v:unknown):v is AdvanceBooking{
 if(!v||typeof v!=='object')return false;const a=v as AdvanceBooking;
 if(typeof a.reason!=='string'||!a.reason.trim()||a.reason.length>2000||typeof a.verifiedAt!=='string'||!a.verifiedAt.includes('T')||!Number.isFinite(Date.parse(a.verifiedAt)))return false;
 try{const u=new URL(a.sourceUrl);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}
export function advanceBookingReason(x:{date?:string|null;bookingDeadline?:string|null;advanceBooking?:AdvanceBooking},today:string):string|null{
 if(!day(x.date)||x.date<today)return null;
 // An actual future registration deadline is itself a concrete planning reason.
 if(day(x.bookingDeadline)&&x.bookingDeadline>=today&&x.bookingDeadline<=x.date)return 'Buchungsfrist: '+x.bookingDeadline.split('-').reverse().join('.');
 if(!validAdvanceBooking(x.advanceBooking)||x.advanceBooking.verifiedAt.slice(0,10)>today)return null;
 return x.advanceBooking.reason.trim();
}
