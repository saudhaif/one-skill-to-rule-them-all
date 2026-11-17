import { router } from 'expo-router';
import { createElement, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconClose, IconRun, IconBike } from '@/components/icons';
import { LOCALES } from '@/lib/i18n';
import { regionFor, spots, upcoming, type Filter, type Spot } from '@/lib/spots';
import { meId, rideTitle, riders, useApp } from '@/lib/store';
import { C, fmt } from '@/lib/theme';

export default function MeetingMap() {
  const { t, lang, rides, joins } = useApp();
  const me = useApp(meId);
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<Spot | null>(null);
  const mine = (id: string) => !!me && riders(joins, id).includes(me);
  const sp = useMemo(() => spots(upcoming(rides, filter, mine)), [rides, joins, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const region = useMemo(() => regionFor(sp.map((x) => [x.lat, x.lon])), [sp]);
  const f = fmt(LOCALES[lang]);
  const mapUrl = `https://www.google.com/maps?q=${region.latitude},${region.longitude}&z=8&output=embed`;

  return (
    <View style={s.wrap}>
      {createElement('iframe', {
        src: mapUrl,
        title: t('mapTitle'),
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 },
      })}
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

      {sp.length > 0 && (
        <View style={s.card}>
          <View style={s.spots}>
            {sp.map((x) => {
              const run = x.rides.every((r) => r.sport === 'run');
              const Icon = run ? IconRun : IconBike;
              return (
                <Pressable key={x.key} accessibilityRole="button" onPress={() => setSel(x)} style={[s.spot, sel?.key === x.key && s.spotSelected]}>
                  <Icon size={18} color={C.accent} width={2} />
                  <Text style={s.spotT} numberOfLines={1}>{x.rides[0].meetPoint || t(`em_${x.rides[0].emirate}` as never)}</Text>
                </Pressable>
              );
            })}
          </View>
          {sel && (
            <>
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
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 600, backgroundColor: C.night },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: 10, paddingBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 6 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 4 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(20,28,38,.88)', alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(20,28,38,.85)' },
  chipT: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { position: 'absolute', left: 10, right: 10, bottom: 24, backgroundColor: C.card, borderRadius: 22, padding: 14, gap: 10 },
  spots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 240, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: C.bg },
  spotSelected: { borderWidth: 2, borderColor: C.accent },
  spotT: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: C.ink },
  cardT: { fontSize: 17, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 14, padding: 10 },
  rowT: { fontSize: 15, fontWeight: '800', color: C.ink },
  rowS: { fontSize: 12, color: C.muted },
  btn: { backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  btnSoft: { backgroundColor: C.bg },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
