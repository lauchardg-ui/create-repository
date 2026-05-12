import { VisitedRestaurant, NewRestaurant, UserPreferences } from '../types/restaurant';
import { getDistanceKm } from './location';

/**
 * Analyzes visited restaurants to build a preference profile.
 */
export function buildPreferences(visited: VisitedRestaurant[]): UserPreferences {
  if (visited.length === 0) {
    return {
      favoriteCuisines: [],
      averagePriceLevel: 2,
      preferredRadius: 10,
      notificationsEnabled: true,
    };
  }

  // Count cuisine frequency, weighted by rating
  const cuisineScores = new Map<string, number>();
  let totalPrice = 0;

  for (const r of visited) {
    const score = cuisineScores.get(r.cuisine) || 0;
    cuisineScores.set(r.cuisine, score + r.rating);
    totalPrice += r.priceLevel;
  }

  // Sort cuisines by weighted score
  const sortedCuisines = Array.from(cuisineScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cuisine]) => cuisine);

  return {
    favoriteCuisines: sortedCuisines.slice(0, 5),
    averagePriceLevel: Math.round(totalPrice / visited.length),
    preferredRadius: 10,
    notificationsEnabled: true,
  };
}

/**
 * Scores a new restaurant against user preferences and visited history.
 * Returns a score from 0-100 with reasons for the match.
 */
export function scoreRestaurant(
  restaurant: NewRestaurant,
  preferences: UserPreferences,
  visited: VisitedRestaurant[],
  userLat: number,
  userLon: number
): { score: number; reasons: string[] } {
  let score = 50; // Base score
  const reasons: string[] = [];

  // Cuisine match (up to +30)
  const cuisineIndex = preferences.favoriteCuisines.indexOf(restaurant.cuisine);
  if (cuisineIndex >= 0) {
    const cuisineBonus = 30 - cuisineIndex * 5;
    score += Math.max(cuisineBonus, 5);
    reasons.push(`Matches your love of ${restaurant.cuisine} food`);
  }

  // Price level match (up to +15)
  const priceDiff = Math.abs(restaurant.priceLevel - preferences.averagePriceLevel);
  if (priceDiff === 0) {
    score += 15;
    reasons.push('Right in your price range');
  } else if (priceDiff === 1) {
    score += 8;
  }

  // Distance bonus (up to +20)
  const distance = getDistanceKm(userLat, userLon, restaurant.latitude, restaurant.longitude);
  if (distance <= 2) {
    score += 20;
    reasons.push('Very close to you');
  } else if (distance <= 5) {
    score += 12;
    reasons.push('Nearby');
  } else if (distance <= preferences.preferredRadius) {
    score += 5;
  }

  // Newness bonus (+10)
  if (restaurant.isNew) {
    score += 10;
    reasons.push('Just opened!');
  }

  // Avoid already-visited places (-50)
  const alreadyVisited = visited.some(
    (v) => v.name.toLowerCase() === restaurant.name.toLowerCase()
  );
  if (alreadyVisited) {
    score -= 50;
    reasons.length = 0;
    reasons.push("You've already been here");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/**
 * Score and sort a list of new restaurants by match quality.
 */
export function rankRestaurants(
  restaurants: NewRestaurant[],
  preferences: UserPreferences,
  visited: VisitedRestaurant[],
  userLat: number,
  userLon: number
): NewRestaurant[] {
  return restaurants
    .map((r) => {
      const { score, reasons } = scoreRestaurant(r, preferences, visited, userLat, userLon);
      return { ...r, matchScore: score, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
