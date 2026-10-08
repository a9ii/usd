import {SITE_URL} from '@/lib/site';
import {getRates} from '@/lib/rates-server';
import {currentMonth} from '@/lib/rates';
export async function GET() {
 let lastmod='';
 try {const {data}=await getRates(currentMonth());const last=data.at(-1);if(last)lastmod=`<lastmod>${last.timestamp.replace(' ','T')}+03:00</lastmod>`;}catch{}
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc>${lastmod}</url></urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
