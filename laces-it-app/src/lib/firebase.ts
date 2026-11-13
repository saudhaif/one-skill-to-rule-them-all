// Firebase: the same project, collections and rules as the Laces It web app (laces-it-web/).
// The config comes from EXPO_PUBLIC_FIREBASE_* variables (see .env.example), never from the code.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
// The React Native build of Firebase Auth exports this; the web typings don't list it.
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const firebaseReady = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

const first = getApps().length === 0;
export const app = first ? initializeApp(firebaseConfig.projectId ? firebaseConfig : { ...firebaseConfig, projectId: 'laces-it-demo' }) : getApp();

export const auth: Auth =
  first && Platform.OS !== 'web'
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);

// Long polling keeps Firestore listeners working on mobile networks that break streaming connections.
export const db = first ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : getFirestore(app);

// Firestore can't store an array inside an array, so the web app keeps inner arrays (a GPX route's
// [lat, lon] pairs) as { _a: [...] }. These turn data to and from that form.
export function encode(v: unknown, inArray = false): unknown {
  if (Array.isArray(v)) return inArray ? { _a: v.map((x) => encode(x, true)) } : v.map((x) => encode(x, true));
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  return v;
}
export function decode<T = unknown>(v: unknown): T {
  if (Array.isArray(v)) return v.map((x) => decode(x)) as T;
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const o = v as Record<string, unknown>;
    if (Object.keys(o).length === 1 && Array.isArray(o._a)) return o._a.map((x) => decode(x)) as T;
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, decode(x)])) as T;
  }
  return v as T;
}
