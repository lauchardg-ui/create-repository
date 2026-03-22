import * as Notifications from 'expo-notifications';
import { NewRestaurant } from '../types/restaurant';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendNewRestaurantNotification(restaurant: NewRestaurant): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New Restaurant: ${restaurant.name}`,
      body: `A new ${restaurant.cuisine} spot just opened! Match score: ${restaurant.matchScore}%`,
      data: { restaurantId: restaurant.id },
    },
    trigger: null, // Send immediately
  });
}

export async function sendBatchNotification(count: number, topMatch: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${count} New Restaurants Found!`,
      body: `Top pick: ${topMatch}. Open the app to explore.`,
      data: { type: 'batch' },
    },
    trigger: null,
  });
}

/**
 * Schedule a background check for new restaurants.
 * Note: For production, you'd use expo-background-fetch or a server-side solution.
 */
export async function schedulePeriodicCheck(): Promise<void> {
  // Schedule a daily reminder to check for new restaurants
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Restaurant Radar',
      body: 'Check out what new restaurants opened near you!',
      data: { type: 'reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 0,
    },
  });
}
