import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { CText } from '../ui/CText';
import { coddleTheme } from '../../theme/coddleTheme';
import { SleepSession } from '../../types';
import { time } from '../../utils/time';
import { formatHourLabel } from '../../utils/formatters';

interface TimelineSession extends SleepSession {
  leftPercent: number;
  widthPercent: number;
  isCrossMidnight: boolean;
  startDayKey: string;
  endDayKey: string;
}

interface TimelineBarProps {
  sessions: TimelineSession[];
  selectedDate: string;
  onSessionPress: (session: TimelineSession) => void;
  getSessionColor: (session: TimelineSession) => string;
  getQualityColor: (quality?: number) => string;
}

const TimelineBarComponent: React.FC<TimelineBarProps> = ({
  sessions,
  selectedDate,
  onSessionPress,
  getSessionColor,
  getQualityColor,
}) => {
  const isToday = selectedDate === time.dayKey(time.nowISO());
  const hourMarkers: React.ReactElement[] = [];
  
  // Show major hours: 12 AM, 6 AM, 12 PM, 6 PM
  const majorHours = [0, 6, 12, 18, 24];
  
  majorHours.forEach((hour) => {
    const leftPercent = (hour / 24) * 100;
    // Calculate margin to center the marker (marker is ~30px wide, so -15px centers it)
    const marginLeft = hour === 0 ? 0 : hour === 24 ? -30 : -15;
    
    hourMarkers.push(
      <View
        key={hour}
        style={[
          styles.hourMarker,
          { 
            left: `${leftPercent}%`,
            marginLeft,
          },
        ]}
      >
        <View style={styles.hourLine} />
        <CText variant="bodySmall" style={styles.hourLabel}>
          {formatHourLabel(hour)}
        </CText>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      {/* Background bar */}
      <View style={styles.background} />
      
      {/* Hour markers */}
      {hourMarkers}
      
      {/* Session blocks */}
      {sessions.map((session) => {
        const color = getSessionColor(session);
        const qualityColor = getQualityColor(session.quality);
        
        return (
          <TouchableOpacity
            key={session.id}
            style={[
              styles.sessionBlock,
              {
                left: `${session.leftPercent}%`,
                width: `${session.widthPercent}%`,
                backgroundColor: color,
                borderTopColor: qualityColor,
              },
            ]}
            onPress={() => onSessionPress(session)}
            activeOpacity={0.8}
          />
        );
      })}
      
      {/* Current time indicator (only for today) */}
      {isToday && (
        <View
          style={[
            styles.currentTimeIndicator,
            {
              left: `${((time.now().hour() * 60 + time.now().minute()) / (24 * 60)) * 100}%`,
              marginLeft: -7, // Center the indicator
            },
          ]}
        >
          <View style={styles.currentTimeDot} />
          <View style={styles.currentTimeLine} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 80,
    position: 'relative',
    marginVertical: coddleTheme.spacing(2),
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: coddleTheme.colors.surface,
    borderRadius: coddleTheme.radius.md,
  },
  hourMarker: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  hourLine: {
    width: 1,
    height: 40,
    backgroundColor: coddleTheme.colors.divider,
  },
  hourLabel: {
    marginTop: coddleTheme.spacing(0.5),
    color: coddleTheme.colors.textSecondary,
    fontSize: 10,
  },
  sessionBlock: {
    position: 'absolute',
    top: 0,
    height: 40,
    borderRadius: coddleTheme.radius.sm,
    borderTopWidth: 3,
    opacity: 0.8,
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: coddleTheme.colors.error,
  },
  currentTimeLine: {
    width: 2,
    height: 40,
    backgroundColor: coddleTheme.colors.error,
    marginTop: -4,
  },
});

// Memoize component to prevent unnecessary re-renders
export const TimelineBar = React.memo(TimelineBarComponent, (prevProps, nextProps) => {
  // Only re-render if sessions, date, or color functions change
  if (prevProps.selectedDate !== nextProps.selectedDate) return false;
  if (prevProps.sessions.length !== nextProps.sessions.length) return false;
  if (prevProps.getSessionColor !== nextProps.getSessionColor) return false;
  if (prevProps.getQualityColor !== nextProps.getQualityColor) return false;
  if (prevProps.onSessionPress !== nextProps.onSessionPress) return false;
  
  // Check if session IDs changed
  const prevIds = prevProps.sessions.map(s => s.id).join(',');
  const nextIds = nextProps.sessions.map(s => s.id).join(',');
  if (prevIds !== nextIds) return false;
  
  return true;
});

