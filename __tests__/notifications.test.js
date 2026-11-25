import { TimeCalculator } from '../src/services/scheduling/TimeCalculator';
import { QuietHoursHandler } from '../src/services/scheduling/QuietHoursHandler';
import { MessageSelector } from '../src/services/scheduling/MessageSelector';
import { WisdomScheduler, WISDOM_HORIZON_DAYS } from '../src/services/notifications/WisdomScheduler';
import {
  NagScheduler,
  MAX_NAG_ALARMS,
  MIN_NAG_INTERVAL_MINUTES,
} from '../src/services/notifications/NagScheduler';
import { NotificationScheduler } from '../src/services/notifications/NotificationScheduler';
import { NotificationManager } from '../src/services/notifications/NotificationManager';
import notifee, { AlarmType } from '@notifee/react-native';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------
class FakeManager {
  constructor() {
    this.scheduled = new Map(); // id -> { notification, trigger }
  }
  async scheduleNotification({ id, title, body, timestamp, isNag, data }) {
    this.scheduled.set(id, {
      notification: { id, title, body, data: { kind: isNag ? 'nag' : 'wisdom', ...data } },
      trigger: { timestamp },
    });
  }
  async getScheduled() {
    return [...this.scheduled.values()];
  }
  async getScheduledByPrefix(prefix) {
    return [...this.scheduled.values()].filter(n => n.notification.id.startsWith(prefix));
  }
  async cancelIds(ids) {
    ids.forEach(id => this.scheduled.delete(id));
  }
  async cancelByPrefix(prefix) {
    for (const id of [...this.scheduled.keys()]) {
      if (id.startsWith(prefix)) this.scheduled.delete(id);
    }
  }
  async cancelAll() {
    this.scheduled.clear();
  }
  async createChannels() {}
  /** Simulate Android firing everything due by `now`. */
  fireUntil(now) {
    for (const [id, n] of this.scheduled) {
      if (n.trigger.timestamp <= now.getTime()) this.scheduled.delete(id);
    }
  }
  timestamps(prefix) {
    return [...this.scheduled.values()]
      .filter(n => n.notification.id.startsWith(prefix))
      .map(n => n.trigger.timestamp)
      .sort((a, b) => a - b);
  }
}

class FakeStorage {
  constructor({ messages = [], settings = {} } = {}) {
    this.messages = messages;
    this.settings = {
      notificationsEnabled: true,
      dailyFrequency: 3,
      startHour: 8,
      endHour: 22,
      minGapHours: 2,
      ...settings,
    };
    this.state = {};
  }
  async getMessages() {
    return this.messages;
  }
  async getSettings() {
    return this.settings;
  }
  async getState() {
    return { ...this.state };
  }
  async saveState(partial) {
    this.state = { ...this.state, ...partial };
  }
  async updateMessage(id, updates) {
    const m = this.messages.find(x => x.id === id);
    if (m) Object.assign(m, updates);
    return m;
  }
  isMessageNew() {
    return false;
  }
}

const wisdomMessages = [
  { id: '1', text: 'Breathe', weight: 3 },
  { id: '2', text: 'Drink water', weight: 3 },
  { id: '3', text: 'Call mom', weight: 5 },
];

const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);
const dayKey = ts => TimeCalculator.dayKey(new Date(ts));

function makeWisdom(storage, manager = new FakeManager()) {
  return {
    manager,
    scheduler: new WisdomScheduler(manager, new MessageSelector(storage), storage),
  };
}

// ---------------------------------------------------------------------------
// TimeCalculator
// ---------------------------------------------------------------------------
describe('TimeCalculator', () => {
  it('respects the minimum gap and window bounds', () => {
    const start = at(2026, 11, 23, 8);
    const end = at(2026, 11, 23, 22);
    for (let run = 0; run < 50; run++) {
      const times = TimeCalculator.calculateRandomTimes({
        startTime: start,
        endTime: end,
        count: 5,
        minGapMs: 2 * 3600e3,
      });
      expect(times.length).toBeGreaterThan(0);
      times.forEach((t, i) => {
        expect(t >= start && t < end).toBe(true);
        if (i > 0) expect(t - times[i - 1]).toBeGreaterThanOrEqual(2 * 3600e3);
      });
    }
  });

  it('skips today once the active window is over', () => {
    const windows = TimeCalculator.getUpcomingWindows(at(2026, 11, 23, 23), 8, 22, 3);
    expect(windows.map(w => w.dayKey)).toEqual(['2026-11-24', '2026-11-25']);
  });

  it('supports an end hour of 24 (midnight)', () => {
    const [w] = TimeCalculator.getUpcomingWindows(at(2026, 11, 23, 23), 8, 24, 1);
    expect(w.end).toEqual(at(2026, 11, 24, 0));
  });

  it('pro-rates the count for a partially elapsed day', () => {
    const [w] = TimeCalculator.getUpcomingWindows(at(2026, 11, 23, 20, 36), 8, 22, 1);
    expect(TimeCalculator.countForWindow(w, 3)).toBe(0);
    const [full] = TimeCalculator.getUpcomingWindows(at(2026, 11, 23, 7), 8, 22, 1);
    expect(TimeCalculator.countForWindow(full, 3)).toBe(3);
  });
});

