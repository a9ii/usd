import { currentMonth, isMonth, normalizeRates, type RatesResult } from './rates';
type Entry = { result: RatesResult; savedAt: number };
const memory = new Map<string,Entry>();
const pending = new Map<string,Promise<RatesResult>>();
const ROOT = 'https://gallery.a9ii.com/usd/';
const MAX_STALE = 24 * 60 * 60 * 1000;
async function load(month: string): Promise<RatesResult> {
 const ttl = month === currentMonth() ? 60000 : 900000;
 const key = new Request(`https://rates-cache.internal/month/${month}`);
 const cache = typeof caches !== 'undefined' && 'default' in caches ? (caches as unknown as {default:Cache}).default : undefined;
 let saved = memory.get(month);
 if (!saved && cache) { try { const response = await cache.match(key); if(response) saved = await response.json() as Entry; } catch {} }
 if(saved && Date.now()-saved.savedAt < ttl) return saved.result;
 for (const path of [`api/rates/history?month=${month}`,`index.php?route=api/rates/history&month=${month}`]) {
  try {
   const response = await fetch(ROOT+path, {signal:AbortSignal.timeout(4500),headers:{Accept:'application/json'}});
   if(!response.ok) continue;
   const body = await response.json() as {status?:string};
   if(body.status !== 'success') continue;
   const result = {data:normalizeRates(body, month),month,stale:false};
   const entry = {result,savedAt:Date.now()};
   if(memory.size>=24) memory.delete(memory.keys().next().value!);
   memory.set(month,entry);
   if(cache) { try { await cache.put(key,Response.json(entry,{headers:{'Cache-Control':'public, max-age=86400'}})); } catch {} }
   return result;
  } catch {}
 }
 if(saved && Date.now()-saved.savedAt < MAX_STALE) return {...saved.result,stale:true};
 throw new Error('تعذر الاتصال بمصدر الأسعار. حاول مجددًا.');
}
export async function getRates(month: string): Promise<RatesResult> {
 if(!isMonth(month)) throw new Error('شهر غير صالح');
 const existing = pending.get(month); if(existing) return existing;
 const task = load(month).finally(()=>pending.delete(month)); pending.set(month,task); return task;
}
