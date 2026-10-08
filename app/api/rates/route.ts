import {getRates} from '@/lib/rates-server';
import {isMonth} from '@/lib/rates';
export async function GET(request: Request) {
 const month = new URL(request.url).searchParams.get('month') || '';
 if(!isMonth(month)) return Response.json({error:'شهر غير صالح'},{status:400,headers:{'Cache-Control':'no-store'}});
 try {
  const result = await getRates(month);
  return Response.json({...result,status:'success'},{headers:{'Cache-Control':result.stale?'no-store':'public, max-age=60, s-maxage=60, stale-while-revalidate=120','X-Content-Type-Options':'nosniff'}});
 } catch { return Response.json({error:'تعذر الاتصال بمصدر الأسعار. حاول مجددًا.'},{status:502,headers:{'Cache-Control':'no-store'}}); }
}
