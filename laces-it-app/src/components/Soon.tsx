// Sections that come in phase two of the phone app; until then they live in the web version.
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Key } from '@/lib/i18n';

export function Soon({ title }: { title: Key }) {
  const t = useApp((s) => s.t);
  useApp((s) => s.lang);
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <Text style={s.h}>{t(title)}</Text>
      <View style={s.card}><Text style={s.soon}>{t('soon')}</Text><Text style={s.p}>{t('phase2')}</Text></View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 },
  h: { fontSize: 28, fontWeight: '900', color: C.ink },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 6 },
  soon: { color: C.accent, fontWeight: '800', fontSize: 13 },
  p: { color: C.ink, fontSize: 15, lineHeight: 22 },
});
