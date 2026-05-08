import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Alert,
} from 'react-native';
import { RoomResponse } from '../types';
import { getRoomDetails } from '../services/api';

interface Props {
  route: any;
  navigation: any;
}

export default function RoomsScreen({ route, navigation }: Props) {
  const { hotelId, hotelName, checkIn } = route.params;
  const [data, setData] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nights, setNights] = useState(1);

  const fetchRooms = async (n: number) => {
    setLoading(true);
    try {
      const result = await getRoomDetails(hotelId, checkIn, n);
      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms(nights);
  }, [hotelId, checkIn]);

  const handleNightsChange = (n: number) => {
    setNights(n);
    fetchRooms(n);
  };

  const handleBook = (url?: string) => {
    const bookingUrl = url || data?.bookingUrl;
    if (bookingUrl) {
      Alert.alert(
        'Open Booking Page',
        `You'll be taken to The Pig's website to complete your booking for ${hotelName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: () => Linking.openURL(bookingUrl),
          },
        ]
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.hotelName}>{hotelName}</Text>
          <Text style={styles.dateText}>{formatDate(checkIn)}</Text>
        </View>

        {/* Nights Selector */}
        <View style={styles.nightsSection}>
          <Text style={styles.sectionLabel}>NUMBER OF NIGHTS</Text>
          <View style={styles.nightsRow}>
            {[1, 2, 3, 4, 5, 7].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.nightBtn, nights === n && styles.nightBtnActive]}
                onPress={() => handleNightsChange(n)}
              >
                <Text style={[styles.nightText, nights === n && styles.nightTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#c8a97e" />
            <Text style={styles.loadingText}>Checking rooms...</Text>
          </View>
        )}

        {/* Rooms */}
        {!loading && data && data.rooms.length > 0 && (
          <View style={styles.roomsList}>
            <Text style={styles.sectionLabel}>AVAILABLE ROOMS</Text>
            {data.rooms.map((room, i) => (
              <View key={i} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomPrice}>{room.price}</Text>
                </View>
                {room.description ? (
                  <Text style={styles.roomDesc}>{room.description}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => handleBook(room.bookingUrl || undefined)}
                >
                  <Text style={styles.bookBtnText}>Book This Room</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* No rooms found */}
        {!loading && data && data.rooms.length === 0 && (
          <View style={styles.noRooms}>
            <Text style={styles.noRoomsText}>
              No specific room details could be loaded. You can still book directly on The Pig's website.
            </Text>
          </View>
        )}

        {/* Direct Booking Button */}
        {!loading && data && (
          <TouchableOpacity
            style={styles.directBookBtn}
            onPress={() => handleBook()}
          >
            <Text style={styles.directBookText}>Book on thepighotel.com</Text>
            <Text style={styles.directBookSub}>
              {nights} night{nights > 1 ? 's' : ''} from {formatDate(checkIn)}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  hotelName: {
    fontSize: 22,
    fontWeight: '300',
    color: '#c8a97e',
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  nightsSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  nightsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  nightBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  nightBtnActive: {
    backgroundColor: '#c8a97e',
    borderColor: '#c8a97e',
  },
  nightText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  nightTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#777',
    fontSize: 14,
    marginTop: 12,
  },
  roomsList: {
    paddingTop: 8,
  },
  roomCard: {
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  roomPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c8a97e',
  },
  roomDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    marginBottom: 12,
  },
  bookBtn: {
    backgroundColor: '#c8a97e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 15,
  },
  noRooms: {
    padding: 24,
    alignItems: 'center',
  },
  noRoomsText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  directBookBtn: {
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8a97e',
  },
  directBookText: {
    color: '#c8a97e',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 1,
  },
  directBookSub: {
    color: '#777',
    fontSize: 12,
    marginTop: 4,
  },
});
