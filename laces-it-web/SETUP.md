# تشغيل Laces It كموقع مستقل (Firebase)

هذي نسخة من تطبيق Laces It تشتغل برّا Claude، ويسجّل فيها الأعضاء دخولهم بحساب
Google، وبـ UAE PASS أول ما تتفعّل. البيانات (الطلعات، التسجيل، الإعلانات)
تنحفظ في Firestore، والصور في Firebase Storage.

## الملفات

| الملف | وش فيه |
|---|---|
| `public/index.html` | التطبيق. يتولّد من `../yalla-crew/laces-it.html` بأمر `python3 build.py` |
| `public/firebase-shim.js` | شاشة الدخول والربط مع Firebase |
| `public/firebase-config.js` | مفاتيح مشروعك في Firebase، وتفعيل UAE PASS |
| `firestore.rules`, `storage.rules` | مين يقدر يقرأ ويكتب |
| `firebase.json` | إعدادات الاستضافة |

## 1. أنشئ مشروع Firebase

1. ادخل https://console.firebase.google.com واضغط **Add project**.
2. من **Build → Authentication → Sign-in method** فعّل **Google**.
3. من **Build → Firestore Database** اضغط **Create database**، واختر أقرب منطقة (مثلاً `me-central1`).
4. من **Build → Storage** اضغط **Get started**.
5. من **Project settings → Your apps** أضف تطبيق **Web** (أيقونة `</>`)، وانسخ قيم `firebaseConfig`.

## 2. حط المفاتيح

افتح `public/firebase-config.js` والصق القيم في `firebaseConfig`:
`apiKey` و `authDomain` و `projectId` و `storageBucket` و `appId`.

هذي المفاتيح مو سرّية، عادي تكون في الكود. الحماية تجي من ملفات القواعد.

## 3. ارفع الموقع

على جهازك (يحتاج Node.js):

```sh
npm install -g firebase-tools
firebase login
cd laces-it-web
firebase use --add          # اختر مشروعك
firebase deploy --except functions
```

بعدها يعطيك رابط مثل `https://<project>.web.app`، وهذا رابط التطبيق اللي
تشاركه مع الكرو.

إذا بتربط دومين خاص فيك، أضفه في **Hosting → Add custom domain**، وبعدها في
**Authentication → Settings → Authorized domains**.

## 4. UAE PASS

الربط جاهز في الكود، بس يحتاج حساب عند UAE PASS:

1. سجّل كجهة (Service Provider) عند UAE PASS. عادةً يطلبون رخصة تجارية أو جهة
   رسمية، ويعطونك بيئة تجربة (staging) قبل التشغيل الفعلي.
2. يعطونك **Client ID** و **Client Secret** وعنوان الـ issuer. اطلب منهم
   تسجيل رابط الرجوع هذا: `https://<project>.firebaseapp.com/__/auth/handler`
3. في Firebase: **Authentication → Settings** رقّي المشروع لـ
   **Identity Platform** (قد يطلب تفعيل الفوترة).
4. من **Sign-in method → Add new provider → OpenID Connect** أضف مزوّد:
   - **Name**: `uaepass` (فيصير الـ Provider ID: `oidc.uaepass`)
   - **Client ID / Issuer / Client Secret**: من UAE PASS
   - **Grant type**: Code flow
5. في `public/firebase-config.js` غيّر `enabled: false` إلى `enabled: true`.
   إذا UAE PASS عطاك scopes غير `openid`، حطها في `scopes`.
6. ارفع من جديد: `firebase deploy --only hosting`

إذا UAE PASS ما يدعم OpenID Connect بالكامل (ما عنده ملف
`.well-known/openid-configuration`)، Firebase ما يقدر يربطه مباشرة. وقتها
نحتاج دالة صغيرة على السيرفر (Cloud Function) تسوي خطوات الدخول.

## تعديل التطبيق

التصميم والميزات موجودة في `../yalla-crew/laces-it.html` (نسخة Claude). بعد أي
تعديل عليه:

```sh
python3 build.py
firebase deploy --only hosting
```

## التجربة على جهازك

```sh
firebase emulators:start --only auth,firestore,storage,hosting --project demo-laces
```

افتح `http://localhost:5000/?emu`.

## تفعيل ميزات الذكاء الاصطناعي

تشغّل دالة Firebase ميزات تخطيط الطلعة وكتابة الإعلان من الصورة والتدريب والترجمة
(وكذلك اقتراحات التجهيز). يرسل التطبيق نص الطلب والصورة المختارة عند كتابة الإعلان
إلى Anthropic. الطلبات متاحة بعد تسجيل الدخول وتُحسب على حساب Anthropic الخاص
بالمشروع. الحد 10 طلبات لكل عضو و100 للمشروع يومياً بتوقيت UTC.

بعد إعداد Firebase وتفعيل خطة Blaze، نفّذ من مجلد `laces-it-web`:

```sh
npm --prefix functions install
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy --only functions:lacesAi
```

أدخل مفتاح Anthropic عند مطالبة CLI به. بعد نشر الدالة، غيّر `aiEnabled` إلى
`true` في `public/firebase-config.js` ثم نفّذ `firebase deploy --only hosting`.
جرّب الميزات بعد الدخول بحساب Google. لإيقاف ظهورها، أعد الخيار إلى `false`
وارفع الاستضافة. لإيقاف الوصول المباشر أيضاً، احذف دالة `lacesAi` من المشروع.
