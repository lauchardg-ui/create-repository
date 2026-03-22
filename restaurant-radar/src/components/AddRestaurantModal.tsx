import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { VisitedRestaurant } from '../types/restaurant';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (restaurant: VisitedRestaurant) => void;
}

const CUISINES = [
  'Italian', 'Japanese', 'Chinese', 'Mexican', 'Indian', 'Thai', 'French',
  'Korean', 'Vietnamese', 'Mediterranean', 'American', 'Spanish', 'Greek',
  'Turkish', 'Lebanese', 'Seafood', 'Pizza', 'Sushi', 'Ramen', 'BBQ',
  'Vegan', 'Fusion', 'British', 'Other',
];

export default function AddRestaurantModal({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [address, setAddress] = useState('');
  const [rating, setRating] = useState(3);
  const [priceLevel, setPriceLevel] = useState<1 | 2 | 3 | 4>(2);
  const [notes, setNotes] = useState('');
  const [wouldReturn, setWouldReturn] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the restaurant name');
      return;
    }
    if (!cuisine) {
      Alert.alert('Required', 'Please select a cuisine type');
      return;
    }

    const restaurant: VisitedRestaurant = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      cuisine,
      priceLevel,
      latitude: 0,
      longitude: 0,
      address: address.trim(),
      source: 'manual',
      visitDate: new Date().toISOString(),
      rating: rating as 1 | 2 | 3 | 4 | 5,
      notes: notes.trim() || undefined,
      wouldReturn,
    };

    onAdd(restaurant);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setCuisine('');
    setAddress('');
    setRating(3);
    setPriceLevel(2);
    setNotes('');
    setWouldReturn(true);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Restaurant</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Restaurant Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. The River Cafe"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Cuisine *</Text>
          <View style={styles.chipContainer}>
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, cuisine === c && styles.chipSelected]}
                onPress={() => setCuisine(c)}
              >
                <Text style={[styles.chipText, cuisine === c && styles.chipTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="123 Main St"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Rating</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity key={r} onPress={() => setRating(r)}>
                <Text style={[styles.star, r <= rating && styles.starActive]}>
                  {r <= rating ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Price Level</Text>
          <View style={styles.priceRow}>
            {([1, 2, 3, 4] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priceBtn, priceLevel === p && styles.priceBtnActive]}
                onPress={() => setPriceLevel(p)}
              >
                <Text style={[styles.priceText, priceLevel === p && styles.priceTextActive]}>
                  {'$'.repeat(p)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Would you go back?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, wouldReturn && styles.toggleActive]}
              onPress={() => setWouldReturn(true)}
            >
              <Text style={[styles.toggleText, wouldReturn && styles.toggleTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !wouldReturn && styles.toggleActive]}
              onPress={() => setWouldReturn(false)}
            >
              <Text style={[styles.toggleText, !wouldReturn && styles.toggleTextActive]}>No</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you think?"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 16,
    color: '#888',
  },
  saveBtn: {
    fontSize: 16,
    color: '#4A90D9',
    fontWeight: '600',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  chipSelected: {
    backgroundColor: '#4A90D9',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 32,
    color: '#ddd',
  },
  starActive: {
    color: '#FFC107',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  priceBtnActive: {
    backgroundColor: '#4CAF50',
  },
  priceText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  priceTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  toggleActive: {
    backgroundColor: '#4A90D9',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
