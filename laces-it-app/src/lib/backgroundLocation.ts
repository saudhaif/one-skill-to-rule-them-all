import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const WORKOUT_LOCATION_TASK = 'laces-it-workout-location';
const STORAGE_KEY = 'lacesit.background-location';

TaskManager.defineTask(WORKOUT_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations: Location.LocationObject[] }).locations;
  if (!locations?.length) return;
  const previous = await AsyncStorage.getItem(STORAGE_KEY).then((value) => value ? JSON.parse(value) as Location.LocationObject[] : []).catch(() => []);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...previous, ...locations].slice(-500))).catch(() => {});
});

export async function startBackgroundLocation() {
  const started = await Location.hasStartedLocationUpdatesAsync(WORKOUT_LOCATION_TASK);
  if (started) return;
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Location.startLocationUpdatesAsync(WORKOUT_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 2,
    timeInterval: 1000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(WORKOUT_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(WORKOUT_LOCATION_TASK);
  }
}
