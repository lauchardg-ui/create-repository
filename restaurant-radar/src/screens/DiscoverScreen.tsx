import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NewRestaurant } from '../types/restaurant';
import { getVisitedRestaurants, getDiscoveredRestaurants, saveDiscoveredRestaurants, getPreferences } from '../storage/store';
import { getCurrentLocation } from '../services/location';
import { scrapeNewRestaurants, toNewRestaurants } from '../services/scraper';
import { buildPreferences, rankRestaurants } from '../services/matcher';
import { sendNewRestaurantNotification } from '../services/notifications';
import RestaurantCard from '../components/RestaurantCard';

export default function DiscoverScreen() {
  const [restaurants, setRestaurants] = useState<NewRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [city, setCity] = useState<string>('');

  const fetchNewRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      // Get user's location
      const location = await getCurrentLocation();
      if (!location) {
        setLoading(false);
        return;
      }
      setCity(location.city || 'your area');

      // Get visited restaurants and build preferences
      const visited = await getVisitedRestaurants();
      const prefs = visited.length > 0 ? buildPreferences(visited) : await getPreferences();

      // Scrape new restaurants from multiple sources
      const scraped = await scrapeNewRestaurants(location.city || 'new-york');
      const newRestaurants = toNewRestaurants(scraped, location.latitude, location.longitude);

      // Score and rank them
      const ranked = rankRestaurants(
        newRestaurants,
        prefs,
        visited,
        location.latitude,
        location.longitude
      );

      // Save and display
      await saveDiscoveredRestaurants(ranked);
      setRestaurants(ranked);
      setLastUpdated(new Date().toLocaleString());

      // Notify about top matches
      const topMatches = ranked.filter((r) => r.matchScore >= 80 && !r.notified);
      for (const match of topMatches.slice(0, 3)) {
        await sendNewRestaurantNotification(match);
        match.notified = true;
      }
      if (topMatches.length > 0) {
        await saveDiscoveredRestaurants(ranked);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Load cached results on focus
      (async () => {
        const cached = await getDiscoveredRestaurants();
        if (cached.length > 0) {
          setRestaurants(cached);
        }
      })();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNewRestaurants();
    setRefreshing(false);
  };

  const handleRestaurantPress = (restaurant: NewRestaurant) => {
    if (restaurant.sourceUrl) {
      Linking.openURL(restaurant.sourceUrl);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>
          {city ? `New in ${city}` : 'Discover New Restaurants'}
        </Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>Updated: {lastUpdated}</Text>
        )}
        <Text style={styles.sourceInfo}>
          Sources: Timeout, Eater, The Infatuation
        </Text>
      </View>

      {/* Search Button */}
      {restaurants.length === 0 && !loading && (
        <View style={styles.searchPrompt}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchTitle}>Find New Restaurants</Text>
          <Text style={styles.searchText}>
            Tap below to search Timeout, Eater, and The Infatuation for newly opened restaurants near you.
          </Text>
          <TouchableOpacity style={styles.searchButton} onPress={fetchNewRestaurants}>
            <Text style={styles.searchButtonText}>Search Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Searching restaurant sources...</Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            showMatchScore
            onPress={() => handleRestaurantPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          restaurants.length > 0 ? (
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchNewRestaurants}>
              <Text style={styles.refreshBtnText}>Search for more</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  sourceInfo: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 2,
  },
  searchPrompt: {
    alignItems: 'center',
    padding: 40,
  },
  searchIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  searchText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  searchButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  refreshBtn: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  refreshBtnText: {
    color: '#4A90D9',
    fontSize: 15,
    fontWeight: '600',
  },
});
