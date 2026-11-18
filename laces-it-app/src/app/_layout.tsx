import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isRTL } from '@/lib/i18n';
import { startSync, useApp } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, demo, authReady, lang } = useApp();
  useEffect(() => startSync(), []);
  useEffect(() => { if (authReady) SplashScreen.hideAsync(); }, [authReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Arabic lays the whole app out right to left. */}
        <View style={{ flex: 1, direction: isRTL(lang) ? 'rtl' : 'ltr' }}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!user || demo}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="map" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="ride/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={!user && !demo}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
