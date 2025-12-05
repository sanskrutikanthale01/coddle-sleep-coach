/**
 * Date Navigator Component
 * 
 * Reusable component for navigating between dates with prev/next buttons
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { CText } from '../ui/CText';
import { formatDateHeader } from '../../utils/formatters';
import { time } from '../../utils/time';
import { coddleTheme } from '../../theme/coddleTheme';

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (dateKey: string) => void;
  onTodayPress?: () => void;
  sessionCount?: number;
  showTodayButton?: boolean;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onDateChange,
  onTodayPress,
  sessionCount,
  showTodayButton = true,
}) => {
  const isToday = selectedDate === time.dayKey(time.nowISO());

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentDate = time.parse(selectedDate + 'T00:00:00');
    const newDate = direction === 'prev' 
      ? currentDate.subtract(1, 'day')
      : currentDate.add(1, 'day');
    onDateChange(newDate.format('YYYY-MM-DD'));
  };

  const goToToday = () => {
    if (onTodayPress) {
      onTodayPress();
    } else {
      onDateChange(time.dayKey(time.nowISO()));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navigation}>
        <TouchableOpacity
          onPress={() => navigateDay('prev')}
          style={styles.navButton}
        >
          <CText variant="h3" style={styles.navButtonText}>‹</CText>
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <CText variant="h2" style={styles.dateText}>
            {formatDateHeader(selectedDate)}
          </CText>
          {sessionCount !== undefined && (
            <CText variant="bodySmall" style={styles.sessionCount}>
              {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
            </CText>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigateDay('next')}
          style={styles.navButton}
          disabled={isToday}
        >
          <CText
            variant="h3"
            style={[styles.navButtonText, isToday && styles.navButtonDisabled]}
          >
            ›
          </CText>
        </TouchableOpacity>
      </View>

      {showTodayButton && !isToday && (
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <CText variant="bodySmall" style={styles.todayButtonText}>
            Go to Today
          </CText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(4),
    paddingBottom: coddleTheme.spacing(3),
    backgroundColor: coddleTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: coddleTheme.colors.border,
  },
  navigation: {
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
});

