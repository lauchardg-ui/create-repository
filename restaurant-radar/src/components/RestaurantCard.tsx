import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { NewRestaurant, VisitedRestaurant } from '../types/restaurant';

interface Props {
  restaurant: NewRestaurant | VisitedRestaurant;
  onPress?: () => void;
  showMatchScore?: boolean;
}

const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];
const SOURCE_COLORS: Record<string, string> = {
  timeout: '#E4002B',
  eater: '#E32726',
  infatuation: '#000000',
  manual: '#4A90D9',
  other: '#888888',
};

export default function RestaurantCard({ restaurant, onPress, showMatchScore }: Props) {
  const isNew = 'matchScore' in restaurant;
  const matchScore = isNew ? (restaurant as NewRestaurant).matchScore : undefined;
  const matchReasons = isNew ? (restaurant as NewRestaurant).matchReasons : [];
  const rating = 'rating' in restaurant ? (restaurant as VisitedRestaurant).rating : undefined;

  const handleSourcePress = () => {
    if (restaurant.sourceUrl) {
      Linking.openURL(restaurant.sourceUrl);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          {showMatchScore && matchScore !== undefined && (
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(matchScore) }]}>
              <Text style={styles.scoreText}>{matchScore}%</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
          <Text style={styles.price}>{PRICE_LABELS[restaurant.priceLevel]}</Text>
          {rating && (
            <Text style={styles.rating}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</Text>
          )}
        </View>
      </View>

      {restaurant.address ? (
        <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
      ) : null}

      {matchReasons.length > 0 && (
        <View style={styles.reasons}>
          {matchReasons.map((reason, i) => (
            <View key={i} style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSourcePress}>
          <View style={[styles.sourceBadge, { backgroundColor: SOURCE_COLORS[restaurant.source] || '#888' }]}>
            <Text style={styles.sourceText}>{restaurant.source}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  if (score >= 40) return '#FFC107';
  return '#9E9E9E';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  scoreBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  cuisine: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  rating: {
    fontSize: 14,
    color: '#FFC107',
  },
  address: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reasonBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reasonText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sourceBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
