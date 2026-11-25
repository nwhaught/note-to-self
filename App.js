import React, { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import EditMessageScreen from './src/screens/EditMessageScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationService from './src/services/notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  // Deliveries while the app is open arrive here instead of the background handler.
  useEffect(
    () =>
      notifee.onForegroundEvent(event => {
        NotificationService.handleEvent(event).catch(e =>
          console.warn('[Notifications] Foreground event failed:', e),
        );
      }),
    [],
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'NoteToSelf' }}
        />
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: 'Message Library' }}
        />
        <Stack.Screen
          name="EditMessage"
          component={EditMessageScreen}
          options={{ title: 'Edit Message' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}