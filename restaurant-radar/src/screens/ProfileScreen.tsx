import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { UserPreferences, VisitedRestaurant } from '../types/restaurant';
import { getVisitedRestaurants, getPreferences, savePreferences } from '../storage/store';
import { buildPreferences } from '../services/matcher';
import { requestNotificationPermission, schedulePeriodicCheck } from '../services/notifications';

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];

export default function ProfileScreen() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [visited, setVisited] = useState<VisitedRestaurant[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const v = await getVisitedRestaurants();
        setVisited(v);

        const saved = await getPreferences();
        const built = buildPreferences(v);
        // Merge: use auto-detected cuisines but keep user's notification/radius settings
        setPreferences({
          ...built,
          notificationsEnabled: saved.notificationsEnabled,
          preferredRadius: saved.preferredRadius,
        });
      })();
    }, [])
  );

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }
      await schedulePeriodicCheck();
    }

    const updated = { ...preferences!, notificationsEnabled: enabled };
    setPreferences(updated);
    await savePreferences(updated);
  };

  const handleRadiusChange = async (radius: number) => {
    const updated = { ...preferences!, preferredRadius: radius };
    setPreferences(updated);
    await savePreferences(updated);
  };

  if (!preferences) return null;

  // Compute taste profile stats
  const cuisineCounts = new Map<string, number>();
  const priceCounts = new Map<number, number>();
  for (const r of visited) {
    cuisineCounts.set(r.cuisine, (cuisineCounts.get(r.cuisine) || 0) + 1);
    priceCounts.set(r.priceLevel, (priceCounts.get(r.priceLevel) || 0) + 1);
  }

  return (
    <ScrollView style={styles.container}>
      {/* Taste Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Taste Profile</Text>
        {preferences.favoriteCuisines.length > 0 ? (
          <>
            <Text style={styles.subtitle}>Favorite Cuisines</Text>
            <View style={styles.chipContainer}>
              {preferences.favoriteCuisines.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {c} ({cuisineCounts.get(c) || 0})
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.subtitle}>Price Preference</Text>
            <Text style={styles.value}>
              {'$'.repeat(Math.round(preferences.averagePriceLevel))} average
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>
            Add some visited restaurants to build your taste profile!
          </Text>
        )}
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>New Restaurant Alerts</Text>
            <Text style={styles.settingDescription}>
              Get notified when matching restaurants open nearby
            </Text>
          </View>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: '#4A90D9' }}
          />
        </View>
      </View>

      {/* Search Radius */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Radius</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.radiusBtn,
                preferences.preferredRadius === r && styles.radiusBtnActive,
              ]}
              onPress={() => handleRadiusChange(r)}
            >
              <Text
                style={[
                  styles.radiusText,
                  preferences.preferredRadius === r && styles.radiusTextActive,
                ]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Data Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sources</Text>
        <View style={styles.sourceList}>
          {[
            { name: 'Timeout', color: '#E4002B', desc: 'New restaurant openings and reviews' },
            { name: 'Eater', color: '#E32726', desc: 'Best new restaurants and food news' },
            { name: 'The Infatuation', color: '#000', desc: 'Honest restaurant reviews and guides' },
          ].map((source) => (
            <View key={source.name} style={styles.sourceRow}>
              <View style={[styles.sourceDot, { backgroundColor: source.color }]} />
              <View>
                <Text style={styles.sourceName}>{source.name}</Text>
                <Text style={styles.sourceDesc}>{source.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#4A90D9',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    maxWidth: 250,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  radiusBtnActive: {
    backgroundColor: '#4A90D9',
  },
  radiusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radiusTextActive: {
    color: '#fff',
  },
  sourceList: {
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sourceDesc: {
    fontSize: 12,
    color: '#888',
  },
});
