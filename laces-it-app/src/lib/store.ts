// App state with Zustand: who is signed in, the rides, who joined what, member profiles and the language.
// Firestore listeners feed it (see startSync); screens read it with useApp(selector).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { create } from 'zustand';

import { auth, db, decode, encode, firebaseReady } from './firebase';
import { deviceLang, translate, type Key, type Lang } from './i18n';

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
  .then((l) => { if (l === 'ar' || l === 'en' || l === 'fil' || l === 'hi') useApp.setState({ lang: l }); })
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

export const signOut = () => fbSignOut(auth);

// Sign up for a ride, or cancel: one document per member, joins/<uid> = { rides: { <rideId>: true|false } }.
export async function setJoined(rideId: string, on: boolean) {
  const uid = auth.currentUser?.uid; if (!uid) return;
  await setDoc(doc(db, 'joins', uid), encode({ rides: { [rideId]: on } }) as object, { merge: true });
}

export const riders = (joins: Joins[], rideId: string) => joins.filter((j) => j.rides?.[rideId] === true).map((j) => j.id);
export const rideTitle = (r: Ride, t: State['t']) => (r.titleKey ? t(r.titleKey as Key) : r.title);
