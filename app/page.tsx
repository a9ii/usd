import Dashboard from './dashboard';
import {getRates} from '@/lib/rates-server';
import {currentMonth,type RatesResult} from '@/lib/rates';
import {SITE_URL,SITE_TITLE,SITE_DESCRIPTION} from '@/lib/site';
export default async function Page() {
 const month = currentMonth();
 let initial: RatesResult = {data:[],month,stale:false};
 let error = '';
 try { initial = await getRates(month); } catch { error='تعذر تحديث الأسعار من المصدر. أعد المحاولة.'; }
 const structured = {'@context':'https://schema.org','@graph':[
  {'@type':'WebSite','@id':SITE_URL+'/#website',url:SITE_URL+'/',name:'دولار العراق',inLanguage:'ar-IQ'},
  {'@type':'WebPage','@id':SITE_URL+'/#webpage',url:SITE_URL+'/',name:SITE_TITLE,description:SITE_DESCRIPTION,inLanguage:'ar-IQ',isPartOf:{'@id':SITE_URL+'/#website'},about:{'@type':'Thing',name:'سعر صرف الدولار الأمريكي مقابل الدينار العراقي'},...(initial.data.length?{dateModified:initial.data.at(-1)!.timestamp.replace(' ','T')+'+03:00'}:{})}
 ]};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/><Dashboard initial={initial} initialError={error}/></>;
}
