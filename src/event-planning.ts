/** Public booking evidence; separate from personal taste and event availability. */
export type AdvanceBooking={reason:string;sourceUrl:string;verifiedAt:string};
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function validAdvanceBooking(v:unknown):v is AdvanceBooking{
 if(!v||typeof v!=='object')return false;const a=v as AdvanceBooking;
 if(typeof a.reason!=='string'||!a.reason.trim()||a.reason.length>2000||typeof a.verifiedAt!=='string'||!a.verifiedAt.includes('T')||!Number.isFinite(Date.parse(a.verifiedAt)))return false;
 try{const u=new URL(a.sourceUrl);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}
export type TicketPrice={amount:number;currency:'EUR';basis:'regular-adult';sourceUrl:string;verifiedAt:string};
export function validTicketPrice(v:unknown):v is TicketPrice{
 if(!v||typeof v!=='object')return false;const p=v as TicketPrice;
 if(typeof p.amount!=='number'||!Number.isFinite(p.amount)||p.amount<0||p.currency!=='EUR'||p.basis!=='regular-adult'||typeof p.verifiedAt!=='string'||!p.verifiedAt.includes('T')||!Number.isFinite(Date.parse(p.verifiedAt)))return false;
 try{const u=new URL(p.sourceUrl);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}
/** Price is a user-chosen approximation, never a claim of scarcity. */
export function advanceBookingReason(x:{date?:string|null;ticketPrice?:TicketPrice;bookingDeadline?:string|null;advanceBooking?:AdvanceBooking},today:string):string|null{
 if(!day(x.date)||x.date<today||!validTicketPrice(x.ticketPrice)||x.ticketPrice.amount<=15||x.ticketPrice.verifiedAt.slice(0,10)>today)return null;
 return 'Regulärer Eintritt: '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(x.ticketPrice.amount)+' pro Person';
}
