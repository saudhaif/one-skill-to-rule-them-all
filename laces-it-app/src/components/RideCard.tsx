import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconBike, IconRun } from '@/components/icons';
import { LOCALES } from '@/lib/i18n';
import { meId, rideTitle, riders, useApp, type Ride } from '@/lib/store';
import { C, fmt } from '@/lib/theme';

export function RideCard({ r }: { r: Ride }) {
  const { t, lang, joins } = useApp();
  const me = useApp(meId);
  const f = fmt(LOCALES[lang]), start = new Date(r.startAt);
  const ids = riders(joins, r.id), mine = !!me && ids.includes(me);
  const Icon = r.sport === 'run' ? IconRun : IconBike;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/ride/${r.id}`)} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <View style={[s.badge, { backgroundColor: r.sport === 'run' ? C.run : C.accent }]}><Icon size={22} color="#fff" /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.title} numberOfLines={1}>{rideTitle(r, t)}</Text>
        <Text style={s.meta} numberOfLines={1}>{f.date.format(start)} · {f.time.format(start)} · {t(`em_${r.emirate}` as never)}</Text>
        <Text style={s.meta}>{r.distanceKm} {t('km')} · {t(`lvl_${r.level}` as never)} · {t('signed', { n: ids.length })}{mine ? ' · ✓' : ''}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card, borderRadius: 18, padding: 14 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: C.ink },
  meta: { fontSize: 13, color: C.muted },
});
