import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    dailyFrequency: 3,
    startHour: 8,
    endHour: 22,
    minGapHours: 2,
  });
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    loadSettings();
    loadScheduledCount();
  }, []);

  const loadSettings = async () => {
    const data = await StorageService.getSettings();
    setSettings(data);
  };

  const loadScheduledCount = async () => {
    const scheduled = await NotificationService.getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);

    // Reschedule notifications when settings change
    if (settings.notificationsEnabled) {
      await NotificationService.scheduleWisdomNotifications();
      await NotificationService.scheduleNagNotifications();
      await loadScheduledCount();
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all messages, settings, and scheduled notifications. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAll();
            await NotificationService.cancelAllNotifications();
            Alert.alert('Success', 'All data cleared');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]
    );
  };

  const handleViewScheduled = async () => {
    const scheduled = await NotificationService.getScheduledNotifications();
    const wisdom = scheduled.filter(n => n.notification.id?.startsWith('wisdom-'));
    const nags = scheduled.filter(n => n.notification.id?.startsWith('nag-'));

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const wisdomList = wisdom.slice(0, 5).map(n =>
      `• ${formatTime(n.trigger.timestamp)}`
    ).join('\n');

    Alert.alert(
      'Scheduled Notifications',
      `Wisdom: ${wisdom.length}\nNag Reminders: ${nags.length}\n\nNext Wisdom Notifications:\n${wisdomList || 'None scheduled'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>Enable Notifications</Text>
            <Text style={styles.helperText}>Turn wisdom notifications on/off</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => {
              updateSetting('notificationsEnabled', value);
              if (!value) {
                NotificationService.cancelAllNotifications();
              }
            }}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={settings.notificationsEnabled ? '#6366f1' : '#f1f5f9'}
          />
        </View>
      </View>

      {settings.notificationsEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Frequency</Text>
            <Text style={styles.sectionDescription}>
              How many wisdom notifications per day (Nag reminders are separate)
            </Text>
            <View style={styles.frequencySelector}>
              {[1, 2, 3, 4, 5].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    settings.dailyFrequency === freq && styles.frequencyButtonActive,
                  ]}
                  onPress={() => updateSetting('dailyFrequency', freq)}>
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      settings.dailyFrequency === freq && styles.frequencyButtonTextActive,
                    ]}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Hours</Text>
            <Text style={styles.sectionDescription}>
              When notifications can appear
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <View style={styles.timePicker}>
                  {[6, 7, 8, 9, 10].map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeButton,
                        settings.startHour === hour && styles.timeButtonActive,
                      ]}
                      onPress={() => updateSetting('startHour', hour)}>
                      <Text
                        style={[
                          styles.timeButtonText,
                          settings.startHour === hour && styles.timeButtonTextActive,
                        ]}>
                        {hour}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>End Time</Text>
                <View style={styles.timePicker}>
                  {[20, 21, 22, 23, 24].map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeButton,
                        settings.endHour === hour && styles.timeButtonActive,
                      ]}
                      onPress={() => updateSetting('endHour', hour)}>
                      <Text
                        style={[
                          styles.timeButtonText,
                          settings.endHour === hour && styles.timeButtonTextActive,
                        ]}>
                        {hour === 24 ? '12:00 AM' : `${hour}:00`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Minimum Gap Between Notifications</Text>
            <Text style={styles.sectionDescription}>
              Ensures notifications are spread throughout the day
            </Text>
            <View style={styles.gapSelector}>
              {[1, 2, 3, 4].map((gap) => (
                <TouchableOpacity
                  key={gap}
                  style={[
                    styles.gapButton,
                    settings.minGapHours === gap && styles.gapButtonActive,
                  ]}
                  onPress={() => updateSetting('minGapHours', gap)}>
                  <Text
                    style={[
                      styles.gapButtonText,
                      settings.minGapHours === gap && styles.gapButtonTextActive,
                    ]}>
                    {gap}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Notifications</Text>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={handleViewScheduled}>
          <Text style={styles.infoButtonText}>
            📅 View Scheduled ({scheduledCount})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearAllData}>
          <Text style={styles.dangerButtonText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  dangerSection: {
    marginBottom: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  settingLabel: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  frequencyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  timePicker: {
    gap: 6,
  },
  timeButton: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  gapSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  gapButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  gapButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  gapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  gapButtonTextActive: {
    color: '#fff',
  },
  infoButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});