describe('QuietHoursHandler', () => {
  const q = new QuietHoursHandler(8, 22);
  it('moves early times to start hour the same day', () => {
    expect(q.adjustTime(at(2026, 11, 23, 5))).toEqual(at(2026, 11, 23, 8));
  });
  it('moves late times to start hour the next day', () => {
    expect(q.adjustTime(at(2026, 11, 23, 22, 30))).toEqual(at(2026, 11, 24, 8));
  });
  it('leaves active-hour times alone', () => {
    expect(q.adjustTime(at(2026, 11, 23, 12))).toEqual(at(2026, 11, 23, 12));
  });
});

// ---------------------------------------------------------------------------
// WisdomScheduler
// ---------------------------------------------------------------------------
describe('WisdomScheduler', () => {
  it('schedules a full horizon of days, not just today', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });

    const days = new Set(manager.timestamps('wisdom-').map(dayKey));
    expect(days.size).toBe(WISDOM_HORIZON_DAYS);
    expect(manager.timestamps('wisdom-').length).toBe(3 * WISDOM_HORIZON_DAYS);
  });

  it('keeps every notification inside active hours', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages, settings: { startHour: 9, endHour: 21 } });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });
    manager.timestamps('wisdom-').forEach(ts => {
      const h = new Date(ts).getHours();
      expect(h).toBeGreaterThanOrEqual(9);
      expect(h).toBeLessThan(21);
    });
  });

  it('top-up is idempotent: repeated refreshes do not add duplicates', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    const now = at(2026, 11, 23, 7);
    await scheduler.schedule({ now });
    const before = manager.timestamps('wisdom-');
    await scheduler.schedule({ now });
    await scheduler.schedule({ now: at(2026, 11, 23, 12) });
    expect(manager.timestamps('wisdom-')).toEqual(before);
  });

  it('does not refill today after today\'s notifications have fired', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });

    const evening = at(2026, 11, 23, 21, 59);
    manager.fireUntil(evening);
    await scheduler.schedule({ now: evening });
    const today = manager.timestamps('wisdom-').filter(ts => dayKey(ts) === '2026-11-23');
    expect(today).toEqual([]);
  });

  it('rolls forward: weeks of simulated time never run dry', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });

    // Simulate a top-up once a day (from a delivered-notification event).
    for (let d = 1; d <= 30; d++) {
      const now = at(2026, 11, 23 + d, 12);
      manager.fireUntil(now);
      await scheduler.schedule({ now });
      const tomorrow = TimeCalculator.dayKey(at(2026, 11, 23 + d + 1, 0));
      const days = new Set(manager.timestamps('wisdom-').map(dayKey));
      expect(days.has(tomorrow)).toBe(true);
    }
  });

  it('reset rebuilds with new settings', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    const now = at(2026, 11, 23, 7);
    await scheduler.schedule({ now });
    storage.settings.dailyFrequency = 1;
    await scheduler.schedule({ now, reset: true });
    expect(manager.timestamps('wisdom-').length).toBe(WISDOM_HORIZON_DAYS);
  });

  it('cancels wisdom when disabled', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });
    storage.settings.notificationsEnabled = false;
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });
    expect(manager.timestamps('wisdom-')).toEqual([]);
  });

  it('schedules nothing without wisdom messages', async () => {
    const storage = new FakeStorage({ messages: [{ id: 'n', text: 'nag', isNagMe: true }] });
    const { manager, scheduler } = makeWisdom(storage);
    const result = await scheduler.schedule({ now: at(2026, 11, 23, 7) });
    expect(result.reason).toBe('no-messages');
    expect(manager.timestamps('wisdom-')).toEqual([]);
  });

  it('does not show the same message twice in a row', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const { manager, scheduler } = makeWisdom(storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 7) });
    const ordered = [...manager.scheduled.values()].sort(
      (a, b) => a.trigger.timestamp - b.trigger.timestamp,
    );
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].notification.data.messageId).not.toBe(ordered[i - 1].notification.data.messageId);
    }
  });
});

