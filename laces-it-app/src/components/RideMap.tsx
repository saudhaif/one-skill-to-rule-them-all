import type { Spot } from '@/lib/spots';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type Coordinate = { latitude: number; longitude: number };

export function RideMapPreview(_props: { region: Region; spots: Spot[] }) {
  return null;
}

export function RideMapDetail(_props: { region: Region; route: Coordinate[]; coordinate: Coordinate }) {
  return null;
}
