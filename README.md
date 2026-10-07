# دولار العراق — نسخة Cloudflare Pages

هذه نسخة مهيأة خصيصًا لـ Cloudflare Pages Advanced Mode، وتشمل كامل المصدر.
تحافظ على React وTypeScript والتصميم والجوال وSSR والـ API وخريطة الموقع وrobots.
الرفع عبر Wrangler، وليس رفع ZIP المصدر كملفات ثابتة.

## 1. التثبيت

ثبّت Node.js 24، ثم افتح الطرفية داخل هذا المجلد:

```bash
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
```

## 2. تسجيل الدخول وإنشاء مشروع Pages

```bash
pnpm exec wrangler login
pnpm exec wrangler pages project create iraq-usd-site --production-branch main
```

يفتح الأمر الأول متصفحك لتسجيل الدخول إلى حساب Cloudflare الخاص بك.
الاسم iraq-usd-site مثال مقترح: إذا كان غير متاح، استخدم اسمًا آخر في كل الأوامر وداخل حقل name في wrangler.jsonc.
إذا كان لديك مشروع Pages موجود، استخدم اسمه وتجاوز أمر الإنشاء.

## 3. ضبط عنوان الموقع للفهرسة

افتح site.config.json وضع الرابط النهائي الذي يعرضه Cloudflare:

```json
{
  "siteUrl": "https://YOUR-ACTUAL-PROJECT.pages.dev"
}
```

استبدل YOUR-ACTUAL-PROJECT باسم مشروعك الحقيقي؛ المثال أعلاه ليس رابط موقع تم إنشاؤه.
إذا كان لديك نطاق مخصص مربوط بالمشروع، استخدمه بدل pages.dev.
يجب أن يكون الرابط HTTPS بلا مسار فرعي أو query. يتحقق أمر البناء من ذلك.
الرابط يستخدم في Canonical وOpen Graph وSchema.org وSitemap.

## 4. البناء والرفع

```bash
pnpm run build:pages
pnpm run deploy:pages --project-name iraq-usd-site --branch main
```

بعد نجاح الرفع سيطبع Wrangler رابط النشر.
لا حاجة إلى قاعدة بيانات أو مفتاح API أو تسجيل دخول OpenAI للزوار.

## 5. تجربة محلية

```bash
pnpm dev
```

افتح http://localhost:5173 أو الرابط الذي تطبعه الطرفية.
لتجربة مخرجات Pages بعد البناء:

```bash
pnpm run preview:pages --port 8787
```

لا ترفع المشروع باستخدام wrangler deploy العادي؛ المطلوب wrangler pages deploy كما في الأمر المعد أعلاه.

## 6. إعدادات Pages

wrangler.jsonc مجهز بالتالي:

- pages_build_output_dir: ./pages-dist
- compatibility_date: 2026-05-15
- compatibility_flags: ["nodejs_compat"]

يولّد build:pages مجلد pages-dist الذي يحتوي على الملفات العامة، ومجلد _worker.js الذي يحوي وحدات الخادم، وملف _routes.json.
وحدات الخادم لا توضع في مجلد أصول عام منفصل.
يزيل السكربت ملف إعادة توجيه إعدادات Wrangler الذي يولده Vite، كي يستخدم الرفع إعداد Pages الموجود في جذر المشروع.

## 7. الربط بـ GitHub اختياريًا

ارفع ملفات المصدر إلى مستودعك، ثم اربطه بمشروع Cloudflare Pages جديد يدعم Git integration.

- Framework preset: None
- Build command: pnpm run build:pages
- Build output directory: pages-dist
- Root directory: مجلد المشروع إذا لم يكن في جذر المستودع.
- متغير بيئة البناء NODE_VERSION: 24
- متغير بيئة البناء PNPM_VERSION: 11.25.0
- متغير بيئة البناء SITE_URL: عنوان النشر النهائي.

SITE_URL له الأولوية على site.config.json.
تأكد من تفعيل nodejs_compat للتوافق، كما هو موجود في wrangler.jsonc.
عند تغيير النطاق، عدّل SITE_URL أو site.config.json ثم أعد البناء والنشر.

## 8. المصدر

مصدر الأسعار لم يتغير:
https://gallery.a9ii.com/usd/api/rates/history?month=2026-10
يوجد مسار احتياطي داخل lib/rates-server.ts.

## 9. الملفات المهمة

- app/dashboard.tsx: الواجهة والتحديث والتصفية.
- app/page.tsx: عرض الأسعار من الخادم وSchema.org.
- app/globals.css: التصميم المتجاوب.
- app/layout.tsx: العنوان والوصف وCanonical.
- app/api/rates/route.ts: API المحلي.
- lib/rates-server.ts: المصدر والتخزين المؤقت.
- components/rate-chart.tsx: المخطط التفاعلي.
- public/fonts: الخطوط المحلية وتراخيصها.
- scripts/build-pages.mjs: بناء وتحويل مخرجات التطبيق إلى Pages.
- site.config.json: نطاق الموقع النهائي.
- wrangler.jsonc: إعدادات Pages.
- pnpm-lock.yaml: ملف تثبيت إصدارات المكتبات.

لا تعدّل lib/site-deployment.ts يدويًا؛ يعيد build:pages توليده.
لا يتضمن الأرشيف node_modules أو dist أو pages-dist أو Git أو أسرارًا؛ أوامر التثبيت والبناء تعيد إنشاء المجلدات المطلوبة.
تعريف .openai المضمّن يحتوي على إعدادات البناء الفارغة فقط، دون معرف موقع المعاينة السابق.

## 10. الفحص بعد النشر

افتح رابط الموقع ثم /sitemap.xml و/robots.txt و/api/rates?month=2026-10.
تأكد أن Canonical وخريطة الموقع يستخدمان نطاقك الفعلي، وأن الأسعار ووقت التحديث يظهران.
قدّم Sitemap إلى Google Search Console بعد إثبات ملكية نطاقك.

تم نجاح بناء التطبيق وتجميع وحدات الخادم بواسطة Wrangler Pages Functions.
لم يتم نشر هذه النسخة داخل حساب Cloudflare الخاص بك، ولم يُستكمل اختبار خادم Pages المحلي هنا بسبب قيد في بيئة التشغيل.
نتائج PageSpeed السابقة تخص نسخة المعاينة المنشورة؛ أعد القياس على رابط Cloudflare بعد رفعه.

مراجع رسمية:
https://developers.cloudflare.com/pages/functions/advanced-mode/
https://developers.cloudflare.com/pages/functions/wrangler-configuration/
https://developers.cloudflare.com/pages/get-started/direct-upload/