// ---------------------------------------------------------------------------
// NagScheduler
// ---------------------------------------------------------------------------
describe('NagScheduler', () => {
  const nag = (id, minutes) => ({ id, text: `nag ${id}`, isNagMe: true, nagIntervalMinutes: minutes });

  it('schedules beyond 24 hours', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 90)] });
    const manager = new FakeManager();
    await new NagScheduler(manager, storage).schedule({ now: at(2026, 11, 23, 9) });
    const days = new Set(manager.timestamps('nag-').map(dayKey));
    expect(days.has('2026-11-24')).toBe(true);
    expect(days.has('2026-11-25')).toBe(true);
  });

  it('never fires during quiet hours', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 45)] });
    const manager = new FakeManager();
    await new NagScheduler(manager, storage).schedule({ now: at(2026, 11, 23, 9) });
    manager.timestamps('nag-').forEach(ts => {
      const h = new Date(ts).getHours();
      expect(h >= 8 && h < 22).toBe(true);
    });
  });

  it('top-up continues the cadence instead of restarting it', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 60)] });
    const manager = new FakeManager();
    const scheduler = new NagScheduler(manager, storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 9) });
    const first = manager.timestamps('nag-');

    // A refresh 17 minutes later must not shift existing reminders.
    await scheduler.schedule({ now: at(2026, 11, 23, 9, 17) });
    const after = manager.timestamps('nag-');
    expect(after.slice(0, first.length)).toEqual(first);
  });

  it('keeps running for weeks with periodic top-ups', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 90)] });
    const manager = new FakeManager();
    const scheduler = new NagScheduler(manager, storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 9) });
    for (let d = 1; d <= 21; d++) {
      const now = at(2026, 11, 23 + d, 13);
      manager.fireUntil(now);
      await scheduler.schedule({ now });
      expect(manager.timestamps('nag-')[0] - now.getTime()).toBeLessThanOrEqual(90 * 60e3);
    }
  });

  it('enforces the minimum interval', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 1)] });
    const manager = new FakeManager();
    await new NagScheduler(manager, storage).schedule({ now: at(2026, 11, 23, 9) });
    const ts = manager.timestamps('nag-');
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i] - ts[i - 1]).toBeGreaterThanOrEqual(MIN_NAG_INTERVAL_MINUTES * 60e3);
    }
  });

  it('stays within the alarm budget with many nags', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => nag(`m${i}`, 15));
    const storage = new FakeStorage({ messages });
    const manager = new FakeManager();
    await new NagScheduler(manager, storage).schedule({ now: at(2026, 11, 23, 9) });
    expect(manager.timestamps('nag-').length).toBeLessThanOrEqual(MAX_NAG_ALARMS);
  });

  it('cancels nags for deleted or un-nagged messages on top-up', async () => {
    const storage = new FakeStorage({ messages: [nag('a', 60), nag('b', 60)] });
    const manager = new FakeManager();
    const scheduler = new NagScheduler(manager, storage);
    await scheduler.schedule({ now: at(2026, 11, 23, 9) });
    storage.messages = [nag('a', 60)];
    await scheduler.schedule({ now: at(2026, 11, 23, 9) });
    expect(manager.timestamps('nag-b-')).toEqual([]);
    expect(manager.timestamps('nag-a-').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// NotificationManager - the Android trigger itself
// ---------------------------------------------------------------------------
describe('NotificationManager', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses AlarmManager (inexact, allow-while-idle), never WorkManager or exact alarms', async () => {
    await new NotificationManager().scheduleNotification({
      id: 'wisdom-1',
      title: 't',
      body: 'b',
      timestamp: Date.now() + 60e3,
    });
    const [, trigger] = notifee.createTriggerNotification.mock.calls[0];
    expect(trigger.alarmManager).toEqual({ type: AlarmType.SET_AND_ALLOW_WHILE_IDLE });
  });

  it('uses the monochrome status-bar icon', async () => {
    await new NotificationManager().scheduleNotification({ id: 'x', title: 't', body: 'b', timestamp: 1 });
    const [notification] = notifee.createTriggerNotification.mock.calls[0];
    expect(notification.android.smallIcon).toBe('ic_notification');
  });
});

// ---------------------------------------------------------------------------
// NotificationScheduler (facade)
// ---------------------------------------------------------------------------
describe('NotificationScheduler', () => {
  it('a delivered notification records lastShown and tops up the schedule', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages.map(m => ({ ...m })) });
    const manager = new FakeManager();
    const service = new NotificationScheduler(storage, manager);

    await service.handleEvent({
      type: 3, // EventType.DELIVERED
      detail: { notification: { data: { kind: 'wisdom', messageId: '2' } } },
    });

    expect(storage.messages.find(m => m.id === '2').lastShown).toEqual(expect.any(Number));
    expect(manager.timestamps('wisdom-').length).toBeGreaterThan(0);
  });

  it('serializes concurrent refreshes (no double-scheduled days)', async () => {
    const storage = new FakeStorage({ messages: wisdomMessages });
    const manager = new FakeManager();
    const service = new NotificationScheduler(storage, manager);
    await Promise.all([service.refresh(), service.refresh(), service.rescheduleAll(), service.refresh()]);
    const perDay = {};
    manager.timestamps('wisdom-').forEach(ts => {
      perDay[dayKey(ts)] = (perDay[dayKey(ts)] || 0) + 1;
    });
    Object.values(perDay).forEach(n => expect(n).toBeLessThanOrEqual(3));
  });
});
