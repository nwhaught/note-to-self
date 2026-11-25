// ============================================================================
// NotificationManager - thin wrapper over notifee / Android notification APIs
// ============================================================================
import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

export const WISDOM_PREFIX = 'wisdom-';
export const NAG_PREFIX = 'nag-';

const ACCENT_COLOR = '#6366f1';
const SMALL_ICON = 'ic_notification';

export class NotificationManager {
  constructor() {
    this.wisdomChannelId = 'notetoself-wisdom';
    this.nagChannelId = 'notetoself-nag';
  }

  /** Create channels. Safe to call from a headless/background context. */
  async createChannels() {
    await notifee.createChannel({
      id: this.wisdomChannelId,
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

  /** Ask for POST_NOTIFICATIONS (Android 13+). Needs a foreground Activity. */
  async requestPermission() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  _androidOptions(isNag) {
    return {
      channelId: isNag ? this.nagChannelId : this.wisdomChannelId,
      importance: isNag ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
      smallIcon: SMALL_ICON,
      color: ACCENT_COLOR,
      pressAction: { id: 'default' },
    };
  }

  /**
   * Schedule one notification.
   *
   * Uses AlarmManager with SET_AND_ALLOW_WHILE_IDLE: fires while the device
   * is dozing, needs no exact-alarm permission, and typically lands within a
   * few minutes of the target. Notifee's default (WorkManager) can be deferred
   * for hours on modern devices, and exact alarm types are silently dropped
   * when SCHEDULE_EXACT_ALARM isn't granted (Android 14+ default) - so the
   * type is always set explicitly here.
   */
  async scheduleNotification({ id, title, body, timestamp, isNag = false, data = {} }) {
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
    };
    await notifee.createTriggerNotification(
      {
        id,
        title,
        body,
        data: { kind: isNag ? 'nag' : 'wisdom', ...data },
        android: this._androidOptions(isNag),
      },
      trigger,
    );
  }

  async displayImmediate({ title, body }) {
    await notifee.displayNotification({
      title,
      body,
      android: this._androidOptions(false),
    });
  }

  async getScheduled() {
    return notifee.getTriggerNotifications();
  }

  async getScheduledByPrefix(prefix) {
    const scheduled = await notifee.getTriggerNotifications();
    return scheduled.filter(n => n.notification.id?.startsWith(prefix));
  }

  async cancelIds(ids) {
    if (ids.length > 0) {
      await notifee.cancelTriggerNotifications(ids);
    }
  }

  async cancelByPrefix(prefix) {
    const scheduled = await this.getScheduledByPrefix(prefix);
    await this.cancelIds(scheduled.map(n => n.notification.id));
  }

  async cancelAll() {
    await notifee.cancelAllNotifications();
    await notifee.cancelTriggerNotifications();
  }

  /**
   * Everything that can silently stop notifications from arriving, so the UI
   * can walk the user through fixing it.
   */
  async getHealth() {
    const health = {
      permissionGranted: true,
      wisdomChannelBlocked: false,
      nagChannelBlocked: false,
      batteryOptimized: false,
      hasPowerManager: false,
      manufacturer: null,
    };
    if (Platform.OS !== 'android') return health;

    const settings = await notifee.getNotificationSettings();
    health.permissionGranted = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;

    const [wisdom, nag] = await Promise.all([
      notifee.getChannel(this.wisdomChannelId),
      notifee.getChannel(this.nagChannelId),
    ]);
    health.wisdomChannelBlocked = !!wisdom?.blocked;
    health.nagChannelBlocked = !!nag?.blocked;

    health.batteryOptimized = await notifee.isBatteryOptimizationEnabled();
    const power = await notifee.getPowerManagerInfo();
    health.hasPowerManager = !!power?.activity;
    health.manufacturer = power?.manufacturer || null;
    return health;
  }

  openNotificationSettings(channelId) {
    return notifee.openNotificationSettings(channelId);
  }

  openBatteryOptimizationSettings() {
    return notifee.openBatteryOptimizationSettings();
  }

  openPowerManagerSettings() {
    return notifee.openPowerManagerSettings();
  }
}
