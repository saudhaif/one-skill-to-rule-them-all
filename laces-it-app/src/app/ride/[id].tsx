// One ride: its route on the satellite map, the facts, who signed up, and sign up / cancel.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { IconClose } from '@/components/icons';
import { LOCALES } from '@/lib/i18n';
import { meetingPoint, regionFor } from '@/lib/spots';
import { meId, rideTitle, riders, setJoined, useApp } from '@/lib/store';
import { C, fmt } from '@/lib/theme';

export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, rides, joins } = useApp();
  const me = useApp(meId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const r = rides.find((x) => x.id === id);
  if (!r) return <View style={s.wrap} />;
  const f = fmt(LOCALES[lang]), start = new Date(r.startAt), [lat, lon] = meetingPoint(r);
  const ids = riders(joins, r.id), joined = !!me && ids.includes(me);
  const route = (r.route ?? []).map(([a, b]) => ({ latitude: a, longitude: b }));
  const toggle = async () => {
    setBusy(true); setErr('');
    try { await setJoined(r.id, !joined); } catch { setErr(t('errSave')); } finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.mapBox}>
        <MapView style={StyleSheet.absoluteFill} mapType="hybrid" initialRegion={regionFor(r.route?.length ? r.route : [[lat, lon]])} toolbarEnabled={false} rotateEnabled={false}>
          {route.length > 1 && <Polyline coordinates={route} strokeColor={C.accent} strokeWidth={5} />}
          <Marker coordinate={{ latitude: lat, longitude: lon }} pinColor={C.accent} />
        </MapView>
        <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => router.back()} style={s.close}><IconClose size={22} /></Pressable>
      </View>
      <View style={s.body}>
        <Text style={s.title}>{rideTitle(r, t)}</Text>
        <View style={s.facts}>
          <Fact k={t('start')} v={`${f.date.format(start)} · ${f.time.format(start)}`} />
          <Fact k={t('distance')} v={`${r.distanceKm} ${t('km')}`} />
          <Fact k={t('level')} v={t(`lvl_${r.level}` as never)} />
          <Fact k={t('meet')} v={`${r.meetPoint || ''}${r.meetPoint ? ' · ' : ''}${t(`em_${r.emirate}` as never)}`} />
        </View>
        {!!r.notes && <Text style={s.notes}>{r.notes}</Text>}
        <Text style={s.signed}>{t('signed', { n: ids.length })}</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={toggle} style={[s.btn, joined && s.btnOff, busy && { opacity: 0.6 }]}>
          <Text style={[s.btnT, joined && { color: C.ink }]}>{joined ? t('leave') : t('join')}</Text>
        </Pressable>
        {!!err && <Text style={s.err}>{err}</Text>}
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)} style={[s.btn, s.btnOff]}>
          <Text style={[s.btnT, { color: C.ink }]}>{t('directions')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.fact}><Text style={s.factK}>{k}</Text><Text style={s.factV}>{v}</Text></View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  mapBox: { height: 300, backgroundColor: C.night },
  close: { position: 'absolute', top: 14, end: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,28,38,.85)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  facts: { backgroundColor: C.card, borderRadius: 18, padding: 6 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 10 },
  factK: { color: C.muted, fontSize: 14 },
  factV: { color: C.ink, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  notes: { color: C.ink, fontSize: 15, lineHeight: 22 },
  signed: { color: C.muted, fontSize: 14 },
  btn: { minHeight: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  btnOff: { backgroundColor: C.card },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 16 },
  err: { color: '#C62828', fontWeight: '700' },
});
