import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { CText } from '../ui/CText';
import { SleepSession } from '../../types';
import { formatSessionTime, formatDurationFromISO } from '../../utils/formatters';
import { getSessionColor, getQualityColor } from '../../utils/colors';
import { time } from '../../utils/time';
import { coddleTheme } from '../../theme/coddleTheme';

interface SessionCardProps {
  session: SleepSession;
  onPress?: (session: SleepSession) => void;
  onDelete?: (sessionId: string) => void;
  highlighted?: boolean;
  showDelete?: boolean;
  compact?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onPress,
  onDelete,
  highlighted = false,
  showDelete = true,
  compact = false,
}) => {
  const sessionColor = getSessionColor(session);
  const qualityColor = getQualityColor(session.quality);

  const cardContent = (
    <View style={styles.content}>
      <View style={styles.info}>
        <CText variant="label">
          {formatSessionTime(session.startISO, session.endISO)}
        </CText>
        <CText variant="bodySmall" style={styles.duration}>
          {formatDurationFromISO(session.startISO, session.endISO)}
          {session.quality && ` • Quality: ${session.quality}/5`}
        </CText>
        {session.notes && !compact && (
          <CText variant="bodySmall" style={styles.notes}>
            {session.notes}
          </CText>
        )}
      </View>
      {showDelete && onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(session.id)}
          style={styles.deleteButton}
        >
          <CText variant="bodySmall" style={styles.deleteText}>
            Delete
          </CText>
        </TouchableOpacity>
      )}
    </View>
  );

  const cardStyle = [
    styles.card,
    highlighted && styles.highlighted,
    compact && styles.compact,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(session)} activeOpacity={0.7}>
        <Card style={cardStyle}>
          <View style={[styles.colorIndicator, { backgroundColor: sessionColor }]} />
          {cardContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={cardStyle}>
      <View style={[styles.colorIndicator, { backgroundColor: sessionColor }]} />
      {cardContent}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: coddleTheme.spacing(2),
    position: 'relative',
    overflow: 'hidden',
  },
  highlighted: {
    borderWidth: 2,
    borderColor: coddleTheme.colors.primary,
    backgroundColor: coddleTheme.colors.primarySoft,
  },
  compact: {
    padding: coddleTheme.spacing(2),
  },
  colorIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: coddleTheme.spacing(2),
  },
  info: {
    flex: 1,
  },
  duration: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(0.5),
  },
  notes: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(1),
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: coddleTheme.spacing(1),
  },
  deleteText: {
    color: coddleTheme.colors.error,
  },
});

