import type {Metadata,Viewport} from 'next';
import {SITE_URL,SITE_TITLE,SITE_DESCRIPTION} from '@/lib/site';
import './globals.css';
export const metadata: Metadata = {
 metadataBase:new URL(SITE_URL),title:SITE_TITLE,description:SITE_DESCRIPTION,
 applicationName:'دولار العراق',alternates:{canonical:SITE_URL+'/'},
 robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-snippet':-1,'max-image-preview':'large'}},
 openGraph:{type:'website',locale:'ar_IQ',url:SITE_URL+'/',siteName:'دولار العراق',title:SITE_TITLE,description:SITE_DESCRIPTION},
 twitter:{card:'summary',title:SITE_TITLE,description:SITE_DESCRIPTION},
 icons:{icon:'/favicon.svg'},
};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#142e4a',colorScheme:'light dark'};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="ar" dir="rtl"><head><link rel="preload" href="/fonts/ibm-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>;
}
