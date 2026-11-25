import React, { useCallback, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NotificationService from '../services/notifications';

/**
 * Surfaces anything on this device that would stop reminders arriving, with a
 * one-tap route to fix it. Renders nothing when everything is fine.
 */
export default function NotificationHealthCard() {
  const [issues, setIssues] = useState([]);

  const check = useCallback(async () => {
    try {
      const h = await NotificationService.getHealth();
      const found = [];
      if (!h.permissionGranted) {
        found.push({
          key: 'permission',
          text: 'Notifications are turned off for Note to Self.',
          action: 'Turn on',
          onPress: () => NotificationService.openNotificationSettings(),
        });
      } else {
        if (h.wisdomChannelBlocked) {
          found.push({
            key: 'wisdom',
            text: '"Wisdom Nuggets" notifications are blocked.',
            action: 'Fix',
            onPress: () => NotificationService.openNotificationSettings('notetoself-wisdom'),
          });
        }
        if (h.nagChannelBlocked) {
          found.push({
            key: 'nag',
            text: '"Nag Me Reminders" notifications are blocked.',
            action: 'Fix',
            onPress: () => NotificationService.openNotificationSettings('notetoself-nag'),
          });
        }
      }
      if (h.batteryOptimized) {
        found.push({
          key: 'battery',
          text: 'Battery optimization may delay or skip reminders. Set battery usage to "Unrestricted".',
          action: 'Open',
          onPress: () => NotificationService.openBatteryOptimizationSettings(),
        });
      }
      if (h.hasPowerManager && h.batteryOptimized) {
        found.push({
          key: 'power',
          text: `${h.manufacturer || 'Your phone'} has its own power saver. Allow Note to Self to run in the background.`,
          action: 'Open',
          onPress: () => NotificationService.openPowerManagerSettings(),
        });
      }
      setIssues(found);
    } catch (e) {
      console.warn('Health check failed', e);
    }
  }, []);

  // Re-check on focus and when returning from the system settings screens.
  useFocusEffect(
    useCallback(() => {
      check();
      const sub = AppState.addEventListener('change', s => s === 'active' && check());
      return () => sub.remove();
    }, [check]),
  );

  if (issues.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>⚠️ Reminders may not arrive</Text>
      {issues.map(issue => (
        <View key={issue.key} style={styles.row}>
          <Text style={styles.text}>{issue.text}</Text>
          <TouchableOpacity style={styles.button} onPress={issue.onPress}>
            <Text style={styles.buttonText}>{issue.action}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    marginRight: 12,
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
