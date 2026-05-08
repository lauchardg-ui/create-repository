import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  navigation: any;
}

export default function MonthPickerScreen({ navigation }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const handleMonthPress = (monthIndex: number) => {
    navigation.navigate('Availability', {
      year: selectedYear,
      month: monthIndex + 1,
      monthName: MONTHS[monthIndex],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>THE PIG</Text>
        <Text style={styles.subtitle}>Hotel Availability Checker</Text>
      </View>

      {/* Year Selector */}
      <View style={styles.yearRow}>
        <TouchableOpacity
          style={styles.yearArrow}
          onPress={() => setSelectedYear((y) => Math.max(y - 1, currentYear))}
          disabled={selectedYear <= currentYear}
        >
          <Text style={[styles.yearArrowText, selectedYear <= currentYear && styles.disabled]}>
            {'<'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.yearText}>{selectedYear}</Text>
        <TouchableOpacity
          style={styles.yearArrow}
          onPress={() => setSelectedYear((y) => Math.min(y + 1, currentYear + 2))}
          disabled={selectedYear >= currentYear + 2}
        >
          <Text style={[styles.yearArrowText, selectedYear >= currentYear + 2 && styles.disabled]}>
            {'>'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Grid */}
      <View style={styles.monthGrid}>
        {MONTHS.map((month, index) => {
          const isPast = selectedYear === currentYear && index < currentMonth;
          return (
            <TouchableOpacity
              key={month}
              style={[styles.monthCard, isPast && styles.monthCardPast]}
              onPress={() => handleMonthPress(index)}
              disabled={isPast}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthText, isPast && styles.monthTextPast]}>
                {month.substring(0, 3).toUpperCase()}
              </Text>
              <Text style={[styles.monthFull, isPast && styles.monthTextPast]}>
                {month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Firewall Indicator */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityIcon}>🛡️</Text>
        <Text style={styles.securityText}>
          Secure proxy active — your device never contacts external sites directly
        </Text>
      </View>
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
    paddingBottom: 10,
  },
  logo: {
    fontSize: 36,
    fontWeight: '200',
    color: '#c8a97e',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    letterSpacing: 2,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 24,
  },
  yearArrow: {
    padding: 12,
  },
  yearArrowText: {
    fontSize: 24,
    color: '#c8a97e',
    fontWeight: '300',
  },
  disabled: {
    color: '#444',
  },
  yearText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 4,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'center',
  },
  monthCard: {
    width: '30%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  monthCardPast: {
    opacity: 0.3,
  },
  monthText: {
    fontSize: 22,
    fontWeight: '300',
    color: '#c8a97e',
    letterSpacing: 3,
  },
  monthFull: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    letterSpacing: 1,
  },
  monthTextPast: {
    color: '#555',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
  },
});
