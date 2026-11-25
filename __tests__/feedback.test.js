import { buildDiagnostics, buildFeedbackUrl } from '../src/services/feedback';
import { APP_VERSION } from '../src/config/appInfo';
import NotificationService from '../src/services/notifications';
import pkg from '../package.json';

jest.mock('../src/services/notifications', () => ({
  __esModule: true,
  default: {
    getHealth: jest.fn(),
    getScheduled: jest.fn(),
    getUpcomingWisdom: jest.fn(),
  },
}));

jest.mock('../src/config/appInfo', () => ({
  ...jest.requireActual('../src/config/appInfo'),
  FEEDBACK_EMAIL: 'feedback@example.com',
}));

describe('app version', () => {
  it('comes from package.json (same source Gradle uses for versionName)', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('is plain semver with parts < 100 so versionCode stays monotonic', () => {
    const parts = pkg.version.split('-')[0].split('.').map(Number);
    expect(parts).toHaveLength(3);
    parts.forEach(p => expect(p).toBeLessThan(100));
  });
});

describe('feedback', () => {
  beforeEach(() => {
    NotificationService.getHealth.mockResolvedValue({
      permissionGranted: true,
      wisdomChannelBlocked: false,
      nagChannelBlocked: true,
      batteryOptimized: true,
    });
    NotificationService.getScheduled.mockResolvedValue([
      { notification: { id: 'nag-1-123' }, trigger: { timestamp: 1 } },
      { notification: { id: 'wisdom-5' }, trigger: { timestamp: 5 } },
    ]);
    NotificationService.getUpcomingWisdom.mockResolvedValue([
      { notification: { id: 'wisdom-5' }, trigger: { timestamp: Date.UTC(2026, 10, 25, 15) } },
    ]);
  });

  it('diagnostics flag the problems that stop reminders arriving', async () => {
    const d = await buildDiagnostics();
    expect(d).toContain(`App: Note to Self ${pkg.version}`);
    expect(d).toContain('Nag channel blocked: YES');
    expect(d).toContain('Battery optimized: YES');
    expect(d).toContain('Scheduled: 1 wisdom, 1 nag');
    expect(d).toContain('Next wisdom: 2026-11-25T15:00:00.000Z');
  });

  it('diagnostics survive a failing health check', async () => {
    NotificationService.getHealth.mockRejectedValue(new Error('boom'));
    expect(await buildDiagnostics()).toContain('Diagnostics error: boom');
  });

  it('builds an encoded mailto link', () => {
    const url = buildFeedbackUrl('Device: Pixel & co');
    expect(url.startsWith('mailto:feedback@example.com?subject=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Device: Pixel & co'));
    expect(url).not.toContain(' ');
  });
});
