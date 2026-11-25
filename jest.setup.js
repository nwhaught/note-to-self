/* eslint-env jest */
// Mock notifee with proper default export
jest.mock('@notifee/react-native', () => {
  const mockNotifee = {
    createChannel: jest.fn(() => Promise.resolve()),
    createTriggerNotification: jest.fn(() => Promise.resolve()),
    displayNotification: jest.fn(() => Promise.resolve()),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    cancelTriggerNotifications: jest.fn(() => Promise.resolve()),
    getTriggerNotifications: jest.fn(() => Promise.resolve([])),
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
    getChannel: jest.fn(() => Promise.resolve({ blocked: false })),
    isBatteryOptimizationEnabled: jest.fn(() => Promise.resolve(false)),
    getPowerManagerInfo: jest.fn(() => Promise.resolve({ activity: null })),
    openNotificationSettings: jest.fn(() => Promise.resolve()),
    openBatteryOptimizationSettings: jest.fn(() => Promise.resolve()),
    openPowerManagerSettings: jest.fn(() => Promise.resolve()),
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(() => () => {}),
  };

  return {
    __esModule: true,
    default: mockNotifee,
    TriggerType: { TIMESTAMP: 0 },
    AndroidImportance: { DEFAULT: 3, HIGH: 4 },
    AlarmType: { SET: 0, SET_AND_ALLOW_WHILE_IDLE: 1, SET_EXACT: 2, SET_EXACT_AND_ALLOW_WHILE_IDLE: 3, SET_ALARM_CLOCK: 4 },
    AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
    EventType: { UNKNOWN: -1, DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2, DELIVERED: 3 },
  };
});

// React Native itself is mocked by the react-native Jest preset.

// Official in-memory AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
