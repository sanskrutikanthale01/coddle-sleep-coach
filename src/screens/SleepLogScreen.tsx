import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SleepSession } from '../types';
import { time } from '../utils/time';
import { clearAllStorage } from '../storage/sleepStorage';
import { generateMockData, clearMockData } from '../utils/mockData';
import { useSleepSessionsStore } from '../stores/sleepSessionsStore';
import { EmptyState, SessionCard, LoadingSpinner } from '../components/common';
import { TimerCard, ManualEntryModal } from '../components/sleep';
import { formatDateHeader } from '../utils/formatters';

export const SleepLogScreen = () => {
  
  const sessions = useSleepSessionsStore((state) => state.sessions);
  const isLoading = useSleepSessionsStore((state) => state.isLoading);
  const error = useSleepSessionsStore((state) => state.error);
  const loadSessions = useSleepSessionsStore((state) => state.loadSessions);
  const addSession = useSleepSessionsStore((state) => state.addSession);
  const deleteSession = useSleepSessionsStore((state) => state.deleteSession);
  const clearAllSessions = useSleepSessionsStore((state) => state.clearAllSessions);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);


 
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerStart) {
      interval = setInterval(() => {
        const now = time.now();
        const start = time.parse(timerStart);
        setElapsedSeconds(now.diff(start, 'second'));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStart]);

  
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const startTimer = () => {
    const startISO = time.nowISO();
    setTimerStart(startISO);
    setIsTimerRunning(true);
    setElapsedSeconds(0);
  };

  const stopTimer = async () => {
    if (!timerStart) return;

    const endISO = time.nowISO();
    const validation = time.validateRange(timerStart, endISO);

    if (!validation.isValid) {
      Alert.alert('Error', validation.error || 'Invalid time range');
      return;
    }

    const newSession: SleepSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startISO: timerStart,
      endISO: endISO,
      source: 'timer',
      updatedAtISO: time.nowISO(),
    };

    await saveSession(newSession);
    setIsTimerRunning(false);
    setTimerStart(null);
    setElapsedSeconds(0);
  };

  const handleSaveManualEntry = async (data: {
    startISO: string;
    endISO: string;
    quality?: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }) => {
    const validation = time.validateRange(data.startISO, data.endISO);
    if (!validation.isValid) {
      Alert.alert('Error', validation.error || 'Invalid time range');
      return;
    }

    const newSession: SleepSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startISO: data.startISO,
      endISO: data.endISO,
      quality: data.quality,
      notes: data.notes,
      source: 'manual',
      updatedAtISO: time.nowISO(),
    };

    await saveSession(newSession);
  };

  const saveSession = async (session: SleepSession) => {
   
    await addSession(session);
  };

  const handleDeleteSession = useCallback((id: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this sleep session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
           
            await deleteSession(id);
          },
        },
      ]
    );
  }, [deleteSession]);


 
  const activeSessions = React.useMemo(
    () => sessions.filter((s) => !s.deleted),
    [sessions]
  );

 
  const todaySessions = React.useMemo(() => {
    const today = time.dayKey(time.nowISO());
    return activeSessions.filter((s) => time.dayKey(s.startISO) === today);
  }, [activeSessions]);

 
  const { sessionsByDate, sortedDateKeys } = useMemo(() => {
    const grouped = activeSessions.reduce((acc, session) => {
      const dateKey = time.dayKey(session.startISO);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(session);
      return acc;
    }, {} as Record<string, SleepSession[]>);

    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    return { sessionsByDate: grouped, sortedDateKeys: sorted };
  }, [activeSessions]);

 
  const renderSessionItem: ListRenderItem<SleepSession> = useCallback(
    ({ item }) => (
      <SessionCard
        session={item}
        onDelete={handleDeleteSession}
      />
    ),
    [handleDeleteSession]
  );

  const renderDateGroup = useCallback((dateKey: string) => {
    const dateSessions = sessionsByDate[dateKey].sort((a, b) =>
      time.parse(b.startISO).diff(time.parse(a.startISO))
    );
    return (
      <View key={dateKey} style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <CText variant="h3" style={styles.dateHeaderText}>
            {formatDateHeader(dateKey)}
          </CText>
          <CText variant="bodySmall" style={styles.dateSessionCount}>
            {dateSessions.length} {dateSessions.length === 1 ? 'session' : 'sessions'}
          </CText>
        </View>
        <FlatList
          data={dateSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
        />
      </View>
    );
  }, [sessionsByDate, renderSessionItem]);

  const keyExtractor = useCallback((item: SleepSession) => item.id, []);



  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading sleep sessions..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CText variant="h2">Sleep Log</CText>
          <CText variant="bodySmall">Track your baby&apos;s sleep patterns</CText>
        </View>

       
        <TimerCard
          isRunning={isTimerRunning}
          elapsedSeconds={elapsedSeconds}
          onStart={startTimer}
          onStop={stopTimer}
        />

       
        <PrimaryButton
          label="Add Manual Entry"
          onPress={() => setShowManualEntry(true)}
          variant="secondary"
          style={styles.manualButton}
        />

       
        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <CText variant="h3" style={styles.sectionTitle}>
              {showAllSessions ? 'All Sessions' : `Today's Sessions (${todaySessions.length})`}
            </CText>
            {activeSessions.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowAllSessions(!showAllSessions)}
                activeOpacity={0.7}
              >
                <CText variant="bodySmall" style={styles.totalSessionsText}>
                  {showAllSessions ? 'Show Today Only' : `Total: ${activeSessions.length} sessions`}
                </CText>
              </TouchableOpacity>
            )}
          </View>
          {activeSessions.length === 0 ? (
            <EmptyState
              message="No sleep sessions logged. Start a timer or add a manual entry."
              actionLabel="Load Sample Data"
              onAction={async () => {
                await generateMockData(true); // Replace existing
                await loadSessions(); // Reload from store
              }}
            />
          ) : showAllSessions ? (
           
            <FlatList
              data={sortedDateKeys}
              renderItem={({ item: dateKey }) => renderDateGroup(dateKey)}
              keyExtractor={(dateKey) => dateKey}
              scrollEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              initialNumToRender={5}
            />
          ) : todaySessions.length === 0 ? (
            <EmptyState
              message="No sleep sessions logged today. Start a timer or add a manual entry."
              variant="compact"
            />
          ) : (
           
            <FlatList
              data={todaySessions.sort((a, b) => time.parse(b.startISO).diff(time.parse(a.startISO)))}
              renderItem={renderSessionItem}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              initialNumToRender={10}
            />
          )}
        </View>
      </ScrollView>

     
      <ManualEntryModal
        visible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSave={handleSaveManualEntry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coddleTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(4),
    paddingBottom: coddleTheme.spacing(3),
  },
  header: {
    marginBottom: coddleTheme.spacing(4),
  },
  manualButton: {
    marginBottom: coddleTheme.spacing(3),
  },
  sessionsSection: {
    marginTop: coddleTheme.spacing(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(2),
  },
  sectionTitle: {
    flex: 1,
  },
  totalSessionsText: {
    color: coddleTheme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dateGroup: {
    marginBottom: coddleTheme.spacing(4),
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(2),
    marginTop: coddleTheme.spacing(2),
    paddingBottom: coddleTheme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: coddleTheme.colors.border,
  },
  dateHeaderText: {
    color: coddleTheme.colors.textPrimary,
  },
  dateSessionCount: {
    color: coddleTheme.colors.textSecondary,
  },
  deleteButton: {
    padding: coddleTheme.spacing(1),
  },
  deleteText: {
    color: coddleTheme.colors.error,
  },
});

