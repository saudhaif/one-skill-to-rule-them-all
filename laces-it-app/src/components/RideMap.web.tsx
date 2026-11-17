import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Spot } from '@/lib/spots';
import { C } from '@/lib/theme';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type Coordinate = { latitude: number; longitude: number };

export function RideMapPreview({ region, spots }: { region: Region; spots: Spot[] }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('iframe', {
        src: `https://www.google.com/maps?q=${region.latitude},${region.longitude}&z=8&output=embed`,
        title: 'Laces It map',
        style: { width: '100%', height: '100%', border: 0 },
      })}
      {spots.map((x) => <View key={x.key} pointerEvents="none" style={[styles.dot, { left: `${50}%`, top: `${50}%`, backgroundColor: x.rides.every((r) => r.sport === 'run') ? C.run : C.accent }]} />)}
    </View>
  );
}

export function RideMapDetail({ region, route, coordinate }: { region: Region; route: Coordinate[]; coordinate: Coordinate }) {
  void route;
  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('iframe', {
        src: `https://www.google.com/maps?q=${coordinate.latitude},${coordinate.longitude}&z=12&output=embed`,
        title: 'Ride map',
        style: { width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff', transform: [{ translateX: -7 }, { translateY: -7 }] },
});
