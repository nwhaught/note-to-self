// ============================================================================
// WisdomScheduler - keeps a rolling multi-day queue of wisdom notifications
// ============================================================================
import { TimeCalculator } from '../scheduling/TimeCalculator';
import { WISDOM_PREFIX } from './NotificationManager';

// How many days ahead to keep scheduled. Gives a week of runway even if the
// app is never opened and background top-ups somehow don't run.
export const WISDOM_HORIZON_DAYS = 7;

export class WisdomScheduler {
  constructor(notificationManager, messageSelector, storageService) {
    this.notificationManager = notificationManager;
    this.messageSelector = messageSelector;
    this.storage = storageService;
  }

  /**
   * Fill any upcoming days that don't have notifications yet.
   * With `reset`, everything is cancelled and rebuilt (use after settings or
   * message content changes, since message text is baked in at schedule time).
   */
  async schedule({ reset = false, now = new Date() } = {}) {
    const settings = await this.storage.getSettings();

    if (!settings.notificationsEnabled) {
      await this.cancel();
      return { scheduled: 0, reason: 'disabled' };
    }

    if (reset) {
      await this.cancel();
    }

    const existing = reset ? [] : await this.notificationManager.getScheduledByPrefix(WISDOM_PREFIX);
    const coveredDays = new Set(
      existing
        .filter(n => n.trigger.timestamp > now.getTime())
        .map(n => TimeCalculator.dayKey(new Date(n.trigger.timestamp))),
    );
    // Today counts as covered if anything was scheduled for it earlier, even if
    // it has already fired - otherwise every app open would add more for today.
    const state = await this.storage.getState();
    const today = TimeCalculator.dayKey(now);
    if (!reset && state.wisdomFilledThrough && state.wisdomFilledThrough >= today) {
      coveredDays.add(today);
    }

    const windows = TimeCalculator.getUpcomingWindows(
      now,
      settings.startHour,
      settings.endHour,
      WISDOM_HORIZON_DAYS,
    ).filter(w => !coveredDays.has(w.dayKey));

    const minGapMs = settings.minGapHours * 60 * 60 * 1000;
    const plan = [];
    for (const window of windows) {
      const count = TimeCalculator.countForWindow(window, settings.dailyFrequency);
      const times = TimeCalculator.calculateRandomTimes({
        startTime: window.start,
        endTime: window.end,
        count,
        minGapMs,
      });
      plan.push(...times);
    }

    const messages = await this.messageSelector.selectMessages(plan.length, {
      avoidId: state.lastWisdomMessageId,
    });
    if (messages.length === 0) {
      return { scheduled: 0, reason: 'no-messages' };
    }

    for (let i = 0; i < plan.length; i++) {
      const time = plan[i];
      const message = messages[i];
      await this.notificationManager.scheduleNotification({
        id: `${WISDOM_PREFIX}${time.getTime()}`,
        title: '💡 Note to Self',
        body: message.text,
        timestamp: time.getTime(),
        isNag: false,
        data: { messageId: String(message.id) },
      });
    }

    const lastWindow = TimeCalculator.getUpcomingWindows(
      now,
      settings.startHour,
      settings.endHour,
      WISDOM_HORIZON_DAYS,
    ).pop();
    await this.storage.saveState({
      wisdomFilledThrough: lastWindow ? lastWindow.dayKey : today,
      lastWisdomMessageId: messages.length ? messages[messages.length - 1].id : state.lastWisdomMessageId,
    });

    return { scheduled: plan.length };
  }

  async cancel() {
    await this.notificationManager.cancelByPrefix(WISDOM_PREFIX);
    await this.storage.saveState({ wisdomFilledThrough: null });
  }
}
