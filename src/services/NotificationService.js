import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import StorageService from './StorageService';

class NotificationService {
  channelId = 'notetoself-wisdom';
  nagChannelId = 'notetoself-nag';

  async initialize() {
    // Request permissions
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    // Create notification channels
 await notifee.createChannel({
   id: this.channelId,
   name: 'Wisdom Nuggets',
   importance: AndroidImportance.DEFAULT,
   sound: 'default',
 });

    await notifee.createChannel({
      id: this.nagChannelId,
      name: 'Nag Me Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Weighted random selection
  async selectNextMessage() {
    const messages = await StorageService.getMessages();
    const regularMessages = messages.filter(m => !m.isNagMe);

    if (regularMessages.length === 0) return null;

    // Calculate weights with boost for new messages (default weight)
    const weightedMessages = regularMessages.map(msg => {
      let weight = msg.weight || 3;
      // Boost messages with default weight that are less than 2 weeks old
      if (weight === 3 && StorageService.isMessageNew(msg)) {
        weight = weight * 1.5;
      }
      return { ...msg, effectiveWeight: weight };
    });

    // Calculate total weight
    const totalWeight = weightedMessages.reduce((sum, msg) => sum + msg.effectiveWeight, 0);

    // Random selection based on weight
    let random = Math.random() * totalWeight;
    for (const msg of weightedMessages) {
      random -= msg.effectiveWeight;
      if (random <= 0) {
        return msg;
      }
    }

    return weightedMessages[0]; // Fallback
  }

  // Calculate next notification times within the day
  calculateNotificationTimes(settings) {
    const times = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startTime = new Date(today);
    startTime.setHours(settings.startHour, 0, 0, 0);

    const endTime = new Date(today);
    endTime.setHours(settings.endHour, 0, 0, 0);

    // If current time is past end time, schedule for tomorrow
    if (now > endTime) {
      startTime.setDate(startTime.getDate() + 1);
      endTime.setDate(endTime.getDate() + 1);
    }

    const windowMs = endTime - startTime;
    const count = settings.dailyFrequency;
    const minGapMs = settings.minGapHours * 60 * 60 * 1000;

    // Generate random times with minimum gap
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let validTime = null;

      while (attempts < 50 && !validTime) {
        const randomOffset = Math.random() * windowMs;
        const candidateTime = new Date(startTime.getTime() + randomOffset);

        // Check if this time respects minimum gap from other scheduled times
        const tooClose = times.some(t => Math.abs(candidateTime - t) < minGapMs);

        if (!tooClose && candidateTime > now) {
          validTime = candidateTime;
        }
        attempts++;
      }

      if (validTime) {
        times.push(validTime);
      }
    }

    return times.sort((a, b) => a - b);
  }

  // Schedule regular wisdom notifications
  async scheduleWisdomNotifications() {
    const settings = await StorageService.getSettings();

    if (!settings.notificationsEnabled) {
      await this.cancelAllWisdomNotifications();
      return;
    }

    // Cancel existing wisdom notifications
    await this.cancelAllWisdomNotifications();

    // Calculate notification times
    const times = this.calculateNotificationTimes(settings);

    // Schedule each notification
    for (const time of times) {
      const message = await this.selectNextMessage();
      if (!message) continue;

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: time.getTime(),
      };

await notifee.createTriggerNotification(
  {
    id: `wisdom-${time.getTime()}`,
    title: '💡 Note to Self',
    body: message.text,
    android: {
      channelId: this.channelId,
      importance: AndroidImportance.DEFAULT,
      smallIcon: 'ic_notification', // ADD THIS LINE
      color: '#6366f1', // Optional: accent color for the icon
      pressAction: {
        id: 'default',
      },
    },
  },
  trigger
);
      // Update last shown time
      await StorageService.updateMessage(message.id, { lastShown: time.getTime() });
    }

    // Save state
    await StorageService.saveState({
      lastNotificationTime: Date.now(),
    });
  }

  // Schedule nag me notifications
  async scheduleNagNotifications() {
    const messages = await StorageService.getMessages();
    const nagMessages = messages.filter(m => m.isNagMe);
    const settings = await StorageService.getSettings();

    // Cancel existing nag notifications
    await this.cancelAllNagNotifications();

    for (const msg of nagMessages) {
      await this.scheduleRepeatingNag(msg, settings);
    }
  }

  async scheduleRepeatingNag(message, settings) {
    const now = new Date();
    const intervalMs = message.nagIntervalMinutes * 60 * 1000;

    // Calculate next occurrence within quiet hours
    let nextTime = new Date(now.getTime() + intervalMs);
    nextTime = this.adjustForQuietHours(nextTime, settings);

    // Schedule next 24 hours worth of nags
    const scheduledTimes = [];
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let currentTime = nextTime;
    while (currentTime < endTime) {
      scheduledTimes.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + intervalMs);
      currentTime = this.adjustForQuietHours(currentTime, settings);
    }

    // Create notifications
    for (const time of scheduledTimes) {
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: time.getTime(),
      };

      await notifee.createTriggerNotification(
        {
          id: `nag-${message.id}-${time.getTime()}`,
          title: '⏰ Reminder',
          body: message.text,
          android: {
            channelId: this.nagChannelId,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
        },
        trigger
      );
    }
  }

  adjustForQuietHours(time, settings) {
    const hour = time.getHours();

    // If before start hour, move to start hour
    if (hour < settings.startHour) {
      time.setHours(settings.startHour, 0, 0, 0);
    }

    // If after end hour, move to start hour next day
    if (hour >= settings.endHour) {
      time.setDate(time.getDate() + 1);
      time.setHours(settings.startHour, 0, 0, 0);
    }

    return time;
  }

  async cancelAllWisdomNotifications() {
    const scheduled = await notifee.getTriggerNotifications();
    const wisdomIds = scheduled.filter(n => n.notification.id?.startsWith('wisdom-')).map(n => n.notification.id);
    await notifee.cancelTriggerNotifications(wisdomIds);
  }

  async cancelAllNagNotifications() {
    const scheduled = await notifee.getTriggerNotifications();
    const nagIds = scheduled.filter(n => n.notification.id?.startsWith('nag-')).map(n => n.notification.id);
    await notifee.cancelTriggerNotifications(nagIds);
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
    await notifee.cancelTriggerNotifications();
  }

  async getScheduledNotifications() {
    return await notifee.getTriggerNotifications();
  }

  // Send immediate test notification
  async sendTestNotification(message) {
    await notifee.displayNotification({
      title: '💡 Note to Self (Test)',
      body: message,
      android: {
        channelId: this.channelId,
        importance: AndroidImportance.DEFAULT,
      },
    });
  }
}

export default new NotificationService();