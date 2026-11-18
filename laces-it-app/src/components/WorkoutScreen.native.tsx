import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BleManager, type Subscription } from 'react-native-ble-plx';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, addDoc } from 'firebase/firestore';

import { auth, db, encode, firebaseReady } from '@/lib/firebase';
import { startBackgroundLocation, stopBackgroundLocation } from '@/lib/backgroundLocation';
import { useApp } from '@/lib/store';
import { C } from '@/lib/theme';

type Point = [number, number, number | null, string];

const haversine = (a: [number, number], b: [number, number]) => {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
};

const hms = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export default function WorkoutScreen() {
  const t = useApp((s) => s.t);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [climb, setClimb] = useState(0);
  const [gps, setGps] = useState<Location.LocationObject | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [heart, setHeart] = useState<number | null>(null);
  const [cadence, setCadence] = useState<number | null>(null);
  const [power, setPower] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sensorName, setSensorName] = useState('');
  const [saved, setSaved] = useState(false);
  const points = useRef<Point[]>([]);
  const lastPoint = useRef<{ pt: [number, number]; at: number; altitude: number | null } | null>(null);
  const lastTick = useRef(0);
  const altitudeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const cscRef = useRef<{ crankRevolutions: number; crankTime: number } | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const ble = useRef(new BleManager());
  const bleSubs = useRef<Subscription[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (running && !paused) {
      timer = setInterval(() => {
        setElapsed((old) => old + 1);
        lastTick.current = Date.now();
        if (gps?.timestamp && Date.now() - gps.timestamp > 6000) setSpeed((v) => v * 0.7);
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [running, paused, gps]);

  useEffect(() => () => {
    locationSub.current?.remove();
    bleSubs.current.forEach((subscription) => subscription.remove());
    ble.current.stopDeviceScan();
    ble.current.destroy();
  }, []);

  const enableLocation = async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) { setGpsError(t('workoutPermission')); return false; }
    await Location.requestBackgroundPermissionsAsync();
    return true;
  };

  const startWorkout = async () => {
    if (!(await enableLocation())) return;
    await startBackgroundLocation().catch(() => {});
    setRunning(true); setPaused(false); pausedRef.current = false; setSaved(false);
    setElapsed(0); setDistance(0); setSpeed(0); setMaxSpeed(0); setClimb(0);
    setStartedAt(Date.now()); points.current = []; lastPoint.current = null; altitudeRef.current = null;
    locationSub.current?.remove();
    locationSub.current = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 2,
      timeInterval: 1000,
    }, (position) => {
      setGps(position);
      const pt: [number, number] = [position.coords.latitude, position.coords.longitude];
      const now = position.timestamp || Date.now();
      if (pausedRef.current) return;
      if (lastPoint.current) {
        const meters = haversine(lastPoint.current.pt, pt);
        const seconds = Math.max((now - lastPoint.current.at) / 1000, 0.1);
        if (meters >= 1.5 && position.coords.accuracy != null && position.coords.accuracy <= 35) {
          setDistance((old) => old + meters);
          const gpsSpeed = position.coords.speed != null && position.coords.speed >= 0
            ? position.coords.speed * 3.6
            : meters / seconds * 3.6;
          setSpeed((old) => {
            const next = old ? old * 0.5 + gpsSpeed * 0.5 : gpsSpeed;
            setMaxSpeed((maximum) => next > maximum && next < 120 ? next : maximum);
            return next;
          });
          if (position.coords.altitude != null) {
            if (altitudeRef.current == null || position.coords.altitude < altitudeRef.current) altitudeRef.current = position.coords.altitude;
            else if (position.coords.altitude - altitudeRef.current >= 3) {
              setClimb((old) => old + position.coords.altitude! - altitudeRef.current!);
              altitudeRef.current = position.coords.altitude;
            }
          }
          points.current.push([pt[0], pt[1], position.coords.altitude ?? null, new Date(now).toISOString()]);
        }
      } else {
        points.current.push([pt[0], pt[1], position.coords.altitude ?? null, new Date(now).toISOString()]);
      }
      lastPoint.current = { pt, at: now, altitude: position.coords.altitude ?? null };
    });
  };

  const pauseWorkout = () => setPaused((old) => { pausedRef.current = !old; return !old; });

  const stopWorkout = async () => {
    setRunning(false); setPaused(false); pausedRef.current = false;
    locationSub.current?.remove(); locationSub.current = null;
    await stopBackgroundLocation().catch(() => {});
    const uid = auth.currentUser?.uid;
    if (!firebaseReady || !uid) return;
    try {
      await addDoc(collection(db, 'workouts'), encode({
        uid,
        startAt: new Date(startedAt ?? Date.now()).toISOString(),
        seconds: elapsed,
        km: +(distance / 1000).toFixed(3),
        avgKmh: elapsed > 0 ? +(distance / elapsed * 3.6).toFixed(1) : 0,
        maxKmh: +maxSpeed.toFixed(1),
        climbM: Math.round(climb),
        hrAvg: heart,
        points: points.current.filter((_, i) => i % Math.max(1, Math.ceil(points.current.length / 400)) === 0),
        createdAt: new Date().toISOString(),
      }) as object);
      setSaved(true);
    } catch (error) {
      Alert.alert(t('errSave'), String(error));
    }
  };

  const connectSensor = () => {
    setScanning(true); setSensorName('');
    ble.current.stopDeviceScan();
    ble.current.startDeviceScan(null, null, async (error, device) => {
      if (error) { setScanning(false); return; }
      if (!device?.name) return;
      ble.current.stopDeviceScan();
      setScanning(false);
      try {
        const connected = await device.connect();
        await connected.discoverAllServicesAndCharacteristics();
        setSensorName(connected.name || connected.id);
        const heartService = await connected.services();
        for (const service of heartService) {
          const chars = await connected.characteristicsForService(service.uuid);
          for (const characteristic of chars) {
            if (characteristic.uuid.toLowerCase().includes('2a37')) {
              const subscription = characteristic.monitor((monitorError, value) => {
                if (monitorError || !value?.value) return;
                const bytes = Uint8Array.from(atob(value.value), (char) => char.charCodeAt(0));
                const bpm = bytes[0] & 1
                  ? (bytes[1] | (bytes[2] << 8))
                  : bytes[1];
                setHeart(bpm);
              });
              bleSubs.current.push(subscription);
            }
            if (characteristic.uuid.toLowerCase().includes('2a5b')) {
              const subscription = characteristic.monitor((monitorError, value) => {
                if (monitorError || !value?.value) return;
                const bytes = Uint8Array.from(atob(value.value), (char) => char.charCodeAt(0));
                const flags = bytes[0];
                let offset = 1;
                if (flags & 1) offset += 6;
                if (flags & 2 && bytes.length >= offset + 4) {
                  const revolutions = bytes[offset] | (bytes[offset + 1] << 8);
                  const eventTime = bytes[offset + 2] | (bytes[offset + 3] << 8);
                  const previous = cscRef.current;
                  if (previous) {
                    const revolutionDelta = (revolutions - previous.crankRevolutions + 65536) % 65536;
                    const timeDelta = ((eventTime - previous.crankTime + 65536) % 65536) / 1024;
                    setCadence(timeDelta > 0 ? Math.round(revolutionDelta / timeDelta * 60) : 0);
                  }
                  cscRef.current = { crankRevolutions: revolutions, crankTime: eventTime };
                }
              });
              bleSubs.current.push(subscription);
            }
            if (characteristic.uuid.toLowerCase().includes('2a63')) {
              const subscription = characteristic.monitor((monitorError, value) => {
                if (monitorError || !value?.value) return;
                const bytes = Uint8Array.from(atob(value.value), (char) => char.charCodeAt(0));
                if (bytes.length >= 4) {
                  let watts = bytes[2] | (bytes[3] << 8);
                  if (watts & 0x8000) watts -= 0x10000;
                  setPower(watts);
                }
              });
              bleSubs.current.push(subscription);
            }
          }
        }
      } catch (error) {
        Alert.alert(t('workoutBle'), String(error));
      }
    });
  };

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}><Text style={styles.closeT}>×</Text></Pressable>
        <Text style={styles.title}>{t('workout')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.status}>{gpsError || (gps ? `GPS ±${Math.round(gps.coords.accuracy ?? 0)}m` : t('workoutGps'))}</Text>
        <View style={styles.hero}>
          <Text style={styles.speed}>{running && !paused ? speed.toFixed(1) : '0.0'}</Text>
          <Text style={styles.unit}>km/h</Text>
        </View>
        <View style={styles.grid}>
          <Metric label={t('workoutTime')} value={hms(elapsed)} />
          <Metric label={t('workoutDistance')} value={(distance / 1000).toFixed(2)} unit="km" />
          <Metric label={t('workoutHeart')} value={heart ?? '—'} unit="bpm" />
          <Metric label={t('workoutCadence')} value={cadence ?? '—'} unit="rpm" />
          <Metric label={t('workoutPower')} value={power ?? '—'} unit="W" />
          <Metric label="Max" value={maxSpeed.toFixed(1)} unit="km/h" />
        </View>
        <Pressable accessibilityRole="button" onPress={connectSensor} disabled={scanning} style={styles.sensor}>
          {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.sensorT}>{sensorName || t('workoutConnect')}</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={running ? (paused ? pauseWorkout : pauseWorkout) : startWorkout}
          style={[styles.primary, running && styles.secondary]}>
          <Text style={styles.primaryT}>{running ? t(paused ? 'workoutResume' : 'workoutPause') : t('workoutStart')}</Text>
        </Pressable>
        {running && <Pressable accessibilityRole="button" onPress={stopWorkout} style={styles.stop}><Text style={styles.stopT}>{t('workoutFinish')}</Text></Pressable>}
        {saved && <Text style={styles.saved}>{t('workoutSaved')} ✓</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{unit && <Text style={styles.metricUnit}>{unit}</Text>}</View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#07110c' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  closeT: { color: '#fff', fontSize: 30, lineHeight: 34 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  body: { padding: 16, gap: 14 },
  status: { color: '#a9b8af', textAlign: 'center', fontWeight: '700' },
  hero: { height: 150, borderRadius: 24, backgroundColor: '#0f2017', alignItems: 'center', justifyContent: 'center' },
  speed: { color: '#fff', fontSize: 68, lineHeight: 72, fontWeight: '900' },
  unit: { color: '#a9b8af', fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '31%', minHeight: 88, borderRadius: 16, backgroundColor: '#102418', alignItems: 'center', justifyContent: 'center', padding: 8 },
  metricLabel: { color: '#a9b8af', fontSize: 12 },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  metricUnit: { color: '#a9b8af', fontSize: 11 },
  sensor: { minHeight: 50, borderRadius: 25, backgroundColor: '#183328', alignItems: 'center', justifyContent: 'center' },
  sensorT: { color: '#fff', fontWeight: '800' },
  primary: { minHeight: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#26382f' },
  primaryT: { color: '#fff', fontSize: 17, fontWeight: '900' },
  stop: { minHeight: 58, borderRadius: 29, backgroundColor: '#9f2f37', alignItems: 'center', justifyContent: 'center' },
  stopT: { color: '#fff', fontSize: 17, fontWeight: '900' },
  saved: { color: '#67d9a7', textAlign: 'center', fontWeight: '900' },
});
