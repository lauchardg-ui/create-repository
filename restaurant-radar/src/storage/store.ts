import AsyncStorage from '@react-native-async-storage/async-storage';
import { VisitedRestaurant, NewRestaurant, UserPreferences } from '../types/restaurant';

const KEYS = {
  VISITED: 'visited_restaurants',
  DISCOVERED: 'discovered_restaurants',
  PREFERENCES: 'user_preferences',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCuisines: [],
  averagePriceLevel: 2,
  preferredRadius: 10,
  notificationsEnabled: true,
};

export async function getVisitedRestaurants(): Promise<VisitedRestaurant[]> {
  const data = await AsyncStorage.getItem(KEYS.VISITED);
  return data ? JSON.parse(data) : [];
}

export async function addVisitedRestaurant(restaurant: VisitedRestaurant): Promise<void> {
  const existing = await getVisitedRestaurants();
  existing.push(restaurant);
  await AsyncStorage.setItem(KEYS.VISITED, JSON.stringify(existing));
}

export async function removeVisitedRestaurant(id: string): Promise<void> {
  const existing = await getVisitedRestaurants();
  const filtered = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEYS.VISITED, JSON.stringify(filtered));
}

export async function getDiscoveredRestaurants(): Promise<NewRestaurant[]> {
  const data = await AsyncStorage.getItem(KEYS.DISCOVERED);
  return data ? JSON.parse(data) : [];
}

export async function saveDiscoveredRestaurants(restaurants: NewRestaurant[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DISCOVERED, JSON.stringify(restaurants));
}

export async function getPreferences(): Promise<UserPreferences> {
  const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
  return data ? JSON.parse(data) : DEFAULT_PREFERENCES;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
}
