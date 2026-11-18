// Rides: the meeting-points map preview at the top, the next ride (same size), then every upcoming ride.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconExpand } from '@/components/icons';
import { RideCard } from '@/components/RideCard';
import { RideMapPreview } from '@/components/RideMap';
import { LOCALES } from '@/lib/i18n';
import { regionFor, spots, upcoming } from '@/lib/spots';
import { rideTitle, useApp } from '@/lib/store';
import { C, fmt } from '@/lib/theme';

const CARD_H = 118;

export default function Rides() {
  const { t, lang, rides } = useApp();
  const list = useMemo(() => upcoming(rides), [rides]);
  const sp = useMemo(() => spots(list), [list]);
  const region = useMemo(() => regionFor(sp.map((x) => [x.lat, x.lon])), [sp]);
  const next = list[0];
  const f = fmt(LOCALES[lang]);

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <Text style={s.logo}>{t('appName')}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/workout')} style={s.workout}>
        <Text style={s.workoutT}>▶  {t('workout')}</Text>
      </Pressable>
      {/* Map preview: a still satellite view with a dot per meeting point; tap to open the full map. */}
      <Pressable accessibilityRole="button" accessibilityLabel={t('mapTitle')} onPress={() => router.push('/map')} style={s.mini}>
        <RideMapPreview region={region} spots={sp} />
        <View style={s.miniShade} pointerEvents="none">
          <Text style={s.miniT}>{t('mapTitle')}</Text>
          <Text style={s.miniS}>{sp.length ? t('mapSub', { n: sp.length }) : t('mapSub0')}</Text>
        </View>
        <View style={s.expand} pointerEvents="none"><IconExpand size={18} /></View>
      </Pressable>
      {next ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/ride/${next.id}`)} style={s.next}>
          <Text style={s.nextEyebrow} numberOfLines={1}>{t('nextRide')} · {dayWord(next.startAt, t)}</Text>
          <Text style={s.nextTitle} numberOfLines={1}>{rideTitle(next, t)}</Text>
          <View style={s.nextRow}>
            <Text style={s.nextKm}>{next.distanceKm}</Text>
            <Text style={s.nextMeta} numberOfLines={1}>{t('km')} · {f.time.format(new Date(next.startAt))} · {t(`em_${next.emirate}` as never)}</Text>
            <View style={s.nextBtn}><Text style={s.nextBtnT}>{t('details')}</Text></View>
          </View>
        </Pressable>
      ) : (
        <Text style={s.empty}>{t('noRides')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <RideCard r={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

function dayWord(iso: string, t: ReturnType<typeof useApp.getState>['t']) {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d);
  const a = Date.parse(day(new Date())), b = Date.parse(day(new Date(iso)));
  const n = Math.round((b - a) / 864e5);
  return n <= 0 ? t('today') : n === 1 ? t('tomorrow') : t('inDays', { n });
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  logo: { fontSize: 28, fontWeight: '900', color: C.ink },
  workout: { height: 54, borderRadius: 18, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  workoutT: { color: '#fff', fontSize: 16, fontWeight: '900' },
  mini: { height: CARD_H, borderRadius: 18, overflow: 'hidden', backgroundColor: C.night },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  miniShade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 20, paddingBottom: 10, backgroundColor: 'rgba(5,12,20,.55)' },
  miniT: { color: '#fff', fontWeight: '800', fontSize: 15 },
  miniS: { color: '#fff', opacity: 0.85, fontSize: 12 },
  expand: { position: 'absolute', top: 8, end: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,16,24,.7)', alignItems: 'center', justifyContent: 'center' },
  next: { height: CARD_H, borderRadius: 18, backgroundColor: C.accent, paddingHorizontal: 14, justifyContent: 'center', gap: 2 },
  nextEyebrow: { fontSize: 12, fontWeight: '600', color: C.accentInk },
  nextTitle: { fontSize: 19, fontWeight: '800', color: C.accentInk },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  nextKm: { fontSize: 22, fontWeight: '900', color: C.accentInk },
  nextMeta: { flex: 1, fontSize: 12, color: C.accentInk },
  nextBtn: { backgroundColor: C.accentInk, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 8 },
  nextBtnT: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { backgroundColor: C.card, borderRadius: 18, padding: 16, color: C.muted, fontSize: 15 },
});
