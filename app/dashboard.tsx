'use client';
import {useEffect,useState,useRef,useCallback} from 'react';
import {Landmark,Mountain,Anchor,RefreshCw,Sun,Moon,ChartNoAxesCombined,Clock3,ChevronRight,ChevronLeft,TrendingUp,TrendingDown,Minus,Info} from 'lucide-react';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';
import {Button} from '@/components/ui/button';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import RateChart from '@/components/rate-chart';
import {fmt,currentMonth,monthLabel,normalizeRates,type Row,type Region,type RateType,type RatesResult} from '@/lib/rates';
const regions:{key:Region;name:string;en:string;color:string;icon:typeof Landmark}[]=[
 {key:'baghdad',name:'بغداد',en:'BAGHDAD',color:'#4677c2',icon:Landmark},
 {key:'north',name:'أربيل والشمال',en:'ERBIL & NORTH',color:'#218875',icon:Mountain},
 {key:'basra',name:'البصرة والجنوب',en:'BASRA & SOUTH',color:'#be782c',icon:Anchor},
];
function Delta({value}:{value:number|null}) {
 const Icon=value==null||value===0?Minus:value>0?TrendingUp:TrendingDown;
 return <span className={`delta ${value===0||value==null?'neutral':value>0?'up':'down'}`} aria-label={value==null?'لا توجد قراءة سابقة':value===0?'بدون تغيير':`${value>0?'ارتفاع':'انخفاض'} ${fmt(Math.abs(value))} دينار`}><Icon size={14} aria-hidden="true"/><b dir="ltr">{value==null?'—':value===0?'ثابت':`${value>0?'+':''}${fmt(value)}`}</b></span>;
}
async function fetchMonth(month:string,signal:AbortSignal):Promise<RatesResult> {
 const response=await fetch('/api/rates?month='+month,{signal});
 if(!response.ok)throw new Error('تعذر الاتصال بالمصدر');
 const json=await response.json() as RatesResult;
 return {...json,data:normalizeRates(json,month)};
}
export default function Dashboard({initial,initialError}:{initial:RatesResult;initialError:string}) {
 const [month,setMonth]=useState(initial.month);
 const [latest,setLatest]=useState(initial.data);
 const [history,setHistory]=useState(initial.data);
 const [type,setType]=useState<RateType>('sell');
 const [region,setRegion]=useState('all');
 const [dark,setDark]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(initialError);
 const [chartError,setChartError]=useState(initialError);
 const [chartBusy,setChartBusy]=useState(false);
 const [sourceStale,setSourceStale]=useState(initial.stale);
 const [retry,setRetry]=useState(0);
 const [now,setNow]=useState(0);
 const latestController=useRef<AbortController|null>(null);
 const monthCache=useRef(new Map([[initial.month,initial]]));
 const refresh=useCallback(async()=>{
  latestController.current?.abort();const controller=new AbortController();latestController.current=controller;
  setBusy(true);setError('');
  try {const result=await fetchMonth(currentMonth(),controller.signal);monthCache.current.set(result.month,result);setLatest(result.data);setSourceStale(result.stale);setNow(Date.now());}
  catch {if(!controller.signal.aborted)setError('تعذر تحديث الأسعار من المصدر. أعد المحاولة.');}
  finally {if(!controller.signal.aborted)setBusy(false);}
 },[]);
 useEffect(()=>{
  try {setDark(localStorage.getItem('iraq-theme')==='dark');}catch{}
  setNow(Date.now());
  if(!initial.data.length)void refresh();
  const clock=setInterval(()=>setNow(Date.now()),60000);
  const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},3600000);
  const visible=()=>{if(document.visibilityState==='visible'){setNow(Date.now());void refresh();}};
  document.addEventListener('visibilitychange',visible);
  return()=>{clearInterval(clock);clearInterval(timer);latestController.current?.abort();document.removeEventListener('visibilitychange',visible);};
 },[refresh,initial.data.length]);
 useEffect(()=>{
  if(month===currentMonth()){setHistory(latest);setChartError(error);setChartBusy(busy);return;}
  const cached=monthCache.current.get(month);if(cached){setHistory(cached.data);setChartError('');setChartBusy(false);return;}
  const controller=new AbortController();setChartBusy(true);setChartError('');
  fetchMonth(month,controller.signal).then(result=>{if(monthCache.current.size>=24)monthCache.current.delete(monthCache.current.keys().next().value!);monthCache.current.set(month,result);setHistory(result.data);}).catch(()=>{if(!controller.signal.aborted){setHistory([]);setChartError('تعذر تحميل السجل من المصدر.');}}).finally(()=>{if(!controller.signal.aborted)setChartBusy(false);});
  return()=>controller.abort();
 },[month,latest,error,busy,retry]);
 const last=latest.at(-1),previous=latest.at(-2);
 const stamp=last?new Date(last.timestamp.replace(' ','T')+'+03:00'):null;
 const stale=sourceStale||Boolean(stamp&&now&&now-stamp.getTime()>7200000);
 const shift=(delta:number)=>{const date=new Date(month+'-15T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);setMonth(date.toISOString().slice(0,7));};
 const toggleTheme=()=>setDark(value=>{try{localStorage.setItem('iraq-theme',!value?'dark':'light')}catch{}return !value});
 useEffect(()=>{
  const context=(document as any).modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  Promise.resolve(context.registerTool({name:'read_exchange_rates',description:'Read the displayed Iraqi exchange rates for 100 USD, with source timestamp.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({timestamp:last?.timestamp??null,stale,rates:last?Object.fromEntries(regions.map(r=>[r.key,{sell:last[r.key].sell===null?null:last[r.key].sell!*100,buy:last[r.key].buy===null?null:last[r.key].buy!*100}])):null,error:error||null})},{signal:lifecycle.signal})).catch(()=>{});
  return()=>lifecycle.abort();
 },[last,error,stale]);
 return <div className={`site ${dark?'dark':''}`}>
  <a className="skip-link" href="#main">انتقل إلى أسعار الصرف</a>
  <header className="topbar"><div className="bar-inner">
   <a className="brand" href="/" aria-label="دولار العراق — الرئيسية"><span className="brand-mark" aria-hidden="true">$</span><span>دولار العراق<small lang="en">IRAQ EXCHANGE</small></span></a>
   <nav className="nav-label" aria-label="أقسام الصفحة"><a className="nav-active" href="#markets">أسعار اليوم</a><a href="#history">حركة الأسعار</a><a href="#about">عن الأسعار</a></nav>
   <Button className="theme-button" variant="ghost" onClick={toggleTheme} aria-pressed={dark} aria-label={dark?'تفعيل الوضع الفاتح':'تفعيل الوضع الداكن'}>{dark?<Sun aria-hidden="true"/>:<Moon aria-hidden="true"/>}<span>{dark?'الوضع الفاتح':'الوضع الداكن'}</span></Button>
  </div></header>
  <main id="main" tabIndex={-1}>
   <section className="intro"><div><div className="eyebrow">الدولار الأمريكي <span>/</span> الدينار العراقي</div><h1>سعر الدولار اليوم في العراق<span>.</span></h1><p>أسعار البيع والشراء في بغداد وأربيل والبصرة، في مكان واحد.</p></div>
    <div className="intro-meta"><span className={`status ${error||stale||!last?'muted-status':''}`} role="status"><i aria-hidden="true"/>{error?'تعذر الاتصال':busy?'جارٍ التحديث':!last?'لا توجد قراءة بعد':stale?'آخر بيانات متاحة':'تم جلب الأسعار من المصدر'}</span><div className="updated"><Clock3 size={15} aria-hidden="true"/><span>آخر تحديث</span><time dir="ltr" dateTime={last?last.timestamp.replace(' ','T')+'+03:00':undefined}>{last?.timestamp.slice(0,16)??'—'}</time><span>بغداد</span></div></div>
   </section>
   <section id="markets" aria-labelledby="markets-title"><div className="section-bar"><h2 id="markets-title"><span className="section-line"/>أسعار الصرف الحالية</h2><div className="section-actions"><span className="unit-pill"><b dir="ltr">100 USD</b><span>مقابل الدينار العراقي</span></span><Button variant="ghost" className="refresh" onClick={refresh} disabled={busy} aria-label="تحديث الأسعار"><RefreshCw size={18} className={busy?'spin':''} aria-hidden="true"/></Button></div></div>
    {error&&<div role="alert" className="alert">{error} {last&&'المعروض آخر بيانات تم تحميلها.'}<Button variant="ghost" onClick={refresh} disabled={busy}>إعادة المحاولة</Button></div>}
    <div className="markets">{regions.map((r,index)=>{const Icon=r.icon;return <article key={r.key} className={`market ${index===0?'featured':''}`} aria-labelledby={`city-${r.key}`}><div className="market-heading"><div className="market-title"><div className="city-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true"/></div><div><h3 id={`city-${r.key}`}>{r.name}</h3><small lang="en">{r.en}</small></div></div><span className="market-number" aria-hidden="true">0{index+1}</span></div><dl className="price-pair">{(['sell','buy'] as const).map(t=>{const value=last?.[r.key][t],prior=previous?.[r.key][t];return <div className="price" key={t}><dt className="price-label">سعر {t==='sell'?'البيع':'الشراء'}</dt><dd><strong dir="ltr">{fmt(value==null?null:value*100)}</strong><div className="price-meta"><span>دينار عراقي</span><Delta value={value==null||prior==null?null:Math.round((value-prior)*100)}/></div></dd></div>})}</dl><div className="market-footer"><span>مقارنة بالقراءة السابقة</span><span>لكل 100 دولار</span></div></article>})}</div>
   </section>
   <section className="history-panel" id="history" aria-labelledby="history-title"><div className="chart-heading"><div><div className="chart-title"><ChartNoAxesCombined size={22} aria-hidden="true"/><h2 id="history-title">حركة أسعار الدولار</h2></div><p>قارن الأسواق وتتبّع تغيّر الأسعار خلال الشهر</p></div><div className="month-picker"><Button variant="ghost" onClick={()=>shift(-1)} aria-label="الشهر السابق"><ChevronRight size={18}/></Button><strong aria-live="polite">{monthLabel(month)}</strong><Button variant="ghost" onClick={()=>shift(1)} disabled={month>=currentMonth()} aria-label="الشهر التالي"><ChevronLeft size={18}/></Button></div></div>
    <div className="chart-toolbar"><ToggleGroup type="single" dir="rtl" value={type} onValueChange={v=>{if(v)setType(v as RateType)}} className="segments" aria-label="نوع السعر"><ToggleGroupItem value="sell">سعر البيع</ToggleGroupItem><ToggleGroupItem value="buy">سعر الشراء</ToggleGroupItem></ToggleGroup><ToggleGroup type="single" dir="rtl" value={region} onValueChange={v=>{if(v)setRegion(v)}} className="region-tabs" aria-label="الأسواق المعروضة"><ToggleGroupItem value="all">الجميع</ToggleGroupItem>{regions.map(r=><ToggleGroupItem value={r.key} key={r.key}><span style={{background:r.color}} className="legend-dot" aria-hidden="true"/>{r.key==='baghdad'?'بغداد':r.key==='north'?'أربيل':'البصرة'}</ToggleGroupItem>)}</ToggleGroup></div>
    <div className="chart-unit">دينار عراقي / 100 دولار أمريكي</div><div className="chart-area" dir="ltr" aria-busy={chartBusy}>{chartBusy?<div className="chart-state" role="status"><RefreshCw className="spin"/><p>جارٍ تحميل حركة الأسعار…</p></div>:chartError?<div className="chart-state" role="alert"><Info/><p>{chartError}</p><Button onClick={()=>month===currentMonth()?refresh():setRetry(v=>v+1)}>إعادة المحاولة</Button></div>:!history.length?<div className="chart-state"><ChartNoAxesCombined/><p>لا توجد بيانات لهذا الشهر</p></div>:<RateChart key={`${month}-${type}-${region}`} rows={history} type={type} region={region}/>}</div><div className="chart-bottom"><span><Clock3 size={14} aria-hidden="true"/> جميع الأوقات بتوقيت بغداد <b dir="ltr">GMT+3</b></span><span>{history.length?`${history.length} قراءة خلال الشهر`:'لا توجد قراءات'}</span></div>
   </section>
   <div className="notes"><Info size={19} aria-hidden="true"/><p>جميع الأسعار مقابل <b>100 دولار أمريكي</b>. التغيّر محسوب مقارنة بالقراءة السابقة، ويظهر وقت تحديث المصدر أعلى الصفحة.</p></div>
   <section id="about" className="about-prices" aria-labelledby="about-title"><div><span className="eyebrow">دليل المتابعة</span><h2 id="about-title">فهم أسعار الصرف</h2><p>قراءة أوضح للسعر ووحدة العرض ومصدر البيانات.</p></div><Accordion type="single" collapsible className="faq">
    <AccordionItem value="unit"><AccordionTrigger>هل السعر المعروض لدولار واحد أم 100 دولار؟</AccordionTrigger><AccordionContent>الأسعار في البطاقات والمخطط مقابل 100 دولار أمريكي، ووحدتها الدينار العراقي. لمعرفة قيمة الدولار الواحد، اقسم السعر المعروض على 100.</AccordionContent></AccordionItem>
    <AccordionItem value="updates"><AccordionTrigger>كيف يتم تحديث أسعار بغداد وأربيل والبصرة؟</AccordionTrigger><AccordionContent>تُجلب الأسعار من المصدر نفسه المستخدم في الموقع الأصلي، والمنسوب إلى بورصة العراق. يعيد الموقع جلب البيانات كل ساعة أثناء فتحه، ويمكن تحديثها يدويًا. وقت آخر تحديث هو وقت القراءة التي يرسلها المصدر، وليس وقت فتح الصفحة.</AccordionContent></AccordionItem>
    <AccordionItem value="history"><AccordionTrigger>كيف أراجع أسعار الأشهر السابقة؟</AccordionTrigger><AccordionContent>استخدم أزرار الشهر في قسم حركة الأسعار، ثم اختر سعر البيع أو الشراء والسوق المطلوب. يعرض المخطط القراءات المتاحة في المصدر؛ وإذا لم تتوفر بيانات لشهر معيّن فستظهر رسالة توضح ذلك.</AccordionContent></AccordionItem>
   </Accordion></section>
   <footer><div className="footer-brand"><span aria-hidden="true">$</span> دولار العراق <em>/</em><span>متابعة أسعار الأسواق العراقية</span></div><div>المصدر: <a href="https://iraqborsa.com/" target="_blank" rel="noreferrer">بورصة العراق</a><i aria-hidden="true"/>تحديث تلقائي كل ساعة</div></footer>
  </main>
 </div>;
}
