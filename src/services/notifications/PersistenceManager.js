// ============================================================================
// PersistenceManager - keeps the schedule topped up across app lifecycle
// ============================================================================
//
// Notifications must keep arriving for days or weeks without the app being
// opened, so nothing here can rely on JS timers (they die with the process).
// The schedule is kept alive by:
//   1. A multi-day horizon, scheduled up front.
//   2. A top-up every time a notification is delivered (background handler,
//      registered in index.js - runs headless even when the app is closed).
//   3. A top-up every time the app comes to the foreground.
//   4. Notifee re-registering its alarms after reboot / app update.
import { AppState } from 'react-native';

export class PersistenceManager {
  constructor(refresh) {
    this.refresh = refresh;
    this.appStateSubscription = null;
  }

  start() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        this.refresh().catch(e => console.warn('[Persistence] Refresh failed:', e));
      }
    });
  }

  stop() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }
}
