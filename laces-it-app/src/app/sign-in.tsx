// Sign-in: Google through Firebase Auth. UAE PASS follows once the app is registered with UAE PASS.
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, firebaseReady } from '@/lib/firebase';
import { LANG_NAMES, LANGS } from '@/lib/i18n';
import { startDemo, useApp } from '@/lib/store';
import { C } from '@/lib/theme';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { t, lang, setLang } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [request, , prompt] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Google's sheet returns an ID token, which Firebase Auth turns into a signed-in member.
  const signIn = async () => {
    setErr(''); setBusy(true);
    try {
      const res = await prompt();
      if (res.type === 'success') await signInWithCredential(auth, GoogleAuthProvider.credential(res.params.id_token));
      else if (res.type === 'error') setErr(t('signInFail'));
    } catch {
      setErr(t('signInFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.langs}>
        {LANGS.map((l) => (
          <Pressable key={l} onPress={() => setLang(l)} style={[s.lang, l === lang && s.langOn]}>
            <Text style={[s.langT, l === lang && { color: '#fff' }]}>{LANG_NAMES[l]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.mid}>
        <Text style={s.logo}>{t('appName')}</Text>
        <Text style={s.title}>{t('signInTitle')}</Text>
        <Text style={s.sub}>{t('signInSub')}</Text>
      </View>
      <View style={s.btns}>
        {!firebaseReady && <Text style={s.err}>{t('notConfigured')}</Text>}
        {!firebaseReady && (
          <Pressable accessibilityRole="button" onPress={startDemo} style={[s.btn, s.btnDark]}>
            <Text style={[s.btnT, { color: '#fff' }]}>{t('tryDemo')}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!request || busy || !firebaseReady}
          onPress={signIn}
          style={({ pressed }) => [s.btn, (!request || !firebaseReady) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.98 }] }]}>
          {busy ? <ActivityIndicator color={C.ink} /> : <Text style={s.btnT}>{t('google')}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled style={[s.btn, s.btnDark, { opacity: 0.55 }]}>
          <Text style={[s.btnT, { color: '#fff' }]}>{t('uaePass')} · {t('soon')}</Text>
        </Pressable>
        {!!err && <Text style={s.err}>{err}</Text>}
        <Text style={s.legal}>{t('terms')} · {t('privacy')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.accent, padding: 20, justifyContent: 'space-between' },
  langs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lang: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.12)' },
  langOn: { backgroundColor: C.accentInk },
  langT: { fontWeight: '700', color: C.accentInk },
  mid: { gap: 10 },
  logo: { fontSize: 44, fontWeight: '900', color: C.accentInk },
  title: { fontSize: 26, fontWeight: '800', color: C.accentInk },
  sub: { fontSize: 16, color: C.accentInk, opacity: 0.8 },
  btns: { gap: 12 },
  btn: { minHeight: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnDark: { backgroundColor: C.accentInk },
  btnT: { fontSize: 16, fontWeight: '800', color: C.ink },
  err: { color: C.accentInk, fontWeight: '700', textAlign: 'center' },
  legal: { color: C.accentInk, opacity: 0.7, textAlign: 'center', fontSize: 12 },
});
