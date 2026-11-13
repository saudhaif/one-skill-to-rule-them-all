// Meeting points: each ride meets at the start of its route (or in the middle of its emirate),
// and rides that start within about 150 m of each other share one spot on the map.
import type { LatLon, Ride } from './store';

export const EM_LL: Record<string, LatLon> = {
  AUH: [24.47, 54.37], DXB: [25.2, 55.27], SHJ: [25.35, 55.4], AJM: [25.4, 55.45], UAQ: [25.55, 55.55], RAK: [25.79, 55.94], FUJ: [25.12, 56.33],
};
export const UAE_REGION = { latitude: 24.6, longitude: 54.6, latitudeDelta: 3.2, longitudeDelta: 3.6 };

export const meetingPoint = (r: Ride): LatLon => (r.route?.length ? r.route[0] : EM_LL[r.emirate] ?? EM_LL.DXB);

export type Filter = 'all' | 'bike' | 'run' | 'week' | 'mine';
export type Spot = { key: string; lat: number; lon: number; rides: Ride[] };

export function upcoming(rides: Ride[], filter: Filter = 'all', mine: (id: string) => boolean = () => false) {
  const now = Date.now();
  return rides
    .filter((r) => Date.parse(r.startAt) >= now - 3 * 36e5)
    .filter((r) => filter === 'all' || (filter === 'mine' ? mine(r.id) : filter === 'week' ? Date.parse(r.startAt) < now + 7 * 864e5 : (r.sport === 'run' ? 'run' : 'bike') === filter))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

export function spots(rides: Ride[]): Spot[] {
  const out: Spot[] = [];
  for (const r of rides) {
    const [lat, lon] = meetingPoint(r);
    let s = out.find((x) => Math.abs(x.lat - lat) < 0.0015 && Math.abs(x.lon - lon) < 0.0015);
    if (!s) out.push((s = { key: `${lat.toFixed(4)},${lon.toFixed(4)}`, lat, lon, rides: [] }));
    s.rides.push(r);
  }
  return out;
}

// A map region that shows every spot, with some room around them.
export function regionFor(points: LatLon[]) {
  if (!points.length) return UAE_REGION;
  const lats = points.map((p) => p[0]), lons = points.map((p) => p[1]);
  const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return { latitude: (a + b) / 2, longitude: (c + d) / 2, latitudeDelta: Math.max(0.03, (b - a) * 1.6), longitudeDelta: Math.max(0.03, (d - c) * 1.6) };
}
