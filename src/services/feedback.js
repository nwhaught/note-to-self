import { Linking } from 'react-native';
import NotificationService from './notifications';
import { APP_NAME, APP_VERSION, FEEDBACK_EMAIL, deviceSummary } from '../config/appInfo';

/**
 * Diagnostics attached to feedback emails. Answers "why didn't my reminder
 * arrive?" without a back-and-forth. Contains no note text.
 */
export async function buildDiagnostics() {
  const lines = [`App: ${APP_NAME} ${APP_VERSION}`, `Device: ${deviceSummary()}`];
  try {
    const h = await NotificationService.getHealth();
    lines.push(
      `Notifications allowed: ${h.permissionGranted ? 'yes' : 'NO'}`,
      `Wisdom channel blocked: ${h.wisdomChannelBlocked ? 'YES' : 'no'}`,
      `Nag channel blocked: ${h.nagChannelBlocked ? 'YES' : 'no'}`,
      `Battery optimized: ${h.batteryOptimized ? 'YES' : 'no'}`,
    );
    const scheduled = await NotificationService.getScheduled();
    const upcoming = await NotificationService.getUpcomingWisdom();
    const nags = scheduled.filter(n => n.notification.id?.startsWith('nag-')).length;
    lines.push(
      `Scheduled: ${upcoming.length} wisdom, ${nags} nag`,
      `Next wisdom: ${upcoming.length ? new Date(upcoming[0].trigger.timestamp).toISOString() : 'none'}`,
    );
  } catch (e) {
    lines.push(`Diagnostics error: ${e?.message || e}`);
  }
  return lines.join('\n');
}

export function buildFeedbackUrl(diagnostics) {
  const subject = `${APP_NAME} ${APP_VERSION} feedback`;
  const body = `\n\n\n--- Please keep the info below; it helps diagnose issues ---\n${diagnostics}\n`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendFeedback() {
  if (!FEEDBACK_EMAIL) return false;
  const url = buildFeedbackUrl(await buildDiagnostics());
  await Linking.openURL(url);
  return true;
}
