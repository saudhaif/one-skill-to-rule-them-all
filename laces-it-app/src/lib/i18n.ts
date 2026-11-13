// The app's four languages. Arabic is right-to-left.
import { getLocales } from 'expo-localization';

export type Lang = 'ar' | 'en' | 'fil' | 'hi';
export const LANGS: Lang[] = ['ar', 'en', 'fil', 'hi'];
export const LANG_NAMES: Record<Lang, string> = { ar: 'عربي', en: 'English', fil: 'Filipino', hi: 'हिन्दी' };
export const isRTL = (l: Lang) => l === 'ar';
export const LOCALES: Record<Lang, string> = { ar: 'ar-AE', en: 'en-AE', fil: 'fil-PH', hi: 'hi-IN' };

export function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGS as string[]).includes(code) ? (code as Lang) : code === 'tl' ? 'fil' : 'en';
}

const ar = {
  appName: 'ليز ات',
  tabRides: 'الطلعات', tabClips: 'لقطات', tabMarket: 'السوق', tabBoard: 'الترتيب', tabRooms: 'الغرف', tabMe: 'حسابي',
  signInTitle: 'كرو السيكل والجري في الإمارات',
  signInSub: 'سجّل دخولك عشان تشوف الطلعات وتسجّل فيها.',
  google: 'الدخول بحساب Google',
  uaePass: 'الدخول بالهوية الرقمية UAE PASS',
  soon: 'قريباً',
  notConfigured: 'التطبيق ما انربط بـ Firebase للحين. أضف قيم EXPO_PUBLIC_FIREBASE_* في ملف .env (شوف SETUP.md).',
  signInFail: 'ما قدرنا نسجّل دخولك. جرّب مرة ثانية.',
  mapTitle: 'خريطة التجمعات', mapSub: '{n} نقطة تجمّع على الخريطة الجوية', mapSub0: 'شوف أماكن تجمّع الطلعات على الخريطة الجوية',
  nextRide: 'الطلعة القادمة', inDays: 'خلال {n} أيام', today: 'اليوم', tomorrow: 'بكرة',
  details: 'التفاصيل', km: 'كم', noRides: 'ما فيه طلعات قادمة. أول ما يضيف أحد طلعة تطلع هني.',
  all: 'الكل', bike: 'سيكل', run: 'جري', week: 'هالأسبوع', mine: 'مسجّل فيها',
  signed: '{n} مسجّلين', join: 'سجّلني', leave: 'إلغاء التسجيل', joined: 'مسجّل ✓',
  directions: 'الاتجاهات', meet: 'نقطة التجمّع', start: 'الانطلاق', distance: 'المسافة', level: 'المستوى',
  lvl_beg: 'مبتدئ', lvl_int: 'متوسط', lvl_adv: 'متقدم',
  em_AUH: 'أبوظبي', em_DXB: 'دبي', em_SHJ: 'الشارقة', em_AJM: 'عجمان', em_UAQ: 'أم القيوين', em_RAK: 'رأس الخيمة', em_FUJ: 'الفجيرة',
  phase2: 'هذا القسم يجي في المرحلة الثانية من تطبيق الهاتف. لين ذاك الحين تقدر تستخدمه من نسخة الويب.',
  language: 'اللغة', signOut: 'تسجيل الخروج', you: 'أنت', member: 'عضو',
  close: 'إغلاق', zoomIn: 'قرّب', zoomOut: 'بعّد', fit: 'كل النقاط', locate: 'موقعي',
  terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية', errSave: 'ما انحفظ. تأكد من الاتصال وجرّب مرة ثانية.',
};
type Dict = typeof ar;

const en: Dict = {
  appName: 'Laces It',
  tabRides: 'Rides', tabClips: 'Clips', tabMarket: 'Market', tabBoard: 'Ranking', tabRooms: 'Rooms', tabMe: 'Me',
  signInTitle: 'The UAE crew for cycling and running',
  signInSub: 'Sign in to see rides and sign up for them.',
  google: 'Continue with Google',
  uaePass: 'Continue with UAE PASS',
  soon: 'Soon',
  notConfigured: "The app isn't connected to Firebase yet. Add the EXPO_PUBLIC_FIREBASE_* values to .env (see SETUP.md).",
  signInFail: "Couldn't sign you in. Try again.",
  mapTitle: 'Meeting points map', mapSub: '{n} meeting points on the satellite map', mapSub0: 'See where rides meet on the satellite map',
  nextRide: 'Next ride', inDays: 'in {n} days', today: 'Today', tomorrow: 'Tomorrow',
  details: 'Details', km: 'km', noRides: 'No upcoming rides. New rides show up here as soon as they are added.',
  all: 'All', bike: 'Bike', run: 'Run', week: 'This week', mine: 'Signed up',
  signed: '{n} signed up', join: 'Sign me up', leave: 'Cancel sign-up', joined: 'Signed up ✓',
  directions: 'Directions', meet: 'Meeting point', start: 'Start', distance: 'Distance', level: 'Level',
  lvl_beg: 'Beginner', lvl_int: 'Intermediate', lvl_adv: 'Advanced',
  em_AUH: 'Abu Dhabi', em_DXB: 'Dubai', em_SHJ: 'Sharjah', em_AJM: 'Ajman', em_UAQ: 'Umm Al Quwain', em_RAK: 'Ras Al Khaimah', em_FUJ: 'Fujairah',
  phase2: 'This section comes in phase two of the phone app. Until then, use it in the web version.',
  language: 'Language', signOut: 'Sign out', you: 'You', member: 'Member',
  close: 'Close', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'All points', locate: 'My location',
  terms: 'Terms and conditions', privacy: 'Privacy policy', errSave: "Couldn't save. Check your connection and try again.",
};

