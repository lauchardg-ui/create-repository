import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { AvailabilityResponse, HotelAvailability } from '../types';
import { getMonthAvailability } from '../services/api';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  route: any;
  navigation: any;
}

export default function AvailabilityScreen({ route, navigation }: Props) {
  const { year, month, monthName } = route.params;
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const result = await getMonthAvailability(year, month);
      setData(result);
    } catch (err: any) {
      setError('Could not reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDayPress = (hotelId: string, hotelName: string, date: string, available: string) => {
    if (available === 'no') return;
    navigation.navigate('Rooms', { hotelId, hotelName, checkIn: date });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c8a97e" />
        <Text style={styles.loadingText}>Checking all Pig hotels...</Text>
        <Text style={styles.loadingSubtext}>This may take a moment</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Build the calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday=0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c8a97e" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{monthName} {year}</Text>
          <Text style={styles.headerSubtitle}>Tap an available date to see rooms</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E53935' }]} />
            <Text style={styles.legendText}>Sold Out</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
            <Text style={styles.legendText}>Unknown</Text>
          </View>
        </View>

        {/* Hotels */}
        {data && Object.entries(data.hotels).map(([hotelId, hotel]) => (
          <HotelCalendar
            key={hotelId}
            hotelId={hotelId}
            hotel={hotel}
            daysInMonth={daysInMonth}
            firstDayOfWeek={firstDayOfWeek}
            onDayPress={handleDayPress}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HotelCalendar({
  hotelId,
  hotel,
  daysInMonth,
  firstDayOfWeek,
  onDayPress,
}: {
  hotelId: string;
  hotel: HotelAvailability;
  daysInMonth: number;
  firstDayOfWeek: number;
  onDayPress: (hotelId: string, hotelName: string, date: string, available: string) => void;
}) {
  const availableCount = hotel.days.filter(d => d.available === 'yes').length;
  const soldOutCount = hotel.days.filter(d => d.available === 'no').length;

  // Build lookup
  const dayMap = new Map(hotel.days.map(d => [d.date, d]));

  // Build grid rows (weeks)
  const cells: (null | { day: number; date: string; available: string; price?: string })[] = [];

  // Empty cells for padding
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = hotel.days[day - 1]?.date || '';
    const dayData = dayMap.get(dateStr);
    cells.push({
      day,
      date: dateStr,
      available: dayData?.available || 'unknown',
      price: dayData?.price,
    });
  }

  return (
    <View style={calStyles.card}>
      {/* Hotel Header */}
      <View style={calStyles.hotelHeader}>
        <View>
          <Text style={calStyles.hotelName}>{hotel.name}</Text>
          <Text style={calStyles.hotelLocation}>{hotel.location}</Text>
        </View>
        <View style={calStyles.summary}>
          {availableCount > 0 && (
            <Text style={calStyles.availCount}>{availableCount} available</Text>
          )}
          {soldOutCount > 0 && (
            <Text style={calStyles.soldCount}>{soldOutCount} sold out</Text>
          )}
        </View>
      </View>

      {/* Day Headers */}
      <View style={calStyles.dayHeaders}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={calStyles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={calStyles.grid}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} style={calStyles.dayCell} />;
          }

          const bgColor =
            cell.available === 'yes' ? '#1B5E20' :
            cell.available === 'no' ? '#B71C1C' :
            '#333';

          return (
            <TouchableOpacity
              key={cell.day}
              style={[calStyles.dayCell, { backgroundColor: bgColor }]}
              onPress={() => onDayPress(hotelId, hotel.name, cell.date, cell.available)}
              disabled={cell.available === 'no'}
              activeOpacity={0.7}
            >
              <Text style={calStyles.dayNumber}>{cell.day}</Text>
              {cell.price && (
                <Text style={calStyles.dayPrice}>{cell.price}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hotelName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#c8a97e',
    letterSpacing: 1,
  },
  hotelLocation: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  summary: {
    alignItems: 'flex-end',
  },
  availCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  soldCount: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 2,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dayPrice: {
    fontSize: 9,
    color: '#ccc',
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 40,
  },
  loadingText: {
    color: '#c8a97e',
    fontSize: 16,
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#c8a97e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#1a1a1a',
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#888',
  },
});
