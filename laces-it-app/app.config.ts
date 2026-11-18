// Adds the Google Maps keys from the environment (never committed) to app.json.
// Android maps need a key; iPhone uses Apple Maps unless an iOS key is given.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    'expo-web-browser',
    ['react-native-ble-plx', {
      isBackgroundEnabled: true,
      modes: ['peripheral', 'central'],
      bluetoothAlwaysPermission: 'Laces It connects to heart-rate, cadence and power sensors.',
    }],
    ['react-native-maps', {
      androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
    }],
  ],
});
