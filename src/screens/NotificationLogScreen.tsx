import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ListRenderItem,
} from 'react-native';
import type * as Notifications from 'expo-notifications';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import {
  getAllScheduledNotifications,
  formatNotificationTime,
  getNotificationKind,
  getScheduleBlockId,
  cancelNotification,
  cancelAllNotifications,
} from '../services/notifications';
import { time } from '../utils/time';
import { useNotificationStore } from '../stores/notificationStore';
import { getKindColor } from '../utils/colors';
import { EmptyState, LoadingSpinner } from '../components/common';

export const NotificationLogScreen = () => {
  
  const history = useNotificationStore((state) => state.history);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const loadHistory = useNotificationStore((state) => state.loadHistory);
  const getUpcomingNotifications = useNotificationStore((state) => state.getUpcomingNotifications);
  const getSentNotifications = useNotificationStore((state) => state.getSentNotifications);
  const getCanceledNotifications = useNotificationStore((state) => state.getCanceledNotifications);

  const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setRefreshing(true);
    try {
    
      const scheduled = await getAllScheduledNotifications();
      
    
      scheduled.sort((a, b) => {
        const dateA = a.trigger && 'date' in a.trigger && a.trigger.date ? new Date(a.trigger.date).getTime() : 0;
        const dateB = b.trigger && 'date' in b.trigger && b.trigger.date ? new Date(b.trigger.date).getTime() : 0;
        return dateA - dateB;
      });
      
      setScheduledNotifications(scheduled);
      
    
      await loadHistory();
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

 
  const handleRefresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleCancelNotification = useCallback(async (notificationId: string) => {
    await cancelNotification(notificationId);
    await loadNotifications();
  }, [loadNotifications]);

  const handleCancelAll = useCallback(() => {
    cancelAllNotifications();
    loadNotifications();
  }, [loadNotifications]);


  const getKindLabel = (kind: string): string => {
    switch (kind) {
      case 'windDown':
        return 'Wind-Down';
      case 'nap':
        return 'Nap';
      case 'bedtime':
        return 'Bedtime';
      default:
        return 'Reminder';
    }
  };

  const isPast = (notification: Notifications.NotificationRequest): boolean => {
    const trigger = notification.trigger;
    if (trigger && typeof trigger === 'object' && 'date' in trigger) {
      const dateValue = (trigger as any).date;
      if (dateValue) {
        try {
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date < new Date();
          }
        } catch (error) {
       
        }
      }
    }
    return false;
  };

  const formatTimeUntil = (notification: Notifications.NotificationRequest): string => {
    const trigger = notification.trigger;
    if (trigger && typeof trigger === 'object' && 'date' in trigger) {
      const dateValue = (trigger as any).date;
      if (dateValue) {
        try {
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const now = time.now();
            const notificationTime = time.parse(date.toISOString());
            const diffMinutes = notificationTime.diff(now, 'minute');

            if (diffMinutes < 0) {
              return 'Past';
            } else if (diffMinutes < 60) {
              return `in ${Math.round(diffMinutes)}m`;
            } else {
              const hours = Math.floor(diffMinutes / 60);
              const mins = Math.round(diffMinutes % 60);
              const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
              return `in ${hours}h ${minsStr}m`;
            }
          }
        } catch (error) {
         
        }
      }
    }
    return '';
  };

  
  const upcomingFromHistory = getUpcomingNotifications();
  const sentNotifications = getSentNotifications();
  const canceledNotifications = getCanceledNotifications();

  const upcomingScheduled = scheduledNotifications.filter((n) => !isPast(n));

  type ListItem = 
    | { type: 'section'; title: string; count: number }
    | { type: 'scheduled'; notification: Notifications.NotificationRequest }
    | { type: 'upcoming'; item: typeof upcomingFromHistory[0] }
    | { type: 'sent'; item: typeof sentNotifications[0] }
    | { type: 'canceled'; item: typeof canceledNotifications[0] };


  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    
    if (upcomingScheduled.length > 0) {
      items.push({ type: 'section', title: 'Upcoming Scheduled', count: upcomingScheduled.length });
      upcomingScheduled.forEach((n) => {
        items.push({ type: 'scheduled', notification: n });
      });
    }
    
    if (upcomingFromHistory.length > 0) {
      items.push({ type: 'section', title: 'Upcoming', count: upcomingFromHistory.length });
      upcomingFromHistory.slice(0, 20).forEach((item) => {
        items.push({ type: 'upcoming', item });
      });
    }
    
    if (sentNotifications.length > 0) {
      items.push({ type: 'section', title: 'Sent', count: sentNotifications.length });
      sentNotifications.slice(0, 20).forEach((item) => {
        items.push({ type: 'sent', item });
      });
    }
    
    if (canceledNotifications.length > 0) {
      items.push({ type: 'section', title: 'Canceled', count: canceledNotifications.length });
      canceledNotifications.slice(0, 20).forEach((item) => {
        items.push({ type: 'canceled', item });
      });
    }
    
    return items;
  }, [upcomingScheduled, upcomingFromHistory, sentNotifications, canceledNotifications]);

  const renderScheduledItem = useCallback((notification: Notifications.NotificationRequest) => {
    const kind = getNotificationKind(notification);
    const kindColor = getKindColor(kind);
    const historyItem = history.find((h) => h.notificationId === notification.identifier);
    let displayTime = formatNotificationTime(notification);
    
    if (displayTime === 'Unknown' && historyItem?.scheduledForISO) {
      displayTime = time.parse(historyItem.scheduledForISO).format('MMM D, h:mm A');
    }
    
    return (
      <Card style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <View style={[styles.kindIndicator, { backgroundColor: kindColor }]} />
              <CText variant="label" style={styles.notificationTitle}>
                {notification.content.title}
              </CText>
            </View>
            <CText variant="bodySmall" style={styles.notificationBody}>
              {notification.content.body}
            </CText>
            <View style={styles.notificationMeta}>
              <CText variant="bodySmall" style={styles.notificationTime}>
                {displayTime}
              </CText>
              <CText variant="bodySmall" style={styles.notificationKind}>
                {getKindLabel(kind)} • {formatTimeUntil(notification)}
              </CText>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleCancelNotification(notification.identifier)}
            style={styles.cancelIcon}
          >
            <CText variant="h3" style={styles.cancelIconText}>×</CText>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }, [history, handleCancelNotification]);

  const renderUpcomingItem = useCallback((item: typeof upcomingFromHistory[0]) => {
    const scheduledTime = time.parse(item.scheduledForISO).format('MMM D, h:mm A');
    return (
      <Card style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <View style={[styles.kindIndicator, { backgroundColor: getKindColor(item.kind) }]} />
              <CText variant="label" style={styles.notificationTitle}>
                {item.title}
              </CText>
            </View>
            <CText variant="bodySmall" style={styles.notificationBody}>
              {item.body}
            </CText>
            <View style={styles.notificationMeta}>
              <CText variant="bodySmall" style={styles.notificationTime}>
                Scheduled: {scheduledTime}
              </CText>
              <CText variant="bodySmall" style={styles.notificationKind}>
                {getKindLabel(item.kind)} • Scheduled
              </CText>
            </View>
          </View>
        </View>
      </Card>
    );
  }, []);

  const renderSentItem = useCallback((item: typeof sentNotifications[0]) => {
    const kindColor = getKindColor(item.kind);
    const sentTime = item.sentAtISO
      ? time.parse(item.sentAtISO).format('MMM D, h:mm A')
      : time.parse(item.scheduledForISO).format('MMM D, h:mm A');
    return (
      <Card style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <View style={[styles.kindIndicator, { backgroundColor: kindColor, opacity: 0.6 }]} />
              <CText variant="label" style={[styles.notificationTitle, { opacity: 0.7 }]}>
                {item.title}
              </CText>
            </View>
            <CText variant="bodySmall" style={[styles.notificationBody, { opacity: 0.7 }]}>
              {item.body}
            </CText>
            <View style={styles.notificationMeta}>
              <CText variant="bodySmall" style={styles.notificationTime}>
                Sent: {sentTime}
              </CText>
              <CText variant="bodySmall" style={styles.notificationKind}>
                {getKindLabel(item.kind)} • Sent
              </CText>
            </View>
          </View>
        </View>
      </Card>
    );
  }, []);

  const renderCanceledItem = useCallback((item: typeof canceledNotifications[0]) => {
    const canceledTime = item.canceledAtISO
      ? time.parse(item.canceledAtISO).format('MMM D, h:mm A')
      : 'Unknown';
    const scheduledTime = time.parse(item.scheduledForISO).format('MMM D, h:mm A');
    return (
      <Card style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <View style={[styles.kindIndicator, { backgroundColor: coddleTheme.colors.error, opacity: 0.5 }]} />
              <CText variant="label" style={[styles.notificationTitle, { opacity: 0.6 }]}>
                {item.title}
              </CText>
            </View>
            <CText variant="bodySmall" style={[styles.notificationBody, { opacity: 0.6 }]}>
              {item.body}
            </CText>
            <View style={styles.notificationMeta}>
              <CText variant="bodySmall" style={styles.notificationTime}>
                Was scheduled for: {scheduledTime}
              </CText>
              <CText variant="bodySmall" style={styles.notificationKind}>
                {getKindLabel(item.kind)} • Canceled at {canceledTime}
              </CText>
            </View>
          </View>
        </View>
      </Card>
    );
  }, []);


  const renderItem: ListRenderItem<ListItem> = useCallback(({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.section}>
          <CText variant="h3" style={styles.sectionTitle}>
            {item.title} ({item.count})
          </CText>
        </View>
      );
    }
    
    if (item.type === 'scheduled') {
      return renderScheduledItem(item.notification);
    }
    
    if (item.type === 'upcoming') {
      return renderUpcomingItem(item.item);
    }
    
    if (item.type === 'sent') {
      return renderSentItem(item.item);
    }
    
    if (item.type === 'canceled') {
      return renderCanceledItem(item.item);
    }
    
    return null;
  }, [renderScheduledItem, renderUpcomingItem, renderSentItem, renderCanceledItem]);

  
  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === 'section') {
      return `section-${item.title}`;
    }
    if (item.type === 'scheduled') {
      return `scheduled-${item.notification.identifier}`;
    }
    if (item.type === 'upcoming') {
      return `upcoming-${item.item.id}`;
    }
    if (item.type === 'sent') {
      return `sent-${item.item.id}`;
    }
    if (item.type === 'canceled') {
      return `canceled-${item.item.id}`;
    }
    return `item-${index}`;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <CText variant="h2">Notification Log</CText>
        <CText variant="bodySmall" style={styles.subtitle}>
          Scheduled reminders for sleep schedule
        </CText>
      </View>

      {scheduledNotifications.length > 0 && (
        <View style={styles.actions}>
          <PrimaryButton
            label="Cancel All Scheduled"
            onPress={handleCancelAll}
            variant="secondary"
            style={styles.cancelButton}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.content}>
          <LoadingSpinner message="Loading notifications..." variant="inline" />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.content}>
          <EmptyState
            message="No notification history."
            subMessage="Notifications will appear here when you view the Schedule screen."
          />
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coddleTheme.colors.background,
  },
  header: {
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(4),
    paddingBottom: coddleTheme.spacing(3),
    backgroundColor: coddleTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: coddleTheme.colors.border,
  },
  subtitle: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(1),
  },
  actions: {
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(3),
    paddingBottom: coddleTheme.spacing(2),
  },
  cancelButton: {
    backgroundColor: coddleTheme.colors.error,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: coddleTheme.spacing(4),
  },
  section: {
    paddingHorizontal: coddleTheme.spacing(4),
    marginTop: coddleTheme.spacing(4),
  },
  sectionTitle: {
    marginBottom: coddleTheme.spacing(3),
  },
  notificationCard: {
    marginBottom: coddleTheme.spacing(2),
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(1),
  },
  kindIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: coddleTheme.spacing(2),
  },
  notificationTitle: {
    flex: 1,
  },
  notificationBody: {
    color: coddleTheme.colors.textSecondary,
    marginBottom: coddleTheme.spacing(1),
  },
  notificationMeta: {
    marginTop: coddleTheme.spacing(1),
  },
  notificationTime: {
    color: coddleTheme.colors.textPrimary,
    fontWeight: '600',
  },
  notificationKind: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(0.5),
  },
  cancelIcon: {
    padding: coddleTheme.spacing(1),
    marginLeft: coddleTheme.spacing(2),
  },
  cancelIconText: {
    color: coddleTheme.colors.error,
    fontSize: 24,
    lineHeight: 24,
  },
});

