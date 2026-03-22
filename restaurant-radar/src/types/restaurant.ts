export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: 1 | 2 | 3 | 4; // $ to $$$$
  latitude: number;
  longitude: number;
  address: string;
  source: 'manual' | 'timeout' | 'eater' | 'infatuation' | 'other';
  sourceUrl?: string;
  openedDate?: string; // ISO date string
  imageUrl?: string;
}

export interface VisitedRestaurant extends Restaurant {
  visitDate: string; // ISO date string
  rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  wouldReturn: boolean;
}

export interface NewRestaurant extends Restaurant {
  matchScore: number; // 0-100, how well it matches user preferences
  matchReasons: string[];
  isNew: boolean; // opened recently
  discoveredAt: string; // ISO date string
  notified: boolean;
}

export interface UserPreferences {
  favoriteCuisines: string[];
  averagePriceLevel: number;
  preferredRadius: number; // in km
  notificationsEnabled: boolean;
}
