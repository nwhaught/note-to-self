import { Platform } from 'react-native';
import { version } from '../../package.json';

export const APP_NAME = 'Note to Self';

// Same field Gradle reads for versionName, so this always matches Play.
export const APP_VERSION = version;

// Where in-app feedback goes. This ships inside the app and is visible to
// anyone who taps "Send feedback", so use a dedicated address, not a personal one.
// Leave null to hide the feedback button.
export const FEEDBACK_EMAIL = 'contact.yox@gmail.com';

export function deviceSummary() {
  const c = Platform.constants || {};
  const device = [c.Manufacturer || c.Brand, c.Model].filter(Boolean).join(' ');
  return `${device || 'Unknown device'}, ${Platform.OS} ${c.Release || Platform.Version} (API ${Platform.Version})`;
}
