// App state with Zustand: who is signed in, the rides, who joined what, member profiles and the language.
// Firestore listeners feed it (see startSync); screens read it with useApp(selector).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { create } from 'zustand';

import { auth, db, decode, encode, firebaseReady } from './firebase';
import { deviceLang, LANGS, translate, type Key, type Lang } from './i18n';

export type LatLon = [number, number];
export type Ride = {
  id: string;
  title: string;
  titleKey?: string;
  sport: 'bike' | 'run';
  emirate: string;
  level: 'beg' | 'int' | 'adv';
  startAt: string;
  distanceKm: number;
  meetPoint?: string;
  notes?: string;
  route?: LatLon[];
  createdBy?: string;
  maxRiders?: number;
};
export type Joins = { id: string; rides?: Record<string, boolean>; follows?: Record<string, boolean> };
export type Profile = { id: string; nick?: string; name?: string; photo?: string; avatar?: string };

type State = {
  lang: Lang;
  user: User | null;
  /** Browsing example rides without an account (when Firebase isn't set up, e.g. in Expo Go). */
  demo: boolean;
  authReady: boolean;
  rides: Ride[];
  joins: Joins[];
  profiles: Record<string, Profile>;
  setLang: (l: Lang) => void;
  t: (k: Key, v?: Record<string, string | number>) => string;
};

export const useApp = create<State>((set, get) => ({
  lang: deviceLang(),
  user: null,
  demo: false,
  authReady: !firebaseReady,
  rides: [],
  joins: [],
  profiles: {},
  setLang: (lang) => {
    set({ lang });
    AsyncStorage.setItem('lacesit.lang', lang).catch(() => {});
  },
  t: (k, v) => translate(get().lang, k, v),
}));

AsyncStorage.getItem('lacesit.lang')
  .then((l) => { if (l && (LANGS as string[]).includes(l)) useApp.setState({ lang: l as Lang }); })
  .catch(() => {});

// Listen to the signed-in member and, once signed in, to rides, joins and profiles.
let stopData: (() => void) | null = null;
export function startSync() {
  if (!firebaseReady) return () => {};
  const stopAuth = onAuthStateChanged(auth, (user) => {
    useApp.setState({ user, authReady: true });
    stopData?.();
    stopData = user ? listen() : null;
    if (!user) useApp.setState({ rides: [], joins: [], profiles: {} });
  });
  return () => { stopAuth(); stopData?.(); stopData = null; };
}

function listen() {
  const offs = [
    onSnapshot(query(collection(db, 'rides'), orderBy('startAt')), (s) =>
      useApp.setState({ rides: s.docs.map((d) => ({ id: d.id, ...decode<Omit<Ride, 'id'>>(d.data()) })) })),
    onSnapshot(collection(db, 'joins'), (s) =>
      useApp.setState({ joins: s.docs.map((d) => ({ id: d.id, ...decode<Omit<Joins, 'id'>>(d.data()) })) })),
    onSnapshot(collection(db, 'profiles'), (s) =>
      useApp.setState({ profiles: Object.fromEntries(s.docs.map((d) => [d.id, { id: d.id, ...decode<Omit<Profile, 'id'>>(d.data()) }])) })),
  ];
  return () => offs.forEach((off) => off());
}

export const signOut = () => {
  if (useApp.getState().demo) { useApp.setState({ demo: false, rides: [], joins: [] }); return Promise.resolve(); }
  return fbSignOut(auth);
};

// The member's id: the signed-in account, or "demo" while browsing the examples.
export const meId = (s: Pick<State, 'user' | 'demo'>) => s.user?.uid ?? (s.demo ? 'demo' : null);

// Example rides at real UAE spots, for trying the app without an account.
const loop = (lat: number, lon: number, dLat: number, dLon: number, n = 40): LatLon[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return [+(lat + dLat * Math.sin(a)).toFixed(5), +(lon + dLon * (1 - Math.cos(a))).toFixed(5)]; });
const inDays = (d: number, h: number, m = 0) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); x.setUTCHours(h - 4, m, 0, 0); return x.toISOString(); };
export function startDemo() {
  const rides: Ride[] = [
    { id: 'ex-qudra', title: 'طلعة الفجر – حلبة القدرة', sport: 'bike', emirate: 'DXB', level: 'int', startAt: inDays(1, 5, 30), distanceKm: 50, meetPoint: 'مواقف حلبة القدرة للدراجات', route: loop(24.835, 55.375, 0.055, 0.08) },
    { id: 'ex-jais', title: 'تحدي جبل جيس', sport: 'bike', emirate: 'RAK', level: 'adv', startAt: inDays(3, 5), distanceKm: 32, meetPoint: 'أسفل طريق جبل جيس', route: loop(25.94, 56.08, 0.03, 0.05) },
    { id: 'ex-corniche', title: 'جري الكورنيش', sport: 'run', emirate: 'AUH', level: 'beg', startAt: inDays(2, 6), distanceKm: 8, meetPoint: 'كورنيش أبوظبي – بوابة 3', route: loop(24.475, 54.335, 0.008, 0.014) },
    { id: 'ex-kite', title: 'جري كايت بيتش', sport: 'run', emirate: 'DXB', level: 'int', startAt: inDays(5, 18), distanceKm: 10, meetPoint: 'كايت بيتش – جميرا', route: loop(25.162, 55.2, 0.01, 0.012) },
  ];
  useApp.setState({ demo: true, rides, joins: [{ id: 'm1', rides: { 'ex-qudra': true, 'ex-jais': true } }, { id: 'm2', rides: { 'ex-qudra': true } }] });
}

// Sign up for a ride, or cancel: one document per member, joins/<uid> = { rides: { <rideId>: true|false } }.
export async function setJoined(rideId: string, on: boolean) {
  if (useApp.getState().demo) {
    const joins = useApp.getState().joins.filter((j) => j.id !== 'demo');
    const mine = useApp.getState().joins.find((j) => j.id === 'demo');
    useApp.setState({ joins: [...joins, { id: 'demo', rides: { ...mine?.rides, [rideId]: on } }] });
    return;
  }
  const uid = auth.currentUser?.uid; if (!uid) return;
  await setDoc(doc(db, 'joins', uid), encode({ rides: { [rideId]: on } }) as object, { merge: true });
}

export const riders = (joins: Joins[], rideId: string) => joins.filter((j) => j.rides?.[rideId] === true).map((j) => j.id);
export const rideTitle = (r: Ride, t: State['t']) => (r.titleKey ? t(r.titleKey as Key) : r.title);
