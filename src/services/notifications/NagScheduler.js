// ============================================================================
// NagScheduler - keeps a rolling queue of repeating "Nag me" reminders
// ============================================================================
import { QuietHoursHandler } from '../scheduling/QuietHoursHandler';
import { NAG_PREFIX } from './NotificationManager';

// How far ahead to keep nags scheduled. Every delivered notification tops the
// queue back up, so this only needs to bridge gaps in background execution.
export const NAG_HORIZON_MS = 48 * 60 * 60 * 1000;

// Android caps an app at 500 pending alarms. Leave room for wisdom
// notifications and anything else.
export const MAX_NAG_ALARMS = 300;

// Android won't fire idle-allowed alarms more than every ~9 minutes in Doze,
// and anything tighter burns through the alarm budget.
export const MIN_NAG_INTERVAL_MINUTES = 15;

export const nagIdPrefix = messageId => `${NAG_PREFIX}${messageId}-`;

export class NagScheduler {
  constructor(notificationManager, storageService) {
    this.notificationManager = notificationManager;
    this.storage = storageService;
  }

  /**
   * Make sure every nag message has reminders scheduled through the horizon.
   * With `reset`, existing nags are cancelled and rebuilt from `now`.
   */
  async schedule({ reset = false, now = new Date() } = {}) {
    const settings = await this.storage.getSettings();
    const quietHours = new QuietHoursHandler(settings.startHour, settings.endHour);
    const messages = await this.storage.getMessages();
    const nagMessages = messages.filter(m => m.isNagMe);

    let existing = await this.notificationManager.getScheduledByPrefix(NAG_PREFIX);
    const nagIds = new Set(nagMessages.map(m => String(m.id)));

    // Drop nags for messages that were deleted or un-nagged (or all, on reset).
    const orphaned = existing.filter(n => reset || !nagIds.has(this._messageIdOf(n.notification.id)));
    await this.notificationManager.cancelIds(orphaned.map(n => n.notification.id));
    existing = existing.filter(n => !orphaned.includes(n));

    if (nagMessages.length === 0) return { scheduled: 0 };

    const perMessageCap = Math.floor(MAX_NAG_ALARMS / nagMessages.length);
    const horizon = now.getTime() + NAG_HORIZON_MS;

    let scheduled = 0;
    for (const message of nagMessages) {
      const prefix = nagIdPrefix(message.id);
      const mine = existing
        .filter(n => n.notification.id.startsWith(prefix))
        .map(n => n.trigger.timestamp)
        .filter(ts => ts > now.getTime());

      // Continue the existing cadence rather than restarting it, so opening
      // the app doesn't shift every reminder.
      const anchor = mine.length ? Math.max(...mine) : now.getTime();
      const intervalMs = this.intervalMinutes(message) * 60 * 1000;

      let next = quietHours.adjustTime(new Date(anchor + intervalMs));
      let count = mine.length;
      while (next.getTime() <= horizon && count < perMessageCap) {
        await this.notificationManager.scheduleNotification({
          id: `${prefix}${next.getTime()}`,
          title: '⏰ Reminder',
          body: message.text,
          timestamp: next.getTime(),
          isNag: true,
          data: { messageId: String(message.id) },
        });
        count++;
        scheduled++;
        next = quietHours.adjustTime(new Date(next.getTime() + intervalMs));
      }
    }

    return { scheduled };
  }

  intervalMinutes(message) {
    const minutes = parseInt(message.nagIntervalMinutes, 10) || 90;
    return Math.max(MIN_NAG_INTERVAL_MINUTES, minutes);
  }

  _messageIdOf(notificationId) {
    // nag-<messageId>-<timestamp>
    const rest = notificationId.slice(NAG_PREFIX.length);
    return rest.slice(0, rest.lastIndexOf('-'));
  }

  async cancel() {
    await this.notificationManager.cancelByPrefix(NAG_PREFIX);
  }
}
