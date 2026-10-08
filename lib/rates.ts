export const REGION_KEYS = ['baghdad', 'north', 'basra'] as const;
export type Region = typeof REGION_KEYS[number];
export type RateType = 'sell' | 'buy';
export type Rate = Record<RateType, number | null>;
export type Row = { timestamp: string; date_label: string } & Record<Region, Rate>;
export type RatesResult = { data: Row[]; month: string; stale: boolean };
export const isMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export function currentMonth() {
 const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Baghdad', year:'numeric', month:'2-digit' }).formatToParts(new Date());
 return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
}
export const fmt = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits:0 }).format(value);
export const monthLabel = (month: string) => new Intl.DateTimeFormat('ar-IQ', { month:'long',year:'numeric',timeZone:'Asia/Baghdad' }).format(new Date(month+'-15T12:00:00Z'));
export function normalizeRates(input: unknown, month: string): Row[] {
 if (!input || typeof input !== 'object' || !('data' in input) || !Array.isArray(input.data)) throw new Error('Invalid response');
 const rows: Row[] = [];
 for (const value of input.data) {
  if (!value || typeof value !== 'object' || typeof value.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value.timestamp) || !value.timestamp.startsWith(month)) continue;
  const row = { timestamp:value.timestamp, date_label:String(value.date_label || value.timestamp) } as Row;
  for (const key of REGION_KEYS) {
   row[key] = {sell:null,buy:null};
   for (const type of ['sell','buy'] as const) {
    const raw = value[key]?.[type];
    const rate = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
    if(Number.isFinite(rate) && rate > 0) row[key][type] = rate;
   }
  }
  if (REGION_KEYS.some(key=>row[key].sell !== null || row[key].buy !== null)) rows.push(row);
 }
 return [...new Map(rows.map(row=>[row.timestamp,row])).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
