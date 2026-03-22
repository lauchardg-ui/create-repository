import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HistoryScreen from './src/screens/HistoryScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    History: '📋',
    Discover: '🔍',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarActiveTintColor: '#4A90D9',
          tabBarInactiveTintColor: '#888',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{ title: 'Discover' }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'My Restaurants' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
