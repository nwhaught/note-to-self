import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  MESSAGES: '@notetoself_messages',
  SETTINGS: '@notetoself_settings',
  STATE: '@notetoself_state',
};

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  dailyFrequency: 3,
  startHour: 8,
  endHour: 22,
  minGapHours: 2,
};

const DEFAULT_STATE = {
  lastNotificationTime: null,
  lastShownMessageId: null,
};

class StorageService {
  // Messages
  async getMessages() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async saveMessages(messages) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Error saving messages:', error);
      return false;
    }
  }

  async addMessage(message) {
    const messages = await this.getMessages();
    const newMessage = {
      id: Date.now().toString(),
      text: message.text,
      weight: message.weight || 3,
      isNagMe: message.isNagMe || false,
      nagIntervalMinutes: message.nagIntervalMinutes || 90,
      createdAt: Date.now(),
      lastShown: null,
      ...message,
    };
    messages.push(newMessage);
    await this.saveMessages(messages);
    return newMessage;
  }

  async updateMessage(id, updates) {
    const messages = await this.getMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      await this.saveMessages(messages);
      return messages[index];
    }
    return null;
  }

  async deleteMessage(id) {
    const messages = await this.getMessages();
    const filtered = messages.filter(m => m.id !== id);
    await this.saveMessages(filtered);
    return true;
  }

  // Settings
  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  // State
  async getState() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STATE);
      return data ? { ...DEFAULT_STATE, ...JSON.parse(data) } : DEFAULT_STATE;
    } catch (error) {
      console.error('Error getting state:', error);
      return DEFAULT_STATE;
    }
  }

  async saveState(state) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving state:', error);
      return false;
    }
  }

  // Utility: Check if message is "new" (within 2 weeks)
  isMessageNew(message) {
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - message.createdAt < twoWeeks;
  }

  // Utility: Clear all data (for testing)
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.MESSAGES,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.STATE,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

export default new StorageService();