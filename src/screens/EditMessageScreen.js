import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';

export default function EditMessageScreen({ navigation, route }) {
  const existingMessage = route.params?.message;
  const isEdit = !!existingMessage;

  const [text, setText] = useState(existingMessage?.text || '');
  const [weight, setWeight] = useState(existingMessage?.weight || 3);
  const [isNagMe, setIsNagMe] = useState(existingMessage?.isNagMe || false);
  const [nagIntervalMinutes, setNagIntervalMinutes] = useState(
    existingMessage?.nagIntervalMinutes?.toString() || '90'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Message' : 'New Message',
    });
  }, [isEdit, navigation]);

  const handleSave = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (isNagMe && (!nagIntervalMinutes || parseInt(nagIntervalMinutes) < 1)) {
      Alert.alert('Error', 'Please enter a valid interval (minimum 1 minute)');
      return;
    }

    setSaving(true);

    try {
      const messageData = {
        text: text.trim(),
        weight,
        isNagMe,
        nagIntervalMinutes: isNagMe ? parseInt(nagIntervalMinutes) : 90,
      };

      if (isEdit) {
        await StorageService.updateMessage(existingMessage.id, messageData);
      } else {
        await StorageService.addMessage(messageData);
      }

      // Reschedule notifications
      await NotificationService.scheduleWisdomNotifications();
      if (isNagMe) {
        await NotificationService.scheduleNagNotifications();
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save message');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getWeightLabel = (w) => {
    switch (w) {
      case 1: return 'Rarely (1)';
      case 2: return 'Occasionally (2)';
      case 3: return 'Normal (3)';
      case 4: return 'Often (4)';
      case 5: return 'Very Often (5)';
      default: return w.toString();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Enter your wisdom nugget..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.label}>Nag Me</Text>
            <Text style={styles.helperText}>Repeat this message regularly</Text>
          </View>
          <Switch
            value={isNagMe}
            onValueChange={setIsNagMe}
            trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
            thumbColor={isNagMe ? '#6366f1' : '#f1f5f9'}
          />
        </View>

        {isNagMe && (
          <View style={styles.intervalContainer}>
            <Text style={styles.label}>Interval (minutes)</Text>
            <TextInput
              style={styles.numberInput}
              value={nagIntervalMinutes}
              onChangeText={setNagIntervalMinutes}
              placeholder="90"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              How often to remind you (e.g., 90 for every 1.5 hours)
            </Text>
          </View>
        )}
      </View>

      {!isNagMe && (
        <View style={styles.section}>
          <Text style={styles.label}>Weight: {getWeightLabel(weight)}</Text>
          <Text style={styles.helperText}>
            Higher weight = appears more often in random selection
          </Text>
          <View style={styles.weightSelector}>
            {[1, 2, 3, 4, 5].map((w) => (
              <TouchableOpacity
                key={w}
                style={[
                  styles.weightButton,
                  weight === w && styles.weightButtonActive,
                ]}
                onPress={() => setWeight(w)}>
                <Text
                  style={[
                    styles.weightButtonText,
                    weight === w && styles.weightButtonTextActive,
                  ]}>
                  {w}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {weight === 3 && (
            <Text style={styles.newMessageBoost}>
              ✨ New messages with weight 3 get a 50% boost for 2 weeks
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}>
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : isEdit ? 'Update Message' : 'Add Message'}
        </Text>
      </TouchableOpacity>

      {isEdit && (
        <>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Delete Message',
                'Are you sure you want to delete this message? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await StorageService.deleteMessage(existingMessage.id);
                      if (existingMessage.isNagMe) {
                        await NotificationService.scheduleNagNotifications();
                      }
                      navigation.goBack();
                    },
                  },
                ]
              );
            }}>
            <Text style={styles.deleteButtonText}>🗑️ Delete Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 120,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchLabel: {
    flex: 1,
  },
  intervalContainer: {
    marginTop: 12,
  },
  numberInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weightSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  weightButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  weightButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  weightButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  weightButtonTextActive: {
    color: '#fff',
  },
  newMessageBoost: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});