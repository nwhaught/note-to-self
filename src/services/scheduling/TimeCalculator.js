// ============================================================================
// TimeCalculator - pure time calculation logic (no side effects)
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

export class TimeCalculator {
  /**
   * Pick `count` random times in [startTime, endTime) that are at least
   * `minGapMs` apart. Returns as many as fit (possibly fewer than `count`).
   */
  static calculateRandomTimes({ startTime, endTime, count, minGapMs, random = Math.random }) {
    const windowMs = endTime - startTime;
    if (windowMs <= 0 || count <= 0) return [];

    const times = [];
    const maxAttempts = 200;
    let attempts = 0;

    while (times.length < count && attempts < maxAttempts) {
      attempts++;
      const candidate = new Date(startTime.getTime() + random() * windowMs);
      if (candidate >= endTime) continue;
      if (times.some(t => Math.abs(candidate - t) < minGapMs)) continue;
      times.push(candidate);
    }

    return times.sort((a, b) => a - b);
  }

  /**
   * Active window [start, end) for the calendar day containing `day`.
   * endHour may be 24 (midnight at the end of the day).
   */
  static getDayWindow(day, startHour, endHour) {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endHour, 0, 0, 0);
    return { start, end };
  }

  /**
   * Active windows for `days` consecutive calendar days starting with the day
   * containing `now`. Today's window is clipped to start at `now`; windows
   * that are already over are skipped.
   */
  static getUpcomingWindows(now, startHour, endHour, days) {
    const windows = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const { start, end } = TimeCalculator.getDayWindow(day, startHour, endHour);
      const effectiveStart = start < now ? new Date(now) : start;
      if (effectiveStart >= end) continue;
      windows.push({ dayKey: TimeCalculator.dayKey(day), start: effectiveStart, end, fullStart: start });
    }
    return windows;
  }

  /**
   * How many notifications to place in a window. A partially elapsed day
   * gets a pro-rated share so opening the app at 9pm doesn't cram the whole
   * day's quota into the last hour.
   */
  static countForWindow(window, dailyCount) {
    const full = window.end - window.fullStart;
    if (full <= 0) return 0;
    const remaining = window.end - window.start;
    return Math.min(dailyCount, Math.round((dailyCount * remaining) / full));
  }

  /** Local-date key, e.g. "2026-11-23". */
  static dayKey(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }
}

TimeCalculator.DAY_MS = DAY_MS;
