import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { VisitedRestaurant } from '../types/restaurant';
import { getVisitedRestaurants, addVisitedRestaurant, removeVisitedRestaurant } from '../storage/store';
import RestaurantCard from '../components/RestaurantCard';
import AddRestaurantModal from '../components/AddRestaurantModal';

export default function HistoryScreen() {
  const [restaurants, setRestaurants] = useState<VisitedRestaurant[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRestaurants = useCallback(async () => {
    const data = await getVisitedRestaurants();
    setRestaurants(data.sort((a, b) => b.visitDate.localeCompare(a.visitDate)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRestaurants();
    }, [loadRestaurants])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  };

  const handleAdd = async (restaurant: VisitedRestaurant) => {
    await addVisitedRestaurant(restaurant);
    await loadRestaurants();
  };

  const handleDelete = (restaurant: VisitedRestaurant) => {
    Alert.alert(
      'Remove Restaurant',
      `Remove "${restaurant.name}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeVisitedRestaurant(restaurant.id);
            await loadRestaurants();
          },
        },
      ]
    );
  };

  const stats = {
    total: restaurants.length,
    cuisines: new Set(restaurants.map((r) => r.cuisine)).size,
    avgRating: restaurants.length
      ? (restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1)
      : '0',
  };

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Visited</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.cuisines}</Text>
          <Text style={styles.statLabel}>Cuisines</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Restaurant List */}
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No restaurants yet</Text>
            <Text style={styles.emptyText}>
              Start adding restaurants you've visited to get personalized suggestions!
            </Text>
          </View>
        }
        contentContainerStyle={restaurants.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <AddRestaurantModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90D9',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});
