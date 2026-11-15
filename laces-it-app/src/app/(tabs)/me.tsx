// Me: who is signed in, the language and sign-out. The full profile comes in phase two.
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LANG_NAMES, LANGS } from '@/lib/i18n';
import { signOut, useApp } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Me() {
  const { t, lang, setLang, user, profiles } = useApp();
  const p = user ? profiles[user.uid] : undefined;
  const name = p?.nick || user?.displayName || t('member');
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <Text style={s.h}>{t('tabMe')}</Text>
      <View style={s.card}>
        {user?.photoURL ? <Image source={{ uri: user.photoURL }} style={s.av} /> : <View style={[s.av, { backgroundColor: C.accent }]} />}
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{name}</Text>
          {!!user?.email && <Text style={s.mail}>{user.email}</Text>}
        </View>
      </View>
      <Text style={s.lab}>{t('language')}</Text>
      <View style={s.langs}>
        {LANGS.map((l) => (
          <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: l === lang }} onPress={() => setLang(l)} style={[s.lang, l === lang && { backgroundColor: C.accent }]}>
            <Text style={[s.langT, l === lang && { color: '#fff' }]}>{LANG_NAMES[l]}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => signOut()} style={s.out}><Text style={s.outT}>{t('signOut')}</Text></Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 },
  h: { fontSize: 28, fontWeight: '900', color: C.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 14 },
  av: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 18, fontWeight: '800', color: C.ink },
  mail: { fontSize: 13, color: C.muted },
  lab: { fontSize: 13, fontWeight: '700', color: C.muted },
  langs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lang: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.card },
  langT: { fontWeight: '700', color: C.ink },
  out: { marginTop: 'auto', minHeight: 50, borderRadius: 25, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  outT: { color: '#C62828', fontWeight: '800', fontSize: 15 },
});
