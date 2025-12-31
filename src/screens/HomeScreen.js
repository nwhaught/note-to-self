import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';

export default function HomeScreen({ navigation }) {
  const [currentMessage, setCurrentMessage] = useState(null);
  const [nextNotificationTime, setNextNotificationTime] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const messages = await StorageService.getMessages();
      setMessageCount(messages.length);

      // Get a random message to display
      const regularMessages = messages.filter(m => !m.isNagMe);
      if (regularMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * regularMessages.length);
        setCurrentMessage(regularMessages[randomIndex]);
      }

      // Get next scheduled notification
      const scheduled = await NotificationService.getScheduledNotifications();
      const wisdomNotifs = scheduled
        .filter(n => n.notification.id?.startsWith('wisdom-'))
        .sort((a, b) => a.trigger.timestamp - b.trigger.timestamp);

      if (wisdomNotifs.length > 0) {
        setNextNotificationTime(new Date(wisdomNotifs[0].trigger.timestamp));
      } else {
        setNextNotificationTime(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    // Initialize notifications on first launch
    NotificationService.initialize();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleReschedule = async () => {
    setLoading(true);
    await NotificationService.scheduleWisdomNotifications();
    await NotificationService.scheduleNagNotifications();
    await loadData();
  };

  const formatNextNotification = () => {
    if (!nextNotificationTime) return 'Not scheduled';

    const now = new Date();
    const diff = nextNotificationTime - now;

    if (diff < 0) return 'Pending...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }
    return `In ${minutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
      }>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.messageCard}>
        <Text style={styles.messageLabel}>Current Wisdom</Text>
        {currentMessage ? (
          <Text style={styles.messageText}>{currentMessage.text}</Text>
        ) : (
          <Text style={styles.emptyText}>No messages yet. Add some wisdom! 💡</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{messageCount}</Text>
          <Text style={styles.statLabel}>Total Messages</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{formatNextNotification()}</Text>
          <Text style={styles.statLabel}>Next Wisdom</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Library')}>
        <Text style={styles.primaryButtonText}>📚 Message Library</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleReschedule}>
        <Text style={styles.secondaryButtonText}>🔄 Reschedule Notifications</Text>
      </TouchableOpacity>

      {currentMessage && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => NotificationService.sendTestNotification(currentMessage.text)}>
          <Text style={styles.testButtonText}>🧪 Test Notification</Text>
        </TouchableOpacity>
      )}
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  settingsButton: {
    padding: 10,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 150,
  },
  messageLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1e293b',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});