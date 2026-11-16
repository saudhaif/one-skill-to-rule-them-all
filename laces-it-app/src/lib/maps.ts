// Google Maps for every map: always on Android, and on iPhone once the app is built with an iOS Google Maps key
// (GOOGLE_MAPS_IOS_KEY, with EXPO_PUBLIC_GOOGLE_MAPS_IOS=1). Without it iPhone uses Apple Maps' satellite view.
import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';

export const MAP_PROVIDER = Platform.OS === 'android' || process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS === '1' ? PROVIDER_GOOGLE : undefined;