const fil: Dict = {
  ...en,
  signInTitle: 'Ang crew ng cycling at running sa UAE',
  signInSub: 'Mag-sign in para makita at salihan ang mga ride.',
  google: 'Magpatuloy gamit ang Google', uaePass: 'Magpatuloy gamit ang UAE PASS', soon: 'Malapit na',
  tabRides: 'Ride', tabMarket: 'Market', tabBoard: 'Ranggo', tabMe: 'Ako',
  mapTitle: 'Mapa ng tagpuan', mapSub: '{n} tagpuan sa satellite map', mapSub0: 'Tingnan kung saan nagkikita ang mga ride',
  nextRide: 'Susunod na ride', inDays: 'sa loob ng {n} araw', today: 'Ngayon', tomorrow: 'Bukas', details: 'Detalye',
  noRides: 'Walang paparating na ride.', all: 'Lahat', run: 'Takbo', week: 'Ngayong linggo', mine: 'Naka-sign up',
  signed: '{n} naka-sign up', join: 'Isali ako', leave: 'Kanselahin', joined: 'Naka-sign up ✓', directions: 'Direksyon',
  meet: 'Tagpuan', start: 'Simula', distance: 'Layo', level: 'Antas', lvl_beg: 'Baguhan', lvl_int: 'Katamtaman', lvl_adv: 'Bihasa',
  phase2: 'Darating ito sa ikalawang yugto ng phone app. Gamitin muna ang web version.',
  language: 'Wika', signOut: 'Mag-sign out', you: 'Ikaw', member: 'Miyembro', close: 'Isara',
};

const hi: Dict = {
  ...en,
  appName: 'लेसेज़ इट',
  tabRides: 'राइड्स', tabClips: 'क्लिप्स', tabMarket: 'बाज़ार', tabBoard: 'रैंकिंग', tabRooms: 'रूम्स', tabMe: 'मैं',
  signInTitle: 'यूएई का साइक्लिंग और रनिंग क्रू', signInSub: 'राइड्स देखने और जुड़ने के लिए साइन इन करें।',
  google: 'Google से जारी रखें', uaePass: 'UAE PASS से जारी रखें', soon: 'जल्द',
  mapTitle: 'मिलने की जगहों का नक्शा', mapSub: 'सैटेलाइट नक्शे पर {n} मिलने की जगहें', mapSub0: 'देखें राइड्स कहाँ मिलती हैं',
  nextRide: 'अगली राइड', inDays: '{n} दिन में', today: 'आज', tomorrow: 'कल', details: 'विवरण', km: 'किमी',
  noRides: 'कोई आने वाली राइड नहीं।', all: 'सभी', bike: 'साइकिल', run: 'दौड़', week: 'इस हफ़्ते', mine: 'साइन अप',
  signed: '{n} साइन अप', join: 'मुझे जोड़ें', leave: 'साइन अप रद्द करें', joined: 'साइन अप ✓', directions: 'रास्ता',
  meet: 'मिलने की जगह', start: 'शुरुआत', distance: 'दूरी', level: 'स्तर', lvl_beg: 'शुरुआती', lvl_int: 'मध्यम', lvl_adv: 'उन्नत',
  em_AUH: 'अबू धाबी', em_DXB: 'दुबई', em_SHJ: 'शारजाह', em_AJM: 'अजमान', em_UAQ: 'उम्म अल क़ुवैन', em_RAK: 'रास अल ख़ैमा', em_FUJ: 'फ़ुजैरा',
  phase2: 'यह हिस्सा फ़ोन ऐप के दूसरे चरण में आएगा। तब तक वेब वर्ज़न इस्तेमाल करें।',
  language: 'भाषा', signOut: 'साइन आउट', you: 'आप', member: 'सदस्य', close: 'बंद करें',
};

export const DICTS: Record<Lang, Dict> = { ar, en, fil, hi };
export type Key = keyof Dict;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
