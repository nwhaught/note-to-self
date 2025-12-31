import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';

export default function LibraryScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadMessages = async () => {
    const data = await StorageService.getMessages();
    // Sort: Nag messages first, then by creation date
    const sorted = data.sort((a, b) => {
      if (a.isNagMe && !b.isNagMe) return -1;
      if (!a.isNagMe && b.isNagMe) return 1;
      return b.createdAt - a.createdAt;
    });
    setMessages(sorted);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      // Exit selection mode when leaving screen
      return () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Delete Messages',
      `Are you sure you want to delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            let hadNagMessage = false;
            for (const id of selectedIds) {
              const msg = messages.find(m => m.id === id);
              if (msg?.isNagMe) hadNagMessage = true;
              await StorageService.deleteMessage(id);
            }

            if (hadNagMessage) {
              await NotificationService.scheduleNagNotifications();
            }

            setSelectedIds(new Set());
            setIsSelectionMode(false);
            loadMessages();
          },
        },
      ]
    );
  };

  const handleDelete = (message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteMessage(message.id);
            if (message.isNagMe) {
              await NotificationService.scheduleNagNotifications();
            }
            loadMessages();
          },
        },
      ]
    );
  };

  const getWeightColor = (weight) => {
    if (weight >= 5) return '#22c55e';
    if (weight >= 4) return '#3b82f6';
    if (weight >= 3) return '#6366f1';
    if (weight >= 2) return '#f59e0b';
    return '#ef4444';
  };

  const getWeightEmoji = (weight) => {
    if (weight >= 5) return '🔥';
    if (weight >= 4) return '⭐';
    if (weight >= 3) return '✨';
    if (weight >= 2) return '💫';
    return '🌟';
  };

  const renderMessage = ({ item }) => {
    const isNew = StorageService.isMessageNew(item);
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.messageItem,
          item.isNagMe && styles.nagMessageItem,
          isSelected && styles.messageItemSelected,
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            navigation.navigate('EditMessage', { message: item });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            handleDelete(item);
          }
        }}>
        {isSelectionMode && (
          <View style={styles.checkbox}>
            {isSelected ? (
              <View style={styles.checkboxChecked}>
                <Text style={styles.checkboxText}>✓</Text>
              </View>
            ) : (
              <View style={styles.checkboxUnchecked} />
            )}
          </View>
        )}
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            {item.isNagMe && (
              <View style={styles.nagBadge}>
                <Text style={styles.nagBadgeText}>⏰ NAG ME</Text>
              </View>
            )}
            {isNew && item.weight === 3 && !item.isNagMe && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>✨ NEW</Text>
              </View>
            )}
            <View style={[styles.weightBadge, { backgroundColor: getWeightColor(item.weight) }]}>
              <Text style={styles.weightText}>
                {getWeightEmoji(item.weight)} {item.weight}
              </Text>
            </View>
          </View>
          <Text style={styles.messageItemText} numberOfLines={3}>
            {item.text}
          </Text>
          {item.isNagMe && (
            <Text style={styles.nagInterval}>
              Every {item.nagIntervalMinutes} minutes
            </Text>
          )}
        </View>
        {!isSelectionMode && <Text style={styles.chevron}>›</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === messages.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity
            onPress={handleBulkDelete}
            style={[styles.deleteSelectedButton, selectedIds.size === 0 && styles.deleteSelectedButtonDisabled]}
            disabled={selectedIds.size === 0}>
            <Text style={styles.deleteSelectedText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first wisdom nugget</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
        }
      />

      <View style={styles.fabContainer}>
        {messages.length > 0 && (
          <TouchableOpacity
            style={[styles.fabSecondary, isSelectionMode && styles.fabSecondaryActive]}
            onPress={toggleSelectionMode}>
            <Text style={styles.fabSecondaryText}>
              {isSelectionMode ? '✕' : '☑'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EditMessage', { message: null })}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  selectionHeader: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  deleteSelectedButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteSelectedButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.5,
  },
  deleteSelectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageItemSelected: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  nagMessageItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  nagBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nagBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  weightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  weightText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  messageItemText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
  },
  nagInterval: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: '#cbd5e1',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    gap: 12,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  fabSecondary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  fabSecondaryActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  fabSecondaryText: {
    fontSize: 24,
    color: '#6366f1',
    fontWeight: '600',
  },
});