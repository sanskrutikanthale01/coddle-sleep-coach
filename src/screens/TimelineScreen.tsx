import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SleepSession } from '../types';
import { time } from '../utils/time';
import type { Dayjs } from '../utils/time';
import { useSleepSessionsStore } from '../stores/sleepSessionsStore';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { TimelineBar, SessionList } from '../components/timeline';
import { DateNavigator } from '../components/common';
import { formatSessionTime, formatDurationFromISO } from '../utils/formatters';
import { getSessionColor, getQualityColor } from '../utils/colors';
import { useNapLengthChartData, useDaytimeSleepChartData } from '../hooks/useChartData';

interface TimelineSession extends SleepSession {
 
  leftPercent: number;
 
  widthPercent: number;
 
  isCrossMidnight: boolean;
 
  startDayKey: string;
 
  endDayKey: string;
}

interface TimelineScreenProps {
  highlightSessionIds?: string[];
}

export const TimelineScreen: React.FC<TimelineScreenProps> = ({ highlightSessionIds }) => {
 
  const allSessions = useSleepSessionsStore((state) => state.sessions);
  const loadSessions = useSleepSessionsStore((state) => state.loadSessions);
  
 
  const sessions = React.useMemo(
    () => allSessions.filter((s) => !s.deleted),
    [allSessions]
  );
  
  const [selectedDate, setSelectedDate] = useState<string>(time.dayKey(time.nowISO()));
  const [selectedSession, setSelectedSession] = useState<SleepSession | null>(null);

 
  const safeHighlightIds: string[] = (() => {
    if (highlightSessionIds && Array.isArray(highlightSessionIds)) {
      return highlightSessionIds;
    }
    return [];
  })();

 
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

 
  useEffect(() => {
    if (safeHighlightIds && Array.isArray(safeHighlightIds) && safeHighlightIds.length > 0) {
     
      const highlightedSession = sessions.find((s) => safeHighlightIds.includes(s.id));
      if (highlightedSession) {
        const sessionDate = time.dayKey(highlightedSession.startISO);
        setSelectedDate(sessionDate);
      }
    }
  }, [safeHighlightIds, sessions]);



  /**
   * Calculates timeline position for a session (simple horizontal bar)
   */
  const calculateSessionPosition = (session: SleepSession, dayKey: string): TimelineSession | null => {
    const start = time.parse(session.startISO);
    const end = time.parse(session.endISO);
    const sessionStartDay = time.dayKey(session.startISO);
    const sessionEndDay = time.dayKey(session.endISO);
    const isCrossMidnight = sessionStartDay !== sessionEndDay;

   
    let displayStart: Dayjs;
    let displayEnd: Dayjs;

    if (dayKey === sessionStartDay) {
     
      displayStart = start;
      displayEnd = isCrossMidnight ? time.parse(dayKey + 'T23:59:59') : end;
    } else if (dayKey === sessionEndDay && isCrossMidnight) {
     
      displayStart = time.parse(dayKey + 'T00:00:00');
      displayEnd = end;
    } else {
     
      return null;
    }

   
    const startMinutes = displayStart.hour() * 60 + displayStart.minute();
    const endMinutes = displayEnd.hour() * 60 + displayEnd.minute();
    const totalMinutesInDay = 24 * 60;

    const leftPercent = (startMinutes / totalMinutesInDay) * 100;
    const widthPercent = ((endMinutes - startMinutes) / totalMinutesInDay) * 100;

  
    const minWidthPercent = 2; 
    const finalWidthPercent = Math.max(widthPercent, minWidthPercent);

    return {
      ...session,
      leftPercent,
      widthPercent: finalWidthPercent,
      isCrossMidnight,
      startDayKey: sessionStartDay,
      endDayKey: sessionEndDay,
    };
  };

 
  const getDaySessions = (): TimelineSession[] => {
    const daySessions: TimelineSession[] = [];

    for (const session of sessions) {
      const sessionStartDay = time.dayKey(session.startISO);
      const sessionEndDay = time.dayKey(session.endISO);

     
      if (selectedDate === sessionStartDay || selectedDate === sessionEndDay) {
        const positioned = calculateSessionPosition(session, selectedDate);
        if (positioned) {
          daySessions.push(positioned);
        }
      }
    }

    return daySessions.sort((a, b) => {
      const aStart = time.parse(a.startISO);
      const bStart = time.parse(b.startISO);
      return aStart.diff(bStart);
    });
  };

  const deleteSessionFromStore = useSleepSessionsStore((state) => state.deleteSession);

 
  const deleteSession = useCallback((id: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this sleep session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
           
            await deleteSessionFromStore(id);
            setSelectedSession(null);
          },
        },
      ]
    );
  }, [deleteSessionFromStore]);



 
  const napLengthChartData = useNapLengthChartData(sessions);
  const daytimeSleepChartData = useDaytimeSleepChartData(sessions);

 
  const handleSessionPress = useCallback((session: SleepSession) => {
    setSelectedSession(session);
  }, []);



  const daySessions = getDaySessions();

  return (
    <SafeAreaView style={styles.container}>
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        sessionCount={daySessions.length}
      />

      <ScrollView
        style={styles.timelineContainer}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
       
        <Card style={styles.timelineCard}>
          <CText variant="label" style={styles.timelineTitle}>
            Sleep Timeline
          </CText>
          <TimelineBar
            sessions={daySessions}
            selectedDate={selectedDate}
            onSessionPress={handleSessionPress}
            getSessionColor={getSessionColor}
            getQualityColor={getQualityColor}
          />
          
         
          {daySessions.length > 0 && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: coddleTheme.colors.sleepNight }]} />
                <CText variant="bodySmall" style={styles.legendText}>Night Sleep</CText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: coddleTheme.colors.sleepNap }]} />
                <CText variant="bodySmall" style={styles.legendText}>Nap</CText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { borderTopWidth: 3, borderTopColor: coddleTheme.colors.success }]} />
                <CText variant="bodySmall" style={styles.legendText}>Top border = Quality</CText>
              </View>
            </View>
          )}
        </Card>

       
        <SessionList
          sessions={daySessions}
          highlightSessionIds={safeHighlightIds}
          onSessionPress={handleSessionPress}
          onSessionDelete={deleteSession}
        />

       
        {sessions.length > 0 && (napLengthChartData.labels.length > 0 || daytimeSleepChartData.labels.length > 0) && (
          <View style={styles.chartsSection}>
            <CText variant="h3" style={styles.chartsTitle}>
              Sleep Trends
            </CText>

           
            {napLengthChartData.labels.length > 0 && (
              <Card style={styles.chartCard}>
                <CText variant="label" style={styles.chartTitle}>
                  Average Nap Length (Last 7 Days)
                </CText>
                <View style={styles.chartContainer}>
                  <LineChart
                    data={napLengthChartData.datasets[0].data}
                    labels={napLengthChartData.labels}
                    color={coddleTheme.colors.sleepNap}
                    yAxisLabel="m"
                  />
                </View>
              </Card>
            )}

          
            {daytimeSleepChartData.labels.length > 0 && (
              <Card style={styles.chartCard}>
                <CText variant="label" style={styles.chartTitle}>
                  Total Daytime Sleep (Last 7 Days)
                </CText>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={daytimeSleepChartData.datasets[0].data}
                    labels={daytimeSleepChartData.labels}
                    color={coddleTheme.colors.accentMint}
                    yAxisLabel="m"
                  />
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

    
      {selectedSession && (
        <View style={styles.modalOverlay}>
          <Card style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <CText variant="h3">Session Details</CText>
              <TouchableOpacity onPress={() => setSelectedSession(null)}>
                <CText variant="h3" style={styles.closeButton}>×</CText>
              </TouchableOpacity>
            </View>
            <View style={styles.detailContent}>
              <View style={styles.detailRow}>
                <CText variant="label">Time:</CText>
                <CText variant="body">{formatSessionTime(selectedSession.startISO, selectedSession.endISO)}</CText>
              </View>
              <View style={styles.detailRow}>
                <CText variant="label">Duration:</CText>
                <CText variant="body">{formatDurationFromISO(selectedSession.startISO, selectedSession.endISO)}</CText>
              </View>
              {selectedSession.quality && (
                <View style={styles.detailRow}>
                  <CText variant="label">Quality:</CText>
                  <CText variant="body">{selectedSession.quality}/5</CText>
                </View>
              )}
              {selectedSession.notes && (
                <View style={styles.detailRow}>
                  <CText variant="label">Notes:</CText>
                  <CText variant="body">{selectedSession.notes}</CText>
                </View>
              )}
              <View style={styles.detailRow}>
                <CText variant="label">Source:</CText>
                <CText variant="body">{selectedSession.source === 'timer' ? 'Timer' : 'Manual Entry'}</CText>
              </View>
            </View>
            <View style={styles.detailActions}>
              <PrimaryButton
                label="Close"
                onPress={() => setSelectedSession(null)}
                variant="primary"
                style={styles.detailButton}
              />
              <PrimaryButton
                label="Delete"
                onPress={() => {
                  deleteSession(selectedSession.id);
                  setSelectedSession(null);
                }}
                variant="secondary"
                style={[styles.detailButton, { backgroundColor: coddleTheme.colors.error }]}
              />
            </View>
          </Card>
        </View>
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
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: coddleTheme.colors.primary,
    fontSize: 32,
  },
  navButtonDisabled: {
    color: coddleTheme.colors.textTertiary,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    color: coddleTheme.colors.textPrimary,
  },
  sessionCount: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(0.5),
  },
  todayButton: {
    marginTop: coddleTheme.spacing(2),
    alignSelf: 'center',
    paddingVertical: coddleTheme.spacing(1),
    paddingHorizontal: coddleTheme.spacing(3),
  },
  todayButtonText: {
    color: coddleTheme.colors.primary,
    fontWeight: '600',
  },
  timelineContainer: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: coddleTheme.spacing(4),
  },
  timelineCard: {
    marginHorizontal: coddleTheme.spacing(4),
    marginTop: coddleTheme.spacing(3),
    padding: coddleTheme.spacing(2.5),
  },
  timelineTitle: {
    marginBottom: coddleTheme.spacing(2),
    textAlign: 'center',
    color: coddleTheme.colors.textPrimary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: coddleTheme.spacing(2),
    gap: coddleTheme.spacing(3),
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: coddleTheme.spacing(1),
  },
  legendColor: {
    width: 20,
    height: 12,
    borderRadius: coddleTheme.radius.xs,
  },
  legendText: {
    color: coddleTheme.colors.textSecondary,
    fontSize: 11,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    padding: coddleTheme.spacing(4),
  },
  detailModal: {
    maxHeight: '50%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(4),
  },
  closeButton: {
    color: coddleTheme.colors.textSecondary,
    fontSize: 32,
    lineHeight: 32,
  },
  detailContent: {
    marginBottom: coddleTheme.spacing(4),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: coddleTheme.spacing(2),
  },
  detailActions: {
    flexDirection: 'row',
    gap: coddleTheme.spacing(2),
  },
  detailButton: {
    flex: 1,
  },
  chartsSection: {
    paddingHorizontal: coddleTheme.spacing(4),
    marginTop: coddleTheme.spacing(3),
    marginBottom: coddleTheme.spacing(3),
  },
  chartsTitle: {
    marginBottom: coddleTheme.spacing(2),
  },
  chartCard: {
    marginBottom: coddleTheme.spacing(2),
    padding: coddleTheme.spacing(2.5),
  },
  chartTitle: {
    marginBottom: coddleTheme.spacing(2),
    color: coddleTheme.colors.textPrimary,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

