// The full-screen meeting-points map: real satellite imagery with place names (hybrid), pinch to zoom,
// a pin per meeting point, filters, your location, and a card with the rides at a pin.
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconBike, IconClose, IconFit, IconLocate, IconRun } from '@/components/icons';
import { LOCALES } from '@/lib/i18n';
import { regionFor, spots, upcoming, type Filter, type Spot } from '@/lib/spots';
import { rideTitle, riders, useApp } from '@/lib/store';
import { C, fmt } from '@/lib/theme';

export default function MeetingMap() {
  const { t, lang, rides, joins, user } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<Spot | null>(null);
  const map = useRef<MapView>(null);
  const mine = (id: string) => !!user && riders(joins, id).includes(user.uid);
  const sp = useMemo(() => spots(upcoming(rides, filter, mine)), [rides, joins, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const region = useMemo(() => regionFor(sp.map((x) => [x.lat, x.lon])), [sp]);
  const f = fmt(LOCALES[lang]);
  const fit = () => map.current?.animateToRegion(region, 400);
  // Your position: asked for only when you tap the button.
  const [perm, ask] = Location.useForegroundPermissions();
  const locate = async () => {
    const p = perm?.granted ? perm : await ask();
    if (!p.granted) return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (pos) map.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
  };

  return (
    <View style={s.wrap}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        mapType="hybrid"
        initialRegion={region}
        showsUserLocation={!!perm?.granted}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        onPress={() => setSel(null)}>
        {sp.map((x) => {
          const run = x.rides.every((r) => r.sport === 'run'), Icon = run ? IconRun : IconBike;
          const signed = x.rides.some((r) => mine(r.id)), r0 = x.rides[0];
          return (
            <Marker key={x.key} coordinate={{ latitude: x.lat, longitude: x.lon }} onPress={() => setSel(x)} anchor={{ x: 0.5, y: 1 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={[s.bub, { backgroundColor: run ? C.run : C.accent }, signed && s.bubMine, sel?.key === x.key && { transform: [{ scale: 1.12 }] }]}>
                  <Icon size={26} color="#fff" width={2} />
                  {x.rides.length > 1 && <View style={s.cnt}><Text style={s.cntT}>{x.rides.length}</Text></View>}
                </View>
                <Text style={s.lab} numberOfLines={2}>{r0.meetPoint || t(`em_${r0.emirate}` as never)}</Text>
                <Text style={s.labS}>{f.date.format(new Date(r0.startAt))} · {f.time.format(new Date(r0.startAt))}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} style={s.top} pointerEvents="box-none">
        <View style={s.head}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => router.back()} style={s.round}><IconClose size={22} /></Pressable>
          <Text style={s.title}>{t('mapTitle')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
          {(['all', 'bike', 'run', 'week', 'mine'] as Filter[]).map((k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: filter === k }} onPress={() => { setFilter(k); setSel(null); }} style={[s.chip, filter === k && { backgroundColor: C.accent }]}>
              <Text style={s.chipT}>{t(k)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={s.ctl}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('fit')} onPress={fit} style={s.round}><IconFit size={22} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('locate')} onPress={locate} style={s.round}><IconLocate size={22} /></Pressable>
      </View>

      {sel && (
        <View style={s.card}>
          <Text style={s.cardT}>{sel.rides[0].meetPoint || t(`em_${sel.rides[0].emirate}` as never)}</Text>
          {sel.rides.map((r) => (
            <View key={r.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowT} numberOfLines={1}>{rideTitle(r, t)}</Text>
                <Text style={s.rowS}>{f.date.format(new Date(r.startAt))} · {f.time.format(new Date(r.startAt))} · {r.distanceKm} {t('km')} · {t('signed', { n: riders(joins, r.id).length })}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.push(`/ride/${r.id}`)} style={s.btn}><Text style={s.btnT}>{t('details')}</Text></Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lon}`)} style={[s.btn, s.btnSoft]}>
            <Text style={[s.btnT, { color: C.ink }]}>{t('directions')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.night },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: 10, paddingBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 6 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 4 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(20,28,38,.88)', alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(20,28,38,.85)' },
  chipT: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ctl: { position: 'absolute', end: 14, bottom: 200, gap: 10 },
  bub: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bubMine: { borderColor: C.gold },
  cnt: { position: 'absolute', top: -6, end: -8, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#111A24', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cntT: { color: '#fff', fontWeight: '800', fontSize: 11 },
  lab: { marginTop: 4, maxWidth: 170, color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center', textShadowColor: 'rgba(8,16,26,.95)', textShadowRadius: 4 },
  labS: { color: '#FFD9CC', fontWeight: '700', fontSize: 11, textShadowColor: 'rgba(8,16,26,.95)', textShadowRadius: 4 },
  card: { position: 'absolute', left: 10, right: 10, bottom: 24, backgroundColor: C.card, borderRadius: 22, padding: 14, gap: 10 },
  cardT: { fontSize: 17, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 14, padding: 10 },
  rowT: { fontSize: 15, fontWeight: '800', color: C.ink },
  rowS: { fontSize: 12, color: C.muted },
  btn: { backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  btnSoft: { backgroundColor: C.bg },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
