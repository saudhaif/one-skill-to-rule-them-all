# Laces It: تطبيق الهاتف

تطبيق ليز ات لـ iPhone و Android: React Native و Expo SDK 58 و Expo Router و TypeScript و Zustand، مع Firebase.

يستخدم نفس مشروع Firebase ونفس البيانات اللي تستخدمها نسخة الويب (`../laces-it-web/`).

الدليل الشامل (التقنيات، المزايا، الأسعار، الشروط، الخصوصية): [docs/LACES-IT.md](docs/LACES-IT.md)

## التشغيل

1. ثبّت الحزم:
   ```bash
   npm install
   ```
2. انسخ `.env.example` إلى `.env` وعبّي القيم:
   - **Firebase:** من Firebase Console ← Project settings ← Your apps، من تطبيق الويب.
   - **Google Sign-In:** معرّفات OAuth من Google Cloud Console ← APIs & Services ← Credentials. تحتاج ثلاثة: Web و iOS و Android.
   - **خرائط Google لـ Android:** فعّل «Maps SDK for Android» وأنشئ مفتاح.
3. فعّل Google في Firebase Console ← Authentication ← Sign-in method.
4. ابنِ نسخة تطوير. الخرائط وتسجيل الدخول فيها كود أصلي، فما تشتغل في Expo Go:
   ```bash
   npx eas-cli@latest build --profile development --platform android
   ```
   أو محلياً:
   ```bash
   npx expo run:android
   ```
5. شغّل:
   ```bash
   npx expo start
   ```

## التجربة في Expo Go من أي مكان

```bash
npm run tunnel
```

يشغّل السيرفر مع نفق ngrok، ويطلع رابط `exp://…exp.direct` و QR يفتحون في Expo Go حتى لو الجوال على شبكة ثانية. بعدها اضغط «جرّب بأمثلة (بدون حساب)».

## الفحوصات

```bash
npx tsc --noEmit   # الأنواع
npx expo lint      # الجودة
```

## ملاحظات

- قواعد Firestore و Storage موجودة في `../laces-it-web/` وتنطبق على التطبيقين.
- مسارات GPX تنحفظ بالشكل `{ _a: [lat, lon] }`، لأن Firestore ما يقبل مصفوفة داخل مصفوفة. الملف `src/lib/firebase.ts` يحوّلها تلقائياً.
