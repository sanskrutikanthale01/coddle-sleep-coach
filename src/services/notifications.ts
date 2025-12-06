
import { ScheduleBlock } from '../types';
import { time } from '../utils/time';
import {
  loadNotificationHistory,
  saveNotificationHistory,
  NotificationHistoryItem,
} from '../storage/sleepStorage';


import * as Notifications from 'expo-notifications';

let handlerSetup = false;
export function setupNotificationHandler() {
  if (!handlerSetup) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerSetup = true;
    } catch (error) {
     
    }
  }
}


export type { NotificationHistoryItem } from '../storage/sleepStorage';


export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    setupNotificationHandler(); 
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}


function getNotificationMessage(block: ScheduleBlock): { title: string; body: string } {
  const blockTime = time.parse(block.startISO);
  const timeStr = blockTime.format('h:mm A');

  switch (block.kind) {
    case 'windDown':
      return {
        title: '🌙 Wind-Down Time',
        body: `Start wind-down routine at ${timeStr}. Time to prepare for sleep.`,
      };
    case 'nap':
      return {
        title: '💤 Nap Time',
        body: `Nap time at ${timeStr}. Your baby should be ready for sleep.`,
      };
    case 'bedtime':
      return {
        title: '🌙 Bedtime',
        body: `Bedtime at ${timeStr}. Start your bedtime routine now.`,
      };
    default:
      return {
        title: 'Sleep Reminder',
        body: `Scheduled sleep time at ${timeStr}.`,
      };
  }
}


export async function scheduleNotificationForBlock(
  block: ScheduleBlock
): Promise<string | null> {
  try {
    setupNotificationHandler(); 
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      await saveNotificationToHistory(block, null, 'canceled');
      return null;
    }

    const blockTime = time.parse(block.startISO);
    const now = time.now();

    if (blockTime.isBefore(now)) {
      await saveNotificationToHistory(block, null, 'sent', blockTime.toISOString());
      return null;
    }

    const { title, body } = getNotificationMessage(block);

    const triggerDate = blockTime.toDate();
    const nowDate = new Date();

    if (triggerDate <= nowDate) {
      await saveNotificationToHistory(block, null, 'canceled');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          scheduleBlockId: block.id,
          kind: block.kind,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      } as any, 
    });

    await saveNotificationToHistory(block, notificationId, 'scheduled');
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    await saveNotificationToHistory(block, null, 'canceled');
    return null;
  }
}


async function saveNotificationToHistory(
  block: ScheduleBlock,
  notificationId: string | null,
  status: 'scheduled' | 'canceled' | 'sent',
  sentAtISO?: string
): Promise<void> {
  try {
    const historyResult = await loadNotificationHistory();
    const history = historyResult.value;

    const { title, body } = getNotificationMessage(block);

    const historyItem: NotificationHistoryItem = {
      id: `hist_${block.id}_${Date.now()}`,
      notificationId,
      scheduleBlockId: block.id,
      kind: block.kind,
      scheduledForISO: block.startISO,
      title,
      body,
      status,
      createdAtISO: time.nowISO(),
      ...(status === 'canceled' && { canceledAtISO: time.nowISO() }),
      ...(status === 'sent' && sentAtISO && { sentAtISO }),
    };

    history.push(historyItem);
    const trimmedHistory = history.slice(-100);
    await saveNotificationHistory(trimmedHistory);
  } catch (error) {
    console.error('Error saving notification history:', error);
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    
    const historyResult = await loadNotificationHistory();
    const history = historyResult.value;
    const item = history.find((h) => h.notificationId === notificationId);
    if (item && item.status === 'scheduled') {
      item.status = 'canceled';
      item.canceledAtISO = time.nowISO();
      await saveNotificationHistory(history);
    }
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const historyResult = await loadNotificationHistory();
    const history = historyResult.value;
    const now = time.nowISO();
    let updated = false;
    
    for (const item of history) {
      if (item.status === 'scheduled') {
        item.status = 'canceled';
        item.canceledAtISO = now;
        updated = true;
      }
    }
    
    if (updated) {
      await saveNotificationHistory(history);
    }
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

export async function scheduleNotificationsForBlocks(
  blocks: ScheduleBlock[]
): Promise<Map<string, string>> {
  await cancelAllNotifications();

  const notificationMap = new Map<string, string>();

  for (const block of blocks) {
    const notificationId = await scheduleNotificationForBlock(block);
    if (notificationId) {
      notificationMap.set(block.id, notificationId);
    }
  }
  return notificationMap;
}

export async function getAllScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

export async function getNotificationHistory(): Promise<NotificationHistoryItem[]> {
  try {
    const historyResult = await loadNotificationHistory();
    return historyResult.value;
  } catch (error) {
    console.error('Error getting notification history:', error);
    return [];
  }
}

export async function markNotificationAsSent(notificationId: string): Promise<void> {
  try {
    const historyResult = await loadNotificationHistory();
    const history = historyResult.value;
    const item = history.find((h) => h.notificationId === notificationId);
    if (item && item.status === 'scheduled') {
      item.status = 'sent';
      item.sentAtISO = time.nowISO();
      await saveNotificationHistory(history);
    }
  } catch (error) {
    console.error('Error marking notification as sent:', error);
  }
}

export function formatNotificationTime(
  notification: import('expo-notifications').NotificationRequest
): string {
  const trigger = notification.trigger;
  
    if (trigger && typeof trigger === 'object') {
    if ('date' in trigger) {
      const dateValue = (trigger as any).date;
      
      if (dateValue !== null && dateValue !== undefined) {
        try {
          let date: Date;
          
          if (dateValue instanceof Date) {
            date = dateValue;
          } else if (typeof dateValue === 'number') {
            date = new Date(dateValue > 1000000000000 ? dateValue : dateValue * 1000);
          } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
          } else {
            return 'Unknown';
          }
          
          if (!isNaN(date.getTime())) {
            return time.parse(date.toISOString()).format('MMM D, h:mm A');
          }
        } catch (error) {
        }
      }
    }
    
    if ('seconds' in trigger) {
      const seconds = (trigger as any).seconds;
      if (typeof seconds === 'number') {
        const futureDate = new Date(Date.now() + seconds * 1000);
        return time.parse(futureDate.toISOString()).format('MMM D, h:mm A');
      }
    }
  }
  
  return 'Unknown';
}

export function getNotificationKind(
  notification: import('expo-notifications').NotificationRequest
): 'windDown' | 'nap' | 'bedtime' | 'unknown' {
  const data = notification.content.data as any;
  return data?.kind || 'unknown';
}

export function getScheduleBlockId(
  notification: import('expo-notifications').NotificationRequest
): string | null {
  const data = notification.content.data as any;
  return data?.scheduleBlockId || null;
}

