import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MonthPickerScreen from './src/screens/MonthPickerScreen';
import AvailabilityScreen from './src/screens/AvailabilityScreen';
import RoomsScreen from './src/screens/RoomsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#c8a97e',
          headerTitleStyle: { fontWeight: '300' },
          contentStyle: { backgroundColor: '#1a1a1a' },
        }}
      >
        <Stack.Screen
          name="MonthPicker"
          component={MonthPickerScreen}
          options={{ title: 'THE PIG', headerShown: false }}
        />
        <Stack.Screen
          name="Availability"
          component={AvailabilityScreen}
          options={({ route }: any) => ({
            title: `${route.params.monthName} ${route.params.year}`,
          })}
        />
        <Stack.Screen
          name="Rooms"
          component={RoomsScreen}
          options={({ route }: any) => ({
            title: route.params.hotelName,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
