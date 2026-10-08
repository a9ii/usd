'use client';
import {Slider} from '@/components/ui/slider';
import {useMemo,useState,useId,useRef,useEffect} from 'react';
import {fmt,type Row,type Region,type RateType,REGION_KEYS} from '@/lib/rates';
const config:Record<Region,{name:string;color:string}>={baghdad:{name:'بغداد',color:'#4677c2'},north:{name:'أربيل',color:'#218875'},basra:{name:'البصرة',color:'#be782c'}};
const H=280,L=67,R=18,T=15,B=42;
export default function RateChart({rows,type,region}:{rows:Row[];type:RateType;region:string}) {
 const container=useRef<HTMLDivElement>(null);const [W,setWidth]=useState(1000);
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(240,Math.round(entries[0].contentRect.width))));observer.observe(node);return()=>observer.disconnect();},[]);
 const id=useId();const [active,setActive]=useState<number|null>(null);
 const keys=REGION_KEYS.filter(key=>region==='all'||region===key);
 const {points,min,max,paths}=useMemo(()=>{
  const points=rows.map(row=>({time:new Date(row.timestamp.replace(' ','T')+'+03:00').getTime(),row}));
  const values=points.flatMap(p=>keys.map(k=>p.row[k][type]).filter((v):v is number=>v!==null).map(v=>v*100));
  const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):1000;
  const padding=Math.max(100,(hi-lo)*.15),min=Math.floor((lo-padding)/100)*100,max=Math.ceil((hi+padding)/100)*100;
  const start=points[0]?.time||0,end=points.at(-1)?.time||start;
  const x=(time:number)=>end===start?(W+L-R)/2:L+(time-start)/(end-start)*(W-L-R);
  const y=(value:number)=>T+(max-value)/(max-min)*(H-T-B);
  const paths=keys.map(key=>{let open=false;const d=points.map(p=>{const value=p.row[key][type];if(value===null){open=false;return ''}const c=`${open?'L':'M'}${x(p.time).toFixed(1)},${y(value*100).toFixed(1)}`;open=true;return c}).join(' ');return {key,d}});
  return {points:points.map(p=>({...p,x:x(p.time),y})),min,max,paths};
 // region/type fully describe the stable subset of keys.
 },[rows,type,region,W]);
 const selected=active===null?null:points[Math.min(active,points.length-1)];
 const ticks=Array.from({length:5},(_,i)=>max-(max-min)*i/4);
 const date=(timestamp:string)=>timestamp.slice(8,10)+' / '+timestamp.slice(5,7);
 const inspect=(event:React.PointerEvent<SVGSVGElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();const x=(event.clientX-bounds.left)/bounds.width*W;let best=0;let distance=Infinity;points.forEach((p,i)=>{if(Math.abs(p.x-x)<distance){best=i;distance=Math.abs(p.x-x)}});setActive(best)};
 return <div className="light-chart" ref={container}><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={e=>{if(e.pointerType==='mouse')setActive(null)}} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
 <title id={`${id}-title`}>حركة سعر {type==='sell'?'البيع':'الشراء'} مقابل 100 دولار</title><desc id={`${id}-desc`}>القراءات الفعلية من المصدر. استخدم شريط اختيار القراءة أسفل الرسم للاطلاع على الأسعار بالتفصيل.</desc>
 {ticks.map((value,i)=><g key={i}><line x1={L} x2={W-R} y1={T+(H-T-B)*i/4} y2={T+(H-T-B)*i/4} stroke="var(--grid)" strokeDasharray="4 5"/><text x={L-12} y={T+(H-T-B)*i/4+4} textAnchor="end" fill="var(--muted)">{fmt(value)}</text></g>)}
 {paths.map(p=><path key={p.key} d={p.d} fill="none" stroke={config[p.key].color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>)}
 {[...new Set(W<420?[0,points.length-1]:[0,Math.floor((points.length-1)/3),Math.floor((points.length-1)*2/3),points.length-1])].map(i=>points[i]&&<text key={i} x={points[i].x} y={H-12} textAnchor={i===0?'start':i===points.length-1?'end':'middle'} fill="var(--muted)">{date(points[i].row.timestamp)}</text>)}
 {selected&&<g><line x1={selected.x} x2={selected.x} y1={T} y2={H-B} stroke="var(--muted)" strokeDasharray="4 4"/>{keys.map(k=>selected.row[k][type]!=null&&<circle key={k} cx={selected.x} cy={selected.y(selected.row[k][type]!*100)} r={4} fill={config[k].color} stroke="var(--panel)" strokeWidth={2}/>)}</g>}
 {points.length===1&&keys.map(k=>points[0].row[k][type]!=null&&<circle key={k} cx={points[0].x} cy={points[0].y(points[0].row[k][type]!*100)} r={4} fill={config[k].color}/>)}
 </svg><div className="chart-reading" aria-live="polite" aria-atomic="true" dir="rtl">{selected?<><time dir="ltr">{selected.row.timestamp.slice(0,16)}</time>{keys.map(k=><span key={k}><i style={{background:config[k].color}}/>{config[k].name}<b dir="ltr">{fmt(selected.row[k][type]===null?null:selected.row[k][type]!*100)}</b><small>د.ع</small></span>)}</>:<span className="chart-instruction">المس المخطط أو اختر قراءة لعرض أسعارها</span>}</div>
 <div className="chart-slider"><span>اختيار القراءة</span><Slider min={0} dir="ltr" max={Math.max(1,rows.length-1)} disabled={rows.length<2} value={[active??rows.length-1]} onValueChange={values=>setActive(values[0])} thumbLabel="اختيار قراءة تاريخية" valueText={selected?`${selected.row.timestamp}، ${keys.map(k=>config[k].name+' '+fmt(selected.row[k][type]===null?null:selected.row[k][type]!*100)+' دينار').join('، ')}`:'حرّك الشريط لعرض سعر القراءة'} /></div></div>;
}
