import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { MAP_PROVIDER } from '@/lib/maps';
import { C } from '@/lib/theme';
import type { Spot } from '@/lib/spots';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type Coordinate = { latitude: number; longitude: number };

export function RideMapPreview({ region, spots }: { region: Region; spots: Spot[] }) {
  return (
    <MapView provider={MAP_PROVIDER} style={StyleSheet.absoluteFill} mapType="satellite" region={region} liteMode scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} pointerEvents="none" toolbarEnabled={false}>
      {spots.map((x) => (
        <Marker key={x.key} coordinate={{ latitude: x.lat, longitude: x.lon }} tracksViewChanges={false}>
          <View style={[styles.dot, { backgroundColor: x.rides.every((r) => r.sport === 'run') ? C.run : C.accent }]} />
        </Marker>
      ))}
    </MapView>
  );
}

export function RideMapDetail({ region, route, coordinate }: { region: Region; route: Coordinate[]; coordinate: Coordinate }) {
  return (
    <MapView provider={MAP_PROVIDER} style={StyleSheet.absoluteFill} mapType="hybrid" initialRegion={region} toolbarEnabled={false} rotateEnabled={false}>
      {route.length > 1 && <Polyline coordinates={route} strokeColor={C.accent} strokeWidth={5} />}
      <Marker coordinate={coordinate} pinColor={C.accent} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
});
