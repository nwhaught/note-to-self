/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import NotificationService from './src/services/notifications';

// Must be registered at module scope, before the app component, so notifee
// can run it headlessly when the app isn't open. Every delivered notification
// tops the schedule back up, which keeps reminders flowing indefinitely.
notifee.onBackgroundEvent(async event => {
  try {
    await NotificationService.handleEvent(event);
  } catch (e) {
    console.warn('[Notifications] Background event failed:', e);
  }
});

AppRegistry.registerComponent(appName, () => App);
