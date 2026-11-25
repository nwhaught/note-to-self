// ============================================================================
// NotificationScheduler - public facade for the notification system
// ============================================================================
import { EventType } from '@notifee/react-native';
import { NotificationManager, WISDOM_PREFIX } from './NotificationManager';
import { WisdomScheduler } from './WisdomScheduler';
import { NagScheduler } from './NagScheduler';
import { PersistenceManager } from './PersistenceManager';
import { MessageSelector } from '../scheduling/MessageSelector';

export class NotificationScheduler {
  constructor(storageService, notificationManager = new NotificationManager()) {
    this.storage = storageService;
    this.notificationManager = notificationManager;
    this.wisdomScheduler = new WisdomScheduler(
      notificationManager,
      new MessageSelector(storageService),
      storageService,
    );
    this.nagScheduler = new NagScheduler(notificationManager, storageService);
    this.persistence = new PersistenceManager(() => this.refresh());
    this._queue = Promise.resolve();
  }

  /**
   * Serialize all scheduling work. A background top-up and a UI-triggered
   * reschedule running at once would otherwise double-schedule days.
   */
  _exclusive(fn) {
    const run = this._queue.then(fn, fn);
    this._queue = run.catch(() => {});
    return run;
  }

  /** Call once from the foreground app (needs an Activity for the permission prompt). */
  async initialize() {
    await this.notificationManager.createChannels();
    this.persistence.start();
    // Schedule first: alarms can be registered without the permission, and the
    // permission prompt can stall indefinitely if the Activity isn't resumed
    // (e.g. launched behind the lock screen).
    const result = await this.refresh();
    this.notificationManager
      .requestPermission()
      .catch(e => console.warn('[Notifications] Permission request failed:', e));
    return result;
  }

  /** Top up both queues without disturbing what's already scheduled. Cheap and idempotent. */
  refresh() {
    return this._exclusive(async () => ({
      wisdom: await this.wisdomScheduler.schedule(),
      nags: await this.nagScheduler.schedule(),
    }));
  }

  /** Throw away and rebuild everything (settings changed, user pressed Reschedule). */
  rescheduleAll() {
    return this._exclusive(async () => ({
      wisdom: await this.wisdomScheduler.schedule({ reset: true }),
      nags: await this.nagScheduler.schedule({ reset: true }),
    }));
  }

  /** Call after wisdom message text/weights change. */
  rescheduleWisdom() {
    return this._exclusive(() => this.wisdomScheduler.schedule({ reset: true }));
  }

  /** Call after any nag message is added, edited, toggled or deleted. */
  rescheduleNags() {
    return this._exclusive(() => this.nagScheduler.schedule({ reset: true }));
  }

  /**
   * Handle notifee events from both the foreground and the headless
   * background handler. Each delivery is a chance to extend the schedule.
   */
  async handleEvent({ type, detail }) {
    if (type !== EventType.DELIVERED) return;

    const data = detail?.notification?.data || {};
    if (data.kind === 'wisdom' && data.messageId) {
      await this.storage.updateMessage(data.messageId, { lastShown: Date.now() });
    }
    await this.notificationManager.createChannels();
    await this.refresh();
  }

  sendTest(message) {
    return this.notificationManager.displayImmediate({
      title: '💡 Note to Self (Test)',
      body: message,
    });
  }

  getScheduled() {
    return this.notificationManager.getScheduled();
  }

  /** Upcoming wisdom notifications, soonest first (past-due entries excluded). */
  async getUpcomingWisdom() {
    const now = Date.now();
    const wisdom = await this.notificationManager.getScheduledByPrefix(WISDOM_PREFIX);
    return wisdom
      .filter(n => n.trigger.timestamp > now)
      .sort((a, b) => a.trigger.timestamp - b.trigger.timestamp);
  }

  getHealth() {
    return this.notificationManager.getHealth();
  }

  openNotificationSettings(channelId) {
    return this.notificationManager.openNotificationSettings(channelId);
  }

  openBatteryOptimizationSettings() {
    return this.notificationManager.openBatteryOptimizationSettings();
  }

  openPowerManagerSettings() {
    return this.notificationManager.openPowerManagerSettings();
  }

  cancelAll() {
    return this._exclusive(async () => {
      await this.notificationManager.cancelAll();
      await this.storage.saveState({ wisdomFilledThrough: null });
    });
  }
}
