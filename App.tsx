import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { HomeScreen } from './src/screens/HomeScreen';
import { SleepLogScreen } from './src/screens/SleepLogScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { NotificationLogScreen } from './src/screens/NotificationLogScreen';
import { CoachScreen } from './src/screens/CoachScreen';
import { coddleTheme } from './src/theme/coddleTheme';
import { CText } from './src/components/ui/CText';
import { markNotificationAsSent } from './src/services/notifications';
import { useSleepSessionsStore } from './src/stores/sleepSessionsStore';
import { useLearnerStore } from './src/stores/learnerStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

type Screen = 'home' | 'sleepLog' | 'schedule' | 'timeline' | 'notificationLog' | 'coach';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [timelineHighlightIds, setTimelineHighlightIds] = useState<string[]>([]);

 
  useEffect(() => {
    useSleepSessionsStore.getState().loadSessions();
    useLearnerStore.getState().loadLearnerState();
    useNotificationStore.getState().loadHistory();
  }, []); 

  // Set up notification handler on app start
  useEffect(() => {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

  
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
     
      await markNotificationAsSent(notification.request.identifier);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const navigateToSleepLog = () => setCurrentScreen('sleepLog');
  const navigateToSchedule = () => setCurrentScreen('schedule');
  const navigateToTimeline = (highlightIds?: string[]) => {
    setTimelineHighlightIds(highlightIds || []);
    setCurrentScreen('timeline');
  };
  const navigateToNotificationLog = () => setCurrentScreen('notificationLog');
  const navigateToCoach = () => setCurrentScreen('coach');
  const navigateToHome = () => {
    setCurrentScreen('home');
    setTimelineHighlightIds([]);
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {currentScreen === 'home' ? (
          <ErrorBoundary>
            <HomeScreen 
              onNavigateToSleepLog={navigateToSleepLog}
              onNavigateToSchedule={navigateToSchedule}
              onNavigateToTimeline={navigateToTimeline}
              onNavigateToNotificationLog={navigateToNotificationLog}
              onNavigateToCoach={navigateToCoach}
            />
          </ErrorBoundary>
        ) : (
          <>
            <View style={styles.backHeader}>
              <TouchableOpacity onPress={navigateToHome} style={styles.backButton}>
                <CText variant="body" style={styles.backText}>
                  ← Back to Home
                </CText>
              </TouchableOpacity>
            </View>
            <ErrorBoundary>
              {currentScreen === 'sleepLog' ? (
                <SleepLogScreen />
              ) : currentScreen === 'schedule' ? (
                <ScheduleScreen />
              ) : currentScreen === 'timeline' ? (
                <TimelineScreen highlightSessionIds={timelineHighlightIds} />
              ) : currentScreen === 'coach' ? (
                <CoachScreen onNavigateToTimeline={navigateToTimeline} />
              ) : (
                <NotificationLogScreen />
              )}
            </ErrorBoundary>
          </>
        )}
        <StatusBar style="dark" />
      </View>
    </ErrorBoundary>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  backHeader: {
 
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(3),
    paddingBottom: coddleTheme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: coddleTheme.colors.border,
    marginTop: coddleTheme.spacing(7),
  },
  backButton: {
    paddingVertical: coddleTheme.spacing(1),
  },
  backText: {
    color: coddleTheme.colors.primary,
    fontWeight: '600',
  },
});

